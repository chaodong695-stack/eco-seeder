import type { AssetMetrics } from './sceneObjectTypes';
export function anchoredImagePose(x: number, baseY: number, visibleHeight: number, m: AssetMetrics) {
  const contentHeight = m.contentBottom - m.contentTop;
  if (!Number.isFinite(visibleHeight) || visibleHeight <= 0 || contentHeight <= 0) throw new Error('Invalid visible asset height');
  const scale = visibleHeight / contentHeight;
  return { scale, x: x + (m.frameWidth / 2 - m.contactX) * scale, y: baseY + (m.frameHeight - m.contactY) * scale, labelY: baseY + (m.contentTop - m.contactY) * scale - 8 };
}
