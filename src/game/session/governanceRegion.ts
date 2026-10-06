import Phaser from 'phaser';
import { gameBridge } from '@/game/bridge/GameBridge';
import { useGovernanceStore } from '@/store/governanceStore';
import type { GovernanceRegion } from '@/domain/governance/governanceDefinitions';

/** 区域呈现由 Phaser 管理，操作面板由 React 管理；返回仍走原场景上下文。 */
export function attachGovernanceRegion(scene: Phaser.Scene, region: GovernanceRegion, sourceId: string | undefined, returnToMain: () => void): void {
  useGovernanceStore.getState().enterRegion(region, sourceId);
  const unsubscribe = gameBridge.on('GOVERNANCE_RETURN_REQUEST', payload => {
    if (payload.region === region) returnToMain();
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    unsubscribe();
    if (useGovernanceStore.getState().activeRegion?.region === region) useGovernanceStore.getState().leaveRegion();
  });
}
