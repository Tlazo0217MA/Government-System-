import Field from './Field.jsx';

// Renders the fields of a record type (from config/recordTypes.js) as form controls.
export default function RecordFields({ type, values, onChange, idPrefix = 'rec' }) {
  const set = (key) => (event) => onChange({ ...values, [key]: event.target.value });

  return (
    <div className="grid2">
      {type.fields.map((field) => (
        <Field key={field.key} id={`${idPrefix}-${field.key}`} label={field.label} required={!!field.required}>
          {field.type === 'select' ? (
            <select value={values[field.key] || ''} onChange={set(field.key)}>
              <option value="">Select</option>
              {field.options.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea rows="3" value={values[field.key] || ''} onChange={set(field.key)} />
          ) : (
            <input type={field.type} value={values[field.key] || ''} onChange={set(field.key)} />
          )}
        </Field>
      ))}
    </div>
  );
}
