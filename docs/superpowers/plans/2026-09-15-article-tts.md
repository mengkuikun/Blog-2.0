# 文章朗读（TTS）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给博客文章页加「朗读」功能：自建 edge-tts 服务流式合成，播放条支持倍速/音色/进度，服务不可用时自动降级浏览器系统语音。

**Architecture:** 服务端是一个部署在腾讯云 2C4G 的 FastAPI + edge-tts 小服务（Nginx 反代 `tts.example.com`），提供 `POST /tts`（文本换 id）与 `GET /audio/{id}`（流式 mp3 + 磁盘缓存）。博客端新增 Svelte 播放器组件（文章页 `client:load`），客户端提取正文、请求音频、`audio.playbackRate` 控速；失败时用 Web Speech API 兜底。

**Tech Stack:** Python 3.12 / FastAPI / edge-tts ≥7.2.7 / Docker；Astro 7 + Svelte 5 runes + Tailwind v4。

**Spec:** `docs/superpowers/specs/2026-09-15-article-tts-design.md`

## Global Constraints

- 全程中文回复；提交信息 `<type>(<scope>): <描述>`
- 包管理器仅限 pnpm 9.14（`preinstall` 强制）；Node ≥ 22
- 提交前必须：`pnpm build` + `pnpm check` + `pnpm exec biome ci ./src --reporter=github` 全绿
- Svelte 5 runes（`$props/$state/$derived`），非 void 标签禁止自闭合；新增样式只放 `src/styles/` 并经 `main.css` 导入
- 禁止新建 `!important`、硬编码 `#000/#fff`；颜色用 `var(--*)` 令牌
- 新 i18n 键必须同时补全 5 个语言文件（en/zh_CN/zh_TW/ja/ru）
- 服务端 Python 代码是部署产物（edge-tts 仅 Python 有），不属于"用 Python 改文件"的反模式；仓库内其他工具仍只用 Node
- CORS 默认白名单：`https://blog.example.com` + `http://localhost:4321`
- 当前 changelog 最大版本 `v1.36.0`，本次 feature 用 `v1.37.0`

---

## 文件结构总览

| 文件 | 职责 |
|------|------|
| `scripts/TTS服务/server.py` | FastAPI 服务：4 个接口 + 分片 + 缓存 + 限流信号量 |
| `scripts/TTS服务/requirements.txt` | Python 依赖（edge-tts ≥7.2.7） |
| `scripts/TTS服务/Dockerfile` | 完整版 python:3.12 镜像（slim 缺 SSL 会握手失败） |
| `scripts/TTS服务/docker-compose.yml` | 容器编排（卷缓存、绑 127.0.0.1） |
| `scripts/TTS服务/nginx.conf.example` | 反代 + 限流 + Range/流式配置样例 |
| `scripts/TTS服务/自测.sh` | 服务端一键自测（健康/连通/合成/缓存） |
| `scripts/TTS服务/README.md` | 指向部署教程 |
| `docs/deploy-edge-tts.md` | 全套部署教程 |
| `src/config/ttsConfig.ts` | 开关、服务地址、音色列表、倍速档位等 |
| `src/utils/tts-text.ts` | 正文提取 + 系统语音分句 |
| `src/components/features/ArticleTtsPlayer.svelte` | 触发按钮 + 悬浮播放条 + 双引擎逻辑 |
| `src/styles/features/tts-player.css` | 播放条样式 |
| `src/pages/posts/[...slug].astro` | 挂载播放器 |
| `src/i18n/i18nKey.ts` + `languages/*.ts` | 10 个新键 × 5 语言 |
| `.env.example` | `PUBLIC_TTS_SERVER=` |
| `src/content/changelog/2026-09-15-article-tts.md` | 更新日志 |
| `CLAUDE.md` / `AGENTS.md` | 文档同步 |

---

### Task 1: 服务端代码与容器化

**Files:**
- Create: `scripts/TTS服务/server.py`
- Create: `scripts/TTS服务/requirements.txt`
- Create: `scripts/TTS服务/Dockerfile`
- Create: `scripts/TTS服务/docker-compose.yml`
- Modify: `.gitignore`（追加缓存目录忽略）

**Interfaces:**
- Produces: HTTP 接口 `/health`、`/voices`、`POST /tts`（返回 `{id}`）、`GET /audio/{id}`（`audio/mpeg`）；环境变量 `PORT/CACHE_DIR/CACHE_MAX_MB/ALLOWED_ORIGINS/EDGE_TTS_PROXY`
- Task 2/3/8 依赖这些接口与环境变量名

- [ ] **Step 1: 写 `server.py`（完整代码）**

