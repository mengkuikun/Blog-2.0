---
version: "v1.21.0"
date: 2026-07-29
time: "11:00"
type: feature
description: 文章页改造、移动端底部菜单、首页背景动态切换、字体配置、代码审查修复
---

## 文章详情页改造

- 新增 `PostBreadcrumb.astro` — 面包屑导航组件（首页 › 分类下拉 › 此文章）
  - 分类下拉支持键盘导航（Enter/Space/ArrowUp/Down/Escape）
  - `window.__postBreadcrumbInited` guard 防重复初始化
  - Swup 导航后自动关闭下拉
- 重构 `[...slug].astro` 顶部区域：
  - 居中标题 + 紧凑 Meta 行（日期·分类·标签·字数·访问量·分享）
  - 新增简介卡（AI 摘要 / 人工编写，带图标和标签）
  - 移除封面图渲染（保留 posterCoverUrl 用于分享海报）
  - 移除旧的 PostMeta 组件、AiSummary 组件
- 新增 `post-hero.css` — 文章页 Hero + 面包屑 + 简介卡样式（通过 main.css 导入）
- 移动端访问量 + 分享按钮独立一行，桌面端同行显示
- 正文区域 padding 加宽（`px-3 md:px-6 lg:px-10`）

## 移动端底部菜单（Apple 风格）

- 新增 `MobileMenuSheet.astro` — Bottom Sheet 菜单组件
  - 顶部 MENU 标题 + "Explore your world" 副标题
  - 4×4 功能网格，19 个入口（与 navBarConfig 对齐）
  - 每项独立圆角方块，图标 + 名称
  - 毛玻璃背景（`blur(40px)`），圆角 24px
  - 右上角关闭按钮（内联 SVG，避免 symbol 引用失败）
  - 拖拽指示条（纯装饰）
  - Waline 评论数动态获取
- 新增 `mobile-menu-sheet.css` — Apple HIG 风格样式
- 修改 `MobileDock.astro` — 中间按钮改为触发 Bottom Sheet
  - 添加 `data-swup-ignore-script` + `window.__mobileDockInited` guard
  - 防止 Swup 导航导致事件监听器累积

## 首页背景动态切换

- 使用 `import.meta.glob` 构建时扫描 `public/assets/images/backgrounds/desktop/` 和 `mobile-bg/`
- 客户端 `is:inline` 脚本每次刷新随机选一张
- `homeConfig.ts` 新增 `backgroundImagePool` / `backgroundImageMobilePool` 属性
- `backgroundWallpaper.ts` 同步更新，新增图片无需改代码

## 字体配置

- 新增霞鹜文楷（LXGW WenKai）字体 — ZeoSeven CDN（`fontsapi.zeoseven.com/292`）
- 删除 25 MB 本地 TTF 文件（改用 CDN WOFF2 按需加载）

## Loading 动画

- PageLoader loading 动画已关闭（立即隐藏 + 派发 LOADER_HIDDEN_EVENT）
- 加载图片从 GIF 转换为 WebP（147.6 KB → 88.2 KB，节省 40%）
- `page-loader.css` 添加暗色主题背景、`.page-loader--visible` 类

## 代码审查修复

- 移除 `mobile-menu-sheet.css` 中 6 个违反规范的 `!important`
- 移除 `page-loader.css` 中移动端 `display: none !important`
- `.gitignore` 新增 10 个开发工具/临时目录排除

## 未使用图片审计

- 项目共 152 张图片，17 张未被引用（5 个表情包 GIF、3 个备份/变体、2 个旧版背景等）
- 暂不删除，留待用户确认
