/**
 * App navigation hook — thin wrapper around TanStack Router's useNavigate.
 * Provides a testable seam so component tests don't need to mock @tanstack/react-router.
 */

import { useNavigate } from '@tanstack/react-router';

export type NavigateFn = ReturnType<typeof useNavigate>;

export function useAppNavigate(): NavigateFn {
  return useNavigate();
}