```python
"""博客文章朗读服务（edge-tts 代理）。

接口：
- GET  /health        健康检查
- GET  /voices        可用音色列表（缓存 1 天）
- POST /tts           {text, voice} -> {id}，文本仅内存暂存 10 分钟
- GET  /audio/{id}    流式返回 mp3；完整合成后落盘缓存，命中时支持 Range

环境变量：
- PORT             监听端口（默认 8000）
- CACHE_DIR        音频缓存目录（默认 ./cache）
- CACHE_MAX_MB     缓存上限 MB（默认 2048，超出按 mtime 淘汰）
- ALLOWED_ORIGINS  允许的跨域来源，逗号分隔
- EDGE_TTS_PROXY   调用微软语音服务的代理（可选，如 http://127.0.0.1:7890）
"""

import asyncio
import hashlib
import os
import re
import time
from importlib.metadata import version as pkg_version
from pathlib import Path

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

MAX_TEXT_CHARS = 20000
CHUNK_CHARS = 3000
TEXT_TTL_SECONDS = 600
MAX_CONCURRENT_SYNTH = 3
VOICE_CACHE_SECONDS = 86400

CACHE_DIR = Path(os.getenv("CACHE_DIR", "./cache"))
CACHE_MAX_MB = int(os.getenv("CACHE_MAX_MB", "2048"))
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://blog.example.com,http://localhost:4321",
    ).split(",")
    if origin.strip()
]
PROXY = os.getenv("EDGE_TTS_PROXY") or None

app = FastAPI(title="blog-tts")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

_texts: dict[str, tuple[str, str, float]] = {}
_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SYNTH)
_voices_cache: tuple[float, list[dict[str, str]]] | None = None


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    voice: str = Field(default="zh-CN-XiaoxiaoNeural")


def make_id(text: str, voice: str) -> str:
    return hashlib.sha256(f"{voice}|{text}".encode("utf-8")).hexdigest()[:32]


def cache_file(cid: str) -> Path:
    return CACHE_DIR / f"{cid}.mp3"


def split_text(text: str, limit: int = CHUNK_CHARS) -> list[str]:
    """按行聚合到 <= limit 字；超长段落再按句末标点切。"""
    units = [line.strip() for line in text.splitlines() if line.strip()]
    chunks: list[str] = []
    current = ""
    for unit in units:
        if len(current) + len(unit) + 1 <= limit:
            current = f"{current}\n{unit}".strip()
            continue
        if current:
            chunks.append(current)
        if len(unit) <= limit:
            current = unit
            continue
        buff = ""
        for sentence in re.split(r"(?<=[。！？!?；;])\s*", unit):
            if len(buff) + len(sentence) <= limit:
                buff += sentence
                continue
            if buff:
                chunks.append(buff)
            while len(sentence) > limit:
                chunks.append(sentence[:limit])
                sentence = sentence[limit:]
            buff = sentence
        current = buff
    if current:
        chunks.append(current)
    return chunks or [text[:limit]]


def cleanup_cache() -> None:
    files = sorted(CACHE_DIR.glob("*.mp3"), key=lambda p: p.stat().st_mtime)
    total = sum(p.stat().st_size for p in files)
    limit = CACHE_MAX_MB * 1024 * 1024
    for path in files:
        if total <= limit:
            break
        total -= path.stat().st_size
        path.unlink(missing_ok=True)


async def synth(text: str, voice: str):
    for chunk in split_text(text):
        async with _semaphore:
            communicate = edge_tts.Communicate(chunk, voice, proxy=PROXY)
            async for message in communicate.stream():
                if message["type"] == "audio":
                    yield message["data"]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "edge_tts": pkg_version("edge-tts")}


@app.get("/voices")
async def voices() -> dict[str, list[dict[str, str]]]:
    global _voices_cache
    now = time.time()
    if _voices_cache and now - _voices_cache[0] < VOICE_CACHE_SECONDS:
        return {"voices": _voices_cache[1]}
    raw = await edge_tts.list_voices()
    picked = [
        {
            "name": voice["ShortName"],
            "gender": voice["Gender"],
            "locale": voice["Locale"],
        }
        for voice in raw
        if voice["Locale"].startswith(("zh-CN", "en-US"))
    ]
    _voices_cache = (now, picked)
    return {"voices": picked}


@app.post("/tts")
async def create_tts(req: TTSRequest) -> dict[str, str]:
    cid = make_id(req.text, req.voice)
    _texts[cid] = (req.text, req.voice, time.time())
    return {"id": cid}


@app.get("/audio/{cid}")
async def get_audio(cid: str):
    if not cid.isalnum():
        raise HTTPException(status_code=400, detail="非法 id")
    path = cache_file(cid)
    if path.exists():
        return FileResponse(path, media_type="audio/mpeg")

    entry = _texts.get(cid)
    if not entry or time.time() - entry[2] > TEXT_TTL_SECONDS:
        raise HTTPException(status_code=404, detail="id 不存在或已过期，请重新发起朗读")
    text, voice, _ = entry

    async def stream():
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".part")
        try:
            with open(tmp, "wb") as handle:
                async for data in synth(text, voice):
                    handle.write(data)
                    yield data
            os.replace(tmp, path)
            _texts.pop(cid, None)
            cleanup_cache()
        except (Exception, asyncio.CancelledError):
            tmp.unlink(missing_ok=True)
            raise

    return StreamingResponse(stream(), media_type="audio/mpeg")
```

- [ ] **Step 2: 写 `requirements.txt`**

```text
fastapi>=0.115
uvicorn[standard]>=0.30
edge-tts>=7.2.7
```

- [ ] **Step 3: 写 `Dockerfile`**

```dockerfile
FROM python:3.12
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
ENV CACHE_DIR=/data/cache
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: 写 `docker-compose.yml`**

```yaml
services:
  tts:
    build: .
    container_name: blog-tts
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      - ALLOWED_ORIGINS=https://blog.example.com
      - CACHE_MAX_MB=2048
      - EDGE_TTS_PROXY=
    volumes:
      - ./cache:/data/cache
```

- [ ] **Step 5: `.gitignore` 追加缓存忽略**

在 `.gitignore` 末尾追加：

```text
# TTS 服务本地缓存（部署产物，不入库）
scripts/TTS服务/cache/
```

- [ ] **Step 6: 语法验证**

Run: `py -3 -m py_compile "scripts/TTS服务/server.py"`
Expected: 无输出、退出码 0（本机 Python 3.13）

- [ ] **Step 7: Commit**

```bash
git add "scripts/TTS服务" .gitignore
git commit -m "feat(tts): 新增 edge-tts 朗读服务（FastAPI 流式合成 + 缓存）"
```

---

### Task 2: 自测脚本、Nginx 样例与部署教程

**Files:**
- Create: `scripts/TTS服务/nginx.conf.example`
- Create: `scripts/TTS服务/自测.sh`
- Create: `scripts/TTS服务/README.md`
- Create: `docs/deploy-edge-tts.md`

**Interfaces:**
- Consumes: Task 1 的接口与环境变量
- Produces: 部署教程（Task 8 用户照着做）

- [ ] **Step 1: 写 `nginx.conf.example`**

```nginx
# ===== Edge-TTS 朗读服务 Nginx 反代样例 =====
# 1. 把 limit_req_zone 加到 http {} 全局块（若已有同名 zone 可复用）
#    limit_req_zone $binary_remote_addr zone=tts_limit:10m rate=30r/m;
# 2. 把 server 块并入 Nginx 配置，证书路径按实际填写
# 3. nginx -t && nginx -s reload

