/**
 * Shared string→icon mapping used by navigation and menu components.
 *
 * Components reference icons by string identifier (e.g. `'compass'`) rather
 * than importing `lucide-react` directly. This keeps nav / menu config
 * serialisable and lets the icon set be swapped or themed in one place.
 */

import {
  Building,
  Compass,
  FileDown,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Settings,
  SunMoon,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Readonly<Record<string, LucideIcon>> = {
  // Tab icons
  building: Building,
  compass: Compass,
  'file-down': FileDown,
  'layout-grid': LayoutGrid,
  'trending-up': TrendingUp,

  // Profile-menu & shared icons
  'help-circle': HelpCircle,
  'log-out': LogOut,
  settings: Settings,
  'sun-moon': SunMoon,
  user: User,
} as const;

/** Known icon identifiers — union of `ICON_MAP` keys. */
export type IconId = keyof typeof ICON_MAP;
