# Scripts 工具箱

所有脚本通过统一入口 `cli.js` 调用，只需记住一个命令：

```bash
pnpm cli
```

## 目录结构

```
scripts/
├── cli.js                    # 统一入口
├── 新建文章/                  # 创建新文章
│   └── index.js
├── 生成图标/                  # 图标预处理（构建时自动执行）
│   └── index.js
├── 下载影视/                  # 影视封面下载（TMDB）
│   ├── index.py
│   └── img-anime/
├── 下载音乐/                  # 音乐下载（Meting API）
│   ├── fetch-lrc.py
│   ├── extract-lrc.py
│   ├── downloads/
│   ├── api1.txt
│   └── api2.txt
├── 生成摘要/                  # AI 摘要生成
│   └── index.ts
├── 添加导航/                  # 导航链接管理
│   └── index.js
└── 转WebP/                   # 图片转 WebP 格式
    └── convert-to-webp.mjs
```

## 可用命令

| 命令 | 说明 | 脚本 |
|------|------|------|
| `new` | 创建新文章 | `新建文章/index.js` |
| `media` | 下载影视封面 + 生成 md（TMDB） | `下载影视/index.py` |
| `music` | 下载音乐 + 歌词 + 封面（Meting API） | `下载音乐/fetch-lrc.py` |
| `lrc` | 从本地 M4A 提取歌词/封面 | `下载音乐/extract-lrc.py` |
| `desc` | AI 批量生成文章摘要（千问 API） | `生成摘要/index.ts` |
| `nav` | 添加网站导航条目 | `添加导航/index.js` |
| `dev` | 启动本地开发服务器 | `pnpm dev` |
| `build` | 构建生产站点 | `pnpm build` |

## 使用方式

```bash
# 交互菜单（推荐）
pnpm cli

# 子命令直达
pnpm cli new "文章名"
pnpm cli media "片名" [--type=movie|tv] [-y]
pnpm cli music "歌名" --md
pnpm cli lrc <文件或目录>
pnpm cli desc
pnpm cli dev
pnpm cli build
```

所有子命令的额外参数会原样转发给对应的脚本。

## 各脚本详情

### 新建文章/index.js — 创建新文章

创建新文章模板，自动填充 frontmatter。

### 下载影视/index.py — 影视封面下载

从 TMDB 搜索影视并生成 bangumi md 文件。封面输出到 `下载影视/img-anime/`，md 输出到 `src/content/bangumi/anime/`。

### 下载音乐/fetch-lrc.py — 音乐下载

从 Meting API 搜索下载音乐（含歌词/封面），生成 bangumi music md 文件。

#### 搜索下载模式（最常用）

```bash
# 搜索并下载（交互选择）
python scripts/下载音乐/fetch-lrc.py "晴天" "周杰伦" --md

# 指定平台
python scripts/下载音乐/fetch-lrc.py "海阔天空" --md --server=kugou

# 指定输出目录
python scripts/下载音乐/fetch-lrc.py "知我" "国风堂" --md --out=./dl
```

#### 本地文件模式

```bash
# 处理单个文件（提取封面 + 搜索歌词）
python scripts/下载音乐/fetch-lrc.py ./downloads/xxx.m4a

# 批量处理目录
python scripts/下载音乐/fetch-lrc.py ./downloads/ --md
```

#### 参数说明

| 参数 | 说明 |
|------|------|
| `--server=netease` | 音乐平台（netease/tencent/kugou/xiami/baidu），默认 netease |
| `--md` | 生成博客 md 文件 |
| `--no-md` | 不生成 md |
| `--out=./dl` | 指定下载输出目录（默认 `下载音乐/downloads/`） |
| `--api=https://xxx/api` | 自定义 Meting API 端点（可多次使用） |
| `--test` | 诊断模式，测试各平台可用性 |

#### 依赖

- Python 3
- mutagen（`pip install mutagen`）
- 已部署的 Meting API（默认 `https://mu.example.com/api`）

### 下载音乐/extract-lrc.py — 歌词提取

从本地 M4A/AAC/MP4 音频文件中提取内嵌歌词，保存为 .lrc 文件。无需 ffmpeg，纯 Python 实现。

```bash
# 提取单个文件的歌词
python scripts/下载音乐/extract-lrc.py ./downloads/xxx.m4a

# 批量提取目录下所有音频的歌词
python scripts/下载音乐/extract-lrc.py ./downloads/

# 覆盖已有的 lrc 文件
python scripts/下载音乐/extract-lrc.py ./downloads/ --overwrite
```

依赖：mutagen（`pip install mutagen`）

### 生成摘要/index.ts — 文章摘要生成

调用千问 API 批量为缺少 description 的文章自动生成摘要。
