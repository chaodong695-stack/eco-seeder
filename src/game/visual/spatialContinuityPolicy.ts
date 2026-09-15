/** Visual continuity targets for the main 2.5D scene. */
export const TRANSITION_BAND = {
  topRatio: 0.42,
  heightRatio: 0.18,
  maxHardEdgeRatio: 0.2,
} as const;

export const FAR_VISUAL_POLICY = {
  contrast: 0.82,
  saturation: 0.78,
  brightness: 0.92,
  alpha: 0.86,
  softOverlayAlpha: 0.22,
  blurPx: 1.5,
} as const;

export const FAR_ATMOSPHERE = {
  topAlpha: 0.04,
  middleAlpha: 0.1,
  bottomAlpha: 0.22,
} as const;

export const CONTINUITY_ANCHOR = {
  segmentCount: 3,
  maxCornerAngle: 18,
  far: { xRatio: 0.49, yRatio: 0.36, widthRatio: 0.1, alpha: 0.65 },
  transition: { xRatio: 0.5, yRatio: 0.46, widthRatio: 0.14, alpha: 0.82 },
  mid: { xRatio: 0.52, yRatio: 0.57, widthRatio: 0.18, alpha: 0.96 },
} as const;
