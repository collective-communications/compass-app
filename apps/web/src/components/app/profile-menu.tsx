import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { LogOut, User, HelpCircle, Settings, Sun, Moon } from 'lucide-react';
import type { AuthUser, UserTier } from '@compass/types';

type Theme = 'light' | 'dark';
const THEME_KEY = 'compass-theme';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ProfileMenuProps {
  user: AuthUser;
  tier: UserTier;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export function ProfileMenu({ user, tier, onSignOut, onNavigate }: ProfileMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

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
        <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] py-1 shadow-lg">
          <div className="border-b border-[var(--grey-200)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--grey-900)]">
              {user.fullName ?? user.email}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
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

          {tier === 'tier_1' && (
            <button
              type="button"
              onClick={() => { setOpen(false); onNavigate('/admin/settings'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
            >
              <Settings size={16} />
              Settings
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

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
