import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { Moon, Sun } from 'lucide-react';
import type { AuthUser } from '@compass/types';
import type { ProfileMenuItem } from '../../lib/navigation';
import { ICON_MAP } from '../../lib/icons';

/**
 * Profile dropdown menu. Renders an ordered list of items supplied by the
 * caller — tier differentiation lives in the nav config, not here. The menu
 * supports two kinds of items:
 *
 *   - navigation items (`href` set): fire `onNavigate(href)`
 *   - action items (`action` set):
 *       * `signOut` → call `onSignOut`
 *       * `toggleTheme` → flip local theme state
 *
 * Keyboard behaviour follows the WAI-ARIA menu pattern:
 *   - ArrowDown / ArrowUp cycle focus through `menuitem` elements
 *   - Home / End jump to first / last item
 *   - Escape closes the menu and returns focus to the trigger
 */

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
  items: readonly ProfileMenuItem[];
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export function ProfileMenu({ user, items, onSignOut, onNavigate }: ProfileMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setOpen(false), []);

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

  // When the menu opens, move focus to the first menuitem.
  useEffect(() => {
    if (!open) return;
    const firstItem = menuListRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open]);

  /** Keyboard nav within the menu — arrow keys cycle, Home/End jump, Escape closes. */
  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (!menuListRef.current) return;
      const items = Array.from(
        menuListRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      );
      if (items.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? items.indexOf(active) : -1;

      function focusIndex(index: number): void {
        const target = items[(index + items.length) % items.length];
        target?.focus();
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusIndex(currentIndex === -1 ? 0 : currentIndex + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusIndex(currentIndex === -1 ? items.length - 1 : currentIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusIndex(0);
          break;
        case 'End':
          event.preventDefault();
          focusIndex(items.length - 1);
          break;
        case 'Escape':
          event.preventDefault();
          closeMenu();
          triggerRef.current?.focus();
          break;
        default:
          break;
      }
    },
    [closeMenu],
  );

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
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
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
        <div
          ref={menuListRef}
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] py-1 shadow-lg"
        >
          <div className="border-b border-[var(--grey-200)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--grey-900)]">
              {user.fullName ?? user.email}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
          </div>

          {items.map((item, index) => {
            // Sign-out is visually separated from nav/settings items
            const needsSeparator =
              item.action === 'signOut' && index > 0 && items[index - 1]?.action !== 'signOut';

            const wrapperClass = needsSeparator ? 'border-t border-[var(--grey-200)]' : undefined;

            if (item.action === 'toggleTheme') {
              return (
                <div key={item.id} className={wrapperClass}>
                  <MenuButton
                    label={theme === 'light' ? 'Dark mode' : 'Light mode'}
                    icon={theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    onClick={toggleTheme}
                  />
                </div>
              );
            }

            if (item.action === 'signOut') {
              return (
                <div key={item.id} className={wrapperClass}>
                  <MenuButton
                    label={item.label}
                    icon={renderIcon(item.icon)}
                    onClick={() => {
                      setOpen(false);
                      onSignOut();
                    }}
                  />
                </div>
              );
            }

            if (item.href) {
              const href = item.href;
              return (
                <div key={item.id} className={wrapperClass}>
                  <MenuButton
                    label={item.label}
                    icon={renderIcon(item.icon)}
                    onClick={() => {
                      setOpen(false);
                      onNavigate(href);
                    }}
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Presentational sub-components ──────────────────────────────────────────

function MenuButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactElement | null;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--grey-700)] hover:bg-[var(--grey-100)]"
    >
      {icon}
      {label}
    </button>
  );
}

function renderIcon(iconId: string): ReactElement | null {
  const Icon = ICON_MAP[iconId];
  return Icon ? <Icon size={16} /> : null;
}
