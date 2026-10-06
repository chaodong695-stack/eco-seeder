interface VisibleNode { setVisible(visible: boolean): unknown }
interface ShadowLike { sync(x: number, baseY: number, alpha?: number): void; destroy(): void }
export interface ScenePresentation { body: VisibleNode; label: VisibleNode; marker: VisibleNode; anchor: () => { x: number; baseY: number }; shadow?: ShadowLike; }
export class SceneObjectRegistry {
  private entries = new Map<string, ScenePresentation>();
  register(id: string, entry: ScenePresentation): void {
    if (this.entries.has(id)) throw new Error(`Duplicate scene object: ${id}`);
    this.entries.set(id, entry);
  }
  present(id: string, visible: boolean, focused: boolean, markerVisible: boolean): void {
    const e = this.entries.get(id); if (!e) return;
    e.body.setVisible(visible); e.label.setVisible(visible && focused); e.marker.setVisible(visible && markerVisible);
    const p = e.anchor(); e.shadow?.sync(p.x, p.baseY, visible ? 0.32 : 0);
  }
  destroy(): void { for (const e of this.entries.values()) e.shadow?.destroy(); this.entries.clear(); }
  get size(): number { return this.entries.size; }
}