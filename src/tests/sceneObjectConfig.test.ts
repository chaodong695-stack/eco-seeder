import { describe, expect, it } from 'vitest';
import { POLLUTION_LAYOUT, SCENE_OBJECT_LAYOUTS } from '@/content/maps/urbanWastelandLayout';
import { interactionPosition } from '@/game/visual/sceneObjectTypes';
import { validatePlacement } from '@/game/visual/placementValidation';
describe('scene object configuration', () => {
  it('derives interaction coordinates from stable baseY', () => { expect(interactionPosition(POLLUTION_LAYOUT)).toEqual({ x: 650, y: 880 }); expect(POLLUTION_LAYOUT.id).toBe('interaction.pollution_zone_01'); });
  it('validates all stage two placements', () => { expect(() => validatePlacement(SCENE_OBJECT_LAYOUTS)).not.toThrow(); });
  it('rejects duplicate and invalid placements', () => { expect(() => validatePlacement([{ ...POLLUTION_LAYOUT }, { ...POLLUTION_LAYOUT }])).toThrow('Duplicate'); expect(() => validatePlacement([{ ...POLLUTION_LAYOUT, baseY: Number.NaN }])).toThrow('Invalid'); });
});
