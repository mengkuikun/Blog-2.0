# PagesCMS 自托管部署指南（Vercel）

> 定制版 PagesCMS：分组后台 + 图床上传字段（imgbed）+ 高德坐标字段（amap-geocode）+ 大目录 500 修复。
> 部署后访问 `https://cms.example.com`，连接博客仓库 `dumplingandcakeblog` 编辑内容。

## 一、准备 GitHub 仓库（代码源）

1. 在 GitHub 创建**空仓库**：`pagescms-deploy`（Public 或 Private 均可）
2. 告诉 Claude 仓库地址，Claude 会把定制好的 pagescms 代码推过去

## 二、创建 GitHub App（PagesCMS 用它读写博客仓库）

1. 打开 https://github.com/settings/developers → **GitHub Apps** → **New GitHub App**
2. 填写：
   - **GitHub App name**：`pagescms-blog`
   - **Homepage URL**：`https://cms.example.com`
   - **Callback URL**：`https://cms.example.com/api/auth/callback`（Vercel 部署后）
   - **Webhook**：Active 取消勾选（不配置 webhook 也能用，只是缓存更新稍慢）
   - **Permissions**（Repository permissions）：
     - **Contents**：Read and write
     - **Metadata**：Read-only
     - **Pull requests**：Read and write（可选）
   - **Where can this GitHub App be installed?**：Any account
3. 创建后：
   - 记下 **App ID**、**Client ID**
   - 点 **Generate a private key** 下载 `.pem` 文件（内容很长，部署时粘贴）
   - 点 **Generate a client secret** 记下 Client Secret
   - 创建一个 **webhook secret**（任意长随机字符串，如 `openssl rand -hex 32` 生成的）——即使不配 webhook 也要一个占位值

## 三、创建数据库（Neon 免费版）

1. 打开 https://neon.tech → 注册 → **Create project**（区域选新加坡或美西）
2. 创建后复制 **连接字符串**（DATABASE_URL），格式：
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/pagescms?sslmode=require
   ```
3. 保存备用

## 四、Vercel 部署

1. 打开 https://vercel.com → **Add New Project** → 导入 `pagescms-deploy` 仓库
2. **Framework Preset**：Next.js（自动识别）
3. **Environment Variables**（Project Settings → Environment Variables）逐一添加：

   | 变量名 | 值 |
   |---|---|
   | `BASE_URL` | `https://cms.example.com` |
   | `ADMIN_EMAILS` | `你的邮箱`（登录管理员） |
   | `BETTER_AUTH_SECRET` | 长随机字符串 |
   | `CRYPTO_KEY` | 长随机字符串 |
   | `DATABASE_URL` | Neon 连接字符串 |
   | `GITHUB_APP_ID` | GitHub App 的 App ID |
   | `GITHUB_APP_NAME` | `pagescms-blog` |
   | `GITHUB_APP_PRIVATE_KEY` | .pem 文件内容（多行，用引号包住） |
   | `GITHUB_APP_WEBHOOK_SECRET` | 随机字符串 |
   | `GITHUB_APP_CLIENT_ID` | GitHub App 的 Client ID |
   | `GITHUB_APP_CLIENT_SECRET` | GitHub App 的 Client Secret |
   | `IMAGEBED_URL` | `https://img.example.com` |
   | `IMAGEBED_AUTH_CODE` | 图床 authCode |
   | `IMAGEBED_FOLDER` | `手机uu`（或你想上传到的目录）|
   | `AMAP_KEY` | 高德 Web 服务 key |

4. **Deploy**——首次构建会自动建数据库表（postbuild 跑迁移）
5. 部署成功后：

## 五、域名绑定

1. Vercel 项目 → **Settings → Domains** → 添加 `cms.example.com`
2. 在 DNS（EdgeOne/腾讯云）添加 CNAME 记录：`cms` → `cms.vercel.app`（按 Vercel 提示）
3. 等待生效

## 六、安装 GitHub App 到博客仓库

1. 打开 `https://cms.example.com` → 用 GitHub 登录（管理员邮箱）
2. 按提示安装 GitHub App 到 `dumplingandcakeblog` 仓库（Only select repositories）
3. 打开仓库 → 应该看到 `.pages.yml` 配置的 5 个分组（📝博客文章 / 💬动态 / 🔗友链与应用 / 🌱生活记录 / 📦其他内容）

## 七、验证功能

- [ ] 登录成功，5 个分组显示
- [ ] 📝博客文章 → 98 篇全部可见（含子目录，无 500）
- [ ] 💬动态 → 编辑 → 图片字段 **📤 上传到图床** → 上传后 URL 自动填入
- [ ] 📍足迹 → 编辑 → **坐标搜索** → 输入地址 → 保存 → 检查 lat/lng 写入文件
- [ ] 编辑内容保存 → 博客 EdgeOne 自动重建

## 备注

- **图床/高德凭证都在服务端环境变量**，前端不暴露
- **大目录 500** 已修复（GraphQL 查询自动重试 3 次）
- 以后升级：git pull 官方更新 + 重新部署
- 数据库自动建表；如需清缓存：Vercel 上跑 `pnpm db:clear-cache`（需 DB 连接）
