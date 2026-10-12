---
version: "v1.30.0"
date: 2026-08-30
time: "13:40"
type: feature
description: 资金/账单与笔记本页面接入构建时加密：毛玻璃密码门，未解锁时源码只有密文
---

## 页面加密（私密空间毛玻璃门）

- `/bills/`（资金/账单）、`/life/notebooks/`（笔记本列表 + 全部笔记本详情页）与 `/schedules/`（日程日历）的内容在**构建时**用 PBKDF2(250k 迭代) + AES-256-GCM 加密成密文内联进页面，HTML 源码/抓包/开发者工具中**没有任何明文**，输入访问密码后浏览器解密渲染。
- 未解锁时显示**全页毛玻璃门**：模糊的骨架剪影 + 中央锁卡片（图标/标题/密码框/解锁按钮），解锁瞬间"散焦 → 清晰"过渡动画（尊重 `prefers-reduced-motion`）。
- **统一密码**：`GATE_PASSWORD` 构建环境变量（本地 `.env` + GitHub Secrets `GATE_PASSWORD`，绝不进客户端）；AES-GCM auth tag 天然校验密码，客户端不存任何密码信息。**密码丢失无法恢复，务必保管好**。
- **输错保护**：抖动 + 红字提示，连续 5 次错误冷却 30 秒。
- **免输记忆**：勾选"7 天内免输入"后派生密钥存 localStorage（可配置 `securityConfig.rememberDays`，0 = 每次都要输）；统一密码模式下所有加密页共享密钥——任意一页输过密码，其余加密页与 7 天内重开浏览器均免输。
- **Swup 全兼容**：门组件在 Swup 容器内随导航重新挂载，SPA 进入加密页时立即判定解锁状态；解密注入后同步派发 `swup:content:replaced`，账单翻页、笔记本展开收起、评论按钮委托等交互自动恢复。
- **Svelte 组件页加密**：日程页的 SchedulesView（client:Svelte）连 island 占位与 props 一起加密，解密注入后 astro-island 自动 upgrade 水合；EncryptGate 会把 Astro 注入在 slot 内的 astro-island runtime 内联脚本提取回明文（runtime 被 innerHTML 注入不会执行，留在密文里会导致全页 island 无法水合）。
- **泄露面同步封堵**：归档时间线不再聚合笔记本（`content-utils.ts`）、sitemap 排除三个路由（`astro.config.mjs`）、Pagefind 搜索排除（`pagefind.yml`）、侧栏"最近更新/生活统计"在加密开启时不再展示笔记本条目与数量。
- 关键文件：`src/components/security/EncryptGate.astro`（构建时加密壳）、`src/components/security/PasswordGate.svelte`（毛玻璃门）、`src/utils/encrypt-gate.ts`（WebCrypto 解密/记忆/冷却）、`src/config/securityConfig.ts`（开关与文案）、`src/styles/pages/encrypt-gate.css`（门样式）。

> 注意：浏览器地址栏 URL 中的笔记本文件夹名（如 `/life/notebooks/日记本/`）仍可见，属加密范围之外的轻微信息暴露；介意可改文件夹名。
