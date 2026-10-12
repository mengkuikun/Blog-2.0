---
version: "v1.15.1"
date: 2026-07-13
time: "21:30"
type: fix
description: 修复 Swup 客户端导航后页面不加载的问题，批量修正 19 个组件的事件名
---

## 朋友圈页面修复

- 将 `<script>` 从 `</MainGridLayout>` 外移到内部，确保在 Swup 容器内
- Swup 导航时脚本会被正确替换并重新执行
- 添加 DOM 元素空值保护，避免脚本执行时元素未就绪
- 添加 50ms 延迟确保 DOM 完全解析

## Swup 事件名批量修复

19 个组件的 Swup 事件名从 `swup:contentReplaced` 修正为 `swup:content:replaced`：

- **控件类**：BackToHome、FloatingControls、FloatingDock、CategoryTools
- **功能类**：TypewriterText、GuestbookDetailModal
- **布局类**：CategoryBar、DropdownMenu、NavMenuPanel
- **页面类**：bangumi/TabNav、bangumi/FilterControls
- **组件类**：Calendar、Categories、CategoryRose、PostDirectoryList、SidebarTOC、SiteStats、TagGraph
- **页面**：changelog、projects

## 问题根因

- Swup 客户端导航只替换容器内的内容和脚本
- 脚本放在 `</MainGridLayout>` 外面会被浏览器执行，但不在 Swup 容器内
- 事件名错误导致页面切换后组件状态不更新
