> [!WARNING]
> 本文件仅作为历史汇总和阅读副本，不是当前项目的需求基线。
> 项目开发以 00_README.md 以及 01—11 号拆分文档为准。
> 禁止 AI Agent 或 NPC 直接依据本文件修改项目设计。


# 《生态播种者》v0.1 完整协同开发文档


---

<!-- Source: 00_README.md -->

# 《生态播种者》v0.1 协同开发文档集

## 1. 文档用途

本目录用于统一《生态播种者》v0.1 的产品、玩法、视觉、技术、接口、版本内容和开发验收标准，供以下参与者共同使用：

- 产品与玩法设计人员
- CodeBuddy
- CNB.cool NPC
- 前端与游戏逻辑开发人员
- UI/UX 与美术资产人员
- 测试与路演人员

本项目当前不是一次性页面 Demo，而是一个**可运行的 v0.1 内容包和可持续扩展的游戏框架**。v0.1 只开放一张地图和有限内容，但地图、任务、副本、天气、奖励、角色、NPC、社交、版本活动和 AI 服务都必须通过独立模块与接口扩展。

---

## 2. 项目一句话定义

> 《生态播种者》是一款发生在污染加剧未来世界中的 AI 公益生态修复游戏。玩家在随真实昼夜、模拟天气、生态状态和历史行为持续变化的地图中完成治理、救助、避险与建设任务；AI 负责提供情境化科普和风险解释，但最终选择及其后果由玩家承担。

---

## 3. v0.1 核心目标

v0.1 的目标不是做完完整商业游戏，而是交付一个能够证明下列设计成立的高完成度原型：

1. 玩家可以在二维地图中移动和互动。
2. 地图具有真实时间驱动的昼夜变化。
3. 游戏内部生成符合地图气候与污染状态的模拟天气。
4. 每个游戏日生成日常任务、随机任务和条件触发副本。
5. 同一选择在不同环境状态下产生不同后果。
6. AI 生态助手只提供科普、风险与复盘，不替玩家决策。
7. 玩家治理行为会改变地图状态、视觉表现和后续事件难度。
8. 系统预留好友协助、地图参观、生态广场和排行榜接口。
9. 代码可维护、配置化、解耦，并支持后续内容包迭代。

---

## 4. v0.1 最小闭环

```text
启动游戏
→ 播放 20—30 秒世界观概念视频
→ 玩家选择男性或女性生态修复员
→ 进入 urban_wasteland
→ 读取真实昼夜并生成当日模拟天气
→ 从日常任务池中抽取任务
→ 玩家移动、与环境或 NPC 互动
→ 完成日常任务并改变地图状态
→ 状态、天气和历史行为触发随机任务
→ 满足条件时进入随机副本
→ 玩家可选择咨询 AI 生态助手
→ 规则引擎计算情境化后果
→ AI 生成科普与复盘
→ 更新生态修复度、地图视觉和奖励
→ 展示好友协助、生态广场等社交入口
→ 进入下一游戏日
```

---

## 5. 文档索引

| 文件 | 主要内容 |
|---|---|
| `01_GAME_CONCEPT.md` | 世界观、定位、角色、开场视频、长期产品结构 |
| `02_GAMEPLAY_AND_CONTENT.md` | 核心循环、地图、天气、任务、副本、NPC、AI 科普形式 |
| `03_VISUAL_UX_DIRECTION.md` | 美术风格、HUD、场景分层、动画、性能与资产规范 |
| `04_TECHNICAL_ARCHITECTURE.md` | React + Phaser 架构、模块边界、状态流、目录结构 |
| `05_INTERFACE_CONTRACTS.md` | 地图、任务、副本、天气、Agent、社交和资源接口契约 |
| `06_CONTENT_AND_VERSIONING.md` | 内容包、版本活动、配置结构、随机池和兼容策略 |
| `07_DEVELOPMENT_TASKS.md` | 四天开发计划、P0/P1/P2、人员/NPC 分工 |
| `08_CNB_CODEBUDDY_COLLAB.md` | CNB.cool NPC 与 CodeBuddy 协作方式、分支和 PR 规范 |
| `09_ACCEPTANCE_AND_TESTING.md` | 功能验收、视觉验收、性能、测试和演示脚本 |
| `10_INTRO_VIDEO_SCRIPT.md` | 20—30 秒概念视频分镜与文案 |
| `11_SHARED_AGENT_CONTEXT.md` | 供 CodeBuddy 和 CNB NPC 读取的统一项目上下文 |

---

## 6. 不可破坏的设计边界

1. **天气使用游戏内部模拟，不接入现实天气 API。**
2. **昼夜默认取决于真实设备时间，但提供演示切换。**
3. **规则引擎决定结果，AI 只解释与辅助。**
4. **重要选择不使用固定“正确答案”。**
5. **任务、副本、地图和奖励不能写死在 React/Phaser 场景组件中。**
6. **v0.1 可以使用 mock 社交数据，但接口结构必须接近真实后端。**
7. **充值外观不得影响生态评分、治理效率、排行榜或公益贡献。**
8. **自然保护类内容强调低干预，不把所有地图都做成基建玩法。**
9. **视觉优先达到统一、有氛围、可读，而不是堆叠大量高成本特效。**
10. **新增功能必须通过配置或独立服务扩展，避免重写核心循环。**

---

## 7. 技术基线

- 前端产品层：React + TypeScript + Vite
- 游戏场景层：Phaser 3
- 状态管理：Zustand
- 样式：CSS Modules 或 Tailwind CSS，二者择一并保持统一
- 测试：Vitest + React Testing Library
- 格式与质量：ESLint + Prettier + TypeScript strict
- 素材：WebP、PNG、Texture Atlas、OGG/MP3
- 资源托管：CNB.cool 对象存储
- 构建与协作：CNB.cool + CodeBuddy + NPC + PR 工作流

---

## 8. 当前范围外

以下内容只保留接口或展示入口，不进入 v0.1 核心开发：

- 真实账号登录与好友关系
- 实时多人联机
- 真实充值和支付
- 完整角色换装商城
- 现实公益机构资金结算
- 多地图正式开放
- 大规模后端排行榜
- 本地大模型部署
- 3D 开放世界


---

<!-- Source: 01_GAME_CONCEPT.md -->

# 游戏概念与产品定位

## 1. 游戏名称

暂定名称：**《生态播种者》**

v0.1 副标题：**城市污染荒地修复计划**

---

## 2. 游戏类型

- 公益类生态修复游戏
- 轻科幻生态废土
- 2D/2.5D 地图探索
- 养成、建设、任务与轻量副本
- AI 情境化科普
- 异步社交与成果展示

---

## 3. 世界观

人类长期忽视环境保护，过度生产、错误治理和资源浪费使生态系统逐步跨越承载边界。未来城市并未彻底毁灭，但大量区域失去正常生态功能：

- 空气中长期存在污染颗粒和工业粉尘；
- 地表水系统受化学物、塑料和废弃设备污染；
- 城市排水设施老化；
- 土壤积累重金属和有机污染；
- 原生植物和动物栖息地被破坏；
- 自动化设备大量废弃；
- 居民仍然生活在城市周边，但公共治理能力不足。

为阻止生态退化继续扩散，各地建立“生态修复员”计划。玩家作为新加入的修复员，携带 AI 生态助手进入退化区域，通过观察、治理、救助、建设和协作恢复当地生态功能。

