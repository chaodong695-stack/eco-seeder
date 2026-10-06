# Minimum Governance Loop Implementation Plan

**Goal:** 在独立工作树实现用户确认的监测、处理、修复、复测、结算和继续游戏闭环。
**Architecture:** 配置定义六个操作及方案；治理 Store 管理阶段和可验证存档，环境 Store 管理模拟效果；React 操作面板与 Phaser 专用场景通过区域状态和返回事件协作。
**Tech Stack:** React 18, TypeScript, Zustand, Phaser 3, Vitest.
**Execution:** 当前会话按顺序实现；完成后按代码审查技能要求进行独立只读复核。

- [x] 数据与状态：新增 `src/domain/governance/governanceDefinitions.ts`、`src/store/governanceStore.ts`，先写 `src/tests/governanceStore.test.ts`；验证门控、选择、两秒执行、六次完整流程、重复效果、重载和损坏存档。运行 `npm.cmd run test -- src/tests/governanceStore.test.ts`，先确认失败，再实现。
- [x] 会话：新增 `src/game/session/governanceRegion.ts`；修改 StartPage、CharacterSelectPage、GamePage、resetWorldSession；开始、继续、离开与清空分离；StartPage 组件测试验证继续和确认新游戏。
- [x] 操作 UI：新增 `GovernancePanel.tsx`、`GovernancePanel.module.css`；阶段 HUD、区域点位、方案、持续执行、结果、结算；组件测试验证释放/失焦中止、错误方案反馈和重复执行。
- [x] 场景路由：修改三个视频场景的 create/shutdown 区域状态；GameBridge 注册返回请求；UrbanWastelandScene 正常 E 入口接通、主线与每日任务门控分离、恢复主地图视觉；调整过时专用场景模拟测试。
- [x] 验证：全量 `npm.cmd run test`、`npm.cmd run build`、修改文件 ESLint。工作树独立 Vite 端口 3001，浏览器通过 NPC 与普通入口验证全链；检查错误选择、释放中止、重入防重复、刷新继续、新游戏确认和响应式布局。
- [x] 交付：保存验证记录、列明已知限制，提供工作树路径、分支和预览地址；不合并原分支。
