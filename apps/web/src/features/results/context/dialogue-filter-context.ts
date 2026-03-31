/**
 * Context for sharing dialogue topic filter state between the results layout
 * (sidebar navigation) and the dialogue tab content.
 */

import { createContext, useContext } from 'react';

export interface DialogueTopicItem {
  id: string;
  label: string;
  count: number;
}

export interface DialogueFilterContextValue {
  activeTopicId: string | null;
  setActiveTopicId: (id: string | null) => void;
  topics: DialogueTopicItem[];
}

export const DialogueFilterContext = createContext<DialogueFilterContextValue>({
  activeTopicId: null,
  setActiveTopicId: () => {},
  topics: [],
});

/** Hook for consuming dialogue filter state from context. */
export function useDialogueFilter(): DialogueFilterContextValue {
  return useContext(DialogueFilterContext);
}
