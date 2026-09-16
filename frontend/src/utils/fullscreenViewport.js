export const FULLSCREEN_REFERENCE_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080
});

/**
 * Keeps presentation workspaces inside the visible browser area when browser
 * zoom reduces the CSS viewport below the dashboard's working size.
 */
export function calculateFullscreenFitScale(viewport, referenceViewport = FULLSCREEN_REFERENCE_VIEWPORT) {
  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  const referenceWidth = Number(referenceViewport?.width);
  const referenceHeight = Number(referenceViewport?.height);

  if (![width, height, referenceWidth, referenceHeight].every(Number.isFinite)
    || width <= 0 || height <= 0 || referenceWidth <= 0 || referenceHeight <= 0) {
    return 1;
  }

  return Math.min(1, width / referenceWidth, height / referenceHeight);
}
