---
version: "v1.42.0"
date: 2026-09-27
type: feature
description: 新增「我的设备」页面，按分组展示个人装备
---

## 我的设备页

- 新增 `src/content/equipment/` 内容集合：设备按「文件夹即分组」归类（生产力/出行/影音娱乐等），空分组自动隐藏。
- 新增 `/equipment/` 页面：手绘风设备卡片（4:3 大图 + 名称/规格/简介完整换行展示，不再单行截断），图片懒加载。
- 导航栏「关于」分组新增「我的设备」入口；移动端菜单（MobileMenuSheet）改为完全由 `navBarConfig` 驱动，消除硬编码菜单与桌面端配置不同步的问题。
- 修复 Vite 8 监听 Windows 系统卷导致 dev 进程崩溃的问题（`server.watch.ignored` 改用正则）。
