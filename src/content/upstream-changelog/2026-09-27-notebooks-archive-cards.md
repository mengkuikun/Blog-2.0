---
version: "v1.27.0"
date: 2026-09-27
type: feature
description: 笔记本归档改版为动态式卡片流，支持多图与折叠收起
---

## 笔记本归档卡片流重做

- **归档页重做**：`src/pages/life/notebooks/[...slug].astro` 日历下方的 `archive-panel` 时间线替换为卡片流 `nb-archive-feed`，每张卡 `nb-archive-card` 含头像/标题/日期 + 正文 + 图片网格 + 标签/评论按钮；旧 `ap-*` 时间线样式与详情页分支（`isNotebookIndex:false`）已删除
- **卡片视觉**：参考 `src/pages/life/notebooks/index.astro` 的 `nb-note-card`（`src/styles/pages/notebooks.css:440` `1px var(--line-divider) / 0.875rem 圆角 / var(--card-bg) / hover 边框变 primary+上浮阴影`），不复刻 `MomentCard` 的 `2px #000 + accent-bar`
- **文字折叠**：正文 SSR 预判 `12字*3行` 截 12字 + `is-clamped`，客户端离屏探针校准三行溢出；`>3行` 折为 1行12字+行尾绿字展开，展开切 `is-expanded` 显示全文，`1-3行` 不截+不显示按钮，无闪烁（`src/pages/life/notebooks/[...slug].astro:130`）
- **图片网格**：对齐 `src/components/moments/MomentCard.astro:79` 的 `getGridCols`（1→1列 2/4→2列 其余→3列）+ `gridMax=9` + `+N` 遮罩 + `data-fancybox` 灯箱；`src/styles/pages/notebooks.css:586` 的 `.nb-archive-images`
- **多图字段**：`src/content.config.ts:147` 新增 `images` 主字段（`string|string[]`），保留旧 `image` 别名；`.pages.yml:505` 同步新增 `images` (`imgbed` list)
- **路由与跳转**：归档 `getStaticPaths` 仅生成 `params.slug=folderName`；`src/pages/life/notebooks/index.astro:198` 的 `recentNotes.href` 改 `/{folder}/#note-{slug}`，`src/components/widget/RecentItems.astro:106` 同步锚点
- **评论隔离**：新增 `src/utils/notebook-chat.ts` + `src/types/notebook-chat.ts`，`NOTEBOOK_CHANNEL=/life/notebooks/` 聚合（不与 `/moments/` 共用），`>>NOTEBOOK>> / notebook-reply` 标记；`src/components/comment/NotebookCommentModal.svelte` 改 `NOTEBOOK_CHANNEL` + `notebook-chat-*` 存储 key；归档与首页均走 `window.__notebookComment.open` 弹窗毛玻璃聊天室
- **归档页改版**：`src/components/controls/ArchivePanel.svelte` 重做为简洁行 `MM-DD + 标题(≤20字) + #分类彩色/标签 +N`，`src/components/widget/ArchiveHeatmap.astro` 热力图绿提亮；`src/pages/archive.astro` 年份按钮改下拉 `archive-year-dropdown`，`is:inline` 委托同步 `heatmap-year hidden` + `archive-year-change` 驱动 `ArchivePanel` 按年过滤

## 归档与热力图细节

- **分类彩色**：`ArchivePanel.svelte:135` 的 `palette` 映射 `text-sky/ro se/emerald...` 转 `oklch` 行内色，`initCategoryColors` 按 `data.category` 无则按 `type→生活/动态/记录` 归集；`ap-cat` 600 权重，标签与 `/` 及 `+N` 700 加粗
- **字号与留白**：年月 1.35rem、标题 0.95rem、日期 0.875rem、右侧 0.8rem；`archive-panel` 外加 `0 0.5rem` 内边距避免贴边；`ap-title` 20字截断
- **下拉联动**：归档页 `data-archive-year-option` 布尔属性补齐，选项选择同步 `data-archive-year-label / data-active / heatmap-year` 与 `history ?year=`，修复 `closest` 找不到导致的选不中
