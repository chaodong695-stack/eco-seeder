# 技术实现与架构设计

## 1. 架构目标

- v0.1 能在四天内运行和演示；
- 地图、任务、副本和版本内容配置化；
- React 与 Phaser 职责清晰；
- 规则引擎与 AI 服务分离；
- mock 数据可替换为真实后端；
- 新增内容不需要修改核心组件；
- 支持自动测试、持续构建和对象存储。

---

## 2. 推荐技术栈

### 客户端

- React
- TypeScript
- Vite
- Phaser 3
- Zustand
- CSS Modules 或 Tailwind CSS
- Zod：运行时配置校验
- Howler.js：音频管理，可选

### 测试与质量

- Vitest
- React Testing Library
- ESLint
- Prettier
- TypeScript strict
- Playwright：端到端测试，可在 P1 引入

### 云端与协作

- CNB.cool 代码仓库
- CNB.cool 对象存储
- CNB.cool 构建环境
- CodeBuddy
- CNB.cool NPC
- 静态 Web 部署或腾讯云静态托管
## 场景维度与渲染决策

v0.1 使用 Phaser 3 实现二维游戏场景。

### 逻辑层

游戏逻辑使用：

- 二维坐标；
- 二维碰撞区域；
- 二维角色移动；
- 二维交互距离；
- 二维场景边界；
- 深度值或 Y 轴排序控制遮挡。

### 视觉层

2.5D 是视觉表现方式，不代表真实三维场景。

通过以下方式营造空间感：

- 透视绘制的场景背景；
- 前景、中景和远景分层；
- 人物和物体遮挡；
- 深度排序；
- 角色在不同位置的适度比例变化；
- 光照、阴影、雾气和环境特效。

### 镜头

主场景采用轻俯视斜向第三人称表现：

- 玩家角色始终显示在场景中；
- 角色通常位于画面下方偏中区域；
- 镜头可以跟随角色进行有限二维移动；
- 镜头不围绕角色自由旋转；
- 不采用第一人称；
- 不采用真实 3D 越肩摄像机。

### 禁止范围

v0.1 不使用：

- Three.js；
- 真实三维模型；
- 3D 骨骼与三维动画管线；
- 自由旋转三维摄像机；
- 三维物理系统；
- 三维开放世界。

Phaser 使用 WebGL 渲染不代表项目属于 3D 游戏，项目运行逻辑仍为二维。

---

## 3. 分层架构

```text
React 产品层
├── 页面与 HUD
├── 角色选择
├── 任务/AI/NPC 面板
├── 社交与生态广场
└── 设置与资源加载提示

Phaser 游戏层
├── 地图渲染
├── 玩家/NPC 移动
├── 碰撞与交互
├── 天气与昼夜
├── 副本场景
└── 环境视觉状态

领域逻辑层
├── 规则引擎
├── 任务生成
├── 副本状态机
├── 天气生成
├── 奖励与评级
└── 地图状态转换

服务适配层
├── AgentService
├── SocialService
├── StorageService
├── AssetService
└── TelemetryService

内容配置层
├── maps
├── weatherProfiles
├── tasks
├── dungeons
├── npcs
├── rewards
└── versions
```

---

## 4. React 与 Phaser 通信

使用类型安全的 Event Bus，不允许组件直接访问 Phaser 内部对象。

事件示例：

- `GAME_READY`
- `PLAYER_INTERACT`
- `TASK_ACCEPTED`
- `TASK_COMPLETED`
- `NPC_DIALOG_OPEN`
- `AGENT_HELP_REQUESTED`
- `DUNGEON_STARTED`
- `DUNGEON_COMPLETED`
- `MAP_STATE_UPDATED`
- `WEATHER_CHANGED`
- `OPEN_ECO_SQUARE`

React 负责 UI，Phaser 负责场景，领域服务负责业务判断。

---

## 5. 推荐目录结构

```text
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
├── game/
│   ├── bootstrap/
│   ├── scenes/
│   ├── entities/
│   ├── systems/
│   ├── effects/
│   ├── input/
│   └── bridge/
├── domain/
│   ├── map/
│   ├── weather/
│   ├── task/
│   ├── dungeon/
│   ├── npc/
│   ├── reward/
│   ├── scoring/
│   └── agent/
├── services/
│   ├── agent/
│   ├── social/
│   ├── storage/
│   ├── asset/
│   └── telemetry/
├── content/
│   ├── maps/
│   ├── weather/
│   ├── tasks/
│   ├── dungeons/
│   ├── npcs/
│   ├── rewards/
│   └── versions/
├── ui/
│   ├── pages/
│   ├── components/
│   ├── overlays/
│   └── styles/
├── store/
├── types/
├── utils/
└── tests/
```

