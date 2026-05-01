/**
 * BoardRenderer — grid layout, block positioning, and tap target areas.
 *
 * Per renderer contract:
 *   - Receives viewport bounds from GameController, does not compute independently
 *   - No game state held — reads from ECS via action return values or passed data
 *   - GSAP for all animations, no requestAnimationFrame
 *   - Destroy order: tweens → listeners → removeChild → destroy({children:true})
 *
 * Input routing:
 *   - eventMode='passive' on boardContainer (has interactive children)
 *   - eventMode='static' on individual cell hit areas
 *   - Routes pointertap → onTap callback
 */

import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import {
  computeBoardLayout,
  type BoardState,
  type CellState,
  type BoardLayout,
} from '../data/board-layout';
import type { DropEvent, RefillEvent } from '../state/BoardPlugin';
import { BlockRenderer } from './BlockRenderer';

export type BoardPhase = 'IDLE' | 'ANIMATING' | 'WIN' | 'LOST' | 'PAUSED';

interface QueuedTap {
  row: number;
  col: number;
}

export interface BoardRendererOptions {
  onTap: (row: number, col: number) => void;
}

export class BoardRenderer {
  private readonly boardContainer: Container;
  private readonly bgContainer: Container;
  private readonly blockRenderer: BlockRenderer;
  private layout!: BoardLayout;
  private cellHitAreas: Map<string, Graphics> = new Map();
  private boardPhase: BoardPhase = 'IDLE';
  private queuedTap: QueuedTap | null = null;
  private readonly onTap: (row: number, col: number) => void;

  constructor(options: BoardRendererOptions) {
    this.onTap = options.onTap;
    this.boardContainer = new Container();
    this.boardContainer.eventMode = 'passive';

    this.bgContainer = new Container();
    this.bgContainer.eventMode = 'passive'; // HAS interactive children (hit areas) — must not be 'none'
    this.boardContainer.addChild(this.bgContainer);

    this.blockRenderer = new BlockRenderer();
    this.boardContainer.addChild(this.blockRenderer.getContainer());
  }

  getContainer(): Container {
    return this.boardContainer;
  }

  init(board: BoardState, viewportW: number, viewportH: number): void {
    this.layout = computeBoardLayout({ viewportW, viewportH });
    this.blockRenderer.init(this.layout);

    this.createCellHitAreas();
    this.blockRenderer.syncBoard(board.cells);
  }

