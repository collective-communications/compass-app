/**
 * Admin notes panel for the client detail page.
 * Displays a reverse-chronological log of CC+C-only notes with inline add form.
 */

import { useState, useCallback, type ReactElement, type FormEvent } from 'react';
import { useAdminNotes, useAddNote, type AdminNote } from '../hooks/use-organization';

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

function NoteItem({ note }: { note: AdminNote }): ReactElement {
  return (
    <div className="border-b border-[var(--grey-100)] py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--grey-700)]">{note.authorName}</p>
        <time className="shrink-0 text-xs text-[var(--text-tertiary)]" dateTime={note.createdAt}>
          {formatNoteDate(note.createdAt)}
        </time>
      </div>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">{note.content}</p>
    </div>
  );
}

export function AdminNotes({ orgId }: AdminNotesProps): ReactElement {
  const { data: notes, isLoading, error } = useAdminNotes(orgId);
  const addNote = useAddNote(orgId);
  const [content, setContent] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

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

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
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
          className="min-w-0 flex-1 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)]"
          disabled={addNote.isPending}
        />
        <button
          type="submit"
          disabled={addNote.isPending || !content.trim()}
          className="shrink-0 rounded-lg bg-[var(--color-core)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {addNote.isPending ? 'Adding...' : '+ Add Note'}
        </button>
      </form>

      {addError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {addError}
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

      {!isLoading && !error && notes && notes.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
          No notes yet. Add a note about this client.
        </p>
      )}

      {notes && notes.length > 0 && (
        <div className="max-h-80 overflow-y-auto">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
