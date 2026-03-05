/**
 * Hook for generating signed download URLs from Supabase Storage.
 * Fetches a time-limited URL on demand when the user clicks download.
 */

import { useCallback, useState } from 'react';
import { getReportDownloadUrl } from '../services/report-api';

export interface UseReportDownloadReturn {
  /** Signed download URL, null until fetched */
  downloadUrl: string | null;
  /** Whether the signed URL is being fetched */
  isLoading: boolean;
  /** Error message if URL generation failed */
  error: string | null;
  /** Fetch (or refresh) the signed URL for the given storage path */
  fetchUrl: (storagePath: string) => Promise<string | null>;
}

/** Provides on-demand signed URL generation for report downloads */
export function useReportDownload(): UseReportDownloadReturn {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const url = await getReportDownloadUrl(storagePath);
      setDownloadUrl(url);
      return url;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to generate download link.';
      setError(message);
      setDownloadUrl(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { downloadUrl, isLoading, error, fetchUrl };
}
