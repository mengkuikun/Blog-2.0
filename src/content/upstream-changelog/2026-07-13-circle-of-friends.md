---
version: "v1.15.0"
date: 2026-07-13
time: "18:00"
type: feature
description: 新增朋友圈页面，展示好友最新文章动态；后台友链管理支持更多格式
---

## 朋友圈页面

- 新增 `/circle/` 页面，自动抓取并展示好友最新文章
- 数据来源：hexo-circle-of-friends Simple Mode，通过 EdgeOne 托管的 JSON 文件
- 4 列响应式网格布局，支持无限滚动加载
- 统计栏显示友链总数、活跃数、文章数

## 卡片设计

- 标题左上角，博主名称左下角胶囊标签
- 头像右下角半透明水印，悬浮时放大变清晰
- 日期覆盖在头像图层上方
- 卡片悬浮上浮效果

## 动态通知条

- 从最新 6 篇文章中随机展示一条
- 点击刷新按钮显示「钓鱼中...」动画后切换新文章
- 博主名称橙色可点击，文章标题红色可点击

## AI 摘要图标

- AI 摘要图标改为 OpenAI logo
- 亮色模式显示黑色图标，暗色模式显示白色图标

## 后台友链管理

- 添加友链支持新的 YAML 格式识别
- 支持 `name`、`link`、`avatar`、`descr` 关键字
- 兼容原有格式，两种格式均可识别

## 技术实现

- 使用 hexo-circle-of-friends 项目抓取好友文章
- EdgeOne Pages 托管 data.json，配置 CORS 跨域
- 自定义 Firefly 主题 CSS 选择器规则
- Astro 组件样式使用独立 CSS 文件解决 scoped 失效问题
- Swup 兼容：astro:page-load 事件 + 初始化标记重置
