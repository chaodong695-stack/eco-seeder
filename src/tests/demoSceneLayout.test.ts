import { describe, expect, it } from 'vitest';
import { INTERACTION_OBJECTS } from '@/game/interaction/interactionObjects';
import { NPC_DEFINITIONS } from '@/game/npc/npcDefinitions';
import { WALKABLE_Y_MIN, WALKABLE_Y_MAX } from '@/game/config/movementConfig';
import { DEPTH_FX, entityDepth } from '@/game/config/depthConfig';
import { hasRoute } from '@/game/visual/routeValidation';
import { DEMO_SCENE, DEMO_LAYERS, demoInteractionObjects, demoNpcDefinitions, demoActorHeight } from '@/content/maps/demoSceneLayout';

const shippedLayers = import.meta.glob('/public/assets/images/demo-scene/*.png', { eager: true, query: '?url', import: 'default' });

describe('demo scene layout contracts', () => {
  it('preserves every original interaction and gameplay field without mutating definitions', () => {
    const before = JSON.stringify(INTERACTION_OBJECTS);
    const mapped = demoInteractionObjects(INTERACTION_OBJECTS);
    expect(mapped.map(o => o.id)).toEqual(INTERACTION_OBJECTS.map(o => o.id));
    for (const object of mapped) {
      const source = INTERACTION_OBJECTS.find(o => o.id === object.id)!;
      expect(object.type).toBe(source.type);
      expect(object.interactionRange).toBe(source.interactionRange);
      expect(object.feedbackMessage).toBe(source.feedbackMessage);
      expect(object.textureKey).toBe(source.textureKey);
    }
    expect(JSON.stringify(INTERACTION_OBJECTS)).toBe(before);
  });
  it('retains both NPC identities and dialogue data', () => {
    const before = JSON.stringify(NPC_DEFINITIONS);
    const mapped = demoNpcDefinitions(NPC_DEFINITIONS);
    expect(mapped).toHaveLength(2);
    expect(mapped.map(n => n.id)).toEqual(NPC_DEFINITIONS.map(n => n.id));
    mapped.forEach((n, i) => expect(n.displayName).toBe(NPC_DEFINITIONS[i].displayName));
    expect(JSON.stringify(NPC_DEFINITIONS)).toBe(before);
  });
  it('places targets at staggered depths inside the walking band', () => {
    const targets = [...demoInteractionObjects(INTERACTION_OBJECTS), ...demoNpcDefinitions(NPC_DEFINITIONS)];
    targets.forEach(o => { expect(o.y).toBeGreaterThanOrEqual(WALKABLE_Y_MIN); expect(o.y).toBeLessThanOrEqual(WALKABLE_Y_MAX); });
    expect(new Set(targets.map(o => Math.floor(o.y / 80))).size).toBeGreaterThanOrEqual(3);
    expect(demoActorHeight(740)).toBeLessThan(demoActorHeight(970));
    expect(demoActorHeight(-100)).toBe(demoActorHeight(700));
  });
  it('provides routes from spawn to all targets around actual collision footprints', () => {
    const obstacles = DEMO_SCENE.obstacles.map(o => ({left:o.x-o.width/2-16,right:o.x+o.width/2+16,top:o.y-o.height/2,bottom:o.y+o.height/2+48}));
    const targets = [...demoInteractionObjects(INTERACTION_OBJECTS), ...demoNpcDefinitions(NPC_DEFINITIONS)];
    targets.forEach(target => expect(hasRoute(DEMO_SCENE.spawn, [target], obstacles, {left:400,right:1520,top:700,bottom:1040},10), target.id).toBe(true));
  });
  it('ships exactly eight aligned scene layers below weather and labels', () => {
    expect(DEMO_LAYERS).toHaveLength(8);
    for (const layer of DEMO_LAYERS) {
      expect(Object.keys(shippedLayers)).toContain(`/public${layer.path}`);
      expect(layer.depth).toBeLessThan(DEPTH_FX);
    }
    expect(DEMO_LAYERS.find(l=>l.id==='ground')!.depth).toBeLessThan(entityDepth(700));
    expect(DEMO_LAYERS.find(l=>l.id==='fence')!.depth).toBeGreaterThan(entityDepth(1040));
  });
});

