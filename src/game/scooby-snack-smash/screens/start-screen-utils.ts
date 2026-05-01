/**
 * Start screen utilities — pure functions for layout validation.
 */

/**
 * Returns true if the Play button Y position is in the bottom third of the screen
 * (Natural thumb zone: y > 66% of viewportH).
 */
export function isPlayButtonInThumbZone(buttonY: number, viewportH: number): boolean {
  return buttonY > viewportH * 0.66;
}

/**
 * Returns true if the settings icon is in the top-right corner
 * (Stretching zone: x > 80% of viewportW, y < 20% of viewportH).
 */
export function isSettingsIconInTopRight(
  iconX: number,
  iconY: number,
  viewportW: number,
  viewportH: number,
): boolean {
  return iconX > viewportW * 0.75 && iconY < viewportH * 0.2;
}
