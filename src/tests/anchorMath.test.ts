import { describe, expect, it } from 'vitest';
import { anchoredImagePose } from '@/game/visual/anchorMath';
describe('anchor math', () => {
  it('keeps visible contact on baseY despite transparent padding', () => { const p=anchoredImagePose(100,800,100,{frameWidth:200,frameHeight:400,contentTop:80,contentBottom:380,contactX:100,contactY:380}); expect(p.scale).toBeCloseTo(1/3); expect(p.y-(400-380)*p.scale).toBeCloseTo(800); expect(p.labelY).toBeCloseTo(692); });
  it('rejects invalid content metrics', () => { expect(() => anchoredImagePose(0,0,100,{frameWidth:1,frameHeight:1,contentTop:2,contentBottom:2,contactX:0,contactY:0})).toThrow(); });
});
