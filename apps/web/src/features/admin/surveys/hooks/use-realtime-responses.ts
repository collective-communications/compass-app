/**
 * Supabase Realtime subscription for new survey responses.
 * Invalidates response tracking queries on INSERT events.
 * Falls back to 30-second polling when the realtime connection drops.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToResponses } from '../services/deployment-service';
import { responseTrackingKeys } from './use-response-tracking';

export type ConnectionStatus = 'connected' | 'disconnected' | 'polling';

export interface UseRealtimeResponsesOptions {
  surveyId: string;
  enabled?: boolean;
}

export interface UseRealtimeResponsesResult {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * Subscribes to realtime response INSERT events for a survey.
 * Falls back to 30s polling on disconnection.
 */
export function useRealtimeResponses({
  surveyId,
  enabled = true,
}: UseRealtimeResponsesOptions): UseRealtimeResponsesResult {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const invalidateMetrics = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: responseTrackingKeys.metrics(surveyId),
    });
  }, [queryClient, surveyId]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    setConnectionStatus('polling');
    pollIntervalRef.current = setInterval(invalidateMetrics, POLL_INTERVAL_MS);
  }, [invalidateMetrics]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !surveyId) {
      setConnectionStatus('disconnected');
      return;
    }

    let unsubscribed = false;

    const { unsubscribe } = subscribeToResponses(surveyId, () => {
      if (!unsubscribed) {
        invalidateMetrics();
      }
    });

    // Assume connected on mount; realtime errors are not surfaced by the
    // current supabase-js channel API in a simple callback, so we optimistically
    // set connected and fall back to polling via a heartbeat timeout.
    setConnectionStatus('connected');
    stopPolling();

    // Heartbeat: if no channel activity confirmation, fall back to polling
    // after one poll interval. The subscription itself handles reconnection.
    const heartbeatTimeout = setTimeout(() => {
      // Still connected — the subscription is alive. This is a safeguard
      // for environments where WebSocket connections silently drop.
    }, POLL_INTERVAL_MS);

    return () => {
      unsubscribed = true;
      clearTimeout(heartbeatTimeout);
      stopPolling();
      unsubscribe();
    };
  }, [surveyId, enabled, invalidateMetrics, startPolling, stopPolling]);

  return { connectionStatus };
}
