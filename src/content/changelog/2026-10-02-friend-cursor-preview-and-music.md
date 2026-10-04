---
version: "v1.49.0"
date: 2026-10-02
type: feature
description: 移植友链鼠标悬浮大图跟随预览，个性化本站友链信息，音乐系统收录《海屿你》与《暮色回响》
---

## 友链悬浮大图预览、本站信息更新与音乐系统配置

- **友链鼠标悬停大图跟随预览（移植自 MmzMing 知识库风格）**：
  - **完全保留现有卡片特性**：不改动 `FriendCard.astro` 的 HTML 语义结构，完整保留清羽飞扬风格截图背景渐变、头像懒加载、状态徽标、鼠标光晕跟随与整卡点击打开链接，朋友圈爬虫规则 100% 兼容。
  - **相框内衬与内外同心圆角**：更新 `src/styles/components/friend-preview.css`，外层相框采用 `0.5rem` 内衬与 `1rem`（16px）圆角，内层图片采用 `0.5rem`（8px）圆角，视觉弧度同心贴合。
  - **浅深色自适应边框与高光投影**：边框复用 `var(--deep-text)`，浅色模式呈现深灰，暗色模式呈现精致浅白边框与增强暗色微投影，浮现时带有 `0.18s` 的平滑缩放淡入动效。
  - **光标跟随与视口避界翻转**：重写 `src/pages/friends.astro` 中的悬浮预览脚本，浮层实时跟随鼠标光标（`+16px` 偏移）；靠近视口右侧自动向左翻转，靠近视口底部向上贴靠安全区，确保大图在各种屏幕下均完整可见。
- **友链页本站信息个性化**：
  - 更新 `src/content/spec/friends.md`：站点名称 `夢酷`、站点链接 `https://imki.cn`、头像链接 `https://imki.cn/avatar.jpg`。
- **音乐系统配置本地曲库**：
  - 在 `public/assets/music/` 目录规范引入两首本地高品质热门曲目：
    - 《海屿你》（马也_Crabbit / Cole先生）：`hai-yu-ni.mp3`，配套封面 `hai-yu-ni.jpg` 与时间轴歌词 `hai-yu-ni.lrc`。
    - 《暮色回响》（张韶涵）：`mu-se-hui-xiang.mp3`，配套封面 `mu-se-hui-xiang.jpg` 与时间轴歌词 `mu-se-hui-xiang.lrc`。
  - 更新 `src/config/musicConfig.ts` 中的 `local.playlist`。
  - 全站顶部导航栏播放器、底部 Dock 快捷控制台以及 `/music/` 3D 地形可视化页面均支持即时播放、平滑切歌与高亮同步歌词滚动。
