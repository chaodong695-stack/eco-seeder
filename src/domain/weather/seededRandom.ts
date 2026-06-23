/**
 * 确定性种子随机数生成器 — 纯函数。
 *
 * 使用 mulberry32 算法，相同种子生成相同序列。
 * 不使用 Math.random()。
 */

/**
 * 将字符串哈希为 32 位无符号整数种子。
 * 使用与 Java String.hashCode 类似的算法。
 */
export function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0xffffffff;
  }
  // 转为无符号
  return hash >>> 0;
}

/**
 * Mulberry32 伪随机数生成器。
 *
 * 返回一个函数，每次调用返回 [0, 1) 范围的浮点数。
 * 相同种子生成相同序列。
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 从多个字符串组成部分生成种子。
 */
export function buildSeed(...parts: string[]): number {
  return hashSeed(parts.join(':'));
}

/**
 * 使用种子随机数生成器从数组中选取元素。
 */
export function seededPick<T>(rng: () => number, array: readonly T[]): T {
  const index = Math.floor(rng() * array.length);
  return array[index];
}

/**
 * 使用种子随机数生成器生成 [min, max] 范围内的整数。
 */
export function seededIntInRange(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * 使用种子随机数生成器从权重映射中选取。
 */
export function seededWeightedPick<T extends string>(
  rng: () => number,
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[0][0];
}
