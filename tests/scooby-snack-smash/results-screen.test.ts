/**
 * Batch 6 — ResultsScreen tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  getResultsScreenBranch,
  formatResultsNavigation,
} from '~/game/scooby-snack-smash/screens/results-utils';

describe('ResultsScreen: win and loss branches', () => {
  it('win branch shows victory emoji and star count matching starsEarned', () => {
    const branch = getResultsScreenBranch({ outcome: 'win', starsEarned: 3, score: 500 });
    expect(branch.emoji).toBeTruthy();
    expect(branch.starCount).toBe(3);
    expect(branch.primaryButtonLabel).toBe('Next Level');
  });

  it('win branch shows Next Level button', () => {
    const branch = getResultsScreenBranch({ outcome: 'win', starsEarned: 2, score: 300 });
    expect(branch.primaryButtonLabel).toBe('Next Level');
  });

  it('loss branch shows Ruh-roh copy and Try Again button', () => {
    const branch = getResultsScreenBranch({ outcome: 'loss', starsEarned: 0, score: 150 });
    expect(branch.primaryButtonLabel).toBe('Try Again');
    expect(branch.retryMessage).toBeTruthy();
    // Must NOT contain "Game Over"
    expect(branch.retryMessage).not.toContain('Game Over');
  });

  it('no "Game Over" text in either branch', () => {
    const win = getResultsScreenBranch({ outcome: 'win', starsEarned: 1, score: 100 });
    const loss = getResultsScreenBranch({ outcome: 'loss', starsEarned: 0, score: 50 });
    expect(JSON.stringify(win)).not.toContain('Game Over');
    expect(JSON.stringify(loss)).not.toContain('Game Over');
  });

  it('Next Level navigates to levelNumber+1', () => {
    const nav = formatResultsNavigation({ outcome: 'win', levelNumber: 3, seed: 12345 });
    expect(nav.screen).toBe('game');
    expect(nav.params.levelNumber).toBe(4);
  });

  it('Try Again navigates to same level same seed', () => {
    const nav = formatResultsNavigation({ outcome: 'loss', levelNumber: 3, seed: 12345 });
    expect(nav.screen).toBe('game');
    expect(nav.params.levelNumber).toBe(3);
    expect(nav.params.seed).toBe(12345);
  });
});
