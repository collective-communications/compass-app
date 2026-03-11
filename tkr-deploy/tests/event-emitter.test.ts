import { describe, it, expect, beforeEach } from "bun:test";
import {
  DeployEventEmitter,
  type DeployEvent,
} from "../src/domain/event-emitter.js";

describe("DeployEventEmitter", () => {
  let emitter: DeployEventEmitter;

  beforeEach(() => {
    emitter = new DeployEventEmitter();
  });

  it("delivers events to matching subscribers", () => {
    const received: DeployEvent[] = [];
    emitter.on("deploy:start", (e) => received.push(e));

    emitter.emit({
      type: "deploy:start",
      timestamp: "2026-03-04T00:00:00Z",
      steps: ["preflight", "syncSecrets"],
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("deploy:start");
  });

  it("does not deliver events to non-matching subscribers", () => {
    const received: DeployEvent[] = [];
    emitter.on("deploy:complete", (e) => received.push(e));

    emitter.emit({
      type: "deploy:start",
      timestamp: "2026-03-04T00:00:00Z",
      steps: [],
    });

    expect(received).toHaveLength(0);
  });

  it("wildcard subscribers receive all events", () => {
    const received: DeployEvent[] = [];
    emitter.on("*", (e) => received.push(e));

    emitter.emit({
      type: "deploy:start",
      timestamp: "2026-03-04T00:00:00Z",
      steps: [],
    });
    emitter.emit({
      type: "deploy:complete",
      timestamp: "2026-03-04T00:00:00Z",
      success: true,
      summary: {},
    });

    expect(received).toHaveLength(2);
  });

  it("unsubscribe removes the handler", () => {
    const received: DeployEvent[] = [];
    const unsub = emitter.on("deploy:start", (e) => received.push(e));
    unsub();

    emitter.emit({
      type: "deploy:start",
      timestamp: "2026-03-04T00:00:00Z",
      steps: [],
    });

    expect(received).toHaveLength(0);
  });

  it("removeAll clears all handlers", () => {
    emitter.on("deploy:start", () => {});
    emitter.on("deploy:complete", () => {});
    emitter.on("*", () => {});

    emitter.removeAll();

    expect(emitter.listenerCount("deploy:start")).toBe(0);
    expect(emitter.listenerCount("*")).toBe(0);
  });

  it("removeAll with type clears only that type", () => {
    emitter.on("deploy:start", () => {});
    emitter.on("deploy:complete", () => {});

    emitter.removeAll("deploy:start");

    expect(emitter.listenerCount("deploy:start")).toBe(0);
    expect(emitter.listenerCount("deploy:complete")).toBe(1);
  });

  it("listenerCount returns correct count", () => {
    emitter.on("deploy:start", () => {});
    emitter.on("deploy:start", () => {});

    expect(emitter.listenerCount("deploy:start")).toBe(2);
    expect(emitter.listenerCount("deploy:complete")).toBe(0);
  });
});