---

## 6. 模块职责

### `game/`

只处理：

- 渲染
- 移动
- 碰撞
- 交互点
- 动画
- 粒子
- 场景切换

不得包含任务奖励、评分公式和 Agent 文本逻辑。

### `domain/`

处理纯业务逻辑：

- 天气生成
- 任务权重
- 副本状态机
- 状态变化
- 评分与奖励
- 情境化结果

领域逻辑应尽量写成纯函数，便于测试。

### `services/`

提供外部能力，通过接口注入：

- mock AI / 真实 AI
- mock 社交 / 真实社交
- localStorage / 云存储
- 本地资源 / 对象存储

### `content/`

保存版本化数据。组件不得直接内置地图、任务、副本和奖励数组。

---

## 7. 状态管理

Zustand 建议拆分 Store：

- `sessionStore`
- `playerStore`
- `worldStore`
- `taskStore`
- `dungeonStore`
- `uiStore`
- `socialStore`

不要建立一个过大的 `gameState` 单例。

持久化内容：

- 已观看视频
- 角色选择
- 玩家基础进度
- 地图状态
- 已完成知识条目
- 设置

临时内容：

- 当前弹窗
- 当前副本阶段
- 当前路径提示
- 粒子和动画状态

---

## 8. 随机性

使用可复现随机种子：

```text
seed = playerId + gameDay + mapId + versionId
```

用途：

- 当日天气
- 日常任务抽取
- 随机任务
- 副本参数
- NPC 出现

优点：

- 便于调试
- 便于复现 bug
- 避免刷新页面反复刷随机结果

---

## 9. 规则引擎

建议流程：

```text
输入：
玩家选择 + 地图状态 + 天气 + 昼夜 + 历史 + 设施

→ 条件匹配
→ 修正权重
→ 计算状态变化
→ 生成结构化 Result
→ 发放奖励
→ 由 AgentService 解释 Result
```

结构化结果示例：

```ts
interface ActionResult {
  outcomeCode: string;
  severity: "low" | "medium" | "high";
  stateDelta: Partial<MapState>;
  rewardIds: string[];
  reasonCodes: string[];
  followUpTaskIds?: string[];
}
```

---

## 10. AI 服务

定义统一接口：

```ts
interface AgentService {
  explainTask(context: AgentTaskContext): Promise<AgentResponse>;
  explainOptions(context: AgentOptionContext): Promise<AgentResponse>;
  generateReview(context: AgentReviewContext): Promise<AgentResponse>;
}
```

v0.1 使用 `MockAgentService`。

后续真实模型通过 `RemoteAgentService` 替换，不修改 UI 和领域规则。

安全要求：

- 输入使用结构化上下文；
- 输出经过 schema 校验；
- 科普内容可引用审核知识条目；
- 不让模型决定奖励或分数；
- 请求失败时使用本地模板回退。

---

## 11. 资源加载

资源清单独立管理：

```ts
interface AssetManifest {
  version: string;
  baseUrl: string;
  bundles: AssetBundle[];
}
```

资源分包：

- `core-ui`
- `urban-wasteland`
- `weather-effects`
- `character-male`
- `character-female`
- `dungeon-rescue`
- `dungeon-rainstorm`
- `dungeon-drainage`

启动只加载核心 UI 和当前地图所需资源。

---

## 12. 性能策略

- 视口外对象暂停动画
- 粒子数量按画质调整
- 背景使用 WebP
- Texture Atlas 减少 Draw Calls
- 大图按场景分包
- 雾和光照效果提供降级路径
- 避免在 React 高频同步角色坐标
- 游戏帧内状态留在 Phaser
- React 只接收低频摘要状态

---

## 13. 错误与日志

统一错误类型：

- `ContentValidationError`
- `AssetLoadError`
- `AgentServiceError`
- `StorageError`
- `DungeonStateError`

开发环境记录：

- seed
- mapId
- versionId
- 当前天气
- 任务池
- 规则 reasonCodes

生产模式不记录敏感信息。

---

## 14. 代码质量规则

1. TypeScript 开启 strict。
2. 禁止 `any`，确需使用时必须注明原因。
3. 单文件建议不超过 300 行。
4. 组件只做展示和交互绑定。
5. 领域逻辑使用纯函数和单元测试。
6. 外部服务通过接口和依赖注入。
7. 配置加载时使用 Zod 校验。
8. 新增地图、副本必须附带配置测试。
9. PR 不混合无关重构。
10. 每个公共接口都在 `05_INTERFACE_CONTRACTS.md` 更新。
