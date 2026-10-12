---
version: "v1.7.1"
date: 2026-06-18
time: "17:30"
type: fix
description: 修复 Swup 导航、页面按钮失效、样式问题等多个 bug
---

## Swup 导航修复

- 修复后台管理页面之间切换时布局样式瞬间丢失、只显示文字的问题
- 原因：后台页面使用 `data-swup-ignore`（Swup v3 属性），而 Swup v4 实际识别的是 `data-no-swup`
- 将 `src/pages/admin/` 下 3 个文件共 9 处 `data-swup-ignore` 替换为 `data-no-swup`

## Gist 数据首次加载失败修复

修复多个页面首次访问时 Gist 数据不显示、需要刷新才能加载的问题。根本原因相同：脚本被放在 `<MainGridLayout>` 组件标签外部，Astro 将其渲染到 `</body></html>` 之后，导致 Swup 导航时脚本无法被正确执行。

- **置顶说说页面** (`/moments/pinned/`)：将脚本移入 `<MainGridLayout>` 内部
- **笔记本索引页面** (`/life/notebooks/[slug]`)：将远程笔记加载脚本移入 `<MainGridLayout>` 内部
- **云端笔记页面** (`/life/notebooks/remote-entry/`)：将笔记内容加载脚本移入 `<MainGridLayout>` 内部

## 说说页面标签不可点击修复

- 修复说说页面外部 Gist 数据的标签点击后无反应的问题
- 原因：`MainGridLayout.astro` 中 `createCard()` 函数创建标签时使用 `<span>` 元素而非 `<a>` 链接
- 改为创建 `<a href="/archive/?tag=...">` 元素，与置顶页面和 MomentCard 组件行为一致

## 说说页面切换闪烁优化

- 优化从置顶页面返回说说页面时的样式闪烁问题
- 原因：两个页面各自有 `<style is:global>` 块定义卡片样式，Swup 的 `updateHead` 在切换时先移除旧样式再添加新样式，导致短暂无样式状态
- 将共享的卡片样式提取到 `src/styles/features/moments.css` 持久 CSS 文件中，通过 `main.css` 加载
- 从 `moments.astro` 和 `pinned.astro` 中移除重复的 `<style is:global>` 块

## 多个页面按钮首次访问失效修复

修复文章列表、更新日志、影视游戏页面首次访问时按钮点击无反应的问题，原因相同：脚本在 `</MainGridLayout>` 外部。

- **文章列表页面** (`/posts/`)：将布局切换脚本从模块脚本改为 `<script is:inline>`
- **更新日志页面** (`/changelog/`)：将筛选脚本移入 `<MainGridLayout>` 内部
- **影视游戏页面** (`/movies-games/`)：将交互脚本移入 `<MainGridLayout>` 内部

## 影视游戏页面按钮样式改版

- 将 Tab 切换和筛选按钮从 Tailwind 类名切换风格改为与更新日志页面一致的胶囊风格（`.tools-tab-pill`）
- 添加滑动指示器动画效果
- 修复切换 Tab 时筛选指示器未初始化的问题

## 笔记本预览样式优化

- 修复远程 Gist 笔记预览显示标题而非内容的问题，改为与本地笔记一致只显示日期和内容预览
- 为远程笔记预览添加 Markdown 格式渲染（粗体、斜体、行内代码、链接、换行）
- 修复本地笔记预览丢失换行效果的问题，保留 `<br>` 换行标签而非去除所有 HTML
- 本地和远程笔记预览现在都支持 Markdown 格式和换行显示

## 首页导航栏遮挡修复

- 修复首页 "Dumpling" 文字的 VFX 特效 canvas 遮挡导航栏的问题
- 原因：VFX 库创建的 canvas 使用 `position: fixed` + `z-index: 9999`，覆盖在导航栏之上
- 将 VFX canvas 的挂载目标从 `document.body` 改为 hero 元素内部，使用 `position: absolute` 使其跟随滚动

## 置顶说说页面修复

- 修复置顶说说页面图片无法点击放大的问题：为动态创建的图片添加 `data-fancybox` 和 `data-src` 属性
- 修复暗色模式下说说文字不可见的问题：将不存在的 `var(--text-color)` 改为 `var(--deep-text)`
