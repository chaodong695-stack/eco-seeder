# 雾港旧工业区：视觉、空间、交互与性能改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 如用户另行授权并行实施，可选择 superpowers:subagent-driven-development；本文不代表已授权启动子代理。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal / 修改目标：** 修复场景中悬浮感、前景过重、任务文字拥挤与空间规则不一致的问题；在不改变任务判定、天气时间线和存档语义的前提下，建立可验证的对象落地、遮挡和交互呈现规则，再按性能预算增加氛围效果。

**Architecture / 架构：** 保留 React + Phaser 分工、现有 GameBridge 事件、任务 Store 和现有 Y-sort。新增薄层空间配置和纯函数，以地面接触点 `baseX/baseY` 为唯一空间来源，派生图片位置、脚部碰撞、阴影、标签和排序。场景负责装配，空间、标签与天气模块各自拥有明确的创建、更新、销毁生命周期。

**Tech Stack / 技术栈：** TypeScript、Phaser 3、React 18、Zustand、Vitest、CSS Modules、Vite；浏览器截图和性能录制用于视觉验收。具体 API 以项目安装的 `node_modules/phaser` 为准。

**日期：** 2026-09-12  
**状态：** 待实施、待视觉评审；本文代码是拟议修改示例，不是已经合入或通过测试的补丁。  
**范围：** 用户提出的 4 阶段、24 项；本次只写文档，不修改运行代码或图片。

---

## 0. 检查结论、证据与需要纠正的前提

### 0.1 当前事实

| 代码位置 | 检查结果 | 对计划的影响 |
|---|---|---|
| `src/game/scenes/UrbanWastelandScene.ts`：`create()` | 已有 sky/far/mid/ground/foreground 容器；玩法对象挂场景根 | 保留分层结构，不新建第二套场景引擎 |
| `src/game/config/depthConfig.ts` | 已有 `entityDepth(footY) = 100 + footY` | 第 10 项是补齐规则和测试，而非从零实现 Y-sort |
| `src/game/entities/Player.ts`、`InteractionZone.ts`、场景 NPC 创建 | 图片多数已使用 `setOrigin(0.5, 1)`；部分 Rectangle 回退仍是中心原点 | 底部原点不等于可见脚底；需要透明边距和回退路径校准 |
| 场景 `createDecorPlants()` | 多处装饰使用固定 `scale: 0.26–0.35`，包括 `(1000,745)` | 大石块/植物簇的悬浮感不能未经隔离就归因于前景 PNG |
| `InteractionZone.ts`、`Player.ts`、`createNpcs()` | 标签创建后常驻显示 | 第 4、14、15 项属于明确的呈现缺口 |
| 场景 `updateWeatherGatedObjects()` | 隐藏 weather-gated 对象时只改主 GameObject，没有同步处理标签 | 会产生条件不满足时标签仍在的问题；应统一呈现状态 |
| `WeatherVisualController.ts` | 单雨 emitter；雾由覆盖层和矩形实现；发射 `quantity` 不代表存活上限 | 分层雨是增强；总粒子上限和纹理生命周期是应修复的工程问题 |
| 场景 `preload()`、`src/game/assets/assetManifest.ts` | 集中路径管理，但场景图片主要一次加载 | 先分组和测量，再决定是否做真正流式卸载 |
| `src/game/bootstrap/gameConfig.ts` | 初始 1280×720，但使用 `Phaser.Scale.RESIZE` | 初始尺寸不保证当前浏览器始终为 16:9，必须记录实际 viewport/canvas |

### 0.2 视觉观察与不确定性

- 上一轮运行截图显示：标签密集，底部和两侧前景重量较大，一些石块/植物簇接触地面的感觉较弱，主路线不够明显。这些属于**已观察到的视觉现象与设计判断**。
- 不能仅凭截图确认每一块石头的来源。先隔离 `createDecorPlants()`、中景图、前景图、修复后植被，再决定删除、移位或修改素材。
- 不能据此声称路线在物理上完全不可通行；需要以真实玩家脚部碰撞尺寸进行连通性验证。
- 上一轮截图并非已经完成的严格 16:9 验收，也没有可靠的 FPS 基线。本文所有比例、alpha、坐标候选值和性能目标均为**建议起点/验收约定**，不是当前测量结论。
- 三层雨、湿地反光、复杂资源流式加载不是产品必需的“故障修复”。它们分别是氛围增强、可选增强和按性能证据决策的优化。
- 先前 `npm run typecheck` 通过；`npm test` 在受限环境因 esbuild `spawn EPERM` 未能启动，不能记为测试通过或代码失败。Vitest 不使用 `--runInBand`。本文更新没有重新执行业务测试。

### 0.3 实施边界与原则

1. 保留 `INTERACTION_OBJECTS` 和 `NPC_DEFINITIONS` 的稳定业务 ID；不改变每日任务 sourceId、天气条件或存档结构。
2. `baseY` 是世界坐标中的接触点；图片坐标、物理体坐标和相机屏幕坐标分开计算。
3. `displayHeight` 按**可见内容**定义；不能拿整张带透明留白的 PNG 高度直接当人物身高。
4. 地面投影全部在实体之后、地面之前之后的专用地面特效带，不能简单对每个阴影设置 `ownerDepth - 1`，否则低处物体阴影可能压到高处人物身上。
5. 世界实体不放进会阻止跨对象排序的独立 Container；背景容器内部的 child depth 不能跨容器排序。
6. 不能直接把 `setTint` 当成去饱和或模糊，也不能对整个 canvas 加 CSS blur 来伪造远景景深。
7. 先让未贴图任务点拥有图标或地面标记，再隐藏文字；不能让玩家失去发现任务点的途径。
8. 不增加永久发光导航线；调试路线只在开发模式显示。

---

## 1. 修改目标和交付物

### 1.1 目标画面

- **第一眼：** 城市轮廓退到背景，人物与主要设施最清楚；石块和植物有明确地面接触；底部只是框景，不形成墙。
- **行走时：** 有连贯、可辨认、实际可达的通道；经过前后物体时遮挡自然，没有深度跳动或脚底漂移。
- **靠近时：** 最多一个世界空间名称标签，一个屏幕空间操作提示；不再同时出现十余个黑底文字条。
- **交互时：** NPC 对话沿用现有面板；普通对象显示详细反馈；任务完成或天气变化后文字、图标、阴影同步更新。
- **天气中：** 雨雾有距离层次，人物和通道仍可识别；低画质可以关闭反光或前景雨，不影响任务逻辑。

### 1.2 交付物

- [ ] 空间配置及素材接触点校准表。
- [ ] 接触阴影、标签状态、任务图标、遮挡调试实现。
- [ ] 四阶段代码与逻辑测试。
- [ ] 1280×720、1600×900、1920×1080 的修改前后截图及性能数据。
- [ ] 阴天/雨天/雾天、昼夜和修复前后状态验收记录。
- [ ] 可选效果关闭后仍可玩的降级方案。

### 1.3 推荐执行顺序

保留用户编号以便对照，但实施依赖顺序如下：

```text
基线截图与素材隔离
  → 8 配置、9 锚点、10 深度、13 调试（最小版本）
  → 1 石块、2 中景、3 前景、5 远景、7 路线、12 全量校准
  → 6 接触阴影 + 11 自动接入
  → 18 任务标记 + 4/14/15 标签 + 16 详情 + 17 配色
  → 22 粒子预算 → 19 雨 + 20 雾 → 24 性能回归
  → 21 反光、23 进一步流式优化按数据决定
```

第 24 项基线测量在开始时就做，最终回归放最后。不要等所有特效写完才知道帧率是否退化。

---

## 2. 文件职责与统一测试流程

### 2.1 现有文件

