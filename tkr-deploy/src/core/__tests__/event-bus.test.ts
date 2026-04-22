import { describe, test, expect, mock } from 'bun:test';
import { EventBus, type DeployEvent } from '../event-bus.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<DeployEvent> = {}): DeployEvent {
  return {
    kind: 'run:start',
    runId: 'test-run-1',
    timestamp: new Date().toISOString(),
    trigger: 'full',
    ...overrides,
  } as DeployEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventBus', () => {
  test('listener receives published events', () => {
    const bus = new EventBus();
    const received: DeployEvent[] = [];
    bus.on((event) => received.push(event));

    const event = makeEvent();
    bus.publish(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });

  test('multiple listeners all receive the same event', () => {
    const bus = new EventBus();
    const receivedA: DeployEvent[] = [];
    const receivedB: DeployEvent[] = [];
    const receivedC: DeployEvent[] = [];

    bus.on((event) => receivedA.push(event));
    bus.on((event) => receivedB.push(event));
    bus.on((event) => receivedC.push(event));

    const event = makeEvent();
    bus.publish(event);

    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(1);
    expect(receivedC).toHaveLength(1);
    expect(receivedA[0]).toEqual(event);
    expect(receivedB[0]).toEqual(event);
    expect(receivedC[0]).toEqual(event);
  });

  test('off removes a listener so it is no longer called', () => {
    const bus = new EventBus();
    const received: DeployEvent[] = [];
    const listener = (event: DeployEvent) => received.push(event);

    bus.on(listener);
    bus.publish(makeEvent());
    expect(received).toHaveLength(1);

    bus.off(listener);
    bus.publish(makeEvent());
    // Should still be 1 — listener was removed
    expect(received).toHaveLength(1);
  });

  test('unsubscribe function returned by on() removes the listener', () => {
    const bus = new EventBus();
    const received: DeployEvent[] = [];

    const unsub = bus.on((event) => received.push(event));
    bus.publish(makeEvent());
    expect(received).toHaveLength(1);

    unsub();
    bus.publish(makeEvent());
    expect(received).toHaveLength(1);
  });

  test('a throwing listener does not prevent other listeners from firing', () => {
    const bus = new EventBus();
    const receivedBefore: DeployEvent[] = [];
    const receivedAfter: DeployEvent[] = [];

    bus.on((event) => receivedBefore.push(event));
    bus.on(() => {
      throw new Error('listener boom');
    });
    bus.on((event) => receivedAfter.push(event));

    const event = makeEvent();
    // Should not throw — EventBus catches listener errors
    bus.publish(event);

    expect(receivedBefore).toHaveLength(1);
    expect(receivedAfter).toHaveLength(1);
    expect(receivedBefore[0]).toEqual(event);
    expect(receivedAfter[0]).toEqual(event);
  });

  test('publishing with no listeners is a no-op (no throw)', () => {
    const bus = new EventBus();
    expect(() => bus.publish(makeEvent())).not.toThrow();
  });

  test('off on an unregistered listener is a no-op (no throw)', () => {
    const bus = new EventBus();
    const listener = mock(() => {});
    expect(() => bus.off(listener)).not.toThrow();
  });
});
