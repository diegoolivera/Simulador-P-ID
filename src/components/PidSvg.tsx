import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PHASE1_ALARM_RULES } from '../engine/alarms';
import { SAFETY_TAGS } from '../engine/safetyTags';
import { valveTypeFromTag } from '../engine/valve';
import { Valve } from './Valve';
import { Vessel } from './Vessel';
import { Pipe } from './Pipe';
import { SignalLine } from './SignalLine';
import { TieInLine } from './TieInLine';
import { Palette } from './Palette';
import { kindForSymbol } from './symbolRegistry';
import { loadLayout, reconcileLayout, saveLayout, type LayoutItem } from './layoutStorage';
import { resizeHandleOffset, scaleFromDrag } from './resize';
import { IDENTITY_VIEWPORT, panBy, screenToWorld, wheelZoomFactor, zoomAt, type Point, type ViewportState } from './viewport';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';
import { TEMPLATES } from '../data/templates';
import { INSTRUMENT_SIGNALS } from '../data/instrumentSignals';
import { SYSTEM_TIE_INS } from '../data/systemTieIns';
import type { PlantNode } from '../types/plant';

/**
 * Client (screen) coordinates -> the SVG's own viewBox coordinates. This is the
 * coordinate space the viewport transform (`translate tx ty scale s`) operates
 * in, so pan deltas use it directly and item drags convert it to world space.
 * jsdom does not implement `getScreenCTM`/`createSVGPoint`; fall back to the raw
 * client coordinates there so the handlers never throw in tests.
 */
const clientToRoot = (svg: SVGSVGElement, clientX: number, clientY: number): Point => {
  const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
  if (!ctm || typeof svg.createSVGPoint !== 'function') return { x: clientX, y: clientY };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(ctm.inverse());
};

const baseNode = (id: string, tag: string, kind: PlantNode['kind']): PlantNode => ({
  id,
  tag,
  kind,
  pressure: 0,
  liquidLevel: 0,
  sandLevel: 0,
  volume: 10,
  separationEfficiency: 0,
  demisterDP: 0,
  fouling: 0,
  gasFlow: 0,
  liquidFlow: 0,
  inletIds: [],
  outletIds: [],
});

