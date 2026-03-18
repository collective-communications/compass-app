/**
 * Modal dialog for editing organization details.
 * Pre-fills with current values. Inline validation, no toast.
 */

import { useState, useCallback, useRef, useEffect, type ReactElement, type FormEvent } from 'react';
import type { OrganizationSummary } from '@compass/types';
import { useUpdateOrganization } from '../hooks/use-organization';
import { useFocusTrap } from '../../../../hooks/use-focus-trap';

export interface EditOrgModalProps {
  open: boolean;
  organization: OrganizationSummary;
  onClose: () => void;
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

function toFormState(org: OrganizationSummary): FormState {
  return {
    name: org.name,
    industry: org.industry ?? '',
    employeeCount: org.employeeCount !== null ? String(org.employeeCount) : '',
    primaryContactName: org.primaryContactName ?? '',
    primaryContactEmail: org.primaryContactEmail ?? '',
  };
}

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

export function EditOrgModal({ open, organization, onClose }: EditOrgModalProps): ReactElement | null {
  const [form, setForm] = useState<FormState>(() => toFormState(organization));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const updateOrg = useUpdateOrganization(organization.id);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, true);

  // Reset form when modal opens or organization changes
  useEffect(() => {
    if (open) {
      setForm(toFormState(organization));
      setErrors({});
      setSubmitError(null);
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [open, organization]);

  const updateField = useCallback((field: keyof FormState, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

      updateOrg.mutate(
        {
          name: form.name.trim(),
          industry: form.industry.trim() || undefined,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
          primaryContactName: form.primaryContactName.trim() || undefined,
          primaryContactEmail: form.primaryContactEmail.trim() || undefined,
        },
        {
          onSuccess: () => {
            onClose();
          },
          onError: (err) => {
            setSubmitError(err.message ?? 'Failed to update organization. Please try again.');
          },
        },
      );
    },
    [form, updateOrg, onClose],
  );

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-org-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 shadow-lg">
        <h2 id="edit-org-title" className="mb-6 text-xl font-bold text-[var(--grey-900)]">
          Edit Client
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            {/* Name (required) */}
            <div>
              <label htmlFor="edit-org-name" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Organization Name <span className="text-red-700" aria-label="required">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="edit-org-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.name
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core-text)] focus:ring-[var(--color-core-text)]'
                }`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'edit-org-name-error' : undefined}
                required
              />
              {errors.name && (
                <p id="edit-org-name-error" className="mt-1 text-xs text-red-700" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="edit-org-industry" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Industry
              </label>
              <input
                id="edit-org-industry"
                type="text"
                value={form.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)]"
              />
            </div>

            {/* Employee Count */}
            <div>
              <label htmlFor="edit-org-employee-count" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Employee Count
              </label>
              <input
                id="edit-org-employee-count"
                type="number"
                min="1"
                value={form.employeeCount}
                onChange={(e) => updateField('employeeCount', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.employeeCount
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core-text)] focus:ring-[var(--color-core-text)]'
                }`}
                aria-invalid={!!errors.employeeCount}
                aria-describedby={errors.employeeCount ? 'edit-org-employee-error' : undefined}
              />
              {errors.employeeCount && (
                <p id="edit-org-employee-error" className="mt-1 text-xs text-red-700" role="alert">
                  {errors.employeeCount}
                </p>
              )}
            </div>

            {/* Primary Contact Name */}
            <div>
              <label htmlFor="edit-org-contact-name" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Primary Contact Name
              </label>
              <input
                id="edit-org-contact-name"
                type="text"
                value={form.primaryContactName}
                onChange={(e) => updateField('primaryContactName', e.target.value)}
                className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)]"
              />
            </div>

            {/* Primary Contact Email */}
            <div>
              <label htmlFor="edit-org-contact-email" className="mb-1 block text-sm font-medium text-[var(--grey-700)]">
                Primary Contact Email
              </label>
              <input
                id="edit-org-contact-email"
                type="email"
                value={form.primaryContactEmail}
                onChange={(e) => updateField('primaryContactEmail', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--grey-900)] focus:outline-none focus:ring-1 ${
                  errors.primaryContactEmail
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-[var(--grey-100)] focus:border-[var(--color-core-text)] focus:ring-[var(--color-core-text)]'
                }`}
                aria-invalid={!!errors.primaryContactEmail}
                aria-describedby={errors.primaryContactEmail ? 'edit-org-email-error' : undefined}
              />
              {errors.primaryContactEmail && (
                <p id="edit-org-email-error" className="mt-1 text-xs text-red-700" role="alert">
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
              disabled={updateOrg.isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-100)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateOrg.isPending}
              className="rounded-lg bg-[var(--color-core)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateOrg.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
