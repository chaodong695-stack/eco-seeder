import { describe, expect, it } from 'vitest';
import { hasRoute, isFreeFootPoint } from '@/game/visual/routeValidation';

describe('route validation', () => {
  it('inflates obstacles by the player footprint', () => {
    const walls = [{ left: 100, right: 130, top: 800, bottom: 850 }];
    expect(isFreeFootPoint({ x: 90, y: 820 }, walls, 16, 8)).toBe(false);
    expect(isFreeFootPoint({ x: 70, y: 820 }, walls, 16, 8)).toBe(true);
  });
  it('finds a route around an obstacle', () => {
    expect(hasRoute({ x: 40, y: 40 }, [{ x: 120, y: 40 }], [{ left: 70, right: 90, top: 0, bottom: 32 }], { left: 0, right: 160, top: 0, bottom: 80 })).toBe(true);
  });
  it('rejects a sealed target', () => {
    const box = { left: 40, right: 120, top: 20, bottom: 100 };
    expect(hasRoute({ x: 10, y: 60 }, [{ x: 80, y: 60 }], [box], { left: 0, right: 130, top: 0, bottom: 120 })).toBe(false);
  });
});
