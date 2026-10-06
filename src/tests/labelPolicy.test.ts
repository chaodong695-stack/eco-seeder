import { describe, expect, it } from 'vitest';
import { resolveFocus } from '@/game/visual/labelPolicy';

describe('resolveFocus', () => {
  it('selects the nearest eligible candidate with stable hysteresis', () => {
    expect(resolveFocus([
      { id: 'b', distance: 40, range: 80, eligible: true, priority: 0 },
      { id: 'a', distance: 40, range: 80, eligible: true, priority: 1 },
    ], null)).toEqual({ id: 'a', canInteract: true });
    expect(resolveFocus([
      { id: 'a', distance: 85, range: 80, eligible: true, priority: 0 },
    ], 'a')).toEqual({ id: 'a', canInteract: false });
  });
});
