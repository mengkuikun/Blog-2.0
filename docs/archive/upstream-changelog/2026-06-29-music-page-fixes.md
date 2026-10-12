---
version: "v1.7.2"
date: 2026-06-29
time: "22:00"
type: fix
description: 修复音乐页面过渡闪现、侧边栏消失、浮动音乐播放器无数据源等问题
---

## 音乐页面 Swup 过渡闪现修复

修复从其他页面导航到音乐页面时，侧边栏组件（个人卡片、日历、恋爱计时器等）短暂闪现并挤压页面内容的问题。

- **根本原因**：音乐页面使用 `Layout.astro`，其他页面使用 `MainGridLayout.astro`，两者 DOM 结构完全不同。Swup 只替换 5 个容器（`#swup-container`、`#left-sidebar-dynamic` 等），但 `#left-sidebar-wrapper`、`#right-sidebar-static`、`#main-grid` 等非 Swup 容器会从旧页面残留
- **修复方案**：在 Swup `visit:start` 钩子中检测进出音乐页面时强制整页加载，绕过 Swup 的部分更新机制
- 同时修复离开音乐页面后其他页面侧边栏消失的问题
- 同时修复首次进入音乐页面时音乐资源不加载的问题（Svelte 组件和内联脚本需要完整页面加载才能正确初始化）

## CSS 选择器修复

- 修复 `music-visualizer.css` 中 `#main-grid-wrapper`（不存在的 ID）改为正确的 `#left-sidebar-wrapper`、`#right-sidebar-static` 等选择器
- 补充缺失的 `#mobile-bottom-sidebar` 选择器

## 浮动音乐播放器数据源修复

修复右下角浮动控制栏（FloatingDock）打开音乐播放器后没有音乐源的问题。

- **根本原因**：`MusicManager` 初始化时使用空的 `localPlaylist`（配置中为空数组），而浮动播放器的 `MusicPlayer` 依赖外部注入播放列表。由于脚本执行时序问题，`MusicPlayer` 可能在 `MusicManager` 创建单例之前执行，导致播放列表永远不被加载
- **修复方案**：让 `MusicManager` 在构建时从 bangumi 集合自动加载音乐播放列表并内置 Meting API 解析逻辑，不再依赖 `MusicPlayer` 的外部注入
- 音乐页面和浮动播放器现在共享同一数据源，保持一致
