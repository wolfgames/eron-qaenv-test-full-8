/**
 * Start Screen View — Scooby Snack Smash
 *
 * Called by screens/StartScreen.tsx — the bridge between Solid.js and the start screen.
 * DOM-mode (not GPU): SolidJS manages the outer shell; this controller builds DOM children.
 *
 * Layout:
 *   - 'Scooby Snack Smash' logo text at top-center
 *   - Scooby peek-from-below emoji at center-bottom (GSAP slide-up on mount)
 *   - 'Play' button in bottom-third (Natural thumb zone)
 *   - Settings icon at top-right (Stretching zone)
 *
 * Per guardrails: SolidJS patterns apply (no React). All animations via GSAP.
 */

import gsap from 'gsap';
import type {
  StartScreenDeps,
  StartScreenController,
  SetupStartScreen,
} from '~/game/mygame-contract';

export const setupStartScreen: SetupStartScreen = (deps: StartScreenDeps): StartScreenController => {
  let wrapper: HTMLDivElement | null = null;
  let scoobyCon: HTMLDivElement | null = null;
  let playBtn: HTMLButtonElement | null = null;

  return {
    backgroundColor: '#BCE083',

    init(container: HTMLDivElement) {
      wrapper = document.createElement('div');
      wrapper.style.cssText =
        'position:relative;width:100%;height:100%;display:flex;flex-direction:column;' +
        'align-items:center;overflow:hidden;touch-action:none;user-select:none;';

      // ── Logo — top center ────────────────────────────────────────
      const logo = document.createElement('h1');
      logo.textContent = 'Scooby Snack Smash';
      logo.style.cssText =
        'font-size:2.5rem;font-weight:900;color:#2d5016;margin:0;padding-top:10%;' +
        'font-family:system-ui,sans-serif;text-align:center;text-shadow:2px 2px 0 rgba(0,0,0,0.15);';
      wrapper.append(logo);

      // Logo wobble animation via GSAP on mount
      gsap.fromTo(logo,
        { rotation: -5, scale: 0.9 },
        { rotation: 5, scale: 1.05, duration: 0.4, yoyo: true, repeat: 1,
          ease: 'power2.inOut', onComplete: () => { gsap.set(logo, { rotation: 0, scale: 1 }); } },
      );

      // ── Settings icon — top right (Stretching zone) ──────────────
      const settingsBtn = document.createElement('button');
      settingsBtn.textContent = '⚙️';
      settingsBtn.setAttribute('aria-label', 'Settings');
      settingsBtn.style.cssText =
        'position:absolute;top:16px;right:16px;background:transparent;border:none;' +
        'font-size:1.75rem;cursor:pointer;padding:8px;min-width:44px;min-height:44px;';
      wrapper.append(settingsBtn);

      // ── Scooby peek from below — center-bottom ───────────────────
      scoobyCon = document.createElement('div');
      scoobyCon.textContent = '🐕';
      scoobyCon.style.cssText =
        'position:absolute;font-size:5rem;bottom:26%;text-align:center;' +
        'transform:translateY(120px);';
      wrapper.append(scoobyCon);

      // Peek-from-below slide-up animation
      gsap.to(scoobyCon, {
        y: 0, duration: 0.6, ease: 'back.out(1.7)', delay: 0.3,
      });

      // ── Play button — bottom-third (Natural thumb zone) ──────────
      playBtn = document.createElement('button');
      playBtn.textContent = 'Play';
      playBtn.setAttribute('aria-label', 'Play Scooby Snack Smash');
      playBtn.style.cssText =
        'position:absolute;bottom:10%;left:50%;transform:translateX(-50%);' +
        'font-size:1.5rem;font-weight:700;padding:16px 64px;border:none;border-radius:16px;' +
        'background:#4a8c1c;color:#fff;cursor:pointer;font-family:system-ui,sans-serif;' +
        'box-shadow:0 6px 16px rgba(0,0,0,0.25);min-width:160px;min-height:56px;';
      wrapper.append(playBtn);

      playBtn.addEventListener('pointertap', handlePlay, { once: true });
      playBtn.addEventListener('click', handlePlay, { once: true });

      async function handlePlay() {
        if (!playBtn) return;
        playBtn.disabled = true;
        playBtn.textContent = '🐕 Let\'s Go!';
        gsap.to(playBtn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });
        try {
          await deps.initGpu();
          deps.unlockAudio();
          await deps.loadCore();
          try { await deps.loadAudio(); } catch { /* audio optional */ }
        } catch (err) {
          console.error('[StartScreen] Load error:', err);
          if (playBtn) {
            playBtn.disabled = false;
            playBtn.textContent = 'Play';
          }
          return;
        }
        deps.analytics.trackGameStart({ start_source: 'play_button', is_returning_player: false });
        deps.goto('game');
      }

      container.append(wrapper);
    },

    destroy() {
      if (scoobyCon) gsap.killTweensOf(scoobyCon);
      if (playBtn) gsap.killTweensOf(playBtn);
      wrapper?.remove();
      wrapper = null;
      scoobyCon = null;
      playBtn = null;
    },
  };
};
