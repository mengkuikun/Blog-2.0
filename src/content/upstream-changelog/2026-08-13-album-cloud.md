---
version: "v1.22.0"
date: 2026-08-13
type: improvement
description: 相册全面图床化：9 个相册统一 imgbedFolder 动态加载，photos 静态列表废弃
---

## 相册全面图床化

- 9 个相册全部改为图床动态模式，统一目录惯例 `blog/album/<相册名>`
  - 已有图床目录（相册/xxx、武侠风、用过的头像、游戏记录）由站长手动整理至新目录
  - 第三方图床（i.imglt.com）12 张与本地资源 7 张由站长上传至自建图床
- 相册列表页移除「照片总数」统计胶囊（图床模式动态加载，静态计数恒为 0）
- 站点资源相册本地文件保留（favicon/头像等配置继续引用本地路径）
- `.pages.yml` 的 imgbedFolder 字段描述更新为 `blog/album/xxx` 新惯例
