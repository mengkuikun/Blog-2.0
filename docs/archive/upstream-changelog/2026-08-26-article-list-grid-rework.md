---
version: "v1.29.0"
date: 2026-08-26
type: feature
description: 文章列表带图模式一模一样复刻参考博客，含像素块揭幕与置顶轮播对齐
---

## 文章列表带图模式一模一样复刻与像素揭幕动效

- **带图网格一模一样**：`src/components/pages/ArticleVirtualList.svelte:380` 将原 `a.article-grid-card` 的 `16/9 + 340宽 + 红框` 重写为参考博客的 `article.article-list-card[data-article-list-card][--article-category-hue]` + `cover-wrap image-pixel-reveal-host[data-article-list-cover-wrap]`（含 `cover-loader(4点) + image-pixel-reveal + source[data-article-list-cover/fallback/apiUrls]`）+ `content(title-row/title::before/views/meta分隔线/rule+3行摘要)` + `surface-link`，分类色相由 `FNV-1a %360` 定基写入 `--article-category-hue` 供竖线着色；上游 `src/pages/posts/[...page].astro:97` 与 `src/pages/categories/[...category].astro:222` 补 `categoryHue/wordCount/apiUrls/fallbackImageUrl`
- **像素块一块一块的加载**：新增 `src/styles/components/image-pixel-reveal.css:1` + `src/utils/image-pixel-reveal.ts:1` + `src/utils/article-cover-lifecycle.ts:1`（原 `OtherRunProject/my-blog` 三件套，`48px` 目标块、`84/36` 上限、`300ms` 块时长、`680ms` 散布、`750ms` 兜底、`is-loading→is-revealing→is-revealed/is-error`，`8000ms` 源超时、`1500ms` 解码超时、`apiUrls[]` 逐源重试），在 `src/components/pages/ArticleVirtualList.svelte:171` 以 `IntersectionObserver 200px` + `setVisible` 与可见性分发接入，置顶与单列的横向 `2/1` 封面亦接同一条链路，移动端因封面 `display:none` 自动不触发，`prefers-reduced-motion` 直显原图
- **固定 3 列与卡片呈现**：`src/styles/pages/article-list.css:497` 将 `masonry` 固定为 `repeat(3,1fr)` 仅 `≤768→1列` 回落，`max-width` 收至 `3*300+2*gap`，`border 1px、radius 0.5rem、padding 0.9rem 1rem、title 1.05rem、meta 0.78rem` 同步缩窄，`cover 16/9→16/10`，`handleImageLoad/Error + skeleton-shimmer` 的旧兜底清理为生命周期统一接管
- **单列与移动端按约束不动**：`src/components/pages/ArticleVirtualList.svelte:510` 的 `view==="list"` 单列段与 `src/styles/pages/article-list.css:1330` 的 `@media(max-width:768/640)` 中 `article-list-row-card` 相关移动分支保持不动，仅补网格卡与共用的 `cover-loader + roll 2s` 样式
- **置顶轮播对齐参考**：`src/styles/pages/article-list.css:108` 已有 `article-list-pinned` 横向 `content 1fr / cover 0.45fr aspect 2/1` + 红竖线 `article-pinned-accent` + 竖排圆点 `6秒轮播/悬停暂停/reduced-motion 静态`，本次未动其结构与样式，仅复用与网格同一条 `image-pixel-reveal` 链路
- **首屏闪屏与动效重播的拉锯**：`src/layouts/Layout.astro:285` 的 `data-article-view` 预写入与 Svelte 内 `getInitialViewFromDOM() + syncViewFromStorage + viewInitialized` 的竞态仍在，刷新时切到 `grid` 会先出单列再闪三列且方格揭幕被跳过；后续收尾阶段暂按“保证切模式/翻页都重播动效”处理，闪屏问题保持现状，下一轮再修

验证：`pnpm build` 368 页、`pnpm exec tsc --noEmit` 无报错。
