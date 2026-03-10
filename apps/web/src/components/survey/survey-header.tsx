import { ClientLogo } from './client-logo';

interface SurveyHeaderProps {
  /** Organization name displayed beside the logo. */
  orgName: string;
  /** Optional URL for the organization logo image. */
  logoUrl?: string;
  /** Optional callback to navigate to the save-progress screen. */
  onSave?: () => void;
}

/**
 * Sticky survey header showing the organization logo and name.
 *
 * Deliberately contains no navigation, user info, or sign-out controls
 * to enforce structural anonymity.
 */
export function SurveyHeader({ orgName, logoUrl, onSave }: SurveyHeaderProps): React.ReactElement {
  return (
    <header
      className="sticky top-0 z-10 bg-[var(--grey-50)] border-b border-[var(--grey-100)]"
    >
      <div className="mx-auto flex max-w-[600px] items-center gap-3 px-4 py-3">
        <ClientLogo src={logoUrl} orgName={orgName} size="md" />
        <span className="truncate text-sm font-medium text-[var(--grey-700)]">
          {orgName}
        </span>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            className="ml-auto text-sm font-medium text-[var(--grey-500)] hover:text-[var(--grey-700)] transition-colors"
          >
            Save
          </button>
        )}
      </div>
    </header>
  );
}
