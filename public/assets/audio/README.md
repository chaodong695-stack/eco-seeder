# 音频素材目录

本目录用于存放 DEV-06 音效系统所需的音频文件。

## 目录结构

```
public/assets/audio/
├── bgm/          # 背景音乐
│   ├── start-theme.mp3      # 开始页 BGM
│   └── game-ambient.mp3     # 游戏内环境 BGM
└── sfx/          # 音效
    ├── click.mp3            # 按钮点击
    ├── select.mp3           # 角色选择
    ├── task-complete.mp3    # 任务完成
    ├── repair-complete.mp3  # 修复完成
    └── warning.mp3          # 交互失败/条件不足
```

## 音频文件路径

所有路径定义在 `src/game/assets/assetManifest.ts` 的 `audioAssets` 对象中。
替换文件时只需将音频文件放入对应目录，文件名与清单一致即可。

## 降级机制

当前音频文件尚未上传时，`AudioManager` 会静默降级：
- 音频文件不存在时不会产生控制台错误刷屏
- 失败的音频 src 会被记录，不会重复尝试
- 所有游戏功能正常运行，不受音频缺失影响

## 后续替换

人工补充音频文件后无需修改代码，将文件放入对应目录即可自动生效。