| 文件 | 修改职责 |
|---|---|
| `src/game/scenes/UrbanWastelandScene.ts` | 注册背景/装饰、创建实体、统一交互焦点、绑定天气/相机/生命周期；不承担全部计算 |
| `src/game/interaction/interactionObjects.ts` | 业务对象保留原 ID，坐标从空间配置派生 |
| `src/game/interaction/interactionTypes.ts` | 兼容原 `x/y` 交互 DTO；必要时仅增加 visualId |
| `src/game/interaction/InteractionZone.ts` | 应用锚点、统一标签/主体/阴影可见性、修复换图后重新布局 |
| `src/game/entities/Player.ts` | 可见脚底与碰撞体对齐、移动后同步阴影与排序、去掉常驻姓名 |
| `src/game/npc/npcDefinitions.ts` | 从空间配置派生 NPC 坐标，不修改对话任务定义 |
| `src/game/config/depthConfig.ts` | 保留 entityDepth，并补充地面特效和标签之间的分层 |
| `src/game/config/parallaxConfig.ts` | 背景装配参数、前景覆盖规则；区分水平/垂直滚动系数 |
| `src/game/config/movementConfig.ts` | 真实脚部 footprint 规格、行走边界 |
| `src/game/weather/WeatherVisualController.ts` | 雨层、预算、纹理重用、天气/resize/shutdown 清理 |
| `src/game/time/DayNightVisualController.ts` | 环境覆盖的图层与透明度一致性回归 |
| `src/game/assets/assetManifest.ts` | 分组资源、可选低分辨率/柔化版本 |
| `src/ui/components/DevDebugPanel.tsx` | 调试开关、粒子/帧时间计数，不直接持有 Phaser 实例 |
| `src/ui/components/InteractionPrompt.tsx` | 使用已有 Bridge 事件统一屏幕提示和反馈 |

### 2.2 拟新增模块

```text
src/content/maps/urbanWastelandLayout.ts             空间事实来源与路线
src/game/visual/sceneObjectTypes.ts                  空间/素材契约
src/game/visual/anchorMath.ts                        可见内容锚点纯函数
src/game/visual/sceneObjectRegistry.ts               运行时注册及状态同步
src/game/visual/ContactShadow.ts                     接触阴影实现
src/game/visual/OcclusionDebugOverlay.ts             调试绘制
src/game/visual/foregroundPolicy.ts                 前景覆盖纯函数
src/game/visual/labelPolicy.ts                      唯一焦点/距离迟滞
src/game/visual/visualPalette.ts                    类型配色
src/game/visual/TaskMarker.ts                       图标绘制
src/game/visual/atmospherePolicy.ts                 雾/湿度参数
src/game/visual/WetGroundReflection.ts              可选反光
src/game/visual/routeValidation.ts                  路线检查
src/game/visual/frameStats.ts                       帧时间摘要
src/game/weather/rainConfig.ts                     雨层参数和预算
src/game/assets/assetLoadPolicy.ts                 可选资源候选选择
src/store/visualDebugStore.ts                       DEV 展示状态
```

无需另建 ShadowManager 再套一层 registry：少量对象由 registry 持有 `ContactShadow` 即可。没有性能证据前不做动态对象池、shader 框架或通用地图流式引擎。

### 2.3 每项统一执行步骤

每项下面列出专用示例/测试/视觉用例，均按以下顺序实施：

- [ ] 写本项纯函数或状态契约的失败测试，确认失败是预期缺口而非环境问题。
- [ ] 运行 `npm test -- src/tests/<本项测试文件>`，记录失败原因。
- [ ] 按本项代码示例实现并接入指定的现有调用点；示例中的新函数由对应章节定义。
- [ ] 运行本项测试、`npm run typecheck` 及相关旧回归；截图检查不能被 mock 测试替代。
- [ ] 对本项视觉用例保存前后对比；涉及天气/修复/退出时做生命周期回归。
- [ ] 小批次提交，只暂存本项文件；不得夹带用户已有修改。本文生成不执行 commit。

完整回归命令：

```powershell
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```

若 esbuild 启动被环境阻止，应申请获批的运行环境，不修改安全配置或删除检查来伪造通过。

---

# 阶段 1：视觉止血

## 任务 01：删除或重新落地悬浮石块

**判断：需要修复视觉现象；具体素材根因须先隔离确认。**

**修改目标：** 保留有构图价值的石块/植被簇，让其可见接触点落在地面；删除不服务路线或层次的大型装饰。

**修改位置：** 场景 `createDecorPlants()`、`addPlaceholderVegetation()`、背景装配；新增 `urbanWastelandLayout.ts`；必要时修改 `public/assets/images/decor/ruin-plant-cluster.png` 或分层背景图。

**操作步骤：**
- [ ] 依次仅隐藏普通装饰、修复后植被、中景、前景，分别截图，确认每个悬浮区域归属。
- [ ] 如果石块烘焙在整张图内，只能裁切、重绘或替换该图；不能声称可通过代码独立移动。
- [ ] 普通装饰改为显式配置，保留 disabled 开关；用第 9 项锚点函数落地。

**修改代码示例（新配置内容；数值是首轮调试候选值）：**

```ts
export const DECOR_PLACEMENTS = [
  { id: 'decor.cluster.left', x: 170, baseY: 990, visibleHeight: 150, enabled: true },
  { id: 'decor.cluster.center', x: 1000, baseY: 745, visibleHeight: 130, enabled: false },
  { id: 'decor.cluster.right', x: 1780, baseY: 980, visibleHeight: 160, enabled: true },
] as const;

export function enabledDecorIds(): string[] {
  return DECOR_PLACEMENTS.filter((p) => p.enabled).map((p) => p.id);
}
```

在 `createDecorPlants()` 中以 `enabled` 筛选；原 `scale: 0.3` 等硬编码改为第 9 项按可见高度计算。装饰不增加碰撞。

**逻辑测试：** 新增 `src/tests/decorLayout.test.ts`：

```ts
import { expect, it } from 'vitest';
import { enabledDecorIds } from '@/content/maps/urbanWastelandLayout';
it('默认关闭压住中央视线的大装饰簇', () => {
  expect(enabledDecorIds()).not.toContain('decor.cluster.center');
});
```

**视觉验收：** 中央出生点上方不再悬着大型石块；保留装饰的接触边无可见空隙；移动相机后仍贴地。素材中本来就存在的地台必须与场景地面衔接，不允许加一个椭圆阴影掩盖明显悬空。

**通过条件：** 归因截图 + 落地点调试截图 + 最终自然画面均保存；不得只验证图片矩形底边。

## 任务 02：重新摆放中景对象

**判断：需要校准；背景图与可绕行实体必须分开。**

**目标：** 工业建筑作为背景，不盖住玩家脚底和通道；设施在通道两侧形成节点。

**文件：** `parallaxConfig.ts`、场景 far/mid 创建、`urbanWastelandLayout.ts`。

**代码示例（替换中景创建的参数来源）：**

```ts
export const MID_LAYER_PLACEMENT = {
  x: 960,
  baseY: 710,
  scrollX: 0.48,
  scrollY: 1,
} as const;
```

```ts
// UrbanWastelandScene.create() 的中景装配片段。
const mid = this.add.image(
  MID_LAYER_PLACEMENT.x, MID_LAYER_PLACEMENT.baseY, MID_BUILDINGS_TEXTURE,
).setOrigin(0.5, 1);
this.midLayer.setScrollFactor(
  MID_LAYER_PLACEMENT.scrollX, MID_LAYER_PLACEMENT.scrollY,
);
this.midLayer.add(mid);
```

**逻辑：** `710` 是用于初始检查的锚点，不是未经验证的最终美术坐标。横向视差和纵向贴地分开，防止纵向相机移动时建筑底部漂移。实体型设施继续 scrollFactor=1，放场景根，不能放入远中景容器。

**测试：** `src/tests/midLayerPlacement.test.ts`，断言 `scrollY === 1`、锚点为有限值；调用场景装配 mock 检查中景不加入碰撞组。运行 `npm test -- src/tests/midLayerPlacement.test.ts`。

**视觉验收：** 出生点、林工、污染堆周围的角色轮廓不与大块中景重复重叠；在相机左、中、右和行走带上下边界检查地平线无裂缝、穿帮和裸露矩形边缘。

## 任务 03：降低底部前景重量

**判断：需要，但不能把所有前景统一半透明而产生幽灵感。**

**目标：** 保留两侧框景；中央路线保持开口；用裁切、移动或素材调整优先，alpha 微调仅为最后手段。

**文件：** `foregroundPolicy.ts`、`parallaxConfig.ts`、场景前景装配；必要时替换 `wasteland-foreground.png`。

**代码示例（屏幕空间覆盖计算）：**

```ts
export function foregroundCoverage(
  topScreenY: number, viewportHeight: number,
): number {
  if (viewportHeight <= 0) return 0;
  return Math.max(0, Math.min(1, (viewportHeight - topScreenY) / viewportHeight));
}
export const FOREGROUND_MAX_CENTER_COVERAGE = 0.22;
```

