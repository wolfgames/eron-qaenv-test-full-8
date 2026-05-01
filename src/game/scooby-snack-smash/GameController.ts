/**
 * GameController — Pixi-mode ECS-wired controller for Scooby Snack Smash.
 *
 * Wiring sequence per game-controller contract:
 *   1. ECS DB created from plugin → setActiveDb(db) → bridgeEcsToSignals(db)
 *   2. Pixi Application initialized → layers created (bg, board, hud, companion)
 *   3. Renderers instantiated with stage layers and layout bounds
 *   4. Input routed from boardRenderer.container via pointertap
 *   5. Game actions dispatched through ecsDb.actions.* or ecsDb.transactions.*
 *
 * Destroy order: GSAP tweens → Pixi app → ECS bridge → setActiveDb(null)
 *
 * Guardrails:
 *   - No DOM after initGpu (no document.createElement, no CSS, no element.style)
 *   - One renderer (Pixi), one canvas
 *   - No requestAnimationFrame — GSAP for all animation
 */

import { createSignal } from 'solid-js';
import { Application, Container } from 'pixi.js';
import gsap from 'gsap';
import { setActiveDb } from '~/core/systems/ecs';

import type {
  GameControllerDeps,
  GameController,
  SetupGame,
} from '~/game/mygame-contract';

import { createBoardWorld, type BoardDatabase, type TapResult } from './state/BoardPlugin';
import { bridgeEcsToSignals } from './state/bridge';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HudRenderer } from './renderers/HudRenderer';
import { CompanionRenderer } from './renderers/CompanionRenderer';
import { generateBoard, type BoardState, type CellState } from './data/board-layout';
import { createRng, makeSeed } from './logic/rng';
import { gameState } from '~/game/state';
import { isLastLevelOfChapter, getChapterIndex } from './data/chapter-config';

const DEFAULT_TAP_BUDGET = 30;
const DEFAULT_WIN_THRESHOLD = 0.8;

