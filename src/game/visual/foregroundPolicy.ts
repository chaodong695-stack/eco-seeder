export function foregroundCoverage(topScreenY: number, viewportHeight: number): number {
  if (viewportHeight <= 0 || !Number.isFinite(topScreenY) || !Number.isFinite(viewportHeight)) return 0;
  return Math.max(0, Math.min(1, (viewportHeight - topScreenY) / viewportHeight));
}
export const FOREGROUND_MAX_CENTER_COVERAGE = 0.22;
export function foregroundPolicy(viewportWidth: number) {
  const sideWidth = Math.min(190, Math.max(120, viewportWidth * 0.14));
  return { alpha: 0.48, centerAlpha: 0.08, sideWidth, leftSafeX: sideWidth, rightSafeX: viewportWidth - sideWidth };
}
export function foregroundGradientAt(x: number, viewportWidth: number): number {
  const { sideWidth, alpha, centerAlpha } = foregroundPolicy(viewportWidth);
  if (viewportWidth <= 0 || x < 0 || x > viewportWidth) return 0;
  const distanceToEdge = Math.min(x, viewportWidth - x);
  if (distanceToEdge >= sideWidth) return centerAlpha;
  const t = distanceToEdge / sideWidth;
  return centerAlpha + (alpha - centerAlpha) * (1 - t) ** 2;
}
