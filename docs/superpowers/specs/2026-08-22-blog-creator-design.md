# AstrBot BlogCreator 插件设计 — 自然语言新增博客文件（全量13集合）

- **日期**: 2026-08-22
- **作者**: mengkuikun + Muse Spark
- **状态**: 已批准（方案 B 路由分发）
- **关联**: `src/content.config.ts` / `.pages.yml` / `plug-in/AstrBot/AstrBot BlogWriter` / `CLAUDE.md §2-§22`

---

## 1. 背景与目标

通过 AstrBot（微信 `weixin_oc`）用自然语言为博客仓库 `mengkuikun/dumplingandcakeblog` 新增文件，覆盖全量集合，要求：
- **调用官方模型**：仅 `context.get_using_llm()`（A 严格官方，不自配 `ai_api_key/base_url`）
- **落地 GitHub API**：`PUT /repos/{owner}/{repo}/contents/src/content/...`（A+1，秒回不等待 EdgeOne 构建）
- **预览确认**：AI 抽取→预览 YAML+正文→用户回 `确认/修改/取消` 才提交
- **与 zod 对齐**：所有 frontmatter 字段、枚举、日期格式、引号规则以 `src/content.config.ts` 为真源，`.pages.yml` 仅定文件名，构建零报错

非目标（一期不做）：更新/删除、关键词兜底（二期）、本地直写。

---

## 2. 总览架构

### 2.1 插件边界

全新独立插件 `AstrBot BlogCreator`，与 `BlogWriter` 并存不互改：

```
plug-in/AstrBot/AstrBot BlogCreator/   # 独立 git 仓
├── main.py                 # Star 粘合层：路由/会话/Preview/GitHub PUT（唯一做网络）
├── blog_creator_core.py    # 纯逻辑：Router + 校验工具（禁 import astrbot，可单测）
├── writers/
│   ├── base.py             # Writer 基类
│   ├── posts.py            # 文件夹即分类，无 category 字段
│   ├── moments.py / friends.py / album.py / ...（其余12个同构）
│   └── registry.py         # {collection: Writer} + .pages.yml 模板对照
├── metadata.yaml           # name: astrbot_plugin_blog_creator, version v1.0.0, astrbot_version >=4.22.0
├── _conf_schema.json       # 仅 github_token/repo/branch + allow_users + imgbed_*
└── tests/test_core.py      # Router + Writer 单测（stub llm）
```

硬边界：
- `blog_creator_core.py` 零 `astrbot` 依赖
- `main.py` 唯一 `httpx` 网络层
- `posts` 禁写 `frontmatter.category`，分类靠 `src/content/posts/<分类路径>/` + `src/utils/category-tree.ts#getCategoryFromId`

### 2.2 目录与配置

`_conf_schema.json` 仅 5 项（复用 BlogWriter 键名）：
- `github_token` / `github_repo`（默认 `mengkuikun/dumplingandcakeblog`）/ `github_branch`（`main`）
- `allow_users`（空=全拒绝）
- `imgbed_upload_url` / `imgbed_token` / `imgbed_upload_folder`（默认 `blog/moments`，相册 `blog/album/<名>`）

`metadata.yaml` 严格 `astrbot_plugin_` 前缀，`version` 带 `v` 前缀。

---

## 3. 数据流与状态机

**Session**：`Session(user_id) = {collection, writer, fields, pending_images, state, updated_at}`，`_sessions: Dict[str, Session]`，30min 超时，单用户单会话，`allow_users` 非白名单静默放行。

```
idle --自然语言--> Router LLM（官方，8s超时重试1次）
  ├─ 低置信度/超时 → 回“AI 暂不可用，请稍后重试”
  └─ 命中 collection → Writer 接管
       → Writer.required 校验
          ├─ 缺字段 → 追问（例 posts 缺 title/tags → “标题和标签发我一下”）
          ├─ 需图且无图 → “发图给我，够了回‘够了’”
          └─ 齐 → 生成预览
               → 回微信：【预览】collection: posts / file: src/content/posts/编程学习/2026-08-22-xxx.md / YAML / 正文前200字 + 提示“回 确认 发布 / 回 修改 标题=新标题 / 取消”
               → 用户“确认” → GET 验重（存在则 slug-1…-10 并提示）→ PUT → 回 “✅ 已提交 commit链接，1-2分钟后生效”
               → 用户“修改” → 更新 fields → 重预览
               → 用户“取消” → 丢弃
```