世界观不是“人类已经消失”的末日，而是“仍有机会修复”的近未来生态危机。画面应同时包含压迫感与希望感。

---

## 4. 核心价值主张

传统环保宣传常停留在知识问答或口号层面。《生态播种者》将环保知识转化为可操作的游戏机制：

- 暴雨不是固定灾难，其后果取决于排水和污染状态；
- 投喂动物不是绝对正确或错误，其风险取决于动物和环境；
- 建设设施并非越多越好，自然保护区需要低干预；
- 同一治理方式在不同地图、天气和生态阶段下效果不同；
- 玩家必须观察环境、理解风险并承担长期后果。

AI 不替玩家回答，而是帮助玩家理解环境信息。

---

## 5. 开场体验

### 5.1 20—30 秒概念视频

首次启动时播放概念视频，内容包括：

1. 地球是人类赖以生存的家园；
2. 城市扩张、工业污染和资源浪费不断累积；
3. 当人类忽视自然，天空、水体和土地逐渐失去生命力；
4. 画面切换到未来污染城市；
5. 一株植物从废墟裂缝中生长；
6. AI 生态助手发出信号；
7. 玩家接过“生态修复员”身份；
8. 标题出现：《生态播种者》。

视频可跳过，已观看用户后续默认不自动播放，但设置中允许重新观看。

### 5.2 角色选择

视频结束后进入角色创建页：

- 男性生态修复员
- 女性生态修复员

v0.1 仅在形象、头像、基础动画和称谓上不同，不设置能力差异，避免性别与数值绑定。

后续可扩展：

- 肤色
- 发型
- 基础服装
- 名称
- 语音
- 生态工坊获得服饰
- 付费限定外观

角色模型必须通过 `characterId` 加载，不把男性或女性资源写死在场景中。

---

## 6. 玩家身份与成长

玩家身份：生态修复员。

长期成长维度：

- 生态知识
- 手工与维修
- 救助能力
- 环境监测
- 社区影响力
- 现实行动者等级
- 不同地图的治理专长

v0.1 只显示：

- 修复员等级
- 生态声望
- 当前地图评级
- 已解锁生态知识条目
- 获得的种子、材料、称号和徽章

---

## 7. 长期游戏结构

### 7.1 地图治理

不同地图提供不同治理逻辑：

- 城市污染区：清理、排水、监测、生态基建
- 农田退化区：土壤修复、轮作、水肥和生态种植
- 湿地保护区：水质、水位、候鸟和栖息地
- 自然保护区：巡护、监测、救助与低干预
- 荒漠修复区：节水、防风固沙和耐旱植物

### 7.2 生态工坊

自然原料通过学习和加工转化为材料：

```text
棉花
→ AI 讲解轧花、纺纱与织布
→ 完成轻量知识关卡
→ 获得棉布
→ 制作基础服饰或出售获得生态币
```

生态产出服饰体现玩家经历，付费服饰体现审美和收藏，两者价值并存但不影响战力。

### 7.3 社交展示

- 好友协助修复
- 生态搭子、共建伙伴和救助搭档
- 地图参观
- 公益标签
- 优秀治理方案
- 生态广场
- 校园榜、城市榜、好友榜和物种守护榜

生态评分由系统指标主导，玩家点赞只作为社交权重，避免拉票替代治理。

---

## 8. v0.1 地图

地图 ID：`urban_wasteland`

名称：城市污染荒地 / 雾港旧工业区

区域：

1. 修复员营地
2. 废弃垃圾场
3. 污染水渠
4. 旧社区绿地
5. 废弃工厂边缘

地图污染不只有垃圾，还包括：

- 空气污染
- 水污染
- 土壤毒性
- 固体废物
- 排水能力不足
- 基础设施风险
- 栖息地破碎
- 社区支持不足

---

## 9. v0.1 情绪曲线

游戏不应始终压抑，也不能一开始就过度治愈。

推荐节奏：

```text
进入污染城市：陌生、压迫
→ 完成第一个小任务：可行动
→ 发现环境因选择发生变化：有反馈
→ 遭遇随机事件和副本：紧张
→ AI 解释与复盘：理解
→ 第一处绿色恢复：希望
→ NPC 和好友开始出现：连接
→ 地图评级提升：成就
```

---

## 10. 核心设计原则

1. 公益知识由机制承载，不独立做成题库。
2. 玩家有选择权，也必须承担结果。
3. AI 提供信息，不提供唯一正确路线。
4. 地图治理应改变未来事件，而不是只改变数字。
5. 随机内容必须受环境状态约束。
6. 建设、种植、救助和社交应服务于生态主题。
7. 所有长期系统必须能通过内容包迭代。


---

<!-- Source: 02_GAMEPLAY_AND_CONTENT.md -->

# 玩法、任务与内容设计

## 1. v0.1 核心循环

```text
进入地图
→ 查看昼夜、天气和任务
→ 移动到目标区域
→ 与环境或 NPC 互动
→ 完成日常任务
→ 更新地图内部生态状态
→ 触发随机任务或副本
→ 玩家自主行动，可请求 AI 辅助
→ 规则引擎计算后果
→ AI 生成科普与复盘
→ 更新地图视觉、奖励和评级
```

---

## 2. 玩家操作

桌面端：

- `WASD` / 方向键：移动
- `E`：互动
- `Shift`：短距离冲刺
- `Q`：打开 AI 生态助手
- `M`：地图
- `J`：任务
- `Esc`：暂停/设置

触屏端：

- 左下角虚拟方向轮盘
- 右下角互动按钮
- 右下角冲刺按钮
- AI 助手悬浮入口

不设置攻击按键。

---

## 3. 昼夜系统

昼夜默认依据玩家设备时间：

| 时段 | 时间 |
|---|---|
| 清晨 | 06:00—10:00 |
| 白天 | 10:00—17:00 |
| 黄昏 | 17:00—20:00 |
| 夜晚 | 20:00—06:00 |

昼夜影响：

- 场景光照和色温
- 能见度
- 动物出现权重
- 夜间巡查风险
- 灯光和照明设施
- NPC 出现时间
- 部分任务权重

演示模式必须允许手动切换昼夜，但正式模式默认真实时间。

---

## 4. 模拟天气

游戏不接入真实天气 API。

天气由下列因素生成：

- 地图气候档案
- 虚构季节阶段
- 前一阶段天气
- 当前污染状态
- 地图生态韧性
- 版本活动
- 可复现随机种子

一天可包含 2—4 个天气阶段，例如：

```text
清晨：污染雾
中午：多云
傍晚：暴雨
夜间：小雨
```

v0.1 天气建议：

1. 多云
2. 污染雾
3. 小雨
4. 暴雨
5. 高温晴天
6. 强风
7. 毒尘

天气本身不等于灾害。灾害后果由地图状态决定，例如：

- 暴雨 + 排水良好：蓄水、植物收益
- 暴雨 + 排水堵塞：内涝、污染径流
- 强风 + 固废较少：轻微影响
- 强风 + 粉尘与垃圾高：毒尘和废物扩散

---

## 5. 地图内部状态

前台简化显示：

- 污染控制
- 植被恢复
- 生物多样性
- 生态声望
- 综合修复度

内部状态至少包括：

- `airPollution`
- `waterContamination`
- `soilToxicity`
- `solidWaste`
- `drainageCapacity`
- `habitatSafety`
- `infrastructureSafety`
- `publicSupport`
- `vegetation`
- `biodiversity`
- `disturbance`
- `predatorRisk`
- `rescueSpeed`
- `naturalFood`

