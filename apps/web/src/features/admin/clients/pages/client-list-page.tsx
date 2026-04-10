/**
 * Admin client list page.
 * Displays all organizations as cards with search, summary, and add-client action.
 * Route: /clients (admin bottom tab)
 */

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import { useOrganizations } from '../hooks/use-organizations';
import { ClientCard } from '../components/client-card';
import { ClientSearchBar } from '../components/client-search-bar';
import { AddClientModal } from '../components/add-client-modal';

export interface ClientListPageProps {
  onSelectClient: (orgId: string) => void;
}

export function ClientListPage({ onSelectClient }: ClientListPageProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { data: organizations, isLoading, error } = useOrganizations();

  const filtered = useMemo(() => {
    if (!organizations) return [];
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase();
    return organizations.filter((org) => org.name.toLowerCase().includes(q));
  }, [organizations, searchQuery]);

  const activeSurveyCount = useMemo(
    () => (organizations ?? []).filter((org) => org.activeSurveyId !== null).length,
    [organizations],
  );

  const handleCreated = useCallback(
    (orgId: string): void => {
      onSelectClient(orgId);
    },
    [onSelectClient],
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--grey-900)]">Clients</h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90"
        >
          + Add Client
        </button>
      </div>

      <div className="mb-6">
        <ClientSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalClients={organizations?.length ?? 0}
          activeSurveys={activeSurveyCount}
        />
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
          Loading clients...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          Failed to load clients. Please try again.
        </div>
      )}

      {filtered.length === 0 && !isLoading && !error && (
        <div className="py-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {searchQuery
              ? 'No clients match your search.'
              : 'Add your first client to get started.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90"
            >
              + Add Client
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((org) => (
            <ClientCard
              key={org.id}
              organization={org}
              onClick={onSelectClient}
            />
          ))}
        </div>
      )}

      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
