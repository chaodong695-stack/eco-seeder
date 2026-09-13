import type { InteractionObjectConfig } from '@/game/interaction/interactionTypes';
import { REMOTE_DAMAGED_ENV_IDS, REMOTE_REPAIR_SCENE_KEY } from '@/game/session/repairMapTransition';
import type { RemoteDamagedEnvironmentId } from '@/game/session/repairMapTransition';
export { REMOTE_DAMAGED_ENV_IDS };
export type { RemoteDamagedEnvironmentId };
export interface RemoteInteractionVisual { role: 'far'; scale: number; alpha: number; width: number; height: number; depth: number; scrollFactor: number; repairSceneKey: string; }
export function isRemoteDamagedEnvironment(id: string): id is RemoteDamagedEnvironmentId { return (REMOTE_DAMAGED_ENV_IDS as readonly string[]).includes(id); }
export function remoteInteractionVisual(config: InteractionObjectConfig): RemoteInteractionVisual {
  if (!isRemoteDamagedEnvironment(config.id)) throw new Error(`Unsupported remote interaction: ${config.id}`);
  return { role: 'far', scale: 0.62, alpha: 0.8, width: Math.max(28, config.width * 0.62), height: Math.max(24, config.height * 0.62), depth: 5, scrollFactor: 0.72, repairSceneKey: REMOTE_REPAIR_SCENE_KEY };
}
