/**
 * 每日任务持久化 — localStorage 读写与 Zod 校验。
 *
 * localStorage 只是持久化介质，不是运行时事实来源。
 * 领域逻辑与 localStorage 分离。
 */

import { z } from 'zod';
import type { DailyTaskInstance } from './dailyTaskTypes';

/** 持久化键。 */
export const DAILY_TASKS_STORAGE_KEY = 'eco-seeder.daily-tasks.v1';

/** 持久化数据结构。 */
export interface DailyTaskPersistData {
  date: string;
  mapId: string;
  poolVersion: string;
  tasks: DailyTaskInstance[];
}

/** Zod schema — 校验持久化数据。 */
const DailyTaskStatusSchema = z.enum([
  'available',
  'active',
  'waiting_condition',
  'completed',
]);

const DailyTaskInstanceSchema = z.object({
  instanceId: z.string(),
  taskId: z.string(),
  localDate: z.string(),
  mapId: z.string(),
  status: DailyTaskStatusSchema,
  progress: z.number().nonnegative(),
  targetValue: z.number().positive(),
  rewardClaimed: z.boolean(),
});

const DailyTaskPersistDataSchema = z.object({
  date: z.string(),
  mapId: z.string(),
  poolVersion: z.string(),
  tasks: z.array(DailyTaskInstanceSchema),
});

/**
 * 保存每日任务到 localStorage。
 */
export function saveDailyTasks(data: DailyTaskPersistData): void {
  try {
    localStorage.setItem(DAILY_TASKS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 写入失败静默处理 — 运行时内存仍是事实来源
  }
}

/**
 * 从 localStorage 加载每日任务。
 *
 * 数据损坏或版本不匹配时返回 null（安全回退）。
 */
export function loadDailyTasks(): DailyTaskPersistData | null {
  try {
    const raw = localStorage.getItem(DAILY_TASKS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const result = DailyTaskPersistDataSchema.safeParse(parsed);

    if (!result.success) return null;

    return result.data;
  } catch {
    return null;
  }
}

/**
 * 清除 localStorage 中的每日任务数据。
 */
export function clearDailyTasks(): void {
  try {
    localStorage.removeItem(DAILY_TASKS_STORAGE_KEY);
  } catch {
    // 静默处理
  }
}

/**
 * 判断持久化数据是否与当前日期和地图匹配。
 */
export function isPersistDataValid(
  data: DailyTaskPersistData | null,
  localDate: string,
  mapId: string,
  poolVersion: string,
): data is DailyTaskPersistData {
  if (!data) return false;
  return (
    data.date === localDate &&
    data.mapId === mapId &&
    data.poolVersion === poolVersion
  );
}