图片：微信发图→`_extract_images` 收集→`imgbed` 上传→URL 回填 `images/photos/cover`，任一失败整单中止。

---

## 4. 核心模块

### 4.1 Router（`blog_creator_core.py`）

- **一期纯 AI**：`route(text) -> {collection, confidence, hint}`，`System: 你是13选1路由…` + `User: 自然语言`，`await context.get_using_llm().chat(messages)`，`confidence<0.6` 视为未命中；失败直接回用户，不进关键词分支
- **二期插槽**：`keywords_fallback.py` 独立模块，`if llm_failed: return fallback_route(text)`，二期单测不污染一期
- 纯函数，可 stub `llm.chat` 单测 13类各5条

### 4.2 Writer 基类（`writers/base.py`）

```python
class BaseWriter:
  collection: str
  required: list[str]
  optional: list[str]
  def extract_fields(self, llm_raw: dict, text: str) -> dict: ...
  def validate(self, fields: dict) -> (bool, err): ...  # 对齐 content.config.ts zod
  def filename(self, fields: dict) -> str: ...
  def build_md(self, fields: dict) -> str: ...           # YAML + body
  def preview(self, fields: dict) -> str: ...
```

13 Writer 分三档：
- **简档**：`friends/apps/tombstones/daohang/changelog`，`filename="{slug}.md"`，校验 URL
- **时间档**：`posts/moments/album/bills/schedules/life`，`filename="{year}-{month}-{day}-{slug}.md"`，`posts` 特殊 `path = src/content/posts/<category_path>/ + filename`
- **复合档**：`ziyuan`（`content+link` vs `quotes[]` 二选一）、`bangumi`（`category/status` 枚举）、`life`（拆 `life/places` 与 `life/notebooks` 两子 Writer）

共享层：`clean_filename_part` / `with_suffix` / `github_put_url` / `build_github_put_body` 复用 BlogWriter 已测函数；`posts` 的 `category_path` 校验 `kebab` 子路径。

### 4.3 网络层（`main.py`）

- `_get_client()` 单例 `httpx.AsyncClient`（15s connect + 30s read）
- 提交：`GET /contents/{path}` 验重→`PUT` 带 `branch` 与 `message`，失败映射：`401→token权限不足`，`422→已存在`，`429→稍后重试`
- 图片：`POST imgbed_upload_url`，中文目录 `unquote` 与四类签名兼容（复用 BlogWriter）

---

## 5. LLM Prompt 设计

**Router Prompt**（200 token）：
```
你是博客13集合路由，只判唯一集合。
候选：posts(文章需标题/分类路径/tags)、spec、moments、bangumi、life、notebooks、album、daohang、ziyuan、friends、apps、tombstones、bills、schedules、changelog
只输出 JSON：{"collection":"posts","confidence":0.92,"hint":{"title":"AI趋势","category_path":"编程学习/AI"}}
当前时间 {now_shanghai}
```
调用：`llm = context.get_using_llm(); await llm.chat([{"role":"system","content":RouterPrompt},{"role":"user","content":text}])`

**Writer Prompt**（按集合切片 400~600 token，不塞全量 schema）：
- `posts_writer` 示例：`你是 posts 抽取，只输出 JSON，字段 title/published/tags/description/image/draft/pinned/body，category_path 另给不要进 frontmatter，纯数字 tag 保字符串`
- `friends` 示例：`siteurl 必为 URL`，`album` 含 `imgbedFolder` 推导，`ziyuan` 含二选一示例
- 均注入 `当前时间 {now}`，只输出 JSON

**校验层**：`writer.validate()` 对齐 `src/content.config.ts:14-341` zod，`tags` 去重、数字加引号，`published/date` 多格式容错，失败标红重预览。

---

## 6. 文件命名与 zod 对齐

真源：`src/content.config.ts` 定字段/枚举/类型，`.pages.yml` 定 `filename.template`，`src/content/**` 真文件定 YAML 风格。

