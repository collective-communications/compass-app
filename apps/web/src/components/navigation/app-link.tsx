/**
 * App link component — thin wrapper around TanStack Router's Link.
 * Provides a testable seam so component tests don't need to mock @tanstack/react-router.
 *
 * Uses relaxed typing for `to` prop to support dynamic route strings from config.
 */

import { Link } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';

interface AppLinkProps {
  to: string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function AppLink({ to, children, className, ...rest }: AppLinkProps): ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Link to={to as any} className={className} {...rest}>{children}</Link>;
}
