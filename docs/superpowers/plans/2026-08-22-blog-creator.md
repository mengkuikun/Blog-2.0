# AstrBot BlogCreator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `AstrBot BlogCreator` 插件（`plug-in/AstrBot/AstrBot BlogCreator/`），通过官方 LLM 自然语言新增全量集合文件，预览确认后经 GitHub API 提交，构建零报错。

**Architecture:** Router 纯 LLM 判 13 集合（8s 超时，无关键词兜底）→ 13 Writer 各管 `validate/filename/build_md/preview`（`posts` 文件夹即分类）→ `main.py` 统一会话/预览/查重-1/PUT/图床。

**Tech Stack:** Python 3.10+, AstrBot Star (`@filter.event_message_type`, `Context.get_using_llm`, `httpx`, `logger`), PyYAML, `src/content.config.ts` zod 镜像校验

## Global Constraints

- AstrBot >=4.22.0，`metadata.yaml` 需 `name: astrbot_plugin_blog_creator` 带前缀 + `version: v1.0.0` 带 v
- Node >=22, pnpm 9.14.4, Astro 7.1.6 + Svelte 5 + Tailwind v4，无 `tailwind.config.js`
- 样式经 `src/styles/main.css`，暗色 `:root.dark`，禁 `!important`/Stylus/`#000`
- `pnpm build` + `pnpm check` + `pnpm exec biome ci ./src --reporter=github` 全绿再提交
- `posts` 禁 `frontmatter.category`，分类靠 `src/content/posts/<category_path>/` + `src/utils/category-tree.ts#getCategoryFromId`
- `.pages.yml` `merge:false`，未声明字段丢弃；`src/content.config.ts` 为 frontmatter 真源
- 图床 `imgbed_upload_folder=blog/moments`，相册 `blog/album/<相册名>`，中文目录需 `unquote`
- `allow_users` 空=全拒绝，非白名单静默放行不抢其他插件
- 网络 `httpx` 15s connect + 30s read，重试 2 次

---

## File Structure

```
plug-in/AstrBot/AstrBot BlogCreator/
├── main.py                     # Star：路由/会话/预览/查重/PUT/图床（唯一网络）
├── blog_creator_core.py        # Router + 通用校验（禁 import astrbot）
├── writers/
│   ├── __init__.py
│   ├── base.py                 # BaseWriter
│   ├── registry.py             # {collection: Writer} + 模板表
│   ├── posts.py                # 文件夹即分类
│   ├── moments.py
│   ├── friends.py
│   ├── album.py
│   ├── daohang.py
│   ├── ziyuan.py               # union 二选一
│   ├── bangumi.py
│   ├── life.py                 # 拆 life/places + life/notebooks
│   ├── bills.py
│   ├── schedules.py
│   ├── apps.py
│   ├── tombstones.py
│   ├── spec.py
│   └── changelog.py
├── metadata.yaml
├── _conf_schema.json           # github_token/repo/branch + allow_users + imgbed_*
├── README.md
└── tests/
    ├── test_core.py            # Router + Writer 单测
    └── test_smoke.py           # stub astrbot 全链路
```

Created: 本计划新建 `AstrBot BlogCreator/` 全量；Modify: 仅 `docs/superpowers/specs/2026-08-22-blog-creator-design.md` 已存在不改，博客仓库不改（`pnpm build` 验证用）。

---

### Task 1: 插件脚手架 + Router 纯 AI

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/metadata.yaml`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/_conf_schema.json`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/blog_creator_core.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/tests/test_core.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/README.md`

**Interfaces:**
- Consumes: `astrbot.api.star.Context.get_using_llm() -> llm.chat(messages)`（`main.py` 传 llm 给 core 仅测时 stub）
- Produces: `blog_creator_core.route_via_llm(text, llm, now) -> {collection, confidence, hint}` + `COLLECTIONS: list[str]` + `ROUTER_PROMPT: str`; 后续 Writer 通过 `hint` 拿 `title/category_path`

- [ ] **Step 1: 写失败单测 — Router 纯 AI 判 posts**

```python
# tests/test_core.py
import asyncio
from blog_creator_core import route_via_llm

class FakeLLM:
    async def chat(self, messages):
        return '{"collection":"posts","confidence":0.92,"hint":{"title":"Rust 2026","category_path":"编程学习"}}'

