---
version: "v1.25.0"
date: 2026-02-09
type: feature
description: 新增账单/资金与日程两版块，A 密集版式 + 苹果毛玻璃
---

## 账单/资金与日程

- 新增 `bills` 与 `schedules` 两集合（`src/content.config.ts` + `.pages.yml`），前端 `src/utils/bill-adapter.ts` / `schedule-adapter.ts` 聚合
- 资金页 `/bills`：四宫格 + 分类占比 + 近 6 月结余 + 按日流水，账户与类型字段预留 AstrBot 写入
- 日程页 `/schedules`：左历右单双栏（细线网格+毛玻璃，选中黑底白字），清单优先级圆点与完成态
- 导航新增“资金/日程”，`docs/astrbot-contract.md` 定义 Phase1 写入契约

## 验证

- `pnpm check 0 errors`，`pnpm build 385 page(s) built`