重要任务和副本使用内部状态计算，不依赖单一污染总分。

---

## 6. 日常任务池

v0.1 设计 6 个日常任务，每个游戏日抽取 3 个。

### 6.1 分类清理废弃物

可能地点：垃圾场、旧社区、工厂边缘。

变化参数：

- 普通垃圾
- 电子垃圾
- 危险化学容器
- 可回收材料
- 天气导致的扩散程度

### 6.2 清理排水口

影响：

- 提高排水能力
- 降低暴雨副本难度
- 可能发现污染来源

### 6.3 种植先锋植物

根据土壤和天气决定：

- 成活率
- 是否需要土壤预处理
- 是否适合本地环境
- 是否提高栖息地安全

### 6.4 维护水质监测器

作用：

- 解锁水体精确状态
- 提前发现污水回流
- 改善地下排水站副本的信息条件

### 6.5 修复空气传感器

作用：

- 显示污染雾、毒尘和风向
- 在恶劣天气中提供提前预警

### 6.6 维护生态设施

对象：

- 雨水花园
- 昆虫旅馆
- 鸟巢箱
- 安全标识
- 临时庇护点

---

## 7. 随机任务池

v0.1 设计 8 个随机任务：

1. 非法倾倒的新垃圾堆
2. 污水管道突然回流
3. 外来植物快速扩散
4. 毒性粉尘监测异常
5. 废弃净水设备断电
6. 发现动物活动痕迹
7. 志愿者送来修复材料
8. 发现旧种子库或本地植物种子

随机任务触发依据：

```text
地图适用性
× 当前天气
× 昼夜
× 生态状态权重
× 玩家历史行为
× 版本内容包
× 冷却与重复惩罚
× 保底机制
```

---

## 8. NPC 随机任务系统

### 8.1 NPC 类型

v0.1 建议至少出现 4 类 NPC：

1. **老维修师**：设备、排水和监测任务
2. **社区志愿者**：垃圾、居民参与和物资任务
3. **流动研究员**：物种观察、植物识别和数据任务
4. **巡护员**：动物救助、捕兽夹和安全任务

### 8.2 NPC 触发方式

- NPC 在特定区域和时间段出现；
- 部分 NPC 受天气影响；
- 玩家接近后出现互动提示；
- NPC 可提供日常任务，也可触发随机任务；
- NPC 任务内容从任务池配置中选择；
- NPC 不直接等同于固定任务脚本。

### 8.3 NPC 任务示例

暴雨前，老维修师可能请求：

- 清理排水口；
- 检查水泵；
- 将过滤材料运送到地下排水站。

夜间，巡护员可能请求：

- 检查动物活动痕迹；
- 寻找被破坏的栖息地围栏；
- 处理疑似捕兽夹线索。

### 8.4 NPC 关系

v0.1 仅记录信任值，不实现复杂好感剧情。信任值可影响：

- 任务信息完整度
- 物资奖励
- 救助响应速度
- 后续副本入口

---

## 9. 随机副本池

v0.1 实现 3 个副本。

### 9.1 受伤动物救助

类型：情境决策。

阶段：

1. 发现动物与观察环境；
2. 玩家选择处理方式；
3. 等待或执行处理；
4. 结算与 AI 复盘。

动态参数：

- 动物种类
- 受伤程度
- 污染水平
- 天敌风险
- 自然食物
- 栖息地安全
- 救助响应速度
- 人类干扰

同一个“投喂后离开”在不同环境下结果不同。

### 9.2 污染暴雨突袭

类型：移动避险。

玩法：

- 天空变暗、警报出现；
- 玩家观察水流、地势和安全标志；
- 在倒计时内前往安全区域；
- 避开低洼污染积水、裸露电路和坠落物；
- 可选择绕路关闭阀门或救助动物；
- 之前修复的设施改变路线和难度。

科普形式：

- 逃生中只显示短提示与环境标记；
- 副本后由 AI 复盘；
- 不在移动过程中显示长篇文字。

### 9.3 地下排水站抢修

类型：轻量解谜。

玩法：

- 读取传感器数据；
- 判断污染来源；
- 选择阀门关闭顺序；
- 分配有限过滤材料；
- 防止将污染转移到其他区域。

AI 只解释水流和风险，不直接给出完整顺序。

---

## 10. AI 科普的四种表现形式

### 10.1 即时短提示

示例：

- 前方低洼区域正在积水。
- 当前风向将毒尘推向东侧。
- 裸露电路可能与积水形成复合风险。

### 10.2 可选咨询面板

内容结构：

1. 科普背景
2. 当前环境状态
3. 各选项风险
4. 不确定因素
5. 最终选择由玩家决定

### 10.3 环境标记

AI 可短暂标记：

- 高风险区域
- 污染源
- 风向
- 水流
- 可用设施

不得标出唯一正确路线。

### 10.4 任务后复盘

记录：

- 玩家行动
- 实际结果
- 决定结果的关键状态
- 新知识条目
- 后续治理建议

---

## 11. 规则引擎与 AI 的边界

规则引擎负责：

- 任务触发
- 概率权重
- 状态变化
- 副本成败
- 奖励
- 地图评级

AI 负责：

- 将当前状态转化为可理解文本
- 提供科普
- 解释风险
- 说明结果原因
- 总结复盘

任何排行榜和奖励结果不得由大模型自由决定。

---

## 12. 社交展示接口

v0.1 使用 mock 实现：

- 3 个好友协助
- 生态广场入口
- 模拟排行榜
- 地图参观按钮
- 系统评分
- 玩家评分占位
- 公益标签

后续真实实现时，好友可：

- 浇水
- 清理垃圾
- 协助巡查
- 赠送种子
- 参与共建副本
- 参观与留言

---

## 13. v0.1 完成条件

玩家能够：

1. 看完或跳过开场视频；
2. 选择男性或女性角色；
3. 进入地图并移动；
4. 看到真实昼夜和模拟天气；
5. 接受 NPC 或系统任务；
6. 完成至少 3 类日常任务；
7. 触发随机任务；
8. 触发至少 1 个随机副本；
9. 在副本中使用 AI 科普；
10. 看到环境状态和视觉变化；
11. 获得奖励和地图评级；
12. 进入生态广场展示页。


---

<!-- Source: 03_VISUAL_UX_DIRECTION.md -->

# 视觉、UI 与体验设计规范

## 1. 目标视觉

视觉目标：

半写实数字绘景的后工业生态修复风格，
采用 2.5D 游戏空间表现、写实污染材质、
低饱和冷灰蓝绿色调和温和近未来生态科技元素。

目标效果接近当前概念图：

- 大场景具有空间深度；
- 环境污染细节清晰；
- 绿色恢复形成强烈对比；
- HUD 具有轻科幻质感；
- UI 不遮挡主要玩法；
- AI 助手具有独立视觉身份。

若 CNB.cool NPC 无法达到要求，可使用自定义美术资产、CSS、Phaser Shader/BlendMode、粒子和后处理实现。

---

## 2. 色彩方向

### 污染阶段

- 深灰蓝
- 冷青
- 脏棕
- 暗橄榄绿
- 少量危险橙红

### 修复阶段

- 苔藓绿
- 青绿色
- 柔和天蓝
- 暖白
- 低饱和金色

