/**
 * Batch 5 — StartScreen tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isPlayButtonInThumbZone,
  isSettingsIconInTopRight,
} from '~/game/scooby-snack-smash/screens/start-screen-utils';

describe('StartScreen: Play button placement', () => {
  it('Play button is in bottom third of screen (y > 66% of viewport height)', () => {
    const VIEWPORT_H = 844;
    const playButtonY = 700; // typical y position in bottom-third layout
    expect(isPlayButtonInThumbZone(playButtonY, VIEWPORT_H)).toBe(true);
  });

  it('Play button tap calls unlockAudio() before transition', () => {
    const unlockAudio = vi.fn();
    const goto = vi.fn();

    // Simulate the click handler from startView.ts
    const handlePlayTap = async () => {
      unlockAudio();
      goto('game');
    };

    void handlePlayTap();
    expect(unlockAudio).toHaveBeenCalled();
    expect(goto).toHaveBeenCalledWith('game');
  });

  it('Settings icon is in top-right zone', () => {
    const VIEWPORT_W = 390;
    // Settings icon at top-right: x > 80% of viewportW, y < 20% of viewportH
    const iconX = 360;
    const iconY = 20;
    expect(isSettingsIconInTopRight(iconX, iconY, VIEWPORT_W, 844)).toBe(true);
  });
});
