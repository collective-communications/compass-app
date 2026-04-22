/**
 * Tiny history-push router backed by a Preact signal.
 *
 * Shell components read {@link currentPath$} directly to derive the active
 * pill, and imperative code calls {@link navigate} to push new paths.
 * A single `popstate` listener keeps `currentPath$` in sync with back/forward.
 *
 * Route definitions are passed into {@link initRouter} so tests can mount a
 * subset and the rest of the app never has to import individual screens.
 *
 * @module router
 */

import type { ComponentType } from 'preact';
import { signal, type Signal } from '@preact/signals';

/** One route: path → Preact component. */
export interface RouteDefinition {
  path: string;
  component: ComponentType;
}

export const currentPath$: Signal<string> = signal<string>('/');

let routes: RouteDefinition[] = [];
let fallbackPath = '/';
let initialized = false;

function readPath(): string {
  return window.location.pathname || '/';
}

/** Push `path` into history and update the signal. No-ops on same path. */
export function navigate(path: string): void {
  if (path === readPath()) {
    currentPath$.value = path;
    return;
  }
  window.history.pushState(null, '', path);
  currentPath$.value = path;
}

/** Replace current history entry (e.g. redirect unknown path → fallback). */
export function replace(path: string): void {
  window.history.replaceState(null, '', path);
  currentPath$.value = path;
}

/**
 * Resolve the current path to a component. Falls back to the registered
 * fallback route if no match is found.
 */
export function resolveRoute(path: string): ComponentType | null {
  const match = routes.find((r) => r.path === path);
  if (match) return match.component;
  const fallback = routes.find((r) => r.path === fallbackPath);
  return fallback?.component ?? null;
}

/**
 * Wire up the popstate listener and seed the path signal.
 *
 * @param routeTable Ordered list of routes.
 * @param fallback Path to redirect to when no route matches (default `/`).
 */
export function initRouter(
  routeTable: RouteDefinition[],
  fallback: string = '/',
): void {
  routes = routeTable;
  fallbackPath = fallback;

  const initial = readPath();
  const matched = routes.some((r) => r.path === initial);
  if (!matched) {
    replace(fallback);
  } else {
    currentPath$.value = initial;
  }

  if (initialized) return;
  initialized = true;

  window.addEventListener('popstate', () => {
    currentPath$.value = readPath();
  });
}
