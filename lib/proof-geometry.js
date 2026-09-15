/**
 * Print Proof Geometry Utility (Pure JS)
 * Calculates Cut Line (red) and Safe Area (dashed green) guide percentages.
 */

export const DEFAULT_SAFE_INSET_IN = 0.0625; // 1/16" safe margin

export function describeIn(inches) {
  return `${Number(parseFloat(inches).toFixed(3))}"`;
}

export function describeSize(widthIn, heightIn) {
  return `${describeIn(widthIn)} × ${describeIn(heightIn)}`;
}

/**
 * Computes cut and safe guide rectangle percentages (0-1) for CSS overlays over rendered artwork.
 */
export function computeGuides({ finishedWidthIn = 3.5, finishedHeightIn = 2.0, bleedIn = 0.125, safeInsetIn = DEFAULT_SAFE_INSET_IN }) {
  const mediaW = finishedWidthIn + bleedIn * 2;
  const mediaH = finishedHeightIn + bleedIn * 2;

  const cutWIn = finishedWidthIn;
  const cutHIn = finishedHeightIn;
  const cutXIn = bleedIn;
  const cutYIn = bleedIn;

  const safeXIn = cutXIn + safeInsetIn;
  const safeYIn = cutYIn + safeInsetIn;
  const safeWIn = Math.max(0, cutWIn - safeInsetIn * 2);
  const safeHIn = Math.max(0, cutHIn - safeInsetIn * 2);

  const toRect = (xIn, yIn, wIn, hIn) => ({
    left: `${(xIn / mediaW) * 100}%`,
    top: `${(yIn / mediaH) * 100}%`,
    width: `${(wIn / mediaW) * 100}%`,
    height: `${(hIn / mediaH) * 100}%`
  });

  return {
    cut: toRect(cutXIn, cutYIn, cutWIn, cutHIn),
    safe: toRect(safeXIn, safeYIn, safeWIn, safeHIn),
    mediaWidthIn: mediaW,
    mediaHeightIn: mediaH
  };
}
