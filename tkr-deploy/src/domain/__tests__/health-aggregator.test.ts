import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { HealthAggregator } from '../health-aggregator.js';
import type { ProviderAdapter, ProviderHealth, ProviderStatus } from '../../types/provider.js';
import type { VaultClient } from '../../types/vault.js';

function makeAdapter(name: string, status: ProviderStatus = 'healthy', delayMs = 0): ProviderAdapter {
  return {
    name,
    async healthCheck(): Promise<ProviderHealth> {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return { provider: name, status, label: `${name} label`, details: {}, checkedAt: Date.now() };
    },
  };
}

function makeThrowingAdapter(name: string, error: Error | string = 'boom'): ProviderAdapter {
  return {
    name,
    async healthCheck(): Promise<ProviderHealth> {
      throw typeof error === 'string' ? new Error(error) : error;
    },
  };
}

function makeVault(connected = true, locked = false): VaultClient {
  return {
    async health() { return { connected, locked, name: 'test-vault' }; },
    async listSecrets() { return []; },
    async getSecret() { return ''; },
    async getAll() { return new Map(); },
    async getStatus() { return { connected, locked, name: 'test-vault', secretCount: 0 }; },
  };
}

function makeHangingVault(): VaultClient {
  return {
    async health() { return new Promise(() => {}); },
    async listSecrets() { return []; },
    async getSecret() { return ''; },
    async getAll() { return new Map(); },
    async getStatus() { return { connected: false, locked: true, name: 'hang', secretCount: 0 }; },
  };
}