```ts
import { expect, it } from 'vitest';
import { foregroundCoverage } from '@/game/visual/foregroundPolicy';
it('只计算屏幕下方覆盖，不混用世界高度', () => {
  expect(foregroundCoverage(842.4, 1080)).toBeCloseTo(0.22);
  expect(foregroundCoverage(1200, 1080)).toBe(0);
});
```

**逻辑：** 第 13 项把前景可见 alpha 内容投影到屏幕，测量中央 60% 区域的最高实质遮挡边。不能用整张 PNG 的透明矩形高度估算。22% 是首轮中央底部目标，不限制两侧高框景。

**测试：** `src/tests/foregroundPolicy.test.ts`；resize 后重新测量，背景/前景全画幅覆盖不能露空。

**视觉验收：** 1920×1080 的中央底部遮挡目标不超过 22%；玩家沿主路线不被连续整身遮住。过长前景枝条应裁短/移到两侧，不靠把玩家永远绘制到前景之上解决。

## 任务 04：清理重叠标签

**判断：明确需要，与 14/15 共用一次实现。**

**目标：** 最多一个世界名称标签；HUD 和对话可以独立存在，但不重复同一条“按 E”提示。

**文件：** `labelPolicy.ts`、场景 `updateInteractions()`、`InteractionZone.ts`、NPC 标签更新、`InteractionPrompt.tsx`。

**代码示例（标签可见规则）：**

```ts
export function shouldShowWorldLabel(
  id: string, focusId: string | null, worldVisible: boolean, dialogOpen: boolean,
): boolean {
  return worldVisible && !dialogOpen && id === focusId;
}
```

```ts
import { expect, it } from 'vitest';
import { shouldShowWorldLabel } from '@/game/visual/labelPolicy';
it('隐藏对象不能残留标签，焦点仅显示一个', () => {
  expect(shouldShowWorldLabel('a', 'a', false, false)).toBe(false);
  expect(['a', 'b'].filter((id) =>
    shouldShowWorldLabel(id, 'a', true, false))).toEqual(['a']);
});
```

**逻辑：** 先唯一焦点，不实现复杂多标签自动布局。保留一个标签后，优先放对象可见顶部上方 8px；与 HUD 安全区碰撞则移到侧面，无法容纳时隐藏世界标签，由 React 提示提供名称。世界标签不承担操作说明。

**测试：** `src/tests/labelVisibility.test.ts`，覆盖隐形天气对象、两个近邻对象、对话打开、修复换图、相机边缘。

**视觉验收：** 默认入场不再有黑底文字条铺满地面；近邻任务点也只出现一个标签；顶部 HUD、人物头部和世界名称不互相遮挡。

## 任务 05：降低远景清晰度

**判断：需要视觉调节；模糊方式优先离线处理。**

**目标：** 远景低对比、低细节；中景次之；人物和任务主体清楚。

**文件：** `assetManifest.ts`、场景 far 创建；新增处理后资源 `public/assets/images/backgrounds/wasteland-far-city-soft.png`（是否采用 WebP 由尺寸比较决定）。

**代码示例：**

```ts
// 合并进 sceneAssets.backgrounds，保留原图供对比/回退。
farCitySoft: '/assets/images/backgrounds/wasteland-far-city-soft.png',
```

```ts
// 在 preload 中替换 FAR_CITY_TEXTURE 的路径，而非同 key 重复 load。
this.load.image(FAR_CITY_TEXTURE, sceneAssets.backgrounds.farCitySoft);
```

**处理规则：** 离线导出时保留原尺寸、透明通道和地平线；制作 2/4/6 像素柔化的三个审核样张，选择最轻且有效的一版；降低局部对比，不把建筑轮廓抹掉。样张数值以源图像素为单位，必须检查最终显示缩放。

**测试：** 新增 `src/tests/backgroundAssetPolicy.test.ts`，检查清单 key 与 preload 对应、资源存在；截图比较保证地平线未变。PNG 加载失败必须有可见的原图回退，不出现 missing texture 方块。

**视觉验收：** 以同尺寸同天气截图比较，人物明显优先于城市细部；灰度预览仍能区分前后；不存在整个游戏/HUD 被 CSS 一起模糊的情况。

## 任务 06：给角色和主要对象加接触阴影

**判断：需要补充；先检查图片是否已有烘焙阴影，避免双阴影。**

**目标：** 轻微接触阴影落在脚底/基底，不模拟复杂实时投影。

**文件：** 新增 `ContactShadow.ts`；接入 Player、NPC、InteractionZone；第 10 项提供 `DEPTH_CONTACT_SHADOW`。

**代码示例（完整基础实现）：**

```ts
import Phaser from 'phaser';
import { DEPTH_CONTACT_SHADOW } from '@/game/config/depthConfig';

export class ContactShadow {
  private readonly nodes: Phaser.GameObjects.Ellipse[];
  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.nodes = [
      scene.add.ellipse(0, 0, width, height, 0x102224, 0.08),
      scene.add.ellipse(0, 0, width * 0.65, height * 0.65, 0x102224, 0.12),
    ];
    this.nodes.forEach((node) => node.setDepth(DEPTH_CONTACT_SHADOW));
  }
  sync(x: number, baseY: number, visible: boolean): void {
    this.nodes.forEach((node) => node.setPosition(x, baseY).setVisible(visible));
  }
  destroy(): void {
    this.nodes.forEach((node) => { if (node.scene) node.destroy(); });
  }
}
```

**逻辑：** 阴影尺寸按 footprint，不按整张图片宽度；人物可从 28×8 开始，设备依真实基底调整。没有高度系统时不随移动改变阴影大小。样式评审若硬边明显，再用一张共享软边纹理替代，不为每个对象单独生成大纹理。

**测试：** `src/tests/contactShadow.test.ts`：mock `scene.add.ellipse` 检查两个节点同步、隐藏、深度固定低于实体，以及 destroy 两次不抛错；场景销毁后无阴影残留。

**视觉验收：** 人物脚下有薄而柔和的暗面；设施不悬空；夜间没有浓黑贴纸；阴影不能压在其他人物躯干上。前后走动至少录制 10 秒验证。

## 任务 07：保留一条清晰可行走路线

**判断：需要建立视觉与物理两种验收，不能只画线。**

**目标：** 出生点和每个必需互动点的可交互邻域互相连通，装饰不制造看起来能走却撞墙的区域。

**文件：** `urbanWastelandLayout.ts`、`routeValidation.ts`、场景障碍物生成、`movementConfig.ts`。

**代码示例（纯几何安全判断）：**

```ts
export interface RoutePoint { x: number; y: number }
export interface Box { left: number; right: number; top: number; bottom: number }
export function isFreeFootPoint(
  p: RoutePoint, obstacles: readonly Box[], halfWidth: number, halfHeight: number,
): boolean {
  return obstacles.every((b) =>
    p.x < b.left - halfWidth || p.x > b.right + halfWidth ||
    p.y < b.top - halfHeight || p.y > b.bottom + halfHeight);
}
```

```ts
import { expect, it } from 'vitest';
import { isFreeFootPoint } from '@/game/visual/routeValidation';
it('路线净空包含玩家脚部体积，而非仅线段', () => {
  const walls = [{ left: 100, right: 130, top: 800, bottom: 850 }];
  expect(isFreeFootPoint({ x: 90, y: 820 }, walls, 16, 8)).toBe(false);
  expect(isFreeFootPoint({ x: 70, y: 820 }, walls, 16, 8)).toBe(true);
});
```

**逻辑步骤：** 在行走带内建立 8px 网格，对按真实 footprint 膨胀后的障碍做 flood-fill；从出生点出发，每个必需对象至少有一个可达点落在其 interactionRange 内。每种天气和修复前后分别检查。最终建议路线沿此连通区域配置，不能先猜一条直线。

**测试：** `src/tests/routeValidation.test.ts`：上述边界用例、封死出口用例、当前所有对象可达用例。网格检测后仍需 Arcade 实机行走，防止物理 offset 与算法不一致。

**视觉验收：** 初次进入能辨认地面通道；沿通道不会被完全遮住；必需对象可从通道一侧靠近；修复新增植被不能封路。路线调试线在正式模式关闭。

---
# 阶段 2：空间规则

## 任务 08：建立统一对象配置

**判断：补齐已有配置，不新建第二份互相独立的坐标。**

**目标：** 业务 ID 保持不变，视觉配置统一提供坐标、可见高度、底点、阴影和标签语义；任务进度仍在原 Store。

