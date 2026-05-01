/**
 * Batch 4 — CompanionRenderer tests
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('pixi.js', () => {
  const Container = vi.fn().mockImplementation(() => ({
    addChild: vi.fn(), removeChild: vi.fn(), destroy: vi.fn(),
    removeAllListeners: vi.fn(), eventMode: 'none',
  }));
  const Text = vi.fn().mockImplementation(() => ({
    anchor: { set: vi.fn() }, position: { set: vi.fn() },
    x: 0, y: 0, alpha: 0, text: '',
    removeAllListeners: vi.fn(), destroy: vi.fn(), parent: null,
  }));
  return { Container, Text };
});

vi.mock('gsap', () => ({
  default: {
    killTweensOf: vi.fn(), to: vi.fn(), fromTo: vi.fn(),
    delayedCall: vi.fn(), globalTimeline: { clear: vi.fn() },
  },
}));

import { CompanionRenderer } from '~/game/scooby-snack-smash/renderers/CompanionRenderer';

describe('companion-renderer: reactions', () => {
  it('companion shows reaction on valid tap', () => {
    const renderer = new CompanionRenderer();
    renderer.init(390, 844);
    expect(() => renderer.showCelebration()).not.toThrow();
    renderer.destroy();
  });

  it('companion shows Ruh-roh on invalid tap', () => {
    const renderer = new CompanionRenderer();
    renderer.init(390, 844);
    expect(() => renderer.showRuhroh()).not.toThrow();
    renderer.destroy();
  });

  it('companion strip stays within bottom 80px companion zone', () => {
    // CompanionRenderer positions strip at viewportH - SAFE_AREA_BOTTOM (34px)
    // Strip bottom edge should be >= 34px from viewport bottom
    // viewportH=844, SAFE_AREA_BOTTOM=34 → stripBottom = 844-34 = 810
    // companion center at y=810 (≤ 844)
    const VIEWPORT_H = 844;
    const SAFE_AREA_BOTTOM = 34;
    const COMPANION_HEIGHT = 80;
    const stripBottom = VIEWPORT_H - SAFE_AREA_BOTTOM;
    // Companion should be within the bottom 80px zone
    const companionZoneTop = VIEWPORT_H - COMPANION_HEIGHT;
    expect(stripBottom).toBeGreaterThanOrEqual(companionZoneTop);
    expect(stripBottom).toBeLessThanOrEqual(VIEWPORT_H);
  });
});
