/**
 * BlockRenderer — pooled Pixi Text sprites for each treat / special type.
 *
 * Pool is keyed by stable ECS entity ID (not grid coordinate).
 * Per guardrails:
 *   - No DOM (no document.createElement)
 *   - Destroy order: tweens → listeners → removeChild → destroy
 *   - No per-frame allocation (pool pre-allocated)
 */

import { Container, Text, type Application } from 'pixi.js';
import gsap from 'gsap';
import { getTreatDef, type TreatType } from '../data/treat-types';
import type { CellState } from '../data/board-layout';
import type { BoardLayout } from '../data/board-layout';

export interface BlockSprite {
  entityId: number;
  text: Text;
  row: number;
  col: number;
}

const EMOJI_MAP: Record<string, string> = {
  'scooby-snack': '🍖',
  'sandwich': '🥪',
  'bone': '🦴',
  'pizza': '🍕',
  'cupcake': '🧁',
  'mega-snack': '🌟',
  'ghost': '👻',
};

export class BlockRenderer {
  private readonly container: Container;
  /** Map from entityId → BlockSprite */
  private readonly sprites = new Map<number, BlockSprite>();
  private layout!: BoardLayout;

  constructor() {
    this.container = new Container();
    this.container.eventMode = 'none';
  }

  getContainer(): Container {
    return this.container;
  }

  init(layout: BoardLayout): void {
    this.layout = layout;
  }

  /** Acquire (or create) a sprite for a cell and position it. */
  acquire(cell: CellState, layout?: BoardLayout): BlockSprite {
    if (layout) this.layout = layout;
    const existing = this.sprites.get(cell.entityId);
    if (existing) {
      existing.row = cell.row;
      existing.col = cell.col;
      this.positionSprite(existing);
      return existing;
    }

    const emoji = cell.kind === 'treat' && cell.treatType
      ? EMOJI_MAP[cell.treatType] ?? '?'
      : EMOJI_MAP[cell.kind] ?? '?';

    const text = new Text({
      text: emoji,
      style: {
        fontSize: Math.floor(this.layout.cellSize * 0.7),
        align: 'center',
      },
    });
    text.anchor.set(0.5, 0.5);
    text.eventMode = 'none';

    this.container.addChild(text);

    const sprite: BlockSprite = { entityId: cell.entityId, text, row: cell.row, col: cell.col };
    this.sprites.set(cell.entityId, sprite);
    this.positionSprite(sprite);
    return sprite;
  }

  /** Remove a sprite from the pool and destroy it (with tween cleanup). */
  release(entityId: number): void {
    const sprite = this.sprites.get(entityId);
    if (!sprite) return;
    gsap.killTweensOf(sprite.text);
    sprite.text.removeAllListeners();
    this.container.removeChild(sprite.text);
    sprite.text.destroy();
    this.sprites.delete(entityId);
  }

  /** Get a sprite by entityId (null if not pooled). */
  getSprite(entityId: number): BlockSprite | null {
    return this.sprites.get(entityId) ?? null;
  }

  /** Sync all sprites to a new board state (acquire new, release gone). */
  syncBoard(cells: CellState[][]): void {
    const presentIds = new Set<number>();
    for (const row of cells) {
      for (const cell of row) {
        if (cell.kind !== 'empty') {
          presentIds.add(cell.entityId);
          this.acquire(cell);
        }
      }
    }
    // Release sprites whose entities are gone
    for (const [id] of this.sprites) {
      if (!presentIds.has(id)) {
        this.release(id);
      }
    }
  }

  private positionSprite(sprite: BlockSprite): void {
    const x = this.layout.boardLeft + sprite.col * (this.layout.cellSize + this.layout.gap) + this.layout.cellSize / 2;
    const y = this.layout.boardTop + sprite.row * (this.layout.cellSize + this.layout.gap) + this.layout.cellSize / 2;
    sprite.text.x = x;
    sprite.text.y = y;
  }

  destroy(): void {
    // Correct order: tweens → listeners → removeChild → destroy
    for (const sprite of this.sprites.values()) {
      gsap.killTweensOf(sprite.text);
      sprite.text.removeAllListeners();
      this.container.removeChild(sprite.text);
      sprite.text.destroy();
    }
    this.sprites.clear();
    this.container.destroy({ children: true });
  }
}
