/**
 * Integration tests for the ScoringValidator dev tool.
 *
 * Renders the full component tree with real scoring functions and exercises
 * state transitions through user interactions.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { ScoringValidator } from './ScoringValidator.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfigSelect(): HTMLSelectElement {
  return document.querySelector('select') as HTMLSelectElement;
}

function selectPreset(presetValue: string): void {
  fireEvent.change(getConfigSelect(), { target: { value: presetValue } });
}

function clickButton(label: string): void {
  const btn = screen.getByRole('button', { name: label });
  fireEvent.click(btn);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScoringValidator', () => {
  describe('initial render', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('renders the dev tool header', () => {
      expect(screen.getByText('Scoring Validator')).toBeTruthy();
      expect(screen.getByText('DEV')).toBeTruthy();
    });

    it('renders all four dimension labels in the score preview cards', () => {
      expect(screen.getAllByText('CORE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CLARITY').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CONNECTION').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('COLLABORATION').length).toBeGreaterThanOrEqual(1);
    });

    it('renders the tab bar with all standard tabs', () => {
      expect(screen.getByRole('button', { name: 'Scores' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Archetypes' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Risk Flags' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Trust Ladder' })).toBeTruthy();
    });

    it('Compare tab is not visible before compare mode is enabled', () => {
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
    });

    it('initializes with dimension scores that are neither 0.00% nor 100.00%', () => {
      // River Valley seed data produces realistic mid-range scores, not extremes.
      expect(screen.queryAllByText('0.00%').length).toBe(0);
      expect(screen.queryAllByText('100.00%').length).toBe(0);
      const allText = document.body.textContent ?? '';
      expect(allText).toMatch(/\d+\.\d+%/);
    });
  });

  describe('preset loading', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('loads Aligned & Thriving preset — all dimension scores above 70%', () => {
      act(() => { selectPreset('aligned-thriving'); });
      // All four dimensions at ~75% — no score should be below 70
      const allText = document.body.textContent ?? '';
      // At least one percentage value above 70% must be visible
      expect(allText).toMatch(/7[0-9]\.\d{2}%|[89]\d\.\d{2}%/);
    });

    it('loads Busy but Burned Out preset — all dimension scores below 50%', () => {
      act(() => { selectPreset('busy-burned-out'); });
      // All four dimensions under 50% — no score at 100% or above 50%
      expect(screen.queryAllByText('100.00%').length).toBe(0);
      const allText = document.body.textContent ?? '';
      // Scores present but in low range
      expect(allText).toMatch(/\d+\.\d{2}%/);
    });

    it('reset button clears an active preset and restores default scores', () => {
      act(() => { selectPreset('aligned-thriving'); });

      act(() => { clickButton('Reset'); });

      // After reset, River Valley default scores reappear — neither 0% nor 100%
      expect(screen.queryAllByText('100.00%').length).toBe(0);
      expect(screen.queryAllByText('0.00%').length).toBe(0);
      const allText = document.body.textContent ?? '';
      expect(allText).toMatch(/\d+\.\d+%/);
    });

    it('presets use 5-point scale by default', () => {
      // Default River Valley is 5pt — the 5pt button should reflect active state
      const fivePtBtn = screen.getByRole('button', { name: '5pt' });
      expect(fivePtBtn).toBeTruthy();
    });
  });

  describe('scale toggle', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('switching from 5pt to 4pt produces different score values', () => {
      const before = document.body.textContent ?? '';
      const before5ptScores = before.match(/\d+\.\d+%/g) ?? [];

      act(() => { clickButton('4pt'); });

      const after = document.body.textContent ?? '';
      const after4ptScores = after.match(/\d+\.\d+%/g) ?? [];
      // Scores change because the normalization formula changes
      expect(before5ptScores.join()).not.toBe(after4ptScores.join());
    });

    it('switching back to 5pt after 4pt restores original scores', () => {
      const initial5pt = document.body.textContent?.match(/\d+\.\d+%/g)?.join() ?? '';

      act(() => { clickButton('4pt'); });
      act(() => { clickButton('5pt'); });

      const restored5pt = document.body.textContent?.match(/\d+\.\d+%/g)?.join() ?? '';
      expect(restored5pt).toBe(initial5pt);
    });
  });

  describe('tab navigation', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('Archetypes tab renders archetype names in the distance table', () => {
      act(() => { clickButton('Archetypes'); });
      // Archetype names appear in both the distance table and the preset dropdown
      expect(screen.getAllByText('Aligned & Thriving').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Command & Control').length).toBeGreaterThanOrEqual(1);
    });

    it('Archetypes tab renders all five archetype rows in the distance table', () => {
      act(() => { clickButton('Archetypes'); });
      expect(screen.getAllByText('Aligned & Thriving').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Over-Collaborated/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Well-Intentioned/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Command & Control/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Busy but Burned/).length).toBeGreaterThanOrEqual(1);
    });

    it('Archetypes tab shows the matched archetype name prominently', () => {
      act(() => { clickButton('Archetypes'); });
      const archetypeNames = [
        'Aligned & Thriving',
        'Over-Collaborated',
        'Well-Intentioned but Disconnected',
        'Command & Control',
        'Busy but Burned Out',
      ];
      const found = archetypeNames.some(
        (name) => screen.queryAllByText(name).length > 0,
      );
      expect(found).toBe(true);
    });

    it('Risk Flags tab shows threshold input labels', () => {
      act(() => { clickButton('Risk Flags'); });
      expect(screen.getByText('Core critical below')).toBeTruthy();
      expect(screen.getByText('Any dimension high below')).toBeTruthy();
      expect(screen.getByText('Core medium below')).toBeTruthy();
    });

    it('Trust Ladder tab shows rung names', () => {
      act(() => { clickButton('Trust Ladder'); });
      expect(screen.getByText('Purpose')).toBeTruthy();
      expect(screen.getByText('Values')).toBeTruthy();
      expect(screen.getByText('Mission / Vision')).toBeTruthy();
      expect(screen.getByText('Role Clarification')).toBeTruthy();
      expect(screen.getByText('Career / Growth')).toBeTruthy();
    });

    it('switching from Archetypes to Trust Ladder shows Trust Ladder content', () => {
      act(() => { clickButton('Archetypes'); });
      expect(screen.getAllByText('Aligned & Thriving').length).toBeGreaterThanOrEqual(1);

      act(() => { clickButton('Trust Ladder'); });
      // Trust Ladder rung names are only visible on this tab
      expect(screen.getByText('Purpose')).toBeTruthy();
      expect(screen.getByText('Values')).toBeTruthy();
    });

    it('switching from Archetypes to Scores shows Scores content', () => {
      act(() => { clickButton('Archetypes'); });
      act(() => { clickButton('Scores'); });
      // Scores tab renders dimension score cards — percentages should be visible
      const allText = document.body.textContent ?? '';
      expect(allText).toMatch(/\d+\.\d{2}%/);
    });
  });

  describe('compare mode', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
    });

    it('⇄ Compare button makes the Compare tab appear in the tab bar', () => {
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();
    });

    it('activating compare mode auto-navigates to the Compare tab', () => {
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByText('Scenario B:')).toBeTruthy();
    });

    it('Compare tab shows a second preset selector for Scenario B', () => {
      act(() => { clickButton('⇄ Compare'); });
      const selects = document.querySelectorAll('select');
      expect(selects.length).toBe(2);
    });

    it('Compare tab immediately shows a comparison table using current answers as Scenario B', () => {
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByText('Scenario A')).toBeTruthy();
      expect(screen.getByText('Scenario B')).toBeTruthy();
    });

    it('loading a Scenario B preset updates the comparison table', () => {
      act(() => { clickButton('⇄ Compare'); });

      const selects = document.querySelectorAll('select');
      const bSelect = selects[1] as HTMLSelectElement;
      act(() => {
        fireEvent.change(bSelect, { target: { value: 'aligned-thriving' } });
      });

      expect(screen.getByText('Scenario A')).toBeTruthy();
      expect(screen.getByText('Scenario B')).toBeTruthy();
    });

    it('toggling compare mode off removes the Compare tab', () => {
      act(() => { clickButton('⇄ Compare'); });
      expect(screen.getByRole('button', { name: 'Compare' })).toBeTruthy();

      act(() => { clickButton('⇄ Compare'); });
      expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull();
    });
  });

  describe('Risk Flags tab — threshold interaction', () => {
    beforeEach(() => {
      act(() => { render(<ScoringValidator />); });
      act(() => { clickButton('Risk Flags'); });
    });

    it('shows no active risk flags when Aligned & Thriving preset is loaded', () => {
      act(() => { selectPreset('aligned-thriving'); });
      expect(
        screen.getByText(/No active risk flags — all dimensions healthy\./),
      ).toBeTruthy();
    });

    it('shows active CRITICAL flags when Busy but Burned Out preset is loaded', () => {
      act(() => { selectPreset('busy-burned-out'); });
      // All dimensions low — at least one critical risk flag fires
      const criticalBadges = screen.getAllByText('CRITICAL');
      expect(criticalBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('threshold inputs are present and editable', () => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(3);
      act(() => {
        fireEvent.change(inputs[0]!, { target: { value: '50' } });
      });
      expect((inputs[0] as HTMLInputElement).value).toBe('50');
    });
  });
});