### 科技 UI

- 深色半透明面板
- 青绿色描边
- 冷白文字
- 少量琥珀色警示
- 禁止满屏紫色霓虹和高饱和赛博朋克

---

## 3. 场景分层

建议 Phaser 场景分为：

1. 远景城市天际线
2. 工厂与高架
3. 中景建筑
4. 地面和水渠
5. 可交互物件
6. 角色与 NPC
7. 植物、垃圾和前景遮挡
8. 天气粒子
9. 光照与污染滤镜
10. React HUD

必须至少拆分：

- 不可交互背景
- 障碍与碰撞层
- 可交互对象
- 天气特效
- 修复状态物件

禁止直接把带 UI 文字的整张生成图作为游戏画面。

---

## 4. 主界面信息层级

### 常驻信息

顶部：

- 当前时段
- 当前天气
- 地图名称
- 主要生态指标
- 设置

左侧可折叠：

- 当前日常任务
- 随机事件
- NPC 委托

右侧按需展开：

- AI 生态助手
- 环境监测详情

底部：

- 互动
- AI 助手
- 好友协助
- 生态手册
- 地图

移动端应减少常驻面板，使用图标和抽屉。

---

## 5. 角色与 NPC

### 玩家角色

v0.1 两套基础形象：

- 男性生态修复员
- 女性生态修复员

需要动作：

- 待机
- 4 方向行走
- 冲刺
- 互动

每组先控制在 4—8 帧，使用 Texture Atlas。

### AI 助手

建议为悬浮机械精灵或小型修复机器人：

- 中性形象
- 蓝绿色显示面
- 可呈现扫描、提醒和情绪状态
- 不采用夸张拟人化表情
- 面板展开时保留角色头像或小动画

### NPC

NPC 轮廓需一眼区分职业：

- 维修师：工具、旧式防护服
- 志愿者：轻便装备、物资包
- 研究员：便携传感器
- 巡护员：户外装备、照明设备

---

## 6. 天气表现

| 天气 | 视觉方式 |
|---|---|
| 多云 | 云层移动、柔和阴影 |
| 污染雾 | 半透明滚动雾层、能见度降低 |
| 小雨 | 低密度雨线、轻微水面波纹 |
| 暴雨 | 高密度雨线、暗化、积水与闪电 |
| 高温晴天 | 热浪扭曲、强光和干燥地面 |
| 强风 | 垃圾碎屑、植物摆动、风向线 |
| 毒尘 | 低速颗粒、黄灰滤镜、警示标记 |

提供高、中、低画质：

- 高：粒子、波纹、动态滤镜完整
- 中：降低粒子和分辨率
- 低：使用轻量贴图动画和静态遮罩

---

## 7. 地图修复视觉反馈

地图至少呈现三个阶段：

### 阶段 0：退化

- 固废和电子垃圾明显
- 水面油膜
- 空气灰暗
- 植被稀少
- 设施失效

### 阶段 1：初步修复

- 垃圾减少
- 监测器恢复
- 排水口清理
- 出现苔藓和先锋植物

### 阶段 2：稳定恢复

- 水体改善
- 植物覆盖增加
- 昆虫和鸟类出现
- 志愿者和 NPC 活动增加
- 环境光线略变暖

v0.1 不要求整张地图完全重绘，可通过独立图层和物件状态切换实现。

---

## 8. 概念视频视觉

20—30 秒视频使用：

- 2D 动态分镜
- 镜头推拉
- 图层视差
- 污染扩散动画
- 文字与旁白
- 最后一株植物发光
- 游戏 Logo

优先采用轻量 MP4/WebM，不在游戏运行时实时渲染复杂视频。

---

## 9. UI 组件规范

所有 React UI 组件应使用统一 Design Tokens：

- 背景透明度
- 圆角
- 边框宽度
- 发光强度
- 字号
- 间距
- 警告色
- 成功色
- 焦点状态
- 禁用状态

关键组件：

- `StatusBar`
- `WeatherWidget`
- `TaskPanel`
- `NpcDialog`
- `AgentPanel`
- `EventModal`
- `RewardModal`
- `EcoSquareCard`
- `CharacterSelectCard`
- `QualitySettings`

---

## 10. 可访问性

- 正文最小字号不低于 14 px
- 重要文字与背景保持足够对比
- 不只依靠颜色表达危险
- 提供字幕
- 提供音量控制
- 提供减少动态效果选项
- 键盘可操作主要 UI
- 任务关键文本支持简体中文

---

## 11. 资产规范

| 资源 | 建议 |
|---|---|
| 设计画布 | 1920×1080 |
| 实际视口 | 1280×720 或响应式 |
| 地图块 | 128×128 / 256×256 |
| 背景与普通素材 | WebP |
| 透明角色与物件 | PNG 或透明 WebP |
| 动画 | Texture Atlas |
| 音乐 | OGG/MP3 |
| 音效 | OGG |
| 单张贴图 | 尽量不超过 2048×2048 |
| 初始资源包 | 尽量控制在 40 MB 内 |

大资产上传对象存储，Git 中保存压缩版本、清单和源文件路径说明。

---

## 12. 视觉验收标准

1. 第一眼能看出“未来污染城市”和“生态修复”。
2. HUD 不应遮挡玩家和主要路径。
3. AI 面板按需展开，不长期占据大面积屏幕。
4. 角色、NPC、机器人和环境风格一致。
5. 天气变化在 3 秒内可辨认。
6. 地图修复前后具有明显但合理的视觉差异。
7. 1080p 桌面端无明显糊图。
8. 中等画质在 GTX 1650 上稳定接近 60 FPS。
9. 低画质能在集成显卡或普通浏览器中运行。


---

<!-- Source: 04_TECHNICAL_ARCHITECTURE.md -->

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


---

<!-- Source: 05_INTERFACE_CONTRACTS.md -->

# 接口契约与扩展规范

## 1. 文档目的

本文件定义模块之间的稳定接口。任何影响接口的修改必须：

1. 更新本文件；
2. 更新类型定义；
3. 增加或修改测试；
4. 在 PR 描述中说明兼容性；
5. 必要时提升接口版本。

---

## 2. 通用约定

所有实体必须包含：

```ts
interface BaseEntity {
  id: string;
  version: number;
  tags?: string[];
}
```

ID 命名建议：

```text
map.urban_wasteland
task.daily.clear_drain
dungeon.rescue_hedgehog
npc.maintenance_master
reward.seed.rare_cotton
version.v0_1_mvp
```

禁止使用中文作为内部 ID。

---

## 3. 地图接口

### 3.1 地图定义

地图的程序 ID、场景键、玩家可见名称、主题类型和主要区域必须明确区分，不得将其理解为多张不同地图。

