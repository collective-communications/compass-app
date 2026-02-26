/**
 * Slide-out help panel. Mobile: bottom sheet. Desktop: side sheet (420px).
 * Reads current route and displays matching content from HelpContentStore.
 */

import { useEffect, useRef, useCallback, type ReactElement } from 'react';
import { X } from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import { getHelpContent } from './help-content-store';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Trap Tab focus within a container element.
 * Returns a keydown handler to attach to the container.
 */
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (container === null) return;

    // Focus the first focusable element on open
    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Tab' || container === null) return;

      const focusables = container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusables.length === 0) return;

      const first = focusables[0] as HTMLElement | undefined;
      const last = focusables[focusables.length - 1] as HTMLElement | undefined;

      if (first === undefined || last === undefined) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
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
          'fixed z-50 bg-white shadow-lg transition-transform duration-300 ease-in-out',
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
          <div className="h-1 w-10 rounded-full bg-[#E5E4E0]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E4E0] px-6 py-4">
          <h2 className="text-lg font-semibold">
            {helpContent !== null ? helpContent.title : 'Help'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#757575] hover:bg-[#F5F5F5] hover:text-[#424242]"
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
                  <h3 className="font-semibold text-[#424242]">{section.heading}</h3>
                  <p className="mt-1 text-sm text-[#757575]">{section.content}</p>
                  {section.keyboardShortcuts !== undefined &&
                    section.keyboardShortcuts.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {section.keyboardShortcuts.map((shortcut) => (
                          <li key={shortcut}>
                            <kbd className="rounded border border-[#E5E4E0] bg-[#F5F5F5] px-2 py-0.5 text-xs text-[#424242]">
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
            <p className="text-sm text-[#757575]">
              Need help? Contact your administrator.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
