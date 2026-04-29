import { describe, expect, test } from 'bun:test';
import {
  AnalyticsEventName,
  AnalyticsRouteTemplate,
  AnalyticsSurface,
  type AnalyticsEventPayload,
} from '@compass/types';
import {
  captureProductEvent,
  captureRouteView,
  resolveAnalyticsRoute,
  type AnalyticsTransport,
} from './analytics';

function makeTransport(): {
  calls: Array<{ endpoint: string; payload: AnalyticsEventPayload }>;
  transport: AnalyticsTransport;
} {
  const calls: Array<{ endpoint: string; payload: AnalyticsEventPayload }> = [];
  const transport: AnalyticsTransport = {
    send: (endpoint, payload): boolean => {
      calls.push({ endpoint, payload });
      return true;
    },
  };
  return { calls, transport };
}

function restoreGlobalProperty(key: keyof typeof globalThis, descriptor?: PropertyDescriptor): void {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, key);
}

describe('resolveAnalyticsRoute', () => {
  test('maps admin analytics to a safe route template', () => {
    expect(resolveAnalyticsRoute('/analytics')).toEqual({
      routeTemplate: AnalyticsRouteTemplate.ANALYTICS,
      surface: AnalyticsSurface.ADMIN,
    });
  });

  test('maps respondent URLs to token-free templates', () => {
    expect(resolveAnalyticsRoute('/s/real-token-value')).toEqual({
      routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SURVEY,
      surface: AnalyticsSurface.SURVEY,
    });
    expect(resolveAnalyticsRoute('/s/real-token-value/q/12')).toEqual({
      routeTemplate: AnalyticsRouteTemplate.RESPONDENT_QUESTION,
      surface: AnalyticsSurface.SURVEY,
    });
  });

  test('maps results tabs to route template and tab dimension', () => {
    expect(resolveAnalyticsRoute('/results/survey-1/dialogue')).toEqual({
      routeTemplate: AnalyticsRouteTemplate.RESULTS_DIALOGUE,
      surface: AnalyticsSurface.RESULTS,
      resultsTab: 'dialogue',
    });
  });

  test('falls back to not-found without preserving raw path', () => {
    expect(resolveAnalyticsRoute('/unknown/raw/path')).toEqual({
      routeTemplate: AnalyticsRouteTemplate.NOT_FOUND,
      surface: AnalyticsSurface.PUBLIC,
    });
  });
});

describe('captureProductEvent', () => {
  test('sends whitelisted payloads to the endpoint', () => {
    const { calls, transport } = makeTransport();

    captureProductEvent({
      eventName: AnalyticsEventName.SURVEY_STARTED,
      surface: AnalyticsSurface.SURVEY,
      routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SURVEY,
      buildEnv: 'test',
    }, {
      endpoint: 'https://supabase.test/functions/v1/capture-analytics',
      transport,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload).toEqual({
      eventName: 'survey_started',
      surface: 'survey',
      routeTemplate: '/s/$token',
      buildEnv: 'test',
    });
  });

  test('drops forbidden payloads before transport', () => {
    const { calls, transport } = makeTransport();

    captureProductEvent({
      eventName: AnalyticsEventName.ROUTE_VIEWED,
      surface: AnalyticsSurface.SURVEY,
      routeTemplate: AnalyticsRouteTemplate.RESPONDENT_SURVEY,
      userId: 'user-1',
    } as unknown as AnalyticsEventPayload, {
      endpoint: 'https://supabase.test/functions/v1/capture-analytics',
      transport,
    });

    expect(calls).toHaveLength(0);
  });

  test('transport errors do not bubble to callers', () => {
    const transport: AnalyticsTransport = {
      send: () => {
        throw new Error('network unavailable');
      },
    };

    expect(() => captureProductEvent({
      eventName: AnalyticsEventName.ROUTE_VIEWED,
      surface: AnalyticsSurface.PUBLIC,
      routeTemplate: AnalyticsRouteTemplate.HOME,
    }, {
      endpoint: 'https://supabase.test/functions/v1/capture-analytics',
      transport,
    })).not.toThrow();
  });

  test('uses credentialless fetch for cross-origin endpoints even when sendBeacon exists', async () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    const beaconCalls: string[] = [];
    const fetchCalls: Array<{ endpoint: string; credentials?: RequestCredentials }> = [];

    try {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          location: {
            href: 'http://localhost:42333/auth/callback',
            origin: 'http://localhost:42333',
          },
        },
      });
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {
          sendBeacon: (endpoint: string): boolean => {
            beaconCalls.push(endpoint);
            return true;
          },
        },
      });
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        value: (endpoint: string | URL | Request, init?: RequestInit): Promise<Response> => {
          fetchCalls.push({
            endpoint: endpoint.toString(),
            credentials: init?.credentials,
          });
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      });

      captureProductEvent({
        eventName: AnalyticsEventName.ROUTE_VIEWED,
        surface: AnalyticsSurface.AUTH,
        routeTemplate: AnalyticsRouteTemplate.AUTH_CALLBACK,
      }, {
        endpoint: 'https://supabase.test/functions/v1/capture-analytics',
      });

      await Promise.resolve();

      expect(beaconCalls).toHaveLength(0);
      expect(fetchCalls).toEqual([{
        endpoint: 'https://supabase.test/functions/v1/capture-analytics',
        credentials: 'omit',
      }]);
    } finally {
      restoreGlobalProperty('window', windowDescriptor);
      restoreGlobalProperty('navigator', navigatorDescriptor);
      restoreGlobalProperty('fetch', fetchDescriptor);
    }
  });
});

describe('captureRouteView', () => {
  test('sends route view with safe route template and role dimensions', () => {
    const { calls, transport } = makeTransport();

    captureRouteView('/clients/org-1/overview', {
      id: 'user-1',
      email: 'user@example.test',
      fullName: null,
      avatarUrl: null,
      role: 'ccc_member',
      organizationId: 'org-1',
      tier: 'tier_1',
    }, {
      endpoint: 'https://supabase.test/functions/v1/capture-analytics',
      transport,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.payload).toMatchObject({
      eventName: 'route_viewed',
      surface: 'admin',
      routeTemplate: '/clients/$orgId/overview',
      role: 'ccc_member',
      tier: 'tier_1',
      organizationId: 'org-1',
    });
  });
});
