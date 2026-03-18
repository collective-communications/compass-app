/**
 * Context for sharing activeDimension state between the results layout
 * and the compass tab route.
 */

import { createContext, useContext } from 'react';
import type { DimensionNavId } from '../tabs/compass';

export interface DimensionContextValue {
  activeDimension: DimensionNavId;
  setActiveDimension: (dimension: DimensionNavId) => void;
}

export const DimensionContext = createContext<DimensionContextValue>({
  activeDimension: 'overview',
  setActiveDimension: () => {},
});

/** Hook for compass tab route to consume the lifted dimension state. */
export function useActiveDimension(): DimensionContextValue {
  return useContext(DimensionContext);
}
