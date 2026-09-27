# 文章朗读（TTS）设计

- 日期：2026-09-15
- 状态：已获用户批准（架构 / 播放器 / 落点与风险三节均已确认）
- 涉及文件：`scripts/TTS服务/**`（新增）、`docs/deploy-edge-tts.md`（新增）、`src/config/ttsConfig.ts`（新增）、`src/components/features/ArticleTtsPlayer.svelte`（新增）、`src/utils/tts-text.ts`（新增）、`src/styles/features/tts-player.css`（新增）、`src/pages/posts/[...slug].astro`、`src/styles/main.css`、`src/config/index.ts`、`src/i18n/i18nKey.ts` + 5 个语言文件、`.env.example`、`CLAUDE.md`、`src/content/changelog/`

## 背景与目标

用户想"平常听听自己做的笔记复习"，需要给博客文章加朗读功能，核心诉求：

1. **免费**（不接受付费 TTS / 不想升级服务器）
2. **实时播放**（点开很快就出声）
3. **自定义倍速**（复习场景常用 1.5x~2x）
4. 音色能选最好（后续澄清：**放弃声音复刻**，用现成音色即可）

现状：博客是纯静态站（EdgeOne Pages 托管），2 核 4G 腾讯云服务器（已自建 Waline 等服务），仓库无任何 TTS 代码。浏览器直连微软接口会被 CORS 与风控拦截，故需自建代理服务。

**范围**：仅 `/posts/` 文章页（含 Java/Python/English 等学习笔记）。加密笔记本 `/life/notebooks/`、说说、其他页面本次不接入。

## 已评估并否决的方案

| 方案 | 否决原因 |
|------|---------|
| 本地克隆模型（GPT-SoVITS / CosyVoice / MOSS-TTS-Nano） | 2 核 4G 低于模型最低推荐配置（最低 4 核），且用户已放弃声音复刻需求 |
| 纯浏览器 Web Speech API | 音质随设备参差、手机后台播放不可靠；仅保留为**兜底引擎** |
| 预生成 mp3 进仓库 | 144 篇文章体积大、文章修改需重生成；实时性最差 |
| 公共免费 TTS 接口 | 不可靠、限流、把文章内容发给第三方 |

## 方案（已选定：edge-tts 自建服务 + 浏览器朗读双引擎）

微软 Edge 在线语音合成（`speech.platform.bing.com`）免费、无需 key、神经音色质量高，`edge-tts`（Python，≥7.2.7）可程序化调用。已知风险：**微软对国内 IP / 机房 IP 有区域风控（403）**，故设计双引擎兜底——服务可用时用微软音色，服务不可用时自动切浏览器系统语音，博客功能永不裸奔。

### 服务端（部署在腾讯云 2C4G）

技术栈：Python 3.12 + FastAPI + edge-tts + uvicorn，Docker 常驻，Nginx 反代 `tts.example.com`（HTTPS），端口不直接暴露公网。合成算力在微软云端，服务器只做网络转发，2 核足够。

**接口契约**：

| 接口 | 说明 |
|------|------|
| `GET /health` | 健康检查，返回服务与 edge-tts 版本 |
| `GET /voices` | 可用中文/英文音色列表，内存缓存 1 天 |
| `POST /tts` `{text, voice}` | 校验长度（≤20000 字）与音色；`id = sha256(text + "\|" + voice)`；文本暂存内存（TTL 10 分钟，不落盘）；返回 `{id}` |
| `GET /audio/{id}` | 流式返回 `audio/mpeg`。命中磁盘缓存 → 支持 HTTP Range（可拖动进度条）；未命中且内存有文本 → 边合成边下发，同时落盘写缓存，完成后从内存删除文本 |
| （404 / 5xx） | 客户端收到错误 → 自动切 Web Speech API 续读 |

**关键机制**：

1. **长文分片**：按段落切 ≤3000 字分片，依次调 edge-tts，mp3 字节按序拼接为一条连续流（规避微软 2025-12 新增的 10 分钟音频 / 4096 字节分块限制）
2. **磁盘缓存**：`{CACHE_DIR}/{id}.mp3`，默认上限 2GB，超出按 mtime LRU 淘汰；重复听秒开且支持拖动
3. **并发控制**：合成任务信号量上限 3，其余排队，保护微软侧限流
4. **防护**：CORS 白名单（`https://blog.example.com` + 本地 dev）；Nginx 按 IP `limit_req`；服务端不持久化文章正文（仅内存 TTL + 音频文件）
5. **可配置环境变量**：`ALLOWED_ORIGINS`、`CACHE_DIR`、`CACHE_MAX_MB`、`PORT`、可选代理（应对 403）；仓库内 `scripts/TTS服务/cache/` 加入 `.gitignore`（本地自测不误提交）

**镜像注意**：使用完整版 `python:3.12` 镜像（slim 版缺 SSL 库会导致 WebSocket 握手失败 `No audio received`）。

### 博客端播放器

**触发**：`src/pages/posts/[...slug].astro` 的 `.post-hero__meta-row`（日期 · 分类 · 标签 · 字数）末尾加「🎧 朗读」按钮，风格对齐同行「分享」按钮；点击调起播放条。

**播放条**：`ArticleTtsPlayer.svelte`（`client:load`，与 SharePoster 用法一致），悬浮迷你条固定在底部，避开 UnifiedDock（`bottom:1rem; z-index:60`），z-index 70 置于其上；移动端贴底全宽。控件：**播放/暂停 · 进度条 · 倍速 · 音色 · 关闭**。

