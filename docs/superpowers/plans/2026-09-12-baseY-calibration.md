# 阶段 2：baseY 校准记录

日期：2026-09-13  
状态：代码基线已整理；候选值尚未完成逐素材人工视觉确认。

## 记录规则

- `baseY` 表示对象与地面的逻辑接触点，不表示图片矩形中心。
- 交互障碍物的 `y` 仍表示现有业务碰撞矩形中心；将其迁移为布局时，只能把布局的 `baseY` 用于交互点和视觉锚点，不能改变碰撞语义。
- `visibleHeight` 是显示高度候选值，不等同于 PNG 原始高度；真实透明边距和接触像素尚未全部测量。
- 下表中的“当前基线”来自代码当前事实；“候选值”是阶段 2 的统一配置起点，不应视为美术批准坐标。

## 对象校准表

| 对象 ID | 当前基线（代码） | 候选 `baseY` | 状态 | 尚未确认 |
|---|---:|---:|---|---|
| `interaction.pollution_zone_01` | 880 | 880 | 已纳入统一布局 | 污染物与地面的真实接触像素、透明底边 |
| `interaction.monitoring_device_01` | 940 | 940 | 已纳入统一布局 | 设备底座接触点与阴影宽度 |
| `interaction.drainage_facility_01` | 900 | 900 | 已纳入统一布局 | 排水设施底部是否需要偏移 |
| `interaction.storm_debris_01` | 920 | 920 | 已纳入统一布局 | 暴雨垃圾素材或占位图的可见边界 |
| `interaction.damaged_env_01` | 800 | 800 | 已纳入统一布局 | 环境点 marker 与地面接触关系 |
| `interaction.damaged_env_02` | 920 | 920 | 已纳入统一布局 | 环境点 marker 与地面接触关系 |
| `interaction.ecology_patrol_01` | 760 | 760 | 已纳入统一布局 | 巡查点 marker 的脚底/中心语义 |
| `interaction.ecology_patrol_02` | 880 | 880 | 已纳入统一布局 | 巡查点 marker 的脚底/中心语义 |
| `interaction.ecology_patrol_03` | 860 | 860 | 已纳入统一布局 | 巡查点 marker 的脚底/中心语义 |
| `interaction.fog_hazard_01` | 820 | 820 | 已纳入统一布局 | 雾天 marker 的脚底/中心语义 |
| `interaction.fog_hazard_02` | 960 | 960 | 已纳入统一布局 | 雾天 marker 的脚底/中心语义 |

## 下一次视觉验收

在真实浏览器中逐项打开遮挡调试开关，检查黄色 `baseY` 线是否与可见接触点重合；若不重合，优先调整对象的 `AssetMetrics.contactY` 或单对象偏移，不修改业务交互范围。验收应覆盖 1280×720、1600×900、1920×1080 和窄窗口 resize。
