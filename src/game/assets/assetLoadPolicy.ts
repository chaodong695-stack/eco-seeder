export const ASSET_GROUPS = { critical: ['industrial-wasteland-bg', 'wasteland-ground', 'repairer-male-side', 'repairer-female-side'], route: ['cracked-ground-tile', 'drainage-facility-damaged'], optional: ['wasteland-far-city', 'wasteland-mid-buildings', 'ruin-plant-cluster', 'industrial-ruins-strip'], effects: ['rain_particle'] } as const;
export type AssetGroup = keyof typeof ASSET_GROUPS;
export function shouldLoad(group: AssetGroup, viewportWidth: number): boolean { return group === 'critical' || group === 'route' || group === 'effects' || viewportWidth >= 900; }
