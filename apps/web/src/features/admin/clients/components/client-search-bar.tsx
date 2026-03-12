/**
 * Search input and summary strip for the client list.
 * Filters organizations by name (client-side) and displays count summary.
 */

import type { ReactElement } from 'react';

export interface ClientSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalClients: number;
  activeSurveys: number;
}

export function ClientSearchBar({
  searchQuery,
  onSearchChange,
  totalClients,
  activeSurveys,
}: ClientSearchBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative">
        <label htmlFor="client-search" className="sr-only">
          Search clients
        </label>
        <input
          id="client-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search clients..."
          className="w-full rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-2 text-sm text-[var(--grey-900)] placeholder:text-[var(--grey-400)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)] sm:w-64"
        />
      </div>

      <div
        className="text-sm text-[var(--grey-600)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {totalClients} client{totalClients !== 1 ? 's' : ''} &middot; {activeSurveys} active survey{activeSurveys !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
