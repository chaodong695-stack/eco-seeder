# 13 音频与配音设计规范

## 1. 文档目的

本文件用于规范 Eco Seeder 游戏中的配音、交互音效、环境音和背景音乐资源，确保音频文件结构统一、命名清晰、调用稳定，并便于后续由配音 NPC、音频工具和 CodeBuddy 协同处理。

本规范仅定义音频资源的目录、命名、格式和使用要求，不允许音频生成 NPC 自行修改游戏剧情、任务内容、角色设定或整体交互逻辑。

## 2. 音频类型

游戏音频分为以下四类：

1. **Voice**：开场旁白、新手引导、NPC 对话和任务语音。
2. **SFX**：按钮点击、任务接受、任务完成、道具获取和警告提示等短音效。
3. **Ambient**：森林、水流、鸟鸣、城市噪声和污染区域背景声等环境音。
4. **Music**：主界面、游戏场景、剧情和生态修复阶段使用的背景音乐。

配音 NPC 主要负责生成 Voice 类资源，不用于替代环境音、交互音效和背景音乐。

## 3. 目录规划

音频资源统一存放在以下目录中：

```text
public/
└── assets/
    └── audio/
        ├── voice/
        │   ├── narrator/
        │   ├── guide/
        │   └── npc/
        ├── sfx/
        │   ├── ui/
        │   ├── task/
        │   └── environment/
        ├── ambient/
        ├── music/
        └── audio-manifest.json
```

各目录用途如下：

| 目录                    | 用途                     |
| --------------------- | ---------------------- |
| `voice/narrator/`     | 开场视频、剧情说明和环保知识旁白       |
| `voice/guide/`        | 新手引导、系统提示和操作说明语音       |
| `voice/npc/`          | 游戏 NPC 对话和任务语音         |
| `sfx/ui/`             | 按钮、菜单、弹窗和页面切换音效        |
| `sfx/task/`           | 任务接受、任务更新、任务完成和奖励音效    |
| `sfx/environment/`    | 清理垃圾、种植、浇水和生态修复等行为音效   |
| `ambient/`            | 污染城市、森林、河流和修复区域的循环环境音  |
| `music/`              | 主界面、剧情、游戏场景和结算页面的背景音乐  |
| `audio-manifest.json` | 音频资源标识、路径、类型和播放参数的统一索引 |

## 4. 文件命名规范

音频文件统一使用小写英文字母、数字和下划线命名，不使用空格、中文、括号或特殊符号。

基本格式为：

```text
音频类型_使用场景_具体内容_编号.扩展名
```

### 4.1 配音文件

```text
voice_intro_001.wav
voice_guide_welcome_001.wav
voice_npc_farmer_task_001.wav
```

更完整的命名示例：

```text
voice_narrator_intro_001.wav
voice_guide_tutorial_move_001.wav
voice_npc_farmer_task_accept_001.wav
voice_npc_farmer_task_complete_001.wav
```

### 4.2 交互音效

```text
sfx_ui_click_001.wav
sfx_task_accept_001.wav
sfx_task_complete_001.wav
```

其他示例：

```text
sfx_ui_open_panel_001.wav
sfx_ui_close_panel_001.wav
sfx_task_update_001.wav
sfx_environment_collect_trash_001.wav
sfx_environment_plant_seed_001.wav
```

### 4.3 环境音

```text
ambient_polluted_city_loop_001.wav
ambient_restored_forest_loop_001.wav
```

其他示例：

```text
ambient_river_clean_loop_001.wav
ambient_river_polluted_loop_001.wav
ambient_village_day_loop_001.wav
```

### 4.4 背景音乐

```text
music_main_menu_loop_001.ogg
music_gameplay_calm_loop_001.ogg
music_restoration_complete_001.ogg
```

## 5. 编号规则

同一用途存在多个版本时，采用三位数字编号：

```text
001
002
003
```

例如：

```text
voice_guide_welcome_001.wav
voice_guide_welcome_002.wav
```

不同音色、语速或情绪版本不得覆盖原文件，应保留独立编号，人工确认后再确定正式使用版本。

## 6. 音频格式

建议采用以下格式：

| 类型   | 开发与归档格式 | 游戏发布格式    |
| ---- | ------- | --------- |
| 配音   | WAV     | OGG 或 MP3 |
| 短音效  | WAV     | WAV 或 OGG |
| 环境音  | WAV     | OGG       |
| 背景音乐 | WAV     | OGG       |

基础要求：

* 配音采样率建议为 44.1 kHz 或 48 kHz。
* 配音和普通音效优先使用单声道。
* 背景音乐和环境音可使用双声道。
* 循环音频必须检查首尾衔接，避免明显断点。
* 不允许将来源不明或版权状态不明的音乐直接放入项目。

## 7. 第一阶段音频范围

MVP 阶段只实现以下音频：

1. 开场概念视频旁白；
2. 新手引导欢迎语音；
3. UI 按钮点击音效；
4. 任务接受音效；
5. 任务完成音效；
6. 污染区域环境音；
7. 生态修复区域环境音；
8. 主场景背景音乐。

暂不为每一个 NPC 的全部对白生成配音，避免音频数量过多、文件体积失控和后续台词修改成本过高。

## 8. NPC 生成约束

配音或音频 NPC 只能执行已经明确给出的音频生成任务。

NPC 不得：

* 自行修改旁白文本或 NPC 台词；
* 自行增加剧情内容；
* 自行改变角色性格；
* 自行覆盖已有音频文件；
* 自行修改游戏代码；
* 自行修改本设计文档。

NPC 完成任务后必须报告：

1. 使用的原始文本；
2. 是否修改过文本；
3. 生成音色；
4. 实际音频时长；
5. 文件格式；
6. 文件名称；
7. 文件保存位置；
8. 是否存在噪声、截断或语音异常。

## 9. 音频资源清单

所有正式使用的音频资源应登记在：

```text
public/assets/audio/audio-manifest.json
```

示例结构：

```json
{
  "voice_intro_001": {
    "type": "voice",
    "category": "narrator",
    "path": "/assets/audio/voice/narrator/voice_intro_001.wav",
    "loop": false,
    "volume": 1.0
  },
  "sfx_task_complete_001": {
    "type": "sfx",
    "category": "task",
    "path": "/assets/audio/sfx/task/sfx_task_complete_001.wav",
    "loop": false,
    "volume": 0.8
  },
  "ambient_restored_forest_loop_001": {
    "type": "ambient",
    "category": "environment",
    "path": "/assets/audio/ambient/ambient_restored_forest_loop_001.ogg",
    "loop": true,
    "volume": 0.5
  }
}
```

## 10. 验收要求

音频资源投入游戏前应检查：

* 文件能否正常播放；
* 文件路径是否与资源清单一致；
* 配音文本是否与确认稿一致；
* 音量是否明显过大或过小；
* 是否存在爆音、底噪、截断和异常停顿；
* 循环音频是否能够自然衔接；
* 多个音频同时播放时是否互相干扰；
* 是否具备明确的生成记录或版权来源。
