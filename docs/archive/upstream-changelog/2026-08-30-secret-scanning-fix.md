---
version: "v1.30.1"
date: 2026-08-30
time: "14:40"
type: fix
description: 修复摘要脚本中 DashScope 密钥的公开暴露，密钥管理规范升级
---

## 密钥泄露修复（GitGuardian 告警）

- `scripts/生成摘要/index.ts` 曾硬编码 DashScope（千问）API Key 并存在于公开仓库历史，GitGuardian 检测到后已处置：密钥从代码移除，改为从 `.env` 的 `DASHSCOPE_API_KEY` 读取，缺失时脚本明确报错；`pnpm cli desc` 调用补 `--env-file=.env`。
- **站长需在阿里云百炼控制台吊销旧 Key 并重建**（已提醒）；新 Key 填入本地 `.env` 即可，仓库侧已无任何密钥。
- 工程规范同步：CLAUDE.md §15 新增反模式（禁止密钥硬编码进被跟踪文件、.gitignore 保护必须实测）、§22 收尾清单新增提交前涉密检查步骤，防止同类问题再次发生。
