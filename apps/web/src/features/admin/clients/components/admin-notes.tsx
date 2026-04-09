/**
 * Admin notes panel for the client detail page.
 * Displays a reverse-chronological log of CC+C-only notes with inline add form.
 * Supports archiving with inline undo.
 */

import { useState, useCallback, type ReactElement, type FormEvent } from 'react';
import { Archive } from 'lucide-react';
import { useAdminNotes, useAddNote, useArchiveNote, useUnarchiveNote, type AdminNote } from '../hooks/use-organization';

export interface AdminNotesProps {
  orgId: string;
}

/** Formats a date string as "MMM D, YYYY at H:MM AM/PM" */
function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface NoteItemProps {
  note: AdminNote;
  onArchive: (noteId: string) => void;
  isArchiving: boolean;
}

function NoteItem({ note, onArchive, isArchiving }: NoteItemProps): ReactElement {
  return (
    <div className="group border-b border-[var(--grey-100)] py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--grey-700)]">{note.authorName}</p>
        <div className="flex items-center gap-2">
          <time className="shrink-0 text-xs text-[var(--text-tertiary)]" dateTime={note.createdAt}>
            {formatNoteDate(note.createdAt)}
          </time>
          <button
            type="button"
            onClick={() => onArchive(note.id)}
            disabled={isArchiving}
            className="shrink-0 rounded p-0.5 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:text-[var(--grey-700)] group-hover:opacity-100 disabled:opacity-50"
            aria-label="Archive note"
            title="Archive note"
          >
            <Archive size={12} />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">{note.content}</p>
    </div>
  );
}

export function AdminNotes({ orgId }: AdminNotesProps): ReactElement {
  const { data: notes, isLoading, error } = useAdminNotes(orgId);
  const addNote = useAddNote(orgId);
  const archiveNote = useArchiveNote(orgId);
  const unarchiveNote = useUnarchiveNote(orgId);
  const [content, setContent] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      const trimmed = content.trim();
      if (!trimmed) return;

      setAddError(null);
      addNote.mutate(
        { content: trimmed, authorName: 'Current User' },
        {
          onSuccess: () => {
            setContent('');
          },
          onError: (err) => {
            setAddError(err.message ?? 'Failed to add note.');
          },
        },
      );
    },
    [content, addNote],
  );

  const handleArchive = useCallback(
    (noteId: string): void => {
      setLastArchivedId(noteId);
      archiveNote.mutate(noteId);
    },
    [archiveNote],
  );

  const handleUndo = useCallback((): void => {
    if (lastArchivedId) {
      unarchiveNote.mutate(lastArchivedId);
      setLastArchivedId(null);
    }
  }, [lastArchivedId, unarchiveNote]);

  // Filter out archived notes
  const visibleNotes = notes?.filter((n) => !n.archivedAt) ?? [];

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Notes
      </h3>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">Notes are visible only to CC+C team</p>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setAddError(null);
          }}
          placeholder="Add a note..."
          className="min-w-0 flex-1 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-1 focus:ring-[var(--color-interactive)]"
          disabled={addNote.isPending}
        />
        <button
          type="submit"
          disabled={addNote.isPending || !content.trim()}
          className="shrink-0 rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addNote.isPending ? 'Adding...' : '+ Add Note'}
        </button>
      </form>

      {addError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {addError}
        </div>
      )}

      {/* Undo banner */}
      {lastArchivedId && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-[var(--grey-100)] p-3 text-sm text-[var(--grey-700)]">
          <span>Note archived.</span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={unarchiveNote.isPending}
            className="font-medium text-[var(--color-interactive)] underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}

      {isLoading && (
        <p className="py-4 text-center text-sm text-[var(--text-secondary)]">Loading notes...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          Failed to load notes.
        </div>
      )}

      {!isLoading && !error && visibleNotes.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
          No notes yet. Add a note about this client.
        </p>
      )}

      {visibleNotes.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          {visibleNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onArchive={handleArchive}
              isArchiving={archiveNote.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