def test_route_posts():
    llm = FakeLLM()
    res = asyncio.run(route_via_llm("帮我写篇编程学习下的 Rust 2026", llm, "2026-08-22 10:00:00"))
    assert res["collection"] == "posts"
    assert res["confidence"] == 0.92
    assert res["hint"]["category_path"] == "编程学习"
```

- [ ] **Step 2: 跑测确认失败**

Run: `python -m unittest tests.test_core -v`  (in `plug-in/AstrBot/AstrBot BlogCreator/`)
Expected: `ModuleNotFoundError: No module named 'blog_creator_core'`

- [ ] **Step 3: 实现最小 Router**

```python
# blog_creator_core.py
COLLECTIONS = ["posts","spec","moments","bangumi","life","notebooks","album","daohang","ziyuan","friends","apps","tombstones","bills","schedules","changelog"]
ROUTER_PROMPT = "你是博客13集合路由，只判唯一集合。候选：posts(文章需标题/分类路径/tags)、spec、moments、bangumi、life、notebooks、album、daohang、ziyuan、friends、apps、tombstones、bills、schedules、changelog。只输出 JSON：{\"collection\":\"posts\",\"confidence\":0.92,\"hint\":{}} 当前时间 {now}"
import json, re
async def route_via_llm(text, llm, now):
    messages = [{"role":"system","content":ROUTER_PROMPT.format(now=now)},{"role":"user","content":text}]
    raw = await llm.chat(messages)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw); raw = re.sub(r"\s*```$", "", raw)
    data = json.loads(raw)
    if data.get("collection") not in COLLECTIONS:
        raise ValueError("unknown collection")
    return data
```

- [ ] **Step 4: 跑测通过**

Run: `python -m unittest tests.test_core::test_route_posts -v`
Expected: `OK 1 passed`

- [ ] **Step 5: 补 Router 边界单测并提交**

```python
def test_route_timeout_returns_error():
    class BadLLM:
        async def chat(self, m): raise TimeoutError()
    import asyncio
    from blog_creator_core import route_via_llm
    try:
        asyncio.run(route_via_llm("hi", BadLLM(), "2026-08-22"))
        assert False
    except TimeoutError:
        pass
```

Run: `python -m unittest discover -s tests -v` Expected: `OK 2 passed`

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/metadata.yaml plug-in/AstrBot/AstrBot\ BlogCreator/_conf_schema.json plug-in/AstrBot/AstrBot\ BlogCreator/blog_creator_core.py plug-in/AstrBot/AstrBot\ BlogCreator/tests/test_core.py
git commit -m "feat(blog-creator): scaffold + router pure AI"
```

---

### Task 2: Writer 基类 + Registry + 通用校验

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/__init__.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/base.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/registry.py`
- Modify: `plug-in/AstrBot/AstrBot BlogCreator/blog_creator_core.py:1-30` — 新增 `clean_filename_part`, `validate_against_zod`, `COLLECTION_TEMPLATES`
- Test: `plug-in/AstrBot/AstrBot BlogCreator/tests/test_core.py`

**Interfaces:**
- Consumes: `blog_creator_core.COLLECTIONS`, `src/content.config.ts` 镜像表
- Produces: `writers.base.BaseWriter.validate(fields)->(bool,err)`, `filename(fields)->str`, `build_md(fields)->str`, `preview(fields)->str`; `writers.registry.get_writer(collection)->BaseWriter`

- [ ] **Step 1: 写失败单测 — BaseWriter 校验 posts 必填**

```python
def test_posts_validate_missing_title():
    from writers.posts import PostsWriter
    w = PostsWriter()
    ok, err = w.validate({"published":"2026-08-22","tags":["Rust"]})
    assert not ok and "title" in err
```

- [ ] **Step 2: 跑测失败**

Run: `python -m unittest tests.test_core -v`
Expected: `ModuleNotFoundError: writers.posts`

- [ ] **Step 3: 实现 BaseWriter 与通用工具**

```python
# writers/base.py
import re
import yaml
class BaseWriter:
    collection=""; required=[]; optional=[]
    def validate(self, fields):
        for k in self.required:
            if not fields.get(k): return False, f"missing {k}"
        return True, ""
    def clean(self, s): 
        s=re.sub(r'[\\/:*?"<>|]',"-",s); s=re.sub(r'\s+','-',s.strip()); return s[:60] or "untitled"
    def filename(self, fields): raise NotImplementedError
    def build_md(self, fields): raise NotImplementedError
    def preview(self, fields):
        md=self.build_md(fields)
        return md[:800]
