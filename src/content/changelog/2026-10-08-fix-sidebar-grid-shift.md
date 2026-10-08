---
version: "v1.51.3"
date: 2026-10-08
type: fix
description: 消除 Swup 客户端切页时因残缺两列网格兜底导致的右侧边栏位移跳动，对齐 SideBar 服务端文章详情页判定
---

## 缺陷修复与体验优化

### 1. 修复客户端切页时右侧栏组件偶然位移至左下方的缺陷 (fix)
- **根因分析**：
  - 在 `src/utils/swup-lifecycle-controller.ts` 的 `content:replace` 生命周期钩子中，当 Swup SPA 导航在特定路由切换或新页面 DOM 挂载尚未注入 `#grid-class-carrier` 时，原代码使用硬编码兜底值 `"grid-cols-1 md:grid-cols-[17.5rem_1fr]"`。
  - 该兜底值仅包含两列网格，缺少了桌面端的第三列定义 `xl:grid-cols-[17.5rem_1fr_17.5rem]`。导致右侧边栏（`#right-sidebar`，定义为 `xl:col-start-3`）在只有两列的父级网格中失去第 3 轨承载，根据 CSS Grid 规则发生折行并落入第 1 列下方，呈现为右侧栏组件跳至左侧的异常状态。
- **规范修复**：
  - 彻底移除硬编码的两列降级字符串；在缺失 `carrierGridClass` 的过渡间隙统一调用 `src/utils/grid-layout-utils.ts` 中的 `updateMainGridCols()` 进行权威响应式网格兜底，确保桌面端始终保持完整的三列网格结构，从根源消除右侧栏跳动。

### 2. 对齐 SideBar 服务端渲染的文章详情页判定 (fix)
- **根因分析**：
  - `src/components/layout/SideBar.astro` 服务端渲染时仍使用遗留的 `Astro.url.pathname.includes("/posts/")` 判定文章详情页，将文章列表根路径 `/posts` 与分页正则 `/^\/posts\/\d+$/` 误判为文章详情页，使列表页在 SSR 阶段将非文章组件预设为 `hidden`，客户端 hydration 后再异步显现，产生组件闪烁。
- **规范修复**：
  - 与 `grid-layout-utils.ts` 的 `isCurrentPagePost()` 判定标准严格统一，精准排除列表根路径及数字分页，确保 SSR 服务端生成的初始状态与客户端运行时 100% 吻合。