- 倍速：`0.8 / 1 / 1.25 / 1.5 / 2`，直接设 `audio.playbackRate`（纯本地，不重新合成），localStorage 记忆（`firefly-tts-rate`）
- 音色：晓晓（默认）/ 云希 / 云扬 / 晓伊 / 云健 / 辽宁小北 / 陕西小妮，切换即以新 voice 重新 POST，localStorage 记忆（`firefly-tts-voice`）
- 锁屏/后台：单条 `<audio>` + Media Session API（标题、封面、作者），手机锁屏可控

**正文提取**（`src/utils/tts-text.ts`，根选择器 `#post-container .markdown-content`）：

- 读：h1-h4、段落、列表、引用、图注
- 跳过：代码块（`pre`、expressive-code 容器）、表格、KaTeX 公式、图片、脚注角标、目录、按钮
- 保留但清理：行内代码保留文字（去反引号）、去 emoji、去 Markdown/HTML 残留、段落间加换行制造停顿
- 保护：超过 20000 字截断并在播放条提示

**兜底与异常**：

- 未配置 `PUBLIC_TTS_SERVER` 或 `ttsConfig.enable=false` → 直接用 Web Speech API（本地开发免依赖）
- POST 超时（8s）或 audio 播放错误 → 提示「朗读服务不可用，已切换系统语音」→ Web Speech API 分句队列续读，倍速照常可调
- 兜底引擎同样受倍速与暂停/继续控制

**Swup 行为**：一期播放器随文章页销毁，切页/刷新即停止（行为可预期）；跨页续播、自动连播列为二期。

**配置与 i18n**：新增 `src/config/ttsConfig.ts`（`enable`（默认 `true`）、`serverUrl`（读 `PUBLIC_TTS_SERVER`，为空则按钮直接走系统语音）、默认音色、音色列表、倍速档位、maxChars、timeoutMs、fallback 策略）并从 `src/config/index.ts` 导出；`PUBLIC_TTS_SERVER` 加入 `.env.example`；新增 i18n 键（朗读、暂停、播放、系统语音、切换提示、失败提示等）必须同时补 5 个语言文件。

### 数据流

```text
用户点「朗读」
  → 前端提取正文（tts-text.ts）
  → POST https://tts.example.com/tts {text, voice} → {id}
  → <audio src=".../audio/{id}"> 流式播放（1~2s 出声）
  → 倍速 = playbackRate（本地）；换音色 = 重新 POST
服务端：
  POST 暂存文本（内存 TTL）→ GET 流式合成（分片拼接）→ 落盘缓存
异常：
  任何一步失败 → toast 提示 → Web Speech API 系统语音续读
```

## 部署与验收

**部署教程**：`docs/deploy-edge-tts.md`，风格对齐 `docs/deploy-edgeone-pages.md`，内容：SSH → 装 Docker → 上传/拉取 `scripts/TTS服务/` → `docker compose up -d` → Nginx 反代 + HTTPS → 逐项验收 → 403 排查手册。

**服务端自测**（`scripts/TTS服务/自测.sh`）：连通性（`edge-tts --list-voices`）、`/health`、音色列表、中英文+代码混排样例合成试听、两路并发流式、重启后缓存命中。

**博客端验收**：

1. 提交前：`pnpm build` + `pnpm check` + `pnpm exec biome ci ./src` 全绿
2. 浏览器实测：点击秒出声、暂停/继续、倍速即时生效、换音色、进度条拖动（缓存命中后）、手机锁屏后台播放、Swup 切页停止、停掉服务后自动兜底系统语音、深色模式样式正常
3. 按仓库规范补 `src/content/changelog/` 条目并同步 `CLAUDE.md`（第 0/2/20 节等）

## 风险与应对

| 风险 | 应对 |
|------|------|
| **微软对国内机房 IP 403（头号风险）** | 教程第一步先做连通性自测；403 时依次尝试：升级 edge-tts 最新版 / 校准服务器时间（令牌对时钟敏感）/ 配代理；仍失败则博客自动兜底系统语音，服务保留待用 |
| 微软再次改接口（2025-12 刚改过） | edge-tts 库更新活跃；双引擎兜底保证博客不崩 |
| 公网服务被白嫖 | CORS 白名单 + Nginx 限流 + 2GB 缓存上限；服务端只存音频与短 TTL 内存文本 |
| 隐私 | 仅公开文章页接入；加密笔记本不接入；正文只到用户自己的服务器和微软 |
| 费用 | 0 元，仅用已有服务器与域名 |

## 边界情况

- 服务重启导致未合成完的 id 丢失 → `GET /audio/{id}` 404 → 兜底系统语音；重新点朗读会重新 POST
- 文章极长（>2 万字）→ 截断并提示，不阻断
- 首次合成中途用户切页 → 客户端断开连接；服务端保留已落盘部分？**不保留半成品**（磁盘缓存只写完整文件），下次重新合成

## 明确不做（YAGNI）

- 声音复刻 / 本地离线模型（MOSS-TTS-Nano 等）
- 跨页持续播放、自动连播、播放列表（列为二期）
- 加密笔记本、说说、其他页面
- 逐句高亮、自动滚动定位
- 用户账号体系与鉴权 key（前端藏不住，用 CORS + 限流替代）
- 服务端持久化文章正文（隐私与存储风险）

## 二期候选（不在本次范围）

1. 跨页持续播放（参考 MusicManager 单例模式）+ 自动连播同分类下一篇
2. 加密笔记本解锁后接入朗读
3. 逐句高亮跟随
4. 若微软长期不可用：换 MOSS-TTS-Nano 自建离线模型（需升服务器或加缓存预生成）
