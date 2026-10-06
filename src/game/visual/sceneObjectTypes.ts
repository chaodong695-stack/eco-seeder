export type SceneObjectRole = 'far' | 'mid' | 'ground' | 'entity' | 'foregroundCover' | 'taskMarker';
export interface SceneObjectConfig {
  id: string; role: SceneObjectRole; x: number; baseY: number; visibleHeight: number;
  assetId?: string; footprint?: { width: number; height: number; blocking: boolean };
  shadow?: { width: number; height: number }; labelMode: 'none' | 'proximity';
}
export interface AssetMetrics { frameWidth: number; frameHeight: number; contentTop: number; contentBottom: number; contactX: number; contactY: number; }
export function interactionPosition(object: SceneObjectConfig): { x: number; y: number } { return { x: object.x, y: object.baseY }; }
