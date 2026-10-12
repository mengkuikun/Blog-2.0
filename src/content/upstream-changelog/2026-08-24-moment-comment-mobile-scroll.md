---
version: "v1.26.1"
date: 2026-08-24
type: fix
description: 修复说说移动端评论卡片背景半透明与滚动穿透（滑动评论时背景列表跟着滚）
---

## 说说评论卡片移动端修复

- **背景不透明**：移动端（≤768px）全屏评论面板背景由 `oklch(1 0 0 / 0.78)` 半透明毛玻璃改为 `var(--float-panel-bg)` 不透明底色，并关闭 `backdrop-filter`，不再透视背后的说说列表 `src/components/moments/MomentCommentChat.svelte`；桌面端毛玻璃效果保持不变
- **滚动穿透**：弹窗打开时背景滚动锁由仅锁 `body` 升级为 `html + body` 双锁（仅锁 body 在 iOS 上仍会被触摸滚动穿透），新增 `lockBackgroundScroll/unlockBackgroundScroll` 统一管理，替换组件内全部 10 处调用点（评论弹窗、公告弹窗、删除弹窗共用，保留原有 `!visible` 协调逻辑）
- **滚动链阻断**：`.guestbook-chat__messages` 增加 `overscroll-behavior: contain`，评论列表滚到顶/底后不再把滚动甩给背景页面 `src/styles/components/guestbook-chat.css`，留言板页同步受益
- **验证**：`pnpm check` 0 errors；`pnpm exec biome check` 通过；移动视口浏览器实测背景不透明、真机确认穿透修复
