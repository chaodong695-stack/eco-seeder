/**
 * 天气时间线生成器 — 确定性、可复现。
 *
 * 为每个本地游戏日生成一条确定性天气时间线。
 * 相同种子必须生成完全相同结果。
 */

import type { WeatherType } from './weatherTypes';
import type { WeatherProfile } from '@/content/weather/urbanWastelandWeatherProfile';
import { createSeededRandom, seededWeightedPick, seededIntInRange, buildSeed } from './seededRandom';

/** 天气时间线条目。 */
export interface WeatherTimelineEntry {
  id: string;
  startMinute: number;
  endMinute: number;
  weather: WeatherType;
  intensity: number;
}

/** 天气时间线。 */
export interface WeatherTimeline {
  date: string;
  mapId: string;
  seed: string;
  entries: WeatherTimelineEntry[];
}

/** 天气生成输入参数。 */
export interface WeatherGenerationInput {
  anonymousPlayerId: string;
  localDate: string;
  mapId: string;
  versionId: string;
}

/** 一天的总分钟数。 */
const MINUTES_PER_DAY = 1440;

/** 最少时间段数。 */
const MIN_SEGMENTS = 4;

/** 最多时间段数。 */
const MAX_SEGMENTS = 8;

/** 每段最少持续分钟数。 */
const MIN_SEGMENT_DURATION = 90;

/**
 * 构建种子字符串。
 */
export function buildWeatherSeed(input: WeatherGenerationInput): string {
  return `${input.anonymousPlayerId}:${input.localDate}:${input.mapId}:${input.versionId}`;
}

/**
 * 生成天气时间线。
 *
 * 使用确定性种子随机数生成器，相同种子生成相同结果。
 * 时间线覆盖完整 0–1439 分钟，不重叠、不遗漏。
 * 每日至少包含 4 个时间段。
 */
export function generateWeatherTimeline(
  input: WeatherGenerationInput,
  profile: WeatherProfile,
): WeatherTimeline {
  const seedStr = buildWeatherSeed(input);
  const seedNum = buildSeed(input.anonymousPlayerId, input.localDate, input.mapId, input.versionId);
  const rng = createSeededRandom(seedNum);

  // 生成分段边界点
  const segmentCount = seededIntInRange(rng, MIN_SEGMENTS, MAX_SEGMENTS);
  const boundaries = generateBoundaries(rng, segmentCount);

  // 为每个分段选择天气
  const entries: WeatherTimelineEntry[] = [];
  let previousWeather: WeatherType | null = null;

  for (let i = 0; i < boundaries.length; i++) {
    const startMinute = i === 0 ? 0 : boundaries[i - 1];
    const endMinute = boundaries[i] - 1;

    // 选择天气 — 使用转移权重或基础权重
    const weather = selectWeather(rng, profile, previousWeather);
    const intensity = generateIntensity(rng, weather);

    entries.push({
      id: `${input.mapId}:${input.localDate}:${i}`,
      startMinute,
      endMinute,
      weather,
      intensity,
    });

    previousWeather = weather;
  }

  return {
    date: input.localDate,
    mapId: input.mapId,
    seed: seedStr,
    entries,
  };
}

/**
 * 生成时间段边界点。
 *
 * 确保每个段至少 MIN_SEGMENT_DURATION 分钟，
 * 最后一个边界始终为 1440。
 */
function generateBoundaries(rng: () => number, segmentCount: number): number[] {
  const boundaries: number[] = [];
  let remaining = MINUTES_PER_DAY;
  const minSegment = MIN_SEGMENT_DURATION;

  for (let i = 0; i < segmentCount - 1; i++) {
    const segmentsLeft = segmentCount - i;
    const maxForThis = remaining - minSegment * (segmentsLeft - 1);
    const minForThis = minSegment;
    const duration = seededIntInRange(rng, minForThis, Math.max(minForThis + 1, maxForThis));
    const boundary = MINUTES_PER_DAY - remaining + duration;
    boundaries.push(boundary);
    remaining -= duration;
  }

  // 最后一段到 1440
  boundaries.push(MINUTES_PER_DAY);
  return boundaries;
}

/**
 * 选择天气 — 使用转移权重或基础权重。
 */
function selectWeather(
  rng: () => number,
  profile: WeatherProfile,
  previousWeather: WeatherType | null,
): WeatherType {
  if (previousWeather && profile.transitionWeights[previousWeather]) {
    const transitions = profile.transitionWeights[previousWeather]!;
    // 只保留支持的天气的权重
    const filteredWeights: Partial<Record<WeatherType, number>> = {};
    for (const weather of profile.supportedWeather) {
      if (weather in transitions) {
        filteredWeights[weather] = transitions[weather];
      }
    }
    const hasValidTransitions = Object.values(filteredWeights).some((w) => w! > 0);
    if (hasValidTransitions) {
      return seededWeightedPick(rng, filteredWeights as Record<WeatherType, number>);
    }
  }

  // 使用基础权重
  return seededWeightedPick(rng, profile.baseWeights);
}

/**
 * 生成天气强度（在定义基础上添加随机变化）。
 */
function generateIntensity(rng: () => number, weather: WeatherType): number {
  const baseIntensity: Record<WeatherType, number> = {
    clear: 0.2,
    overcast: 0.5,
    light_rain: 0.6,
    heavy_rain: 0.9,
    fog: 0.7,
  };
  const base = baseIntensity[weather];
  const variation = rng() * 0.2 - 0.1; // ±0.1
  return Math.round((Math.max(0, Math.min(1, base + variation))) * 100) / 100;
}

/**
 * 验证天气时间线完整性。
 */
export function validateTimeline(timeline: WeatherTimeline): void {
  if (timeline.entries.length < MIN_SEGMENTS) {
    throw new Error(
      `天气时间线错误: 至少需要 ${MIN_SEGMENTS} 个时间段，当前 ${timeline.entries.length} 个`,
    );
  }

  let expectedStart = 0;
  for (let i = 0; i < timeline.entries.length; i++) {
    const entry = timeline.entries[i];

    if (entry.startMinute !== expectedStart) {
      throw new Error(
        `天气时间线错误: 第 ${i} 段起始时间应为 ${expectedStart}，实际为 ${entry.startMinute}`,
      );
    }

    if (entry.endMinute < entry.startMinute) {
      throw new Error(
        `天气时间线错误: 第 ${i} 段结束时间 ${entry.endMinute} 小于起始时间 ${entry.startMinute}`,
      );
    }

    // 检查与前一段是否连续（前一段 endMinute + 1 = 当前 startMinute）
    if (i > 0) {
      const prev = timeline.entries[i - 1];
      if (entry.startMinute !== prev.endMinute + 1) {
        throw new Error(
          `天气时间线错误: 第 ${i} 段与第 ${i - 1} 段不连续`,
        );
      }
    }

    expectedStart = entry.endMinute + 1;
  }

  const lastEntry = timeline.entries[timeline.entries.length - 1];
  if (lastEntry.endMinute !== MINUTES_PER_DAY - 1) {
    throw new Error(
      `天气时间线错误: 最后一段结束时间应为 ${MINUTES_PER_DAY - 1}，实际为 ${lastEntry.endMinute}`,
    );
  }
}
