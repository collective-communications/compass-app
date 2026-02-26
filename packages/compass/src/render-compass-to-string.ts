import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Compass } from './Compass';
import type { CompassProps } from './types';

/** Render the compass SVG to a static HTML string. Synchronous. Forces animated=false. */
export function renderCompassToString(props: CompassProps): string {
  return renderToStaticMarkup(
    createElement(Compass, { ...props, animated: false }),
  );
}
