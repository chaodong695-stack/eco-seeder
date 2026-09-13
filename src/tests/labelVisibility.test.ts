import { describe, expect, it } from 'vitest';
import { shouldShowWorldLabel } from '@/game/visual/labelPolicy';

describe('world label visibility', () => {
  it('shows at most the focused visible label', () => {
    expect(shouldShowWorldLabel('a', 'a', true, false)).toBe(true);
    expect(shouldShowWorldLabel('b', 'a', true, false)).toBe(false);
    expect(shouldShowWorldLabel('a', 'a', false, false)).toBe(false);
    expect(shouldShowWorldLabel('a', 'a', true, true)).toBe(false);
  });
});
