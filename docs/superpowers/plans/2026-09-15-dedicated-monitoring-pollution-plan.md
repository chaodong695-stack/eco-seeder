# 环境监测与污染物堆专属地图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为环境监测装置和污染物堆增加两个由配置驱动的专属地图入口，同时保持其余主地图交互行为不变。

**Architecture:** 用一个通用专属地图上下文保存来源场景、交互点和返回位置；用地图注册表把两个交互点路由到两个通用场景。主场景只在交互配置声明目标地图，并保留污染任务前置条件。

**Tech Stack:** TypeScript, Phaser 3, Zustand, Vitest

---

### Task 1: 建立地图配置和路由契约

**Files:**
- Create: `src/game/session/dedicatedMapTransition.ts`
- Create: `src/content/maps/dedicatedMaps.ts`
- Modify: `src/game/interaction/interactionTypes.ts`
- Modify: `src/game/interaction/interactionObjects.ts`
- Test: `src/tests/dedicatedMaps.test.ts`

- [ ] **Step 1: 写失败测试**

测试两个地图定义、两个交互点映射、未知地图拒绝，以及上下文保存和清理。

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test -- src/tests/dedicatedMaps.test.ts`
预期：因新配置和上下文 API 尚不存在而失败。

- [ ] **Step 3: 实现最小配置与上下文**

增加 `targetMapId?: string`，定义 `DEDICATED_MAPS`，并实现通用 `createDedicatedMapContext/getDedicatedMapContext/clearDedicatedMapContext`。保留现有修复地图 API 不变。

- [ ] **Step 4: 运行测试确认通过**

运行：`npm test -- src/tests/dedicatedMaps.test.ts`
预期：通过。

- [ ] **Step 5: 提交**

```bash
git add src/game/session/dedicatedMapTransition.ts src/content/maps/dedicatedMaps.ts src/game/interaction/interactionTypes.ts src/game/interaction/interactionObjects.ts src/tests/dedicatedMaps.test.ts
git commit -m "feat: add dedicated map configuration contract"
```

### Task 2: 增加两个通用专属场景

**Files:**
- Create: `src/game/scenes/EnvironmentMonitoringScene.ts`
- Create: `src/game/scenes/PollutionCleanupScene.ts`
- Modify: `src/game/bootstrap/gameConfig.ts`
- Test: `src/tests/dedicatedSceneConfig.test.ts`

- [ ] **Step 1: 写失败测试**

验证两个 Scene key 已注册，且场景配置能根据上下文显示对应地图类型和交互点。

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test -- src/tests/dedicatedSceneConfig.test.ts`
预期：因两个场景和注册项不存在而失败。

- [ ] **Step 3: 实现占位场景**

两个场景使用 Phaser 占位背景、标题、地图说明和返回提示；监听 ESC；关闭时移除监听器。场景从通用上下文读取 `targetMapId` 和 `interactionId`。

- [ ] **Step 4: 注册场景并运行测试**

运行：`npm test -- src/tests/dedicatedSceneConfig.test.ts`
预期：通过。

- [ ] **Step 5: 提交**

```bash
git add src/game/scenes/EnvironmentMonitoringScene.ts src/game/scenes/PollutionCleanupScene.ts src/game/bootstrap/gameConfig.ts src/tests/dedicatedSceneConfig.test.ts
git commit -m "feat: add monitoring and pollution dedicated scenes"
```

### Task 3: 接入主场景交互路由

**Files:**
- Modify: `src/game/scenes/UrbanWastelandScene.ts`
- Test: `src/tests/dedicatedInteractionRouting.test.ts`

- [ ] **Step 1: 写失败测试**

验证监测装置直接路由；污染物堆只有在清理任务 active 时路由；其他交互不产生专属地图路由。

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test -- src/tests/dedicatedInteractionRouting.test.ts`
预期：路由函数不存在或行为不符合新规则而失败。

- [ ] **Step 3: 实现主场景路由**

在污染物堆现有任务判断之后增加专属地图路由；监测装置直接进入监测场景；统一保存玩家坐标并 `launch` 目标场景、暂停当前场景。污染物堆不绕过现有任务门槛。

- [ ] **Step 4: 运行相关测试**

运行：`npm test -- src/tests/dedicatedInteractionRouting.test.ts src/tests/remoteRepairMap.test.ts`
预期：通过。

- [ ] **Step 5: 提交**

```bash
git add src/game/scenes/UrbanWastelandScene.ts src/tests/dedicatedInteractionRouting.test.ts
git commit -m "feat: route monitoring and pollution interactions"
```

### Task 4: 回归验证

**Files:**
- No new production files

- [ ] **Step 1: 运行类型检查**

运行：`npm run typecheck`
预期：退出码 0。

- [ ] **Step 2: 运行完整测试**

运行：`npm test`
预期：全部测试通过。

- [ ] **Step 3: 运行构建**

运行：`npm run build`
预期：退出码 0，生成 `dist`。

- [ ] **Step 4: 检查差异**

运行：`git diff --check` 和 `git status --short`，确认没有由本功能意外修改的文件。
