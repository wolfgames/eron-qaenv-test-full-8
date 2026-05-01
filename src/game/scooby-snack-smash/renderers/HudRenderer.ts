/**
 * HudRenderer — GPU Pixi layer for score, taps remaining, level display.
 *
 * Per renderer contract:
 *   - Occupies top 120px HUD zone (does not overlap board cells)
 *   - GPU Pixi Text objects — no DOM, no CSS
 *   - No game state held — receives data via update()
 *   - Destroy order: tweens → listeners → removeChild → destroy
 *
 * Text ≥ 18px for critical stats (per UX guidelines).
 */

import { Container, Text } from 'pixi.js';
import gsap from 'gsap';

export interface HudData {
  score: number;
  tapsRemaining: number;
  level: number;
}

const HUD_HEIGHT = 120;
const STAR_EMOJIS = ['☆', '☆', '☆'];

export class HudRenderer {
  private readonly container: Container;
  private scoreText: Text | null = null;
  private tapsText: Text | null = null;
  private levelText: Text | null = null;
  private starTexts: Text[] = [];
  private prevScore = 0;
  private prevTaps = 30;

  constructor() {
    this.container = new Container();
    this.container.eventMode = 'none';
  }

  getContainer(): Container {
    return this.container;
  }

  init(viewportW: number, _viewportH: number): void {
    const textStyle = {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif',
    };

    // Level label — top left
    this.levelText = new Text({
      text: 'Level 1',
      style: { ...textStyle, fontSize: 18 },
    });
    this.levelText.position.set(16, 12);
    this.container.addChild(this.levelText);

    // Score — top center
    this.scoreText = new Text({
      text: '0',
      style: { ...textStyle, fontSize: 24 },
    });
    this.scoreText.anchor.set(0.5, 0);
    this.scoreText.position.set(viewportW / 2, 10);
    this.container.addChild(this.scoreText);

    // Taps remaining — top right
    this.tapsText = new Text({
      text: '🫧 30',
      style: { ...textStyle, fontSize: 20 },
    });
    this.tapsText.anchor.set(1, 0);
    this.tapsText.position.set(viewportW - 16, 12);
    this.container.addChild(this.tapsText);

    // Star placeholders (shown during/after game)
    for (let i = 0; i < 3; i++) {
      const star = new Text({
        text: '☆',
        style: { fontSize: 22, fill: '#ffd700' },
      });
      star.anchor.set(0.5, 0);
      star.position.set(viewportW / 2 - 30 + i * 30, 55);
      star.alpha = 0;
      this.starTexts.push(star);
      this.container.addChild(star);
    }
  }

  update(data: HudData): void {
    if (!this.scoreText || !this.tapsText || !this.levelText) return;

    // Animate score pop-in if changed
    if (data.score !== this.prevScore) {
      this.scoreText.text = String(data.score);
      gsap.fromTo(
        this.scoreText,
        { pixi: { scale: 1.3 } },
        { pixi: { scale: 1 }, duration: 0.3, ease: 'back.out(2)' },
      );
      this.prevScore = data.score;
    }

    // Animate taps decrement
    if (data.tapsRemaining !== this.prevTaps) {
      this.tapsText.text = `🫧 ${data.tapsRemaining}`;
      gsap.fromTo(
        this.tapsText,
        { pixi: { scale: 1.25 } },
        { pixi: { scale: 1 }, duration: 0.2, ease: 'power2.out' },
      );
      this.prevTaps = data.tapsRemaining;
    }

    this.levelText.text = `Lv ${data.level}`;
  }

  showStars(count: number): void {
    for (let i = 0; i < this.starTexts.length; i++) {
      const star = this.starTexts[i];
      star.text = i < count ? '⭐' : '☆';
      gsap.to(star, {
        alpha: 1,
        pixi: { scale: 1 },
        duration: 0.3,
        delay: i * 0.15,
        ease: 'back.out(1.7)',
      });
    }
  }

  destroy(): void {
    // Correct destroy order
    if (this.scoreText) {
      gsap.killTweensOf(this.scoreText);
      this.scoreText.removeAllListeners();
      this.container.removeChild(this.scoreText);
      this.scoreText.destroy();
      this.scoreText = null;
    }
    if (this.tapsText) {
      gsap.killTweensOf(this.tapsText);
      this.tapsText.removeAllListeners();
      this.container.removeChild(this.tapsText);
      this.tapsText.destroy();
      this.tapsText = null;
    }
    if (this.levelText) {
      gsap.killTweensOf(this.levelText);
      this.levelText.removeAllListeners();
      this.container.removeChild(this.levelText);
      this.levelText.destroy();
      this.levelText = null;
    }
    for (const star of this.starTexts) {
      gsap.killTweensOf(star);
      star.removeAllListeners();
      this.container.removeChild(star);
      star.destroy();
    }
    this.starTexts = [];
    this.container.destroy({ children: true });
  }
}
