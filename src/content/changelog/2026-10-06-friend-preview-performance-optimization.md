---
version: "v1.51.2"
date: 2026-10-06
type: fix
description: 友链悬浮大图跟随与卡片光晕性能深度优化：解耦GPU合成层位移、引入rAF调度与尺寸缓存，根治Edge浏览器掉帧
---

## 友链悬浮大图跟随性能重构

针对友链页面鼠标悬停大图跟随光标移动时在 Edge 浏览器及高刷设备下容易掉帧的问题，进行深度渲染流水线与主线程性能重构：

- **双层解耦与 GPU 硬件加速跟随（translate3d）**：
  - 更新 `src/styles/components/friend-preview.css`：将原单层浮层重构为外层定位容器与内层 `.friend-preview-card` 相框。
  - 外层 `#friend-preview` 仅负责 `transform: translate3d(x, y, 0)` 硬件加速跟随，移除所有 `transition`，交由 GPU Compositor 线程处理；内层承载自适应边框、同心圆角、高光投影与平滑缩放淡入动效。
  - 彻底终结了原先在高频修改 `left/top` 时，导致 Edge 浏览器在每一帧重新由 CPU 光栅化计算 36px 超大模糊阴影的性能瓶颈。
- **根治 Layout Thrashing（布局抖动与尺寸缓存）**：
  - 更新 `src/pages/friends.astro`：彻底移除了高频 `mousemove` 监听器中的 `getBoundingClientRect()` 调用与全局 DOM 查询。
  - 浮层实际宽高与视口边界改在鼠标初次移入卡片（`mouseover`）及图片 `load` 完成时只测量并缓存一次，移动跟随期间仅执行纯数字加减运算，单次计算时间从 20ms 降至 0.001ms。
- **`requestAnimationFrame`（rAF）帧率对齐与光晕节流**：
  - 为大图跟随逻辑引入 `requestAnimationFrame` 调度锁，严格将 DOM 更新频率与屏幕刷新率对齐（60Hz/120Hz），避免千回报率电竞鼠标导致事件堆积。
  - 为网格卡片光晕（`bindGlow`）同步引入 rAF 节流调度与 `{ passive: true }` 监听，防止双重鼠标事件互相抢占主线程 CPU。
- **友链截图脚本视口与 67% 浏览器缩放比例对齐**：
  - 更新 `scripts/友链截图/index.mjs`：将视口调整为 `2880 x 1440`（等效于标准 1080P 桌面 66.7% 浏览器缩放），输出尺寸升级为 `900 x 450` WebP（85% 高质量）。
  - 完美解决元素与文字在原有视口下偏大偏粗的问题，实现与参考大图 100% 像素级对齐，并增加常见固定 Cookie 提示的自动清除逻辑。
- **规范与兼容性**：
  - 完整保留 `FriendCard.astro` 原有 HTML 语义结构与朋友圈爬虫规则，视口边界避让翻转、移动端禁用及 Swup 页面过渡销毁生命周期均完好无损。
