/**
 * Batch 1 — board-layout viewport budget tests
 */
import { describe, it, expect } from 'vitest';
import { computeBoardLayout } from '~/game/scooby-snack-smash/data/board-layout';

const VIEWPORT_W = 390;
const VIEWPORT_H = 844;
const HUD_TOP_PX = 120;
const COMPANION_BOTTOM_PX = 80;

describe('board-layout: viewport budget', () => {
  it('7×10 board cells each >= 48px on 390px viewport', () => {
    const layout = computeBoardLayout({ viewportW: VIEWPORT_W, viewportH: VIEWPORT_H });
    expect(layout.cellSize).toBeGreaterThanOrEqual(48);
  });

  it('board does not overlap HUD zone top 120px', () => {
    const layout = computeBoardLayout({ viewportW: VIEWPORT_W, viewportH: VIEWPORT_H });
    expect(layout.boardTop).toBeGreaterThanOrEqual(HUD_TOP_PX);
  });

  it('board does not overlap companion zone', () => {
    const layout = computeBoardLayout({ viewportW: VIEWPORT_W, viewportH: VIEWPORT_H });
    const boardBottom = layout.boardTop + layout.boardHeight;
    expect(boardBottom).toBeLessThanOrEqual(VIEWPORT_H - COMPANION_BOTTOM_PX);
  });
});