```ts
interface MapDefinition extends BaseEntity {
  /**
   * 玩家在界面中看到的正式地图名称。
   *
   * v0.1 固定为：雾港旧工业区
   */
  displayName: string;

  /**
   * 地图主题分类。
   *
   * v0.1 使用 urban_wasteland，
   * 对应中文概念“城市污染荒地”。
   *
   * 该字段是分类，不是另一张地图名称。
   */
  type: MapType;

  /**
   * 地图背景和玩法定位说明。
   */
  description: string;

  /**
   * Phaser 场景注册键。
   *
   * v0.1 固定为：UrbanWastelandScene
   */
  sceneKey: string;

  /**
   * 地图中的主要可玩区域 ID。
   *
   * v0.1 固定为：
   * region.industrial_wetland_restoration
   */
  primaryRegionId: string;

  /**
   * 地图采用的气候配置。
   */
  climateProfileId: string;

  /**
   * 地图包含的全部区域。
   *
   * regions 中必须存在一个 id 与 primaryRegionId 相同的区域。
   */
  regions: MapRegionDefinition[];

  /**
   * 新存档或地图首次加载时使用的初始环境状态。
   */
  initialState: MapState;

  /**
   * 日常任务池。
   */
  dailyTaskPoolIds: string[];

  /**
   * 随机任务或随机事件池。
   */
  randomTaskPoolIds: string[];

  /**
   * 副本与特殊事件池。
   *
   * v0.1 包含：
   * - 受伤动物救助完整副本；
   * - 暴雨垃圾扩散简化演示；
   * - 地下排水站简化演示。
   */
  dungeonPoolIds: string[];

  /**
   * 当前地图可投放的 NPC 池。
   */
  npcPoolIds: string[];

  /**
   * 地图通用奖励池。
   */
  rewardPoolId: string;

  /**
   * 地图解锁条件。
   */
  unlockCondition?: ConditionExpression;
}
```

`MapDefinition` 继承的 `BaseEntity.id` 直接作为地图 ID 使用，不再单独定义 `mapId`。

v0.1 的地图身份固定为：

| 字段                | 固定值                                     | 含义                |
| ----------------- | --------------------------------------- | ----------------- |
| `id`              | `map.urban_wasteland`                   | 程序内部地图 ID         |
| `sceneKey`        | `UrbanWastelandScene`                   | Phaser 场景注册键      |
| `displayName`     | `雾港旧工业区`                                | 玩家看到的正式地图名称       |
| `type`            | `urban_wasteland`                       | 地图主题分类，对应“城市污染荒地” |
| `primaryRegionId` | `region.industrial_wetland_restoration` | 主要可玩区域 ID         |

主要区域的玩家可见名称固定为：

```text
废弃工业湿地修复区
```

因此：

* “雾港旧工业区”是地图名称；
* “城市污染荒地”是地图主题分类；
* “废弃工业湿地修复区”是地图内部区域；
* 三者不得被实现为三张独立地图。

### 3.2 v0.1 地图身份常量

实现阶段建议使用统一常量，禁止在多个组件中重复硬编码地图名称。

```ts
const V0_1_MAIN_MAP_IDENTITY = {
  id: "map.urban_wasteland",
  sceneKey: "UrbanWastelandScene",
  displayName: "雾港旧工业区",
  type: "urban_wasteland",
  primaryRegionId: "region.industrial_wetland_restoration",
} as const;
```

该常量用于说明 v0.1 的固定配置，不代表 `MapDefinition` 只能支持一张地图。后续版本新增地图时，应创建新的 `MapDefinition` 数据，而不是修改本接口结构。

### 3.3 地图区域要求

`MapRegionDefinition` 中应通过 `id` 和 `displayName` 区分区域标识与玩家可见名称。

如现有 `MapRegionDefinition` 尚未包含 `displayName`，应调整为：

```ts
interface MapRegionDefinition extends BaseEntity {
  /**
   * 玩家看到的区域名称。
   */
  displayName: string;

  /**
   * 区域功能或环境说明。
   */
  description: string;

  /**
   * 区域类型。
   */
  type: MapRegionType;

  /**
   * 区域边界、碰撞区或交互范围配置。
   */
  bounds: RegionBounds;

  /**
   * 区域内可使用的交互点。
   */
  interactionPointIds: string[];
}
```

v0.1 主要区域的配置关系为：

```ts
const PRIMARY_REGION_ID =
  "region.industrial_wetland_restoration";

const PRIMARY_REGION_DISPLAY_NAME =
  "废弃工业湿地修复区";
```

`MapDefinition.primaryRegionId` 必须指向 `regions` 中该区域的 `id`，不能直接保存中文名称。

### 3.4 地图环境状态

```ts
interface MapState {
  /**
   * 空气污染程度，0—100，数值越高表示污染越严重。
   */
  airPollution: number;

  /**
   * 水体污染程度，0—100，数值越高表示污染越严重。
   */
  waterContamination: number;

  /**
   * 土壤毒性，0—100，数值越高表示污染越严重。
   */
  soilToxicity: number;

  /**
   * 固体废物累积程度，0—100，数值越高表示垃圾越多。
   */
  solidWaste: number;

  /**
   * 排水能力，0—100，数值越高表示排水能力越好。
   */
  drainageCapacity: number;

  /**
   * 栖息地安全程度，0—100，数值越高表示越安全。
   */
  habitatSafety: number;

  /**
   * 基础设施安全程度，0—100，数值越高表示越安全。
   */
  infrastructureSafety: number;

  /**
   * 公众支持程度，0—100，数值越高表示支持度越高。
   */
  publicSupport: number;

  /**
   * 植被恢复程度，0—100，数值越高表示植被越丰富。
   */
  vegetation: number;

  /**
   * 生物多样性水平，0—100，数值越高表示多样性越高。
   */
  biodiversity: number;

  /**
   * 人类或环境扰动程度，0—100，数值越高表示扰动越严重。
   */
  disturbance: number;

  /**
   * 捕食者或其他动物风险，0—100，数值越高表示风险越高。
   */
  predatorRisk: number;

  /**
   * 动物救助响应效率，0—100，数值越高表示救助速度越快。
   */
  rescueSpeed: number;

  /**
   * 野生动物可获得的自然食物水平，
   * 0—100，数值越高表示自然食物越充足。
   */
  naturalFood: number;
}
```

所有数值在写入状态前必须限制在 `0—100` 范围内。

### 3.5 地图视觉阶段

地图视觉阶段是根据 `MapState` 计算得到的派生状态，不单独作为第二套环境状态持久化。

```ts
type MapVisualStage =
  | "polluted"
  | "restoring"
  | "restored";
```

v0.1 正式实现：

```text
polluted
restoring
```

`restored` 仅作为后续版本扩展状态保留。

可以通过综合修复分数推导视觉阶段：

```ts
function getMapVisualStage(
  state: MapState
): MapVisualStage {
  const pollutionScore =
    state.airPollution +
    state.waterContamination +
    state.soilToxicity +
    state.solidWaste +
    state.disturbance;

  const recoveryScore =
    state.drainageCapacity +
    state.habitatSafety +
    state.infrastructureSafety +
    state.publicSupport +
    state.vegetation +
    state.biodiversity;

  const normalizedScore =
    (recoveryScore / 6) -
    (pollutionScore / 5);

  if (normalizedScore < 0) {
    return "polluted";
  }

  if (normalizedScore < 50) {
    return "restoring";
  }

  return "restored";
}
```

以上函数用于说明派生关系。正式实现时可以调整权重，但必须满足：

* `airPollution` 等污染指标升高时，环境状态不能变好；
* `vegetation` 等恢复指标升高时，环境状态不能变差；
* v0.1 不得将 `visualStage` 与 `MapState` 分别存储后独立修改；
* v0.1 的正式流程只需要达到 `restoring`。


所有数值范围默认 `0—100`，除非字段明确说明。

---

## 4. 天气接口

```ts
interface WeatherProfile extends BaseEntity {
  mapTypes: MapType[];
  seasonalBias: Record<string, number>;
  weatherWeights: Record<WeatherType, number>;
  transitionRules: WeatherTransitionRule[];
}
```

