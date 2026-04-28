/**
 * Hook for uploading organization logos to Supabase Storage.
 * Validates file type and size before upload; returns the public URL on success.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export interface UseLogoUploadReturn {
  uploadLogo: (file: File) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
}

export function useLogoUpload(orgId: string): UseLogoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        setError('File must be a PNG, JPEG, WebP, or SVG image.');
        return null;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('File size must be under 5 MB.');
        return null;
      }

      const ext = MIME_TO_EXT[file.type] ?? 'png';
      const path = `${orgId}/${Date.now()}.${ext}`;

      setIsUploading(true);

      try {
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          logger.error({ err: uploadError, fn: 'uploadLogo', orgId, path }, 'Logo upload failed');
          setError('Upload failed. Please try again.');
          return null;
        }

        const { data } = supabase.storage.from('logos').getPublicUrl(path);
        return data.publicUrl;
      } catch (err) {
        logger.error({ err, fn: 'uploadLogo', orgId, path }, 'Unexpected error during logo upload');
        setError('Upload failed. Please try again.');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [orgId],
  );

  return { uploadLogo, isUploading, error };
}
