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

## 2. 推荐仓库目录

```text
/
├── docs/
│   ├── product/
│   ├── gameplay/
│   ├── visual/
│   ├── architecture/
│   ├── interfaces/
│   └── decisions/
├── src/
├── public/
├── content/
├── tests/
├── scripts/
├── .cnb/
└── README.md
```

大体积原始素材放对象存储，仓库保存：

- 压缩运行资源
- 资源清单
- 来源和授权说明
- 对象存储 URL
- 版本号和哈希

---

## 3. 分支策略

- `main`：稳定演示版本
- `develop`：集成分支
- `feature/<name>`：功能
- `content/<name>`：内容包
- `art/<name>`：视觉资产
- `fix/<name>`：Bug
- `docs/<name>`：文档

禁止多个 NPC 同时直接修改同一分支。

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

输出：

- 概念图
- 分层资产参考
- 角色与 NPC
- AI 助手
- 天气与场景状态

人工需要检查：

- 透视一致
- 光照一致
- 版权与风格风险
- 是否可拆分
- 是否含不可用文字

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
