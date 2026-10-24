import { NEED_OPTIONS } from '../utils/accessibilityNeeds.js';

// Checkbox group for recording a citizen's accessibility needs.
// "None" clears the other boxes, so the data never contradicts itself.
export default function NeedsCheckboxes({ needs, onChange }) {
  function toggle(key) {
    onChange(needs.includes(key) ? needs.filter((k) => k !== key) : [...needs, key]);
  }

  return (
    <fieldset className="needs">
      <legend>Accessibility needs (optional)</legend>
      <p><small>The system will adapt itself for this citizen when they log in.</small></p>

      {NEED_OPTIONS.map((option) => (
        <label key={option.key} className="check">
          <input type="checkbox" checked={needs.includes(option.key)} onChange={() => toggle(option.key)} />
          {option.label}
        </label>
      ))}

      <label className="check">
        <input type="checkbox" checked={needs.length === 0} onChange={() => onChange([])} />
        None
      </label>
    </fieldset>
  );
}
