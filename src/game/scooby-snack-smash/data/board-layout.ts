/**
 * Board layout computation and board generation for Scooby Snack Smash.
 *
 * Viewport budget (from implementation-plan.yml):
 *   HUD = 120px top
 *   board = 507px
 *   companion = 80px bottom
 *   cell 48px visible + 3px gap = 51px pitch
 *   7×48 + 6×3 = 354px wide, 10×48 + 9×3 = 507px tall
 */

import type { TreatType } from './treat-types';
import { TREAT_TYPE_IDS } from './treat-types';
import { createRng } from '../logic/rng';

export const BOARD_COLS = 7;
export const BOARD_ROWS = 10;
export const CELL_SIZE_PX = 48;
export const CELL_GAP_PX = 3;
export const HUD_TOP_PX = 120;
export const COMPANION_BOTTOM_PX = 80;
export const MIN_CELL_SIZE_PX = 48;

export interface BoardLayout {
  cellSize: number;
  gap: number;
  boardTop: number;
  boardLeft: number;
  boardWidth: number;
  boardHeight: number;
  cols: number;
  rows: number;
}

export interface CellState {
  entityId: number;
  kind: 'treat' | 'ghost' | 'mega-snack' | 'empty';
  treatType: TreatType | null;
  row: number;
  col: number;
}

export interface BoardState {
  cells: CellState[][];
  cols: number;
  rows: number;
  startingBubbleCount: number;
}

export interface ComputeLayoutOptions {
  viewportW: number;
  viewportH: number;
  cols?: number;
  rows?: number;
}

/**
 * Compute the board layout for a given viewport.
 * Cell size is derived from available width: (viewportW × 0.9 - (cols-1) × gap) / cols
 * Clamped to min 48px.
 */
export function computeBoardLayout(opts: ComputeLayoutOptions): BoardLayout {
  const cols = opts.cols ?? BOARD_COLS;
  const rows = opts.rows ?? BOARD_ROWS;
  const gap = CELL_GAP_PX;

  // Fit cells into 90% of viewport width
  const availableW = opts.viewportW * 0.9;
  const derivedCellSize = (availableW - (cols - 1) * gap) / cols;
  const cellSize = Math.max(MIN_CELL_SIZE_PX, Math.floor(derivedCellSize));

  const boardWidth = cols * cellSize + (cols - 1) * gap;
  const boardHeight = rows * cellSize + (rows - 1) * gap;

  // Center horizontally
  const boardLeft = Math.floor((opts.viewportW - boardWidth) / 2);

  // Board top starts just below HUD zone
  const boardTop = HUD_TOP_PX;

  return {
    cellSize,
    gap,
    boardTop,
    boardLeft,
    boardWidth,
    boardHeight,
    cols,
    rows,
  };
}

/** Generate the initial board state using a seeded RNG. */
export function generateBoard(opts: {
  cols?: number;
  rows?: number;
  seed: number;
  treatCount?: number;
}): BoardState {
  const cols = opts.cols ?? BOARD_COLS;
  const rows = opts.rows ?? BOARD_ROWS;
  const numTreatTypes = opts.treatCount ?? TREAT_TYPE_IDS.length;
  const rng = createRng(opts.seed);

  // Ensure all 5 types are represented — distribute first, then fill rest randomly
  const cells: CellState[][] = [];
  let entityCounter = 1;
  const totalCells = cols * rows;

  // Build flat list with guaranteed coverage of all types
  const flatTypes: TreatType[] = [];
  const availableTypes = TREAT_TYPE_IDS.slice(0, numTreatTypes);

  // Seed one of each type first to guarantee 5 distinct types on the board
  for (const t of availableTypes) {
    flatTypes.push(t);
  }
  // Fill the rest randomly
  while (flatTypes.length < totalCells) {
    flatTypes.push(availableTypes[rng.nextInt(availableTypes.length)]);
  }
  // Shuffle the flat list using the RNG (Fisher-Yates)
  for (let i = flatTypes.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = flatTypes[i];
    flatTypes[i] = flatTypes[j];
    flatTypes[j] = tmp;
  }

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        entityId: entityCounter++,
        kind: 'treat',
        treatType: flatTypes[idx++],
        row: r,
        col: c,
      });
    }
    cells.push(row);
  }

  return {
    cells,
    cols,
    rows,
    startingBubbleCount: totalCells,
  };
}

/** Get pixel coordinates (top-left) for a cell given layout */
export function cellPosition(
  layout: BoardLayout,
  row: number,
  col: number,
): { x: number; y: number } {
  return {
    x: layout.boardLeft + col * (layout.cellSize + layout.gap),
    y: layout.boardTop + row * (layout.cellSize + layout.gap),
  };
}
