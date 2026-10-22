---
version: "v1.55.0"
date: 2026-10-23
type: feature
description: 接入 EdgeOne 边缘短链重定向体系（/mf 直达实战指南锚点），站点信息折叠移植 Grid 阻尼展开动效，关于页技术栈修正 EdgeOne 官方矢量徽标并收录 Cloudflare
---

## 新增功能与特性

- **接入 EdgeOne 边缘短链重定向体系（/mf 直达博文锚点）**：
  - 遵循腾讯云 EdgeOne Pages 平台规范，在仓库根目录建立 [`edgeone.json`](file:///f:/GitHub/Blog-plus/edgeone.json) 边缘配置文件；
  - 配置 `/mf` 极短链接，以 `HTTP 302` 临时重定向瞬跳至《基于 MusicFree 搭建全功能个人音乐平台》博文的 `#手把手保姆级实战指南` 锚点；
  - 在 [`astro.config.mjs`](file:///f:/GitHub/Blog-plus/astro.config.mjs) 中建立动态单源同步机制，实现“单一配置源（Single Source of Truth）”，本地开发环境（`localhost:4321/mf`）与线上 EdgeOne 生产边缘节点全自动双向同步，免除手动维护多份配置的负担。
- **关于页技术栈收录 Cloudflare**：
  - 在关于我（`/about/`）页面的「部署与数据」分组中新增 Cloudflare 卡片，收录官方经典橙色云朵图标与“DNS 与安全防护”功能定位。

## 交互体验与动效优化

- **重构侧边栏站点信息（SiteInfo）平滑阻尼折叠动效**：
  - 彻底淘汰原先基于 `max-height: 500px` 产生的假动画与后段严重顿挫卡顿感；
  - 移植关于页技术栈同款现代 CSS Grid `grid-template-rows: 0fr -> 1fr` 轨道尺寸插值方案，搭配专属物理阻尼贝塞尔曲线（`cubic-bezier(0.22, 1, 0.36, 1)`），实现由 GPU 合成层驱动的 60fps 真正自适应高度平滑收放；
  - **指标卡片瀑布式微距渐入**：展开时 7 个构建指标卡片以每项 35ms 的序列延时交错滑入（Stagger 动画），增强层次质感；
  - **箭头图标阻尼同步旋转**：展开与收起时箭头平滑旋转 180°，与主体舒展节奏完全一致；
  - **属性驱动与无障碍**：将展开收起状态解耦至 `<site-info-collapse data-expanded="...">` 自定义元素原生属性，移除对 DOM 内联 `style` 的直接修改，并内置 `prefers-reduced-motion` 降级支持。

## 缺陷与细节修复

- **修正关于页 EdgeOne 图标混用问题**：
  - 修复此前「部署与数据」中 EdgeOne 卡片临时借用 Cloudflare 橙色云朵图标的遗留问题；
  - 提取并采用腾讯云 EdgeOne 官方专属矢量徽标（圆形 `1E` 科技蓝造型），支持自适应色彩切换（浅色 `#0055d2` / 深色 `#2979ff`），并补齐完整的可访问性 `role="img"` 与 `aria-label` 声明。
