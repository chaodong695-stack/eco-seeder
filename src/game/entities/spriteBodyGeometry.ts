/** Arcade body sizes/offsets use unscaled texture units, not display pixels. */
export function spriteBodyGeometry(textureWidth: number, textureHeight: number, scale: number, worldWidth: number, worldHeight: number) {
  const width = worldWidth / scale;
  const height = worldHeight / scale;
  return { width, height, offsetX: (textureWidth - width) / 2, offsetY: textureHeight - height };
}
