---
version: "v1.26.0"
date: 2026-08-24
type: feature
description: 全站评论区游客邮箱改为必填，统一四个评论入口的资料校验
---

## 评论区邮箱必填

- **原因**：匿名评论缺邮箱导致博主无法回复通知，各评论入口校验不一致
- **Waline 官方评论区**（文章/友链等页面）：`src/components/comment/Waline.astro:15` 增加 `requiredMeta: ["nick", "mail"]`，昵称与邮箱必填后提交
- **留言板**：`src/components/features/GuestbookChat.svelte:693` 游客发送前校验资料含邮箱；`src/components/features/GuestbookChatComposer.svelte:136` 游客资料弹窗保存时邮箱必填
- **朋友圈评论**：`src/components/moments/MomentCommentChat.svelte:672` 游客发送校验邮箱必填
- **笔记评论区**：`src/components/comment/NotebookComment.svelte:181` 原本已必填，保持不变
- **登录用户不受影响**：邮箱自动取登录账号邮箱，校验仅拦截游客
- **验证**：`pnpm exec biome check` 4 文件通过；浏览器实测文章页/留言板/朋友圈/笔记四处校验生效
