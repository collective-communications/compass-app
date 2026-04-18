/**
 * Client detail layout component with tabbed navigation.
 * Route: /clients/:orgId (layout route)
 * Renders the shared chrome: header, archived banner, action menu, sub-tab nav, and outlet for child tabs.
 * Child routes: /overview, /surveys, /users.
 */

import { useState, useCallback, useEffect, useId, useRef, type KeyboardEvent, type ReactElement } from 'react';
import { useNavigate, useLocation, Outlet } from '@tanstack/react-router';
import { MoreVertical } from 'lucide-react';
import type { SubTab } from '../../../../components/navigation/sub-tab-nav';
import { SubTabNav } from '../../../../components/navigation/sub-tab-nav';
import { useOrganization, useArchiveOrganization, useUnarchiveOrganization } from '../hooks/use-organization';
import { EditOrgModal } from '../components/edit-org-modal';
import { DrilldownHeader } from '../../../../components/navigation/drilldown-header';

export interface ClientDetailPageProps {
  orgId: string;
}

const CLIENT_DETAIL_TABS: SubTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'users', label: 'Users' },
];

export function ClientDetailPage({ orgId }: ClientDetailPageProps): ReactElement {
  const { data: organization, isLoading, error } = useOrganization(orgId);
  const archiveOrg = useArchiveOrganization(orgId);
  const unarchiveOrg = useUnarchiveOrganization(orgId);
  const navigate = useNavigate();
  const location = useLocation();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const menuId = useId();
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Click-outside closes menu
  useEffect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(e: MouseEvent): void {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [menuOpen]);

  // Focus first menuitem when menu opens
  useEffect(() => {
    if (!menuOpen) return;
    const first = menuListRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }, [menuOpen]);

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (!menuListRef.current) return;
      const items = Array.from(
        menuListRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
      );
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? items.indexOf(active) : -1;
      const focusAt = (i: number): void => {
        items[(i + items.length) % items.length]?.focus();
      };

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusAt(currentIndex === -1 ? 0 : currentIndex + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusAt(currentIndex === -1 ? items.length - 1 : currentIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusAt(0);
          break;
        case 'End':
          event.preventDefault();
          focusAt(items.length - 1);
          break;
        case 'Escape':
          event.preventDefault();
          setMenuOpen(false);
          triggerRef.current?.focus();
          break;
      }
    },
    [],
  );

  const isArchived = organization && 'archivedAt' in organization && !!(organization as Record<string, unknown>).archivedAt;

  // Derive active tab from URL pathname (last segment)
  const activeTabId = (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment === 'overview' || lastSegment === 'surveys' || lastSegment === 'users') {
      return lastSegment;
    }
    return 'overview';
  })();

  const handleTabSelect = useCallback(
    (tabId: string): void => {
      void navigate({ to: `/clients/$orgId/${tabId}`, params: { orgId } });
    },
    [orgId, navigate],
  );

  const handleArchive = useCallback((): void => {
    setMenuOpen(false);
    setArchiveError(null);
    archiveOrg.mutate(undefined, {
      onError: (err) => {
        setArchiveError(err.message ?? 'Failed to archive client.');
      },
    });
  }, [archiveOrg]);

  const handleUnarchive = useCallback((): void => {
    setMenuOpen(false);
    setArchiveError(null);
    unarchiveOrg.mutate(undefined, {
      onError: (err) => {
        setArchiveError(err.message ?? 'Failed to unarchive client.');
      },
    });
  }, [unarchiveOrg]);

  if (isLoading) {
    return (
      <div>
        <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Loading client...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div>
        <DrilldownHeader backTo="/clients" backLabel="Back to clients" title="Client not found" />
        <div className="rounded-lg border border-[var(--feedback-error-border)] bg-[var(--feedback-error-bg)] p-4 text-sm text-[var(--feedback-error-text)]" role="alert">
          Failed to load client. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Archived banner */}
      {isArchived && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--feedback-warning-bg)] border border-[var(--feedback-warning-border)] p-3 text-sm text-[var(--feedback-warning-text)]" role="status">
          <span>This client is archived.</span>
          <button
            type="button"
            onClick={handleUnarchive}
            disabled={unarchiveOrg.isPending}
            className="text-sm font-medium text-[var(--feedback-warning-text)] underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            {unarchiveOrg.isPending ? 'Restoring\u2026' : 'Unarchive'}
          </button>
        </div>
      )}

      {/* Archive error */}
      {archiveError && (
        <div className="mb-4 rounded-lg border border-[var(--feedback-error-border)] bg-[var(--feedback-error-bg)] p-3 text-sm text-[var(--feedback-error-text)]" role="alert">
          {archiveError}
        </div>
      )}

      {/* Drilldown header */}
      <DrilldownHeader backTo="/clients" backLabel="Back to clients" title={organization.name}>
        {/* Action menu */}
        <div ref={menuContainerRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-lg px-3 py-1.5 text-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--grey-100)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-interactive)]"
            aria-label="Actions menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              ref={menuListRef}
              id={menuId}
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] py-1 shadow-lg"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setEditModalOpen(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
              >
                Edit
              </button>
              {isArchived ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleUnarchive}
                  disabled={unarchiveOrg.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)] disabled:opacity-50"
                >
                  {unarchiveOrg.isPending ? 'Restoring\u2026' : 'Unarchive'}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleArchive}
                  disabled={archiveOrg.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)] disabled:opacity-50"
                >
                  {archiveOrg.isPending ? 'Archiving\u2026' : 'Archive'}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
              >
                Export
              </button>
            </div>
          )}
        </div>
      </DrilldownHeader>

      {/* Sub-tab navigation */}
      <div className="mb-6">
        <SubTabNav
          tabs={CLIENT_DETAIL_TABS}
          activeId={activeTabId}
          onSelect={handleTabSelect}
          ariaLabel="Client detail tabs"
          idPrefix="client-detail"
        />
      </div>

      {/* Child route outlet */}
      <div className="mt-6">
        <Outlet />
      </div>

      {/* Edit modal */}
      <EditOrgModal
        open={editModalOpen}
        organization={organization}
        onClose={() => setEditModalOpen(false)}
      />

    </div>
  );
}
