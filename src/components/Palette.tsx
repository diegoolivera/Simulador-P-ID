interface PaletteProps {
  onAdd: (symbol: string) => void;
  onDelete?: () => void;
  onConnect?: (mode: 'pipe' | 'valve') => void;
  connectMode?: 'pipe' | 'valve' | null;
}

const ITEMS = [
  { symbol: 'well', label: 'Pozo' },
  { symbol: 'manifold', label: 'Manifold' },
  { symbol: 'vessel', label: 'Vaso' },
  { symbol: 'tank', label: 'Tanque' },
  { symbol: 'valve', label: 'Válvula' },
  { symbol: 'transmitter', label: 'Transmisor' },
  { symbol: 'controller', label: 'Controlador' },
  { symbol: 'pump', label: 'Bomba' },
  { symbol: 'compressor', label: 'Compresor' },
  { symbol: 'source', label: 'Fuente' },
  { symbol: 'sink', label: 'Sumidero' },
  { symbol: 'header', label: 'Header' },
  { symbol: 'flame', label: 'Flare' },
];

export function Palette({ onAdd, onDelete, onConnect, connectMode }: PaletteProps) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid var(--border-panel)', background: 'var(--bg-panel-elevated)' }}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-primary)' }}>Paleta de componentes</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ITEMS.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onAdd(item.symbol)}
            title={item.label}
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={() => onConnect?.(connectMode === 'pipe' ? 'pipe' : 'pipe')} style={{ background: connectMode === 'pipe' ? 'var(--accent)' : undefined, color: connectMode === 'pipe' ? '#fff' : undefined, borderColor: connectMode === 'pipe' ? 'var(--accent)' : undefined, fontSize: 11 }}>
          {connectMode === 'pipe' ? 'Cancelar pipe' : 'Conectar pipe'}
        </button>
        <button onClick={() => onConnect?.(connectMode === 'valve' ? 'valve' : 'valve')} style={{ background: connectMode === 'valve' ? 'var(--accent)' : undefined, color: connectMode === 'valve' ? '#fff' : undefined, borderColor: connectMode === 'valve' ? 'var(--accent)' : undefined, fontSize: 11 }}>
          {connectMode === 'valve' ? 'Cancelar válvula' : 'Conectar válvula'}
        </button>
        <button onClick={onDelete} style={{ fontSize: 11 }}>Eliminar seleccionado</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
        Tip: arrastrá elementos. En modo conexión, clickeá origen y destino.
      </div>
    </div>
  );
}
