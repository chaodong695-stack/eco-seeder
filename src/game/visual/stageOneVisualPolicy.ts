export interface ForegroundPolicy {
  alpha: number;
  leftSafeX: number;
  rightSafeX: number;
}

export const STAGE_ONE_VISUALS = {
  farAlpha: 0.62,
  midAlpha: 0.78,
  foregroundAlpha: 0.48,
  foregroundScrollFactor: 1.04,
  labelFontSize: '11px',
  labelGap: 14,
} as const;

export function foregroundPolicy(viewportWidth: number): ForegroundPolicy {
  const sideWidth = Math.min(150, Math.max(100, viewportWidth * 0.11));
  return { alpha: STAGE_ONE_VISUALS.foregroundAlpha, leftSafeX: sideWidth, rightSafeX: viewportWidth - sideWidth };
}

export interface WalkableRoute {
  x: number;
  yMin: number;
  yMax: number;
  width: number;
}

export const PRIMARY_WALKABLE_ROUTE: WalkableRoute = {
  x: 960,
  yMin: 730,
  yMax: 1010,
  width: 180,
};

export function isInsidePrimaryRoute(x: number, y: number): boolean {
  const route = PRIMARY_WALKABLE_ROUTE;
  return Math.abs(x - route.x) <= route.width / 2 && y >= route.yMin && y <= route.yMax;
}