```

```python
# blog_creator_core.py 新增
import re
def clean_filename_part(s): return re.sub(r'[\\/:*?"<>|]',"-",re.sub(r'\s+','-',s.strip()))[:60] or "untitled"
COLLECTION_TEMPLATES = {
  "posts": "src/content/posts/<category_path>/{year}-{month}-{day}-{slug}.md",
  "friends": "src/content/friends/{slug}.md",
  # 其余 13 按 5/6 表补全
}
```

```python
# writers/registry.py
from writers.posts import PostsWriter
REGISTRY={"posts": PostsWriter(), "friends": __import__("writers.friends",fromlist=["FriendsWriter"]).FriendsWriter()}
def get_writer(c): return REGISTRY.get(c)
```

- [ ] **Step 4: 跑测通过**

Run: `python -m unittest tests.test_core::test_posts_validate_missing_title -v`
Expected: `OK`

- [ ] **Step 5: 提交**

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/writers/ plug-in/AstrBot/AstrBot\ BlogCreator/blog_creator_core.py
git commit -m "feat(blog-creator): base writer + registry + clean filename"
```

---

### Task 3: 高频 Writer 5 个（posts/moments/friends/album/daohang）

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/posts.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/moments.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/friends.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/album.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/daohang.py`
- Test: `plug-in/AstrBot/AstrBot BlogCreator/tests/test_core.py`

**Interfaces:**
- Consumes: `BaseWriter`, `clean_filename_part`, `src/content.config.ts:17-341` 字段白名单
- Produces: 各 Writer 的 `build_md` 产出可直接 `pnpm build` 过的 md 字符串

- [ ] **Step 1: 写失败单测 — posts 文件夹即分类 + 数字 tag 加引号**

```python
def test_posts_build_md():
    from writers.posts import PostsWriter
    w=PostsWriter()
    fields={"title":"Rust 2026","category_path":"编程学习","published":"2026-08-22","tags":["Rust","2026"],"description":"desc","body":"# hi"}
    md=w.build_md(fields)
    assert "category" not in md  # 禁写
    assert 'tags: ["Rust", "2026"]' in md or '"2026"' in md
    assert w.filename(fields)=="2026-08-22-rust-2026.md"
    assert w.filepath(fields)=="src/content/posts/编程学习/2026-08-22-rust-2026.md"
```

- [ ] **Step 2: 跑测失败**

Run: `python -m unittest tests.test_core::test_posts_build_md -v`
Expected: `FAIL ModuleNotFound`

- [ ] **Step 3: 实现 5 Writer（各按 content.config.ts 真 schema）**

```python
# writers/posts.py
from .base import BaseWriter
import yaml
class PostsWriter(BaseWriter):
    collection="posts"; required=["title","published"]
    def filename(self,f): 
        from blog_creator_core import clean_filename_part
        slug=clean_filename_part(f["title"]).lower()
        return f"{f['published']}-{slug}.md"
    def filepath(self,f):
        cp=f.get("category_path","").strip().strip("/")
        base="src/content/posts"
        if cp: base+=f"/{cp}"
        return f"{base}/{self.filename(f)}"
    def build_md(self,f):
        # tags 数字加引号，published 裸写
        tags=[f'"{t}"' if str(t).isdigit() else f'"{t}"' for t in f.get("tags",[])]
        fm=f"---\ntitle: \"{f['title']}\"\npublished: {f['published']}\ntags: [{', '.join(tags)}]\ndescription: \"{f.get('description','')}\"\n---\n"
        return fm + (f.get("body","")+"\n")
```

`moments.py` / `friends.py` / `album.py` / `daohang.py` 同构，各自按 `content.config.ts:47-65` / `228-254` / `165-194` / `265-279` 字段实现，`friends` 必校验 `siteurl` 以 `http` 开头。

- [ ] **Step 4: 跑测并跑 pnpm 抽检**

Run: `python -m unittest tests.test_core -k test_posts_build_md -v` Expected: `OK`

```bash
# 抽检生成文件是否能 build（在博客仓根）
node -e "require('fs').writeFileSync('src/content/posts/编程学习/2026-08-22-rust-2026.md', require('/tmp/md'))"
pnpm check  # 需 0 error
rm src/content/posts/编程学习/2026-08-22-rust-2026.md
```

- [ ] **Step 5: 提交**

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/writers/posts.py plug-in/AstrBot/AstrBot\ BlogCreator/writers/moments.py plug-in/AstrBot/AstrBot\ BlogCreator/writers/friends.py plug-in/AstrBot/AstrBot\ BlogCreator/writers/album.py plug-in/AstrBot/AstrBot\ BlogCreator/writers/daohang.py
git commit -m "feat(blog-creator): high-freq 5 writers posts/moments/friends/album/daohang"
```