**文件：** `sceneObjectTypes.ts`、`urbanWastelandLayout.ts`、`interactionObjects.ts`、`npcDefinitions.ts`、场景 `OBSTACLES/createDecorPlants()`。

**代码示例（新增类型）：**

```ts
// src/game/visual/sceneObjectTypes.ts
export type SceneObjectRole =
  | 'far' | 'mid' | 'ground' | 'entity' | 'foregroundCover' | 'taskMarker';
export interface SceneObjectConfig {
  id: string;
  role: SceneObjectRole;
  x: number;
  baseY: number;
  visibleHeight: number;
  assetId?: string;
  footprint?: { width: number; height: number; blocking: boolean };
  shadow?: { width: number; height: number };
  labelMode: 'none' | 'proximity';
}
// 像素坐标取自未裁切源图；支持可见内容非水平居中。
export interface AssetMetrics {
  frameWidth: number;
  frameHeight: number;
  contentTop: number;
  contentBottom: number;
  contactX: number;
  contactY: number;
}
export function interactionPosition(object: SceneObjectConfig) {
  return { x: object.x, y: object.baseY };
}
```

```ts
// src/content/maps/urbanWastelandLayout.ts 的一个条目示例。
import type { SceneObjectConfig } from '@/game/visual/sceneObjectTypes';
export const POLLUTION_LAYOUT: SceneObjectConfig = {
  id: 'interaction.pollution_zone_01', role: 'entity',
  x: 650, baseY: 880, visibleHeight: 120,
  assetId: 'obj-pollution-pile-large',
  footprint: { width: 64, height: 24, blocking: false },
  shadow: { width: 92, height: 16 }, labelMode: 'proximity',
};
```

在 `interactionObjects.ts` 的污染物堆条目中用 `...interactionPosition(POLLUTION_LAYOUT)` 替换原 `x/y` 字面量；NPC 和其他对象同样从完整布局表派生，不在两边各维护一份。`AssetMetrics` 单独按 textureKey 登记，修复换图时切换 metrics。

**测试代码：** `src/tests/sceneObjectConfig.test.ts`：

```ts
import { expect, it } from 'vitest';
import { interactionPosition } from '@/game/visual/sceneObjectTypes';
import { POLLUTION_LAYOUT } from '@/content/maps/urbanWastelandLayout';
it('业务 y 从唯一 baseY 派生，保留稳定 ID', () => {
  expect(interactionPosition(POLLUTION_LAYOUT)).toEqual({ x: 650, y: 880 });
  expect(POLLUTION_LAYOUT.id).toBe('interaction.pollution_zone_01');
});
```

**视觉验收：** 调一个 layout 值即可移动对应主体、图标、阴影和交互中心；调试界面的 ID 与任务来源一致。

## 任务 09：统一底部锚点与可见内容校准

**判断：底部 origin 已有，缺的是透明留白校准和物理坐标一致性。**

**目标：** 可见脚底不是 PNG 外框底部；保留 `(0.5,1)` 原点时，用偏移抵消透明边距。

**文件：** `anchorMath.ts`、Player、InteractionZone、NPC 创建与修复换图代码。

**代码示例（完整纯函数，使用第 08 项类型）：**

```ts
import type { AssetMetrics } from './sceneObjectTypes';
export function anchoredImagePose(
  x: number, baseY: number, visibleHeight: number, m: AssetMetrics,
) {
  const contentHeight = m.contentBottom - m.contentTop;
  if (!Number.isFinite(visibleHeight) || visibleHeight <= 0 || contentHeight <= 0) {
    throw new Error('Invalid visible asset height');
  }
  const scale = visibleHeight / contentHeight;
  return {
    scale,
    x: x + (m.frameWidth / 2 - m.contactX) * scale,
    y: baseY + (m.frameHeight - m.contactY) * scale,
    labelY: baseY + (m.contentTop - m.contactY) * scale - 8,
  };
}
```

调用点对图像执行 `setOrigin(0.5,1).setScale(pose.scale).setPosition(pose.x,pose.y)`；排序、范围和阴影用原 `baseY`，**不是**经补偿的 `image.y`。Rectangle 回退也使用底部 origin，并由相同逻辑锚点定位。

**测试代码：** `src/tests/anchorMath.test.ts`：

```ts
import { expect, it } from 'vitest';
import { anchoredImagePose } from '@/game/visual/anchorMath';
it('透明底边不会让可见脚底悬空', () => {
  const p = anchoredImagePose(100, 800, 100, {
    frameWidth: 200, frameHeight: 400,
    contentTop: 80, contentBottom: 380, contactX: 100, contactY: 380,
  });
  expect(p.scale).toBeCloseTo(1 / 3);
  expect(p.y - (400 - 380) * p.scale).toBeCloseTo(800);
  expect(p.labelY).toBeCloseTo(692);
});
```

**物理逻辑：** 当前 Player 使用带缩放的图片作为 Arcade body，`setSize/setOffset` 混用显示尺寸的风险必须实测。优先让一个无缩放透明脚部 Rectangle 持有 body，图片跟随该 body 的逻辑脚点；若保留图片 body，则按当前 Phaser 源坐标语义换算 offset，不能直接套显示像素。出生、边界、碰撞、交互和相机 follow 要一起迁移，不能只改美术图。

**视觉验收：** 男女角色、NPC、原污染图和修复图都对齐同一基线；上下走到边界时可见脚底仍在 700–1040 的逻辑带内；缩放或换图不产生纵向跳跃。

## 任务 10：统一深度排序并保留现有 Y-sort

**目标：** 只给现有深度表补足地面阴影/反光/标记位置，避免另建不兼容的数字体系。

**文件：** `depthConfig.ts`、Player、InteractionZone、场景 NPC/植被深度刷新。

**代码示例（添加到现有 depthConfig.ts，保留原常量和 entityDepth）：**

```ts
import type { SceneObjectRole } from '@/game/visual/sceneObjectTypes';
export const DEPTH_REFLECTION = 40;
export const DEPTH_CONTACT_SHADOW = 50;
export const DEPTH_TASK_MARKER = 1900;
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
```

**逻辑：** 游戏行走带 700–1040 对应实体 depth 800–1140，仍低于 foreground=1200。阴影50和反光40位于 ground20与实体之间，不会盖住其他人物。相同 baseY 的静态对象按稳定 ID 注册；需要精细相同 Y 遮挡时加受控 tie-break，而非任意 depth 偏移。动态实体在物理更新后按逻辑脚点同步，静态对象仅在位置变更时更新。

**测试代码：** `src/tests/depthConfig.test.ts`：

```ts
import { expect, it } from 'vitest';
import { entityDepth, DEPTH_CONTACT_SHADOW, DEPTH_FOREGROUND } from '@/game/config/depthConfig';
it('阴影在所有实体下方，前景在行走带实体上方', () => {
  expect(DEPTH_CONTACT_SHADOW).toBeLessThan(entityDepth(700));
  expect(entityDepth(1040)).toBeLessThan(DEPTH_FOREGROUND);
  expect(entityDepth(900)).toBeGreaterThan(entityDepth(800));
});
```

**视觉验收：** 玩家从装饰后方绕到前方时顺序正确；修复前后排序不变；不允许通过永久顶层玩家来规避遮挡。

## 任务 11：自动接入阴影与统一呈现生命周期

**目标：** 以一个 registry 同步主体、标签、标记和阴影的可见状态；不再单独加一套 ShadowManager。

**文件：** `sceneObjectRegistry.ts`、`ContactShadow.ts`、场景天气门控和清理函数。

**代码示例（最小 registry）：**

```ts
import { ContactShadow } from './ContactShadow';
interface VisibleNode { setVisible(visible: boolean): unknown }
export interface ScenePresentation {
  body: VisibleNode;
  label: VisibleNode;
  marker: VisibleNode;
  anchor(): { x: number; baseY: number };
  shadow?: ContactShadow;
}
export class SceneObjectRegistry {
  private entries = new Map<string, ScenePresentation>();
  register(id: string, entry: ScenePresentation): void {
    if (this.entries.has(id)) throw new Error(`Duplicate scene object: ${id}`);
    this.entries.set(id, entry);
  }
  present(id: string, visible: boolean, focused: boolean, markerVisible: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.body.setVisible(visible);
    entry.label.setVisible(visible && focused);
    entry.marker.setVisible(visible && markerVisible);
    const p = entry.anchor();
    entry.shadow?.sync(p.x, p.baseY, visible);
  }
  destroy(): void {
    for (const entry of this.entries.values()) entry.shadow?.destroy();
    this.entries.clear();
  }
}
```

