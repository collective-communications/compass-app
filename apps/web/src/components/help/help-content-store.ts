/* -------------------------------------------------------------------------- */
/*  HelpContentStore — route-keyed content map with longest-prefix matching   */
/* -------------------------------------------------------------------------- */

export interface HelpSection {
  heading: string;
  content: string;
  keyboardShortcuts?: string[];
}

export interface HelpEntry {
  title: string;
  sections: HelpSection[];
}

const helpContentMap = new Map<string, HelpEntry>();

/**
 * Register help content for a route prefix.
 * Content files (Tier 1/2/3) call this to populate the store.
 */
export function registerHelpContent(prefix: string, entry: HelpEntry): void {
  helpContentMap.set(prefix, entry);
}

/**
 * Retrieve help content for a given route path using longest-prefix matching.
 *
 * Tries the full path first, then progressively shorter prefixes by removing
 * trailing segments. Dynamic segments (e.g. UUIDs) are naturally handled
 * because the registered prefixes use static route patterns.
 *
 * Example: "/results/abc123/compass" tries:
 *   "/results/abc123/compass" -> "/results/abc123" -> "/results" -> "/"
 */
export function getHelpContent(routePath: string): HelpEntry | null {
  let path = routePath.replace(/\/+$/, '') || '/';

  while (path.length > 0) {
    const entry = helpContentMap.get(path);
    if (entry !== undefined) {
      return entry;
    }
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash <= 0) {
      break;
    }
    path = path.substring(0, lastSlash);
  }

  // Try root as final fallback
  return helpContentMap.get('/') ?? null;
}
