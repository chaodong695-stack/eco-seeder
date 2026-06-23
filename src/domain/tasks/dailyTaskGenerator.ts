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
 * 格式：anonymousPlayerId:selectedCharacterId:localDate:mapId:dailyTaskPoolVersion
 */
export function buildDailyTaskSeed(input: DailyTaskGenerationInput): string {
  return `${input.anonymousPlayerId}:${input.selectedCharacterId}:${input.localDate}:${input.mapId}:${input.dailyTaskPoolVersion}`;
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
 * 使用确定性种子随机数生成器从候选列表中无放回抽样 N 个不重复元素。
 *
 * 使用 Fisher-Yates 洗牌算法的部分变体。
 * 抽样后的元素从候选池中移除（无放回），确保同一元素不会被多次选中。
 *
 * @param rng 确定性随机数生成器
 * @param pool 候选池（会被修改 — 移除已选元素）
 * @param count 选取数量
 * @returns 选中的元素列表
 */
function sampleWithoutReplacement<T>(
  rng: () => number,
  pool: T[],
  count: number,
): T[] {
  if (count <= 0 || pool.length === 0) return [];
  const result: T[] = [];
  const take = Math.min(count, pool.length);

  for (let i = 0; i < take; i++) {
    // 从 pool 前部 [i, pool.length) 范围内随机选取
    const remaining = pool.length - i;
    const j = i + Math.floor(rng() * remaining);
    // 交换到前部
    [pool[i], pool[j]] = [pool[j], pool[i]];
    result.push(pool[i]);
  }

  // 从 pool 中移除已选元素（前 take 个）
  pool.splice(0, take);

  return result;
}

/**
 * 验证生成的任务实例列表中 taskId 和 instanceId 均唯一。
 *
 * 如果发现重复，抛出错误（防御性检查，正常逻辑不应触发）。
 */
export function validateTaskUniqueness(tasks: DailyTaskInstance[]): void {
  const taskIds = new Set<string>();
  const instanceIds = new Set<string>();

  for (const task of tasks) {
    if (taskIds.has(task.taskId)) {
      throw new Error(`Duplicate taskId detected: ${task.taskId}`);
    }
    if (instanceIds.has(task.instanceId)) {
      throw new Error(`Duplicate instanceId detected: ${task.instanceId}`);
    }
    taskIds.add(task.taskId);
    instanceIds.add(task.instanceId);
  }
}

/**
 * 生成每日任务实例列表。
 *
 * 纯函数：相同输入始终生成相同输出。
 * 使用无放回抽样确保任务不重复。
 * 生成后校验 taskId 和 instanceId 唯一性。
 *
 * 不变量保证：
 * - tasks.length === 3（候选不足时从全部定义安全补位）
 * - taskId 和 instanceId 均唯一
 * - 至少 1 个无天气条件任务
 * - 最多 2 个严格天气条件任务
 */
export function generateDailyTasks(
  input: DailyTaskGenerationInput,
  definitions: readonly DailyTaskDefinition[],
): DailyTaskInstance[] {
  const seedStr = buildDailyTaskSeed(input);
  const seedNum = buildSeed(
    input.anonymousPlayerId,
    input.selectedCharacterId,
    input.localDate,
    input.mapId,
    input.dailyTaskPoolVersion,
  );
  const rng = createSeededRandom(seedNum);

  // ── 步骤 1: 构建当天符合条件的候选池 ──
  const available = definitions.filter((def) =>
    isWeatherConditionPossible(def, input.availableWeatherTypes),
  );

  // 分离无天气限制任务和严格天气条件任务
  const unconditionalPool = available.filter((def) => !hasWeatherCondition(def));
  const weatherPool = available.filter((def) => hasWeatherCondition(def));

  // 选中的任务定义
  const selected: DailyTaskDefinition[] = [];
  const selectedIdSet = new Set<string>();

  // ── 步骤 2: 按确定性随机顺序无放回抽取 ──
  // 2a. 先选最多 MAX_STRICT_WEATHER_TASKS 个严格天气条件任务
  const weatherPicked = sampleWithoutReplacement(rng, weatherPool, MAX_STRICT_WEATHER_TASKS);
  for (const def of weatherPicked) {
    selected.push(def);
    selectedIdSet.add(def.id);
  }

  // 2b. 至少选 MIN_UNCONDITIONAL_TASKS 个无天气限制任务
  const minUnconditional = sampleWithoutReplacement(rng, unconditionalPool, MIN_UNCONDITIONAL_TASKS);
  for (const def of minUnconditional) {
    selected.push(def);
    selectedIdSet.add(def.id);
  }

  // ── 步骤 3: 检测重复并从候选池补位 ──
  // 从剩余的可用任务中补位（无天气限制 + 天气条件均可）
  const fillPool = [...unconditionalPool, ...weatherPool].filter(
    (def) => !selectedIdSet.has(def.id),
  );

  let slotsLeft = DAILY_TASKS_PER_DAY - selected.length;
  if (slotsLeft > 0 && fillPool.length > 0) {
    const extra = sampleWithoutReplacement(rng, fillPool, slotsLeft);
    for (const def of extra) {
      selected.push(def);
      selectedIdSet.add(def.id);
    }
  }

  // ── 步骤 4: 如果结果仍不足 3 个，从未选中的安全任务池继续补位 ──
  // 安全任务池 = 全部定义中尚未选中的任务（忽略天气过滤）
  // 这确保即使天气时间线为空或候选不足，仍能生成 3 个任务
  if (selected.length < DAILY_TASKS_PER_DAY) {
    const safePool = definitions.filter((def) => !selectedIdSet.has(def.id));
    slotsLeft = DAILY_TASKS_PER_DAY - selected.length;
    const safe = sampleWithoutReplacement(rng, safePool, slotsLeft);
    for (const def of safe) {
      selected.push(def);
      selectedIdSet.add(def.id);
    }
  }

  // ── 步骤 5: 最终不足 3 个时明确失败，不得静默返回 1 个或 2 个任务 ──
  if (selected.length < DAILY_TASKS_PER_DAY) {
    throw new Error(
      `Failed to generate ${DAILY_TASKS_PER_DAY} daily tasks: only ${selected.length} candidates available`,
    );
  }

  // 确保不超过目标数量
  const finalSelected = selected.slice(0, DAILY_TASKS_PER_DAY);

  // 生成实例 — instanceId 由种子和 taskId 确定性生成，保证稳定且唯一
  const instances = finalSelected.map((def) => {
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

  // 校验 taskId 和 instanceId 唯一性
  validateTaskUniqueness(instances);

  return instances;
}
