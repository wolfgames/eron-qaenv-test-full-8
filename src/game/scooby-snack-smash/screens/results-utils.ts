/**
 * Results screen utilities — pure functions for win/loss branching and navigation.
 *
 * GDD requirements:
 *   - Win: Scooby victory 🐕🎉, star rating, 'Next Level' button
 *   - Loss: Scooby Ruh-roh 🐕😬, positive retry copy, 'Try Again' button
 *   - NO 'Game Over' text in either branch (guardrail resolved)
 */

export interface ResultsScreenParams {
  outcome: 'win' | 'loss';
  starsEarned: number;
  score: number;
}

export interface ResultsScreenBranch {
  emoji: string;
  headline: string;
  starCount: number;
  primaryButtonLabel: string;
  retryMessage: string;
}

/**
 * Returns the display data for the results screen branch.
 * No "Game Over" text — ever.
 */
export function getResultsScreenBranch(params: ResultsScreenParams): ResultsScreenBranch {
  const { outcome, starsEarned, score } = params;

  if (outcome === 'win') {
    return {
      emoji: '🐕🎉',
      headline: 'Scooby-Doo! You did it!',
      starCount: starsEarned,
      primaryButtonLabel: 'Next Level',
      retryMessage: '',
    };
  }

  return {
    emoji: '🐕😬',
    headline: 'Ruh-roh!',
    starCount: 0,
    primaryButtonLabel: 'Try Again',
    retryMessage: 'So close! Give it another try!',
  };
}

export interface ResultsNavigation {
  screen: 'game';
  params: {
    levelNumber: number;
    seed: number;
  };
}

/**
 * Compute the navigation target after the results screen.
 *   Win → next level (levelNumber + 1)
 *   Loss → same level same seed (Try Again)
 */
export function formatResultsNavigation(params: {
  outcome: 'win' | 'loss';
  levelNumber: number;
  seed: number;
}): ResultsNavigation {
  const { outcome, levelNumber, seed } = params;
  if (outcome === 'win') {
    return {
      screen: 'game',
      params: { levelNumber: levelNumber + 1, seed: 0 }, // seed recalculated for new level
    };
  }
  return {
    screen: 'game',
    params: { levelNumber, seed }, // same seed = same board
  };
}
