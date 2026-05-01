/**
 * Chapter configuration for Scooby Snack Smash.
 *
 * 10 levels per chapter. Chapter 1 = levels 1-10 (hand-crafted).
 * Chapter 2+ = levels 11+ (procedural — deferred to meta pass).
 *
 * Chapter detection: chapterIndex = Math.floor((levelNumber - 1) / 10) + 1
 */

export const LEVELS_PER_CHAPTER = 10;

export interface ChapterConfig {
  chapterId: number;
  name: string;
  locationEmoji: string;
  caption1: string;
  caption2: string;
  startLevel: number;
  endLevel: number;
}

export const CHAPTER_CONFIGS: ChapterConfig[] = [
  {
    chapterId: 1,
    name: 'The Old Haunted Mansion',
    locationEmoji: '🏚️',
    caption1: 'Something spooky is going on',
    caption2: 'at the Old Haunted Mansion!',
    startLevel: 1,
    endLevel: 10,
  },
  {
    chapterId: 2,
    name: 'The Abandoned Theme Park',
    locationEmoji: '🎢',
    caption1: 'A ghost is haunting',
    caption2: 'the Abandoned Theme Park!',
    startLevel: 11,
    endLevel: 20,
  },
  {
    chapterId: 3,
    name: 'The Creepy Lighthouse',
    locationEmoji: '🗼',
    caption1: 'Strange lights flash from',
    caption2: 'the Creepy Lighthouse!',
    startLevel: 21,
    endLevel: 30,
  },
];

/** Get the chapter index (1-based) for a given level number. */
export function getChapterIndex(levelNumber: number): number {
  return Math.floor((levelNumber - 1) / LEVELS_PER_CHAPTER) + 1;
}

/** Returns true if the level is the last in its chapter. */
export function isLastLevelOfChapter(levelNumber: number): boolean {
  return levelNumber % LEVELS_PER_CHAPTER === 0;
}

/** Get the first level number for a chapter. */
export function getChapterFirstLevel(chapterId: number): number {
  return (chapterId - 1) * LEVELS_PER_CHAPTER + 1;
}

/** Get the chapter config for a given chapter ID (1-based). */
export function getChapterConfig(chapterId: number): ChapterConfig {
  const config = CHAPTER_CONFIGS.find(c => c.chapterId === chapterId);
  if (config) return config;
  // Generate fallback config for chapters beyond the pre-defined list
  const startLevel = (chapterId - 1) * LEVELS_PER_CHAPTER + 1;
  return {
    chapterId,
    name: `Mystery Location ${chapterId}`,
    locationEmoji: '🔍',
    caption1: 'A new mystery awaits',
    caption2: 'the Scooby gang!',
    startLevel,
    endLevel: startLevel + LEVELS_PER_CHAPTER - 1,
  };
}

/** Re-export for start-screen-utils compatibility */
export { isPlayButtonInThumbZone } from '../screens/start-screen-utils';