```ts
interface WeatherSegment {
  id: string;
  type: WeatherType;
  startMinute: number;
  endMinute: number;
  intensity: number;
  modifiers: RuleModifier[];
}
```

```ts
interface WeatherTimeline {
  gameDay: string;
  seed: string;
  segments: WeatherSegment[];
}
```

天气生成器：

```ts
interface WeatherService {
  generateTimeline(input: WeatherGenerationInput): WeatherTimeline;
  getCurrentSegment(timeline: WeatherTimeline, now: Date): WeatherSegment;
}
```

---

## 5. 任务接口

```ts
interface TaskDefinition extends BaseEntity {
  name: string;
  category: "daily" | "random" | "npc";
  mapTypes: MapType[];
  regionIds?: string[];
  triggerCondition?: ConditionExpression;
  baseWeight: number;
  cooldownDays?: number;
  objectives: TaskObjective[];
  resultRules: ResultRule[];
  rewardIds: string[];
  agentContextId?: string;
}
```

任务实例：

```ts
interface TaskInstance {
  instanceId: string;
  definitionId: string;
  status: "available" | "accepted" | "active" | "completed" | "failed";
  generatedAt: string;
  parameters: Record<string, unknown>;
  progress: Record<string, number>;
}
```

任务生成：

```ts
interface TaskService {
  generateDailyTasks(input: TaskGenerationInput): TaskInstance[];
  generateRandomTasks(input: TaskGenerationInput): TaskInstance[];
  completeTask(input: CompleteTaskInput): ActionResult;
}
```

---

## 6. NPC 接口

```ts
interface NpcDefinition extends BaseEntity {
  name: string;
  role: NpcRole;
  sceneAssetId: string;
  mapIds: string[];
  spawnRules: SpawnRule[];
  taskPoolIds: string[];
  dialogProfileId: string;
}
```

```ts
interface NpcInstance {
  definitionId: string;
  regionId: string;
  position: { x: number; y: number };
  trust: number;
  currentTaskId?: string;
}
```

NPC 只提供任务入口和叙事，不在组件中写固定任务。

---

## 7. 副本接口

```ts
interface DungeonDefinition extends BaseEntity {
  name: string;
  type: DungeonType;
  sceneKey: string;
  mapTypes: MapType[];
  triggerCondition: ConditionExpression;
  stages: DungeonStageDefinition[];
  successCondition: ConditionExpression;
  failCondition?: ConditionExpression;
  rewardIds: string[];
  cooldownDays?: number;
}
```

```ts
interface DungeonStageDefinition {
  stageId: string;
  type: "dialog" | "choice" | "movement" | "puzzle" | "result";
  title: string;
  description?: string;
  options?: DungeonOption[];
  nextStageRules: NextStageRule[];
  agentContextId?: string;
}
```

```ts
interface DungeonService {
  createInstance(input: CreateDungeonInput): DungeonInstance;
  applyAction(input: DungeonActionInput): DungeonTransitionResult;
  resume(instanceId: string): DungeonInstance;
}
```

副本必须由状态机驱动，不在 Phaser 场景内用大量 `if/else` 控制剧情。

---

## 8. 结果规则接口

```ts
interface ResultRule {
  id: string;
  priority: number;
  condition: ConditionExpression;
  outcomeCode: string;
  stateDelta: Partial<MapState>;
  rewardIds?: string[];
  reasonCodes: string[];
}
```

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

条件表达式由规则模块解析，禁止在配置中执行任意 JavaScript。

---

## 9. Agent 接口

```ts
interface AgentResponse {
  title: string;
  background: string;
  riskItems: Array<{
    optionId?: string;
    level: "low" | "medium" | "high" | "unknown";
    text: string;
  }>;
  stateReminder: string[];
  uncertainty?: string;
  finalNotice: string;
  knowledgeEntryIds?: string[];
}
```

`finalNotice` 默认：

> 最终选择由你决定。

```ts
interface AgentService {
  explainTask(context: AgentTaskContext): Promise<AgentResponse>;
  explainOptions(context: AgentOptionContext): Promise<AgentResponse>;
  generateReview(context: AgentReviewContext): Promise<AgentResponse>;
}
```

接口必须提供超时、错误和本地模板回退。

---

## 10. 奖励接口

```ts
type RewardType =
  | "seed"
  | "material"
  | "title"
  | "skin"
  | "currency"
  | "workshopItem"
  | "badge"
  | "speciesRecord"
  | "mapDecoration";
```

```ts
interface RewardDefinition extends BaseEntity {
  name: string;
  type: RewardType;
  rarity: "common" | "rare" | "epic" | "legendary";
  assetId?: string;
  metadata?: Record<string, unknown>;
}
```

---

## 11. 社交接口

v0.1 使用 mock，但保持真实接口形态。

```ts
interface SocialService {
  listFriends(): Promise<FriendSummary[]>;
  requestAssist(input: AssistRequest): Promise<AssistResult>;
  submitMap(input: EcoSquareSubmission): Promise<SubmissionResult>;
  listRankings(input: RankingQuery): Promise<RankingPage>;
}
```

好友协助必须由服务器或 mock 服务返回结果，不由 UI 直接修改状态。

---

## 12. 存储接口

```ts
interface StorageService {
  loadProfile(): Promise<PlayerProfile | null>;
  saveProfile(profile: PlayerProfile): Promise<void>;
  loadWorldState(mapId: string): Promise<MapState | null>;
  saveWorldState(mapId: string, state: MapState): Promise<void>;
}
```

实现：

- `LocalStorageService`
- 后续 `RemoteStorageService`

---

## 13. Phaser—React 事件接口

```ts
interface GameBridgeEvents {
  GAME_READY: { mapId: string };
  PLAYER_INTERACT: { targetId: string };
  NPC_DIALOG_OPEN: { npcId: string };
  TASK_PROGRESS: { taskId: string; progress: number };
  DUNGEON_STARTED: { dungeonId: string };
  WEATHER_CHANGED: { weather: WeatherSegment };
  MAP_STATE_UPDATED: { summary: MapStateSummary };
}
```

所有事件必须有类型，不发送无结构字符串或任意对象。

---

## 14. 版本兼容

- 类型字段新增优先使用可选字段；
- 删除字段需要至少一个版本弃用期；
- 内容包必须声明 schemaVersion；
- 配置加载失败时拒绝启用该内容包；
- 存档迁移由 `SaveMigrationService` 负责；
- 任何破坏性变更必须写迁移说明。


---

<!-- Source: 06_CONTENT_AND_VERSIONING.md -->

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


---

<!-- Source: 07_DEVELOPMENT_TASKS.md -->

# 四天开发任务清单

## 1. 总体策略

四天内优先完成：

1. 架构骨架
2. 可移动地图
3. 昼夜与模拟天气
4. 任务与 NPC
5. 一个完整副本
6. 两个可演示副本入口或简化实现
7. AI 科普 mock
8. 视觉统一
9. 路演稳定性

P0 未完成前，不增加复杂商城、真实社交或多地图。

---

## 2. Day 1：工程、地图与角色

### P0

