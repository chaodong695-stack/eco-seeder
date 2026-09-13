import { describe, expect, it } from 'vitest';
import { ACTION_PALETTE, highlightStyle } from '@/game/visual/visualPalette';

describe('visual palette', () => {
  it('maps each action to a stable semantic color', () => {
    expect(Object.keys(ACTION_PALETTE)).toEqual(['repair', 'inspect', 'patrol', 'hazard']);
    expect(highlightStyle('repair', false).color).toBe(ACTION_PALETTE.repair.rgb);
    expect(highlightStyle('repair', true).color).toBe(ACTION_PALETTE.repair.rgb);
    expect(highlightStyle('repair', true).alpha).toBeGreaterThan(highlightStyle('repair', false).alpha);
  });
});
