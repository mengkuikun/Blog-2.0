---
version: "v1.32.0"
date: 2026-08-30
time: "15:50"
type: removal
description: 关于页面移除底部更新日志区块，统一走独立的更新日志页面
---

## 移除关于页的更新日志区块

- 关于页（/about/）底部不再展示更新日志图谱，更新日志统一在独立页面 **/changelog/** 查看（导航"记录 → Changelog"）。
- 更新日志图谱组件（ChangelogGraph）本身保留，仍服务于 /changelog/ 页；仅移除了关于页的嵌入与对应的无用样式规则（`.about-page__changelog`）。
