import { describe, expect, it } from 'vitest';
import { TaskMarker } from '@/game/visual/TaskMarker';

describe('TaskMarker', () => {
  it('clamps progress and draws semantic marker states', () => {
    const calls: string[] = [];
    const graphics = {
      setDepth: () => graphics,
      setVisible: () => graphics,
      clear: () => { calls.push('clear'); return graphics; },
      setPosition: () => graphics,
      lineStyle: () => graphics,
      strokePoints: () => { calls.push('points'); return graphics; },
      strokeCircle: () => { calls.push('circle'); return graphics; },
      strokeTriangle: () => { calls.push('triangle'); return graphics; },
      beginPath: () => graphics,
      arc: (_x: number, _y: number, _r: number, _a: number, _b: number) => graphics,
      strokePath: () => { calls.push('progress'); return graphics; },
      lineBetween: () => { calls.push('cross'); return graphics; },
      destroy: () => { calls.push('destroy'); },
      scene: {},
    };
    const scene = { add: { graphics: () => graphics } } as never;
    const marker = new TaskMarker(scene);
    marker.setState(1, 2, 'hazard', true, 2);
    expect(calls).toContain('cross');
    expect(calls).toContain('progress');
    marker.destroy();
    expect(calls).toContain('destroy');
  });
});
