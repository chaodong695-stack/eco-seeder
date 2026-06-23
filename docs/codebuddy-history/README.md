# CodeBuddy 开发对话索引

本目录用于保存 Eco Seeder 项目开发过程中与 CodeBuddy 的历史对话，并建立对话记录、开发任务、Git 分支、代码提交和合并请求之间的对应关系。

## 对话记录对应关系

| 编号 | 开发任务 | 对话记录 | Git 分支 | Commit | 合并请求 | 状态 |
|---|---|---|---|---|---|---|
| 01 | 项目需求审查 | [01-requirement-review.md](./01-requirement-review.md) | `docs/requirement-review` | 待填写 | 待填写 | 未开始 |
| 02 | 技术架构设计 | [02-technical-architecture.md](./02-technical-architecture.md) | `docs/technical-architecture` | 待填写 | 待填写 | 未开始 |
| 03 | 前端工程初始化 | [03-project-scaffold.md](./03-project-scaffold.md) | `feature/project-scaffold` | 待填写 | 待填写 | 未开始 |
| 04 | 开场概念视频 | [04-opening-video.md](./04-opening-video.md) | `feature/opening-video` | 待填写 | 待填写 | 未开始 |
| 05 | 角色选择系统 | [05-character-selection.md](./05-character-selection.md) | `feature/character-selection` | 待填写 | 待填写 | 未开始 |
| 06 | NPC 随机任务系统 | [06-npc-task-system.md](./06-npc-task-system.md) | `feature/npc-task-system` | 待填写 | 待填写 | 未开始 |
| 07 | 游戏场景与地图 | [07-game-scene.md](./07-game-scene.md) | `feature/game-scene` | 待填写 | 待填写 | 未开始 |
| 08 | 状态保存与数据持久化 | [08-data-persistence.md](./08-data-persistence.md) | `feature/data-persistence` | 待填写 | 待填写 | 未开始 |
| 09 | 测试与问题修复 | [09-testing-and-fixes.md](./09-testing-and-fixes.md) | `test/system-testing` | 待填写 | 待填写 | 未开始 |
| 10 | 构建与部署 | [10-build-and-deployment.md](./10-build-and-deployment.md) | `chore/deployment` | 待填写 | 待填写 | 未开始 |

## 状态说明

- 未开始：尚未建立 CodeBuddy 对话。
- 进行中：对话及开发任务正在进行。
- 已完成：代码、测试和对话记录均已归档。
- 已合并：对应分支已通过合并请求进入 `main`。

## 归档要求

每次完成一个开发任务后，应完成以下工作：

1. 导出或整理对应的 CodeBuddy 历史对话。
2. 将对话保存为本目录下的 Markdown 文件。
3. 填写对应的 Git 分支名称。
4. 填写最终 Commit ID。
5. 填写 CNB 合并请求编号。
6. 将任务状态更新为“已完成”或“已合并”。