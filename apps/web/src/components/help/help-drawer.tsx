/**
 * Slide-out help panel. Mobile: bottom sheet. Desktop: side sheet (420px).
 * Reads current route and displays matching content from HelpContentStore.
 */

import { useEffect, useRef, useCallback, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import { getHelpContent } from './help-content-store';
import { useFocusTrap } from '../../hooks/use-focus-trap';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDrawer({ isOpen, onClose }: HelpDrawerProps): ReactElement {
  const drawerRef = useRef<HTMLDivElement>(null);
  const routerState = useRouterState();
  const routePath = routerState.location.pathname;

  // Auto-close on route change
  const prevPathRef = useRef(routePath);
  useEffect(() => {
    if (prevPathRef.current !== routePath && isOpen) {
      onClose();
    }
    prevPathRef.current = routePath;
  }, [routePath, isOpen, onClose]);

  // Escape closes
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useFocusTrap(drawerRef, isOpen);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const helpContent = getHelpContent(routePath);

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — mobile: bottom sheet, desktop: side sheet */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        onKeyDown={handleKeyDown}
        className={[
          'fixed z-50 bg-[var(--grey-50)] shadow-lg transition-transform duration-300 ease-in-out',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl lg:inset-x-auto',
          // Desktop: side sheet
          'lg:inset-y-0 lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none',
          // Transform
          isOpen
            ? 'translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full',
        ].join(' ')}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-[var(--grey-100)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--grey-100)] px-6 py-4">
          <h2 className="text-lg font-semibold">
            {helpContent !== null ? helpContent.title : 'Help'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--grey-50)] hover:text-[var(--grey-700)]"
            aria-label="Close help"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4">
          {helpContent !== null ? (
            <div className="flex flex-col gap-6">
              {helpContent.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="font-semibold text-[var(--grey-700)]">{section.heading}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{section.content}</p>
                  {section.keyboardShortcuts !== undefined &&
                    section.keyboardShortcuts.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {section.keyboardShortcuts.map((shortcut) => (
                          <li key={shortcut}>
                            <kbd className="rounded border border-[var(--grey-100)] bg-[var(--grey-50)] px-2 py-0.5 text-xs text-[var(--grey-700)]">
                              {shortcut}
                            </kbd>
                          </li>
                        ))}
                      </ul>
                    )}
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Need help? Contact your administrator.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
