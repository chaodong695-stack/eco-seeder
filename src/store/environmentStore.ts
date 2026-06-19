/**
 * 环境状态管理 — Zustand Store。
 *
 * 环境数据的唯一事实来源。
 * React UI 和 Phaser 场景均通过此 Store 访问环境状态。
 * 不允许在 Scene 或组件中分别维护环境状态。
 *
 * DEV-06 第四轮修复：
 * - 持久化到 localStorage，刷新页面后恢复修复进度；
 * - 持久化 appliedTargetIds，防重复应用效果。
 */

import { create } from 'zustand';
import type {
  EnvironmentEffect,
  RestorationVisualStage,
} from '@/game/restoration/restorationTypes';
import { clamp100 } from '@/game/restoration/restorationProgress';

/** 持久化键。 */
const ENVIRONMENT_STORAGE_KEY = 'eco-seeder.environment.v1';

/** 环境状态指标。 */
export interface EnvironmentState {
  /** 污染程度 — 数值越高，污染越严重。 */
  pollution: number;
  /** 植被状况 — 数值越高，植被状况越好。 */
  vegetation: number;
  /** 水质状态 — 数值越高，水环境质量越好。 */
  waterQuality: number;
  /** 修复进度 — 当前区域整体修复进度。 */
  restorationProgress: number;
}

/** 环境初始状态。 */
export const INITIAL_ENVIRONMENT_STATE: EnvironmentState = {
  pollution: 78,
  vegetation: 22,
  waterQuality: 30,
  restorationProgress: 0,
};

/** 持久化数据结构。 */
interface EnvironmentPersistData {
  state: EnvironmentState;
  appliedTargetIds: string[];
}

interface EnvironmentStoreState {
  /** 环境状态指标。 */
  state: EnvironmentState;
  /** 已应用效果的修复目标 ID 集合（防重复）。 */
  appliedTargetIds: Set<string>;
  /** 当前视觉阶段。 */
  visualStage: RestorationVisualStage;
  /** 应用修复目标的环境效果（防重复）。 */
  applyEffect: (targetId: string, effect: EnvironmentEffect) => boolean;
  /** 检查指定修复目标是否已应用效果。 */
  isEffectApplied: (targetId: string) => boolean;
  /** 获取当前视觉阶段。 */
  getVisualStage: () => RestorationVisualStage;
  /** 重置环境状态到初始值。 */
  resetEnvironment: () => void;
}

/**
 * 根据环境状态解析视觉阶段。
 *
 * pollution 高且 restorationProgress 低 → polluted
 * restorationProgress > 0 → recovering
 * 全部指标恢复到高水平 → restored
 */
export function resolveVisualStage(
  state: EnvironmentState,
): RestorationVisualStage {
  if (state.restorationProgress >= 100 && state.pollution < 20) {
    return 'restored';
  }
  if (state.restorationProgress > 0) {
    return 'recovering';
  }
  return 'polluted';
}

/**
 * 持久化环境状态到 localStorage。
 */
function persistEnvironment(
  state: EnvironmentState,
  appliedTargetIds: Set<string>,
): void {
  try {
    const data: EnvironmentPersistData = {
      state,
      appliedTargetIds: Array.from(appliedTargetIds),
    };
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 静默处理
  }
}

/**
 * 从 localStorage 加载环境状态。
 */
function loadEnvironment(): EnvironmentPersistData | null {
  try {
    const raw = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.state?.pollution !== 'number' ||
      typeof parsed?.state?.vegetation !== 'number' ||
      typeof parsed?.state?.waterQuality !== 'number' ||
      typeof parsed?.state?.restorationProgress !== 'number' ||
      !Array.isArray(parsed?.appliedTargetIds)
    ) {
      return null;
    }
    return parsed as EnvironmentPersistData;
  } catch {
    return null;
  }
}

/**
 * 清除 localStorage 中的环境状态。
 */
function clearEnvironment(): void {
  try {
    localStorage.removeItem(ENVIRONMENT_STORAGE_KEY);
  } catch {
    // 静默处理
  }
}

// 初始化时尝试从 localStorage 恢复
function getInitialState(): EnvironmentState {
  const persisted = loadEnvironment();
  if (persisted) return persisted.state;
  return { ...INITIAL_ENVIRONMENT_STATE };
}

function getInitialAppliedTargetIds(): Set<string> {
  const persisted = loadEnvironment();
  if (persisted) return new Set(persisted.appliedTargetIds);
  return new Set<string>();
}

const initialState = getInitialState();
const initialAppliedIds = getInitialAppliedTargetIds();

export const useEnvironmentStore = create<EnvironmentStoreState>((set, get) => ({
  state: initialState,
  appliedTargetIds: initialAppliedIds,
  visualStage: resolveVisualStage(initialState),

  applyEffect: (targetId: string, effect: EnvironmentEffect): boolean => {
    const current = get();
    // 防重复应用
    if (current.appliedTargetIds.has(targetId)) {
      return false;
    }

    const newState: EnvironmentState = {
      pollution: clamp100(current.state.pollution + effect.pollution),
      vegetation: clamp100(current.state.vegetation + effect.vegetation),
      waterQuality: clamp100(current.state.waterQuality + effect.waterQuality),
      restorationProgress: clamp100(
        current.state.restorationProgress + effect.restorationProgress,
      ),
    };

    const newApplied = new Set(current.appliedTargetIds);
    newApplied.add(targetId);

    const newStage = resolveVisualStage(newState);

    set({
      state: newState,
      appliedTargetIds: newApplied,
      visualStage: newStage,
    });

    // 持久化
    persistEnvironment(newState, newApplied);

    return true;
  },

  isEffectApplied: (targetId: string): boolean => {
    return get().appliedTargetIds.has(targetId);
  },

  getVisualStage: (): RestorationVisualStage => {
    return get().visualStage;
  },

  resetEnvironment: (): void => {
    clearEnvironment();
    set({
      state: { ...INITIAL_ENVIRONMENT_STATE },
      appliedTargetIds: new Set<string>(),
      visualStage: 'polluted',
    });
  },
}));
