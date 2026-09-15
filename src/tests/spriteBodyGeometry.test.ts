import { describe, expect, it } from 'vitest';
import { spriteBodyGeometry } from '@/game/entities/spriteBodyGeometry';
describe('sprite body geometry', () => {
  it.each([0.08,0.1,0.15])('preserves a 32x48 world footprint at scale %s', scale => {
    const body=spriteBodyGeometry(1086,1448,scale,32,48);
    expect(body.width*scale).toBeCloseTo(32);expect(body.height*scale).toBeCloseTo(48);
    expect((body.offsetX+body.width/2)*scale).toBeCloseTo(1086*scale/2);
    expect((body.offsetY+body.height)*scale).toBeCloseTo(1448*scale);
  });
});
