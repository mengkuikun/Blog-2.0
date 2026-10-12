---
version: "v1.24.0"
date: 2026-08-21
time: "10:00"
type: feature
description: 动态评论改为单频道聊天室，共用留言板样式，带动态引用块
---

## 动态评论聊天室重构

- **单频道与引用**：动态页所有评论共用 Waline 频道 `src/utils/moment-chat.ts:5` `MOMENT_CHANNEL="/moments/"`，发送时按 `>>MOMENT>>id||published||excerpt<<MOMENT<<` 协议带引用块（`src/utils/moment-chat.ts:203` `buildMomentBody`），历史消息在 `src/components/moments/MomentCommentChat.svelte:1178` 以 `moment-quote` 引用块展示 `published + 摘要`，发送成功后清空 `momentQuote`
- **弹窗复用留言板**：`src/components/moments/MomentCommentChat.svelte:1` 拷 `src/components/features/GuestbookChat.svelte` 的数据流（`PAGE_SIZE=30` / 30s 轮询 / `AbortController` / `mergeMomentMessages` 乐观更新 / 离线与可见性），复用 `GuestbookChatMessage` 与 `GuestbookChatComposer`，样式复用 `src/styles/components/guestbook-chat.css:236` 的 `workspace 1fr 18rem` 与 `@768` 抽屉+遮罩
- **卡片简化**：`src/components/moments/MomentCard.astro:12` 移除 `detail` prop 与 `card-comment-section` 分支，卡片右下保留单一 `comment-toggle-btn` 并补 `data-moment-id/published/excerpt`（`momentExcerpt` 纯文本截 80 字符）
- **页面接入**：`src/pages/moments.astro:5` 移除 `CommentModal` 改挂 `MomentCommentChat client:only="svelte"`，并注入 `__momentCommentDelegateBound` 点击委托（`window.__momentComment.open(id,published,excerpt)`），删除 `src/pages/moments/[slug].astro` 详情页，构建由 470+ 降至 383 页
- **样式补齐**：`src/components/moments/MomentCommentChat.svelte:1460` 新增 `.moment-comment-modal` 弹窗壳（`fixed inset:0 / z-index:var(--z-modal) / 遮罩 oklch(0 0 0 / 0.42)+blur`，面板 `58rem x 92dvh`，移动端 `100dvh` 全屏）与 `.moment-quote` 左框线引用块

## 后续修复（当天迭代）

- **毛玻璃与偏移**：`src/components/moments/MomentCommentChat.svelte:1538` 遮罩 `blur(12px) saturate(1.15)`，卡片 `oklch(1 0 0 / 0.78) + blur(22px) saturate(1.4) + 白边`（暗色 `0.16 / 0.72`），`padding-top: calc(... + 3.25rem)` 避开 sticky 导航栏，移动端 `100dvh` 全屏，`@768` 内 `:global(.guestbook-composer)` 覆写去掉 `6.25rem` 的 MobileDock 留白，直接贴底（仅留 `safe-area-inset-bottom`）
- **回复链路**：`src/utils/moment-chat.ts:12` 新增 `MOMENT_REPLY_RE = /^<!--moment-reply:(\d+):([^>]*)-->\s*/u`，`parseMomentMessageBody` 兼容两种首行标记顺序，`normalizeMomentComment` 带 `replyToId/replyToNick`；`MomentCommentChat.svelte:980` `selectReply/jumpToQuotedMessage` 打通 `onReply/onJump`，`GuestbookChatMessage:155` `quotedMoment` 合并为气泡内 `guestbook-message__quote` 同款引用（`span 0.75rem + small 0.72rem`），输入区 `replyTarget` 与 `momentQuote` 互斥（回复时隐藏动态引用），发送 `buildMomentReplyBody`/`buildMomentBody` 互斥叠加，发送成功同时清两者
- **动态公告与规范**：新增 `src/config/momentConfig.ts:1`（沿用 `GuestbookConfig`，8 条合规规范，国内法律法规口径），`MomentCommentChat:23` 改引 `momentConfig`，文案“群公告/群信息”改为“动态公告/动态信息”，输入框下方新增 `<details class="moment-rules">` 可展开规则区（`max-height 42vh` 可滚动）
- **引用展示**：`GuestbookChatMessage.svelte:66` `formatMomentQuoteDate` 仅保留 `YYYY-MM-DD`，`momentQuote` 拆两行（`span 引用动态 · 日期` + `small.moment-quote__text 两行截断`），`guestbook-chat.css:1018` 新增 `.moment-quote__text { white-space: normal; -webkit-line-clamp: 2 }`

## 验证

- `pnpm build` Complete（383 page(s) built，无 `moments/[slug]`），`pnpm check` 0 errors，`dist/moments/index.html` 内 `data-moment-id/published/excerpt` 与 `__momentComment` 已就绪