- [ ] 创建 React + TypeScript + Vite 项目
- [ ] 集成 Phaser 3
- [ ] 配置 ESLint、Prettier、Vitest
- [ ] 建立目录和模块边界
- [ ] 定义基础接口和 Zod schema
- [ ] 实现 React—Phaser Event Bus
- [ ] 加载 `urban_wasteland` 场景
- [ ] 实现玩家移动、碰撞和互动
- [ ] 实现男性/女性角色选择
- [ ] 保存角色选择
- [ ] 接入开场视频占位
- [ ] 建立对象存储资源路径规范

### P1

- [ ] 角色四方向动画
- [ ] 基础相机跟随
- [ ] 任务点标记
- [ ] 画质设置骨架

### 验收

- 能看视频/跳过；
- 能选择角色；
- 能进入地图并移动；
- React HUD 能接收 Phaser 事件。

---

## 3. Day 2：昼夜、天气、任务与 NPC

### P0

- [ ] 实现真实时间昼夜服务
- [ ] 实现演示时间切换
- [ ] 实现模拟天气时间线
- [ ] 接入至少 5 种天气视觉
- [ ] 实现地图内部状态
- [ ] 实现任务定义和任务池
- [ ] 实现日常任务抽取
- [ ] 完成 3 个日常任务玩法
- [ ] 实现 NPC 定义、生成和互动
- [ ] 至少 2 类 NPC 可触发任务
- [ ] 实现任务完成后的状态变化

### P1

- [ ] 6 个日常任务全部配置
- [ ] 8 个随机任务全部配置
- [ ] 任务冷却和重复惩罚
- [ ] NPC 信任值占位

### 验收

- 每次新游戏日能生成天气和任务；
- NPC 可提供任务；
- 任务改变地图状态；
- 同一任务在天气不同时有不同提示或效果。

---

## 4. Day 3：副本、规则与 AI

### P0

- [ ] 副本状态机
- [ ] 受伤动物救助副本完整实现
- [ ] 情境化结果规则
- [ ] MockAgentService
- [ ] AI 可选咨询面板
- [ ] AI 任务后复盘
- [ ] 污染暴雨副本可运行
- [ ] 规则引擎输出 reasonCodes
- [ ] 奖励与评级基础实现

### P1

- [ ] 地下排水站副本简化实现
- [ ] AI 环境标记
- [ ] 生态手册知识条目
- [ ] 副本参数随机化
- [ ] 副本保底机制

### 验收

- 同一选项在不同状态下结果不同；
- AI 不直接给答案；
- 暴雨副本可以移动避险；
- 规则结果与 AI 文本分离。

---

## 5. Day 4：视觉、社交展示、测试与路演

### P0

- [ ] 优化地图分层和氛围
- [ ] 完成 HUD 视觉统一
- [ ] 完成 AI 助手形象与面板
- [ ] 完成地图修复状态切换
- [ ] 添加好友协助 mock
- [ ] 添加生态广场 mock
- [ ] 添加模拟排行榜
- [ ] 完成结算与奖励弹窗
- [ ] 完成关键单元测试
- [ ] 修复阻断性 bug
- [ ] 进行 720p/1080p 性能测试
- [ ] 准备离线演示资源
- [ ] 准备 3—5 分钟路演流程

### P1

- [ ] UI 动效
- [ ] 环境音和背景音乐
- [ ] 新手引导
- [ ] 低画质降级
- [ ] 截图与宣传素材

### 验收

- 从启动到结算闭环无阻断；
- 无网络时除真实 Agent 外仍可演示；
- GTX 1650 中画质稳定；
- 界面与概念图方向一致；
- 路演流程可在 5 分钟内完成。

---

## 6. P2：暂缓

- [ ] 真实登录
- [ ] 真实好友系统
- [ ] 实时多人
- [ ] 真实排行榜后端
- [ ] 支付与皮肤商城
- [ ] 生态工坊完整实现
- [ ] 多地图正式内容
- [ ] 现实公益审核
- [ ] 完整剧情配音

---

## 7. 开发角色分工

### CodeBuddy

- 工程搭建
- React + Phaser 集成
- 领域服务
- 测试
- Bug 修复
- PR

### UI/UX NPC

- Design Tokens
- HUD 布局
- 组件状态
- 可访问性审查
- 截图复审

### Image NPC

- 地图概念和分层素材
- 角色与 NPC 概念
- AI 助手
- 天气效果参考
- 修复前后状态

### Icon NPC

- 功能 SVG 图标
- React 图标组件
- 统一线宽和尺寸

### 人工决策

- 产品边界
- 视觉最终选择
- 科普内容审查
- PR 合并
- 路演节奏

---

## 8. 每个任务的完成定义

任务只有同时满足以下条件才算完成：

- 代码可运行；
- 类型检查通过；
- 关键逻辑有测试；
- 无明显控制台错误；
- 接口文档已更新；
- 配置不写死在组件；
- 视觉符合规范；
- PR 描述完整；
- 可回滚。


---

<!-- Source: 08_CNB_CODEBUDDY_COLLAB.md -->

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


---

<!-- Source: 09_ACCEPTANCE_AND_TESTING.md -->

# 验收、测试与演示标准

## 1. 功能验收

### 启动流程

- [ ] 首次启动播放概念视频
- [ ] 视频可跳过
- [ ] 角色选择支持男性和女性
- [ ] 角色选择可保存
- [ ] 进入地图无阻断

### 地图与移动

- [ ] WASD 和触摸轮盘可移动
- [ ] 碰撞合理
- [ ] 可与任务物件和 NPC 互动
- [ ] 摄像机跟随稳定
- [ ] 互动提示不会频繁闪烁

### 昼夜与天气

- [ ] 昼夜跟随真实时间
- [ ] 演示模式可切换时间
- [ ] 天气由内部模拟生成
- [ ] 天气时间线一天有多个阶段
- [ ] 天气对任务和状态有影响
- [ ] 不依赖外部天气 API

### 任务

- [ ] 每个游戏日抽取任务
- [ ] NPC 可触发任务
- [ ] 任务完成更新状态
- [ ] 随机任务受环境影响
- [ ] 重复任务有冷却

### 副本

- [ ] 受伤动物救助可完成
- [ ] 暴雨避险可完成
- [ ] 至少一个轻量解谜流程
- [ ] 副本失败不会卡死
- [ ] 同一选择在不同状态下结果不同

### AI

- [ ] AI 只在求助或短提示时出现
- [ ] 不直接给出唯一答案
- [ ] 包含科普、风险、状态和不确定性
- [ ] 结果由规则引擎决定
- [ ] 服务失败时使用本地模板

### 社交展示

- [ ] 好友协助 mock 可用
- [ ] 生态广场可进入
- [ ] 显示系统评分
- [ ] 显示模拟排行榜
- [ ] 不依赖真实后端也能演示

---

## 2. 视觉验收

- [ ] 主视觉达到统一的半写实数字绘景的后工业轻科幻风方向
- [ ] HUD 信息层级清楚
- [ ] 角色不被面板遮挡
- [ ] AI 面板按需展开
- [ ] 天气变化可辨认
- [ ] 修复前后有明显视觉差异
- [ ] 危险不只依靠颜色表示
- [ ] 720p 和 1080p 布局可用
- [ ] 中文文字清晰
- [ ] 无生成图片乱码文字进入最终 UI

---

## 3. 性能验收

目标设备：

- Ryzen 5 4600H
- 16 GB RAM
- GTX 1650 4 GB

目标：

