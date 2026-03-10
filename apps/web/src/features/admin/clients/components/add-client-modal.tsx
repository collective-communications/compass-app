/**
 * Modal dialog for creating a new organization.
 * Inline validation, no toast notifications.
 * On success, calls the onCreated callback.
 */

import { useState, useCallback, useRef, useEffect, type ReactElement, type FormEvent } from 'react';
import { useCreateOrganization } from '../hooks/use-organizations';

export interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (orgId: string) => void;
}

interface FormState {
  name: string;
  industry: string;
  employeeCount: string;
  primaryContactName: string;
  primaryContactEmail: string;
}

interface FormErrors {
  name?: string;
  employeeCount?: string;
  primaryContactEmail?: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  industry: '',
  employeeCount: '',
  primaryContactName: '',
  primaryContactEmail: '',
};

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Organization name is required';
  }

  if (form.employeeCount && (isNaN(Number(form.employeeCount)) || Number(form.employeeCount) < 1)) {
    errors.employeeCount = 'Must be a positive number';
  }

  if (form.primaryContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryContactEmail)) {
    errors.primaryContactEmail = 'Invalid email address';
  }

  return errors;
}

export function AddClientModal({ open, onClose, onCreated }: AddClientModalProps): ReactElement | null {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createOrg = useCreateOrganization();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitError(null);
      // Delay focus to allow dialog to render
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [open]);

  const updateField = useCallback((field: keyof FormState, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      const validationErrors = validateForm(form);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      createOrg.mutate(
        {
          name: form.name.trim(),
          industry: form.industry.trim() || undefined,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
          primaryContactName: form.primaryContactName.trim() || undefined,
          primaryContactEmail: form.primaryContactEmail.trim() || undefined,
        },
        {
          onSuccess: (org) => {
            onCreated(org.id);
            onClose();
          },
          onError: (err) => {
            setSubmitError(err.message ?? 'Failed to create organization. Please try again.');
          },
        },
      );
    },
    [form, createOrg, onCreated, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-client-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 shadow-lg">
        <h2 id="add-client-title" className="mb-6 text-xl font-bold text-[var(--grey-900)]">
          Add Client
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            {/* Name (required) */}
            <div>
              <label htmlFor="org-name" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Organization Name <span className="text-red-600" aria-label="required">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="org-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.name
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core)] focus:ring-[var(--color-core)]'
                }`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'org-name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="org-name-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="org-industry" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Industry
              </label>
              <input
                id="org-industry"
                type="text"
                value={form.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
              />
            </div>

            {/* Employee Count */}
            <div>
              <label htmlFor="org-employee-count" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Employee Count
              </label>
              <input
                id="org-employee-count"
                type="number"
                min="1"
                value={form.employeeCount}
                onChange={(e) => updateField('employeeCount', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.employeeCount
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core)] focus:ring-[var(--color-core)]'
                }`}
                aria-invalid={!!errors.employeeCount}
                aria-describedby={errors.employeeCount ? 'org-employee-error' : undefined}
              />
              {errors.employeeCount && (
                <p id="org-employee-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.employeeCount}
                </p>
              )}
            </div>

            {/* Primary Contact Name */}
            <div>
              <label htmlFor="org-contact-name" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Primary Contact Name
              </label>
              <input
                id="org-contact-name"
                type="text"
                value={form.primaryContactName}
                onChange={(e) => updateField('primaryContactName', e.target.value)}
                className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
              />
            </div>

            {/* Primary Contact Email */}
            <div>
              <label htmlFor="org-contact-email" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Primary Contact Email
              </label>
              <input
                id="org-contact-email"
                type="email"
                value={form.primaryContactEmail}
                onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.primaryContactEmail
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core)] focus:ring-[var(--color-core)]'
                }`}
                aria-invalid={!!errors.primaryContactEmail}
                aria-describedby={errors.primaryContactEmail ? 'org-email-error' : undefined}
              />
              {errors.primaryContactEmail && (
                <p id="org-email-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.primaryContactEmail}
                </p>
              )}
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createOrg.isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrg.isPending}
              className="rounded-lg bg-[var(--color-core)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createOrg.isPending ? 'Creating...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