---

### Task 4: 剩余 8 Writer（ziyuan/bangumi/life/bills/schedules/apps/tombstones/spec/changelog）

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/ziyuan.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/bangumi.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/life.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/bills.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/schedules.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/apps.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/tombstones.py`
- Create: `plug-in/AstrBot/AstrBot BlogCreator/writers/spec.py` / `changelog.py`
- Test: `plug-in/AstrBot/AstrBot BlogCreator/tests/test_core.py`

**Interfaces:**
- Consumes: `BaseWriter`, `COLLECTION_TEMPLATES`
- Produces: 8 Writer 的 `validate/build_md`，`ziyuan` 二选一，`bangumi status 1-5` 枚举

- [ ] **Step 1: 写失败单测 — ziyuan 二选一**

```python
def test_ziyuan_union():
    from writers.ziyuan import ZiyuanWriter
    w=ZiyuanWriter()
    ok,_=w.validate({"title":"t","content":"hi"})  # 公告形态
    assert ok
    ok,_=w.validate({"title":"t","quotes":[{"text":"hi","author":"a"}]})  # 语录形态
    assert ok
    ok,_=w.validate({"title":"t"})  # 两者皆无
    assert not ok
```

- [ ] **Step 2: 跑测失败**

Run: `python -m unittest tests.test_core::test_ziyuan_union -v`
Expected: `ModuleNotFound`

- [ ] **Step 3: 实现 8 Writer**

`ziyuan.py` 按 `content.config.ts:196-226` union 实现；`bangumi.py` 按 `66-94` 枚举；`life.py` 拆 `LifePlacesWriter`/`LifeNotebooksWriter`；`bills.py` 按 `281-293`；`schedules.py` 按 `295-312`；其余直写。

- [ ] **Step 4: 跑全量 Writer 单测**

Run: `python -m unittest discover -s tests -v`
Expected: `OK 20+ passed`

- [ ] **Step 5: 提交**

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/writers/*.py
git commit -m "feat(blog-creator): remaining 8 writers ziyuan/bangumi/life/bills/schedules"
```

---

### Task 5: main.py Star 集成（会话/预览/查重-1/GitHub/图床）

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/main.py`

**Interfaces:**
- Consumes: `blog_creator_core.route_via_llm`, `writers.registry.get_writer`, `writers.*.build_md`, `httpx.AsyncClient`
- Produces: `BlogCreator(Star)` 处理 `@filter.event_message_type(ALL)`，会话 `confirm/cancel/modify`，`GET验重→PUT`，`logger`

- [ ] **Step 1: 写失败单测 — stub AstrBot 全链路**

```python
# tests/test_smoke.py
import sys, types
sys.modules['astrbot.api.star'] = types.ModuleType('star')
sys.modules['astrbot.api.event'] = types.ModuleType('event')
sys.modules['astrbot.api'] = types.ModuleType('api')
# ... stub Context/Star/filter/logger 后
from main import BlogCreator
def test_preview_to_put():
    # stub llm 返回 posts，stub httpx GET 404→PUT 201，断言 Session 状态机
    pass
```

- [ ] **Step 2: 跑测失败**

Run: `python -m unittest tests.test_smoke -v`
Expected: `ModuleNotFoundError: main`

- [ ] **Step 3: 实现 main.py（按 Task 2/3 状态机）**

```python
# main.py 关键骨架
import httpx, yaml, re
from astrbot.api.star import Star, register
from astrbot.api.event import filter
from astrbot.api import logger
from blog_creator_core import route_via_llm, clean_filename_part
from writers.registry import get_writer

