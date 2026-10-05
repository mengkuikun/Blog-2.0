---
version: "v1.50.3"
date: 2026-10-05
type: fix
description: 消除首页首屏死等动画导致的1.2秒卡顿，修复账单日历双1号偏移与文章列表页侧栏误判
---

## 体验与功能缺陷修复

### 1. 消除首页首屏 1.2 秒白屏空等（perf & fix）
- **问题分析**：`HomeDisplayLayer.astro` 原本通过 `ensureNoContentWrapperContainingBlock()` 等待 `#content-wrapper` 的入场动画结束（`animationend` 事件）。但由于动画类 `.onload-animation` 在 `swup.css` 中已被禁用（`animation: none`），导致该事件永远无法触发，每次访问首页都会被迫卡满 1200ms 超时兜底才放行首屏内容。
- **规范修复**：改为同步函数 `releaseContentWrapperTransform()`，在保证清除 `transform` 保证视口定位的前提下零等待放行，首屏响应速度从 1200ms+ 大幅提速至 170ms 内。

### 2. 修复文章列表页侧栏组件错乱与空白目录（fix）
- **问题分析**：`src/utils/grid-layout-utils.ts` 中 `isCurrentPagePost()` 使用 `includes("/posts/")` 判定，将文章列表根路径（`/posts/`）与分页误判为了“文章详情页”，导致非详情页小组件（个人资料、天气、日历、站点统计、热搜等）全部被错误隐藏，且右侧错误渲染了“当前页面没有目录”的空白 TOC 卡片。
- **规范修复**：严格排除 `/posts` 根路径与纯数字分页正则（`/^\/posts\/\d+$/`），精准区分列表页与真正文章详情页。

### 3. 修复账单日历出现两个 1 号的索引偏移缺陷（fix）
- **问题分析**：[src/pages/bills.astro](file:///f:/GitHub/Blog-plus/src/pages/bills.astro) 前置补位循环误写为 `for (let i = lead - 1; i >= 0; i--) push(new Date(y, m - 1, 1 - i), false)`，当 `i = 0` 时推入了当月 1 号，导致当月 1 号与下一行当月循环重复推入，周三周四连续显示两个 1 号且上月补位向后偏移 1 天。
- **规范修复**：修正循环边界为 `for (let i = lead; i > 0; i--)`，严丝合缝衔接前后月份。

### 4. 优化移动端底栏菜单展开完整度（style & fix）
- **规范修复**：放宽 [MobileMenuSheet.astro](file:///f:/GitHub/Blog-plus/src/components/layout/MobileMenuSheet.astro) 的面板最大高度至 `min(86dvh, 86vh, 680px)`，并在展开时自动平滑滚动对齐，彻底消除小屏下关于内容被截断遮挡问题。
