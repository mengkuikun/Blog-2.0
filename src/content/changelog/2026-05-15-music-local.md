---
version: "v1.1.0"
date: 2026-05-15
type: improvement
description: 音乐系统回归本地模式，移除 Meting API 依赖
---

## 音乐系统回归本地模式

将博客音乐播放器从 Meting API 动态获取切换回本地音乐文件模式。

**变更内容：**

- `musicConfig.ts` 模式切换为 `mode: "local"`
- 保留三首本地歌曲：知我、女孩、爱得起
- 歌曲文件托管于 `your-img-bed.example.com/music/`

**原因：** Meting API 对部分热门歌曲（如周杰伦）存在版权限制，音频地址返回 404，影响播放体验。本地文件模式更稳定可靠。
