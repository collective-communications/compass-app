import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Sun, Moon } from 'lucide-react';

const THEME_KEY = 'compass-theme';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return null;
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface SurveyFooterProps {
  /** Callback invoked when the help button is activated. */
  onHelpClick: () => void;
}

/**
 * Minimal survey footer with a help button and a theme toggle.
 *
 * Theme preference persists in localStorage under the key "compass-theme".
 * When no preference is stored, the system preference is used.
 */
export function SurveyFooter({ onHelpClick }: SurveyFooterProps): React.ReactElement {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback((): void => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  return (
    <footer className="border-t border-[var(--grey-100)] bg-[var(--grey-50)]">
      <div className="mx-auto flex max-w-[600px] items-center justify-center gap-4 px-4 py-3">
        <button
          type="button"
          onClick={onHelpClick}
          aria-label="Get help"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] transition-colors"
        >
          <HelpCircle size={16} />
          <span>Help</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] transition-colors"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </footer>
  );
}
