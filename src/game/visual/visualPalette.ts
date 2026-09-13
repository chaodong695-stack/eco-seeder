export type ActionKind = 'repair' | 'inspect' | 'patrol' | 'hazard';
export interface PaletteEntry { rgb: number; css: string; }
export const ACTION_PALETTE: Record<ActionKind, PaletteEntry> = {
  repair: { rgb: 0x79c98b, css: '#79c98b' },
  inspect: { rgb: 0x70b7d9, css: '#70b7d9' },
  patrol: { rgb: 0xe7bd62, css: '#e7bd62' },
  hazard: { rgb: 0xd87979, css: '#d87979' },
};
export function highlightStyle(kind: ActionKind, selected: boolean): { color: number; alpha: number } {
  return { color: ACTION_PALETTE[kind].rgb, alpha: selected ? 0.95 : 0.55 };
}
