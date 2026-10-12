---
version: "v1.28.0"
date: 2026-08-26
type: feature
description: 复刻关于页 Q&A 与变更链路图谱，更新日志页改为全量蛇形网格
---

## 关于页复刻与更新日志图谱化

- **关于页重做**：`src/pages/about.astro:1` 引入 `PageTitle` + `SiteStructuredData` + `ChangelogGraph`，正文由 `src/content/spec/about.md` 改为 `src/content/spec/about.mdx:1` 的 Q&A 结构（Q1 技术栈 / Q2 社交圈 / Q3 开源），内容替换为夢酷，GitHub 卡片指向 `mengkuikun/dumplingandcakeblog`
- **关于组件接入**：新增 `src/components/about/AboutChatBubble.astro:1`、`src/components/about/AboutProfileCard.astro:1`、`src/components/about/AboutSocialLinks.astro:1`、`src/components/about/AboutTechStack.astro:1`、`src/components/about/AboutTimeline.astro:1`、`src/components/about/ChangelogGraph.astro:1`，并在 `src/styles/main.css:76` 引入 6 份 `src/styles/components/about-*.css`
- **更新日志图谱化**：`src/pages/changelog.astro:1` 由旧时间轴替换为 `ChangelogGraph` 全量蛇形网格（`limit={0}` 展示全部，约 49 条），`src/utils/changelog.ts:77` 新增 `buildChangelogLinks` 每卡上限 6 条关联，连线改为稀疏贝塞尔悬停揭示
- **样式与弹窗修复**：`src/styles/components/about-chat-bubble.css:35` 固定圆角避免 `--radius-large:0` 置零、`src/styles/components/about-changelog.css:336` 弹窗固定 `0.75rem` 圆角并提升至 `z-index: 2147483647` 盖住侧栏，弹窗文本改为 `summary + version` 纯文本避免源码乱码
- **国际化**：`src/i18n/i18nKey.ts:1` 新增 `aboutDescription / aboutSitePrefix / aboutChangelog* / changelogType* / close / aboutQ*`，`src/i18n/languages/zh_CN.ts:1` 等 5 语言补齐

验证：`pnpm build` 368 页、`pnpm exec biome ci` 仅既有 `noNonNullAssertion` 警告。
