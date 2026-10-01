---
version: "v1.48.1"
date: 2026-10-02
type: fix
description: 修复亮色模式下导航栏链接文字不可见问题（移除错误的 prefers-color-scheme 暗色媒体查询，统一为设计令牌）
---

## 修复亮色模式下导航栏链接文字看不清问题

- **排查与根因分析**：
  - 用户系统偏好为暗色模式（OS Dark Theme）时，在博客中手动切换为亮色模式，顶部导航胶囊背景变白，但导航项链接（如“主页”、“网站导航”、“动态”等未高亮项）字体依然呈现白色，导致白底白字完全看不清。
  - 根因为 `buttons.css` 与 `dropdown.css` 中独立使用 Tailwind v4 的 `@reference "tailwindcss"`，导致 `@apply dark:text-white/75` 被编译为了 `@media (prefers-color-scheme: dark)` 原生媒体查询，而非受博客主题类 `:root.dark` 控制；即使页面为亮色模式，也会被系统暗色首选项强行匹配。
- **规范化改造**：
  - 遵循 `CLAUDE.md` 与 `AGENTS.md` 规范，彻底清除 `buttons.css` 与 `dropdown.css` 中的硬编码颜色与 `dark:` 媒体查询。
  - 将 `.btn-plain`、`.btn-line`、`.btn-card.disabled`、`.btn-regular` 等按钮及 `.dropdown-item` 的颜色统一映射到设计令牌 `var(--deep-text)` 与 `var(--btn-content)`。
  - 在 `dropdown-menu.css` 与 `navbar-new.css` 中为导航栏链接显式声明 `color: var(--deep-text)` 与悬停色 `var(--primary)`，保证在亮色模式下始终呈现清晰锐利的深黑文字，暗色模式下自适应切换为柔和银白文字。
