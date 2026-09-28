import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASE1_ALARM_RULES } from '../engine/alarms';
import { SAFETY_TAGS } from '../engine/safetyTags';
import { valveTypeFromTag } from '../engine/valve';
import { Valve } from './Valve';
import { Vessel } from './Vessel';
import { Pipe } from './Pipe';
import { Palette } from './Palette';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';
import { TEMPLATES, type PlantTemplate } from '../data/templates';
import type { PlantNode } from '../types/plant';

type LayoutItem = { x: number; y: number; rotation: number; symbol: string };

const layoutKey = (template: PlantTemplate) => `sbp-layout-${template}`;

interface StoredLayout {
  items: Record<string, LayoutItem>;
  edges: { id: string; from: string; to: string }[];
}

function loadLayout(template: PlantTemplate): StoredLayout | null {
  try {
    const raw = localStorage.getItem(layoutKey(template));
    return raw ? (JSON.parse(raw) as StoredLayout) : null;
  } catch {
    return null;
  }
}

function saveLayout(template: PlantTemplate, items: Record<string, LayoutItem>, edges: { id: string; from: string; to: string }[]) {
  try {
    localStorage.setItem(layoutKey(template), JSON.stringify({ items, edges }));
  } catch {
    // ignore
  }
}

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

const kindForSymbol = (symbol: string): PlantNode['kind'] | null => {
  if (['well', 'source'].includes(symbol)) return 'source';
  if (['vessel', 'tank'].includes(symbol)) return 'vessel';
  if (['sink', 'flame'].includes(symbol)) return 'sink';
  if (['manifold', 'header'].includes(symbol)) return 'header';
  if (symbol === 'junction') return 'junction';
  return null;
};

export function PidSvg() {
  const { graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph, valves, activeAlarms, addValve, removeValve } = useSimulationStore();
  const allGraphs = useMemo(() => [graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph], [graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph]);
  const { selectedTag, selectTag, editMode, template } = useUiStore();
  const templateDef = TEMPLATES[template];
  const stored = loadLayout(template);
  const [items, setItems] = useState<Record<string, LayoutItem>>(() => stored?.items ?? structuredClone(templateDef.items as Record<string, LayoutItem>));
  const [connectMode, setConnectMode] = useState<'pipe' | 'valve' | null>(null);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  /** Why the last add/connect/delete was refused, shown in the palette hint. */
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Reset layout when template changes
  useEffect(() => {
    const next = loadLayout(template)?.items ?? structuredClone(templateDef.items as Record<string, LayoutItem>);
    setItems(next);
    setConnectMode(null);
    setConnectSource(null);
    selectTag(null);
  }, [template, templateDef.items, selectTag]);

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
        graph.addEdge({ id: edge.id, from: edge.from, to: edge.to, kind: 'pipe', conductance: 1 });
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

  const toSvgPoint = (e: React.MouseEvent, svg: SVGSVGElement) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const handleMouseDown = (tag: string) => (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    const item = items[tag];
    if (!item) return;
    const svg = (e.currentTarget as SVGGElement).ownerSVGElement as SVGSVGElement;
    const p = toSvgPoint(e, svg);
    setDraggingTag(tag);
    dragStartRef.current = { x: p.x - item.x, y: p.y - item.y, moved: false };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTag || !dragStartRef.current || !editMode) return;
    const svg = e.currentTarget as SVGSVGElement;
    const p = toSvgPoint(e, svg);
    dragStartRef.current.moved = true;
    setItems((prev) => {
      const next = { ...prev, [draggingTag]: { ...prev[draggingTag], x: p.x - dragStartRef.current!.x, y: p.y - dragStartRef.current!.y } };
      saveLayout(template, next, graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })));
      return next;
    });
  };

  const handleMouseUp = () => {
    setDraggingTag(null);
    dragStartRef.current = null;
  };

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
          } else {
            const valveTag = `V-NEW-${Object.keys(items).filter((k) => k.startsWith('V-NEW-')).length + 1}`;
            const fromItem = items[connectSource];
            const toItem = items[tag];
            const midX = (fromItem.x + toItem.x) / 2;
            const midY = (fromItem.y + toItem.y) / 2;
            const rotation = Math.abs(toItem.x - fromItem.x) > Math.abs(toItem.y - fromItem.y) ? 0 : 90;
            const valveItem: LayoutItem = { x: midX, y: midY, rotation, symbol: 'valve' };
            const nextItems = { ...items, [valveTag]: valveItem };
            setItems(nextItems);
            addValve(valveTag, valveTypeFromTag(valveTag));
            graph.addEdge({ id, from: connectSource, to: tag, kind: 'valved', conductance: 1, valveTag });
            const nextEdges = graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to }));
            saveLayout(template, nextItems, nextEdges);
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
    while (items[`${prefix}-${i}`]) i++;
    return `${prefix}-${i}`;
  };

  const addItem = (symbol: string) => {
    const tag = generateTag(symbol);
    const centerX = templateDef.viewBox.width / 2;
    const centerY = templateDef.viewBox.height / 2;
    const newItem: LayoutItem = { x: centerX + (Math.random() - 0.5) * 60, y: centerY + (Math.random() - 0.5) * 60, rotation: 0, symbol };
    const next = { ...items, [tag]: newItem };
    setItems(next);

    const kind = kindForSymbol(symbol);
    if (kind && !graph.nodes.has(tag)) {
      graph.addNode(baseNode(tag, tag, kind));
    }
    saveLayout(template, next, graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })));
    selectTag(tag);
    setActionNotice(null);
  };

  const deleteSelected = () => {
    if (!selectedTag) return;
    const tag = selectedTag;
    const next = { ...items };
    delete next[tag];
    setItems(next);
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
    saveLayout(template, next, graph.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })));
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        viewBox={`0 0 ${templateDef.viewBox.width} ${templateDef.viewBox.height}`}
        style={{ flex: 1, minWidth: 960, minHeight: 600, background: 'var(--bg-canvas)' }}
        aria-label="P and ID"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
      {allGraphs.flatMap((g) =>
        g.edges
          .filter((e) => items[e.from] && items[e.to])
          .map((e) => <Pipe key={e.id} from={items[e.from]} to={items[e.to]} flowing={flowingEdges.has(e.id)} />)
      )}
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
                  selected={selected}
                  alarm={alarm}
                  onClick={() => handleElementClick(tag)}
                  onMouseDown={handleMouseDown(tag)}
                />
              );
        })}
      </svg>
    </div>
  );
}
