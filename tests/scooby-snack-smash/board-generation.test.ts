/**
 * Batch 1 — treat-bubbles board generation tests
 */
import { describe, it, expect } from 'vitest';
import { generateBoard } from '~/game/scooby-snack-smash/data/board-layout';
import { TREAT_TYPES } from '~/game/scooby-snack-smash/data/treat-types';

describe('treat-bubbles: board generation', () => {
  it('board contains 70 cells (7×10)', () => {
    const board = generateBoard({ cols: 7, rows: 10, seed: 1 });
    let count = 0;
    for (const row of board.cells) {
      count += row.length;
    }
    expect(count).toBe(70);
  });

  it('5 distinct treat types present after board init', () => {
    const board = generateBoard({ cols: 7, rows: 10, seed: 42 });
    const types = new Set<string>();
    for (const row of board.cells) {
      for (const cell of row) {
        if (cell.kind === 'treat') {
          types.add(cell.treatType);
        }
      }
    }
    expect(types.size).toBe(5);
  });

  it('same seed produces identical board layout', () => {
    const board1 = generateBoard({ cols: 7, rows: 10, seed: 777 });
    const board2 = generateBoard({ cols: 7, rows: 10, seed: 777 });
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 7; c++) {
        expect(board1.cells[r][c]).toEqual(board2.cells[r][c]);
      }
    }
  });
});
