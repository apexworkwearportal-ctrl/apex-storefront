/**
 * Mockup geometry — pure JS utility for turning real-world inches into rendered pixels.
 */

export function canvasAspect(image, fallbackWidthIn, fallbackHeightIn) {
  const nw = image?.naturalWidth;
  const nh = image?.naturalHeight;
  if (nw && nh && nw > 0 && nh > 0) return nh / nw;
  if (fallbackWidthIn > 0 && fallbackHeightIn > 0) return fallbackHeightIn / fallbackWidthIn;
  return 1;
}

export function resolveScale(canvasW, image, fallbackApparelWidthIn) {
  // Determine total physical garment image width in inches
  const garmentWidthIn = image?.garmentWidthIn || fallbackApparelWidthIn || 20;

  if (garmentWidthIn > 0 && canvasW > 0) {
    const u = canvasW / garmentWidthIn;
    return {
      unitsPerInchX: u,
      unitsPerInchY: u,
      scaleSource: image?.isCalibrated ? 'calibrated' : 'silhouette',
    };
  }

  const safeWidthIn = 20;
  const u = canvasW / safeWidthIn;
  return { unitsPerInchX: u, unitsPerInchY: u, scaleSource: 'legacy' };
}

export function pxPerInchFromReference(a, b, refInches, naturalWidth, naturalHeight) {
  if (!(refInches > 0) || !(naturalWidth > 0) || !(naturalHeight > 0)) return null;
  const dx = (b.x - a.x) * naturalWidth;
  const dy = (b.y - a.y) * naturalHeight;
  const px = Math.hypot(dx, dy);
  if (!(px > 0)) return null;
  return px / refInches;
}

export function computeLayout(input) {
  const {
    canvasW, image, fallbackApparelWidthIn = 20, fallbackApparelHeightIn = 28,
    logoWidthIn = 4, logoHeightIn = 4, placement = { positionX: 0.5, positionY: 0.35 }
  } = input;

  const canvasH = canvasW * canvasAspect(image, fallbackApparelWidthIn, fallbackApparelHeightIn);
  const { unitsPerInchX, unitsPerInchY, scaleSource } = resolveScale(canvasW, image, fallbackApparelWidthIn);

  const logoW = Math.max(0, logoWidthIn) * unitsPerInchX;
  const logoH = Math.max(0, logoHeightIn) * unitsPerInchY;

  const anchor = (image?.anchorX != null && image?.anchorY != null)
    ? { x: image.anchorX * canvasW, y: image.anchorY * canvasH }
    : { x: canvasW * 0.5, y: canvasH * 0.2 }; // Default collar anchor at top center

  const useOffsets =
    anchor !== null &&
    scaleSource === 'calibrated' &&
    placement.offsetXIn != null &&
    placement.offsetYIn != null;

  const centerX = useOffsets
    ? anchor.x + placement.offsetXIn * unitsPerInchX
    : (placement.positionX !== undefined ? placement.positionX : 0.5) * canvasW;

  const centerY = useOffsets
    ? anchor.y + placement.offsetYIn * unitsPerInchY
    : (placement.positionY !== undefined ? placement.positionY : 0.35) * canvasH;

  return {
    canvasW,
    canvasH,
    unitsPerInch: unitsPerInchX,
    unitsPerInchX,
    unitsPerInchY,
    scaleSource,
    isTrueToScale: scaleSource === 'calibrated',
    logoW,
    logoH,
    logoLeft: centerX - logoW / 2,
    logoTop: centerY - logoH / 2,
    anchor
  };
}

export function placementFromCenter(centerX, centerY, layout) {
  const positionX = layout.canvasW > 0 ? centerX / layout.canvasW : 0.5;
  const positionY = layout.canvasH > 0 ? centerY / layout.canvasH : 0.35;

  if (layout.anchor && layout.isTrueToScale && layout.unitsPerInchX > 0 && layout.unitsPerInchY > 0) {
    return {
      positionX,
      positionY,
      offsetXIn: (centerX - layout.anchor.x) / layout.unitsPerInchX,
      offsetYIn: (centerY - layout.anchor.y) / layout.unitsPerInchY,
    };
  }
  return { positionX, positionY, offsetXIn: null, offsetYIn: null };
}

export function clampCenter(centerX, centerY, layout) {
  const halfW = layout.logoW / 2;
  const halfH = layout.logoH / 2;
  return {
    x: Math.max(halfW, Math.min(layout.canvasW - halfW, centerX)),
    y: Math.max(halfH, Math.min(layout.canvasH - halfH, centerY)),
  };
}

export const PLACEMENT_PRESETS = [
  { id: 'left-chest', label: 'Left Chest', side: 'front', offsetXIn: -3.5, offsetYIn: 8, suggestedWidthIn: 4 },
  { id: 'right-chest', label: 'Right Chest', side: 'front', offsetXIn: 3.5, offsetYIn: 8, suggestedWidthIn: 4 },
  { id: 'centre-chest', label: 'Centre Chest', side: 'front', offsetXIn: 0, offsetYIn: 8, suggestedWidthIn: 10 },
  { id: 'full-front', label: 'Full Front', side: 'front', offsetXIn: 0, offsetYIn: 10, suggestedWidthIn: 11 },
  { id: 'yoke', label: 'Back Yoke', side: 'back', offsetXIn: 0, offsetYIn: 3, suggestedWidthIn: 11 },
  { id: 'full-back', label: 'Full Back', side: 'back', offsetXIn: 0, offsetYIn: 10, suggestedWidthIn: 12 },
];
