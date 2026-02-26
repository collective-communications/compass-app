import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { LogOut, User, HelpCircle } from 'lucide-react';
import type { AuthUser, UserTier } from '@compass/types';

interface ProfileMenuProps {
  user: AuthUser;
  tier: UserTier;
  onSignOut: () => void;
}

export function ProfileMenu({ user, tier, onSignOut }: ProfileMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0]?.toUpperCase() ?? '?';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-core)] text-xs font-medium text-white"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName ?? user.email}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-[var(--grey-300)] bg-white py-1 shadow-lg">
          <div className="border-b border-[var(--grey-200)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--grey-900)]">
              {user.fullName ?? user.email}
            </p>
            <p className="text-xs text-[var(--grey-500)]">{user.email}</p>
          </div>

          <button
            type="button"
            onClick={() => { setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
          >
            <User size={16} />
            Profile
          </button>

          {tier === 'tier_1' && (
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
            >
              <HelpCircle size={16} />
              Help
            </button>
          )}

          <div className="border-t border-[var(--grey-200)]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
