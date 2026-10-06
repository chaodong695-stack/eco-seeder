import { describe, expect, it } from 'vitest';
import { DECOR_PLACEMENTS, enabledDecorIds, MID_LAYER_PLACEMENT } from '@/content/maps/urbanWastelandLayout';

describe('urban wasteland stage one layout', () => {
  it('disables the central floating decor cluster by default', () => expect(enabledDecorIds()).not.toContain('decor.cluster.center'));
  it('keeps the mid layer vertically attached to the world', () => {
    expect(MID_LAYER_PLACEMENT.scrollY).toBe(1);
    expect(Number.isFinite(MID_LAYER_PLACEMENT.baseY)).toBe(true);
  });
  it('only creates enabled decor placements', () => expect(DECOR_PLACEMENTS.filter((p) => p.enabled).every((p) => p.baseY >= 730)).toBe(true));
});