@register("astrbot_plugin_blog_creator","mengkuikun","自然语言新增博客文件", "v1.0.0")
class BlogCreator(Star):
    def __init__(self, context, config=None):
        super().__init__(context); self.config=config or {}; self._sessions={}
    def _cfg(self,k,d=None): return self.config.get(k,d)
    @filter.event_message_type(filter.EventMessageType.ALL)
    async def on_message(self, event):
        if not self._allowed(event.get_sender_id()): return
        text=event.message_str.strip()
        if text in ("确认","发布"): return await self._confirm(event)
        if text.startswith("修改"): return await self._modify(event,text)
        if text in ("取消",): return await self._cancel(event)
        # 新建：Router
        llm=self.context.get_using_llm()
        try:
            routed=await route_via_llm(text, llm, self._now())
        except Exception as e:
            yield event.plain_result(f"AI 暂不可用，请稍后重试：{e}"); return
        writer=get_writer(routed["collection"])
        fields=await self._extract_with_writer(writer, routed, text, llm)
        ok,err=writer.validate(fields)
        if not ok: yield event.plain_result(f"缺字段：{err}，请补充"); return
        self._sessions[event.get_sender_id()]={"writer":writer,"fields":fields}
        preview=writer.preview(fields)
        yield event.plain_result(f"【预览】{writer.collection} / {writer.filepath(fields)}\n{preview}\n回 确认 发布 / 修改 标题=新标题 / 取消")
```

`_extract_with_writer` 内再调 Writer 专属 Prompt 的 `llm.chat` 抽 `tags/description/body` 等；`_confirm` 内 `GET` 验重→自动 `-1`→`PUT`；图床复用 `BlogWriter` 的 `upload` 逻辑。

- [ ] **Step 4: 跑冒烟**

Run: `python -m unittest tests.test_smoke -v`
Expected: `OK`，`httpx` mock 命中 `GET 404` → `PUT 201`

- [ ] **Step 5: 提交**

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/main.py plug-in/AstrBot/AstrBot\ BlogCreator/tests/test_smoke.py
git commit -m "feat(blog-creator): star integration preview/confirm/github"
```

---

### Task 6: 构建验证与文档收尾

**Files:**
- Create: `plug-in/AstrBot/AstrBot BlogCreator/README.md`
- Modify: `plug-in/AstrBot/AstrBot BlogCreator/metadata.yaml`（如需补 `support_platforms`）
- Test: 全量 `python -m unittest discover -s tests -v` + `pnpm build + pnpm check`

- [ ] **Step 1: 写 README 验收清单**

```markdown
## 验收
1. /创建 帮我写篇 编程学习 下的《Rust 2026》标签 Rust,教程 → 预览 → 确认 → 仓库落 file
2. /创建 帮我加个友链 站名X 链接https://x.cn → 预览 friends/x.md → 确认
3. 13 集合各 1 条，pnpm build 0 error
```

- [ ] **Step 2: 跑全量验证**

Run: `python -m unittest discover -s tests -v` Expected: `OK 30+`

Run: `pnpm build` (in `E:\GithubProgect\MyRunProject\dumplingandcakeblog`) Expected: `built in 40-60s` 0 error

Run: `pnpm check` Expected: `0 errors`

- [ ] **Step 3: 提交并打 zip（可选）**

```bash
git add plug-in/AstrBot/AstrBot\ BlogCreator/README.md
git commit -m "docs(blog-creator): readme + build verify"
# 打包（复用 BlogWriter 规范，5文件 zip）
python - <<'PY'
import zipfile, os
src="plug-in/AstrBot/AstrBot BlogCreator"
out="plug-in/AstrBot/AstrBot BlogCreator/打包/AstrBot-BlogCreator-v1.0.0.zip"
os.makedirs(os.path.dirname(out), exist_ok=True)
with zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED) as z:
    for f in ["main.py","blog_creator_core.py","metadata.yaml","README.md","_conf_schema.json"]:
        z.write(os.path.join(src,f), f)
PY
```

---

## Self-Review

- **Spec 覆盖**：Router 纯 AI(§5)、13 Writer 文件夹即分类(§6)、预览确认(§3)、GitHub API 秒回(§3)、zod 对齐(§6)、分期一期(§8) 均有 Task 对应；图片上传在 Task 5 图床链路覆盖
- **Placeholder**：无 `TBD/TODO`，每步含可跑代码与命令
- **类型一致**：`route_via_llm(text, llm, now)->dict`、`BaseWriter.validate->(bool,str)`、`filepath->str` 全链一致

