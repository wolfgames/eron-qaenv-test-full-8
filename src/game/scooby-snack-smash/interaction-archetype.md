# Scooby Snack Smash — Interaction Archetype

## Which Interaction Type

**Tap** — single finger touch to activate a cluster of matching treat bubbles.

## Pointer Sequence

```
pointertap  → Board hit area (eventMode='static') receives tap event
              Route to handleCellTap(row, col)
              Check board phase:
                IDLE    → dispatch executeTap to ECS
                ANIMATING → queue tap (max 1 queued); fires after animation
                WIN/LOST  → drop tap
```

Event: `pointertap` (Pixi) — cross-platform, works for both touch and mouse.

## Tap Detection

No drag threshold required. Single tap = one `pointertap` event on a cell's hit-area Graphics object (48×48px).

## Cancel Behavior

Pixi `pointertap` fires only on confirmed tap (no long-press, no drag). There is no cancel case for a tap interaction type.

## Invalid Gesture Feedback

**Isolated bubble tap** (cluster size = 1):
- No tap consumed (tapsRemaining unchanged)
- Board stays in IDLE phase
- CompanionRenderer shows 'Ruh-roh!' speech bubble for 600ms
- Hit area plays 6-cycle horizontal shake oscillation (±6px, 60ms per cycle)

The player sees the Scooby Ruh-roh reaction AND the board shake. Not silent.

## Feel Description

**Crisp and light.** Tap registers instantly. The burst dissolve animation (200ms) is quick but readable. Gravity cascades feel satisfying and physical — pieces fall with acceleration, bounce on landing. Cascades escalate (3 tiers: normal → faster + glow → fast + exaggerated + particles).

The interaction is "tap to pop clusters" — mechanically simple, strategically deep via group-size optimization and cascade chaining.

## Touch-Action

Board container has `touch-action: none` set via CSS to disable browser gesture interference. All input goes through Pixi `pointertap` events routed through the BoardRenderer.

## Input Blocking

Board phase state machine:
- `IDLE` → input accepted
- `ANIMATING` → input queued (max 1 pending tap)
- `WIN` / `LOST` → input fully blocked
- `PAUSED` → Pixi stage input blocked by PauseOverlay

The event queue processes animation steps sequentially before enabling queued input.
