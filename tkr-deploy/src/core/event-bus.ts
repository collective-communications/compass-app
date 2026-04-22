/**
 * Tiny, dependency-free typed pub/sub for deploy lifecycle events.
 *
 * The orchestrator publishes structured events; the API layer (SSE) and any
 * other in-process observers subscribe via {@link EventBus.on}. This module
 * intentionally has zero dependencies — it is the wire format between the
 * core and the API surface.
 */

/** Trigger kinds — what initiated this run. */
export type DeployTrigger = 'full' | 'step' | 'resume' | 'dry-run';

/** Terminal status of a run. */
export type DeployRunStatus = 'success' | 'failed' | 'partial';

/** Lifecycle event published by the orchestrator. */
export type DeployEvent =
  | {
      kind: 'run:start';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
    }
  | {
      kind: 'run:complete';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
      status: DeployRunStatus;
    }
  | {
      kind: 'run:dry-run';
      runId: string;
      timestamp: string;
      trigger: DeployTrigger;
      status?: DeployRunStatus;
    }
  | {
      kind: 'step:start';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
    }
  | {
      kind: 'step:complete';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
      durationMs: number;
      detail?: string;
    }
  | {
      kind: 'step:fail';
      runId: string;
      timestamp: string;
      stepId: string;
      label: string;
      provider: string;
      durationMs: number;
      error: string;
    };

/** Listener signature — called synchronously from {@link EventBus.publish}. */
export type DeployEventListener = (event: DeployEvent) => void;

/**
 * In-process event bus. Listeners are called synchronously in insertion order;
 * a throw from a listener is caught and logged to stderr so other listeners
 * still fire.
 */
export class EventBus {
  private readonly listeners: Set<DeployEventListener> = new Set();

  /** Subscribe. Returns an unsubscribe function for convenience. */
  on(listener: DeployEventListener): () => void {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  /** Unsubscribe. No-op if the listener was never registered. */
  off(listener: DeployEventListener): void {
    this.listeners.delete(listener);
  }

  /** Fan out an event to every subscriber. */
  publish(event: DeployEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Best-effort: a broken listener should not block the orchestrator.
        // eslint-disable-next-line no-console
        console.error('[EventBus] listener threw', err);
      }
    }
  }
}
