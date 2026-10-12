---
version: "v1.20.0"
date: 2026-07-29
time: "02:00"
type: feature
description: 架构重构、页面过渡优化、门户区白条修复、VFX 动画即时显示
---

## 架构重构

- Layout.astro 从 1492 行精简至 555 行，提取 8 个独立控制器模块
- 新增 `swup-lifecycle-controller.ts` — Swup 生命周期管理（5 个钩子）
- 新增 `scroll-handler.ts` — 滚动处理（back-to-top、TOC、navbar 隐藏）
- 新增 `grid-layout-utils.ts` — 网格布局管理
- 新增 `sidebar-utils.ts` — 侧边栏可见性控制
- 新增 `banner-utils.ts` — Banner 工具函数
- 新增 `panel-utils.ts` — 面板点击外部关闭
- 新增 `scrollbar-utils.ts` — KaTeX 滚动容器
- 新增 `tab-title-controller.ts` — 标签页标题交互

## 死代码清理

- 删除 19 个无用文件：WallpaperSwitch、DisplaySettings、DisplaySettingsIntegrated、LayoutSwitchButton、FloatingControls、WelcomeCard、WelcomeToast、DomeGallery、GuestbookDetailModal、HomePortal、ActivityHeatmap、CompareCard、MiniLineChart、RingProgress、sakura-manager、categoryLinks、folderIconConfig、projectsConfig、SpineModel/Live2DWidget 重复副本
- 删除空目录：`src/components/life/`、`src/components/album/`、`src/components/daily/`
- 删除未使用的公共文件：`china-map.json`（582KB）、`skull-preview.html`、`sakura.png`
- 清理 config/index.ts 中的死导出

## 壁纸系统移除

- 移除壁纸模式切换功能（overlay/none 模式）
- 保留标准 banner 模式（mode: "none"，不渲染背景图）
- 清理 Layout.astro、MainGridLayout.astro、setting-utils.ts 中的壁纸逻辑
- 清理 5 个 i18n 语言文件中的壁纸翻译键

## Danmaku 弹幕移除

- 删除 `src/components/guestbook/Danmaku.astro`
- 删除 `danmu` 内容集合定义
- 清理 `life/guestbook.astro` 中的弹幕渲染

## TypeScript 错误修复

- 从 52 个错误降至 0 个
- 修复未使用导入、未使用变量、null 安全、getStaticPaths 类型推断
- 修复 bangumi.astro 类型断言

## 内存泄漏修复

- SpineModel：setInterval 在 cleanup 中 clearInterval
- Live2DWidget：resize 监听器先移除再注册
- SakuraEffect：Swup 导航时停止 requestAnimationFrame
- BackToTop：改为单例模式，防止 scroll 监听器累积
- TypewriterText：Swup 钩子注册加 guard 防重复

## 页面过渡优化

- 移除离开动画的 translateY 位移，改为纯 opacity 淡出
- 移除进入动画的 translateY 位移，改为纯 opacity 淡入
- 过渡时间从 350ms 缩短至 200ms
- onload-animation 改为即时显示（opacity: 1，无动画）
- 进度条时长从 8 秒缩短至 3 秒
- 修复 Svelte 组件重初始化的 200ms setTimeout 竞态
- Swup scrollTo 改为 behavior: "auto" 避免抖动

## 门户区白条修复

- 首页父容器添加 `home-main-grid-wrapper` class
- 在 `<head>` 中内联关键 CSS，首屏移除父级 max-width 限制
- html 元素添加 `overflow-x: hidden` 防止 100vw 溢出

## 首页优化

- 关闭 PageLoader 加载动画（所有情况直接显示）
- 移除 GSAP 入口动画，首页元素直接可见
- 背景图由服务端构建时随机选择，不再客户端切换 src（消除闪烁和白条）
- VFX 马赛克效果移除 1500ms 延迟，立即显示

## 其他修复

- FancyboxManager 添加 MutationObserver 处理懒水合组件
- PageLoader 条件触发改为仅首页桌面端显示
- 修复 icon-loader 动态导入无 catch 的问题
- 修复 visit:start URL 解析无 try-catch 的问题
- Vue 特性标志从 Vite 配置中移除
- i18n 补全：en.ts 添加 9 个 changelog 键，zh_TW/ja/ru 各添加 23 个缺失键

## CLAUDE.md 规范

- 从零重写，572 行，18 个章节
- 覆盖架构控制器模块、Swup 生命周期管理、事件监听器规范、单例模式、内存泄漏检查清单、PageLoader 集成规范、功能模块自注册模式、操作清单、反模式清单
- 记录已关闭功能的恢复方法
