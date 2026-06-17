# NPC 协作与变更控制规范

## 1. 基本原则

所有 NPC 均为辅助工具，不是项目负责人、产品负责人或最终决策者。

NPC 可以：

- 阅读项目文档；
- 分析问题并提出建议；
- 生成候选设计或素材；
- 在明确授权后实现限定范围内的代码；
- 对代码、视觉资源和音频资源进行检查。

NPC 不可以：

- 自行改变游戏主题和公益目标；
- 自行增加或删除核心玩法；
- 自行重构已确定的技术架构；
- 自行修改接口契约和数据结构；
- 自行覆盖已确认的视觉规范；
- 直接向 main 分支提交代码；
- 未经确认批量删除或替换项目文件。

## 2. 变更流程

所有重要变更必须遵循：

NPC 提案
→ 人工审查
→ 明确批准
→ 创建功能分支
→ CodeBuddy 实施
→ 测试
→ Pull Request
→ 人工合并

## 3. 文件权限

### 只读文件

以下文件默认只允许 NPC 阅读，不允许直接修改：

- ecoseeder_docs/01_GAME_CONCEPT.md
- ecoseeder_docs/02_GAMEPLAY_AND_CONTENT.md
- ecoseeder_docs/03_VISUAL_UX_DIRECTION.md
- ecoseeder_docs/04_TECHNICAL_ARCHITECTURE.md
- ecoseeder_docs/05_INTERFACE_CONTRACTS.md
- ecoseeder_docs/09_ACCEPTANCE_AND_TESTING.md
- ecoseeder_docs/14_ART_DIRECTION_BIBLE_v0.1.md

如确需修改，必须先在 Issue 中说明：

- 修改原因；
- 修改位置；
- 对其他模块的影响；
- 向后兼容性；
- 验收方法。

## 4. NPC 输出要求

NPC 每次执行任务时必须说明：

1. 阅读了哪些文档；
2. 发现了什么问题；
3. 建议修改什么；
4. 是否影响已有设计；
5. 创建或修改了哪些文件；
6. 如何验证结果；
7. 是否存在未解决的问题。
8. NPC 发现美术规范存在问题时，只能在 Issue 中提出修改建议。 
9. 未经项目负责人确认，NPC 不得： 
                            - 修改整体美术方向； 
                            - 将概念图直接作为正式资产； 
                            - 替换已经确认的地图风格； 
                            - 将 UI、文字和人物绘制进地图背景； 
                            - 扩大 v0.1 美术资产范围。