/**
 * Win/Loss check — pure function, no ECS imports.
 *
 * Win condition: poppedBubbles >= winThreshold * startingBubbleCount
 * Loss condition: tapsUsed >= tapBudget AND poppedBubbles < winThreshold
 * Win takes priority when both conditions are met simultaneously.
 */

import { calculateStars } from './score-calculator';

export interface WinLossParams {
  poppedBubbles: number;
  startingBubbleCount: number;
  tapsUsed: number;
  tapBudget: number;
  winThreshold?: number;  // default 0.8
}

export interface WinLossResult {
  outcome: 'win' | 'loss' | 'none';
  starsEarned: number;
}

export function checkWinLoss(params: WinLossParams): WinLossResult {
  const { poppedBubbles, startingBubbleCount, tapsUsed, tapBudget, winThreshold = 0.8 } = params;
  const winCount = Math.floor(startingBubbleCount * winThreshold);

  // Win takes priority
  if (poppedBubbles >= winCount) {
    const tapsRemaining = tapBudget - tapsUsed;
    const starsEarned = calculateStars({ tapsRemaining, tapBudget });
    return { outcome: 'win', starsEarned };
  }

  if (tapsUsed >= tapBudget) {
    return { outcome: 'loss', starsEarned: 0 };
  }

  return { outcome: 'none', starsEarned: 0 };
}
