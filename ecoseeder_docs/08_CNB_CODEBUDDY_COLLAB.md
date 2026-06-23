# CNB.cool、CodeBuddy 与 NPC 协作规范

## 1. 协作目标

使用 CNB.cool 承载：

- 代码仓库
- Issue
- 分支和 PR
- 对象存储
- 构建
- NPC 协作
- CodeBuddy 开发

NPC 用于设计、审查和资产辅助；CodeBuddy 负责工程落地。任何 NPC 输出均需人工审查。

---

## 2. 仓库目录与文件职责

项目采用“正式规范、开发记录、运行代码、内容数据和运行资源相互分离”的目录结构。

```text
/
├── ecoseeder_docs/
│   ├── 00_README.md
│   ├── 01_GAME_CONCEPT.md
│   ├── 02_GAMEPLAY_AND_CONTENT.md
│   ├── 03_VISUAL_UX_DIRECTION.md
│   ├── 04_TECHNICAL_ARCHITECTURE.md
│   ├── 05_INTERFACE_CONTRACTS.md
│   ├── 06_CONTENT_AND_VERSIONING.md
│   ├── 07_DEVELOPMENT_TASKS.md
│   ├── 08_CNB_CODEBUDDY_COLLAB.md
│   ├── 09_ACCEPTANCE_AND_TESTING.md
│   ├── 10_INTRO_VIDEO_SCRIPT.md
│   ├── 11_SHARED_AGENT_CONTEXT.md
│   ├── 12_NPC_COLLABORATION_RULES.md
│   ├── 13_AUDIO_AND_VOICE_DESIGN.md
│   ├── 14_ART_DIRECTION_BIBLE_v0.1.md
│   └── decisions/
├── docs/
│   └── codebuddy-history/
├── src/
├── public/
│   └── assets/
│       ├── placeholders/
│       ├── maps/
│       ├── characters/
│       ├── npc/
│       ├── robots/
│       ├── ui/
│       ├── icons/
│       ├── effects/
│       ├── audio/
│       └── manifests/
├── content/
│   ├── maps/
│   ├── regions/
│   ├── tasks/
│   ├── events/
│   ├── dungeons/
│   ├── npc/
│   ├── dialogue/
│   └── rewards/
├── tests/
├── scripts/
├── .cnb/
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

### 2.1 `ecoseeder_docs/`

`ecoseeder_docs/` 是项目正式规范的唯一存放位置。

该目录用于保存：

* 产品定位；
* 游戏玩法；
* 视觉与交互规范；
* 技术架构；
* 接口契约；
* 开发任务；
* 测试与验收标准；
* NPC 和 CodeBuddy 协作约束；
* 美术与音频规范。

不得再创建以下第二套正式文档目录：

```text
docs/product/
docs/gameplay/
docs/visual/
docs/architecture/
docs/interfaces/
```

如需修改 `ecoseeder_docs/01—14` 的正式规范，必须：

```text
提出修改原因
→ 创建文档分支
→ 修改正式文档
→ 创建合并请求
→ 人工评审
→ 合并至 main
```

CodeBuddy、NPC 和其他 Agent 未经明确授权不得直接修改正式规范。

### 2.2 `ecoseeder_docs/decisions/`

`ecoseeder_docs/decisions/` 用于保存架构决策记录，即 ADR。

文件命名示例：

```text
ADR-001-use-phaser3.md
ADR-002-use-css-modules.md
ADR-003-map-rendering-strategy.md
```

ADR 只记录已经人工确认的重要决策，不用于保存普通讨论、临时候选方案或 NPC 原始回复。

每份 ADR 至少应包括：

* 决策背景；
* 候选方案；
* 最终决定；
* 决定原因；
* 影响范围；
* 后续约束；
* 决策日期和状态。

### 2.3 `docs/codebuddy-history/`

`docs/codebuddy-history/` 用于保存与 CodeBuddy 和其他 NPC 的开发对话、任务索引和参赛所需协作记录。

该目录可以保存：

* 导出的历史对话；
* Issue 与对话的对应关系；
* 对应开发分支；
* Commit ID；
* 合并请求编号；
* 人工接受或拒绝 AI 建议的记录。

该目录不是正式产品规范。发生冲突时，以 `ecoseeder_docs/` 中的正式文档为准。

### 2.4 `src/`

`src/` 用于保存可执行的前端和游戏逻辑代码，包括：

* React 页面和界面组件；
* Phaser 场景；
* 状态管理；
* 任务和事件逻辑；
* 服务层；
* 资源加载器；
* 类型定义；
* 工具函数。

具体目录以 `04_TECHNICAL_ARCHITECTURE.md` 为准。

### 2.5 `public/assets/`

`public/assets/` 只保存网页运行时直接加载的资源。

资源类型包括：

* 地图运行资源；
* 人物和 NPC 运行资源；
* UI 和图标；
* 特效；
* 音频运行文件；
* Manifest；
* 开发阶段占位资源。

正式地图、玩家角色、NPC、UI 和交互物必须使用独立资源路径，不得合并成一张不可替换的完整游戏截图。

### 2.6 `content/`

`content/` 用于保存可配置的游戏内容数据，不保存 React 或 Phaser 业务代码。

包括：

* 地图与区域配置；
* 任务；
* 随机事件；
* 副本配置；
* NPC 配置；
* 对话；
* 奖励池。

内容数据优先使用 JSON、YAML 或 TypeScript 配置，具体格式以接口契约为准。

`content/` 中的配置必须满足 `05_INTERFACE_CONTRACTS.md`，不得自行创造与正式接口不一致的数据结构。

### 2.7 `tests/`

`tests/` 用于保存：

* 单元测试；
* 组件测试；
* 游戏逻辑测试；
* 内容配置校验；
* 必要的集成测试。

测试文件也可以与源码共置，但整个项目必须采用统一策略，不能一部分集中、一部分随意散放。

### 2.8 大体积和原始美术素材

大体积原始素材原则上不直接进入 Git 仓库，例如：

* 分层 PSD；
* 分层 KRA；
* 大尺寸无压缩图片；
* WAV 音频母版；
* 视频工程文件；
* 大型原始动画文件。

这些文件应保存到项目指定的对象存储或素材归档位置。

Git 仓库中保存：

* 网页运行所需的压缩资源；
* 资源 Manifest；
* 素材来源；
* 授权或版权说明；
* 对象存储位置；
* 版本号；
* 文件哈希；
* 必要的缩略图或预览图。

不得提交来源不明或版权状态不明确的素材。

### 2.9 目录变更约束

CodeBuddy 或 NPC 不得自行：

* 新建第二套正式文档目录；
* 移动 `ecoseeder_docs/`；
* 将正式规范迁移到 `docs/`；
* 改变资源目录职责；
* 将大体积原始素材批量提交到 Git；
* 删除既有目录而不说明迁移方案。

如果当前任务确实需要调整目录结构，必须先在 Issue 中说明原因和影响，等待人工确认。

---

## 3. 分支与合并请求策略

项目不设置长期 `develop` 分支。

所有任务从最新的 `main` 创建独立分支，并通过合并请求进入受保护的 `main`。

### 3.1 分支类型

```text
main
feature/*
fix/*
docs/*
art/*
content/*
```

各分支职责如下：

| 分支格式             | 用途                | 示例                              |
| ---------------- | ----------------- | ------------------------------- |
| `main`           | 稳定、可构建、可演示版本      | `main`                          |
| `feature/<name>` | 功能开发              | `feature/project-scaffold`      |
| `fix/<name>`     | 缺陷修复              | `fix/task-panel-state`          |
| `docs/<name>`    | 正式文档或说明更新         | `docs/align-v0.1-scope`         |
| `art/<name>`     | 已批准的运行时美术资产集成     | `art/main-map-placeholders`     |
| `content/<name>` | 任务、事件、NPC、对话等内容配置 | `content/animal-rescue-dungeon` |

不得创建长期使用的：

```text
develop
dev
test
npc-work
```

等集成分支。

### 3.2 `main` 分支规则

`main` 是受保护分支，必须满足：

* 禁止直接 Push；
* 禁止强制 Push；
* 禁止删除；
* 所有修改必须通过合并请求；
* 合并前必须人工检查；
* 配置状态检查后，检查失败不得合并；
* NPC 创建的合并请求不得自动合并；
* CodeBuddy 不得修改或重写 `main` 历史。

### 3.3 分支创建规则

开始任务前，应基于最新 `main` 创建分支：

```bash
git switch main
git pull origin main
git switch -c <branch-name>
```

分支名称应反映实际任务，不使用：

```text
test
new
temp
work
update
```

等含义不清的名称。

推荐示例：

```text
feature/project-scaffold
feature/character-selection
feature/npc-dialogue
fix/audio-state-reset
docs/update-interface-contracts
art/industrial-wetland-placeholders
content/storm-waste-demo
```

### 3.4 一个任务对应一个分支

原则上：

```text
一个 Issue
→ 一个明确任务
→ 一个工作分支
→ 一个合并请求
```

不得将以下无关修改混入同一分支：

* 文档体系重构；
* 游戏功能开发；
* 大规模美术替换；
* 内容包新增；
* 无关依赖升级。

如果实施过程中发现任务明显超出原 Issue 范围，应停止扩展并创建新的 Issue 和分支。

### 3.5 NPC 和 CodeBuddy 分支规则

任何具有写入权限的 NPC 或 CodeBuddy 都必须：

1. 从最新 `main` 创建独立分支；
2. 在 Issue 中报告分支名称；
3. 只修改任务允许的目录；
4. 提交清晰的 Commit；
5. 推送工作分支；
6. 创建合并请求；
7. 等待人工评审；
8. 不得自动合并。

禁止多个 NPC 同时修改同一分支。

禁止两个 Agent 同时处理高度重叠的文件范围。

如多个 Agent 参与同一功能，应采用顺序协作：

```text
设计或审查 NPC 提出方案
→ 人工确认
→ CodeBuddy 编写代码
→ 测试或审查 Agent 检查
→ 人工合并
```

### 3.6 各类分支的修改边界

#### `feature/*`

允许修改：

* `src/`；
* 必要的测试；
* 必要的项目配置；
* 已批准的占位资源；
* 根 README 中与运行相关的说明。

未经授权不得修改 `ecoseeder_docs/01—14`。

#### `fix/*`

只修复明确缺陷，不同时进行大型重构、功能扩展或美术改版。

#### `docs/*`

用于修改：

* `ecoseeder_docs/`；
* 根目录 README；
* ADR；
* CodeBuddy 历史索引。

文档分支不得顺带实现游戏功能。

#### `art/*`

只集成已经人工批准的运行时美术资源、Manifest 和必要的资源加载适配。

不得在此类分支中自行改变整体美术方向。

不得使用已被人工否决的 Image NPC 候选图作为正式资产。

#### `content/*`

用于修改任务、事件、副本、NPC、对话和奖励等配置。

内容配置必须符合 `05_INTERFACE_CONTRACTS.md`，不得通过内容分支修改核心引擎代码。

### 3.7 Commit 规则

推荐使用清晰的 Conventional Commits：

```text
feat: initialize character selection flow
fix: prevent duplicate task rewards
docs: align v0.1 scope definitions
art: add approved main map placeholders
content: add animal rescue dungeon configuration
test: add map state transition tests
chore: configure lint and typecheck
```

一次 Commit 应对应一个明确目的。

不要使用：

```text
update
modify
test
final
new
123
```

等无法说明内容的提交信息。

### 3.8 合并请求要求

合并请求至少需要说明：

* 对应 Issue；
* 修改目的；
* 修改文件范围；
* 已实现内容；
* 未实现内容；
* 测试或检查命令；
* 测试结果；
* 风险和限制；
* 截图或演示证据；
* 是否修改正式规范。

合并前必须检查：

* 是否越过 Issue 范围；
* 是否直接修改受保护文档；
* 是否引入未批准的依赖；
* 是否误用正式美术资产；
* 是否通过类型检查、Lint、测试和构建；
* 是否存在密钥、令牌或敏感信息；
* 是否能够正常回滚。

### 3.9 分支清理

合并请求合并后，可以删除对应远程工作分支。

删除前应确认：

* 合并已经完成；
* 所有必要 Commit 已进入 `main`；
* 对话和开发记录已经归档；
* 不存在尚未迁移的素材或配置。


---

## 4. Issue 模板

每个 Issue 必须包含：

1. 背景
2. 目标
3. 范围
4. 非目标
5. 相关文档
6. 接口影响
7. 验收标准
8. 截图或参考
9. 测试要求
10. 风险和回滚

---

## 5. PR 规范

PR 描述必须说明：

- 改了什么
- 为什么改
- 涉及哪些模块
- 是否修改接口
- 是否修改内容 schema
- 测试结果
- 性能影响
- 截图
- 已知问题
- 回滚方式

代码审查重点：

- 是否写死内容
- 是否越过模块边界
- 是否把规则放进组件
- 是否有无效资源
- 是否破坏存档
- 是否降低可访问性
- 是否引入明显性能回退

---

## 6. NPC 分工

### UI/UX Pro Max

输出：

- Design Tokens
- HUD 结构
- 组件状态
- 桌面/移动适配
- 可访问性建议
- 截图复审报告

不得让其直接重写核心游戏逻辑。

### Image NPC

当前停用，不承担地图、人物、NPC 或整体美术方向设计。

历史输出只作为被否决候选方案保留。
如后续重新启用，只允许执行裁剪、扩图和简单图片后处理。

### Icon NPC

输出：

- SVG
- React 组件
- 命名和尺寸

不用于复杂多色稀有物品。

### CodeBuddy

负责：

- 工程代码
- 接口实现
- 单元测试
- 构建修复
- 资产接入
- 性能优化
- PR

---

## 7. 项目专属 NPC

可建立“生态播种者视觉与架构审查 NPC”，其知识库包含：

- 世界观
- 玩法边界
- Design Tokens
- 技术架构
- 接口契约
- 目录规范
- 禁止事项
- v0.1 范围

该 NPC 主要做审查，不直接决定产品需求。

---

## 8. 决策记录

重大决定写入：

```text
docs/decisions/ADR-XXXX-title.md
```

示例：

- 使用 React + Phaser
- 不接真实天气 API
- AI 不决定游戏结果
- 使用内容包版本化
- 昼夜跟随真实时间
- v0.1 使用 mock 社交

ADR 包含：

- 背景
- 决定
- 备选方案
- 结果
- 后续影响

---

## 9. NPC 输出落库方式

设计输出必须转化为可维护文件：

```text
docs/visual/design-system.md
docs/visual/ui-review.md
src/ui/styles/tokens.css
content/assets/manifest.json
```

不要把重要决定只留在 Issue 评论或聊天记录中。

---

## 10. 构建检查

每次 PR 自动运行：

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

P1 可增加：

- Playwright
- Bundle size 检查
- Lighthouse
- 资源哈希校验
