export function foregroundCoverage(topScreenY: number, viewportHeight: number): number {
  if (viewportHeight <= 0 || !Number.isFinite(topScreenY) || !Number.isFinite(viewportHeight)) return 0;
  return Math.max(0, Math.min(1, (viewportHeight - topScreenY) / viewportHeight));
}
export const FOREGROUND_MAX_CENTER_COVERAGE = 0.22;
export function foregroundPolicy(viewportWidth: number) {
  const sideWidth = Math.min(150, Math.max(100, viewportWidth * 0.11));
  return { alpha: 0.48, leftSafeX: sideWidth, rightSafeX: viewportWidth - sideWidth };
}