server {
    listen 443 ssl http2;
    server_name tts.example.com;

    # ssl_certificate     /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    client_max_body_size 1m;

    location / {
        limit_req zone=tts_limit burst=10 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

- [ ] **Step 2: 写 `自测.sh`**

```bash
#!/usr/bin/env bash
# Edge-TTS 朗读服务自测（在部署服务器上执行）
# 用法：bash 自测.sh [http://127.0.0.1:8000]
set -euo pipefail
BASE="${1:-http://127.0.0.1:8000}"

echo "== 1. 健康检查 =="
curl -sf "$BASE/health"
echo

echo "== 2. 容器内连微软（列音色前 5 个） =="
docker compose exec -T tts edge-tts --list-voices | head -n 5

echo "== 3. 合成一段音频 =="
TEXT="你好，这是博客朗读服务的自测音频。Hello world, this is a test."
ID=$(curl -sf -X POST "$BASE/tts" -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\",\"voice\":\"zh-CN-XiaoxiaoNeural\"}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
echo "id=$ID"

curl -sf "$BASE/audio/$ID" -o /tmp/tts-test.mp3
ls -lh /tmp/tts-test.mp3

echo "== 4. 缓存命中（Range 应返回 206） =="
curl -sf -D - -o /dev/null -H "Range: bytes=0-1023" "$BASE/audio/$ID" | head -n 6

echo "== 全部通过，试听 /tmp/tts-test.mp3 =="
```

- [ ] **Step 3: 写 `README.md`**

```markdown
# TTS服务（edge-tts 朗读代理）

博客文章页「朗读」功能的服务端，部署在腾讯云服务器（2 核 4G 即可）。

- 一键自测：`bash 自测.sh`（在部署目录执行）
- 完整部署教程：见仓库 `docs/deploy-edge-tts.md`
- 接口：`GET /health`、`GET /voices`、`POST /tts`、`GET /audio/{id}`

变更服务端代码后：改 `server.py` → `docker compose up -d --build` → `bash 自测.sh`。
```

- [ ] **Step 4: 写 `docs/deploy-edge-tts.md`（完整教程）**

````markdown
# Edge-TTS 朗读服务部署指南

> 博客文章朗读功能的服务端：部署在腾讯云服务器上的 edge-tts 代理（`scripts/TTS服务/`），提供流式 mp3 合成。博客端由 `PUBLIC_TTS_SERVER` 指向本服务；服务不可用时自动降级浏览器系统语音。

## 一、部署架构

```text
博客文章页「朗读」按钮
    ↓ POST /tts（文章文本 + 音色）
tts.example.com（Nginx HTTPS）
    ↓ 反代 127.0.0.1:8000
blog-tts 容器（FastAPI + edge-tts）
    ↓ WebSocket
微软 Edge 在线语音服务（免费）
    ↓ mp3 流式返回；完整音频缓存到 ./cache
```

- 2 核 4G 足够：合成算力在微软云端，服务器只做转发
- 缓存命中时支持 HTTP Range（进度条可拖动）；未命中时流式下发（1~2 秒出声）
- 文章正文不落盘（仅内存暂存 10 分钟），只有音频缓存（默认上限 2GB）

## 二、上传代码

```bash
mkdir -p /opt/blog-tts && cd /opt/blog-tts
# 方式一：克隆博客仓库后拷出（推荐，代码随仓库更新）
git clone --depth 1 https://github.com/mengkuikun/dumplingandcakeblog.git /tmp/blog
cp -r "/tmp/blog/scripts/TTS服务/." /opt/blog-tts/
# 方式二：本地 scp 上传 scripts/TTS服务/ 整个目录
```

## 三、连通性预检（关键步骤）

```bash
cd /opt/blog-tts
docker run --rm python:3.12 bash -c \
  "pip install --quiet edge-tts && edge-tts --list-voices | head -n 5"
```

- 能列出音色（如 `zh-CN-XiaoxiaoNeural`）→ 继续下一步
- 报 403 / 连接失败 → 先看第八节排查，连通后再继续

## 四、启动服务

```bash
cd /opt/blog-tts
docker compose up -d --build
docker compose logs --tail=30 tts   # 出现 "Application startup complete." 即成功
bash 自测.sh                         # 健康检查 + 合成 /tmp/tts-test.mp3
```

试听 `/tmp/tts-test.mp3`（下载到本地或用 `scp` 拉回）。

## 五、Nginx 反代 + HTTPS

前提：`tts.example.com` 已解析到本服务器。将 `nginx.conf.example` 并入现有 Nginx：

1. 在 `http {}` 全局块加限流区（若已有可复用）：
   ```nginx
   limit_req_zone $binary_remote_addr zone=tts_limit:10m rate=30r/m;
   ```
2. 新增 `tts.example.com` 的 server 块（照抄 `nginx.conf.example`，补证书路径）
3. 证书二选一：已有泛域名证书直接填路径；没有就跑 `certbot --nginx -d tts.example.com`（或面板申请）
4. `nginx -t && nginx -s reload`

验证：

```bash
curl https://tts.example.com/health
# {"status":"ok","edge_tts":"7.x.x"}
```

## 六、博客端配置

1. 本地 `.env` 加：`PUBLIC_TTS_SERVER=https://tts.example.com`
2. **EdgeOne Pages 控制台** → 项目 → 环境变量：新增 `PUBLIC_TTS_SERVER=https://tts.example.com`（线上构建的关键；与其余 13 个变量放一起）
3. push main 触发 EdgeOne 构建 → 文章页出现「朗读」按钮
4. （可选）GitHub 仓库 Variable 加 `PUBLIC_TTS_SERVER`：仅当希望 CI 的 `build.yml` 构建产物也带上；不加不影响 CI 通过

## 七、验收清单

服务端：

- [ ] `curl https://tts.example.com/health` 返回 ok
- [ ] `bash 自测.sh` 全绿，试听正常
- [ ] 第二次请求同一篇文章明显更快（缓存命中）
- [ ] 缓存命中后拖动进度条可跳转（Range 生效）

博客端：

- [ ] 文章页出现「朗读」按钮，点击 1~2 秒出声
- [ ] 倍速切换立即生效；刷新后倍速/音色被记住
- [ ] 手机锁屏/后台能继续播放，锁屏显示文章标题
- [ ] `docker compose stop` 后点朗读：提示后自动切系统语音
- [ ] 深色模式播放条样式正常；Swup 切页后播放停止

## 八、403 / 连接失败排查

| 检查 | 处理 |
|------|------|
| 库版本旧 | `docker compose build --no-cache`（requirements 要求 ≥7.2.7） |
| 服务器时间不准（令牌对时钟敏感） | `timedatectl set-ntp true && systemctl restart systemd-timesyncd` |
| 机房 IP 被区域风控 | compose 设 `EDGE_TTS_PROXY=http://代理:端口` 后 `docker compose up -d` |
| 仍不行 | 不影响博客：前端自动降级系统语音；服务保留，等微软策略变化再试 |

## 九、常用运维

```bash
cd /opt/blog-tts
docker compose ps
docker compose logs --tail=100 tts
docker compose restart tts
du -sh cache
```

## 十、停用 / 回滚

- 博客端：删 EdgeOne 的 `PUBLIC_TTS_SERVER`，或把 `src/config/ttsConfig.ts` 的 `enable` 改为 `false`
- 服务端：`docker compose down` + 移除 Nginx server 块
````

- [ ] **Step 5: 语法验证**

Run: `bash -n "scripts/TTS服务/自测.sh"`
Expected: 无输出、退出码 0

- [ ] **Step 6: Commit**

```bash
git add "scripts/TTS服务" docs/deploy-edge-tts.md
git commit -m "docs(tts): 部署教程、Nginx 样例与自测脚本"
```

---

### Task 3: 博客配置与 i18n

**Files:**
- Create: `src/config/ttsConfig.ts`
- Modify: `src/config/index.ts`（追加导出）
- Modify: `.env.example`（追加变量）
- Modify: `src/i18n/i18nKey.ts` + `src/i18n/languages/{en,zh_CN,zh_TW,ja,ru}.ts`

**Interfaces:**
- Produces: `ttsConfig`（含 `enable/serverUrl/defaultVoice/voices/speeds/maxChars/requestTimeoutMs/speechChunkChars`）、i18n 键 `ttsRead/ttsPause/ttsResume/ttsClose/ttsSpeed/ttsVoice/ttsPreparing/ttsEmpty/ttsFallback/ttsNoServer`
- Task 4/5/6 依赖这些名字，不得改动

- [ ] **Step 1: 写 `src/config/ttsConfig.ts`**

```ts
export interface TtsVoiceOption {
	name: string;
	label: string;
}

export interface TtsConfig {
	enable: boolean;
	serverUrl: string;
	defaultVoice: string;
	voices: TtsVoiceOption[];
	speeds: number[];
	maxChars: number;
	requestTimeoutMs: number;
	speechChunkChars: number;
}

export const ttsConfig: TtsConfig = {
	enable: true,
	serverUrl: import.meta.env.PUBLIC_TTS_SERVER || "",
	defaultVoice: "zh-CN-XiaoxiaoNeural",
	voices: [
		{ name: "zh-CN-XiaoxiaoNeural", label: "晓晓（女声）" },
		{ name: "zh-CN-XiaoyiNeural", label: "晓伊（女声）" },
		{ name: "zh-CN-YunxiNeural", label: "云希（男声）" },
		{ name: "zh-CN-YunyangNeural", label: "云扬（男声·播报）" },
		{ name: "zh-CN-YunjianNeural", label: "云健（男声）" },
		{ name: "zh-CN-liaoning-XiaobeiNeural", label: "辽宁小北（女声·方言）" },
		{ name: "zh-CN-shaanxi-XiaoniNeural", label: "陕西小妮（女声·方言）" },
	],
	speeds: [0.8, 1, 1.25, 1.5, 2],
	maxChars: 20000,
	requestTimeoutMs: 8000,
	speechChunkChars: 160,
};
```

- [ ] **Step 2: `src/config/index.ts` 追加导出**

在 `export { siteConfig } from "./siteConfig"; // 站点基础配置` 一行后追加：

```ts
export { ttsConfig } from "./ttsConfig"; // 文章朗读（TTS）配置
```

- [ ] **Step 3: `.env.example` 追加变量**

在 `GATE_PASSWORD=` 段之后追加：

```bash
# 文章朗读 TTS 服务地址（EdgeOne Pages 环境变量 + 本地 .env；留空则用系统语音）
PUBLIC_TTS_SERVER=
```

- [ ] **Step 4: `src/i18n/i18nKey.ts` 枚举末尾追加 10 个键**

在枚举闭合 `}` 前追加（注意给原最后一项补逗号）：

```ts
	ttsRead = "ttsRead",
	ttsPause = "ttsPause",
	ttsResume = "ttsResume",
	ttsClose = "ttsClose",
	ttsSpeed = "ttsSpeed",
	ttsVoice = "ttsVoice",
	ttsPreparing = "ttsPreparing",
	ttsEmpty = "ttsEmpty",
	ttsFallback = "ttsFallback",
	ttsNoServer = "ttsNoServer",
```

- [ ] **Step 5: 5 个语言文件末尾追加翻译（对象闭合 `};` 前，注意补逗号）**

各文件分别追加：

```ts
// zh_CN.ts
	[Key.ttsRead]: "朗读",
	[Key.ttsPause]: "暂停",
	[Key.ttsResume]: "继续",
	[Key.ttsClose]: "关闭",
	[Key.ttsSpeed]: "倍速",
	[Key.ttsVoice]: "音色",
	[Key.ttsPreparing]: "正在生成语音…",
	[Key.ttsEmpty]: "没有可朗读的内容",
	[Key.ttsFallback]: "朗读服务不可用，已切换系统语音",
	[Key.ttsNoServer]: "未配置朗读服务，使用系统语音",
```

```ts
// zh_TW.ts
	[Key.ttsRead]: "朗讀",
	[Key.ttsPause]: "暫停",
	[Key.ttsResume]: "繼續",
	[Key.ttsClose]: "關閉",
	[Key.ttsSpeed]: "倍速",
	[Key.ttsVoice]: "音色",
	[Key.ttsPreparing]: "正在生成語音…",
	[Key.ttsEmpty]: "沒有可朗讀的內容",
	[Key.ttsFallback]: "朗讀服務無法使用，已切換系統語音",
	[Key.ttsNoServer]: "未設定朗讀服務，使用系統語音",
```

```ts
// en.ts
	[Key.ttsRead]: "Read aloud",
	[Key.ttsPause]: "Pause",
	[Key.ttsResume]: "Resume",
	[Key.ttsClose]: "Close",
	[Key.ttsSpeed]: "Speed",
	[Key.ttsVoice]: "Voice",
	[Key.ttsPreparing]: "Generating audio…",
	[Key.ttsEmpty]: "Nothing to read",
	[Key.ttsFallback]: "Reading service unavailable, switched to system voice",
	[Key.ttsNoServer]: "Reading service not configured, using system voice",
```

```ts
// ja.ts
	[Key.ttsRead]: "読み上げ",
	[Key.ttsPause]: "一時停止",
	[Key.ttsResume]: "再開",
	[Key.ttsClose]: "閉じる",
	[Key.ttsSpeed]: "速度",
	[Key.ttsVoice]: "音声",
	[Key.ttsPreparing]: "音声を生成中…",
	[Key.ttsEmpty]: "読み上げ可能な内容がありません",
	[Key.ttsFallback]: "読み上げサービスが利用できないため、システム音声に切り替えました",
	[Key.ttsNoServer]: "読み上げサービス未設定、システム音声を使用します",
```

```ts
// ru.ts
	[Key.ttsRead]: "Читать вслух",
	[Key.ttsPause]: "Пауза",
	[Key.ttsResume]: "Продолжить",
	[Key.ttsClose]: "Закрыть",
	[Key.ttsSpeed]: "Скорость",
	[Key.ttsVoice]: "Голос",
	[Key.ttsPreparing]: "Создание аудио…",
	[Key.ttsEmpty]: "Нет текста для чтения",
	[Key.ttsFallback]: "Сервис чтения недоступен, переключено на системный голос",
	[Key.ttsNoServer]: "Сервис чтения не настроен, используется системный голос",
```

- [ ] **Step 6: 类型验证**

Run: `pnpm type-check`
Expected: PASS（此刻组件还没用新键，但 Translation 类型要求 5 个文件键齐全，缺一个都会报错）

- [ ] **Step 7: Commit**

```bash
git add src/config/ttsConfig.ts src/config/index.ts .env.example src/i18n
git commit -m "feat(tts): 朗读配置与 10 个 i18n 键（5 语言）"
```

---

### Task 4: 正文提取工具

**Files:**
- Create: `src/utils/tts-text.ts`

**Interfaces:**
- Consumes: `ttsConfig.maxChars`、`ttsConfig.speechChunkChars`
- Produces: `extractReadableText(root: ParentNode | null): string`、`splitForSpeech(text: string): string[]`
- Task 5 依赖这两个函数签名

- [ ] **Step 1: 写 `src/utils/tts-text.ts`**

```ts
import { ttsConfig } from "@/config/ttsConfig";

const SKIP_SELECTORS: string[] = [
	"pre",
	"table",
	"sup",
	".expressive-code",
	".katex",
	".katex-display",
	"script",
	"style",
	"button",
	"svg",
	"nav",
	".toc",
	".table-of-contents",
	"[data-tts-skip]",
];

const BLOCK_TAGS = new Set([
	"DIV",
	"SECTION",
	"ARTICLE",
	"MAIN",
	"ASIDE",
	"HEADER",
	"FOOTER",
	"P",
	"UL",
	"OL",
	"LI",
	"BLOCKQUOTE",
	"FIGURE",
	"FIGCAPTION",
	"H1",
	"H2",
	"H3",
	"H4",
	"H5",
	"H6",
	"DL",
	"DT",
	"DD",
	"DETAILS",
	"SUMMARY",
]);

const EMOJI_PATTERN =
	/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

function cleanText(raw: string): string {
	return raw.replace(EMOJI_PATTERN, "").replace(/\s+/g, " ").trim();
}

function walk(element: Element, out: string[]): void {
	const children = Array.from(element.children);
	const hasBlockChild = children.some((child) =>
		BLOCK_TAGS.has(child.tagName),
	);
	if (!hasBlockChild) {
		const text = cleanText(element.textContent ?? "");
		if (text) {
			out.push(text);
		}
		return;
	}
	for (const child of children) {
		if (child.tagName === "BR") {
			continue;
		}
		walk(child, out);
	}
}

export function extractReadableText(root: ParentNode | null): string {
	if (!(root instanceof Element)) {
		return "";
	}
	const clone = root.cloneNode(true) as Element;
	for (const selector of SKIP_SELECTORS) {
		for (const element of Array.from(clone.querySelectorAll(selector))) {
			element.remove();
		}
	}
	const blocks: string[] = [];
	walk(clone, blocks);
	return blocks.join("\n").slice(0, ttsConfig.maxChars);
}

export function splitForSpeech(text: string): string[] {
	const limit = ttsConfig.speechChunkChars;
	const sentences = text.split(/(?<=[。！？!?；;，,\n])/);
	const chunks: string[] = [];
	let current = "";
	for (const sentence of sentences) {
		if (current && current.length + sentence.length > limit) {
			chunks.push(current);
			current = "";
		}
		current += sentence;
		while (current.length > limit) {
			chunks.push(current.slice(0, limit));
			current = current.slice(limit);
		}
	}
	if (current) {
		chunks.push(current);
	}
	return chunks.filter((chunk) => chunk.trim().length > 0);
}
```

- [ ] **Step 2: 类型验证**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/utils/tts-text.ts
git commit -m "feat(tts): 文章正文提取与系统语音分句工具"
```

---

### Task 5: 播放器组件与样式

**Files:**
- Create: `src/components/features/ArticleTtsPlayer.svelte`
- Create: `src/styles/features/tts-player.css`
- Modify: `src/styles/main.css`（追加 import）

**Interfaces:**
- Consumes: `ttsConfig`、`extractReadableText`/`splitForSpeech`、i18n 键、`Icon`（prop 名为 `icon`）
- Produces: `ArticleTtsPlayer` 组件，props `{ title: string; cover?: string | null }`
- Task 6 依赖该 props 契约

- [ ] **Step 1: 写 `ArticleTtsPlayer.svelte`（完整代码）**

```svelte
<script lang="ts">
import { onDestroy, onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import { siteConfig, ttsConfig } from "@/config";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import { extractReadableText, splitForSpeech } from "@/utils/tts-text";

interface Props {
	title: string;
	cover?: string | null;
}

let { title, cover = null }: Props = $props();

let open = $state(false);
let playing = $state(false);
let loading = $state(false);
let mode = $state<"server" | "speech">("server");
let rate = $state(1);
let voice = $state(ttsConfig.defaultVoice);
let elapsed = $state(0);
let duration = $state(0);
let notice = $state("");

let audio: HTMLAudioElement | null = null;
let text = "";
let speechQueue: string[] = [];
let speechIndex = 0;
let speechEpoch = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

const hasServer = ttsConfig.enable && ttsConfig.serverUrl.length > 0;

onMount(() => {
	const savedRate = Number(localStorage.getItem("firefly-tts-rate") || "1");
	if (ttsConfig.speeds.includes(savedRate)) {
		rate = savedRate;
	}
	const savedVoice = localStorage.getItem("firefly-tts-voice");
	if (savedVoice && ttsConfig.voices.some((item) => item.name === savedVoice)) {
		voice = savedVoice;
	}
});

onDestroy(() => {
	stopAll();
	if (noticeTimer) clearTimeout(noticeTimer);
});

function showNotice(message: string): void {
	if (!message) return;
	notice = message;
	if (noticeTimer) clearTimeout(noticeTimer);
	noticeTimer = setTimeout(() => {
		notice = "";
	}, 6000);
}

function formatTime(value: number): string {
	if (!Number.isFinite(value) || value <= 0) return "00:00";
	const minutes = Math.floor(value / 60);
	const seconds = Math.floor(value % 60);
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function collectText(): string {
	const root = document.querySelector("#post-container .markdown-content");
	const value = extractReadableText(root);
	if (!value) showNotice(i18n(I18nKey.ttsEmpty));
	return value;
}

function cancelSpeech(): void {
	speechEpoch += 1;
	window.speechSynthesis.cancel();
}

function releaseAudio(): void {
	if (!audio) return;
	audio.onerror = null;
	audio.ontimeupdate = null;
	audio.onended = null;
	audio.pause();
	audio.removeAttribute("src");
	audio.load();
	audio = null;
}

function stopAll(): void {
	releaseAudio();
	cancelSpeech();
	playing = false;
	loading = false;
	elapsed = 0;
	duration = 0;
}

function setupMediaSession(): void {
	if (!("mediaSession" in navigator)) return;
	navigator.mediaSession.metadata = new MediaMetadata({
		title,
		artist: siteConfig.title,
		album: i18n(I18nKey.ttsRead),
		artwork: cover ? [{ src: cover }] : [],
	});
	navigator.mediaSession.setActionHandler("play", () => {
		if (mode === "server" && audio) {
			void audio.play();
			playing = true;
		}
	});
	navigator.mediaSession.setActionHandler("pause", () => {
		audio?.pause();
		playing = false;
	});
}

function speakNext(epoch: number): void {
	if (epoch !== speechEpoch || speechIndex >= speechQueue.length) {
		if (epoch === speechEpoch) playing = false;
		return;
	}
	const utterance = new SpeechSynthesisUtterance(speechQueue[speechIndex]);
	utterance.lang = document.documentElement.lang || "zh-CN";
	utterance.rate = rate;
	utterance.onend = () => {
		speechIndex += 1;
		speakNext(epoch);
	};
	utterance.onerror = () => {
		speechIndex += 1;
		speakNext(epoch);
	};
	playing = true;
	window.speechSynthesis.speak(utterance);
}

function startSpeech(message: string): void {
	if (message) showNotice(message);
	mode = "speech";
	cancelSpeech();
	speechQueue = splitForSpeech(text);
	speechIndex = 0;
	if (speechQueue.length === 0) {
		playing = false;
		return;
	}
	speakNext(speechEpoch);
}

async function startServer(): Promise<void> {
	releaseAudio();
	cancelSpeech();
	mode = "server";
	loading = true;
	notice = "";
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		ttsConfig.requestTimeoutMs,
	);
	try {
		const response = await fetch(`${ttsConfig.serverUrl}/tts`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text, voice }),
			signal: controller.signal,
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		const data = (await response.json()) as { id: string };
		const player = new Audio(`${ttsConfig.serverUrl}/audio/${data.id}`);
		player.playbackRate = rate;
		player.ontimeupdate = () => {
			elapsed = player.currentTime;
			duration = Number.isFinite(player.duration) ? player.duration : 0;
		};
		player.onended = () => {
			playing = false;
			elapsed = 0;
		};
		player.onerror = () => {
			startSpeech(i18n(I18nKey.ttsFallback));
		};
		audio = player;
		setupMediaSession();
		try {
			await player.play();
			playing = true;
		} catch {
			playing = false;
		}
	} catch {
		startSpeech(i18n(I18nKey.ttsFallback));
	} finally {
		clearTimeout(timeout);
		loading = false;
	}
}

async function start(): Promise<void> {
	stopAll();
	open = true;
	text = collectText();
	if (!text) {
		open = false;
		return;
	}
	if (hasServer) {
		await startServer();
	} else {
		startSpeech(i18n(I18nKey.ttsNoServer));
	}
}

function toggle(): void {
	if (!open) {
		void start();
		return;
	}
	if (loading) return;
	if (mode === "server" && audio) {
		if (playing) {
			audio.pause();
			playing = false;
		} else {
			void audio.play();
			playing = true;
		}
		return;
	}
	if (mode === "speech") {
		if (playing) {
			window.speechSynthesis.pause();
			playing = false;
		} else {
			window.speechSynthesis.resume();
			playing = true;
		}
	}
}

function changeRate(event: Event): void {
	const value = Number((event.currentTarget as HTMLSelectElement).value);
	rate = value;
	localStorage.setItem("firefly-tts-rate", String(value));
	if (mode === "server" && audio) {
		audio.playbackRate = value;
		return;
	}
	if (mode === "speech") {
		cancelSpeech();
		speakNext(speechEpoch);
	}
}

function changeVoice(event: Event): void {
	voice = (event.currentTarget as HTMLSelectElement).value;
	localStorage.setItem("firefly-tts-voice", voice);
	if (mode === "server" && open) {
		void startServer();
	}
}

function seek(event: Event): void {
	const value = Number((event.currentTarget as HTMLInputElement).value);
	if (mode === "server" && audio) {
		audio.currentTime = value;
		elapsed = value;
	}
}

function close(): void {
	stopAll();
	open = false;
	notice = "";
}
</script>

<span class="tts-player__trigger">
	<button
		type="button"
		class="tts-player__button"
		disabled={loading}
		onclick={toggle}
		aria-label={i18n(I18nKey.ttsRead)}
	>
		<Icon icon="material-symbols:headphones" />
		<span class="tts-player__button-text">{i18n(I18nKey.ttsRead)}</span>
	</button>
</span>

{#if open}
	<div class="tts-player" role="region" aria-label={i18n(I18nKey.ttsRead)}>
		<button
			type="button"
			class="tts-player__control"
			onclick={toggle}
			aria-label={playing ? i18n(I18nKey.ttsPause) : i18n(I18nKey.ttsResume)}
		>
			<Icon icon={playing ? "material-symbols:pause" : "material-symbols:play-arrow"} />
		</button>

		<div class="tts-player__timeline">
			<input
				class="tts-player__seek"
				type="range"
				min="0"
				max={duration > 0 ? duration : 0}
				step="0.5"
				value={elapsed}
				oninput={seek}
				aria-label={i18n(I18nKey.ttsRead)}
				disabled={mode === "speech" || duration === 0}
			/>
			<span class="tts-player__time">
				{formatTime(elapsed)} / {duration > 0 ? formatTime(duration) : "--:--"}
			</span>
		</div>

		<label class="tts-player__field">
			<span>{i18n(I18nKey.ttsSpeed)}</span>
			<select class="tts-player__select" value={rate} onchange={changeRate}>
				{#each ttsConfig.speeds as speed (speed)}
					<option value={speed}>{speed === 1 ? "1x" : `${speed}x`}</option>
				{/each}
			</select>
		</label>

		{#if mode === "server"}
			<label class="tts-player__field">
				<span>{i18n(I18nKey.ttsVoice)}</span>
				<select class="tts-player__select" value={voice} onchange={changeVoice}>
					{#each ttsConfig.voices as item (item.name)}
						<option value={item.name}>{item.label}</option>
					{/each}
				</select>
			</label>
		{/if}

		<button
			type="button"
			class="tts-player__control"
			onclick={close}
			aria-label={i18n(I18nKey.ttsClose)}
		>
			<Icon icon="material-symbols:close" />
		</button>

		{#if loading}
			<span class="tts-player__notice">{i18n(I18nKey.ttsPreparing)}</span>
		{:else if notice}
			<span class="tts-player__notice">{notice}</span>
		{/if}
	</div>
{/if}
```

- [ ] **Step 2: 写 `tts-player.css`**

```css
/* ===== 文章朗读播放条（ArticleTtsPlayer） ===== */

.tts-player__trigger {
  display: inline-flex;
  align-items: center;
}

.tts-player__button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: oklch(0.62 0.19 260);
  border: none;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
}

.tts-player__button:hover {
  color: oklch(0.55 0.21 260);
  background: transparent;
}

.tts-player__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.tts-player {
  position: fixed;
  left: 50%;
  bottom: 4.75rem;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: min(94vw, 680px);
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--line-divider);
  background: var(--card-bg);
  color: var(--deep-text);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.tts-player__control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background: var(--btn-regular-bg);
  color: var(--btn-content);
  cursor: pointer;
  flex-shrink: 0;
}

.tts-player__control:hover {
  opacity: 0.85;
}

.tts-player__timeline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.tts-player__seek {
  width: clamp(90px, 24vw, 220px);
  accent-color: var(--primary);
}

.tts-player__time {
  font-size: 0.72rem;
  color: var(--content-meta);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.tts-player__field {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--content-meta);
}

.tts-player__select {
  border: 1px solid var(--line-divider);
  border-radius: 0.5rem;
  background: var(--btn-regular-bg);
  color: var(--btn-content);
  padding: 0.15rem 0.3rem;
  font-size: 0.72rem;
  max-width: 7.5rem;
}

.tts-player__notice {
  font-size: 0.72rem;
  color: var(--content-meta);
  max-width: 12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 767px) {
  .tts-player {
    left: 0.5rem;
    right: 0.5rem;
    bottom: 4.5rem;
    transform: none;
    max-width: none;
    border-radius: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .tts-player__seek {
    width: 38vw;
  }
}
```

- [ ] **Step 3: `src/styles/main.css` 追加导入**

在 `@import './pages/encrypt-gate.css';` 之后追加：

```css
@import './features/tts-player.css';
```

- [ ] **Step 4: 格式化 + 类型验证**

Run: `pnpm lint`
Expected: Biome 自动格式化新文件（若有改动）

Run: `pnpm check`
Expected: 0 errors（此时组件尚未挂载，但会被 astro check 检查）

- [ ] **Step 5: Commit**

```bash
git add src/components/features/ArticleTtsPlayer.svelte src/styles/features/tts-player.css src/styles/main.css
git commit -m "feat(tts): 文章朗读播放器组件与样式（双引擎兜底）"
```

---

### Task 6: 挂载到文章页

**Files:**
- Modify: `src/pages/posts/[...slug].astro`

**Interfaces:**
- Consumes: `ArticleTtsPlayer`（Task 5）、`ttsConfig`（Task 3）
- Produces: 文章页渲染「朗读」按钮

- [ ] **Step 1: 追加 import**

在 `import SharePoster from "@/components/misc/SharePoster.svelte";` 之后追加：

```astro
import ArticleTtsPlayer from "@/components/features/ArticleTtsPlayer.svelte";
```

并在 `import { commentConfig } from "@/config";` 一行改为：

```astro
import { commentConfig, ttsConfig } from "@/config";
```

- [ ] **Step 2: 在 meta-extra 行挂载（SharePoster 块之后）**

在 `{siteConfig.sharePoster && ( ... )}` 代码块结束后、`.post-hero__meta-extra` 闭合 `</div>` 前追加：

```astro
        {ttsConfig.enable && (
          <span class="post-hero__tts"><ArticleTtsPlayer
            client:load
            title={entry.data.title}
            cover={posterCoverUrl}
          /></span>
        )}
```

- [ ] **Step 3: 构建验证**

Run: `pnpm build`
Expected: 构建成功（生成图标 → astro build → pagefind）；无 Svelte 警告

- [ ] **Step 4: 静态检查**

Run: `pnpm lint`
Expected: Biome 自动格式化

Run: `pnpm exec biome ci ./src --reporter=github`
Expected: 0 errors

- [ ] **Step 5: 浏览器实测（本地）**

Run: `pnpm dev` 后打开任一文章页（如 `/posts/...`）：
- 未配 `PUBLIC_TTS_SERVER` 时：点「朗读」→ 提示"未配置朗读服务，使用系统语音"→ 系统语音开始朗读
- 播放条显示播放/暂停、进度、倍速、关闭；切倍速立即生效
- 切页/刷新播放停止

- [ ] **Step 6: Commit**

```bash
git add "src/pages/posts/[...slug].astro"
git commit -m "feat(tts): 文章页挂载朗读播放器"
```

---

### Task 7: 收尾（changelog + 文档同步 + 全量验证）

**Files:**
- Create: `src/content/changelog/2026-09-15-article-tts.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`（数字同步）

- [ ] **Step 1: 写 changelog 条目**

```markdown
---
version: "v1.37.0"
date: 2026-09-15
time: "21:00"
type: feature
description: 文章页新增「朗读」功能，支持倍速与音色切换，可用系统语音兜底
---

## 文章朗读（TTS）

- 文章页 meta 行新增「🎧 朗读」按钮，点击即可把文章读给你听
- 悬浮播放条支持播放/暂停、进度、**倍速（0.8x~2x）**、音色切换（晓晓/云希/云扬等 7 种），选择会被记住
- 服务端自建 edge-tts 服务（`scripts/TTS服务/`，部署教程 `docs/deploy-edge-tts.md`），流式合成 1~2 秒出声，缓存后重听秒开
- 服务不可用时自动切换浏览器系统语音，功能不中断
- 正文提取自动跳过代码块、表格、公式，编程笔记听感更干净
```

- [ ] **Step 2: 同步 `CLAUDE.md`**

按第 20 节要求，修改以下位置：

1. §0 命令表追加一行：
   ```markdown
   | `bash "scripts/TTS服务/自测.sh"` | 服务器上自测朗读服务（见 `docs/deploy-edge-tts.md`） |
   ```
2. §2 目录结构：
   - `src/config/` 的 "27 个 .ts" → "28 个 .ts"
   - `src/utils/` 的数量说明 +1（新增 `tts-text.ts`）
   - `src/components/features/` 数量 +1（新增 `ArticleTtsPlayer.svelte`）
   - `scripts/` 说明追加 `TTS服务/`（edge-tts 朗读服务，部署产物）
   - `styles/features/` 追加 `tts-player.css`
3. §3 新增小节 `### 3.6 文章朗读（TTS，2026-09-15）`：一句话链路（文章页提取正文 → `POST PUBLIC_TTS_SERVER/tts` → `<audio>` 流式播放 → 失败降级 Web Speech；服务端代码与部署见 `docs/deploy-edge-tts.md`；CORS 白名单含 blog.example.com 与本地 4321）
4. §16 技术栈表追加：
   ```markdown
   | edge-tts | Python ≥3.12（服务端 Docker） | 博客朗读服务（scripts/TTS服务/），非 Node 依赖 |
   ```
5. §19 环境变量说明处补一句：EdgeOne 需新增 `PUBLIC_TTS_SERVER`（第 14 个）

- [ ] **Step 3: 同步 `AGENTS.md` 数字**

- `src/config/`（27 配置 + index.ts barrel）→ 28 配置
- `src/utils/`（41 个工具与控制器）→ 42 个

- [ ] **Step 4: 全量验证**

Run: `pnpm lint`
Expected: Biome 自动格式化

Run: `pnpm build`, then `pnpm check`, then `pnpm exec biome ci ./src --reporter=github`
Expected: 三步全绿

- [ ] **Step 5: Commit**

```bash
git add src/content/changelog CLAUDE.md AGENTS.md
git commit -m "docs: 文章朗读功能更新日志与规范同步"
```

---

### Task 8: 服务器部署（用户执行，AI 陪同排错）

**Files:** 无（操作服务器；教程 `docs/deploy-edge-tts.md`）

- [ ] **Step 1: 上传代码到服务器**

```bash
mkdir -p /opt/blog-tts && cd /opt/blog-tts
# 在服务器执行；若用 scp 则从本地上传 scripts/TTS服务/*
```

- [ ] **Step 2: 连通性预检**（教程第三节）→ 403 则走教程第八节
- [ ] **Step 3: `docker compose up -d --build` + `bash 自测.sh`**
- [ ] **Step 4: Nginx 反代 + HTTPS（教程第五节）→ `curl https://tts.example.com/health` 返回 ok**
- [ ] **Step 5: EdgeOne 控制台加 `PUBLIC_TTS_SERVER` → 触发重新部署**
- [ ] **Step 6: 手机 + 电脑实测教程第七节验收清单**

---

## 自审记录

- 需求覆盖：spec 的服务端接口/缓存/防护（Task 1-2）、博客播放器/提取/兜底（Task 3-6）、部署教程（Task 2、8）、验收与收尾（Task 7）均有对应任务
- 命名一致性：`ttsConfig`（非 ttsSettings）、`extractReadableText`/`splitForSpeech`、i18n 10 键、`PUBLIC_TTS_SERVER` 在全文保持一致
- 无占位符：所有代码与命令均为最终版；服务器路径/域名/版本号均写实
- 已知取舍：播放条进度条仅缓存命中后可拖动（流式未完成时 duration 未知），与 spec 一致
