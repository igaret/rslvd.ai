import { Fingerprint } from "lucide-react";

export const PersonaDock = ({ personas, selectedPersona, setSelectedPersona }) => (
  <section className="persona-dock" data-testid="persona-dock">
    <div className="section-head" data-testid="persona-dock-heading">
      <Fingerprint size={14} /> PERSONA PRESETS
    </div>
    <div className="persona-grid" data-testid="persona-grid">
      {personas.map((persona) => (
        <button
          key={persona.id}
          className={`persona-tile ${selectedPersona === persona.id ? "active" : ""}`}
          onClick={() => setSelectedPersona(persona.id)}
          data-testid={`persona-button-${persona.id}`}
        >
          <strong data-testid={`persona-name-${persona.id}`}>{persona.name}</strong>
          <span data-testid={`persona-tagline-${persona.id}`}>{persona.tagline}</span>
        </button>
      ))}
    </div>
  </section>
);