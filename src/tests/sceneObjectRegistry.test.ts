import { describe, expect, it, vi } from 'vitest';
import { SceneObjectRegistry } from '@/game/visual/sceneObjectRegistry';
describe('scene object registry', () => {
  it('presents body, label, marker and shadow together', () => { const r=new SceneObjectRegistry(); const body={setVisible:vi.fn()},label={setVisible:vi.fn()},marker={setVisible:vi.fn()},shadow={sync:vi.fn(),destroy:vi.fn()}; r.register('a',{body,label,marker,shadow,anchor:()=>({x:1,baseY:2})}); r.present('a',false,true,true); expect(body.setVisible).toHaveBeenCalledWith(false); expect(label.setVisible).toHaveBeenCalledWith(false); expect(marker.setVisible).toHaveBeenCalledWith(false); expect(shadow.sync).toHaveBeenCalledWith(1,2,0); });
  it('rejects duplicate IDs and destroys idempotently', () => { const r=new SceneObjectRegistry(); const e={setVisible:vi.fn()}; const shadow={sync:vi.fn(),destroy:vi.fn()}; r.register('a',{body:e,label:e,marker:e,shadow,anchor:()=>({x:0,baseY:0})}); expect(()=>r.register('a',{body:e,label:e,marker:e,anchor:()=>({x:0,baseY:0})})).toThrow('Duplicate'); r.destroy(); r.destroy(); expect(shadow.destroy).toHaveBeenCalledTimes(1); });
});
