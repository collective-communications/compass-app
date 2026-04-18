/**
 * App link component — thin wrapper around TanStack Router's Link.
 * Provides a testable seam so component tests don't need to mock @tanstack/react-router.
 *
 * `to` is declared as a plain `string` because navigation config files drive
 * runtime-composed paths (e.g. `/${tier}/settings`) that TanStack's generated
 * route-path union cannot prove statically. We intentionally widen the Link
 * prop here; misspelled routes are caught at runtime via the router's
 * 404-fallback instead of at compile time at every call site.
 */

import { Link, type LinkProps } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';

interface AppLinkProps {
  to: string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export function AppLink({ to, children, className, ...rest }: AppLinkProps): ReactElement {
  // Widen through `LinkProps['to']` (a union that includes string when loose
  // mode is on) instead of `as any` so future RouterRegistry changes surface
  // here rather than silently drifting.
  return <Link to={to as LinkProps['to']} className={className} {...rest}>{children}</Link>;
}