export const setupGame: SetupGame = (deps: GameControllerDeps): GameController => {
  const [ariaText, setAriaText] = createSignal('Game loading...');

  let app: Application | null = null;
  let ecsDb: BoardDatabase | null = null;
  let cleanupBridge: (() => void) | null = null;
  let boardRenderer: BoardRenderer | null = null;
  let hudRenderer: HudRenderer | null = null;
  let companionRenderer: CompanionRenderer | null = null;
  let currentBoard: BoardState | null = null;
  let levelNumber = 1;
  let seed = 0;
  let isAnimating = false;

  return {
    gameMode: 'pixi',
    ariaText,

    init(container: HTMLDivElement) {
      setAriaText('Gameplay Screen');

      // 1. ECS DB
      ecsDb = createBoardWorld();
      setActiveDb(ecsDb);
      cleanupBridge = bridgeEcsToSignals(ecsDb);

      // 2. Pixi Application — async init, then build scene graph
      app = new Application();
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1;
      void app.init({
        resizeTo: container,
        resolution: Math.min(dpr, 2),
        antialias: false,
        autoDensity: true,
        background: '#1a1a2e',
      }).then(() => {
        if (app) container.appendChild(app.canvas as HTMLCanvasElement);

        // 3. Layer containers
        const bgLayer = new Container();
        bgLayer.eventMode = 'none';

        const boardLayer = new Container();
        boardLayer.eventMode = 'passive';

        const hudLayer = new Container();
        hudLayer.eventMode = 'none';

        const companionLayer = new Container();
        companionLayer.eventMode = 'none';

        app!.stage.addChild(bgLayer);
        app!.stage.addChild(boardLayer);
        app!.stage.addChild(hudLayer);
        app!.stage.addChild(companionLayer);
        app!.stage.eventMode = 'static';

        const viewportW = app!.screen.width;
        const viewportH = app!.screen.height;

        // 4. Renderers
        boardRenderer = new BoardRenderer({
          onTap: (row, col) => handleTap(row, col),
        });
        boardLayer.addChild(boardRenderer.getContainer());

        hudRenderer = new HudRenderer();
        hudLayer.addChild(hudRenderer.getContainer());

        companionRenderer = new CompanionRenderer();
        companionLayer.addChild(companionRenderer.getContainer());

        // Init level — prefer gameState (set by ResultsScreen navigation) over URL params
        const search = typeof window !== 'undefined' ? window.location.search : '';
        const urlParams = new URLSearchParams(search);
        const urlLevel = parseInt(urlParams.get('level') ?? '0', 10);
        levelNumber = gameState.level() > 0 ? gameState.level() : (urlLevel > 0 ? urlLevel : 1);
        seed = makeSeed(levelNumber, 0);

        currentBoard = generateBoard({ seed });
        ecsDb!.transactions.initBoard({
          board: currentBoard,
          tapBudget: DEFAULT_TAP_BUDGET,
          levelNumber,
          seed,
        });

        boardRenderer.init(currentBoard, viewportW, viewportH);
        hudRenderer.init(viewportW, viewportH);
        companionRenderer.init(viewportW, viewportH);

        // Wire HUD to ECS resources
        hudRenderer.update({
          score: ecsDb!.store.resources.score,
          tapsRemaining: ecsDb!.store.resources.tapsRemaining,
          level: levelNumber,
        });

        setAriaText(`Scooby Snack Smash — Level ${levelNumber}`);
      }).catch((err: Error) => {
        console.error('[GameController] Pixi init failed:', err);
        setAriaText('Failed to load game');
      });
    },

    destroy() {
      // Correct order: GSAP tweens → Pixi → ECS bridge → setActiveDb(null)
      if (boardRenderer) {
        boardRenderer.destroy();
        boardRenderer = null;
      }
      if (hudRenderer) {
        hudRenderer.destroy();
        hudRenderer = null;
      }
      if (companionRenderer) {
        companionRenderer.destroy();
        companionRenderer = null;
      }
      if (app) {
        gsap.globalTimeline.clear();
        app.destroy(true, { children: true });
        app = null;
      }
      cleanupBridge?.();
      cleanupBridge = null;
      setActiveDb(null);
      ecsDb = null;
      currentBoard = null;
    },
  };

  async function handleTap(row: number, col: number): Promise<void> {
    if (!ecsDb || !currentBoard || !boardRenderer || isAnimating) return;

    const rng = createRng(makeSeed(levelNumber, row * 100 + col));
    isAnimating = true;
    boardRenderer.setBoardPhase('ANIMATING');

    const result: TapResult = ecsDb.actions.executeTap({
      row, col, rng, board: currentBoard,
    });

    if (result.rejected) {
      // Invalid tap — Ruh-roh feedback
      companionRenderer?.showRuhroh();
      boardRenderer.setBoardPhase('IDLE');
      isAnimating = false;
      return;
    }

    // Valid tap
    companionRenderer?.showCelebration();

    // Update currentBoard from action result
    // (We use the board that was returned in action — reconstruct from ECS cells if needed)
    // For now: re-generate board state from ECS
    currentBoard = readBoardFromEcs();

    await boardRenderer.animateTurn({
      cleared: result.cleared,
      drops: result.drops,
      refills: result.refills,
      cascadeDepth: result.cascadeDepth,
      newBoard: currentBoard,
    });

    // Update HUD
    hudRenderer?.update({
      score: ecsDb.store.resources.score,
      tapsRemaining: ecsDb.store.resources.tapsRemaining,
      level: levelNumber,
    });

    // Check win/loss
    const winLoss = ecsDb.actions.checkWinLoss({
      tapBudget: DEFAULT_TAP_BUDGET,
      winThreshold: DEFAULT_WIN_THRESHOLD,
      startingBubbleCount: ecsDb.store.resources.startingBubbleCount,
    });

    if (winLoss.outcome === 'win') {
      boardRenderer.setBoardPhase('WIN');
      companionRenderer?.showWin();
      hudRenderer?.showStars(winLoss.starsEarned);
      await boardRenderer.animateWin(currentBoard.cells);
      setAriaText(`Level ${levelNumber} complete! ${winLoss.starsEarned} stars`);
      // Navigate to results screen — chapter-complete on final level of chapter
      const outcome = isLastLevelOfChapter(levelNumber) ? 'chapter-complete' : 'win';
      deps.goto?.('results', {
        outcome,
        starsEarned: winLoss.starsEarned,
        score: ecsDb?.store.resources.score ?? 0,
        levelNumber,
        seed,
        chapterId: getChapterIndex(levelNumber),
      });
    } else if (winLoss.outcome === 'loss') {
      boardRenderer.setBoardPhase('LOST');
      companionRenderer?.showLoss();
      await boardRenderer.animateLoss(currentBoard.cells);
      setAriaText('So close! Give it another try!');
      // Navigate to results screen with loss data
      deps.goto?.('results', {
        outcome: 'loss',
        starsEarned: 0,
        score: ecsDb?.store.resources.score ?? 0,
        levelNumber,
        seed,
      });
    } else {
      boardRenderer.setBoardPhase('IDLE');
    }

    isAnimating = false;
  }

  function readBoardFromEcs(): BoardState {
    if (!ecsDb) throw new Error('ECS DB not initialized');
    const { cols, rows, startingBubbleCount } = ecsDb.store.resources;
    const cells: CellState[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        entityId: 0,
        kind: 'empty' as const,
        treatType: null,
        row: r,
        col: c,
      })),
    );
    for (const entity of ecsDb.store.select(['cellKind', 'cellRow', 'cellCol'])) {
      const r = entity.cellRow;
      const c = entity.cellCol;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        cells[r][c] = {
          entityId: entity[Symbol.for('entity')] ?? 0,
          kind: entity.cellKind as 'treat' | 'ghost' | 'mega-snack' | 'empty',
          treatType: entity.cellTreatType || null,
          row: r,
          col: c,
        };
      }
    }
    return { cells, cols, rows, startingBubbleCount };
  }
};
