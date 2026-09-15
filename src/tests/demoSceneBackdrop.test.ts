import { describe, it, expect, vi } from 'vitest';
import type Phaser from 'phaser';
import { DemoSceneBackdrop } from '@/game/visual/DemoSceneBackdrop';
import { DEMO_LAYERS } from '@/content/maps/demoSceneLayout';

function fakeScene(missing = '') {
  const images: Array<Record<string, any>> = [];
  const addImage = vi.fn((x, y, key) => {
    const image: Record<string, any> = { x, y, key, scene: {}, alpha: 1 };
    for (const name of ['setOrigin', 'setDisplaySize', 'setDepth', 'setTint', 'setBlendMode']) image[name] = vi.fn(() => image);
    image.setAlpha = vi.fn((alpha) => {image.alpha = alpha; return image;});
    image.setPosition = vi.fn((px, py) => {image.x=px;image.y=py;return image;});
    image.destroy = vi.fn(() => {image.scene=null;}); images.push(image);return image;
  });
  const tween = { stop: vi.fn(), remove: vi.fn() };
  const scene = { add:{image:addImage}, textures:{exists:(key:string)=>key!==missing}, tweens:{add:vi.fn(()=>tween)}, load:{image:vi.fn()} };
  return {scene:scene as unknown as Phaser.Scene, images, tween};
}
describe('DemoSceneBackdrop', () => {
  it('preloads every layer from the manifest', () => {
    const {scene}=fakeScene(); DemoSceneBackdrop.preload(scene); expect(scene.load.image).toHaveBeenCalledTimes(8);
  });
  it('uses the same image bounds and leaves entities in their own depth band', () => {
    const {scene,images}=fakeScene(); const backdrop=new DemoSceneBackdrop(scene);
    expect(images).toHaveLength(8);
    images.forEach(image=>expect(image.setDisplaySize).toHaveBeenCalledWith(1920,1080));
    backdrop.update(16,960,540,1000,900);
    const ground=images.find(i=>i.key==='demo-ground')!;expect(ground.x).toBe(960);expect(ground.y).toBe(540);
    backdrop.destroy();
  });
  it('fades obstructing foreground when the player moves behind it', () => {
    const {scene,images}=fakeScene();const backdrop=new DemoSceneBackdrop(scene);
    backdrop.update(1000,960,540,450,950);
    expect(images.find(i=>i.key==='demo-fence')!.alpha).toBeLessThan(1);
    backdrop.destroy();
  });
  it('skips a failed optional texture and releases all images and tween once', () => {
    const {scene,images,tween}=fakeScene('demo-smoke');const backdrop=new DemoSceneBackdrop(scene);
    expect(images).toHaveLength(DEMO_LAYERS.length-1);backdrop.destroy();backdrop.destroy();
    images.forEach(image=>expect(image.destroy).toHaveBeenCalledTimes(1));expect(tween.stop).not.toHaveBeenCalled();
  });
  it('stops smoke animation on scene shutdown', () => {
    const {scene,tween}=fakeScene();const backdrop=new DemoSceneBackdrop(scene);backdrop.destroy();expect(tween.stop).toHaveBeenCalledTimes(1);
  });
});
