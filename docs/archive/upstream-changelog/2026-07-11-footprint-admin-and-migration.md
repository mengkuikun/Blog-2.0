---
version: "v1.10.0"
date: 2026-07-11
time: "23:00"
type: feature
description: 新增足迹管理后台、Gist 暂存机制与本地迁移脚本，修复足迹地图 Swup 导航加载问题
---

## 足迹管理后台

- 新增 `/admin/places/` 后台页面，支持在出门在外时通过浏览器快速创建足迹
- 表单包含省份、城市、详细地址、日期、到访次数、体验描述、标签、照片等字段
- **坐标获取**：填写地址后一键调用高德地图地理编码 API（含 POI 搜索 fallback），自动填充经纬度
- Token 输入框置于页面顶部，与说说、笔记本等后台保持一致的 UI 风格
- 支持编辑、删除已有足迹条目

## Gist 暂存机制

- 后台添加的足迹数据直接保存到 GitHub Gist（暂存库），不写入本地文件
- 博客足迹页面只展示本地 Markdown 数据，与 Gist 暂存数据完全隔离
- 数据格式与本地 frontmatter 字段一一对应，便于后续迁移

## 足迹迁移脚本

- 新增 `scripts/MigrationFootprint/index.js`，一键将 Gist 中的暂存足迹迁移为本地 Markdown 文件
- 支持 `--dry-run`（仅预览）和 `--keep-gist`（迁移后保留 Gist 数据）参数
- 自动按日期+省份+城市去重，同名文件追加序号

## 足迹地图 Swup 导航修复

- **问题**：从首页导航栏点击跳转到足迹页面时地图不显示，需手动刷新才能加载
- **根本原因**：项目使用 Swup 进行页面切换，只替换 `#swup-container` 内容，不重新执行外部脚本；原脚本放在 `#swup-container` 外部，导航时不会执行
- **修复**：将初始化脚本通过 `slot="head"` 移入 `<head>`，利用 @swup/head-plugin 在导航时自动重新执行脚本
