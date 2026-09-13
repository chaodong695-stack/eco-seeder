import { describe, expect, it, vi } from 'vitest';
import Phaser from 'phaser';
import { drawAnchorDebug } from '@/game/visual/OcclusionDebugOverlay';
describe('occlusion debug overlay', () => { it('draws anchor and caption without fillText', () => { const g={lineStyle:vi.fn(),lineBetween:vi.fn(),fillStyle:vi.fn().mockReturnThis(),fillCircle:vi.fn().mockReturnThis()} as unknown as Phaser.GameObjects.Graphics; const c={setPosition:vi.fn().mockReturnThis(),setText:vi.fn().mockReturnThis()} as unknown as Phaser.GameObjects.Text; drawAnchorDebug(g,c,{id:'a',x:1,baseY:2,depth:3}); expect(g.lineBetween).toHaveBeenCalled(); expect(c.setText).toHaveBeenCalledWith('a y=2 d=3'); }); });
