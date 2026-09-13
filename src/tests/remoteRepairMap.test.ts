import { describe, expect, it, afterEach } from 'vitest';
import { INTERACTION_OBJECTS } from '@/game/interaction/interactionObjects';
import { createRepairMapContext, clearRepairMapContext, getRepairMapContext, REMOTE_REPAIR_SCENE_KEY } from '@/game/session/repairMapTransition';
import { remoteInteractionVisual, isRemoteDamagedEnvironment } from '@/game/visual/remoteInteractionPolicy';

afterEach(() => clearRepairMapContext());

describe('remote repair map flow', () => {
  it('uses far visuals while keeping original interaction coordinates', () => {
    const config = INTERACTION_OBJECTS.find((item) => item.id === 'interaction.damaged_env_01')!;
    const visual = remoteInteractionVisual(config);
    expect(visual.role).toBe('far');
    expect(visual.scale).toBeLessThan(1);
    expect(visual.alpha).toBeGreaterThan(0);
    expect(isRemoteDamagedEnvironment(config.id)).toBe(true);
  });
  it('creates and clears a repair context for a valid object', () => {
    const context = createRepairMapContext('urban-wasteland', 'interaction.damaged_env_01', { x: 10, y: 20 });
    expect(context).toMatchObject({ sourceSceneKey: 'urban-wasteland', objectId: 'interaction.damaged_env_01', returnPosition: { x: 10, y: 20 } });
    expect(REMOTE_REPAIR_SCENE_KEY).toBe('environment-repair');
    clearRepairMapContext();
    expect(getRepairMapContext()).toBeNull();
  });
  it('rejects invalid source and return coordinates', () => {
    expect(() => createRepairMapContext('', 'interaction.damaged_env_01', { x: 0, y: 0 })).toThrow();
    expect(() => createRepairMapContext('urban-wasteland', 'interaction.damaged_env_01', { x: Number.NaN, y: 0 })).toThrow();
  });
  it('rejects non-repairable interaction ids', () => {
    expect(() => createRepairMapContext('urban-wasteland', 'interaction.pollution_zone_01', { x: 0, y: 0 })).toThrow();
  });
});
