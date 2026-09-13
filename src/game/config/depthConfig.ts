/**
 * 场景深度分层配置 — 2.5D（Y-sort）统一深度带。
 *
 * 实体（玩家/NPC/交互物/植被）不使用固定深度，
 * 而是使用 ENTITY_BASE + y 计算动态深度：
 * y ∈ [WALKABLE_Y_MIN, WALKABLE_Y_MAX]（约 700–1040），
 * 因此实体深度落在约 [800, 1140] 区间，
 * 严格大于 GROUND（20）、严格小于 ENTITY_LABEL（2000），
 * 不同 y 的实体之间按脚底 y 自然排序遮挡。
 */

/** 背景层 — 天空图、暗色遮罩。 */
export const DEPTH_BACKGROUND = 0;

/** 远景层 — 远景厂区/烟囱/塔架剪影（高于天空，低于装饰）。 */
export const DEPTH_FAR = 5;

/** 装饰层 — 中景废墟剪影/远景建筑占位（不含地面上的装饰绿植）。 */
export const DEPTH_DECOR = 10;

/** 地面层 — 地面 tileSprite / 地面矩形，始终在实体脚下。 */
export const DEPTH_GROUND = 20;

/** 障碍层 — 不可见碰撞矩形（仅调试时可见）。 */
export const DEPTH_OBSTACLE = 30;

/** 实体深度基线 — 实体深度 = ENTITY_BASE + 脚底 y。
 * y ∈ [WALKABLE_Y_MIN, WALKABLE_Y_MAX]（约 700–1040），
 * 实体深度落在约 [800, 1140]，严格大于地面(20)、严格小于前景(1200)/标签(2000)。
 */
export const DEPTH_ENTITY_BASE = 100;

/** 前景层 — 镜头附近的草丛/管道/石块遮挡。
 * 深度高于所有实体（约 1140 上限）但低于标签(2000)，保证玩家可被前景遮挡、标签仍可读。
 */
export const DEPTH_FOREGROUND = 1200;

/** 地面接触阴影层 — 位于地面之上、实体之下。 */
export const DEPTH_REFLECTION = 40;
export const DEPTH_CONTACT_SHADOW = 50;
export const DEPTH_TASK_MARKER = 1900;

/** 实体标签层 — NPC / 交互物文字标签，常驻可读不被遮挡。 */
export const DEPTH_ENTITY_LABEL = 2000;

/** 特效层 — 昼夜覆盖、天气覆盖、雨雾粒子。 */
export const DEPTH_FX = 3000;

/** UI 层 — 交互提示、地图名等跟随摄像机的界面元素。 */
export const DEPTH_UI = 5000;

/**
 * 计算实体（玩家/NPC/交互物/植被）的 Y-sort 深度。
 *
 * @param footY 实体脚底的世界 y 坐标
 * @returns 动态深度值（ENTITY_BASE + footY）
 */
export function entityDepth(footY: number): number {
  return DEPTH_ENTITY_BASE + footY;
}

import type { SceneObjectRole } from '@/game/visual/sceneObjectTypes';
export function getSceneDepth(role: SceneObjectRole, baseY: number): number {
  switch (role) {
    case 'far': return DEPTH_FAR;
    case 'mid': return DEPTH_DECOR;
    case 'ground': return DEPTH_GROUND;
    case 'entity': return entityDepth(baseY);
    case 'foregroundCover': return DEPTH_FOREGROUND;
    case 'taskMarker': return DEPTH_TASK_MARKER;
  }
}