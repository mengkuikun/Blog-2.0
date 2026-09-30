---
version: "v1.45.0"
date: 2026-09-30
type: feature
description: 接入自动化朋友圈服务（cir.imki.cn）：基于 hexo-circle-of-friends 与 EdgeOne 静态托管
---

## 接入自动化博客朋友圈

- 搭建并接入自动化朋友圈爬虫服务：Fork 并配置 `hexo-circle-of-friends`（Rust core + Simple Mode），通过 GitHub Actions 定时爬取友链好友最新博文。
- 自定义 Firefly 主题抓取适配规则：针对博客 `FriendCard.astro` 的 HTML 特征适配选择器（`.friend-card` 的 `data-title`、`data-siteurl` 以及懒加载头像 `data-src`），精准识别友链列表。
- 采用腾讯云 EdgeOne Pages 零成本托管爬虫生成的静态 `data.json`，配置 `edgeone.json` 跨域 CORS 请求头，并绑定独立二级域名 `cir.imki.cn`。
- 博客前端 `src/config/circleConfig.ts` 正式连通 `https://cir.imki.cn/data.json`，`/circle/` 页面实时展示鱼塘统计、随机最新动态及好友文章卡片。
