const API_BASE = '';

/**
 * Fetch JSON from the API with error handling.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers as Record<string, string> },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${response.statusText} — ${body}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Create a Server-Sent Events connection.
 */
export function createEventSource(
  path: string,
  onMessage: (event: MessageEvent) => void,
): EventSource {
  const url = `${API_BASE}${path}`;
  const source = new EventSource(url);
  source.onmessage = onMessage;
  return source;
}
