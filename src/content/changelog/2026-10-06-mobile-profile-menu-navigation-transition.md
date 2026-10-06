---
version: "v1.51.2"
date: 2026-10-06
type: feature
description: 移动端资料卡支持平滑回退至菜单页面并优化转场衔接动效，新增吸顶操作栏与手势/遮罩回退联动，并完成移动端抽屉滚动穿透全面治理
---

## 新增功能与体验优化

### 1. 移动端资料卡与菜单抽屉平滑回退与错峰转场动效
- **来源感知与回退流转优化**：
  - 此前移动端在通过菜单抽屉点击进入站长资料卡后，退出时直接彻底关闭并回到博客正文，用户无法直接返回菜单继续浏览导航条目。
  - 控制器新增来源上下文跟踪机制（`openedFrom: "menu"`）：当从菜单抽屉进入资料卡时，卡片顶部动态展示“返回菜单”胶囊；用户点击返回、向下滑动卡片、点击背景遮罩或按下 Esc 键时，控制器优先调用平滑退场流程，在 160ms 黄金错峰时间窗口后自动唤起菜单抽屉，实现“菜单 → 资料卡 → 菜单”的自然闭环交互。
  - 右上角保留专属关闭按钮（`closeBtn`），用户亦可一键直接彻底退出所有浮层返回正文。

### 2. 资料卡面板移动端吸顶操作栏构建
- **CSS Grid 三列对称居中规范**：
  - 遵循 `CLAUDE.md` §15 抽屉操作栏规范，为移动端资料卡卡片顶部构建专属吸顶工具栏（`.navbar-profile-card__mobile-header`）：
    - **左侧**：返回菜单按钮（`[data-profile-back-btn]`），含平滑箭头图标与动态文案标签；
    - **中间**：页面标题“站长资料”（居中对齐 `justify-self: center`），在纯文档流下精确居中；
    - **右侧**：关闭按钮（`[data-profile-close-btn]`）。
  - 桌面端媒体查询保持 `display: none`，完全不破坏桌面端双栏面板的原始纯粹视觉体验。

### 3. 微动效与性能体验打磨
- **透明度与位移动态协同**：
  - 移动端资料卡面板进出场过渡由单一 `transform` 升级为 `transform 0.28s cubic-bezier(0.32, 0.72, 0.29, 1), opacity 0.22s ease` 协同动效，消除卡片下滑至屏幕底部时的生硬边缘感；
  - 返回胶囊按钮补充 `:active` 缩放与向左微移（`scale(0.96) translateX(-2px)`）触觉反馈，交互更富生命力与层级质感。

### 4. 移动端抽屉与遮罩滚动穿透治理（Body Scroll Lock & 滚动边界隔离）
- **CSS 物理边界切断**：
  - 在 `.menu-sheet` 与 `.navbar-profile-card` 容器上补充 `overscroll-behavior: contain;`，彻底隔绝卡片内部上下滑动到边界时的滚动链（Scroll Chaining）向外层正文传递；
  - 在半透明遮罩 `.menu-sheet-overlay` 与 `.navbar-profile-mask` 上声明 `touch-action: none;` 并绑定 `touchmove: preventDefault`，彻底阻止背景触摸滑动穿透正文。
- **JS 双层视口滚动锁定与平滑过渡**：
  - 打开抽屉或资料卡时，统一对 `document.documentElement` 与 `document.body` 执行 `overflow = "hidden"` 强锁定，兼容 iOS Safari 与 Android 移动视口；
  - 在“菜单 ↔ 资料卡”相互流转的过渡期间延续锁定，避免抽屉切换时底层正文出现瞬间闪烁或跳动；所有抽屉彻底关闭或 Swup 跨页导航时自动安全解锁。