- 中画质接近 60 FPS
- 低画质稳定 30 FPS 以上
- 初始加载包尽量不超过 40 MB
- 首屏有加载进度
- 天气切换不明显卡顿
- React 不因角色坐标高频更新而重渲染
- 无持续增长的内存泄漏

---

## 4. 单元测试重点

- 天气生成可复现
- 日常任务抽取
- 随机任务权重
- 任务冷却
- 副本状态转换
- 情境化结果
- 奖励判定
- 地图评级
- 内容 schema 校验
- 存档迁移
- Agent 回退

---

## 5. 情境化结果测试示例

受伤动物副本，“投喂后离开”：

### 情境 A

- 污染低
- 栖息地安全高
- 威胁低

预期：

- 轻微负面或中性
- 提示长期依赖风险
- 不应判定严重失败

### 情境 B

- 污染高
- 塑料垃圾高
- 威胁高

预期：

- 明显负面
- 生物多样性和声望下降
- 解释停留、误食和二次伤害

### 情境 C

- 动物高度饥饿
- 救助响应慢
- 环境中等安全

预期：

- 短期缓解
- 长期风险增加
- 结果应体现不确定性

---

## 6. 演示脚本

建议 4 分钟：

### 0:00—0:25

播放概念视频，说明未来生态危机。

### 0:25—0:45

选择角色并进入城市污染荒地。

### 0:45—1:30

展示移动、天气、昼夜和 NPC 日常任务。

### 1:30—2:20

完成排水任务，展示地图状态变化。

### 2:20—3:10

触发受伤动物或暴雨副本，主动咨询 AI。

### 3:10—3:40

展示不同选择和情境化后果。

### 3:40—4:00

展示生态广场、好友协助和后续地图接口。

---

## 7. 演示保障

- 准备固定 seed
- 准备演示时间切换
- 准备强制触发副本按钮，仅开发/演示模式显示
- 资源本地缓存
- AI 使用 mock 作为兜底
- 关闭不稳定网络依赖
- 准备录屏备用
- 准备一键重置存档

---

## 8. 发布前阻断项

出现以下情况不得作为演示版本：

- 无法进入地图
- 角色移动失效
- 任务无法结算
- 副本无法退出
- AI 失败导致游戏卡死
- 资源大面积缺失
- 存档导致白屏
- FPS 长时间低于 20
- 关键中文乱码
- 规则结果与显示不一致


---

<!-- Source: 10_INTRO_VIDEO_SCRIPT.md -->

# 20—30 秒概念视频分镜

## 1. 视频目标

用极短时间建立：

- 地球与人类的关系
- 环境污染加剧的未来
- 游戏中的修复使命
- 压迫与希望并存的氛围
- 玩家作为生态修复员的身份

建议时长：25 秒。

---

## 2. 分镜脚本

### 0—4 秒：家园

画面：

蓝色地球缓慢旋转，海洋、森林与城市灯光可见。

旁白：

> 地球，是我们赖以生存的家园。

字幕：

> 我们只有一个共同的家园。

---

### 4—9 秒：累积

画面：

城市扩张、烟囱、塑料垃圾、污水和枯萎植被以快速蒙太奇出现。

旁白：

> 但每一次忽视、浪费与污染，都在改变它的未来。

音效：

工业低频逐渐增强。

---

### 9—15 秒：未来城市

画面：

镜头进入未来污染城市。天空灰暗，水渠出现油膜，废弃机器人倒在路边，植物稀少。

旁白：

> 当自然失去修复自己的时间，城市也开始失去生命。

字幕：

> 空气。水。土地。栖息地。

---

### 15—20 秒：信号

画面：

废墟中出现微弱绿色，一株先锋植物从裂缝中生长。AI 生态助手点亮并扫描周围。

AI 声音：

> 检测到生命迹象。修复仍然可能。

---

### 20—25 秒：行动

画面：

男性和女性生态修复员剪影并列，玩家伸手接过修复终端。远处部分灯光重新亮起。

旁白：

> 现在，选择由你开始。

标题：

> 《生态播种者》

副标题：

> 修复环境，也重新理解我们与自然的关系。

按钮：

> 开始修复

---

## 3. 制作方式

v0.1 推荐：

- 6—8 张关键概念图
- 分层视差
- 镜头推拉
- 雾、颗粒和污染扩散效果
- 简短旁白
- WebM + MP4 双格式
- 1080p
- 支持跳过
- 字幕内嵌或独立轨道

---

## 4. 注意事项

- 不使用真实灾难伤亡画面；
- 不出现血腥内容；
- 不直接复制现有影视或游戏镜头；
- 语言避免说教；
- 视频结尾必须给出明确行动感；
- 视频应可在无网络条件下播放。


---

<!-- Source: 11_SHARED_AGENT_CONTEXT.md -->

# 《生态播种者》共享 Agent 上下文

## 1. 项目概要

你正在协助开发《生态播种者》v0.1。这是一款轻科幻公益生态修复 Web 游戏。玩家在未来污染城市中完成清理、监测、种植、救助、避险与轻量建设任务。

当前首张地图：

```text
map.urban_wasteland
```

技术栈：

- React
- TypeScript
- Vite
- Phaser 3
- Zustand
- Vitest
- CNB.cool

---

## 2. 核心规则

1. 天气是游戏内部模拟，不接真实天气 API。
2. 昼夜默认依据真实设备时间。
3. AI 不决定游戏结果，只提供科普、风险和复盘。
4. 规则引擎决定状态变化、分数、奖励和副本成败。
5. 玩家保留最终选择权。
6. 同一选择在不同环境下产生不同结果。
7. 地图、任务、副本、NPC、天气和奖励必须配置化。
8. React 负责 UI，Phaser 负责场景。
9. mock 社交和 mock AI 必须通过接口实现。
10. 不为了 MVP 把内容写死。

---

## 3. v0.1 内容

- 20—30 秒概念视频
- 男性/女性角色选择
- 一张城市污染荒地
- 五个地图区域
- 真实昼夜
- 模拟天气
- 六个日常任务
- 八个随机任务
- 四类 NPC
- 三个副本
- AI 短提示、咨询和复盘
- 好友协助 mock
- 生态广场 mock
- 奖励和评级

---

## 4. 视觉方向

```text
半写实数字绘景的后工业生态修复风格，
+ 写实污染材质
+ 温和近未来科技
```
这里的“数字绘景”允许保留适度手绘材质和笔触，但不采用：

- 儿童绘本风；
- 卡通插画风；
- Q 版人物；
- 平面公益宣传图；
- 高饱和游戏美术；
- 将完整 UI 绘制进场景背景的做法。
其次避免：

- 纯赛博朋克霓虹
- 过于卡通的低龄画面
- 满屏网页卡片
- UI 文字烘焙进场景图
- 直接复制现有游戏风格

---

## 5. 代码要求

- TypeScript strict
- 模块解耦
- 公共接口有文档
- 内容使用 schema 校验
- 领域逻辑可测试
- 外部服务可替换
- PR 包含测试和截图
- 不改动无关模块
- 不在组件中写任务和奖励规则

---

## 6. 输出要求

在执行任何开发任务前：

1. 阅读相关文档；
2. 明确受影响模块；
3. 说明接口变化；
4. 给出最小实现方案；
5. 保留后续扩展；
6. 完成后运行类型检查、测试和构建；
7. 更新文档。

遇到需求冲突时，以以下优先级判断：

```text
可运行性
> 规则正确性
> 架构可维护性
> 视觉一致性
> 功能数量
```
