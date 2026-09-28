---
version: "v1.25.0"
date: 2026-08-23
time: "02:00"
type: improvement
description: 迁移到 GitHub Pages + EdgeOne 站点加速，解决 EdgeOne Pages 500 次构建额度耗尽
---

## 迁移到 GitHub Pages

- **原因**：`EdgeOne Pages` 每月 500 次构建耗尽，切到 `GitHub Actions` 构建无限次数，`EdgeOne` 仅做站点加速 `src/config/siteConfig.ts:16` 域名保持 `https://your-domain.example.com`
- **托管**：新增 `.github/workflows/pages.yml:1`（`pnpm/action-setup@v5 9.14.4 + setup-node@v4 Node22 + pnpm build`，注入 11 个 `PUBLIC_*` Secrets，`upload-pages-artifact@v3` 上传 `dist`，`deploy-pages@v4` 发布）+ `public/CNAME:1` `your-domain.example.com`，`GitHub Settings -> Pages -> Source: GitHub Actions`，`Custom domain: your-domain.example.com`
- **加速**：`EdgeOne` 新建站点 `your-domain.example.com`，`CNAME your-domain.example.com.eo.dnse2.com`，`源站 mengkuikun.github.io` / `回源HOST your-domain.example.com` / `协议跟随`，`DNS` 从 `mengkuikun.github.io` 切到 `eo.dnse2.com`，`HTTPS` 自动签发
- **环境变量**：`gh secret set` 批量导入 11 个 `PUBLIC_*`（`PUBLIC_AMAP_KEY / PUBLIC_AMAP_KEY_PLACES / PUBLIC_UMAMI_* / PUBLIC_WALINE_SERVER / PUBLIC_IMAGEBED_*`）`CLAUDE.md:19` 架构图已更新，`GITHUB_CLIENT_*` 等 8 个非 `PUBLIC` 废弃（`src` 零引用）
- **验证**：`pnpm build` 215 页 + `pagefind 10199 words`，`pnpm check` 0 errors，`pnpm exec biome ci ./src --reporter=github` 0 errors，`https://your-domain.example.com` 经 `EdgeOne` 回源正常，`Actions` 绿
