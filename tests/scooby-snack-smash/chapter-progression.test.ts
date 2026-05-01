/**
 * Batch 7 — chapter-progression tests
 */
import { describe, it, expect } from 'vitest';
import {
  getChapterIndex,
  isLastLevelOfChapter,
  getChapterFirstLevel,
  LEVELS_PER_CHAPTER,
} from '~/game/scooby-snack-smash/data/chapter-config';

describe('chapter-progression: level and chapter logic', () => {
  it('level 10 triggers chapter complete (10 levels per chapter)', () => {
    expect(isLastLevelOfChapter(10)).toBe(true);
  });

  it('level 9 does not trigger chapter complete', () => {
    expect(isLastLevelOfChapter(9)).toBe(false);
  });

  it('chapter 2 starts at level 11', () => {
    expect(getChapterFirstLevel(2)).toBe(11);
  });

  it('chapter index = Math.floor((levelNumber - 1) / 10)', () => {
    expect(getChapterIndex(1)).toBe(1);
    expect(getChapterIndex(10)).toBe(1);
    expect(getChapterIndex(11)).toBe(2);
    expect(getChapterIndex(20)).toBe(2);
    expect(getChapterIndex(21)).toBe(3);
  });
});
