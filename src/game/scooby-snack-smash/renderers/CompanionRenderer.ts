/**
 * CompanionRenderer — Scooby companion strip at bottom of viewport.
 *
 * Per renderer contract:
 *   - eventMode='none' (no interactive children in strip)
 *   - Occupies bottom 80px companion zone
 *   - GSAP for all animations (no setTimeout, no CSS)
 *   - Destroy order: tweens → listeners → removeChild → destroy
 *
 * Bottom strip must leave ≥ 34px margin for swipe-home safe area (mobile).
 */

import { Container, Text } from 'pixi.js';
import gsap from 'gsap';

const COMPANION_HEIGHT = 80;
const SAFE_AREA_BOTTOM = 34;

export class CompanionRenderer {
  private readonly container: Container;
  private companionText: Text | null = null;
  private speechBubble: Text | null = null;
  private viewportH = 844;
  private isAnimating = false;

  constructor() {
    this.container = new Container();
    this.container.eventMode = 'none';
  }

  getContainer(): Container {
    return this.container;
  }

  init(viewportW: number, viewportH: number): void {
    this.viewportH = viewportH;

    // Companion (Scooby) emoji — centered in strip
    this.companionText = new Text({
      text: '🐕',
      style: { fontSize: 40, align: 'center' },
    });
    this.companionText.anchor.set(0.5, 1);
    // Bottom strip: viewportH - safe area - some margin
    const stripBottom = viewportH - SAFE_AREA_BOTTOM;
    this.companionText.position.set(viewportW / 2, stripBottom - 8);
    this.container.addChild(this.companionText);

    // Speech bubble text
    this.speechBubble = new Text({
      text: '',
      style: {
        fontSize: 14,
        fill: '#ffffff',
        fontFamily: 'system-ui, sans-serif',
        align: 'center',
      },
    });
    this.speechBubble.anchor.set(0.5, 1);
    this.speechBubble.position.set(viewportW / 2, stripBottom - 56);
    this.speechBubble.alpha = 0;
    this.container.addChild(this.speechBubble);
  }

  showCelebration(): void {
    if (!this.companionText || this.isAnimating) return;
    this.isAnimating = true;
    const CELEBRATE_EMOJIS = ['🐕🎉', '🐕✨', '🐕🌟'];
    const emoji = CELEBRATE_EMOJIS[Math.floor(Math.random() * CELEBRATE_EMOJIS.length)];
    this.companionText.text = emoji;
    gsap.fromTo(
      this.companionText,
      { pixi: { scale: 1, y: this.companionText.y } },
      {
        pixi: { scale: 1.3, y: this.companionText.y - 10 },
        duration: 0.3,
        ease: 'back.out(2)',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          if (this.companionText) this.companionText.text = '🐕';
          this.isAnimating = false;
        },
      },
    );
  }

  showRuhroh(): void {
    if (!this.companionText || !this.speechBubble) return;
    gsap.killTweensOf(this.companionText);
    gsap.killTweensOf(this.speechBubble);

    this.companionText.text = '🐕😬';
    this.speechBubble.text = 'Ruh-roh!';

    gsap.to(this.speechBubble, { alpha: 1, duration: 0.2 });
    gsap.delayedCall(0.6, () => {
      if (!this.speechBubble || !this.companionText) return;
      gsap.to(this.speechBubble, {
        alpha: 0, duration: 0.2, onComplete: () => {
          if (this.companionText) this.companionText.text = '🐕';
        },
      });
    });
  }

  showWin(): void {
    if (!this.companionText) return;
    gsap.killTweensOf(this.companionText);
    this.companionText.text = '🐕🎉';

    // Loop victory dance
    gsap.to(this.companionText, {
      pixi: { rotation: 15, y: this.companionText.y - 8 },
      duration: 0.3,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  showLoss(): void {
    if (!this.companionText || !this.speechBubble) return;
    gsap.killTweensOf(this.companionText);
    gsap.killTweensOf(this.speechBubble);

    this.companionText.text = '🐕😔';
    this.speechBubble.text = 'Ruh-roh...';

    gsap.to(this.speechBubble, { alpha: 1, duration: 0.3 });
  }

  destroy(): void {
    if (this.companionText) {
      gsap.killTweensOf(this.companionText);
      this.companionText.removeAllListeners();
      this.container.removeChild(this.companionText);
      this.companionText.destroy();
      this.companionText = null;
    }
    if (this.speechBubble) {
      gsap.killTweensOf(this.speechBubble);
      this.speechBubble.removeAllListeners();
      this.container.removeChild(this.speechBubble);
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
    this.container.destroy({ children: true });
  }
}