**接入逻辑：** registry 创建 shadow（第 06 项），场景/实体继续拥有主体和标签的销毁权，避免重复销毁。动态主体移动后调用 `present()` 或独立同步步骤。天气门控仍先检查业务 eligibility，但呈现只走统一出口；隐藏不等于删除业务对象，排水设施在晴天仍可见但不可执行雨天任务。

**测试：** `src/tests/sceneObjectRegistry.test.ts`；用四个 spy 验证 `visible=false` 会同时隐藏 body/label/marker/shadow；重复 ID 抛错；destroy 两次安全。与 `sceneLifecycleDestroy.test.ts` 联合执行。

**视觉验收：** 阴天无“暴雨冲散垃圾”或雾天危险点残留标签；隐藏设备不会剩一个黑椭圆；返回开始并重新进入后不出现双阴影。

## 任务 12：重新标定全部对象的 baseY

**目标：** 覆盖所有落地对象与所有纹理状态，不把只列五个主要对象当全量校准。

**文件：** `urbanWastelandLayout.ts`、素材 metrics 表；校准记录保存到 `docs/superpowers/plans/2026-09-12-baseY-calibration.md`（实施时产出）。

**基线清单（来自当前代码，未代表最终批准位置）：**

| 对象 | 当前 x / y 或锚点 | 校准注意 |
|---|---|---|
| 玩家出生 | 960 / 870 | 男女两张素材、脚部碰撞与 camera follow |
| npc.engineer.lin | 350 / 860 | 不是 250/890；保留业务 ID |
| npc_weather_ranger | 1700 / 920 | 与右侧 marker/HUD 安全区分离 |
| interaction.pollution_zone_01 | 650 / 880 | 污染和修复两种图；持续清理缩放状态 |
| interaction.monitoring_device_01 | 1500 / 940 | 基底、可见高度、通道净空 |
| interaction.drainage_facility_01 | 1150 / 900 | 始终可见、雨天可执行 |
| interaction.storm_debris_01 | 900 / 920 | 目前无图片；暴雨限定 |
| interaction.damaged_env_01 / 02 | 450 / 800；1350 / 920 | 无图片任务点先有标记再隐藏名称 |
| interaction.ecology_patrol_01 / 02 / 03 | 250 / 760；1050 / 880；1650 / 860 | 每个点都有独立 ID |
| interaction.fog_hazard_01 / 02 | 800 / 820；1550 / 960 | 只在雾天显示 |
| 普通装饰 6 处 | 200/730、550/1010、1000/745、1600/990、120/950、1820/780 | 源图透明留白和固定 scale |
| 障碍 4 处 | 350/780、900/760、1500/800、700/960 | 这里 y 是矩形中心，不得直接改名当 baseY |
| 修复后植被 3 处 | 污染锚点 +(-50,0)、(+40,0)、(-10,+10) | 当前固定 scale 可能导致植被过大 |
| 远/中/前景 | 底部锚点 760 / 900 / 1120 | 分层图裁边、parallax、viewport 覆盖 |
| 地面 tile/覆盖图 | 行走带起点 700 | 检查缩放后是否只覆盖世界中央一段 |

**代码示例（用于开发期校准校验，不在绘制循环抛错）：**

```ts
import type { SceneObjectConfig } from './sceneObjectTypes';
export function validatePlacement(objects: readonly SceneObjectConfig[]): void {
  const ids = new Set<string>();
  for (const o of objects) {
    if (ids.has(o.id)) throw new Error(`Duplicate placement: ${o.id}`);
    ids.add(o.id);
    if (![o.x, o.baseY, o.visibleHeight].every(Number.isFinite) || o.visibleHeight <= 0) {
      throw new Error(`Invalid placement: ${o.id}`);
    }
    if (o.role === 'entity' && (o.baseY < 700 || o.baseY > 1040)) {
      throw new Error(`Entity outside walkable band: ${o.id}`);
    }
  }
}
```

**逻辑：** 障碍若仍用中心 y 保存碰撞数据，提供显式适配器，不能把全部 `y` 搜索替换为 `baseY`。可见内容测量使用 alpha 阈值（建议16/255），接触点需要人工确认，底部阴影/花草尾端不一定是真正接地点。

**测试：** `src/tests/baseYCalibration.test.ts`：稳定 ID 不漏项、角色边界、重复 ID、非有限数；读素材 PNG 确认 metrics 在 source bounds 内。上述表中的每种换图状态也须通过第09项测试。

**视觉验收：** 每个对象留一张编号基线截图和一张自然画面；校准表填写旧值、最终值、素材接触点、审批截图，不用候选值冒充已批准值。

## 任务 13：遮挡调试模式

**目标：** 一个 DEV 开关展示 baseY、depth、可见边界、碰撞 footprint、标签框、路线和前景覆盖；正式模式无额外对象或全局快捷键。

**文件：** `visualDebugStore.ts`、`OcclusionDebugOverlay.ts`、`DevDebugPanel.tsx`、场景创建/清理。

**代码示例（Store）：**

```ts
import { create } from 'zustand';
export const useVisualDebugStore = create<{
  enabled: boolean; setEnabled: (value: boolean) => void;
}>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}));
```

**代码示例（文字和 Graphics 分开，不能调用不存在的 Graphics.fillText）：**

```ts
import Phaser from 'phaser';
export function drawAnchorDebug(
  graphics: Phaser.GameObjects.Graphics,
  caption: Phaser.GameObjects.Text,
  object: { id: string; x: number; baseY: number; depth: number },
): void {
  graphics.lineStyle(1, 0xffd166, 0.9);
  graphics.lineBetween(object.x - 18, object.baseY, object.x + 18, object.baseY);
  graphics.fillStyle(0xffd166, 1).fillCircle(object.x, object.baseY, 3);
  caption.setPosition(object.x + 6, object.baseY - 6)
    .setText(`${object.id} y=${object.baseY} d=${object.depth}`);
}
```

**逻辑：** 启用时创建一个 Graphics 和按对象 ID 复用的 Text；每次刷新先 clear，caption 内容未变不 setText；关闭时隐藏或销毁，注销订阅。React 面板以 checkbox 和 `useVisualDebugStore` 读写，不直接操作 Phaser。屏幕空间统计与世界空间覆盖层分开，相机坐标不得混用。

**测试：** `src/tests/visualDebugStore.test.ts`、`occlusionDebugOverlay.test.ts`：默认关闭、开关幂等、反复20次不增加 Text 数、退出不再响应 Store。

**视觉验收：** 一张截图可判断是透明底边错位、depth 错位还是碰撞阻挡；鼠标/键盘仍能正常操作，打开调试不改变任务/天气/速度。

---
# 阶段 3：交互体验

## 任务 14：标签默认隐藏

**目标：** 隐藏世界空间姓名和对象名称；保留 HUD 身份、任务面板、读屏可用的 React 提示和业务数据。

**文件：** `InteractionZone.ts`、`Player.ts`、场景 `createNpcs/updateNpcLabels()`。

**代码示例（加入 InteractionZone，使用其现有 label 成员）：**

```ts
setLabelVisible(visible: boolean): void {
  if (this.destroyed || !this.label?.scene) return;
  this.label.setVisible(visible);
}
```

```ts
// 三个标签创建点都在 Text 创建和 origin/depth 设置后添加这一行。
this.label.setVisible(false);
// NPC 局部变量对应使用 label.setVisible(false)。
```

**逻辑：** `setLabelText()` 和 `updateNpcLabels()` 仅更新文字，不擅自显示；显示权只在第04/15项。玩家自身名称已有 HUD，默认不创建世界姓名或直接关闭；不能把玩家自己列入交互焦点候选。先完成任务18再启用本项，防止无素材任务点完全不可见。

**测试：** `src/tests/worldLabelDefaults.test.ts`：Text 创建后调用 `setVisible(false)`；`setLabelText('已清理')` 不调用 `setVisible(true)`；恢复存档不使全部标签重现。

**视觉验收：** 默认入场仅有必要 HUD 和非文本任务标记；不出现满地黑底短句；打开任务列表仍能读到完整对象名称。

## 任务 15：靠近时显示，并统一 E 键焦点

**目标：** 只显示一个候选对象；名称、操作提示、高亮和真正 E 键目标一致。

