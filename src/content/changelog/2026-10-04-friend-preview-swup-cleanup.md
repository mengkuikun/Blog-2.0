---
version: "v1.49.1"
date: 2026-10-04
type: fix
description: 修复友链页面悬浮大图在 Swup SPA 导航切页后跟随光标游荡的问题
---

## 友链悬浮大图预览切页销毁与 AbortController 生命周期规范化

- **Swup SPA 切页残留与跟随游荡修复**：
  - **根因分析**：原实现将大图预览浮层 `#friend-preview` 挂载在 `document.body` 上，在通过 Swup SPA 导航切换至其他页面时，容器外的 Portal 浮层未被物理移除；同时 `mouseover`、`mouseout`、`mousemove` 等全局事件监听器未注销，且目标页面缺少 `.friend-card` 导致 `hidePreview()` 无法触发隐藏，浮层因此死锁在可见状态并随鼠标游荡。
  - **规范化改造（`src/pages/friends.astro:245`）**：
    - 引入 `AbortController` 机制，将所有鼠标移动、移入移出与窗口滚动监听器绑定至控制器信号 `{ signal }`。
    - 增加 `destroyPreview()` 销毁函数：在离开页面瞬间调用 `abortCtrl.abort()` 注销全部监听器，清空防抖定时器，并彻底物理移除 `document.body` 下的 `#friend-preview` DOM 节点。
    - 挂载 `swup:visit:start`、`swup:willReplaceContent` 与 `astro:before-swap` 离场钩子，在点击链接切页的瞬间瞬时销毁浮层。
    - 在 `swup:content:replaced` 与 `astro:page-load` 入场时加入环境守卫检测（`[data-friends-grid]`），仅在友链页初始化，非友链页自动清理退出。
    - 在 `mousemove` 内设置防御兜底：若当前 DOM 中无 `.friend-card` 立即自毁退出。
