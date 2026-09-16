import { Button, Input } from '../ui/index.js';
import '../../styles/settings.css';

/**
 * Editeur du deroule de la journee (CDC §5.10).
 * Le reordonnancement se fait par boutons plutot qu'en drag & drop : c'est
 * utilisable au doigt sur mobile et accessible au clavier, contrairement au
 * glisser-deposer qui exigerait une dependance externe interdite par le §10.1.
 */
export default function ProgramEditor({ program, onChange }) {
  function updateStep(index, field, value) {
    onChange(program.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
  }

  function addStep() {
    onChange([...program, { time: '', title: '', description: '' }]);
  }

  function removeStep(index) {
    onChange(program.filter((_, i) => i !== index));
  }

  function moveStep(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= program.length) return;

    const next = [...program];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      {program.length === 0 && (
        <p className="wp-caption" style={{ marginBottom: 'var(--space-sm)' }}>
          Aucune etape. Le programme n'apparaitra pas sur la page des invites.
        </p>
      )}

      {program.map((step, index) => (
        <div className="wp-program__step" key={index}>
          <Input
            label="Heure"
            value={step.time}
            onChange={(e) => updateStep(index, 'time', e.target.value)}
            placeholder="18h00"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <Input
              label="Etape"
              value={step.title}
              onChange={(e) => updateStep(index, 'title', e.target.value)}
              placeholder="Ceremonie religieuse"
            />
            <Input
              label="Description"
              value={step.description}
              onChange={(e) => updateStep(index, 'description', e.target.value)}
              placeholder="Optionnel"
            />
          </div>

          <div className="wp-program__controls">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveStep(index, -1)}
              disabled={index === 0}
              aria-label="Monter"
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveStep(index, 1)}
              disabled={index === program.length - 1}
              aria-label="Descendre"
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeStep(index)}
              aria-label="Supprimer l'etape"
            >
              ✕
            </Button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addStep}>
        Ajouter une etape
      </Button>
    </div>
  );
}
