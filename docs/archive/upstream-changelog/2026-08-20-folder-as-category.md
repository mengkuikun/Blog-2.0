---
version: "v1.23.0"
date: 2026-08-20
time: "17:00"
type: feature
description: 分类改为文件夹即分类，支持多级目录树，分类页树形展开/叶子直跳
---

## 文件夹即分类（多级目录）

- **数据源重构**：`posts` 的 `category` 从 `src/content.config.ts:24` Zod schema 移除，分类 100% 由 `src/utils/category-tree.ts:17` `getCategoryFromId(entry.id)` 的文件夹路径推导（`编程学习/Java学习/xxx.md` → `CategoryNode{fullPath, count, directCount, children}`），`.pages.yml:33` 同步删除 `category` 字段
- **历史迁移**：批量清理 `src/content/posts/**` 119 篇的 `category` frontmatter（`node -e` 脚本），`scripts/新建文章/index.js:45` 不再写 `category`，后续分类只靠建文件夹
- **URL 与路由**：`src/utils/url-utils.ts:34` `getCategoryUrl` 分段 `encodeURIComponent`，路由 `src/pages/categories/[category].astro` → `src/pages/categories/[...category].astro:23` catch-all，子树聚合 `startsWith(parent+"/")`，面包屑多级渲染
- **聚合层**：`src/utils/content-utils.ts:235` `getCategoryList` 按前缀累加 `count`（含子孙），新增 `getCategoryTree()` 构建 `CategoryNode` 树，`getCategoryTagGroups` 与 `getArchiveList` 同步改取 `getCategoryFromId`
- **关联页面**：`src/pages/posts/[...slug].astro:142` `src/pages/posts/[...page].astro:99` `src/components/layout/HomeDataLayer.astro:79` `src/components/layout/PostPage.astro:49` `src/components/misc/RelatedPosts.astro:34` `src/components/controls/ArchivePanel.svelte:351` 均改用文件夹推导，归档过滤支持父含子
- **Obsidian 插件**：`plug-in/Obsidian/obsidian-category-autofill/logic.ts:100` `main.ts:22` 废弃写入（`getTargetCategory` 恒 `null`，`updateCategory` 跳过，模板移除 `category`），保留新建文章补 `title/published/tags/description`，`pnpm test` 20 pass

## 分类页树形交互

- **卡片重做**：`src/components/widget/CategoryFolders.astro:12` 递归树，`src/pages/categories.astro:76` 传 `tree`：有子目录 → `details` 展开看子树（`category-folder__content--tree`）+ “查看全部”入口，无子目录 → 整卡 `<a>` 直跳，已删右侧 `arrow-outward` 跳转按钮 `src/styles/pages/categories.css:239`
- **样式**：新增 `src/styles/pages/categories.css:530` `category-folders--nested / --leaf / view-all / content--tree`，修复 `src/styles/pages/categories.css:197` 后代选择器误隐藏子卡图标（`[open] > summary` 直属）
- **排序**：`src/utils/category-tree.ts:132` 有子目录优先置顶，再按 `count` 与名称，叶子卡去掉右侧箭头 `CategoryFolders.astro:54`，有子保留向下 `keyboard-arrow-down-rounded`

## 工程规范

- 新增 `CLAUDE.md:21` 更新日志规范与 `22` 收尾工作规范，明确每模块必写 `changelog`、必做清理/保留/询问
- `src/utils/setting-utils.ts:165` `src/utils/url-utils.ts:12` 补 `isolatedDeclarations` 显式返回类型，`pnpm check` 0 error、`pnpm build` Complete
