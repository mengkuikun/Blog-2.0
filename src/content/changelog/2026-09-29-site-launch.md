---
version: "v1.43.0"
date: 2026-09-29
type: feature
description: 站点正式上线：接入评论系统与访问统计、足迹地图、ICP 备案与「我的网站」导航
---

## 站点上线

- 接入 **Waline 评论系统**（comment.imki.cn）与 **Umami 访问统计**（umami.imki.cn）。
- 足迹页接入 **高德地图**，补齐 JS API 2.0 安全密钥。
- 页脚补充 **ICP 备案号**，站点域名启用 **imki.cn**。
- 导航新增「我的网站」分类：Waline 评论系统、个人博客、Umami。
- 修复 Astro 7 升级导致的文章浏览量、相关文章、友链截图等显示回归。
- 站点统计运行时长改为按首次提交远程日期计算。