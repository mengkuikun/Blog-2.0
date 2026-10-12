---
version: "v1.5.0"
date: 2026-05-18
time: "00:30"
type: feature
description: 新增影视封面下载脚本 fetch-media.py，支持 TMDB 搜索、海报下载、自动生成 bangumi md；影视卡片点击改为跳转详情页
---

## 新功能：fetch-media.py 影视脚本 + 影视卡片交互优化

**新增：**

- `scripts/fetch-media.py`：输入影视名称即可通过 TMDB API 搜索影视信息，自动下载海报封面到本地，生成符合博客 bangumi 格式的 Markdown 文件
- 支持快速模式（`-y`）和交互模式，TMDB 搜不到自动降级为手动填写
- 封面图自动保存在 `scripts/img-anime/`，MD 文件输出到 `src/content/bangumi/anime/`

**变更：**

- 影视与游戏页面卡片点击行为改为跳转站内 `/bangumi/{slug}/` 详情页，不再跳转外部 Douban 链接