| 集合 | 路径 | 文件名模板 | 示例 | frontmatter 要点 |
|---|---|---|---|---|
| posts | `src/content/posts/<category_path>/` | `{year}-{month}-{day}-{slug}.md` | `编程学习/2026-08-22-rust-2026.md` | 无 `category`，`published: 2026-08-22` 裸写，`tags: ["Rust","2026"]` 数字加引号 |
| moments | `src/content/moments/` | `{year}-{month}-{day}.md` + `-1` | `2026-08-22.md` | `published: 2026-08-22 14:30:00` |
| friends/apps | `src/content/friends/` | `{slug}.md` | `my-friend.md` | 必 `siteurl/imgurl`，`group: friend/other` |
| album | `src/content/album/` | `{year}-{month}-{day}-{slug}.md` | `2026-08-22-trip.md` | 仅 `title/date/imgbedFolder` |
| daohang | `src/content/daohang/` | `{slug}.md` | `my-tool.md` | 必 `name/url/category` |
| ziyuan | `src/content/ziyuan/` | `{year}-{month}-{day}-{slug}.md` | `2026-08-22-notice.md` | 二选一 `content` vs `quotes[]` |
| bangumi | `src/content/bangumi/` | `{slug}.md` | `my-anime.md` | `category/status` 枚举 |
| life/places | `src/content/life/places/` | `{year}-{month}-{day}.md` | `2026-08-22.md` | `province/city/lat/lng` |
| notebooks | `src/content/life/notebooks/` | `{year}-{month}-{day}-{slug}.md` | `2026-08-22-diary.md` | `name/date/tags` |
| bills | `src/content/bills/` | `{year}-{month}-{day}-{slug}.md` | `2026-08-22-lunch.md` | `amount/type/category/account/date` |
| schedules | `src/content/schedules/` | `{year}-{month}-{day}-{slug}.md` | `2026-08-22-meeting.md` | `date/allDay/priority/category` |
| changelog/spec/tombstones | 各自目录 | 同模板 | — | 按 `content.config.ts:314` |

YAML 规则：日期裸写、含 `:` 字符串加引号、纯数字 tag `'"2026"'`，`posts category_path` 不进 YAML，提交前镜像 `zod` 再校验。

---

## 7. 错误、安全与测试

**错误**：LLM 超时→`AI 暂不可用`；校验失败→标红追问；`GET` 验重失败→重试1次仍失败则 `slug-1` 保底；`PUT` 按状态码映射中文提示；图片任一失败整单中止。均 `logger.warning`。

**安全**：`allow_users` 空全拒绝、非白名单静默放行；`category_path/slug` 过 `clean_filename_part` 防 `../`；禁写 `frontmatter.category`；禁 `!important/Stylus`。

**测试**：
- `tests/test_core.py`：Router 13类各5条（stub llm）+ 15 Writer 各 `validate/build_md/filename` 黄金样例（对齐真文件）
- `tests/test_smoke.py`：stub `astrbot` 导入 `main.BlogCreator`，`route→preview→confirm→PUT` 全链路（mock httpx）
- 提交前 `pnpm build + pnpm check + pnpm exec biome ci ./src` 全绿

**验收**（腾讯云）：
1. `/创建 帮我写篇 编程学习 下的《Rust 2026》标签 Rust,教程` → 预览 `编程学习/2026-08-22-rust-2026.md` → `确认` → 仓库落文件且 `pnpm build` 44s 过
2. `/创建 帮我加个友链 站名X 链接https://x.cn 描述Y` → `friends/x.md` → `确认` → `build` 过
3. 13 集合各1条新增，零 `zod` 报错

---

## 8. 分期

- **一期（本设计）**：纯 AI 路由 + 13 Writer + 预览确认 + GitHub API + 含图，不含关键词兜底。先把 `LLM→fields→validate→preview→PUT` 全链路跑稳
- **二期**：新增 `keywords_fallback.py`，`route()` 失败时 `fallback_route(text)`，独立单测与文档

---

## 9. 参考

- `src/content.config.ts:14-341`（13+2 集合 zod）
- `.pages.yml:24-943`（12 集合声明，`merge:false`）
- `src/utils/category-tree.ts#getCategoryFromId`（文件夹即分类）
- `plug-in/AstrBot/AstrBot BlogWriter/main.py` / `blog_writer_core.py`（GitHub/imgbed 链路复用）
- [AstrBot 官方文档 Star 开发](https://docs.astrbot.app/dev/star/)（`@filter.event_message_type` / `Context.get_using_llm` / `httpx` / `logger`）
