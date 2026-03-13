/**
 * Manager entry for the A11y Report addon.
 * This file runs in the browser (Storybook manager iframe).
 */

import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { ADDON_ID, PANEL_ID } from './constants.ts';
import { PanelContent } from './Panel.ts';

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'A11y Report',
    render: ({ active }) => {
      if (!active) return null;
      return React.createElement(PanelContent);
    },
  });
});
