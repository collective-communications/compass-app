/**
 * Bun test preload: registers happy-dom globals (window, document, etc.)
 * for component tests that need a DOM environment.
 *
 * Uses GlobalRegistrator to ensure DOM nodes maintain proper window
 * back-references (required by happy-dom's SelectorParser).
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

