export interface RoutePoint { x: number; y: number }
export interface Box { left: number; right: number; top: number; bottom: number }
export function isFreeFootPoint(p: RoutePoint, obstacles: readonly Box[], halfWidth: number, halfHeight: number): boolean {
  return obstacles.every((b) => p.x < b.left - halfWidth || p.x > b.right + halfWidth || p.y < b.top - halfHeight || p.y > b.bottom + halfHeight);
}
export function hasRoute(start: RoutePoint, targets: readonly RoutePoint[], obstacles: readonly Box[], bounds: Box, grid = 8): boolean {
  const key = (p: RoutePoint) => `${p.x},${p.y}`;
  const snap = (v: number) => Math.round(v / grid) * grid;
  const queue = [{ x: snap(start.x), y: snap(start.y) }]; const seen = new Set([key(queue[0])]);
  const target = (p: RoutePoint) => targets.some((t) => Math.hypot(t.x - p.x, t.y - p.y) <= grid * 2);
  while (queue.length) { const p = queue.shift()!; if (target(p)) return true;
    for (const [dx, dy] of [[grid,0],[-grid,0],[0,grid],[0,-grid]] as const) { const n={x:p.x+dx,y:p.y+dy}; const k=key(n); if (n.x<bounds.left||n.x>bounds.right||n.y<bounds.top||n.y>bounds.bottom||seen.has(k)||!isFreeFootPoint(n,obstacles,16,8)) continue; seen.add(k); queue.push(n); }
  } return targets.length === 0;
}
