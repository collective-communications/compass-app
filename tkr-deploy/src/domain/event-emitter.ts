/**
 * Typed deploy event emitter for real-time pipeline visibility.
 * Connects the orchestrator to SSE consumers.
 */

export type DeployStepName =
  | "preflight"
  | "syncSecrets"
  | "pushMigrations"
  | "triggerPipeline"
  | "watchPipeline"
  | "healthCheck";

export interface DeployStartEvent {
  type: "deploy:start";
  timestamp: string;
  steps: DeployStepName[];
}

export interface StepStartEvent {
  type: "deploy:step-start";
  step: DeployStepName;
  timestamp: string;
}

export interface StepCompleteEvent {
  type: "deploy:step-complete";
  step: DeployStepName;
  timestamp: string;
  result: Record<string, unknown>;
}

export interface StepFailEvent {
  type: "deploy:step-fail";
  step: DeployStepName;
  timestamp: string;
  error: string;
}

export interface DeployCompleteEvent {
  type: "deploy:complete";
  timestamp: string;
  success: boolean;
  summary: Record<string, unknown>;
}

export interface PipelineStatusEvent {
  type: "pipeline:status";
  timestamp: string;
  runId: number;
  status: string;
  conclusion: string | null;
  url: string;
}

export type DeployEvent =
  | DeployStartEvent
  | StepStartEvent
  | StepCompleteEvent
  | StepFailEvent
  | DeployCompleteEvent
  | PipelineStatusEvent;

export type DeployEventType = DeployEvent["type"];

type EventHandler = (event: DeployEvent) => void;

/**
 * Simple pub/sub emitter for deploy lifecycle events.
 * Supports typed events with wildcard subscription via `*`.
 */
export class DeployEventEmitter {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to a specific event type or `*` for all events.
   * Returns an unsubscribe function.
   */
  on(eventType: DeployEventType | "*", handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit an event to all matching subscribers and wildcard subscribers.
   */
  emit(event: DeployEvent): void {
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        handler(event);
      }
    }

    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        handler(event);
      }
    }
  }

  /**
   * Remove all handlers for a specific event type, or all handlers if no type given.
   */
  removeAll(eventType?: DeployEventType | "*"): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Returns the count of subscribers for a given event type.
   */
  listenerCount(eventType: DeployEventType | "*"): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }
}
