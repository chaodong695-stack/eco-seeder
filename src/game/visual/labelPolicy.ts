export interface FocusCandidate {
  id: string;
  distance: number;
  range: number;
  eligible: boolean;
  priority: number;
}
export function resolveFocus(candidates: readonly FocusCandidate[], previousId: string | null): { id: string | null; canInteract: boolean } {
  const active = candidates.filter((c) => c.eligible && c.distance <= c.range).sort((a, b) => a.distance - b.distance || b.priority - a.priority || a.id.localeCompare(b.id));
  const best = active[0];
  const previousActive = active.find((c) => c.id === previousId);
  const focused = previousActive && best && previousActive.distance <= best.distance + 8 ? previousActive : best;
  if (focused) return { id: focused.id, canInteract: true };
  const leaving = candidates.find((c) => c.eligible && c.id === previousId && c.distance <= c.range + 16);
  return { id: leaving?.id ?? null, canInteract: false };
}

export function shouldShowWorldLabel(id: string, focusId: string | null, worldVisible: boolean, dialogOpen: boolean): boolean {
  return worldVisible && !dialogOpen && id === focusId;
}
