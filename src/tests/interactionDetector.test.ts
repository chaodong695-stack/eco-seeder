import { describe, it, expect } from 'vitest';
import { isInRange, findAvailableInteractions } from '@/game/interaction/interactionDetector';
import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';

const makeConfig = (overrides: Partial<InteractionObjectConfig> = {}): InteractionObjectConfig => ({
  id: 'test.01',
  type: 'pollution',
  displayName: '测试对象',
  x: 500,
  y: 500,
  width: 64,
  height: 64,
  interactionRange: 80,
  feedbackMessage: '测试反馈',
  color: 0x8b4422,
  ...overrides,
});

describe('isInRange', () => {
  it('returns true when player is at the same position', () => {
    const config = makeConfig({ x: 500, y: 500, interactionRange: 80 });
    expect(isInRange(500, 500, config)).toBe(true);
  });

  it('returns true when player is within range', () => {
    const config = makeConfig({ x: 500, y: 500, interactionRange: 80 });
    expect(isInRange(560, 500, config)).toBe(true);
    expect(isInRange(500, 570, config)).toBe(true);
  });

  it('returns false when player is out of range', () => {
    const config = makeConfig({ x: 500, y: 500, interactionRange: 80 });
    expect(isInRange(600, 500, config)).toBe(false);
    expect(isInRange(500, 600, config)).toBe(false);
  });

  it('handles diagonal distance correctly', () => {
    const config = makeConfig({ x: 500, y: 500, interactionRange: 80 });
    // 距离 = sqrt(50^2 + 50^2) ≈ 70.7 < 80
    expect(isInRange(550, 550, config)).toBe(true);
    // 距离 = sqrt(60^2 + 60^2) ≈ 84.9 > 80
    expect(isInRange(560, 560, config)).toBe(false);
  });

  it('boundary case — exactly at range', () => {
    const config = makeConfig({ x: 500, y: 500, interactionRange: 80 });
    expect(isInRange(580, 500, config)).toBe(true);
  });
});

describe('findAvailableInteractions', () => {
  const configs: InteractionObjectConfig[] = [
    makeConfig({ id: 'obj.01', x: 500, y: 500, interactionRange: 80 }),
    makeConfig({ id: 'obj.02', x: 1000, y: 1000, interactionRange: 80 }),
    makeConfig({ id: 'obj.03', x: 520, y: 520, interactionRange: 60 }),
  ];

  it('returns empty array when no objects are in range', () => {
    const result = findAvailableInteractions(0, 0, configs);
    expect(result).toHaveLength(0);
  });

  it('returns only objects within range', () => {
    const result = findAvailableInteractions(500, 500, configs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain('obj.01');
    expect(result.map((r) => r.id)).toContain('obj.03');
    expect(result.map((r) => r.id)).not.toContain('obj.02');
  });

  it('returns only the nearby object', () => {
    const result = findAvailableInteractions(1000, 1000, configs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('obj.02');
  });
});
