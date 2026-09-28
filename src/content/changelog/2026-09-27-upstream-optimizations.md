---
version: "v1.41.0"
date: 2026-09-27
time: "14:33"
type: feature
description: 适配上游优化：新增 Atom feed 与 llms.txt，OG 图改用本地字体
---

## 上游优化适配

- 新增 **Atom feed**（`/rss.xml`）：提供标准的 Atom 订阅源，订阅聚合工具可直接抓取站内更新。
- 新增 **llms.txt**：面向大语言模型/爬虫的站点索引文件，提升站点在 AI 检索场景的可发现性。
- **OG 分享图**移除 Google Fonts 构建依赖，改为使用本地字体：消除构建期对外网资源的需求，分享图生成更稳定、更快。