**文件：** `labelPolicy.ts`、场景 `updateInteractions/handleEKeyDown()`、NPC 状态；不用另一套独立的“标签最近对象”。

**代码示例（共享焦点计算）：**

```ts
export interface FocusCandidate {
  id: string;
  distance: number;
  range: number;
  eligible: boolean;
  priority: number;
}
export function resolveFocus(
  candidates: readonly FocusCandidate[], previousId: string | null,
): { id: string | null; canInteract: boolean } {
  const active = candidates.filter((c) => c.eligible && c.distance <= c.range)
    .sort((a, b) => a.distance - b.distance || b.priority - a.priority ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const best = active[0];
  const previousActive = active.find((c) => c.id === previousId);
  // 只有差距不足8px时保持原焦点，防止两个近邻来回闪烁。
  const focused = previousActive && best && previousActive.distance <= best.distance + 8
    ? previousActive : best;
  if (focused) return { id: focused.id, canInteract: true };
  const leaving = candidates.find((c) => c.eligible && c.id === previousId &&
    c.distance <= c.range + 16);
  // 迟滞区只保留名称；不扩大真正交互范围。
  return { id: leaving?.id ?? null, canInteract: false };
}
```

**测试代码：** `src/tests/labelPolicy.test.ts`：

```ts
import { expect, it } from 'vitest';
import { resolveFocus } from '@/game/visual/labelPolicy';
it('保留退出迟滞但不放大交互范围', () => {
  const c = { id: 'a', distance: 90, range: 80, eligible: true, priority: 0 };
  expect(resolveFocus([c], 'a')).toEqual({ id: 'a', canInteract: false });
  expect(resolveFocus([{ ...c, eligible: false }], 'a')).toEqual({ id: null, canInteract: false });
});
```

**接入：** 用各对象原 interactionRange，不统一硬改80；普通对象和 NPC 合并候选，排除天气不满足或已销毁对象。`focus.id` 决定名称和高亮；`canInteract` 才允许 E 操作和 Bridge AVAILABLE。对话打开时 worldLabel=false。清理按住E的进度逻辑和天气 gate 不被替换。

**动画：** 名称改变时可用120ms淡入、180ms淡出，旧 tween 必须停止；不要每帧 tween，alpha 只属于 label，不能改变 restored object 的 alpha。

**视觉验收：** 一次只亮一个标签；相邻对象边界行走不闪烁；“按 E”对应实际执行对象；离开范围时先撤操作提示，短距离后再撤名称。

## 任务 16：交互时显示详情

**判断：项目已有 `INTERACTION_TRIGGERED/TASK_FEEDBACK` 提示和 NPC Dialog，应补齐信息层次而非重建。**

**目标：** 靠近只显示名称/动作；触发才展示原因、状态和结果。失败反馈不能伪装成成功。

**文件：** `InteractionPrompt.tsx/.module.css`、场景 `emitInteractionFeedback()`；优先保留现有 Bridge payload，只有确需新字段时再兼容扩展类型。

**代码示例（在现有组件内沿用收到的 payload）：**

```tsx
import type { InteractionTriggeredPayload } from '@/game/interaction/interactionTypes';
export function InteractionDetail({ value }: { value: InteractionTriggeredPayload }) {
  return (
    <section role="status" aria-live="polite" aria-atomic="true">
      <strong>{value.displayName}</strong>
      <p>{value.message}</p>
    </section>
  );
}
```

```css
/* InteractionPrompt.module.css：详情卡容器建议值。 */
.detailCard {
  max-width: min(28rem, calc(100vw - 2rem));
  padding: 12px 16px;
  color: #eaf4f2;
  background: rgba(8, 23, 26, 0.94);
  border: 1px solid rgba(112, 183, 217, 0.45);
  border-radius: 8px;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
```

**逻辑：** 将现有反馈字符串按需要升级为包含 objectId/displayName/message 的本地 state；TASK_FEEDBACK 保留通用反馈分支。屏幕提示由 React 独占，移除 Phaser `interactionHintText` 的重复视觉，但保留其承载的业务 hint 生成函数。现有3秒/4秒超时可以保留为短提示；长说明提供可再次读取的任务/详情面板，不强制所有动作打开模态框。NPC 只打开原对话。

**测试：** 扩展 `src/tests/InteractionPrompt.test.tsx`：AVAILABLE 只显示短提示，TRIGGERED 显示详情，UNAVAILABLE 撤销动作，长中文自动换行，计时器/订阅在 unmount 清理；弹窗 input mode 回归。

**视觉验收：** 空闲不出现长说明；E后内容清楚；不出现 Phaser 和 React 两条相同提示；详情位置避开人物、底部按钮和HUD。

## 任务 17：对象高亮与环境色统一

**目标：** 语义色一致、与工业湿地风格兼容；颜色不是唯一的信息通道。

**文件：** `visualPalette.ts`、TaskMarker、InteractionPrompt 和任务面板样式；避免修改恢复阶段本身的 tint/alpha。

**代码示例：**

```ts
export const ACTION_PALETTE = {
  repair: { rgb: 0x79c98b, css: '#79c98b' },
  inspect: { rgb: 0x70b7d9, css: '#70b7d9' },
  patrol: { rgb: 0xe7bd62, css: '#e7bd62' },
  hazard: { rgb: 0xd87979, css: '#d87979' },
} as const;
export type ActionKind = keyof typeof ACTION_PALETTE;
export function highlightStyle(kind: ActionKind, selected: boolean) {
  return { color: ACTION_PALETTE[kind].rgb, alpha: selected ? 0.95 : 0.55 };
}
```

**逻辑：** 优先高亮任务标记环，而非把整个人物改成青绿色。Phaser Graphics 使用 `lineStyle(width,color,alpha)`；Image 使用 `setTint(rgb)`，透明度单独管理，不能把RGBA数值误传RGB接口。修复、天气、focus的视觉参数独立，不互相覆盖。React 使用同一palette的css字符串。

**测试：** `src/tests/visualPalette.test.ts`：四种动作映射齐全，selected只改变亮度不改变kind；修复换图/天气切换/取消焦点后不遗留高亮色。无任务的pollution不强行等于repair，按当前任务动作映射。

**视觉验收：** 同种动作在世界标记、提示和面板同色；灰度/色觉差异情况下仍可按图标区别；夜晚和重雨中不变成刺眼霓虹。

## 任务 18：任务点改用视觉语言

**判断：需要，而且必须先于全面隐藏标签；当前多个点只有透明 Rectangle 和文字。**

**目标：** 修复菱形、检查圆形、巡查三角、危险叉等形状配语义色；靠近才显示名称。

**文件：** `TaskMarker.ts`、interaction配置、场景状态同步；第一版用矢量Graphics，避免依赖目前为空的 icons 目录。

**代码示例（图标和进度弧真实绘制，不使用旋转冒充进度）：**

```ts
import Phaser from 'phaser';
import { DEPTH_TASK_MARKER } from '@/game/config/depthConfig';
import { ACTION_PALETTE, type ActionKind } from './visualPalette';
export class TaskMarker {
  readonly node: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.node = scene.add.graphics().setDepth(DEPTH_TASK_MARKER);
  }
  setVisible(visible: boolean): void { this.node.setVisible(visible); }
  setState(x: number, y: number, kind: ActionKind, selected: boolean, progress: number): void {
    const g = this.node;
    const p = Math.max(0, Math.min(1, progress));
    g.clear().setPosition(x, y).lineStyle(selected ? 3 : 2, ACTION_PALETTE[kind].rgb, 0.95);
    if (kind === 'repair') g.strokePoints([{ x: 0, y: -6 }, { x: 6, y: 0 },
      { x: 0, y: 6 }, { x: -6, y: 0 }], true);
    if (kind === 'inspect') g.strokeCircle(0, 0, 5);
    if (kind === 'patrol') g.strokeTriangle(0, -6, 6, 5, -6, 5);
    if (kind === 'hazard') { g.lineBetween(-5, -5, 5, 5); g.lineBetween(-5, 5, 5, -5); }
    if (p > 0) {
      g.beginPath().arc(0, 0, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p).strokePath();
    }
  }
  destroy(): void { if (this.node.scene) this.node.destroy(); }
}
```

**逻辑：** 图标按状态或位置变更重画，不能每帧clear；无实体任务点在地面加小底座，图标位于其上方；已有设备图标位于可见顶部。显示来源是原任务/天气资格判断：关闭图标不删除交互对象，未出现的暴雨垃圾不能提前泄露。长文本保留在React任务列表中。

