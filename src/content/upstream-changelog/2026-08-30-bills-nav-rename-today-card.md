---
version: "v1.31.0"
date: 2026-08-30
time: "14:55"
type: feature
description: 导航"资金"更名"账单"，账单页新增今日支出统计区块
---

## 账单页体验更新

- 导航栏入口更名：桌面端"我的"下拉与移动端菜单抽屉中的"资金"统一改为**"账单"**，与页面标题一致（`navBarConfig.ts` / `MobileMenuSheet.astro`）。
- 账单页底部新增**今日支出**区块：显示当日支出、收入、记账笔数与日期，数据由构建时的 `getTodayMonthYearStats()` 现成计算（today 档），位于加密区内不泄露；配色沿用全站惯例（收入红 / 支出青），适配暗色模式与移动端。
