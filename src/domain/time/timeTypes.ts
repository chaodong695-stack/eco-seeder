/**
 * 世界时间类型定义。
 *
 * 依据 DEV-05 需求建立时间数据模型。
 * 所有时间解析使用纯函数，不在 UI 组件和 Scene 中重复计算。
 */

/** 昼夜阶段。 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** 时间模式。 */
export type TimeMode = 'realtime' | 'demo';

/** 演示时间预设。 */
export type DemoTimePreset = DayPhase;

/** 世界时间快照。 */
export interface WorldTimeSnapshot {
  mode: TimeMode;
  /** 本地日期，格式 YYYY-MM-DD。 */
  localDate: string;
  /** 当天分钟数 0–1439。 */
  localMinutes: number;
  /** 时区偏移分钟数。 */
  timezoneOffsetMinutes: number;
  /** 当前昼夜阶段。 */
  phase: DayPhase;
  /** 演示模式预设值（现实模式下为 null）。 */
  demoPreset: DemoTimePreset | null;
}

/** 昼夜阶段边界配置。 */
export interface DayPhaseBoundaries {
  dawnStart: number;
  dayStart: number;
  duskStart: number;
  nightStart: number;
}

/** 默认昼夜阶段边界（分钟数）。 */
export const DEFAULT_DAY_PHASE_BOUNDARIES: DayPhaseBoundaries = {
  dawnStart: 5 * 60, // 05:00
  dayStart: 8 * 60, // 08:00
  duskStart: 17 * 60, // 17:00
  nightStart: 20 * 60, // 20:00
};

/** 演示预设对应的代表分钟数。 */
export const DEMO_PRESET_MINUTES: Record<DemoTimePreset, number> = {
  dawn: 6 * 60, // 06:00
  day: 12 * 60, // 12:00
  dusk: 18 * 60, // 18:00
  night: 22 * 60, // 22:00
};

/** 昼夜阶段中文显示名。 */
export const DAY_PHASE_DISPLAY_NAMES: Record<DayPhase, string> = {
  dawn: '清晨',
  day: '白天',
  dusk: '黄昏',
  night: '夜晚',
};

/** 时间模式中文显示名。 */
export const TIME_MODE_DISPLAY_NAMES: Record<TimeMode, string> = {
  realtime: '现实时间',
  demo: '演示时间',
};
