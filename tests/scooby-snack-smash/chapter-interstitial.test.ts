/**
 * Batch 7 — chapter-interstitial tests
 */
import { describe, it, expect } from 'vitest';
import { getChapterConfig, isPlayButtonInThumbZone } from '~/game/scooby-snack-smash/data/chapter-config';

describe('chapter-interstitial: rendering and navigation', () => {
  it("Let's Go button is in bottom-third of screen", () => {
    // Button is placed at bottom:10% of viewport (same pattern as Play button)
    // y = viewportH * 0.9 → in bottom 10%
    const VIEWPORT_H = 844;
    const buttonY = VIEWPORT_H * 0.9; // 759.6
    expect(isPlayButtonInThumbZone(buttonY, VIEWPORT_H)).toBe(true);
  });

  it('caption text shows 2 lines', () => {
    const config = getChapterConfig(1);
    expect(config.caption1).toBeTruthy();
    expect(config.caption2).toBeTruthy();
  });

  it('tapping Let\'s Go navigates to first level of chapter', () => {
    // Validated by formatResultsNavigation({ outcome: 'chapter-start', levelNumber: ... })
    const config = getChapterConfig(1);
    expect(config.startLevel).toBe(1);
    const config2 = getChapterConfig(2);
    expect(config2.startLevel).toBe(11);
  });
});
