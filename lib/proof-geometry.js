/**
 * Print Proof Geometry & Preflight Utility (Pure JS)
 * Calculates Cut Line (red) and Safe Area (dashed green) guide percentages,
 * and performs preflight validation (DPI, aspect ratio, bleed allowance).
 */

export const DEFAULT_SAFE_INSET_IN = 0.0625; // 1/16" safe margin
export const DEFAULT_BLEED_IN = 0.125; // 1/8" bleed margin per side

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

/**
 * Validates uploaded artwork against required print specifications.
 * Checks:
 * 1. Aspect Ratio: Artwork vs Finished (and Bleed) dimensions
 * 2. DPI: Effective resolution calculated against required finished dimensions (target >= 300 DPI)
 * 3. Bleed: Checks whether dimensions accommodate standard 0.125" bleed
 */
export function analyzeArtworkPreflight({
  imageWidthPx,
  imageHeightPx,
  finishedWidthIn,
  finishedHeightIn,
  bleedIn = DEFAULT_BLEED_IN,
  fileName = "",
}) {
  if (!imageWidthPx || !imageHeightPx || !finishedWidthIn || !finishedHeightIn) {
    return {
      isValid: true,
      hasErrors: false,
      hasWarnings: false,
      issues: [],
      effectiveDpi: null,
      pixelWidth: imageWidthPx || 0,
      pixelHeight: imageHeightPx || 0,
    };
  }

  const issues = [];
  const requiredBleedW = finishedWidthIn + bleedIn * 2;
  const requiredBleedH = finishedHeightIn + bleedIn * 2;

  // Compute aspect ratios
  const artworkAspect = imageWidthPx / imageHeightPx;
  const finishedAspect = finishedWidthIn / finishedHeightIn;
  const bleedAspect = requiredBleedW / requiredBleedH;

  // Allow rotation (portrait vs landscape orientation matching)
  const isRotatedMatch = Math.abs((1 / artworkAspect) - bleedAspect) < Math.abs(artworkAspect - bleedAspect);
  const effectiveArtworkW = isRotatedMatch ? imageHeightPx : imageWidthPx;
  const effectiveArtworkH = isRotatedMatch ? imageWidthPx : imageHeightPx;
  const normalizedArtworkAspect = effectiveArtworkW / effectiveArtworkH;

  // Aspect ratio delta relative to required bleed aspect
  const aspectDiff = Math.abs(normalizedArtworkAspect - bleedAspect) / bleedAspect;
  const finishedAspectDiff = Math.abs(normalizedArtworkAspect - finishedAspect) / finishedAspect;

  // Effective DPI at full print size (including bleed)
  const dpiX = effectiveArtworkW / requiredBleedW;
  const dpiY = effectiveArtworkH / requiredBleedH;
  const effectiveDpi = Math.round(Math.min(dpiX, dpiY));

  // Minimum required pixels for crisp 300 DPI print
  const minPixelsW = Math.round(requiredBleedW * 300);
  const minPixelsH = Math.round(requiredBleedH * 300);

  // 1. Check Resolution / DPI
  if (effectiveDpi < 150) {
    issues.push({
      type: "error",
      code: "LOW_RESOLUTION_CRITICAL",
      title: "Low Resolution Artwork (< 150 DPI)",
      message: `Your file is only ~${effectiveDpi} DPI (${imageWidthPx} × ${imageHeightPx} px). For high-quality printing, files must be 300 DPI (minimum ${minPixelsW} × ${minPixelsH} px for a ${finishedWidthIn}" × ${finishedHeightIn}" print). This artwork will appear blurry or pixelated when printed.`,
      recommendation: "Please upload a high-resolution 300 DPI image or vector PDF."
    });
  } else if (effectiveDpi < 300) {
    issues.push({
      type: "warning",
      code: "LOW_RESOLUTION_MODERATE",
      title: "Sub-Optimal Resolution (< 300 DPI)",
      message: `Your file resolution is ~${effectiveDpi} DPI. While printable, the recommended standard for commercial print is 300 DPI (${minPixelsW} × ${minPixelsH} px) for crisp text and graphics.`,
      recommendation: "If possible, upload a higher resolution file (300 DPI) for sharper results."
    });
  }

  // 2. Check Aspect Ratio
  // If aspect ratio deviates by more than 3%
  if (aspectDiff > 0.03 && finishedAspectDiff > 0.03) {
    const pctOff = Math.round(Math.min(aspectDiff, finishedAspectDiff) * 100);
    issues.push({
      type: "error",
      code: "ASPECT_RATIO_MISMATCH",
      title: "Dimension & Proportion Mismatch",
      message: `The aspect ratio of your uploaded image (${imageWidthPx} × ${imageHeightPx} px, ratio ${artworkAspect.toFixed(2)}:1) does not match your selected size of ${finishedWidthIn}" × ${finishedHeightIn}" (ratio ${finishedAspect.toFixed(2)}:1). Proportions are off by ~${pctOff}%.`,
      recommendation: `Your artwork will have blank white gaps on the sides or will need to be cropped, cutting off critical content. Please adjust your canvas to ${finishedWidthIn}" × ${finishedHeightIn}" (or ${requiredBleedW}" × ${requiredBleedH}" with bleed).`
    });
  }

  // 3. Bleed Line Warning
  // If pixels are exactly at 300 DPI of finished size without bleed, warn user
  const exactFinishedPixelsW = Math.round(finishedWidthIn * 300);
  const exactFinishedPixelsH = Math.round(finishedHeightIn * 300);
  if (
    aspectDiff <= 0.03 &&
    Math.abs(effectiveArtworkW - exactFinishedPixelsW) < 20 &&
    Math.abs(effectiveArtworkH - exactFinishedPixelsH) < 20
  ) {
    issues.push({
      type: "warning",
      code: "MISSING_BLEED",
      title: "Artwork Sized Without Bleed Margin",
      message: `Your file matches the exact finished trim size (${finishedWidthIn}" × ${finishedHeightIn}") but does not appear to include the 0.125" bleed margin (${requiredBleedW}" × ${requiredBleedH}").`,
      recommendation: "Ensure background colors and full-bleed graphics extend slightly past the red cut line to prevent thin white edges after cutting."
    });
  }

  const hasErrors = issues.some(i => i.type === "error");
  const hasWarnings = issues.some(i => i.type === "warning");

  return {
    isValid: !hasErrors,
    hasErrors,
    hasWarnings,
    issues,
    effectiveDpi,
    pixelWidth: imageWidthPx,
    pixelHeight: imageHeightPx,
    requiredBleedW,
    requiredBleedH,
    minPixelsW,
    minPixelsH
  };
}
