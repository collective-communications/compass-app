/**
 * Preset entry — tells Storybook to load our manager entry in the browser.
 * This file runs in Node.js and must not import browser-only modules.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function managerEntries(entry: string[] = []): string[] {
  return [...entry, resolve(__dirname, 'manager.ts')];
}
