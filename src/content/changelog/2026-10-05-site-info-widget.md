---
version: "v1.51.0"
date: 2026-10-05
type: feature
description: 移植Firefly原版“站点信息”侧边栏小组件，支持构建平台检测、运行时环境采集、GitHub Commit与手风琴卡片折叠展开，圆角完全对齐原版8px
---

## 新功能特性

### 1. 移植 Firefly 原版“站点信息（SiteInfo）”侧边栏小组件（feat）
- **功能背景**：原版 CuteLeaf/Firefly 拥有极具极客风格与透明度的站点信息小组件，站长希望将其移植到当前博客右侧边栏。
- **构建平台与运行时精准检测**：
  - 编写 `src/utils/build-platform.ts`，自动识别当前构建环境：本地开发时展示 `Local Dev`，推送到生产环境时依据环境变量自动识别为 `EdgeOne Pages`（腾讯云 EdgeOne 页面托管）或 `GitHub Actions`。
  - 自动收集已安装的 `Astro` 框架版本、Node.js 运行时版本、pnpm 包管理器版本、系统内核架构（`Windows / x86_64` 或 `Linux / x86_64`）以及精准的构建打包时间与文章版权协议。
- **常驻展示 GitHub Commit 链接**：
  - 常驻项目移除了重复冗余的博客版本，替换为当前仓库的 `GitHub Commit`（短哈希），点击可直达 GitHub Commit 历史页面，对齐 `blog.mengku.shop` 的开源展示体验。
- **手风琴折叠交互（Web Component 原生驱动）**：
  - 上半部常驻概览：展示核心构建平台、GitHub Commit 与文章版权许可；
  - 底部提供平滑的折叠/展开按钮（“展开构建信息”/“收起构建信息”），点击平滑展开对齐的网格卡片（站点域名、Firefly版本、Astro版本、Node版本、pnpm版本、构建时间、系统内核架构），图标旋转动画流畅，无第三方库依赖，完全兼容 Swup SPA 导航生命周期。
- **UI 圆角与原版 CuteLeaf/Firefly 严格一致**：
  - 小卡片与按钮圆角完全对齐原版 `rounded-lg` 规范（`8px / 0.5rem`），显式声明避免受当前主题全局变量覆盖为直角；
  - 主列表项保持原版纯净展示，移除不属于原版的整行悬停灰底；
  - 外层原有小组件容器（`WidgetLayout.astro`）完全保持既有状态不作任何变动。
- **i18n 多语言全量对齐**：
  - 严格同步 `zh_CN`, `zh_TW`, `en`, `ja`, `ru` 全部 5 个语言包中的 13 个专用国际化词条（包含 `siteInfoGitCommit`）。