**测试：** `src/tests/taskMarker.test.ts`：四种形状绘制分支、0/1/越界进度、隐藏天气点、完成后状态、销毁幂等。

**视觉验收：** 原无图任务点现在可发现；没有大量文字；不靠emoji字体因平台不同而改变风格；图标约22–28逻辑像素、留出8px安全间距，1280×720仍可辨。

---

# 阶段 4：氛围和性能

## 任务 19：建立三层雨效

**判断：需要，但它是氛围增强，不能以牺牲可读性为代价。** 当前 `WeatherVisualController` 只有一个 `particleEmitter`；`quantity` 是发射数量，不等于全局存活粒子上限，因此必须先改生命周期和预算，再增加层次。

**目标：** 用远/中/近三层表现雨的速度、尺寸、透明度和视差差异；重复切换天气不创建重复 emitter；退出场景时所有 emitter、纹理和 timer 都销毁。

**文件：** `src/game/weather/WeatherVisualController.ts`、新增 `src/game/weather/rainConfig.ts`、`src/game/config/depthConfig.ts`；测试 `src/tests/WeatherVisualController.test.ts`。

**代码示例：**

```ts
// rainConfig.ts
export type RainLayer = 'back' | 'mid' | 'front';
export interface RainLayerConfig {
  maxAlive: number;
  frequency: number;
  lifespan: number;
  speedY: [number, number];
  speedX: [number, number];
  size: number;
  alpha: [number, number];
  depth: number;
  scrollFactor: number;
}
export const RAIN_LAYERS: Record<RainLayer, RainLayerConfig> = {
  back:  { maxAlive: 35, frequency: 90, lifespan: 900, speedY: [420, 560], speedX: [-35, -15], size: 0.65, alpha: [0.18, 0.08], depth: 3050, scrollFactor: 0.72 },
  mid:   { maxAlive: 85, frequency: 45, lifespan: 700, speedY: [620, 780], speedX: [-60, -30], size: 0.9, alpha: [0.38, 0.16], depth: 3060, scrollFactor: 0.88 },
  front: { maxAlive: 40, frequency: 75, lifespan: 520, speedY: [820, 980], speedX: [-90, -45], size: 1.2, alpha: [0.55, 0.20], depth: 3070, scrollFactor: 1.0 },
};
```

```ts
private rainEmitters = new Map<RainLayer, Phaser.GameObjects.Particles.ParticleEmitter>();

private createRainParticles(scale: number): void {
  this.destroyRainParticles();
  for (const [layer, cfg] of Object.entries(RAIN_LAYERS) as [RainLayer, RainLayerConfig][]) {
    const emitter = this.scene.add.particles(0, 0, 'rain_particle', {
      x: { min: 0, max: this.scene.scale.width }, y: -24,
      frequency: Math.max(20, cfg.frequency / scale), lifespan: cfg.lifespan,
      maxAliveParticles: cfg.maxAlive, quantity: 1,
      speedY: { min: cfg.speedY[0] * scale, max: cfg.speedY[1] * scale },
      speedX: { min: cfg.speedX[0], max: cfg.speedX[1] },
      scale: { start: cfg.size, end: cfg.size * 0.45 },
      alpha: { start: cfg.alpha[0], end: cfg.alpha[1] }, emitting: true,
    }).setDepth(cfg.depth).setScrollFactor(cfg.scrollFactor);
    this.rainEmitters.set(layer, emitter);
  }
}

private destroyRainParticles(): void {
  for (const emitter of this.rainEmitters.values()) emitter.destroy();
  this.rainEmitters.clear();
}
```

**逻辑测试：** `applyWeather('heavy_rain')` 两次后 emitter 数量仍为 3；切到 `clear` 后为 0；每层 `maxAliveParticles` 总和不超过质量档预算；`shutdown` 后再次应用无效；纹理只生成一次。测试不依赖真实 WebGL，使用 Phaser 工厂 mock 验证参数和 destroy 调用。

**视觉验收：** 远层细、慢、淡且不遮挡；中层形成连续雨幕；近层少量大雨丝提供前景纵深；玩家轮廓、路线和任务 marker 在暴雨中仍可识别；雨不出现一整片均匀白线或边界闪烁。

## 任务 20：按远中近景实施差异化雾化

**判断：需要改进当前雾的空间层次；不建议使用全屏 CSS `blur` 或高 alpha 灰色遮罩。**

**目标：** 远景降低对比度，中景轻度雾化，玩法层保持清晰，前景只做局部柔化；雾天仍保证角色、路线、marker 和 Prompt 可读。

**文件：** `WeatherVisualController.ts`、新增 `src/game/visual/atmospherePolicy.ts`、背景装配处 `UrbanWastelandScene.ts`。

```ts
export type AtmosphereLayer = 'far' | 'mid' | 'gameplay' | 'foreground';
export const FOG_POLICY: Record<AtmosphereLayer, { alpha: number; color: number }> = {
  far: { alpha: 0.30, color: 0xb8c4c5 },
  mid: { alpha: 0.18, color: 0xaebabc },
  gameplay: { alpha: 0.06, color: 0x9eafb2 },
  foreground: { alpha: 0.10, color: 0x87999d },
};
export function fogAlpha(layer: AtmosphereLayer, weather: WeatherType): number {
  return weather === 'fog' ? FOG_POLICY[layer].alpha : 0;
}
```

场景装配时将雾层挂到对应容器，而不是所有矩形都设为 `DEPTH_FX`；玩法层雾必须位于实体和 marker 之后或降低 alpha，React UI 不受影响。对象隐藏时同步处理主体、阴影、label、marker。

**逻辑测试：** 四层 alpha 映射稳定；`clear`、`light_rain` 返回 0；雾天 gameplay alpha 小于 far；天气切换销毁旧 fog rect 和 tween；resize 后雾层宽高更新一次，不重复累积。

**视觉验收：** 远城轮廓明显退后；中景有湿冷空气；人物脚底和可走路线不被灰幕吃掉；近景仍有形体但不抢主体；截图中不会出现四条明显的矩形带。

## 任务 21：增加湿地反光（可选增强）

**判断：可选，不是当前已证实的故障。** 只有在完成粒子预算并确认 16:9 帧率余量后实施；不做整屏镜像，也不引入 shader 作为第一版依赖。

**目标：** 仅在地面可行走区域提供低对比、受天气和昼夜影响的湿润反光，反光不得制造第二个可交互对象。

**文件：** 新增 `src/game/visual/WetGroundReflection.ts`、`atmospherePolicy.ts`、`UrbanWastelandScene.ts`、`DayNightVisualController.ts`。

```ts
export function reflectionStyle(weather: WeatherType, night: boolean) {
  const wet = weather === 'light_rain' || weather === 'heavy_rain';
  return { alpha: wet ? (night ? 0.12 : 0.08) : 0, tint: night ? 0x78909a : 0xa7c4c7 };
}

export class WetGroundReflection {
  private readonly node: Phaser.GameObjects.Rectangle;
  constructor(scene: Phaser.Scene, width: number, y: number, height: number) {
    this.node = scene.add.rectangle(width / 2, y, width, height, 0xa7c4c7, 0)
      .setDepth(40).setScrollFactor(1);
  }
  setWeather(weather: WeatherType, night: boolean): void {
    const style = reflectionStyle(weather, night);
    this.node.setFillStyle(style.tint, style.alpha);
  }
  destroy(): void { this.node.destroy(); }
}
```

**逻辑测试：** 晴天 alpha 为 0；雨天 alpha 在约定上限内；反光矩形只覆盖 ground route bounds；销毁幂等；低画质策略可以完全禁用。

**视觉验收：** 地面出现不规则感的低亮湿润带而非镜面倒影；不覆盖路线边缘、不改变碰撞、不与任务 marker 混色；关闭效果后场景仍完整可玩。

## 任务 22：建立受控粒子数量和质量档

**目标：** 用总预算而不是每个 emitter 的发射量控制性能，并在 Dev 面板可观测。

**文件：** `rainConfig.ts`、`WeatherVisualController.ts`、`DevDebugPanel.tsx`、新增 `src/game/visual/frameStats.ts`。

