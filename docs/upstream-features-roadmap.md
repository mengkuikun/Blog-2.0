# 上游（Firefly 原版）新功能移植与演进路线图

> **来源**：官方上游 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)（最新 v6.16+ 系列演进）与演示站 [firefly.cuteleaf.cn](https://firefly.cuteleaf.cn/)  
> **原则**：
> 1. **模块化点对点移植**：严禁整仓无脑 `git merge`，杜绝他人私人文章/配置破坏本站已有的深度定制（如连笔手写签名页脚、分享海报画廊、友链大图跟随预览等）；
> 2. **严格遵循本站 [CLAUDE.md](file:///f:/GitHub/Blog-plus/CLAUDE.md) 工程规范**：Astro 7 + Svelte 5 runes + Tailwind v4、样式由 `src/styles/main.css` 统一管理、5 语言 i18n 全量同步、Swup 生命周期与状态清理，Biome 2.5.7 格式校验；
> 3. **严禁擅自执行 `git push`**：未获明确指令前所有改动仅保留在本地 Git；
> 4. **逐项验收**：每完成一项功能，验证通过并更新本文档状态与 Changelog。

---

## 进度总览

### 一、 核心推荐（高适配度·阅读与交互体验）
- [x] **特性 0**：**站点信息侧边栏小组件 (SiteInfo)** `[已完成 2026-10-05]`
- [ ] **特性 1**：[沉浸式专注阅读模式 (Immersive Reading)](#特性-1沉浸式专注阅读模式-immersive-reading) `[待开始]`
- [ ] **特性 2**：[灵动伸缩导航栏 (Dynamic Navbar)](#特性-2灵动伸缩导航栏-dynamic-navbar) `[待开始]`
- [ ] **特性 3**：[文章底部推荐与随机探索卡片 (Related & Random Posts)](#特性-3文章底部推荐与随机探索卡片-related--random-posts) `[待开始]`
- [ ] **特性 4**：[文章系列专栏系统与聚合大厅 (Series System & /series)](#特性-4文章系列专栏系统与聚合大厅-series-system---series) `[待开始]`

### 二、 内容表达与安全增强
- [ ] **特性 5**：[文章端到端密码加密 (Encrypted Post & Content)](#特性-5文章端到端密码加密-encrypted-post--content) `[待开始]`
- [ ] **特性 6**：[Tab 多标签代码组 (Code Group Tabs)](#特性-6tab-多标签代码组-code-group-tabs) `[待开始]`
- [ ] **特性 7**：[GitHub 动态仓库卡片运行时 (GitHub Card Runtime)](#特性-7github-动态仓库卡片运行时-github-card-runtime) `[待开始]`

### 三、 个性化与二次元挂件
- [ ] **特性 8**：[B 站追番与影视库页面 (Bilibili Anime Page)](#特性-8b-站追番与影视库页面-bilibili-anime-page) `[待开始]`
- [ ] **特性 9**：[Spine 2D 骨骼动画看板娘挂件 (Spine Model Widget)](#特性-9spine-2d-骨骼动画看板娘挂件-spine-model-widget) `[待开始]`
- [ ] **特性 10**：[外观个性化集成控制面板 (Display Settings Integrated)](#特性-10外观个性化集成控制面板-display-settings-integrated) `[待开始]`

### 四、 底层性能优化（遗留精选）
- [ ] **优化 1**：[Swup WAAPI 进度条与底层预取性能优化](#优化-1swup-waapi-进度条与底层预取性能优化) `[待开始]`

---

## 详细功能规划

### 特性 1：沉浸式专注阅读模式 (Immersive Reading)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（100% 适配，纯 CSS + 原生 TS，零第三方重型依赖）
- **对应上游提交**：`a71b34e6`、`b762fe48`、`783d10b2`
- **涉及文件**：
  - `src/components/controls/ImmersiveReading.astro`（悬浮开关按钮）
  - `src/components/controls/ImmersiveTOC.astro`（独立专属浮动目录栏）
  - `src/utils/immersive-reading-utils.ts`（进退控制、快捷键与滚动监听）
  - `src/styles/immersive-reading.css`（正文满屏居中、页眉页脚与侧栏淡出动画）
- **核心体验**：
  1. 在文章页右下角提供“专注阅读”按钮（或按键盘 `Esc` 键退出）；
  2. 激活时，整站页眉导航栏、页脚、侧边栏优雅平滑淡出，视口最大化留给文章正文；
  3. 左侧（或右侧）呼出简洁的浮动目录导航（支持平滑滚动与高亮跟随）；
  4. 阅读长文、专业技术教程或小说时具备类电子书/微信读书的沉浸体验。

---

### 特性 2：灵动伸缩导航栏 (Dynamic Navbar)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（100% 适配，纯原生微交互，提升移动端与桌面端屏幕利用率）
- **对应上游提交**：`eea6b557`、`6d53242c`
- **涉及文件**：
  - `src/config/siteConfig.ts`（增加 `navbar.mode: "dynamic" | "fixed" | "static"`）
  - `src/utils/scroll-utils.ts` / `src/components/layout/Navbar.astro`
  - 导航栏平滑过渡样式
- **核心体验**：
  1. 向下浏览正文时，顶部导航栏自动上滑隐藏，让出更多可视屏幕空间；
  2. 向上轻滚滚轮或轻微上滑，导航栏立即轻盈浮现，方便随时翻页或搜索；
  3. 在首屏 Banner 区域内常驻显示，不发生误触发。

---

### 特性 3：文章底部推荐与随机探索卡片 (Related & Random Posts)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（纯客户端轻量渲染，支持 Swup 切页重刷）
- **对应上游提交**：原版经典推荐架构
- **涉及文件**：
  - `src/components/misc/RecommendedPost.astro`
  - `src/pages/posts/[...slug].astro`
- **核心体验**：
  1. 在文章末尾提供精美双栏推荐卡片：
     - **左栏·相关推荐**：根据当前文章的分类与标签，智能挑选 5 篇强关联文章；
     - **右栏·随机漫游**：利用博客已有的 `allPostMeta.json`，纯前端随机洗牌推荐 5 篇往期冷门文章；
  2. 有效避免访客“读完即走”，增加站内深层链接曝光与留存率。

---

### 特性 4：文章系列专栏系统与聚合大厅 (Series System & /series)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（Astro content collection 字段规范扩展）
- **对应上游提交**：原版系列专栏架构
- **涉及文件**：
  - `src/components/misc/SeriesNav.astro`（文章顶部手风琴专栏折叠条）
  - `src/pages/series/index.astro`（/series 专栏聚合大厅）
  - `src/utils/content-utils.ts`（`getSeriesList()` 工具函数）
- **核心体验**：
  1. 在文章 frontmatter 声明 `series: "前端工程化系列"`；
  2. 文章顶部自动渲染“系列专栏”卡片，清晰标明“当前是第 X 篇”，点击可展开全套篇目并直接跳转；
  3. 拥有独立的 `/series` 专栏聚合页面，方便读者按成套专题系统性学习。

---

### 特性 5：文章端到端密码加密 (Encrypted Post & Content)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★☆（无后端数据库依赖，纯前端 Web Crypto API 安全解密）
- **对应上游提交**：原版内容加密系统
- **涉及文件**：
  - `src/components/features/EncryptedPost.astro`
  - `src/components/features/EncryptedContent.astro`
  - `src/utils/crypto-utils.ts`（AES-GCM + PBKDF2）
- **核心体验**：
  1. 在文章 frontmatter 中标注 `password: "xxx"` 或使用加密容器标签；
  2. 构建期将 HTML 静态加密为密文，外部查看网页源码只有乱码；
  3. 读者在网页输入密码后由浏览器本地解密呈现，支持 `sessionStorage` 记住会话密码。适合私密日记、私人备忘与好友圈文章。

---

### 特性 6：Tab 多标签代码组 (Code Group Tabs)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（纯 Markdown 增强，开发者写技术文章刚需）
- **对应上游提交**：原版 `CodeGroupManager.astro`
- **涉及文件**：
  - `src/components/features/CodeGroupManager.astro`
  - Markdown/Rehype 插件支持
- **核心体验**：
  1. 支持在 Markdown 中并列排版多标签代码块（如 `pnpm / npm / yarn` 或 `TS / JS / Python`）；
  2. 支持鼠标点击与键盘左右箭头无缝切换，Swup 导航切页状态稳定。

---

### 特性 7：GitHub 动态仓库卡片运行时 (GitHub Card Runtime)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（增强文章表现力）
- **对应上游提交**：原版 `GithubCardManager.astro`
- **涉及文件**：
  - `src/components/features/GithubCardManager.astro`
  - `src/utils/github-card-utils.ts`
- **核心体验**：
  1. 在文章中引用开源项目时，构建期提供静态兜底信息；
  2. 浏览器运行时异步请求 GitHub API 实时刷新 **Stars ⭐ 数、Forks 🍴 数、主语言标签与作者头像**；
  3. 内置 24 小时 localStorage 缓存去重，兼具极速加载与实时数据。

---

### 特性 8：B 站追番与影视库页面 (Bilibili Anime Page)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★☆（配置即用，二次元爱好者必备）
- **对应上游提交**：原版 `bilibili.astro` 系列组件
- **涉及文件**：
  - `src/pages/bilibili.astro`
  - `src/components/pages/bilibili/BilibiliGrid.svelte`
  - `src/components/pages/bilibili/BilibiliDetailModal.svelte`
  - `src/utils/bilibili-utils.ts`
- **核心体验**：
  1. 仅需配置个人 B 站 UID，构建期自动同步追番与追剧数据；
  2. 展示海报墙、观看进度、更新集数、官方评分以及弹出式详情窗口；
  3. 与站内现有的 Bangumi 页面形成完整互补。

---

### 特性 9：Spine 2D 骨骼动画看板娘挂件 (Spine Model Widget)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★☆（相比 Live2D 性能更高、占用更轻）
- **对应上游提交**：原版 `SpineModel.astro`
- **涉及文件**：
  - `src/components/features/SpineModel.astro`
  - `src/components/widget/SpineModel.astro`
- **核心体验**：
  1. 原生支持加载 Spine 2D 骨骼动作模型（如《碧蓝档案》、《明日方舟》等二次元游戏模型）；
  2. 支持常态待机动作呼吸、鼠标点击互动、提示气泡与动作随机切换；
  3. 可自由放置于侧边栏或悬浮于页面右下角。

---

### 特性 10：外观个性化集成控制面板 (Display Settings Integrated)
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★☆（需与现有控制按钮样式融合）
- **对应上游提交**：原版 `DisplaySettingsIntegrated.svelte`
- **涉及文件**：
  - `src/components/controls/DisplaySettingsIntegrated.svelte`
- **核心体验**：
  1. 提供悬浮外观设置抽屉，访客可自由拖动**主题色相滑块（整站 `--hue` 实时变色）**；
  2. 支持切换**全屏壁纸经典模式 (Classic) / 沉浸首屏大图模式 (Hero)**；
  3. 支持实时调节卡片透明度、毛玻璃模糊度以及**樱花飘落 / 水波纹动效**开关。

---

### 优化 1：Swup WAAPI 进度条与底层预取性能优化
- **状态**：⚪ **待开始 (Pending)**
- **适配度**：★★★★★（底层通用优化）
- **对应提交**：`9c4d4442`、`d2280414`、`18690aba`
- **核心内容**：
  1. Swup 页面过渡顶部进度条迁移至现代 Web Animations API (WAAPI)，消除旧版频繁修改 style 造成的 Layout Thrashing；
  2. 鼠标悬停链接时智能预取目标页面样式表与静态资源，让点击跳转接近 0 延迟。
