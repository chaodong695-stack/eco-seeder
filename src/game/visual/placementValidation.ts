import type { SceneObjectConfig } from './sceneObjectTypes';
export function validatePlacement(objects: readonly SceneObjectConfig[]): void {
  const ids = new Set<string>();
  for (const o of objects) {
    if (ids.has(o.id)) throw new Error(`Duplicate placement: ${o.id}`);
    ids.add(o.id);
    if (![o.x, o.baseY, o.visibleHeight].every(Number.isFinite) || o.visibleHeight <= 0) throw new Error(`Invalid placement: ${o.id}`);
    if (o.role === 'entity' && (o.baseY < 700 || o.baseY > 1040)) throw new Error(`Entity outside walkable band: ${o.id}`);
  }
}
