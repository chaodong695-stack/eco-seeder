# 内容包、随机池与版本迭代

## 1. 基本原则

v0.1 不是把所有内容写入一个固定页面，而是启用第一个内容包：

```text
version.v0_1_mvp
```

后续可以在不重写核心代码的前提下更新同一张地图中的任务、副本、NPC、天气和奖励。

---

## 2. 内容包结构

```ts
interface ContentPack {
  id: string;
  schemaVersion: number;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  startAt?: string;
  endAt?: string;
  mapIds: string[];
  weatherProfileIds: string[];
  dailyTaskPoolIds: string[];
  randomTaskPoolIds: string[];
  dungeonPoolIds: string[];
  npcPoolIds: string[];
  rewardPoolIds: string[];
  assetBundleIds: string[];
}
```

---

## 3. v0.1 内容包

`version.v0_1_mvp` 包含：

- 地图：`map.urban_wasteland`
- 角色：男性/女性生态修复员
- 天气档案：城市污染气候
- 日常任务池：6 个任务
- 随机任务池：8 个任务
- NPC 池：4 类 NPC
- 副本池：3 个副本
- 奖励池：材料、种子、称号和徽章
- 社交：mock 好友、生态广场与排行榜
- 资产：城市地图、角色、NPC、天气和 UI

---

## 4. 后续版本示例

### v0.2 候鸟迁徙季

新增：

- 候鸟停留随机任务
- 夜间灯光干扰任务
- 湿地临时救助副本
- 候鸟观察图鉴
- 迁徙季限定装饰

### v0.3 暴雨与水污染

新增：

- 多阶段暴雨
- 污染径流任务
- 地下排水站扩展关卡
- 社区避险共建
- 水质监测奖励

### v0.4 生态工坊

新增：

- 棉花种植
- 轧花、纺纱、织布知识关卡
- 棉布和生态币
- 基础服装制作
- 工坊 NPC

### v0.5 社交共建

新增：

- 生态搭子
- 共建任务
- 地图参观
- 优秀治理模板
- 校园榜和好友榜

---

## 5. 随机池策略

每次生成内容时，先构建候选池：

```text
地图基础池
+ 当前启用内容包
+ 天气关联内容
+ 昼夜关联内容
+ NPC 任务池
+ 环境状态触发内容
- 冷却内容
- 最近重复内容
```

再计算权重。

---

## 6. 防重复机制

- 同一随机任务连续出现时降低权重；
- 同一副本触发后进入冷却；
- 长时间未出现的核心副本逐步提高保底概率；
- 正面与负面事件保持基本比例；
- 不允许连续多个高压灾害导致玩家无法恢复。

---

## 7. 内容配置校验

每个内容包加载时验证：

- ID 唯一；
- 引用对象存在；
- 地图与任务类型兼容；
- 副本阶段可达；
- 奖励 ID 有效；
- 资源包存在；
- 条件表达式可解析；
- 无循环依赖；
- schemaVersion 受支持。

校验失败时：

- 当前内容包禁用；
- 使用上一个有效版本；
- 记录错误；
- 不阻止基础游戏启动。

---

## 8. 内容与代码分离

允许新增内容而不修改代码的范围：

- 天气概率
- 日常任务
- 随机任务
- NPC 委托
- 副本阶段和选项
- 结果规则
- 奖励
- Agent 文本上下文
- 地图对象和资源清单

需要修改代码的情况：

- 新副本交互类型
- 新渲染系统
- 新移动机制
- 新后端能力
- 新 UI 组件类型

---

## 9. 存档兼容

存档包含：

- `saveVersion`
- `contentPackIds`
- `playerProfile`
- `mapStates`
- `inventory`
- `knowledgeEntries`
- `completedTasks`
- `completedDungeons`

版本升级时：

1. 读取旧存档；
2. 执行迁移函数；
3. 备份旧存档；
4. 验证新结构；
5. 失败则回滚。

---

## 10. 版本发布清单

每个版本必须提供：

- 版本说明
- 内容包配置
- 资源清单
- 接口变更
- 存档迁移
- 测试结果
- 已知问题
- 回滚方案
