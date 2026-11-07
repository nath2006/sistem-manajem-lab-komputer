import { field, labels, levels } from './ticketingUi';
export function Select({ label, value, onChange, options, required = true }) {
  return (
    <label className="block">
      {label}
      <select
        className={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Classification({ value, onChange, options: choices }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        ['type', 'Jenis', choices?.types || []],
        ['category', 'Kategori', choices?.categories || []],
        ['impact', 'Dampak', levels],
        ['urgency', 'Urgensi', levels],
      ].map(([key, label, options]) => (
        <Select
          key={key}
          label={label}
          value={value[key]}
          options={options}
          onChange={(v) => onChange({ ...value, [key]: v })}
        />
      ))}
    </div>
  );
}
