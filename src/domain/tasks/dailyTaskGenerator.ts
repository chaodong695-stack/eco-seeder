/**
 * 每日任务生成器 — 纯函数，确定性生成。
 *
 * 相同种子（玩家 ID + 日期 + 地图 + 任务池版本）生成相同任务列表。
 * 不使用 Math.random()。
 *
 * 生成规则：
 * 1. 过滤掉当日天气时间线中不可能出现的严格天气任务；
 * 2. 至少包含 1 个无天气限制任务；
 * 3. 最多包含 2 个严格天气条件任务；
 * 4. 任务不重复；
 * 5. 天气任务不足时用普通任务补位。
 */

import type {
  DailyTaskDefinition,
  DailyTaskGenerationInput,
  DailyTaskInstance,
} from './dailyTaskTypes';
import {
  DAILY_TASKS_PER_DAY,
  MAX_STRICT_WEATHER_TASKS,
  MIN_UNCONDITIONAL_TASKS,
} from './dailyTaskDefinitions';
import {
  createSeededRandom,
  buildSeed,
  hashSeed,
} from '@/domain/weather/seededRandom';

/**
 * 构建确定性种子字符串。
 *
 * 格式：anonymousPlayerId:localDate:mapId:dailyTaskPoolVersion
 */
export function buildDailyTaskSeed(input: DailyTaskGenerationInput): string {
  return `${input.anonymousPlayerId}:${input.localDate}:${input.mapId}:${input.dailyTaskPoolVersion}`;
}

/**
 * 判断任务是否有天气条件限制。
 */
export function hasWeatherCondition(def: DailyTaskDefinition): boolean {
  return !!def.condition?.supportedWeather && def.condition.supportedWeather.length > 0;
}

/**
 * 判断任务的天气条件在当日时间线中是否可能出现。
 *
 * 无天气限制的任务总是返回 true。
 * 有天气条件的任务检查其 supportedWeather 是否与当日可用天气有交集。
 */
export function isWeatherConditionPossible(
  def: DailyTaskDefinition,
  availableWeatherTypes: string[],
): boolean {
  if (!hasWeatherCondition(def)) return true;
  const supported = def.condition?.supportedWeather ?? [];
  return supported.some((w) => availableWeatherTypes.includes(w));
}

/**
 * 使用确定性种子随机数生成器从候选列表中选取 N 个不重复元素。
 *
 * 使用 Fisher-Yates 洗牌算法的部分变体。
 */
function seededSampleN<T>(
  rng: () => number,
  candidates: readonly T[],
  count: number,
): T[] {
  if (count <= 0 || candidates.length === 0) return [];
  const indices = candidates.map((_, i) => i);
  const result: T[] = [];
  const take = Math.min(count, indices.length);

  for (let i = 0; i < take; i++) {
    const remaining = indices.length - i;
    const j = i + Math.floor(rng() * remaining);
    [indices[i], indices[j]] = [indices[j], indices[i]];
    result.push(candidates[indices[i]]);
  }

  return result;
}

/**
 * 生成每日任务实例列表。
 *
 * 纯函数：相同输入始终生成相同输出。
 */
export function generateDailyTasks(
  input: DailyTaskGenerationInput,
  definitions: readonly DailyTaskDefinition[],
): DailyTaskInstance[] {
  const seedStr = buildDailyTaskSeed(input);
  const seedNum = buildSeed(
    input.anonymousPlayerId,
    input.localDate,
    input.mapId,
    input.dailyTaskPoolVersion,
  );
  const rng = createSeededRandom(seedNum);

  // 过滤出当日可用的任务定义
  const available = definitions.filter((def) =>
    isWeatherConditionPossible(def, input.availableWeatherTypes),
  );

  // 分离无天气限制任务和严格天气条件任务
  const unconditional = available.filter((def) => !hasWeatherCondition(def));
  const weatherConditioned = available.filter((def) => hasWeatherCondition(def));

  // 选中的任务定义
  const selected: DailyTaskDefinition[] = [];

  // 1. 先选最多 MAX_STRICT_WEATHER_TASKS 个严格天气条件任务
  const weatherPicked = seededSampleN(rng, weatherConditioned, MAX_STRICT_WEATHER_TASKS);
  selected.push(...weatherPicked);

  // 2. 至少选 MIN_UNCONDITIONAL_TASKS 个无天气限制任务
  const minUnconditional = seededSampleN(rng, unconditional, MIN_UNCONDITIONAL_TASKS);
  selected.push(...minUnconditional);

  // 3. 如果还没满，从剩余可用任务中补位（优先无天气限制的）
  const selectedIds = new Set(selected.map((t) => t.id));
  const remainingUnconditional = unconditional.filter((t) => !selectedIds.has(t.id));
  const remainingWeather = weatherConditioned.filter((t) => !selectedIds.has(t.id));
  const remaining = [...remainingUnconditional, ...remainingWeather];

  const slotsLeft = DAILY_TASKS_PER_DAY - selected.length;
  if (slotsLeft > 0) {
    const extra = seededSampleN(rng, remaining, slotsLeft);
    selected.push(...extra);
  }

  // 4. 如果仍未满（候选不足），用已有的无条件任务补位（允许重复选择不同定义）
  // 理论上 6 个定义总能选出 3 个，但防御性处理
  while (selected.length < DAILY_TASKS_PER_DAY && unconditional.length > 0) {
    const notSelected = unconditional.filter((t) => !selectedIds.has(t.id));
    if (notSelected.length === 0) break;
    const pick = seededSampleN(rng, notSelected, 1);
    if (pick.length === 0) break;
    selected.push(pick[0]);
    selectedIds.add(pick[0].id);
  }

  // 确保不超过目标数量
  const finalSelected = selected.slice(0, DAILY_TASKS_PER_DAY);

  // 生成实例
  return finalSelected.map((def) => {
    const instanceId = `${def.id}:${hashSeed(seedStr + ':' + def.id)}`;
    return {
      instanceId,
      taskId: def.id,
      localDate: input.localDate,
      mapId: input.mapId,
      status: 'available' as const,
      progress: 0,
      targetValue: def.targetValue,
      rewardClaimed: false,
    };
  });
}
