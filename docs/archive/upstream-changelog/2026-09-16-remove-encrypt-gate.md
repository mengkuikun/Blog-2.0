---
version: "v1.38.0"
date: 2026-09-16
type: removal
description: 移除页面加密功能，账单、笔记本、日历页恢复明文直出并重新收录
---

## 移除页面加密（EncryptGate / PasswordGate）

- 账单 `/bills/`、笔记本 `/life/notebooks/`（列表与详情）、日历 `/schedules/` 不再弹出密码门，内容直接展示，无需再输入访问密码；此前"记住过密码"的浏览器无需任何操作。
- 三个页面重新进入 `sitemap.xml`，并补上 `data-pagefind-body` 标记后进了站内搜索索引（本站 pagefind 只索引带该标记的页面，此前这三个页面本来也没被搜到）；笔记本也重新出现在归档时间线、侧栏"最近更新"与"笔记本数"统计中，与其他页面表现一致。
- 同步移除加密相关代码与配置：`src/components/security/`（EncryptGate.astro / PasswordGate.svelte）、`src/utils/encrypt-gate.ts`、`src/config/securityConfig.ts`、`src/styles/pages/encrypt-gate.css`，以及构建环境变量 `GATE_PASSWORD`（含 CI / `.env.example` / 部署文档中的对应项）。
- 内容自此完全公开：账单金额与笔记本正文会出现在页面源码、站内搜索与搜索引擎索引里。如需恢复加密，可回退本次提交（代码见 git 历史），访问密码需重新设置。
