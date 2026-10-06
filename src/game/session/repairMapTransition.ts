export const REMOTE_DAMAGED_ENV_IDS = ['interaction.damaged_env_01', 'interaction.damaged_env_02'] as const;
export type RemoteDamagedEnvironmentId = (typeof REMOTE_DAMAGED_ENV_IDS)[number];

export const REMOTE_REPAIR_SCENE_KEY = 'environment-repair';
export interface RepairMapContext { sourceSceneKey: string; objectId: RemoteDamagedEnvironmentId; returnPosition: { x: number; y: number }; }
let activeContext: RepairMapContext | null = null;
export function isRepairableEnvironmentId(id: string): id is RemoteDamagedEnvironmentId { return (REMOTE_DAMAGED_ENV_IDS as readonly string[]).includes(id); }
export function createRepairMapContext(sourceSceneKey: string, objectId: string, returnPosition: { x: number; y: number }): RepairMapContext {
  if (!sourceSceneKey.trim()) throw new Error('Repair map source scene key is required');
  if (!isRepairableEnvironmentId(objectId)) throw new Error(`Unsupported repair map object: ${objectId}`);
  if (!Number.isFinite(returnPosition.x) || !Number.isFinite(returnPosition.y)) {
    throw new Error('Repair map return position must be finite');
  }
  activeContext = { sourceSceneKey, objectId, returnPosition: { x: returnPosition.x, y: returnPosition.y } };
  return activeContext;
}
export function getRepairMapContext(): RepairMapContext | null { return activeContext; }
export function clearRepairMapContext(): void { activeContext = null; }
