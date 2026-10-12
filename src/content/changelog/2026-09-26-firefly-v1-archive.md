---
version: "v1.40.0"
date: 2026-09-26
time: "23:59"
type: feature
description: 团子原版历史更新图谱
---

> 📜 **写在前面（致敬开源与接力传承）**  
> 本站自 **2026 年 9 月 27 日**（提交 `352107a94`）起由站长「夢酷」正式接手，并开启了全面个性化改造与深度独立演进之旅。  
> 本站直接 Fork 自 **团子 (tianshihao2003)** 的 [团子和蛋糕的博客](https://blog.tsh520.cn/)（团子在此前基于 CuteLeaf 开源的 Firefly 主题深度二改）。在此由衷感谢团子打下的坚实博客基石与中间接力！  
> 🌐 **团子个人博客**：[团子和蛋糕的博客 (blog.tsh520.cn)](https://blog.tsh520.cn/)  
> 🔗 **团子源码仓库**：[tianshihao2003/dumplingandcakeblog (GitHub)](https://github.com/tianshihao2003/dumplingandcakeblog)  
> 📦 **完整归档备份**：团子早期 83 份独立日志文件已完整保留在博客仓库 `src/content/upstream-changelog/`（亦可在 `/changelog/upstream/` 全景图谱中浏览）。

---

## 历史版本更新历程全览

### 📅 2026 年 09 月 (26 项)

- **09-19** [v1.27.0] **笔记本归档改版为动态式卡片流，支持多图与折叠收起**
  - 日历下方时间线替换为卡片流 b-archive-feed，支持三行折叠收起与图片网格灯箱展示。
  - 评论隔离使用 NOTEBOOK_CHANNEL/life/notebooks/，与归档页和首页毛玻璃聊天室联动。
- **09-22** `[v1.41.1]` **修复 mysql 代码块的高亮警告，把 mysql 语言映射到 SQL 语法**
  - 构建时 `astro-expressive-code` 会为 ` ```mysql ` 代码块刷一屏 `language could not be found` 警告，并把代码块降级成纯文本。原因是 **Shiki 根本没有 `mysql` 语法**——它的 722 个语言里只有 `sql`。
  - 处理方式是在 `astro.config.mjs` 的 `expressiveCode` 里加语言别名：`shiki: { langAlias: { mysql: "sql" } }`。这样笔记里的 ` ```mysql ` 标记**不用改**（写 MySQL 比写 SQL 更贴合内容），构建时按 SQL 语法高亮，警告消失。
  - 涉及 4 个历史笔记（`src/content/posts/已弃用/MySQL *.md`）共 32 处 ` ```mysql `，内容未改动。
- **09-22** `[v1.40.5]` **修正侧栏加宽的作用范围，分类页不再跟着文章列表页一起变宽**
  - 上一版给文章列表页加宽侧栏时，选择器写的是 `#main-grid:has(.article-list-page)`；但**分类页的 section 同样带 `.article-list-page`**，于是分类页的侧栏也被一起加宽了，与站长只要求列表页的意图不符。
  - 改为用列表页独有的修饰类限定：`#main-grid:has(.article-list-page--compact)`。现在**只有文章列表页**的侧栏是 320px，分类页恢复默认 280px。
  - 实测：列表页 `320px / 内容 561px`，分类页 `280px / 内容 641px`；归档页、文章详情页、导航页均保持 280px 不受影响。构建与 `pnpm check` 均通过。
- **09-22** `[v1.41.0]` **分页器新增页码输入跳转，点击中间页码可直接输入并回车跳转**
  - 分页器中间的页码从纯文字改为**可输入**：点击「1」即可输入页码，回车跳转。适合直接跳到最后一页这类操作，不必反复点下一页。
  - 交互细节：聚焦自动全选（直接键入即替换）、只接受数字、超出范围自动夹到 1~总页数、**留空回车跳到最后一页**、`Escape` 放弃编辑、失焦自动恢复当前页显示。
  - 输入框**刻意做成可编辑的样子**（主题色描边 + 浅色底 + 聚焦光晕），否则跟普通文字没区别、看不出能点——这一点第一版没做好，返工过一次。
- **09-21** `[v1.39.5]` **归档页类型筛选栏的粗边框改为细边**
  - 归档页顶部「全部 / 文章 / 动态 / 记录 / 生活」筛选栏（`.ap-tabs`）的外框由 `2px` 纯黑/纯白实线改为 `1px` 细边（`oklch(0.25 0 0)` / 深色下 `oklch(0.85 0 0)`），与导航页筛选栏改成同一规格。
  - 样式在 `src/styles/components/archive-panel.css`（归档面板专用，放在全局 CSS 是为了不受 Svelte scoped 影响）。
- **09-21** `[v1.40.0]` **导航站分类改用文件夹管理，去掉 md 里的 category 字段**
  - 网站导航（`daohang`）不再需要手写 `category` 字段，改成**建文件夹就是分类**：`src/content/daohang/<分类名>/xxx.md`，分类名就是文件夹名，与 `posts` 的做法一致。
  - 51 个导航文件按其原有分类拆分进 13 个文件夹，文件名里的数字前缀（`01-`、`30-` 等）一并去掉——顺序已由 `order` 字段和分类内排序保证，文件名不必再承担编号作用。
  - 分类的**显示名、排序、图标**集中在 `src/pages/projects.astro` 的 `CATEGORY_META` 里维护。因为 Astro 生成内容 id 时会把大写转小写、空格转连字符（文件夹 `AI 工具` 读出来是 `ai-工具`），查表做了大小写/空格归一化；新增分类只要建好文件夹并在表里补一行即可，未登记的分类会自动显示、排在最后。
- **09-21** `[v1.40.3]` **导航条目精简为四个字段，分类内改按名称排序**
  - `src/content/daohang/` 下的条目现在只有 `name`、`url`、`icon`、`description` 四个字段，`tags` / `color` / `featured` / `order` / `image` 全部删除（共清理 45 个文件）。
  - 这几个字段此前就没有任何代码读取（分类由文件夹决定、卡片配色按分类名自动生成），留着只会让人误以为能生效。**新增导航条目不要再写它们。**
  - 失去 `order` 后，分类内的排序改为**按名称拼音升序**（`name.localeCompare(..., "zh-CN")`）。
- **09-21** `[v1.39.0]` **文章列表卡片改为两行固定布局（分类单独一行、日期字数另起一行），并新增每篇文章浏览量显示**
  - 文章列表页与分类页的卡片（网格视图与列表视图），元数据改为**固定两行**：第一行是分类（保留原有分类色）与浏览量，第二行是发布日期与字数（列表视图另有标签）。此前这些信息挤在一行里自动折行，分类名一长就多占一行，同一屏里卡片高度参差不齐；现在每张卡片结构一致，高度对齐。
  - 摘要统一收成 **2 行**（网格卡片、以及列表卡片在移动端的显示），卡片更紧凑，同屏能看到更多篇。
  - 列表视图的浏览量紧随分类之后显示，网格视图仍放在该行最右侧。
- **09-21** `[v1.39.6]` **说说页卡片外框的粗线改为细边**
  - `/moments/`（说说）与 `/moments/pinned/`（置顶说说）的卡片外框由 `2px` 纯黑实线改为 `1px` 细边（`oklch(0.25 0 0)` / 深色下 `oklch(0.85 0 0)`），与导航页、归档页统一。
  - 同一份卡片样式存在**三处定义**，本次全部同步：`src/components/moments/MomentCard.astro`（组件内 scoped 样式，实际渲染生效的是这份）、`src/styles/features/moments.css` 的 `#moments-feed .moment-card` 与 `#pinned-feed .moment-card`（供 JS 动态插入的卡片使用）。只改其中一处会出现"静态卡片细了、动态插入的还是粗的"。
- **09-21** `[v1.38.1]` **修复 order 排序字段不生效的问题，同日同目录的文章现已按编号连续排列、跨天不跳号**
  - 此前 `order` 只在发布日期**时间戳完全相同**时作为次级排序键，一旦日期有差异就完全忽略；分类页与左侧「全部文章」目录更是完全没读 `order`（分类页同一天的文章退化成按文件名排序，左侧目录则被日期字符串重排覆盖）。表现是：同一天发布的一整个笔记系列顺序不受 `order` 控制，跨天分组处还会跳号（如 51 后面接 42、42 后面接 27）。
  - 排序规则统一为：**置顶 → 发布日期降序 → 同日期内按目录（文件夹路径）分组 → 组内 `order` 降序**。`order` 与日期同向（数字越大越靠前），因此跨日期分组的系列序号能连续递减（68→51 接 50→42 接 41→27），不再断层。规则集中在 `src/utils/content-utils.ts`（`comparePostsByOrderAndDate` / `compareInSameDate`），文章列表页、分类页、左侧全站文章目录共用同一实现，不再各自维护一套排序。
  - `order` 现在**留空表示排在该目录最后**（此前 Zod 默认值 `0` 会让未写 `order` 的文章插到有编号的文章前面，看起来像排序失效）。`src/content.config.ts` 已移除该默认值，PagesCMS 字段描述同步更新。
- **09-21** `[v1.40.0]` **新增 pnpm cli cover，用 AI 批量给文章生成黑板粉笔手绘风专属封面**
  - 提示词模板改自 [tblog.mmzhiku.xyz 的公开提示词合集](https://tblog.mmzhiku.xyz/posts/ai-prompt-collection/)，风格集中在脚本顶部常量，换风格/换吉祥物改 `MASCOT` 即可。
  - 负向提示词里**故意去掉了「文字」**——原模板带这一项，会压制封面上的大标题。
  - 支持三种 provider：`dashscope`（千问 qwen-image，国内直连，默认）、`gemini`（Nano Banana，需 `GEMINI_API_KEY` + 代理）、`mock`（不联网，出纯色占位图，用来验证流水线）。
- **09-21** `[v1.39.7]` **导航页卡片高度统一固定为两行描述文案的高度**
  - 卡片高度此前随描述文案长短浮动（实测 135 / 156 / 176px 三档），现在**统一固定为两行描述的高度（156px）**：描述区改为 `-webkit-line-clamp: 2` 且 `min-height` / `max-height` 都锁在 `3.2em`——短描述留白、长描述截断，同排卡片始终等高。
  - 改动在 `src/pages/projects.astro` 的 `.tools-card-desc`。
- **09-21** `[v1.39.4]` **网站导航页移除迷你模式与切换按钮，页面线条统一改细**
  - **移除迷你模式**：右上角的切换按钮、配套的脚本（事件委托 + `localStorage` 记忆 + `astro:page-load` 初始化）以及全部 `.tools-mini-mode` / `.mini-mode-btn` 样式（含一套响应式断点）整体删除，卡片只保留一种样式。页面标题恢复常规左对齐布局。
  - **线条统一改细**：分类标题行那条 `h-[2px]` 的黑色分隔线改为 `1px` 且降为浅灰（`bg-neutral-300 / dark:bg-neutral-700`）；分类 Tab 胶囊的外框由 `2px` 黑色实线改为 `1px` 细边。
  - 卡片上的悬浮跳转图标与其样式一并移除，卡片内容仅保留「图标 + 标题 / 描述 / 域名」。
- **09-21** `[v1.40.2]` **导航页卡片比例微调：边框收细、图标与字号略放大**
- **09-21** `[v1.40.1]` **导航页卡片调整比例：边框加粗、字号与图标缩小**
  - 卡片边框：`1px` 细边 → **`2px`**（深色主题下白色，悬停变主题色）。
  - 卡片标题：`text-lg`(18px) → **`text-sm`(14px)**。
  - 描述文字：`0.8125rem`(13px) → **`0.75rem`(12px)**，底部间距略收。
- **09-21** `[v1.40.4]` **删除 GitHub Pages 遗留的部署工作流与 CNAME，不再随 push 触发无效构建**
  - 删除 `.github/workflows/pages.yml` 与 `public/CNAME`。这两项是 2026-09-04 从 GitHub Pages 迁移到 EdgeOne Pages 时**漏删**的遗留物：`pages.yml` 的触发条件是 `push: branches: [main]`，所以此后每次 push 都会额外跑一遍完整的 build + deploy，部署到没绑自定义域名的 `mengkuikun.github.io/dumplingandcakeblog/`——一个没人访问的站点，纯消耗 Actions 时长。
  - 生产链路不受影响：站点一直由 EdgeOne Pages 托管 `your-domain.example.com`。GitHub Pages 上已有的部署内容保留，只是不再自动更新。
  - 同步更新文档：`CLAUDE.md`、`AGENTS.md` 里"仍留在仓库"的描述改为已删除；`docs/deploy-edgeone-pages.md` 的迁移记录补注了这次补删。
- **09-21** `[v1.39.1]` **左侧「全部文章」目录去掉日期、文章列表页侧栏加宽，标题不再被截断**
  - 「全部文章」目录的每一行**去掉发布日期**（日期在文章卡片上已有），把空间让给标题。标题可用宽度从 **71px 提升到 178px**，实测文章标题已全部完整显示、不再截断。
  - 文章列表页与分类页的侧栏**加宽到 320px**（默认 280px）。这是**页面级覆盖**，写在 `src/styles/pages/article-list.css` 的 `#main-grid:has(.article-list-page)` 规则里——侧栏宽度的全局定义在 `responsive-utils.ts` / `grid-layout-utils.ts` / `swup-lifecycle-controller.ts` / `guestbook.astro`（`17.5rem` + `max-w-70`），**不要改那几个全局值**，否则全站每一页的侧栏都会变宽、中间内容被挤窄（本次改动第一版就是这样，已回滚）。
- **09-21** `[v1.39.2]` **侧栏小组件去掉常驻阴影，改为悬停时才浮现**
  - 天气、抖音热搜、个人资料卡与所有走 `WidgetLayout` 的小组件，此前常驻一圈 `0 0 12px 2px` 的阴影；现在**静态不显示阴影**，只在鼠标悬停时浮起（hover 阴影保留）。
  - 改动位置：`src/components/common/WidgetLayout.astro`（覆盖大多数小组件）、`src/components/widget/Profile.astro`、`src/styles/components/weather.css`、`src/styles/components/douyin-hot.css`、`src/styles/features/widget-responsive.css` 的 `.profile-widget-card`。这几处是同一个视觉语言，改一处就要同步其余，否则侧栏会出现有的有阴影、有的没有。
- **09-16** `[v1.38.0]` **移除页面加密功能，账单、笔记本、日历页恢复明文直出并重新收录**
  - 账单 `/bills/`、笔记本 `/life/notebooks/`（列表与详情）、日历 `/schedules/` 不再弹出密码门，内容直接展示，无需再输入访问密码；此前"记住过密码"的浏览器无需任何操作。
  - 三个页面重新进入 `sitemap.xml`，并补上 `data-pagefind-body` 标记后进了站内搜索索引（本站 pagefind 只索引带该标记的页面，此前这三个页面本来也没被搜到）；笔记本也重新出现在归档时间线、侧栏"最近更新"与"笔记本数"统计中，与其他页面表现一致。
  - 同步移除加密相关代码与配置：`src/components/security/`（EncryptGate.astro / PasswordGate.svelte）、`src/utils/encrypt-gate.ts`、`src/config/securityConfig.ts`、`src/styles/pages/encrypt-gate.css`，以及构建环境变量 `GATE_PASSWORD`（含 CI / `.env.example` / 部署文档中的对应项）。
- **09-15** `[v1.37.0]` **文章页新增「朗读」功能，支持倍速与音色切换，可用系统语音兜底**
  - 文章页 meta 行新增耳机图标「朗读」按钮，点击即可把文章读给你听
  - 悬浮播放条支持播放/暂停、进度、**倍速（0.8x~2x）**、音色切换（晓晓/云希/云扬等 7 种），选择会被记住
  - 服务端自建 edge-tts 服务（`scripts/TTS服务/`，部署教程 `docs/deploy-edge-tts.md`），流式合成 1~2 秒出声，缓存后重听秒开
- **09-15** `[v1.37.1]` **「全部文章」与「目录」小组件去卡片化，并修复二级分类目录不自动展开**
  - 左侧「全部文章」与右侧「目录」去掉卡片底色、圆角、细边框和阴影（含 hover 阴影），与页面背景融为一体，浅色/深色模式均适配
  - 组件外壳新增 `flat` 开关，其他侧栏小组件不受影响
  - 修复阅读二级分类文章时，「全部文章」目录不自动展开到当前文章的问题（展开顺序改为从最外层到最内层，避免内层被外层重新收起）
- **09-05** `[v1.36.0]` **账单页新增月度流水卡（按日分组+月份筛选+分页）与账单日历（农历+每日收支）；修复加密页脚本不执行导致筛选/分页失效**
  - **「今日流水」升级为「月度流水」**：按日期分组展示整月流水——每天一个分组头（如「9月4日(周五)」+ 当日「支/收」小计），逐笔显示 emoji 图标、分类·备注、时刻与金额（`src/components/bills/MonthlyFlowCard.astro`）。
  - **月份筛选**：卡片右上角下拉框切换年月（有账单的月份 + 当前月），标题同步变化（选历史月显示「2026年8月流水」），切月后分页自动回到第 1 页。
  - **按天分页**：每页 2 天，底部 ‹ 页码 › 翻页，长月份不再拉长页面。
- **09-05** `[v1.35.0]` **账单支持时刻与自定义分类：QQ 记账自动提取时间、分类不再限白名单，页面今日流水显示时间并移到结余卡下方，结余卡改年统计**
  - **账单增加「时刻」**：`src/content.config.ts` 的 bills schema 新增 `time` 字段（`HH:mm`，可空），PagesCMS 后台同步。今天（2026-09-05）起新记的账单都带时刻；历史账单无该字段不受影响。
  - **今日流水显示时间**：账单页「今日流水」每一条明细现在在分类前显示 `HH:mm` 时刻，同一分钟内多条按时间倒序排列（`src/pages/bills.astro`）。
  - **今日流水位置上移**：从页面底部移到顶部背景图卡片行之下、两个统计图表（本月每日收支/本年流水）之上，并恢复横跨左右两列的全宽样式，当天记了什么一眼可见；移动端同样排在背景图卡之后。
- **09-04** `[v1.34.0]` **账单页去掉负债功能，只保留支出与收入两种类型（对齐妙蛙记账的纯收支模型）**
  - **类型只剩支出/收入**：`src/content.config.ts` 的 bills schema 枚举从 4 种收紧为 `income | expense`，PagesCMS 后台（`.pages.yml`）的类型下拉同步只留「支出/收入」。
  - **顶部「净资产」卡改为「累计结余」卡**：主数字 = 累计收入 − 累计支出，副行改为「总收入 | 总支出」，奶牛壁纸视觉不变；组件由 `NetAssetCard.astro` 重命名为 `BalanceCard.astro`（`src/components/bills/BalanceCard.astro`）。
  - **统计逻辑简化**：`src/utils/bill-adapter.ts` 删除负债关键词匹配（花呗/白条/信用卡账户的消费不再被排除出统计，正常计入支出），`calcBillStats` 只返回收入/支出/结余；顺带删除未被引用的 `monthlyTrend`、`memberMonthlyStats` 与 5 个无引用旧组件（BillStats/BillList/BillCategoryDonut/BillTrendLine/PeriodSummaryCard）。
- **09-04** `[v1.32.1]` **修复友链页"新朋友"排序错乱：mtime 兜底在 CI 失效导致旧友链霸占新朋友区**
  - **新朋友排序错乱（主因）**：页面原来在友链缺 `added` 日期时退回按"文件修改时间"排序，但服务器每次构建都是全新拉取代码，所有文件的修改时间都等于构建时刻——几条 8 月中旬的旧友链（临渊羡鱼、闪程-猫条的笔记）因此永远霸占"新朋友"区块，真正的新朋友反而排不进去。现已移除 mtime 兜底，只按 `added` 排序；缺 `added` 的友链不参与该区块并在构建日志中提示（`src/pages/friends.astro:27`）。同时补齐了 3 条旧友链缺失的 `added`。
  - **重复展示**：当"新朋友"里出现"我的朋友们"分组的站点时，会同时出现在两个区块。现已和"更多伙伴"一样按新区块去重（`src/pages/friends.astro:47`）。
  - **站点截图丢失**：Astro 会把文件名转成"小写 + 去标点"的 id，`39-胡超，作品集` 的截图因全角逗号永远匹配不上，卡片一直退化为无截图。已把截图重命名对齐（`39-胡超作品集.webp`），并把截图脚本的 id 生成规则改为与 Astro 完全一致（github-slugger），今后新友链不会再错位（`scripts/友链截图/index.mjs`）。
- **09-04** `[v1.33.0]` **移除全站自定义鼠标样式，恢复系统原生光标**
  - 全站光标不再替换为自定义图片（Simplify Handy Dark 主题），恢复系统原生光标——鼠标在链接、文本框、按钮等元素上的形态由系统统一管理，观感与系统一致。
  - 同步移除了 `public/assets/cursors/` 下的 47 个光标图片资源（约 3.1MB），博客体积更轻、首屏样式表更精简。
  - 相关样式文件 `src/styles/base/cursor.css` 与 `src/styles/main.css` 的导入已一并移除；各元素的指针形态由组件自身的 `cursor: pointer` 等原生规则接管，交互行为不受影响。

### 📅 2026 年 08 月 (15 项)

- **08-30** `[v1.31.0]` **导航"资金"更名"账单"，账单页新增今日支出统计区块**
  - 导航栏入口更名：桌面端"我的"下拉与移动端菜单抽屉中的"资金"统一改为**"账单"**，与页面标题一致（`navBarConfig.ts` / `MobileMenuSheet.astro`）。
  - 账单页底部新增**今日支出**区块：显示当日支出、收入、记账笔数与日期，数据由构建时的 `getTodayMonthYearStats()` 现成计算（today 档），位于加密区内不泄露；配色沿用全站惯例（收入红 / 支出青），适配暗色模式与移动端。
- **08-30** `[v1.30.0]` **资金/账单与笔记本页面接入构建时加密：毛玻璃密码门，未解锁时源码只有密文**
  - `/bills/`（资金/账单）、`/life/notebooks/`（笔记本列表 + 全部笔记本详情页）与 `/schedules/`（日程日历）的内容在**构建时**用 PBKDF2(250k 迭代) + AES-256-GCM 加密成密文内联进页面，HTML 源码/抓包/开发者工具中**没有任何明文**，输入访问密码后浏览器解密渲染。
  - 未解锁时显示**全页毛玻璃门**：模糊的骨架剪影 + 中央锁卡片（图标/标题/密码框/解锁按钮），解锁瞬间"散焦 → 清晰"过渡动画（尊重 `prefers-reduced-motion`）。
  - **统一密码**：`GATE_PASSWORD` 构建环境变量（本地 `.env` + GitHub Secrets `GATE_PASSWORD`，绝不进客户端）；AES-GCM auth tag 天然校验密码，客户端不存任何密码信息。**密码丢失无法恢复，务必保管好**。
- **08-30** `[v1.32.0]` **关于页面移除底部更新日志区块，统一走独立的更新日志页面**
  - 关于页（/about/）底部不再展示更新日志图谱，更新日志统一在独立页面 **/changelog/** 查看（导航"记录 → Changelog"）。
  - 更新日志图谱组件（ChangelogGraph）本身保留，仍服务于 /changelog/ 页；仅移除了关于页的嵌入与对应的无用样式规则（`.about-page__changelog`）。
- **08-30** `[v1.30.1]` **修复摘要脚本中 DashScope 密钥的公开暴露，密钥管理规范升级**
  - `scripts/生成摘要/index.ts` 曾硬编码 DashScope（千问）API Key 并存在于公开仓库历史，GitGuardian 检测到后已处置：密钥从代码移除，改为从 `.env` 的 `DASHSCOPE_API_KEY` 读取，缺失时脚本明确报错；`pnpm cli desc` 调用补 `--env-file=.env`。
  - **站长需在阿里云百炼控制台吊销旧 Key 并重建**（已提醒）；新 Key 填入本地 `.env` 即可，仓库侧已无任何密钥。
  - 工程规范同步：CLAUDE.md §15 新增反模式（禁止密钥硬编码进被跟踪文件、.gitignore 保护必须实测）、§22 收尾清单新增提交前涉密检查步骤，防止同类问题再次发生。
- **08-30** `[v1.31.3]` **修复侧栏站点统计：最后活动计入全部内容、记录次数与总字数口径补全**
  - **最后活动**：原来只统计博客文章的最近发布日期（发动态/记账/写笔记都不算），导致长期显示"7 天前"。现改为取**全部内容**（文章/动态/书影音记录/足迹/笔记/账单）的最新日期，今天有记录就显示"今天"。
  - **总字数**：原来只统计文章正文字数，现加入**动态、笔记本、足迹记录**的正文（同一套中英文计数算法），站点总字数更真实（+约 1.2 万字）。
  - **记录次数**：补上书影音记录遗漏的"现实（real）"类别。
- **08-30** `[v1.31.1]` **今日支出区块下方新增当天每一条账单的明细列表**
  - 账单页"今日支出"区块在统计格下方新增**当天明细列表**：每行显示分类标签、描述与金额，包含当天全部类型（支出青色 `-`、收入红色 `+`、负债/转账灰色中性显示），与上方统计互补——统计只计收支，明细展示每一条（含负债笔）。
  - 当天没有记录时显示"今天还没有记账"空状态。
  - 数据仍在构建时于加密区内计算渲染，线上源码只有密文。
- **08-30** `[v1.31.2]` **今日流水区块样式优化：标题更名、明细布局与配色调整**
  - 区块标题"今日支出"更名为**"今日流水"**——明细包含支出、收入、负债，原名不能涵盖。
  - 明细行布局调整：分类标签从行首移到**金额前面，用斜杠分隔**（如 `餐饮 / -2.83`），描述居左一眼可读。
  - 配色规则统一：**带加号的数字（收入、负债）都用红色**，支出保持青色，转账灰色。
- **08-26** `[v1.28.0]` **复刻关于页 Q&A 与变更链路图谱，更新日志页改为全量蛇形网格**
  - **关于页重做**：`src/pages/about.astro:1` 引入 `PageTitle` + `SiteStructuredData` + `ChangelogGraph`，正文由 `src/content/spec/about.md` 改为 `src/content/spec/about.mdx:1` 的 Q&A 结构（Q1 技术栈 / Q2 社交圈 / Q3 开源），内容替换为夢酷，GitHub 卡片指向 `mengkuikun/dumplingandcakeblog`
  - **关于组件接入**：新增 `src/components/about/AboutChatBubble.astro:1`、`src/components/about/AboutProfileCard.astro:1`、`src/components/about/AboutSocialLinks.astro:1`、`src/components/about/AboutTechStack.astro:1`、`src/components/about/AboutTimeline.astro:1`、`src/components/about/ChangelogGraph.astro:1`，并在 `src/styles/main.css:76` 引入 6 份 `src/styles/components/about-*.css`
  - **更新日志图谱化**：`src/pages/changelog.astro:1` 由旧时间轴替换为 `ChangelogGraph` 全量蛇形网格（`limit={0}` 展示全部，约 49 条），`src/utils/changelog.ts:77` 新增 `buildChangelogLinks` 每卡上限 6 条关联，连线改为稀疏贝塞尔悬停揭示
- **08-26** `[v1.29.0]` **文章列表带图模式一模一样复刻参考博客，含像素块揭幕与置顶轮播对齐**
  - **带图网格一模一样**：`src/components/pages/ArticleVirtualList.svelte:380` 将原 `a.article-grid-card` 的 `16/9 + 340宽 + 红框` 重写为参考博客的 `article.article-list-card[data-article-list-card][--article-category-hue]` + `cover-wrap image-pixel-reveal-host[data-article-list-cover-wrap]`（含 `cover-loader(4点) + image-pixel-reveal + source[data-article-list-cover/fallback/apiUrls]`）+ `content(title-row/title::before/views/meta分隔线/rule+3行摘要)` + `surface-link`，分类色相由 `FNV-1a %360` 定基写入 `--article-category-hue` 供竖线着色；上游 `src/pages/posts/[...page].astro:97` 与 `src/pages/categories/[...category].astro:222` 补 `categoryHue/wordCount/apiUrls/fallbackImageUrl`
  - **像素块一块一块的加载**：新增 `src/styles/components/image-pixel-reveal.css:1` + `src/utils/image-pixel-reveal.ts:1` + `src/utils/article-cover-lifecycle.ts:1`（原 `OtherRunProject/my-blog` 三件套，`48px` 目标块、`84/36` 上限、`300ms` 块时长、`680ms` 散布、`750ms` 兜底、`is-loading→is-revealing→is-revealed/is-error`，`8000ms` 源超时、`1500ms` 解码超时、`apiUrls[]` 逐源重试），在 `src/components/pages/ArticleVirtualList.svelte:171` 以 `IntersectionObserver 200px` + `setVisible` 与可见性分发接入，置顶与单列的横向 `2/1` 封面亦接同一条链路，移动端因封面 `display:none` 自动不触发，`prefers-reduced-motion` 直显原图
  - **固定 3 列与卡片呈现**：`src/styles/pages/article-list.css:497` 将 `masonry` 固定为 `repeat(3,1fr)` 仅 `≤768→1列` 回落，`max-width` 收至 `3*300+2*gap`，`border 1px、radius 0.5rem、padding 0.9rem 1rem、title 1.05rem、meta 0.78rem` 同步缩窄，`cover 16/9→16/10`，`handleImageLoad/Error + skeleton-shimmer` 的旧兜底清理为生命周期统一接管
- **08-24** `[v1.26.0]` **全站评论区游客邮箱改为必填，统一四个评论入口的资料校验**
  - **原因**：匿名评论缺邮箱导致博主无法回复通知，各评论入口校验不一致
  - **Waline 官方评论区**（文章/友链等页面）：`src/components/comment/Waline.astro:15` 增加 `requiredMeta: ["nick", "mail"]`，昵称与邮箱必填后提交
  - **留言板**：`src/components/features/GuestbookChat.svelte:693` 游客发送前校验资料含邮箱；`src/components/features/GuestbookChatComposer.svelte:136` 游客资料弹窗保存时邮箱必填
- **08-24** `[v1.26.1]` **修复说说移动端评论卡片背景半透明与滚动穿透（滑动评论时背景列表跟着滚）**
  - **背景不透明**：移动端（≤768px）全屏评论面板背景由 `oklch(1 0 0 / 0.78)` 半透明毛玻璃改为 `var(--float-panel-bg)` 不透明底色，并关闭 `backdrop-filter`，不再透视背后的说说列表 `src/components/moments/MomentCommentChat.svelte`；桌面端毛玻璃效果保持不变
  - **滚动穿透**：弹窗打开时背景滚动锁由仅锁 `body` 升级为 `html + body` 双锁（仅锁 body 在 iOS 上仍会被触摸滚动穿透），新增 `lockBackgroundScroll/unlockBackgroundScroll` 统一管理，替换组件内全部 10 处调用点（评论弹窗、公告弹窗、删除弹窗共用，保留原有 `!visible` 协调逻辑）
  - **滚动链阻断**：`.guestbook-chat__messages` 增加 `overscroll-behavior: contain`，评论列表滚到顶/底后不再把滚动甩给背景页面 `src/styles/components/guestbook-chat.css`，留言板页同步受益
- **08-23** `[v1.25.0]` **迁移到 GitHub Pages + EdgeOne 站点加速，解决 EdgeOne Pages 500 次构建额度耗尽**
  - **原因**：`EdgeOne Pages` 每月 500 次构建耗尽，切到 `GitHub Actions` 构建无限次数，`EdgeOne` 仅做站点加速 `src/config/siteConfig.ts:16` 域名保持 `https://your-domain.example.com`
  - **托管**：新增 `.github/workflows/pages.yml:1`（`pnpm/action-setup@v5 9.14.4 + setup-node@v4 Node22 + pnpm build`，注入 11 个 `PUBLIC_*` Secrets，`upload-pages-artifact@v3` 上传 `dist`，`deploy-pages@v4` 发布）+ `public/CNAME:1` `your-domain.example.com`，`GitHub Settings -> Pages -> Source: GitHub Actions`，`Custom domain: your-domain.example.com`
  - **加速**：`EdgeOne` 新建站点 `your-domain.example.com`，`CNAME your-domain.example.com.eo.dnse2.com`，`源站 mengkuikun.github.io` / `回源HOST your-domain.example.com` / `协议跟随`，`DNS` 从 `mengkuikun.github.io` 切到 `eo.dnse2.com`，`HTTPS` 自动签发
- **08-21** `[v1.24.0]` **动态评论改为单频道聊天室，共用留言板样式，带动态引用块**
  - **单频道与引用**：动态页所有评论共用 Waline 频道 `src/utils/moment-chat.ts:5` `MOMENT_CHANNEL="/moments/"`，发送时按 `>>MOMENT>>id||published||excerpt<<MOMENT<<` 协议带引用块（`src/utils/moment-chat.ts:203` `buildMomentBody`），历史消息在 `src/components/moments/MomentCommentChat.svelte:1178` 以 `moment-quote` 引用块展示 `published + 摘要`，发送成功后清空 `momentQuote`
  - **弹窗复用留言板**：`src/components/moments/MomentCommentChat.svelte:1` 拷 `src/components/features/GuestbookChat.svelte` 的数据流（`PAGE_SIZE=30` / 30s 轮询 / `AbortController` / `mergeMomentMessages` 乐观更新 / 离线与可见性），复用 `GuestbookChatMessage` 与 `GuestbookChatComposer`，样式复用 `src/styles/components/guestbook-chat.css:236` 的 `workspace 1fr 18rem` 与 `@768` 抽屉+遮罩
  - **卡片简化**：`src/components/moments/MomentCard.astro:12` 移除 `detail` prop 与 `card-comment-section` 分支，卡片右下保留单一 `comment-toggle-btn` 并补 `data-moment-id/published/excerpt`（`momentExcerpt` 纯文本截 80 字符）
- **08-20** `[v1.23.0]` **分类改为文件夹即分类，支持多级目录树，分类页树形展开/叶子直跳**
  - **数据源重构**：`posts` 的 `category` 从 `src/content.config.ts:24` Zod schema 移除，分类 100% 由 `src/utils/category-tree.ts:17` `getCategoryFromId(entry.id)` 的文件夹路径推导（`编程学习/Java学习/xxx.md` → `CategoryNode{fullPath, count, directCount, children}`），`.pages.yml:33` 同步删除 `category` 字段
  - **历史迁移**：批量清理 `src/content/posts/**` 119 篇的 `category` frontmatter（`node -e` 脚本），`scripts/新建文章/index.js:45` 不再写 `category`，后续分类只靠建文件夹
  - **URL 与路由**：`src/utils/url-utils.ts:34` `getCategoryUrl` 分段 `encodeURIComponent`，路由 `src/pages/categories/[category].astro` → `src/pages/categories/[...category].astro:23` catch-all，子树聚合 `startsWith(parent+"/")`，面包屑多级渲染
- **08-13** `[v1.22.0]` **相册全面图床化：9 个相册统一 imgbedFolder 动态加载，photos 静态列表废弃**
  - 9 个相册全部改为图床动态模式，统一目录惯例 `blog/album/<相册名>`
  - 已有图床目录（相册/xxx、武侠风、用过的头像、游戏记录）由站长手动整理至新目录
  - 第三方图床（i.imglt.com）12 张与本地资源 7 张由站长上传至自建图床

### 📅 2026 年 07 月 (13 项)

- **07-29** `[v1.20.0]` **架构重构、页面过渡优化、门户区白条修复、VFX 动画即时显示**
  - Layout.astro 从 1492 行精简至 555 行，提取 8 个独立控制器模块
  - 新增 `swup-lifecycle-controller.ts` — Swup 生命周期管理（5 个钩子）
  - 新增 `scroll-handler.ts` — 滚动处理（back-to-top、TOC、navbar 隐藏）
- **07-29** `[v1.21.0]` **文章页改造、移动端底部菜单、首页背景动态切换、字体配置、代码审查修复**
  - 新增 `PostBreadcrumb.astro` — 面包屑导航组件（首页 › 分类下拉 › 此文章）
  - 分类下拉支持键盘导航（Enter/Space/ArrowUp/Down/Escape）
  - `window.__postBreadcrumbInited` guard 防重复初始化
- **07-27** `[v1.19.0]` **说说评论弹窗组件、详情页评论区优化、加载动画、留言板风格 UI**
  - 新增 `CommentModal.svelte` 可复用评论弹窗组件
  - 点击说说卡片评论按钮弹出苹果风格卡片，居中显示
  - 使用 Waline REST API 自定义聊天 UI，不依赖 Waline 内置渲染
- **07-25** `[v1.18.0]` **说说/足迹后台图片自动上传到图床、相册图床集成与瀑布流重设计、多页面 UI 统一、同步脚本修复**
  - 说说后台（`/admin/moments/`）新增 📤 上传图片按钮，支持选择文件直接上传到 CloudFlare ImgBed
  - 足迹后台（`/admin/places/`）同样新增上传功能
  - 支持多文件批量选择，实时显示上传进度
- **07-23** `[v1.17.1]` **敏感信息迁移到环境变量、跑马灯优化、首页背景图无闪烁切换、评论系统修复、足迹页面优化、图片压缩**
  - 所有硬编码的 Key/Token/密码迁移到 `.env` 文件管理
  - 支持的环境变量：高德地图 Key、Umami 统计、Waline 评论、后台密码哈希
  - `.env` 已加入 `.gitignore`，不会上传到 GitHub
- **07-23** `[v1.17.0]` **主页背景随机方案、无限滚动加载、封面图随机化、评论系统修复、移动端加载优化**
  - 主页桌面端背景图支持多方案随机展示（home1/home2/home3/home4...）
  - 每个方案包含背景图（home.webp）和装饰图（home2.webp），作为一套使用
  - 自动扫描 `public/assets/images/home/` 文件夹，新增方案无需改代码
- **07-16** `[v1.16.0]` **分类页面卡片统一、音乐页面优化、移动端导航改进、应用展示页面、说说独立评论、更新日志展开、侧边栏组件升级**
  - 分类页面文章卡片从 `PostCard.astro` 替换为 `ArticleVirtualList.svelte`，与文章列表页保持一致
  - 支持 list/grid 模式切换（骷髅开关）
  - 支持封面图隐藏开关（`data-hide-covers`）
- **07-13** `[v1.15.0]` **新增朋友圈页面，展示好友最新文章动态；后台友链管理支持更多格式**
  - 新增 `/circle/` 页面，自动抓取并展示好友最新文章
  - 数据来源：hexo-circle-of-friends Simple Mode，通过 EdgeOne 托管的 JSON 文件
  - 4 列响应式网格布局，支持无限滚动加载
- **07-13** `[v1.14.0]` **后台登录页全面改造，夜空背景、角色入场动画、表情交互系统**
  - Canvas 绘制 120 颗闪烁星星，alpha 在 0.2~1 之间循环呼吸
  - 流星从右上角随机出现，每 2~7 秒一条，带白色头部光晕，滑向左下角
  - 紫色：变成正方块从左边页面外顺时针翻滚 360° 进来，落地后恢复原样
- **07-13** `[v1.15.1]` **修复 Swup 客户端导航后页面不加载的问题，批量修正 19 个组件的事件名**
  - 将 `<script>` 从 `</MainGridLayout>` 外移到内部，确保在 Swup 容器内
  - Swup 导航时脚本会被正确替换并重新执行
  - 添加 DOM 元素空值保护，避免脚本执行时元素未就绪
- **07-12** `[v1.13.0]` **后台管理 UI 全面改造，极简克制风格，双栏布局，足迹迁移脚本**
  - 全新后台管理界面，零外部依赖，纯 CSS 手写
  - **统一顶栏**：横跨整个页面宽度，显示页面标题 + 博客品牌名
  - **深色侧边栏**：`#0f0f14` 深色背景，带微紫光晕，左侧 3px 紫色指示条标识当前页
- **07-12** `[v1.12.0]` **分类标签页面 ECharts 图表改造，首页玻璃雨珠特效，网站导航管理脚本**
  - **问题**：`npm run build` 报错 `NoAdapterInstalled`，无法构建
  - **根本原因**：`src/pages/api/place.ts` 声明了 `prerender = false`（需要 SSR），但项目未配置 SSR adapter
  - **分析**：该 API 的 CRUD 功能实际未被使用（后台通过 GitHub Gist 存储数据），仅地理编码功能被调用
- **07-11** `[v1.10.0]` **新增足迹管理后台、Gist 暂存机制与本地迁移脚本，修复足迹地图 Swup 导航加载问题**
  - 新增 `/admin/places/` 后台页面，支持在出门在外时通过浏览器快速创建足迹
  - 表单包含省份、城市、详细地址、日期、到访次数、体验描述、标签、照片等字段
  - **坐标获取**：填写地址后一键调用高德地图地理编码 API（含 POI 搜索 fallback），自动填充经纬度

### 📅 2026 年 06 月 (16 项)

- **06-30** `[v1.5.0]` **新增 Gist 数据迁移工具，支持将 GitHub Gist 中的说说、友链、影视、笔记本数据迁移到本地 Content Collection，迁移后自动清空 Gist 避免前端重复渲染；影视封面图自动下载并重写为自定义图床地址**
- **06-29** `[v1.7.2]` **修复音乐页面过渡闪现、侧边栏消失、浮动音乐播放器无数据源等问题**
  - **根本原因**：音乐页面使用 `Layout.astro`，其他页面使用 `MainGridLayout.astro`，两者 DOM 结构完全不同。Swup 只替换 5 个容器（`#swup-container`、`#left-sidebar-dynamic` 等），但 `#left-sidebar-wrapper`、`#right-sidebar-static`、`#main-grid` 等非 Swup 容器会从旧页面残留
  - **修复方案**：在 Swup `visit:start` 钩子中检测进出音乐页面时强制整页加载，绕过 Swup 的部分更新机制
  - 同时修复离开音乐页面后其他页面侧边栏消失的问题
- **06-19** `[v1.9.0]` **新增后台影视管理功能 + 搜索聚合 + 多端数据同步**
  - 新增后台影视管理页面（`/admin/bangumi/`），支持搜索并添加影视记录
  - **三源搜索聚合**：同时搜索 TMDB、豆瓣、Bangumi，点击结果自动填充表单
  - 搜索结果显示封面缩略图、标题、年份、来源标签
- **06-19** `[v1.8.0]` **新增后台友链管理功能 + 主题切换修复 + 多项样式修复**
  - 新增后台友链管理页面（`/admin/friends/`），支持通过粘贴文本自动解析并添加友链
  - 支持格式：`站点名称: xxx / 站点描述: xxx / 站点链接: xxx / 头像链接: xxx`
  - 实时预览功能，输入时自动显示友链卡片预览
- **06-18** `[v1.7.1]` **修复 Swup 导航、页面按钮失效、样式问题等多个 bug**
  - 修复后台管理页面之间切换时布局样式瞬间丢失、只显示文字的问题
  - 原因：后台页面使用 `data-swup-ignore`（Swup v3 属性），而 Swup v4 实际识别的是 `data-no-swup`
  - 将 `src/pages/admin/` 下 3 个文件共 9 处 `data-swup-ignore` 替换为 `data-no-swup`
- **06-15** `[v1.7.0]` **音乐页面重设计 + 导航栏重组 + 分页修复 + 友链按钮**
  - 全新沉浸式黑胶唱片播放器 UI（旋转唱片 + 唱针臂动画）
  - 桌面端左侧播放器 + 右侧歌词并排布局
  - 移动端播放器 + 歌词 + 播放列表纵向堆叠
- **06-11** `[v1.6.0]` **笔记后端系统 + 骷髅封面开关 + 太阳月亮主题切换 + 欢迎卡片改造 + 远程数据合并**
  - 新增 `externalNotebooksConfig` 配置，每个笔记本对应独立 Gist 仓库
  - 新增 `/admin/notebooks/` 笔记本管理页面（选笔记本 → 写 Markdown → 存 Gist）
  - 新增 `/admin/notebooks/detail/` 笔记编辑页面（Markdown 编辑器 + 实时预览）
- **06-07** `[v1.5.0]` **暗色模式全面修复 + 样式架构重构 + 首页工具栏改造 + 导航栏骷髅主题开关**
  - 修复导航栏链接在暗色模式下不可见的问题（btn-plain 文字色）
  - 修复文章目录（侧边栏 + 浮动目录）暗色模式文字不可见
  - 修复 PostMeta 日期/分类/标签/浏览量暗色模式不可见
- **06-05** `[v1.4.2]` **修复管理员页面 CSS 泄漏导致文章阅读页主题色被覆盖为紫色的 bug；将管理员页面 style 从 is:global 改为 is:inline 防止全局污染**
- **06-04** **album-fix**
- **06-03** `[v1.7.3]` **右下角浮动坞功能扩充与移动端清理：浮动坞新增分类按钮（folder-outline 图标，展开抽屉展示分类列表及文章数）和公告按钮（campaign-outline-rounded 图标，展开抽屉展示公告内容与链接）；音乐小组件与浮动坞音乐源统一为 bangumi 收藏数据，不再使用硬编码播放列表；移动端底部移除分类、标签、站点访问量小组件（已迁移至浮动坞）；移动端底部关闭音乐与公告组件（已由浮动坞按钮替代）；AI 摘要夜间模式字体颜色修复（改用 --deep-text 而非未定义的 --text-color）；导航栏站点 Logo 去掉 hover/click 阴影；新增首次访问欢迎提示（浮动坞上方三条独立消息：中文化地理位置、时段问候、功能引导，点击空白处关闭，关闭后 24h 内不重复弹出，带滑入/滑出动效）**
- **06-03** `[v1.7.1]` **导航栏重构：去除玻璃模糊毛玻璃效果改为纯色背景，向下滚动自动隐藏、向上滚动自动显示，滚动收缩后保持直角边框**
- **06-03** `[v1.7.2]` **全局优化与修复：赞助页面去掉 ko-fi 与爱发电；站点总访问量小组件上线并仅限非文章页显示；侧边栏组件 Swup 导航后空白修复（改为客户端显隐控制）；文章页目录彻底从左侧移至右侧；今日一言去掉 ✨ 装饰；影视游戏页面 Tab / 筛选按钮首次点击无反应修复（改为事件委托）；右下角浮动坞添加文章页文章/目录入口；导航栏去毛玻璃改为滚动显隐；多处暗色模式适配（相册、书架、更新日志、规划、足迹、恋爱计时、最近更新、留言板卡片堆叠、说说页缩略图）**
- **06-03** `[v1.7.1]` **全局 UI 美化：相册页面瀑布流重设计（预加载尺寸防跳变、Lightbox 跨页滑动修复、暗色模式适配）、留言板暗色模式卡片堆叠优化、说说页面视觉分隔增强（移除分页、强制正方形缩略图、超出9张可滑动查看）、工具导航页复刻胶囊动画 Tab、书架页面暗色修复与新图标、更新日志时间线重设计、规划与足迹页面简化、恋爱计时与最近更新小组件暗色适配、右下角浮动坞新增全部文章/目录入口、文章页目录从左侧移至右侧、导航栏去除毛玻璃改为滚动显隐**
- **06-02** `[v1.7.0]` **笔记本系统全面重构：封面 Hero 区域、Markdown 渲染详情页、等大卡片网格、多图支持、评论组件、相关阅读排序优化、页脚装饰图、导航栏笔记本入口、最近更新日记显示优化、樱花特效改为苍蝇飘落并支持一键开关**
- **06-01** `[v1.6.2]` **优化右下角快捷按钮：移除文章切换与附近文章入口，新增全站文章目录与移动端快捷入口，并修复 Swup 页面切换后标签、目录等按钮失效的问题**

### 📅 2026 年 05 月 (12 项)

- **05-31** `[v1.6.1]` **FAB 三点菜单新增文章切换功能：横向展开展开上一篇/下一篇快捷按钮，中间按钮支持选择附近文章快速跳转**
- **05-30** `[v1.6.0]` **FAB 三点菜单多项增强：新增全站标签面板、文章列表封面图一键隐藏开关、目录面板定位优化、项目导航页改为分类筛选模式**
- **05-30** `[v1.6.0]` **修复 Swup 页面过渡失效及移动端导航下拉菜单在页面切换后无法展开的问题**
- **05-25** `[v1.5.0]` **文章新增 order 排序字段，同日期文章可按指定顺序排列展示，不再随机乱序**
- **05-18** `[v1.5.0]` **新增影视封面下载脚本 fetch-media.py，支持 TMDB 搜索、海报下载、自动生成 bangumi md；影视卡片点击改为跳转详情页**
  - `scripts/fetch-media.py`：输入影视名称即可通过 TMDB API 搜索影视信息，自动下载海报封面到本地，生成符合博客 bangumi 格式的 Markdown 文件
  - 支持快速模式（`-y`）和交互模式，TMDB 搜不到自动降级为手动填写
  - 封面图自动保存在 `scripts/img-anime/`，MD 文件输出到 `src/content/bangumi/anime/`
- **05-17** `[v1.4.0]` **新增更新日志页面，时间轴展示功能迭代、问题修复等变更记录，支持按类型筛选**
- **05-17** `[v1.4.2]` **精简随机封面图列表并修复刷新页面封面随机切换的问题**
  - 精简 `your-img-bed.example.com` 封面图 API 列表，从 96 个删减至 33 个
  - 新增 `ph.0824.uk` 封面图源，补充 72 个横屏封面
  - 修复刷新页面时封面图随机切换的问题：客户端优先使用服务端基于文章 seed 确定的图片，不再每次随机覆盖
- **05-17** `[v1.4.1]` **修复音乐页面歌词滚动容器过小导致当前行无法居中；修复移动端首页浏览量显示为--的问题**
- **05-16** `[v1.3.0]` **fetch-lrc.py 合并搜索下载模式，支持直接搜歌名下载音频+封面+歌词+生成md；文件名自动清理空格与特殊符号**
- **05-16** `[v1.2.1]` **新增 fetch-lrc.py 脚本，支持从 M4A 提取内嵌封面、通过 Meting API 下载同步歌词、自动生成博客音乐 md 文件**
- **05-16** `[v1.2.0]` **自建 Meting API 服务并部署至腾讯云服务器，支持网易云/QQ音乐/酷狗等平台音乐搜索与音频获取**
- **05-15** `[v1.1.0]` **音乐系统回归本地模式，移除 Meting API 依赖**
  - `musicConfig.ts` 模式切换为 `mode: "local"`
  - 保留三首本地歌曲：知我、女孩、爱得起
  - 歌曲文件托管于 `your-img-bed.example.com/music/`

### 📅 2026 年 02 月 (1 项)

- **02-09** `[v1.25.0]` **新增账单/资金与日程两版块，A 密集版式 + 苹果毛玻璃**
  - 新增 `bills` 与 `schedules` 两集合（`src/content.config.ts` + `.pages.yml`），前端 `src/utils/bill-adapter.ts` / `schedule-adapter.ts` 聚合
  - 资金页 `/bills`：四宫格 + 分类占比 + 近 6 月结余 + 按日流水，账户与类型字段预留 AstrBot 写入
  - 日程页 `/schedules`：左历右单双栏（细线网格+毛玻璃，选中黑底白字），清单优先级圆点与完成态

---
*注：上述全部原始独立 Markdown 文档已永久冷备份留存于 `docs/archive/upstream-changelog/` 目录。*