describe('HealthAggregator', () => {
  let aggregator: HealthAggregator;

  afterEach(() => {
    aggregator?.stop();
  });

  test('checkAll — all healthy → rollup healthy', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('supabase'), makeAdapter('vercel')],
      vaultClient: makeVault(),
    });
    const snapshot = await aggregator.checkAll();
    expect(snapshot.rollup).toBe('healthy');
    expect(snapshot.providers).toHaveLength(3);
    expect(snapshot.providers.every((p) => p.status === 'healthy')).toBe(true);
    expect(snapshot.checkedAt).toBeTruthy();
  });

  test('checkAll — one down → rollup warning', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('supabase'), makeAdapter('vercel', 'down')],
      vaultClient: makeVault(),
    });
    const snapshot = await aggregator.checkAll();
    expect(snapshot.rollup).toBe('warning');
  });

  test('checkAll — all down → rollup down', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('supabase', 'down'), makeAdapter('vercel', 'down')],
      vaultClient: makeVault(false, true), // vault not connected → warning, not all down... need vault down too
    });
    // vault disconnected+locked = warning, so not all down
    // To get all down, vault must also fail
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('a', 'down'), makeAdapter('b', 'down')],
      vaultClient: makeHangingVault(),
      adapterTimeoutMs: 50,
    });
    const snapshot = await aggregator.checkAll();
    expect(snapshot.rollup).toBe('down');
    expect(snapshot.providers.every((p) => p.status === 'down')).toBe(true);
  });

  test('checkAll — mixed states → rollup warning', async () => {
    aggregator = new HealthAggregator({
      adapters: [
        makeAdapter('supabase', 'healthy'),
        makeAdapter('vercel', 'warning'),
        makeAdapter('github', 'unknown'),
      ],
      vaultClient: makeVault(),
    });
    const snapshot = await aggregator.checkAll();
    expect(snapshot.rollup).toBe('warning');
  });

  test('checkAll — timeout isolation (one hangs) → that one down, others healthy', async () => {
    const hanging: ProviderAdapter = {
      name: 'slow-service',
      healthCheck: () => new Promise(() => {}), // never resolves
    };
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('fast'), hanging],
      vaultClient: makeVault(),
      adapterTimeoutMs: 50,
    });
    const snapshot = await aggregator.checkAll();
    const fast = snapshot.providers.find((p) => p.provider === 'fast');
    const slow = snapshot.providers.find((p) => p.provider === 'slow-service');
    expect(fast?.status).toBe('healthy');
    expect(slow?.status).toBe('down');
    expect(slow?.error).toContain('timeout');
  });

  test('checkAll — latency measurement', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('supabase', 'healthy', 20)],
      vaultClient: makeVault(),
    });
    const snapshot = await aggregator.checkAll();
    const supabase = snapshot.providers.find((p) => p.provider === 'supabase');
    expect(supabase?.latencyMs).toBeGreaterThanOrEqual(10);
  });

  test('getLastResult — before any check → null', () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('a')],
      vaultClient: makeVault(),
    });
    expect(aggregator.getLastResult()).toBeNull();
  });

  test('getLastResult — after check → returns snapshot', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('a')],
      vaultClient: makeVault(),
    });
    const snapshot = await aggregator.checkAll();
    expect(aggregator.getLastResult()).toEqual(snapshot);
  });

  test('start/stop — polling with fake timers', async () => {
    let callCount = 0;
    const countingAdapter: ProviderAdapter = {
      name: 'counter',
      async healthCheck() {
        callCount++;
        return { provider: 'counter', status: 'healthy', label: 'counter', details: {}, checkedAt: Date.now() };
      },
    };
    aggregator = new HealthAggregator({
      adapters: [countingAdapter],
      vaultClient: makeVault(),
      pollIntervalMs: 100,
    });

    aggregator.start();
    expect(aggregator.isPolling).toBe(true);

    // Wait for initial + one interval
    await new Promise((r) => setTimeout(r, 250));
    aggregator.stop();
    expect(aggregator.isPolling).toBe(false);
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  test('start — idempotent (call twice, one interval)', async () => {
    let callCount = 0;
    const countingAdapter: ProviderAdapter = {
      name: 'counter',
      async healthCheck() {
        callCount++;
        return { provider: 'counter', status: 'healthy', label: 'counter', details: {}, checkedAt: Date.now() };
      },
    };
    aggregator = new HealthAggregator({
      adapters: [countingAdapter],
      vaultClient: makeVault(),
      pollIntervalMs: 100,
    });

    aggregator.start();
    aggregator.start(); // second call should be no-op

    await new Promise((r) => setTimeout(r, 250));
    aggregator.stop();
    // With one interval, expect ~3 calls (initial + 2 intervals). With two intervals it would be ~6.
    expect(callCount).toBeLessThanOrEqual(4);
  });

  test('stop — preserves lastResult', async () => {
    aggregator = new HealthAggregator({
      adapters: [makeAdapter('a')],
      vaultClient: makeVault(),
      pollIntervalMs: 100,
    });

    aggregator.start();
    await new Promise((r) => setTimeout(r, 50));
    aggregator.stop();

    const result = aggregator.getLastResult();
    expect(result).not.toBeNull();
    expect(result?.rollup).toBe('healthy');
  });

  test('checkAll never throws (all adapters throw various errors)', async () => {
    aggregator = new HealthAggregator({
      adapters: [
        makeThrowingAdapter('a', new Error('network error')),
        makeThrowingAdapter('b', new TypeError('type mismatch')),
        makeThrowingAdapter('c', 'string error'),
      ],
      vaultClient: makeHangingVault(),
      adapterTimeoutMs: 50,
    });

    // Should not throw
    const snapshot = await aggregator.checkAll();
    expect(snapshot.rollup).toBe('down');
    expect(snapshot.providers).toHaveLength(4);
    expect(snapshot.providers.every((p) => p.status === 'down')).toBe(true);
    expect(snapshot.providers[0].error).toBe('network error');
    expect(snapshot.providers[1].error).toBe('type mismatch');
    expect(snapshot.providers[2].error).toBe('string error');
    expect(snapshot.providers[3].error).toContain('timeout');
  });
});