  private createCellHitAreas(): void {
    const { cellSize, gap, boardTop, boardLeft, cols, rows } = this.layout;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r},${c}`;
        const x = boardLeft + c * (cellSize + gap);
        const y = boardTop + r * (cellSize + gap);

        const hitArea = new Graphics()
          .rect(0, 0, cellSize, cellSize)
          .fill({ color: 0x000000, alpha: 0 });
        hitArea.position.set(x, y);
        hitArea.eventMode = 'static';
        hitArea.cursor = 'pointer';

        const row = r;
        const col = c;
        hitArea.on('pointertap', () => this.handleCellTap(row, col));

        this.bgContainer.addChild(hitArea);
        this.cellHitAreas.set(key, hitArea);
      }
    }
  }

  private handleCellTap(row: number, col: number): void {
    if (this.boardPhase === 'WIN' || this.boardPhase === 'LOST') return;
    if (this.boardPhase === 'ANIMATING') {
      // Queue max 1 tap
      this.queuedTap = { row, col };
      return;
    }
    this.onTap(row, col);
  }

  setBoardPhase(phase: BoardPhase): void {
    this.boardPhase = phase;
    // If transitioning to IDLE and there's a queued tap, fire it
    if (phase === 'IDLE' && this.queuedTap) {
      const { row, col } = this.queuedTap;
      this.queuedTap = null;
      // Defer to next frame to avoid firing synchronously during phase change
      gsap.delayedCall(0, () => this.onTap(row, col));
    }
  }

  /** Sync visual board to new state (instant, for init). */
  syncBoard(cells: CellState[][]): void {
    this.blockRenderer.syncBoard(cells);
  }

  /**
   * Animate a burst (pop dissolve, 200ms) for cleared cells,
   * then gravity drops, then refill float-in.
   * Returns a promise that resolves when all animations complete.
   */
  async animateTurn(opts: {
    cleared: CellState[];
    drops: DropEvent[];
    refills: RefillEvent[];
    cascadeDepth: number;
    newBoard: BoardState;
  }): Promise<void> {
    const { cleared, drops, refills, cascadeDepth, newBoard } = opts;

    // 1. Burst dissolve — parallel for all cleared cells
    const burstPromises: Promise<void>[] = [];
    for (const cell of cleared) {
      const sprite = this.blockRenderer.getSprite(cell.entityId);
      if (sprite) {
        burstPromises.push(new Promise<void>(resolve => {
          gsap.to(sprite.text, {
            pixi: { scale: 1.4, alpha: 0 },
            duration: 0.2,
            ease: 'power2.out',
            onComplete: () => {
              this.blockRenderer.release(cell.entityId);
              resolve();
            },
          });
        }));
      }
    }
    await Promise.all(burstPromises);

    // 2. Gravity drops — animate moved sprites
    const speedMultiplier = cascadeDepth >= 2 ? 1.5 : 1;
    const dropPromises: Promise<void>[] = [];
    for (const drop of drops) {
      const sprite = this.blockRenderer.getSprite(drop.entityId);
      if (sprite) {
        const targetY = this.layout.boardTop + drop.toRow * (this.layout.cellSize + this.layout.gap) + this.layout.cellSize / 2;
        const bounceExtra = Math.min(drop.distance * 2, 12); // scale bounce with distance
        dropPromises.push(new Promise<void>(resolve => {
          gsap.to(sprite.text, {
            y: targetY,
            duration: (0.3 / speedMultiplier) + drop.distance * 0.04,
            ease: 'power2.in',
            onComplete: () => {
              // Bounce/squash on landing
              const bounceScale = 1 + 0.1 * Math.min(drop.distance / 3, 1);
              gsap.to(sprite.text, {
                pixi: { scaleX: bounceScale, scaleY: 1 / bounceScale },
                duration: 0.08,
                ease: 'power1.out',
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                  sprite.row = drop.toRow;
                  resolve();
                },
              });
            },
          });
        }));
      }
    }
    await Promise.all(dropPromises);

    // 3. Cascade escalation effects (per animated-dynamics CoS)
    // Depth 2: board edge glow (alpha pulse)
    // Depth 3+: exaggerated bounce + screen shake
    if (cascadeDepth >= 2) {
      const depth3Plus = cascadeDepth >= 3;
      await new Promise<void>(resolve => {
        gsap.to(this.boardContainer, {
          pixi: { alpha: depth3Plus ? 0.7 : 0.8 },
          duration: depth3Plus ? 0.06 : 0.1,
          yoyo: true,
          repeat: depth3Plus ? 3 : 1,
          onComplete: resolve,
        });
      });
      if (depth3Plus) {
        // Screen shake: brief position oscillation on the board container
        const origX = this.boardContainer.x;
        await new Promise<void>(resolve => {
          gsap.to(this.boardContainer, {
            x: origX + 4,
            duration: 0.04,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              this.boardContainer.x = origX;
              resolve();
            },
          });
        });
      }
    }

    // 4. Refill — staggered float-in from top
    if (refills.length > 0) {
      this.blockRenderer.syncBoard(newBoard.cells);
      const refillPromises: Promise<void>[] = [];
      // Group refills by column for staggered wave
      const byCol = new Map<number, RefillEvent[]>();
      for (const r of refills) {
        if (!byCol.has(r.col)) byCol.set(r.col, []);
        byCol.get(r.col)!.push(r);
      }
      let colIdx = 0;
      for (const [, colRefills] of byCol) {
        const staggerDelay = colIdx * 0.2;
        for (const refill of colRefills) {
          const sprite = this.blockRenderer.getSprite(refill.entityId);
          if (sprite) {
            sprite.text.alpha = 0;
            const targetY = sprite.text.y;
            sprite.text.y = targetY - 60; // start above
            refillPromises.push(new Promise<void>(resolve => {
              gsap.to(sprite.text, {
                y: targetY,
                alpha: 1,
                duration: 0.3,
                delay: staggerDelay,
                ease: 'power2.out',
                onComplete: resolve,
              });
            }));
          }
        }
        colIdx++;
      }
      await Promise.all(refillPromises);
    }
  }

  /**
   * Show rejection feedback ("Ruh-roh" shake) for an invalid tap.
   * 600ms total — brief horizontal oscillation.
   */
  async animateRejection(row: number, col: number): Promise<void> {
    const sprite = this.blockRenderer.getSprite(
      // find entity at position
      0, // fallback — will use position-based approach below
    );
    // Find sprite at the tapped position
    const key = `${row},${col}`;
    const hitArea = this.cellHitAreas.get(key);
    if (hitArea) {
      const origX = hitArea.x;
      await new Promise<void>(resolve => {
        gsap.to(hitArea, {
          x: origX + 6,
          duration: 0.06,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: 5,
          onComplete: () => {
            hitArea.x = origX;
            resolve();
          },
        });
      });
    }
  }

  /**
   * Win animation: remaining bubbles bounce staggered.
   */
  async animateWin(cells: CellState[][]): Promise<void> {
    const promises: Promise<void>[] = [];
    let staggerIdx = 0;
    for (const row of cells) {
      for (const cell of row) {
        if (cell.kind !== 'empty') {
          const sprite = this.blockRenderer.getSprite(cell.entityId);
          if (sprite) {
            const delay = staggerIdx * 0.1;
            promises.push(new Promise<void>(resolve => {
              gsap.to(sprite.text, {
                pixi: { y: sprite.text.y - 12, scale: 1.2 },
                duration: 0.15,
                delay,
                ease: 'power2.out',
                yoyo: true,
                repeat: 1,
                onComplete: resolve,
              });
            }));
          }
          staggerIdx++;
        }
      }
    }
    await Promise.all(promises);
  }

  /**
   * Loss animation: remaining bubbles sag/deflate.
   */
  async animateLoss(cells: CellState[][]): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const row of cells) {
      for (const cell of row) {
        if (cell.kind !== 'empty') {
          const sprite = this.blockRenderer.getSprite(cell.entityId);
          if (sprite) {
            promises.push(new Promise<void>(resolve => {
              gsap.to(sprite.text, {
                pixi: { scaleY: 0.7, alpha: 0.5 },
                duration: 0.4,
                ease: 'power2.in',
                onComplete: resolve,
              });
            }));
          }
        }
      }
    }
    await Promise.all(promises);
  }

  destroy(): void {
    // Correct destroy order: tweens → listeners → removeChild → destroy
    gsap.killTweensOf(this.boardContainer);
    for (const hitArea of this.cellHitAreas.values()) {
      gsap.killTweensOf(hitArea);
      hitArea.removeAllListeners();
    }
    this.cellHitAreas.clear();
    this.blockRenderer.destroy();
    this.boardContainer.removeAllListeners();
    this.boardContainer.destroy({ children: true });
  }
}
