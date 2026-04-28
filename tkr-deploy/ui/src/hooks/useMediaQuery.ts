/**
 * useMediaQuery — React-style hook that returns whether a `matchMedia` query
 * currently matches, kept in sync via a `change` listener.
 *
 * Used to branch between desktop (≥768px) and mobile (<768px) layouts where
 * CSS media queries alone aren't sufficient (e.g. when the trees are too
 * different to share markup).
 *
 * @module hooks/useMediaQuery
 */

import { useEffect, useState } from 'preact/hooks';

export function useMediaQuery(query: string): boolean {
  const get = (): boolean =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (): void => setMatches(mql.matches);
    onChange(); // sync on mount in case SSR-rendered default differs
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Older Safari fallback
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

/** Convenience wrapper: true when viewport is < 768px (mobile breakpoint). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
