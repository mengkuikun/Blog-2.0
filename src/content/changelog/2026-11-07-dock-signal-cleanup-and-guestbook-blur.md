---
version: "v1.55.1"
date: 2026-11-07
type: fix
description: 修复右下角工具栏生命周期事件叠加抵消 Bug，完善留言板高透光磨砂毛玻璃质感与看板娘自愈加载，优化短链双路由重定向与秒跳兜底
---

## 缺陷修复与生命周期加固

- **右下角快捷工具栏（UnifiedDock）生命周期熔断**：
  - 针对展开按钮 `ud-toggle-btn`、主题切换按钮、公告/分类/标签/音乐等所有抽屉入口以及回到顶部按钮，全量注入 `{ signal }` 生命周期控制器；
  - 在每次 Swup SPA 跨页导航重新绑定时，首先调用 `_udAbort.abort()` 物理注销上一页的所有监听器与 `MutationObserver` 观察器，彻底消除了旧监听器未清理导致的“多次叠加绑定、展开收回收缩瞬间抵消”现象，保证按钮每次点击百分百丝滑响应；
  - 最外层注入 `window.__unifiedDockGlobalBound` 单例守卫，杜绝全局事件重复挂载与内存泄漏。
- **Spine 看板娘生命周期自愈与全流程监听**：
  - 在 [`src/components/features/SpineModel.astro`](file:///f:/GitHub/Blog-plus/src/components/features/SpineModel.astro) 中补齐 `guestbook:status` 数据入场时的自愈守卫，当容器因跨页处于隐藏状态时自动拉起，彻底修复了首次从其他页面无刷新切入留言板时模型未加载的瑕疵；
  - 全面兼容 `swup:content:replaced`、`astro:page-load` 及 `swup.hooks`，确保看板娘在各种导航时机下平稳在岗。

## 交互体验与细节优化

- **留言板高透光微磨砂毛玻璃完善**：
  - 淘汰实色遮罩，全面还原与上游博客一致的高级质感：采用纯净高通透白玉底色（`color-mix(in srgb, var(--card-bg) 78%, transparent)`）、30px 高强度高斯模糊（`backdrop-filter: blur(30px) saturate(1.8)`）以及自适应高光微边框；
  - 强制常驻 GPU 独立硬件合成层（`transform: translateZ(0)` 与 `will-change: backdrop-filter`），从底层渲染管线杜绝了 Chromium 内核在长滚动列表穿过毛玻璃时自动丢弃模糊着色器的历史 Bug，文字滑入底下被深度高斯模糊撕裂打散为浅灰雾影，绝不穿透清晰黑字，呈现极致通透视觉。
- **边缘短链双路由重定向与无感秒跳兜底**：
  - 遵循腾讯云 EdgeOne 规范，在 [`edgeone.json`](file:///f:/GitHub/Blog-plus/edgeone.json) 中补全 `/mf` 与 `/mf/` 双规则，确保无论用户是否输入尾部斜杠，均在边缘 CDN 节点以 `HTTP 302` 毫秒级重定向至实战指南博文对应锚点；
  - 移除 [`astro.config.mjs`](file:///f:/GitHub/Blog-plus/astro.config.mjs) 中生成的静态过渡重定向页，避免白屏与重复刷新冲突；
  - 新增专用静态秒跳页 [`src/pages/mf.astro`](file:///f:/GitHub/Blog-plus/src/pages/mf.astro)，通过顶层 `window.location.replace` 实现无闪烁、不污染浏览器历史栈的极速兜底。