```ts
export type EffectsQuality = 'low' | 'medium' | 'high';
export const PARTICLE_BUDGET: Record<EffectsQuality, number> = {
  low: 80, medium: 160, high: 260,
};
export function scaleForBudget(quality: EffectsQuality): number {
  return quality === 'low' ? 0.5 : quality === 'medium' ? 1 : 1.5;
}
```

预算值是**初始候选**，不能当作目标设备实测结果；应用时把三层 `maxAliveParticles` 按档位缩放，且取整后总和不超过预算。面板显示 `aliveParticles`、emitter 数和最近 1 秒 FPS。

**逻辑测试：** 三档预算单调递增；所有 emitter 的存活上限总和不超过选定预算；重复 weather preview 不增加 emitter；关闭特效释放对象；统计采样不会在每帧触发 React 重渲染。

**视觉验收：** low 档仍有可辨识的轻雨但不出现空场；medium 是默认平衡档；high 只在稳定设备启用；降档后 UI、路线、交互时序完全不变。

## 任务 23：按层级和视口分组加载资源

**判断：需要先做分组加载，是否真正 unload 必须由性能/内存数据决定。** 当前集中 preload 并不证明已存在瓶颈；不要在 `update()` 中重复 `load.start()`，也不要未经验证加入复杂地图流式引擎。

**目标：** critical 首屏资源优先，route 资源保证可走路线，optional 装饰和 effects 延后；缺失可选资源时使用已有矩形/低成本 placeholder。

**文件：** `assetManifest.ts`、新增 `src/game/assets/assetLoadPolicy.ts`、`UrbanWastelandScene.ts`。

```ts
export const ASSET_GROUPS = {
  critical: ['industrial-wasteland-bg', 'wasteland-ground', 'repairer-male-side', 'repairer-female-side'],
  route: ['cracked-ground-tile', 'drainage-facility-damaged'],
  optional: ['wasteland-far-city', 'wasteland-mid-buildings', 'ruin-plant-cluster', 'industrial-ruins-strip'],
  effects: ['rain_particle'],
} as const;
export function shouldLoad(group: keyof typeof ASSET_GROUPS, viewportWidth: number): boolean {
  return group === 'critical' || group === 'route' || viewportWidth >= 900 || group === 'effects';
}
```

`preload()` 只注册一次队列；`create()` 之后通过 `this.load.once('complete', ...)` 加载 optional，且设置 `loadedGroups` 防重复。若实测内存和切场景时间没有问题，保留分组而不做 unload；若有问题，再增加视口 chunk 和引用计数，禁止直接销毁仍被显示对象使用的 texture。

**逻辑测试：** critical/route 在首屏队列；窄视口不加载 optional 装饰；同一组重复请求只入队一次；可选资源失败不阻断场景；卸载候选不会删除仍有引用的纹理。

**视觉验收：** 首帧先出现可走路线、玩家和核心交互物；可选装饰加载后不跳动 baseY、不改变排序；窄窗口没有空白破图；慢速网络下仍可操作核心任务。

## 任务 24：完成 16:9 帧率与视觉稳定性回归

**目标：** 在真实浏览器而不是单元测试中验证稳定性，建立修改前基线、阶段中门禁和最终回归数据。

**文件：** `src/game/visual/frameStats.ts`、`DevDebugPanel.tsx`、必要时 `gameConfig.ts`；新增测试 `src/tests/frameStats.test.ts`；验收记录放 `docs/superpowers/acceptance/`。

```ts
export interface FrameSample { timestamp: number; deltaMs: number; fps: number; }
export function summarizeFrames(samples: FrameSample[]) {
  const fps = samples.map((s) => s.fps).filter(Number.isFinite).sort((a, b) => a - b);
  if (!fps.length) return { average: 0, low1: 0, min: 0 };
  const average = fps.reduce((sum, value) => sum + value, 0) / fps.length;
  return { average, low1: fps[Math.max(0, Math.floor(fps.length * 0.01))], min: fps[0] };
}
```

**测试矩阵：** `1280×720`、`1600×900`、`1920×1080`，另测窄窗口 resize；clear/overcast/light rain/heavy rain/fog；昼夜切换；修复前后；天气 preview 进入退出；场景 shutdown/restart。

**记录指标：** 平均 FPS、1% low、最低采样 FPS、存活粒子数、emitter 数、显示对象数、首帧时间、天气切换后的 5 秒稳定性。视觉记录标签是否抖动、前景覆盖是否变化、Y-sort 是否跳层、路线是否始终可走。

**门禁建议：** 以基线为准，默认档不得因本方案下降超过 10%；若基线已低于目标设备可接受范围，不用虚构“达标”，而是记录瓶颈并关闭可选反光/近景雨。所有阈值在验收表中写明设备、浏览器和采样条件。

**视觉验收：** 三种 16:9 画布都保持同一构图意图；resize 后主体不被裁切，标签不重新堆叠；雨雾切换无残留 emitter、闪屏或透明度跳变；路线、玩家和任务 marker 在最低画质仍可辨。

---

# 5. 阶段 Gate、风险与回滚

## 5.1 阶段 Gate

- **Gate A（空间）：** 8–13 完成；所有对象有稳定 `baseY`、深度和遮挡调试信息；主路线连通性测试通过。
- **Gate B（视觉）：** 1–7、12 完成；底部重量、悬浮对象、远景对比度和重叠标签完成前后截图。
- **Gate C（交互）：** 14–18 完成；空闲、靠近、聚焦、交互中四种状态均无重复提示，任务点不依赖长文字。
- **Gate D（氛围/性能）：** 19–24 完成或明确关闭可选项；记录三种 16:9 结果和降级策略。

任何 Gate 未通过，不应将后续氛围效果视为“完成”；特别是不能用更浓的雾或更多粒子掩盖空间锚点错误。

## 5.2 风险与回滚

| 风险 | 预防 | 回滚 |
|---|---|---|
| 改坐标破坏任务/存档 | 保留业务 ID，视觉坐标单独配置 | 恢复 layout 配置，不改任务数据 |
| 透明留白导致对象仍悬浮 | 用 asset metrics 和调试锚点校准 | 回退单个 asset 的 `footOffset` |
| 前景遮挡路线 | route bounds + 碰撞连通性测试 | 降低 foreground alpha 或移除实例 |
| emitter 泄漏 | Map 统一销毁、切换幂等测试 | 关闭分层雨，恢复单层预算版 |
| 反光/流式加载导致性能下降 | 先量测再启用、配置开关 | 默认禁用 `WetGroundReflection`/unload |
| 标签状态不同步 | registry 统一管理主体/label/marker/shadow | 回退到单一 Prompt 事件但不恢复常驻标签 |

## 5.3 不应采用的修复方式

- 不通过把所有对象 `setDepth(9999)` 解决遮挡；这会破坏 Y-sort。
- 不通过整屏灰色遮罩或 CSS blur 伪造空间雾化。
- 不把 `baseY` 写成图片中心或障碍矩形中心；它只代表脚底接触点。
- 不在每帧创建/销毁 label、shadow、particle emitter。
- 不把雨的 `quantity` 当作总粒子上限；必须使用存活上限和统一预算。
- 不为可选资源失败阻断核心游戏；必须有 placeholder 或跳过策略。
- 不把湿地反光和真正的资源 unload 当成第一阶段必做项。

## 5.4 最终自检清单

- [ ] `Select-String -Path docs/superpowers/plans/2026-09-12-urban-wasteland-visual-spatial-plan.md -Pattern '^## 任务'` 返回任务 01–24，编号无缺失。
- [ ] 每个任务都明确目标、文件、代码示例、逻辑测试和视觉验收。
- [ ] 没有“待补充”“以后处理”或“类似任务 N”等占位描述。
- [ ] 所有候选坐标、alpha、粒子预算和性能阈值都标注为建议起点或验收约定，不伪装成实测事实。
- [ ] 明确区分现有实现、已观察现象、推断、可选增强和待实测优化。
- [ ] 代码示例中的新类型/函数在本任务或文件职责表中有定义。
- [ ] 文档未修改业务代码；`git status` 只显示计划文档目录的新增文件。

## 5.5 执行与验证命令

```powershell
npm run typecheck
npm test
npm run lint
npm run format:check
npm run build
```

`npm test` 若再次出现 esbuild `spawn EPERM`，应在允许创建子进程的开发环境重新执行；不能用 `--runInBand` 替代，也不能把该错误报告成测试通过。完成后保存截图、浏览器版本、设备信息和性能采样原始数据，再由视觉负责人逐 Gate 签字。

