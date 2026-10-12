---
version: "v1.12.0"
date: 2026-07-12
time: "03:30"
type: feature
description: 分类标签页面 ECharts 图表改造，首页玻璃雨珠特效，网站导航管理脚本
---

## 构建错误修复

- **问题**：`npm run build` 报错 `NoAdapterInstalled`，无法构建
- **根本原因**：`src/pages/api/place.ts` 声明了 `prerender = false`（需要 SSR），但项目未配置 SSR adapter
- **分析**：该 API 的 CRUD 功能实际未被使用（后台通过 GitHub Gist 存储数据），仅地理编码功能被调用
- **修复**：删除 `api/place.ts`，将地理编码改为前端直接调用高德 API

## 迁移脚本修复

- 修复 `scripts/MigrationFootprint/index.js` 的 `remaining` 逻辑 bug：无日期、重复、写入失败的条目现在始终保留在 Gist 中，避免默认模式下误清全部数据
- 新增 `--token=ghp_xxx` 命令行参数支持，优先级：命令行 > 环境变量 > `.env` 文件 > config 文件
- 修复 YAML 序列化：数组元素（tags 等）统一加引号，避免纯数字值（如 `"2025"`）被解析为 number 类型导致 schema 校验失败

## 首页标题彩虹着色

- "Dumpling" 标题改为逐字母 `<span>` 渲染，每个字母独立着色
- 颜色方案：D 深红 → u 珊瑚橙 → m 琥珀金 → p/l 浅金 → i 翡翠绿 → n 蓝色 → g 紫色
- 逐字弹入动画：`back.out(1.4)` 弹性效果，0.04s 间隔依次入场
- 修复 HatchEffect 铅笔线条效果：`originalColor: true` 保留字母原色，不再覆盖为白色
- VFX canvas `zIndex` 降低为 10，避免遮挡弹窗等高层级元素

## 首页磨砂玻璃移除

- 移除人物图片（home2.webp）背后的 `.home-hero__art-window` 磨砂玻璃卡片（`display: none`）
- 原因：新更换的人物图实际为 PNG RGBA 格式（带透明通道），透明区域露出了下方的 `backdrop-filter` 效果

## 友链页面手绘风格改造

- 新增 `FriendCard.astro` 组件：垂直卡片布局，顶部胶带标签 + 头像 + 名字 + 介绍框
- 手绘风格设计：稿纸横线背景、不规则圆角（`255px 14px 225px 14px`）、硬阴影偏移
- 涂鸦头像 fallback：加载失败/超时时显示手绘脸（头发 + 眼睛 + 腮红 + 微笑），带眨眼动画
- 介绍框悬停扩展：默认1行，hover 时扩展到6行，所有卡片统一高度
- 标签筛选改为胶囊按钮 + 滑动指示器（`ease-[cubic-bezier(0.4,0,0.2,1)]`）
- 新增分页功能：每页9个友链，带页码导航
- 头像按需加载：卡片可见时才注入 `src` 触发请求，解决 Swup 导航后 `loading=lazy` 不生效的问题
- Gist 外部友链适配新卡片结构
- 修复 Swup 导航后布局错乱：双帧 `requestAnimationFrame` 延迟定位指示器

## 分类标签页面改造

- 新增 `CategoryRose.astro` 组件：ECharts 玫瑰图（`roseType: "area"`）展示分类分布，右侧分类列表支持 hover 放大
- 新增 `TagGraph.astro` 组件：ECharts 力导向图展示标签共现关系，节点大小按文章数缩放，连线粗细按共现次数缩放
- 新增 `tag-graph-data.ts` 工具函数：构建标签共现图谱数据（nodes + links），支持配置共现阈值
- 标签图谱支持拖拽、缩放、平移，hover 高亮相邻节点（`emphasis: adjacency`）
- 图表动态加载 ECharts CDN，支持暗色主题实时切换
- 点击图表节点/列表项跳转对应分类/标签页

## 首页玻璃雨珠特效

- 新增 Canvas 2D 雨珠系统：竖向水痕 + 底部圆点高光，模拟镜头玻璃上的雨水
- 撞击迸溅：雨滴碰到聊天框（`.home-hero__speech`）和装饰角标顶边时生成扇形水花粒子
- 底部迸溅：雨滴落到底部同样产生水花
- 性能控制：雨滴数量 ~20-60 个，水花上限 90 个，移动端和减弱动效模式自动禁用
- 雨珠固定白色，不随主题切换

## 网站导航管理脚本

- 新增 `scripts/add-daohang/index.js`：交互式添加网站导航条目
- 自动获取 ICO 图标（调用 xxapi.cn 免费 API）
- URL 查重：检测网址是否已存在，支持编辑模式（预填原值）和新建模式
- 编辑模式：所有字段预填原值，回车保留，自动重新获取 ICO 以修复失效图标
- 智能分类：预设分类 + 已有文件分类自动合并，支持创建新分类
- 颜色选择：9 种预设颜色 + 自定义色值
- 自动排序：新条目自动分配 order 值
- 注册到 CLI 菜单：`pnpm cli nav`
- 新增使用文档文章：《网站导航管理脚本使用指南》
