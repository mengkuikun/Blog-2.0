---
version: "v1.50.1"
date: 2026-10-04
type: fix
description: 修复分类页面中文章卡片字数统计显示为 0 字的问题，并补全卡片色相与封面兜底字段
---

## 分类列表文章卡片元数据映射补全与字数显示修复

- **问题原因分析**：
  - 分类详情页面 `src/pages/categories/[...category].astro` 使用 `ArticleVirtualList.svelte` 渲染网格与列表卡片；
  - 卡片模板依赖 `post.wordCount` 渲染文章字数（`{(post.wordCount ?? 0).toLocaleString()} 字`）；
  - 但在上一版本重构中，上游数据映射函数返回的对象中遗漏了 `wordCount`、`categoryHue`、`apiUrls` 与 `fallbackImageUrl` 字段，导致组件内部回退为 `undefined ?? 0`，最终呈现为 `0 字`，且导致两处未使用变量的构建警告。
- **规范修复（`src/pages/categories/[...category].astro:195`）**：
  - 从 `render(entry)` 返回的 `remarkPluginFrontmatter.words` 中提取有效字数 `const wordCount = Number(remarkPluginFrontmatter.words) || 0;`；
  - 计算分类哈希色相 `const categoryHue = getCategoryHue(category);`；
  - 将 `wordCount`、`categoryHue`、`apiUrls`、`fallbackImageUrl` 完整注入返回的 `articleListPosts` 对象中；
  - 彻底修复分类页面文章卡片字数显示为 `0 字` 的缺陷，并清除了 `astro check` 中未读取变量的构建提示。
