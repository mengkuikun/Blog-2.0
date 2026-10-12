---
version: "v1.5.0"
date: 2026-06-07
time: "23:00"
type: feature
description: 暗色模式全面修复 + 样式架构重构 + 首页工具栏改造 + 导航栏骷髅主题开关
---

## 暗色模式色调修复

- 修复导航栏链接在暗色模式下不可见的问题（btn-plain 文字色）
- 修复文章目录（侧边栏 + 浮动目录）暗色模式文字不可见
- 修复 PostMeta 日期/分类/标签/浏览量暗色模式不可见
- 修复 text-50、text-30、text-75 等文字透明度工具类暗色模式失效
- 修复今日一言小组件使用不存在的 `--text-color` 变量
- 修复笔记本详情页硬编码背景色（#fff/#1a1a1a）改用设计令牌
- 修复音乐播放按钮暗色模式图标不可见
- 修复分类小组件徽章数字暗色模式不可见
- 修复所有 `bg-(--primary) text-white` 按钮暗色模式白底白字

## 设计令牌调整

- 暗色模式 `--primary` 从 oklch(0.85) 改为 oklch(0.98)（更白）
- 暗色模式 `--title-active` 从 oklch(0.70) 改为 oklch(0.80)

## 样式架构重构

- variables.styl 迁移为纯 CSS（tokens/colors.css、breakpoints.css、animation.css、z-index.css）
- main.css（938行）拆分为 17 个模块文件（base/components/features/layout/transitions/vendor）
- markdown-extend.styl 迁移为 CSS
- 4 个组件的 Stylus 样式迁移为纯 CSS
- 建立 CSS Cascade Layers 分层架构

## Swup 过渡修复

- 修复子元素 onload-animation 与容器双重 opacity 冲突
- 修复过渡期间 Banner 高度跳动
- 修复隐藏侧边栏容器动画期间闪烁
- 将 lg:is-home 类切换从 visit:start 移到 content:replace

## 首页工具栏改造

- 移除顶部 CategoryBar 分类导航栏
- 新增 CategoryTools 组件（封面图开关 + 分类气泡菜单）
- 封面图开关采用拨动开关样式（:) / :( 表情）
- 分类按钮采用 BubbleMenu 样式（药丸形状、奇偶交替旋转、弹入动画）
- 工具栏仅在首页显示

## 侧边栏调整

- 左侧边栏关闭：公告、音乐、分类、标签、生活统计
- 右侧边栏日历和站点统计移到左侧边栏底部
- 站点统计合并影视/书籍/游戏/音乐/足迹/日常规划为「记录次数」

## 导航栏改造

- 主题切换按钮从右下角浮动栏移到导航栏登录按钮左侧
- 采用 an.md 骷髅开关样式（原版 CSS + scale 缩放适配）
- 封面图开关默认为隐藏状态
