/**
 * API helpers for the new UI.
 *
 * - {@link apiFetch} — JSON fetch with `{ success, data }` envelope unwrap,
 *   abort support, query-string building, and 4xx/5xx error normalization.
 * - {@link createEventSource} — typed Server-Sent Events client. The server
 *   emits named events (`event: run:start`, `event: step:start`, …) so the
 *   helper wires per-kind listeners instead of relying on the default
 *   `message` event.
 *
 * @module api
 */

import type { SseEventKind } from './types.js';

const API_BASE = '';

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

/** Options accepted by {@link apiFetch}. */
export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

/** Error thrown for non-2xx responses. Carries status for caller branching. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  const base = `${API_BASE}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Fetch JSON from the API, unwrapping the `{ success, data }` envelope.
 *
 * @throws {ApiError} on non-2xx responses.
 */
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions,
): Promise<T> {
  const url = buildUrl(path, options?.query);
  const init: RequestInit = {
    method: options?.method ?? 'GET',
    signal: options?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  };
  if (options?.body !== undefined) {
    init.body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiError(
      `API ${response.status} ${response.statusText} — ${body || '(empty body)'}`,
      response.status,
      body,
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json()) as
    | { success: boolean; data: T; error?: string }
    | T;

  // Unwrap the `{ success, data }` envelope if present.
  if (
    json &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in (json as Record<string, unknown>)
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// createEventSource
// ---------------------------------------------------------------------------

/**
 * Map of event-kind → typed handler. Unhandled kinds are ignored.
 *
 * The server emits named SSE events (not default `message` events), so each
 * kind gets its own `addEventListener` wiring here.
 */
export type SseHandlers = Partial<Record<SseEventKind, (data: unknown) => void>>;

/**
 * Open an EventSource and wire each handler to its matching event name.
 *
 * Returns the underlying {@link EventSource}; callers are responsible for
 * calling `.close()` on teardown.
 */
export function createEventSource(
  path: string,
  handlers: SseHandlers,
): EventSource {
  const url = `${API_BASE}${path}`;
  const source = new EventSource(url);

  for (const [kind, handler] of Object.entries(handlers)) {
    if (!handler) continue;
    source.addEventListener(kind, (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      let data: unknown = null;
      try {
        data = messageEvent.data ? JSON.parse(messageEvent.data) : null;
      } catch {
        data = messageEvent.data;
      }
      handler(data);
    });
  }

  return source;
}
