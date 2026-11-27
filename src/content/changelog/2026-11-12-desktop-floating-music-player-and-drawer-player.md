---
version: "v1.56.0"
date: 2026-11-12
time: "00:25"
type: feature
description: 移植并深度定制 mmzming 风格桌面拟物黑胶悬浮音乐播放器，重构抽屉播放器为专用组件 DrawerMusicPlayer，完善多态自适应展开与移动端高对比度适配
---

## 拟物黑胶悬浮音乐播放器（桌面端）

- **拟物黑胶唱片与多态形态切换**：
  - 新增 [`src/components/features/MusicPlayer.astro`](file:///f:/GitHub/Blog-plus/src/components/features/MusicPlayer.astro) 与专用独立样式 [`src/styles/components/music-player.css`](file:///f:/GitHub/Blog-plus/src/styles/components/music-player.css)；
  - 支持 **唱片态（Disc）**、**胶囊态（Pill）**、**控制栏态（Bar）** 及 **面板态（Panel）** 四种形态平滑折叠展开；
  - 唱片播放中自动平滑旋转，暂停时优雅减速；支持播放列表、本地内嵌歌词逐行高亮同步滚动、音量调节与播放模式循环切换。
- **智能自适应展开方向与防瞬移算法**：
  - 在 [`src/utils/music-player-controller.ts`](file:///f:/GitHub/Blog-plus/src/utils/music-player-controller.ts) 中重构展开定位机制，提供向右固定、向左固定以及自适应三种模式；
  - 自适应模式以右侧真实物理剩余空间为准（放不下展开卡片时自动向左伸展），杜绝死板中线切割；
  - 修复向左模式收起时唱片跌回 `left: 0` 导致的视觉瞬移缺陷，通过 `right` 锚点和强制靠右约束保证全流程 450ms 缓动平滑收缩；
  - 增加展开态拖拽轻量化（Drag-to-Disc Morph）：拖拽展开卡片时自动微缩为紧凑唱片，松手落地后根据自适应方向平滑舒展展开，彻底消除跨半区移动时的瞬移与遮挡。
- **全生命周期防重复绑定与 Swup 集成**：
  - 引入 [`src/utils/swup-lifecycle.ts`](file:///f:/GitHub/Blog-plus/src/utils/swup-lifecycle.ts)，提供标准的 Swup SPA 导航生命周期单例管理；跨页导航时自动销毁上一页观察器，避免事件泄露。

## 侧栏抽屉音乐播放器重构（移动端/工具栏）

- **解耦提取专用组件与双端体验专精**：
  - 将嵌入在右侧工具栏（UnifiedDock）的抽屉播放器独立重构为 [`src/components/features/DrawerMusicPlayer.astro`](file:///f:/GitHub/Blog-plus/src/components/features/DrawerMusicPlayer.astro)，彻底消除与悬浮播放器的 `#music-player` ID 命名空间冲突；
  - 在桌面端（`>= 769px`）自动隐藏 UnifiedDock 里的重复音乐按钮，让右侧工具栏保持简洁纯粹；移动端（`< 768px`）保留抽屉音乐播放器，实现双端分工明确的最佳体验。
- **暗色模式高对比度与界面精简**：
  - 遵循 `CLAUDE.md` §15 规范，修复暗色模式下白底白图标看不清的问题：播放与暂停按钮应用 `bg-[var(--primary)] text-white dark:text-neutral-950 font-semibold`，暗色下自动呈现深黑高对比度图标；
  - 移除了卡片信息层右上角冗余的方向切换按钮，控制栏布局更加精致紧凑。

## 缺陷修复

- **修复 `src/pages/mf.astro` 全局滚动泄漏**：
  - 将静态秒跳页中未加作用域的全局 `html, body { overflow: hidden; }` 重构为局部绝对定位隔离容器，彻底解决在移动端部分页面进入后导致正文无法上下滑动的严重缺陷。