export function PidSvg() {
  const { graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph, valves, activeAlarms, addValve, removeValve, running } = useSimulationStore();
  const allGraphs = useMemo(() => [graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph], [graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph]);
  const { selectedTag, selectTag, editMode, template } = useUiStore();
  const templateDef = TEMPLATES[template];
  const stored = loadLayout(template);
  // Identity (the symbol) belongs to the plant template; only the position and
  // scale are the operator's. A layout persisted before a symbol changed must
  // not keep drawing the old glyph for a tag the template still defines.
  const [items, setItems] = useState<Record<string, LayoutItem>>(() => reconcileLayout(stored?.items, templateDef.items));
  // Mirror of `items` so pointer handlers can read the latest layout without a
  // side effect inside a state updater and without a stale closure between renders.
  const itemsRef = useRef(items);
  const commitItems = useCallback((next: Record<string, LayoutItem>) => {
    itemsRef.current = next;
    setItems(next);
  }, []);
  const [connectMode, setConnectMode] = useState<'pipe' | 'valve' | null>(null);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  const [resizingTag, setResizingTag] = useState<string | null>(null);
  /** Why the last add/connect/delete was refused, shown in the palette hint. */
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const resizeRef = useRef<{ startScale: number; startDist: number; centerX: number; centerY: number } | null>(null);
  // Viewport navigation: wheel zoom + background drag pan. `viewportRef` mirrors
  // the state so the pointer handlers always read the latest transform without a
  // stale closure (same pattern as `itemsRef`).
  const [viewport, setViewport] = useState<ViewportState>(IDENTITY_VIEWPORT);
  const viewportRef = useRef(viewport);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Keep the mirror in sync with layout changes that did not come through commitItems.
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Reset layout when template changes
  useEffect(() => {
    const next = reconcileLayout(loadLayout(template)?.items, templateDef.items);
    commitItems(next);
    setConnectMode(null);
    setConnectSource(null);
    selectTag(null);
    setViewport(IDENTITY_VIEWPORT);
  }, [template, templateDef.items, selectTag, commitItems]);

  // Wheel zoom must be a non-passive listener so `preventDefault` can stop the
  // page from scrolling while zooming; React's synthetic `onWheel` is passive.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pointer = clientToRoot(svg, e.clientX, e.clientY);
      setViewport((v) => zoomAt(v, pointer, wheelZoomFactor(e.deltaY)));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Re-register valves that only live in a persisted layout (added from the
  // palette): their item survives a reload, so the store entry must too or the
  // glyph renders as nothing and the valve is uncommandable.
  useEffect(() => {
    const layout = loadLayout(template);
    if (!layout) return;
    const { valves: current, addValve: register } = useSimulationStore.getState();
    for (const [tag, item] of Object.entries(layout.items)) {
      if (item.symbol === 'valve' && !current.has(tag)) register(tag, valveTypeFromTag(tag));
    }
  }, [template]);

  // Sync custom edges from localStorage into graph on mount
  useEffect(() => {
    if (!stored?.edges) return;
    for (const edge of stored.edges) {
      // A persisted layout can predate this guard; a cycle here would survive
      // until physics asked for the topological order on the next tick.
      if (
        graph.nodes.has(edge.from) &&
        graph.nodes.has(edge.to) &&
        !graph.edges.find((e) => e.id === edge.id) &&
        !graph.wouldCreateCycle(edge.from, edge.to)
      ) {
        // Restore the saved kind/valveTag: re-adding every stored edge as a pipe
        // turned a palette-created valve into an inert pipe on reload. Layouts
        // saved before edges carried a kind default to 'pipe'.
        graph.addEdge({
          id: edge.id,
          from: edge.from,
          to: edge.to,
          kind: edge.kind ?? 'pipe',
          conductance: 1,
          ...(edge.valveTag ? { valveTag: edge.valveTag } : {}),
        });
      }
    }
  }, [graph, stored?.edges]);

  const sourceMap = useMemo(() => new Map(PHASE1_ALARM_RULES.map((r) => [r.id, r.sourceTag])), []);
  const alarmTags = useMemo(() => new Set(activeAlarms.map((a) => sourceMap.get(a.id) ?? a.tag)), [activeAlarms, sourceMap]);

  const flowingEdges = useMemo(() => {
    const set = new Set<string>();
    for (const g of allGraphs) {
      for (const edge of g.edges) {
        if (edge.kind === 'pipe') {
          set.add(edge.id);
          continue;
        }
        if (edge.valveTag) {
          const v = valves.get(edge.valveTag);
          if (v && v.position > 0.05) set.add(edge.id);
        }
      }
    }
    return set;
  }, [allGraphs, valves]);

  useEffect(() => {
    if (!selectedTag) return;
    document.querySelector(`[data-tag="${sourceMap.get(selectedTag) ?? selectedTag}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [selectedTag, sourceMap]);

  const toSvgPoint = (e: React.MouseEvent, svg: SVGSVGElement) => clientToRoot(svg, e.clientX, e.clientY);

  // Rearranging the P&ID is only safe while the plant is stopped, so drag and
  // resize are allowed when edit mode is on OR the simulation is not running.
  // A live plant must never be rearranged, which is why the edit-mode gate stays
  // in place for that case instead of being removed outright.
  const canArrange = editMode || !running;
  const persistEdges = () =>
    graph.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      kind: e.kind,
      ...(e.valveTag ? { valveTag: e.valveTag } : {}),
    }));

  const handleMouseDown = (tag: string) => (e: React.MouseEvent) => {
    if (!canArrange) return;
    e.preventDefault();
    // Stop the canvas pan from starting on an item press (the resize handle
    // already does this); the item drag owns the gesture instead.
    e.stopPropagation();
    const item = itemsRef.current[tag];
    if (!item) return;
    const svg = (e.currentTarget as SVGGElement).ownerSVGElement as SVGSVGElement;
    // Item coordinates are world space; the pointer arrives in root space, so
    // undo the viewport transform or the item would lag the cursor under zoom.
    const p = screenToWorld(viewportRef.current, toSvgPoint(e, svg));
    setDraggingTag(tag);
    dragStartRef.current = { x: p.x - item.x, y: p.y - item.y, moved: false };
  };

  const handleResizeStart = (tag: string) => (e: React.MouseEvent) => {
    if (!canArrange) return;
    e.preventDefault();
    e.stopPropagation();
    const item = itemsRef.current[tag];
    if (!item) return;
    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement as SVGSVGElement;
    const p = screenToWorld(viewportRef.current, toSvgPoint(e, svg));
    resizeRef.current = {
      startScale: item.scale ?? 1,
      startDist: Math.hypot(p.x - item.x, p.y - item.y),
      centerX: item.x,
      centerY: item.y,
    };
    setResizingTag(tag);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Item drags and the resize handle stop propagation in their own
    // onMouseDown, so a press that reaches the SVG root is on the empty
    // background: start a pan. Left or middle button only.
    if (e.button !== 0 && e.button !== 1) return;
    const svg = e.currentTarget as SVGSVGElement;
    const p = toSvgPoint(e, svg);
    panRef.current = { x: p.x, y: p.y, tx: viewportRef.current.tx, ty: viewportRef.current.ty };
    setPanning(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    const root = toSvgPoint(e, svg);

    if (panRef.current) {
      const pan = panRef.current;
      // Translation is in root-viewBox units, so the pointer delta applies
      // directly. Use the press-time offset to avoid accumulating drift.
      setViewport((v) => panBy({ scale: v.scale, tx: pan.tx, ty: pan.ty }, root.x - pan.x, root.y - pan.y));
      return;
    }

    if (!canArrange) return;
    const p = screenToWorld(viewportRef.current, root);
    const prev = itemsRef.current;

    if (resizingTag && resizeRef.current) {
      const resize = resizeRef.current;
      const dist = Math.hypot(p.x - resize.centerX, p.y - resize.centerY);
      const scale = scaleFromDrag(resize.startScale, resize.startDist, dist);
      const next = { ...prev, [resizingTag]: { ...prev[resizingTag], scale } };
      commitItems(next);
      saveLayout(template, next, persistEdges());
      return;
    }

    if (!draggingTag || !dragStartRef.current) return;
    const offset = dragStartRef.current;
    offset.moved = true;
    const next = { ...prev, [draggingTag]: { ...prev[draggingTag], x: p.x - offset.x, y: p.y - offset.y } };
    commitItems(next);
    saveLayout(template, next, persistEdges());
  };

  const handleMouseUp = () => {
    panRef.current = null;
    setPanning(false);
    setDraggingTag(null);
    setResizingTag(null);
    dragStartRef.current = null;
    resizeRef.current = null;
  };

  const viewBoxCenter = { x: templateDef.viewBox.width / 2, y: templateDef.viewBox.height / 2 };
  const zoomIn = () => setViewport((v) => zoomAt(v, viewBoxCenter, 1.25));
  const zoomOut = () => setViewport((v) => zoomAt(v, viewBoxCenter, 0.8));
  const resetViewport = () => setViewport(IDENTITY_VIEWPORT);

  const handleElementClick = (tag: string) => {
    if (dragStartRef.current?.moved) return;

    if (editMode && connectMode) {
      if (!connectSource) {
        setConnectSource(tag);
        selectTag(tag);
        return;
      }
      if (connectSource !== tag) {
        const id = `edge-${connectMode}-${connectSource}-${tag}`;
        // A refused connection must say why, same as a refused delete —
        // otherwise the click silently does nothing.
        let refusal: string | null = null;
        if (graph.edges.find((e) => e.id === id)) {
          refusal = `ya existe ${connectSource} → ${tag}`;
        } else if (!graph.nodes.has(connectSource) || !graph.nodes.has(tag)) {
          refusal = `falta un extremo (${connectSource} → ${tag})`;
        } else if (graph.wouldCreateCycle(connectSource, tag)) {
          refusal = `${connectSource} → ${tag} cerraría un ciclo`;
        }

        if (refusal) {
          setActionNotice(`Conexión no creada: ${refusal}.`);
        } else {
          if (connectMode === 'pipe') {
            graph.addEdge({ id, from: connectSource, to: tag, kind: 'pipe', conductance: 1 });
            // Persist the pipe exactly like the valve branch; without this the
            // connection is gone on reload.
            saveLayout(template, itemsRef.current, persistEdges());
          } else {
            const currentItems = itemsRef.current;
            const valveTag = `V-NEW-${Object.keys(currentItems).filter((k) => k.startsWith('V-NEW-')).length + 1}`;
            const fromItem = currentItems[connectSource];
            const toItem = currentItems[tag];
            const midX = (fromItem.x + toItem.x) / 2;
            const midY = (fromItem.y + toItem.y) / 2;
            const rotation = Math.abs(toItem.x - fromItem.x) > Math.abs(toItem.y - fromItem.y) ? 0 : 90;
            const valveItem: LayoutItem = { x: midX, y: midY, rotation, symbol: 'valve' };
            const nextItems = { ...currentItems, [valveTag]: valveItem };
            commitItems(nextItems);
            addValve(valveTag, valveTypeFromTag(valveTag));
            graph.addEdge({ id, from: connectSource, to: tag, kind: 'valved', conductance: 1, valveTag });
            saveLayout(template, nextItems, persistEdges());
          }
          setActionNotice(null);
        }
      }
      setConnectSource(null);
      setConnectMode(null);
      selectTag(null);
      return;
    }

    selectTag(tag);
  };

  const generateTag = (symbol: string) => {
    const prefix = symbol.toUpperCase();
    let i = 1;
    while (itemsRef.current[`${prefix}-${i}`]) i++;
    return `${prefix}-${i}`;
  };

  const addItem = (symbol: string) => {
    const tag = generateTag(symbol);
    const centerX = templateDef.viewBox.width / 2;
    const centerY = templateDef.viewBox.height / 2;
    const newItem: LayoutItem = { x: centerX + (Math.random() - 0.5) * 60, y: centerY + (Math.random() - 0.5) * 60, rotation: 0, symbol };
    const next = { ...itemsRef.current, [tag]: newItem };
    commitItems(next);

    if (symbol === 'valve') {
      // A valve item only renders once `valves.get(tag)` exists, so register the
      // store entry alongside the layout item.
      addValve(tag, valveTypeFromTag(tag));
    } else {
      const kind = kindForSymbol(symbol);
      if (kind && !graph.nodes.has(tag)) {
        graph.addNode(baseNode(tag, tag, kind));
      }
    }
    saveLayout(template, next, persistEdges());
    selectTag(tag);
    setActionNotice(null);
  };

  const deleteSelected = () => {
    if (!selectedTag) return;
    const tag = selectedTag;
    const next = { ...itemsRef.current };
    delete next[tag];
    commitItems(next);
    setActionNotice(null);
    // Remove any edges that use this tag as a valve and remove from valve store
    if (valves.has(tag)) {
      for (const edge of [...graph.edges]) {
        if (edge.valveTag === tag) {
          graph.removeEdge(edge.id);
        }
      }
      removeValve(tag);
    }
    graph.removeNode(tag);
    saveLayout(template, next, persistEdges());
    selectTag(null);
  };

  // Deleting an alarm source or an ESD/interlock valve silently disarms its
  // safety functions: evaluateAlarmRules skips rules whose node is gone, and a
  // missing valve reads as position ?? 1 (open). Block it with a visible reason
  // rather than letting the click quietly succeed. An empty selection just
  // disables the button — that is not an error, so it gets no alarm-coloured
  // reason.
  const deleteBlockedReason =
    selectedTag && SAFETY_TAGS.has(selectedTag)
      ? `${selectedTag} forma parte de alarmas, ESD o interlock y no se puede eliminar.`
      : undefined;

  // Handle position is derived from the symbol bounds so it clears the glyph
  // (the fixed (+18,+18) offset sat inside a vessel/tank and stole its drag)
  // and scales with the item so it stays attached.
  const selectedItem = selectedTag ? items[selectedTag] : undefined;
  const resizeOffset = selectedItem ? resizeHandleOffset(selectedItem.symbol, selectedItem.scale ?? 1) : null;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {editMode && (
        <Palette
          onAdd={addItem}
          onDelete={!selectedTag || deleteBlockedReason ? undefined : deleteSelected}
          deleteDisabledReason={deleteBlockedReason}
          notice={actionNotice}
          onConnect={(mode) => {
            if (connectMode === mode) {
              setConnectMode(null);
            } else {
              setConnectMode(mode);
            }
            setConnectSource(null);
            selectTag(null);
            setActionNotice(null);
          }}
          connectMode={connectMode}
        />
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${templateDef.viewBox.width} ${templateDef.viewBox.height}`}
        style={{ flex: 1, minWidth: 960, minHeight: 600, background: 'var(--bg-canvas)', cursor: panning ? 'grabbing' : 'grab' }}
        aria-label="P and ID"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Single transform group carries the viewport: every world coordinate
            below (layout items, pipes, annotations) is drawn in world space and
            mapped to the canvas by this one transform. */}
        <g transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.scale})`}>
      {allGraphs.flatMap((g) =>
        g.edges
          .filter((e) => items[e.from] && items[e.to])
          .map((e) => <Pipe key={e.id} from={items[e.from]} to={items[e.to]} flowing={flowingEdges.has(e.id)} />)
      )}
        {/* Instrument signal annotations: a separate dashed layer, not process
            edges. Drawn only when both endpoints are present in this template,
            and read live positions from `items` so they follow a drag. */}
        {INSTRUMENT_SIGNALS.map(({ instrumentTag, targetTag }) => {
          const instrument = items[instrumentTag];
          const target = items[targetTag];
          if (!instrument || !target) return null;
          return (
            <SignalLine
              key={`signal-${instrumentTag}-${targetTag}`}
              from={{ x: instrument.x, y: instrument.y }}
              to={{ x: target.x, y: target.y }}
            />
          );
        })}
        {/* Utility tie-ins: a THIRD annotation layer (amber dash-dot) showing
            where each auxiliary system connects to the process. Not process
            edges; drawn only when both endpoints exist in this template, and
            read live positions from `items` so they follow a drag. */}
        {SYSTEM_TIE_INS.map(({ fromTag, toTag, subsystem }) => {
          const from = items[fromTag];
          const to = items[toTag];
          if (!from || !to) return null;
          return (
            <TieInLine
              key={`tie-${subsystem}-${fromTag}-${toTag}`}
              from={{ x: from.x, y: from.y }}
              to={{ x: to.x, y: to.y }}
            />
          );
        })}
        {Object.entries(items).map(([tag, item]) => {
          const selected = selectedTag === tag;
          const alarm = alarmTags.has(tag);
          return item.symbol === 'valve'
            ? (valves.get(tag) ? (
                <Valve
                  key={tag}
                  valve={valves.get(tag)!}
                  x={item.x}
                  y={item.y}
                  rotation={item.rotation}
                  scale={item.scale ?? 1}
                  selected={selected}
                  alarm={alarm}
                  onClick={() => handleElementClick(tag)}
                  onMouseDown={handleMouseDown(tag)}
                />
              ) : null)
            : (
                <Vessel
                  key={tag}
                  tag={tag}
                  x={item.x}
                  y={item.y}
                  symbol={item.symbol}
                  scale={item.scale ?? 1}
                  selected={selected}
                  alarm={alarm}
                  onClick={() => handleElementClick(tag)}
                  onMouseDown={handleMouseDown(tag)}
                />
              );
        })}
        {canArrange && selectedItem && resizeOffset && (
          <rect
            x={selectedItem.x + resizeOffset.dx}
            y={selectedItem.y + resizeOffset.dy}
            width={11}
            height={11}
            fill="var(--bg-canvas)"
            stroke="var(--accent)"
            strokeWidth={2}
            style={{ cursor: 'nwse-resize' }}
            onMouseDown={handleResizeStart(selectedTag!)}
            aria-label="Resize selected item"
          />
        )}
        </g>
      </svg>
      {/* Viewport controls: readout + zoom in/out + fit-to-screen reset. Kept
          unobtrusive in the canvas corner and in the app's existing button style. */}
      <div
        aria-label="Controles de zoom"
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 4,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-panel)',
          borderRadius: 6,
          zIndex: 2,
        }}
      >
        <button onClick={zoomOut} title="Alejá" aria-label="Alejá">
          −
        </button>
        <span
          aria-label="Nivel de zoom"
          style={{ minWidth: 44, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}
        >
          {Math.round(viewport.scale * 100)}%
        </span>
        <button onClick={zoomIn} title="Acercá" aria-label="Acercá">
          +
        </button>
        <button onClick={resetViewport} title="Ajustá a pantalla" aria-label="Ajustá a pantalla">
          Ajustá
        </button>
      </div>
    </div>
  );
}
