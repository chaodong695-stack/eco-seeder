export function shouldShowWorldLabel(id: string, focusId: string | null, worldVisible: boolean, dialogOpen: boolean): boolean {
  return worldVisible && !dialogOpen && id === focusId;
}
