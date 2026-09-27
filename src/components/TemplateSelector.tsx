import { TEMPLATES, type PlantTemplate } from '../data/templates';

interface TemplateSelectorProps {
  current: PlantTemplate;
  onChange: (template: PlantTemplate) => void;
}

export function TemplateSelector({ current, onChange }: TemplateSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(Object.keys(TEMPLATES) as PlantTemplate[]).map((id) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            fontSize: 11,
            background: current === id ? 'var(--accent)' : undefined,
            color: current === id ? '#fff' : undefined,
            borderColor: current === id ? 'var(--accent)' : undefined,
          }}
          title={TEMPLATES[id].description}
        >
          {TEMPLATES[id].name}
        </button>
      ))}
    </div>
  );
}
