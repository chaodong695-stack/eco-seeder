# Eco Seeder

一款以环境保护为主题的网页养成游戏。玩家通过完成生态治理任务、与 NPC 互动、恢复区域生态环境，逐步了解污染治理、资源循环和可持续发展的基本知识。

## 当前阶段

M0：工程骨架阶段。已建立可运行、可测试、可扩展的基础工程。

## 技术栈

- React 18 + TypeScript（strict 模式）
- Vite 6
- Phaser 3（二维游戏场景，2.5D 仅视觉表现）
- Zustand（状态管理）
- CSS Modules + CSS Variables Design Tokens
- Howler.js（音频管理骨架）
- Zod（运行时配置校验，预留）
- Vitest + React Testing Library（单元测试与组件测试）
- ESLint + Prettier
- npm（包管理器）

## 安装与启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 检查命令

```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 代码检查
npm run lint

# Prettier 格式检查
npm run format:check

# 运行测试
npm run test

# 运行测试（带覆盖率）
npm run test:coverage
```

## 页面流程

```text
开始页面
→ 角色选择页面
→ 选择男性或女性占位角色
→ 主游戏场景（UrbanWastelandScene）
→ 返回开始页面
```

## 工程目录

```text
src/
├── app/                # 应用入口与路由
├── game/               # Phaser 游戏层
│   ├── bootstrap/      # 游戏配置与实例管理
│   ├── scenes/         # Phaser 场景
│   └── bridge/         # Phaser-React 事件桥接
├── domain/             # 领域逻辑层（预留）
├── services/           # 服务适配层
│   ├── agent/          # AI 生态助手（MockAgentService）
│   ├── asset/          # 资源清单
│   └── audio/          # 音频管理骨架
├── content/            # 内容配置层
│   └── maps/           # 地图定义
├── ui/                 # UI 组件层
│   ├── pages/          # 页面组件
│   ├── components/     # 通用组件
│   └── styles/         # 全局样式与 Design Tokens
├── store/              # Zustand 状态管理
├── types/              # TypeScript 类型定义
└── tests/              # 测试文件

public/assets/          # 运行时资源
├── placeholders/       # 占位资源
├── maps/               # 地图资源
├── characters/         # 角色资源
├── npc/                # NPC 资源
├── robots/             # 机器人资源
├── ui/                 # UI 资源
├── icons/              # 图标资源
├── effects/            # 特效资源
├── audio/              # 音频资源
└── manifests/          # 资源清单
    ├── assets.manifest.json
    └── audio.manifest.json
```

## v0.1 主地图身份

| 字段 | 固定值 | 含义 |
|---|---|---|
| `id` | `map.urban_wasteland` | 程序内部地图 ID |
| `sceneKey` | `UrbanWastelandScene` | Phaser 场景注册键 |
| `displayName` | 雾港旧工业区 | 玩家看到的正式地图名称 |
| `type` | `urban_wasteland` | 地图主题分类 |
| `primaryRegionId` | `region.industrial_wetland_restoration` | 主要可玩区域 ID |

## 项目文档

- [文档总览](ecoseeder_docs/00_README.md)
- [游戏概念与产品定位](ecoseeder_docs/01_GAME_CONCEPT.md)
- [玩法、任务与内容设计](ecoseeder_docs/02_GAMEPLAY_AND_CONTENT.md)
- [视觉、UI 与体验设计](ecoseeder_docs/03_VISUAL_UX_DIRECTION.md)
- [技术实现与架构设计](ecoseeder_docs/04_TECHNICAL_ARCHITECTURE.md)
- [接口契约与扩展规范](ecoseeder_docs/05_INTERFACE_CONTRACTS.md)
- [内容包与版本迭代](ecoseeder_docs/06_CONTENT_AND_VERSIONING.md)
- [开发任务](ecoseeder_docs/07_DEVELOPMENT_TASKS.md)
- [CodeBuddy 与 NPC 协作](ecoseeder_docs/08_CNB_CODEBUDDY_COLLAB.md)
- [验收与测试](ecoseeder_docs/09_ACCEPTANCE_AND_TESTING.md)
- [开场视频分镜](ecoseeder_docs/10_INTRO_VIDEO_SCRIPT.md)
- [共享 Agent 上下文](ecoseeder_docs/11_SHARED_AGENT_CONTEXT.md)
- [NPC 协作规则](ecoseeder_docs/12_NPC_COLLABORATION_RULES.md)
- [音频与配音规范](ecoseeder_docs/13_AUDIO_AND_VOICE_DESIGN.md)
- [v0.1 美术方向](ecoseeder_docs/14_ART_DIRECTION_BIBLE_v0.1.md)

## 开发原则

1. 需求文档、接口文档和代码同步维护。
2. 页面、游戏逻辑、数据层和外部服务解耦。
3. 所有功能通过独立分支开发，并通过合并请求进入主分支。
4. 优先完成可运行的 MVP，再逐步补充动画、NPC 智能和高级视觉效果。
