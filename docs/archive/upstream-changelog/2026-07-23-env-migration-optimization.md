---
version: "v1.17.1"
date: 2026-07-23
time: "20:30"
type: improvement
description: 敏感信息迁移到环境变量、跑马灯优化、首页背景图无闪烁切换、评论系统修复、足迹页面优化、图片压缩
---

## 敏感信息迁移到环境变量

- 所有硬编码的 Key/Token/密码迁移到 `.env` 文件管理
- 支持的环境变量：高德地图 Key、Umami 统计、Waline 评论、后台密码哈希
- `.env` 已加入 `.gitignore`，不会上传到 GitHub
- 创建 `.env.example` 模板文件
- 部署平台（EdgeOne Pages/GitHub Pages）设置对应环境变量即可

## 跑马灯优化

- DOM 数量从 4 份减少到 3 份，降低内存占用
- 移除 JS 动态计算宽度逻辑，改为纯 CSS 动画控制
- 删除 `initHomeTicker()` 函数
- 滚动速度提升一倍（30s → 15s）

## 首页背景图无闪烁切换

- 桌面端和移动端背景图都改为预加载后无缝切换
- 初始 `src` 为空，随机图片预加载完成后才设置
- 同时预加载背景图和装饰图，全部加载完成后一起切换
- 彻底消除切换时的灰色闪烁和 `home1/home.webp` 闪烁

## 评论系统修复

- 删除 `moments.astro` 中重复的评论脚本，只保留 `Layout.astro` 中的
- 修复 `walineServerURL` 变量作用域问题（移入 `define:vars` 块内）
- 修复从首页进入说说页面评论加载失败的问题
- 修复刷新页面后评论按钮无响应的问题

## 足迹页面优化

- 地图分类筛选栏改为默认收起，点击箭头展开
- 移除下方地点列表区域，只保留地图展示
- 添加 Waline 评论区

## 图片压缩

- 新增 `pnpm compress-images` 批量压缩脚本
- 支持压缩 `sjtapi`、`mobile-bg`、`home` 三个目录
- 压缩率约 78%（64MB → 14MB）
- 支持 `--dry-run` 预览、`--quality` 自定义质量、`--dir` 指定目录

## Gist 数据图片备份

- 同步说说数据时自动下载图片到 `F:\电脑备份文件夹\CloudFlare-ImgBed\telegram\手机uu`
- 同步影视数据时自动下载封面图到 `F:\电脑备份文件夹\CloudFlare-ImgBed\telegram\anime`
- 已存在的图片自动跳过，不影响主流程

## 其他改进

- 个人资料小组件背景图改为静态图片
- 恋爱小组件标题显示总天数
- 关闭桌面端主页雨滴特效
- 移动端加载动画硬超时缩短到 800ms
