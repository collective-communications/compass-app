/**
 * Metadata collection form with 4 required select dropdowns.
 * Options are populated from the organization's metadata configuration.
 * All fields must be selected before the Start Survey button enables.
 */
import { useState, useCallback, type ReactNode } from 'react';
import type { MetadataConfig, RespondentMetadata } from '@compass/types';

interface FieldState {
  value: string;
  touched: boolean;
}

const EMPTY_FIELD: FieldState = { value: '', touched: false };

interface MetadataFormProps {
  config: MetadataConfig;
  onSubmit: (metadata: RespondentMetadata) => void;
  isSubmitting: boolean;
}

interface SelectFieldProps {
  label: string;
  options: string[];
  field: FieldState;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function SelectField({ label, options, field, onChange, onBlur }: SelectFieldProps): ReactNode {
  const showError = field.touched && !field.value;
  const fieldId = `metadata-${label.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-[#424242]">
        {label}
        <span className="text-red-600"> *</span>
      </label>
      <select
        id={fieldId}
        value={field.value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-[#212121] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A3B4F]/30 ${
          showError ? 'border-red-500' : 'border-[#E5E4E0]'
        }`}
        aria-invalid={showError}
        aria-describedby={showError ? `${fieldId}-error` : undefined}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {showError && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600" role="alert">
          Required
        </p>
      )}
    </div>
  );
}

export function MetadataForm({ config, onSubmit, isSubmitting }: MetadataFormProps): ReactNode {
  const [department, setDepartment] = useState<FieldState>(EMPTY_FIELD);
  const [role, setRole] = useState<FieldState>(EMPTY_FIELD);
  const [location, setLocation] = useState<FieldState>(EMPTY_FIELD);
  const [tenure, setTenure] = useState<FieldState>(EMPTY_FIELD);

  const allSelected = !!(department.value && role.value && location.value && tenure.value);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Touch all fields to show validation
      setDepartment((prev) => ({ ...prev, touched: true }));
      setRole((prev) => ({ ...prev, touched: true }));
      setLocation((prev) => ({ ...prev, touched: true }));
      setTenure((prev) => ({ ...prev, touched: true }));

      if (!allSelected) return;

      onSubmit({
        department: department.value,
        role: role.value,
        location: location.value,
        tenure: tenure.value,
      });
    },
    [allSelected, department.value, role.value, location.value, tenure.value, onSubmit],
  );

  const fields: Array<{
    label: string;
    options: string[];
    field: FieldState;
    setter: React.Dispatch<React.SetStateAction<FieldState>>;
  }> = [
    { label: 'Department', options: config.departments, field: department, setter: setDepartment },
    { label: 'Role', options: config.roles, field: role, setter: setRole },
    { label: 'Location', options: config.locations, field: location, setter: setLocation },
    { label: 'Tenure', options: config.tenures, field: tenure, setter: setTenure },
  ];

  // Filter out fields with no options (e.g. departments may be empty)
  const visibleFields = fields.filter((f) => f.options.length > 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <h2 className="text-base font-semibold text-[#212121]">About You</h2>
      <p className="text-sm text-[#616161]">
        This information helps group responses for meaningful insights. It is never used to identify
        individuals.
      </p>

      {visibleFields.map(({ label, options, field, setter }) => (
        <SelectField
          key={label}
          label={label}
          options={options}
          field={field}
          onChange={(value) => setter({ value, touched: true })}
          onBlur={() => setter((prev) => ({ ...prev, touched: true }))}
        />
      ))}

      <button
        type="submit"
        disabled={!allSelected || isSubmitting}
        className="mt-2 h-11 w-full rounded-lg bg-[#0A3B4F] text-sm font-medium text-white transition-colors hover:bg-[#0A3B4F]/90 focus:outline-none focus:ring-2 focus:ring-[#0A3B4F]/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Starting...' : 'Start Survey'}
      </button>
    </form>
  );
}
