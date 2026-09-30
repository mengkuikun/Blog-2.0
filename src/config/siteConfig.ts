import type { SiteConfig } from "@/types/config";
import { fontConfig } from "./fontConfig";

// 定义站点语言
// 语言代码，例如：'zh_CN', 'zh_TW', 'en', 'ja', 'ru'。
const SITE_LANG = "zh_CN";

export const siteConfig: SiteConfig = {
	// 站点标题
	title: "夢酷 の Blog",

	// 站点副标题
	subtitle: "MengKu",

	// 站点 URL
	site_url: "https://imki.cn",

	// 站点描述
	description:
		"夢酷的博客，一个分享网络技术、服务器部署、内网穿透、静态网站搭建、CDN 优化与容器化部署等技术教程与实践经验的个人空间。",

	// 站点关键词
	keywords: ["夢酷", "MengKu", "博客", "Blog", "Vibe Coding"],

	// 主题色
	themeColor: {
		// 主题色的默认色相，范围从 0 到 360。例如：红色：0，青色：200，蓝绿色：250，粉色：345
		// hue = 230 对应偏紫的蓝色调
		hue: 230,
		// 是否对访问者隐藏主题色选择器
		fixed: false,
		// 默认模式："light" 亮色，"dark" 暗色，"system" 跟随系统
		defaultMode: "system",
	},

	// 页面整体宽度（单位：rem）
	// 数值越大可以让页面内容区域更宽
	pageWidth: 100,

	// 网站Card样式配置
	card: {
		// 是否开启卡片边框和阴影，开启后让网站更有立体感
		border: true,
	},

	// Favicon 配置
	favicon: [
		{
			// 图标文件路径
			src: "/avatar.jpg",
			// 可选，指定主题 'light' | 'dark'
			// theme: "light",
			// 可选，图标大小
			// sizes: "32x32",
		},
	],

	// 导航栏配置
	navbar: {
		// 导航栏Logo
		// 支持三种类型：
		// 1. Astro图标库: { type: "icon", value: "material-symbols:home-pin-outline" }
		// 2. 本地图片（public目录，不优化）: { type: "image", value: "/assets/images/logo.webp", alt: "Logo" }
		// 3. 本地图片（src目录，自动优化但会增加构建时间，推荐）: { type: "image", value: "assets/images/logo.webp", alt: "Logo" }
		// 4. 网络图片: { type: "url", value: "https://example.com/logo.png", alt: "Logo" }
		logo: {
			type: "image",
			value: "assets/images/logos/logo-chibi-avatar.png",
			alt: "夢酷",
		},
		// 导航栏标题
		title: "夢酷",
		// 悬停时显示的互动颜文字
		hoverTitle: "w(ﾟДﾟ)w 不要走！再看看嘛！",
		// 全宽导航栏，导航栏是否占满屏幕宽度，true：占满，false：不占满
		widthFull: false,
		// 导航栏图标和标题是否跟随主题色
		followTheme: false,
	},

	// 站点开始日期，用于统计运行天数（按首次提交到远程的时间）
	siteStartDate: "2026-09-27",

	// 门户区配置
	portal: {
		announcement: {
			enable: true,
			text: "欢迎来到夢酷的博客！这里有技术分享、生活记录和更多有趣内容。",
		},
		dailyQuote: {
			enable: true,
			quotes: [
				{ text: "人生到处知何似，应似飞鸿踏雪泥。", source: "苏轼" },
				{ text: "路虽远，行则将至；事虽难，做则必成。", source: "荀子" },
				{
					text: "世界上只有一种真正的英雄主义，那就是在认识生活的真相后依然热爱生活。",
					source: "罗曼·罗兰",
				},
				{
					text: "愿你一生努力，一生被爱。想要的都拥有，得不到的都释怀。",
					source: "八月长安",
				},
				{ text: "凡是过去，皆为序章。", source: "莎士比亚" },
				{ text: "温柔半两，从容一生。", source: "三毛" },
			],
		},
		recentPostsCount: 3,
		recentMomentsCount: 3,
	},

	// 上下班时间配置（24小时制），用于首页头像涟漪动效和状态按钮
	workHours: {
		start: 9, // 上班时间 9:00
		end: 18, // 下班时间 18:00
		// 工作日范围，0=周日 1=周一 ... 6=周六，默认周一到周五
		workDays: [1, 2, 3, 4, 5],
	},

	// 站点时区（IANA 时区字符串），用于格式化bangumi、rss里的构建日期时间等等..
	// 示例："Asia/Shanghai", "UTC", 如果为空，则按照构建服务器的时区进行时区转换
	timezone: "Asia/Shanghai",

	// 提醒框（Admonitions）配置，修改后需要重启开发服务器才能生效
	// 主题：'github' | 'obsidian' | 'vitepress'，每个主题风格和语法不同，可根据喜好选择
	rehypeCallouts: {
		theme: "github",
	},

	// 文章页底部的"上次编辑时间"卡片开关
	showLastModified: true,

	// 文章过期阈值（天数），超过此天数才显示"上次编辑"卡片
	outdatedThreshold: 30,

	// 是否开启分享海报生成功能
	sharePoster: true,

	// OpenGraph图片功能,注意开启后要渲染很长时间，不建议本地调试的时候开启
	generateOgImages: false,

	// bangumi配置
	bangumi: {
		// Bangumi用户ID（TODO: 替换为你的 Bangumi 数字 UID）
		userId: "",
	},

	// 豆瓣配置
	douban: {
		// 豆瓣用户ID，用于影视与游戏页面的跳转
		userId: "",
	},

	// 页面开关配置 - 控制特定页面的访问权限，设为false会返回404
	pages: {
		// 赞助页面开关
		sponsor: true,
		// 留言板页面开关，需要配置评论系统
		guestbook: true,
		// 原番组计划页面开关（已拆分，保留关闭）
		bangumi: false,
		// 书架页面开关
		books: true,
		// 影视与游戏页面开关
		moviesGames: true,
		// 音乐页面开关
		musicPage: true,
		// 更新日志页面开关
		changelog: true,
	},

	// 说说页面封面配置（微信朋友圈风格）
	momentsCover: {
		enable: true,
		image: "/assets/images/moments-cover.jpg",
	},

	// 分类导航栏开关，在首页和归档页顶部显示分类快捷导航
	categoryBar: true,

	// 文章列表布局配置
	postListLayout: {
		// 默认布局模式："list" 列表模式（单列布局），"grid" 网格模式（多列布局）
		defaultMode: "list",
		// 是否允许用户切换布局
		allowSwitch: true,
		// 网格布局配置，仅在 defaultMode 为 "grid" 或允许切换布局时生效
		grid: {
			// 是否开启瀑布流布局，同时有封面图和无封面图的混合文章推荐开启
			masonry: false,
			// 网格模式列数：2 或 3
			// 2列是默认模式，在任何侧边栏配置下均可生效
			// 3列模式仅在单侧边栏（或无侧边栏）时生效
			columns: 3,
		},
	},

	// 分页配置
	pagination: {
		// 每页显示的文章数量
		postsPerPage: 10,
	},

	// 统计分析
	analytics: {
		// Google Analytics ID
		googleAnalyticsId: "",
		// Microsoft Clarity ID
		microsoftClarityId: "",
		// Umami Analytics
		umamiAnalytics: {
			websiteId: import.meta.env.PUBLIC_UMAMI_WEBSITE_ID || "",
			scriptUrl: import.meta.env.PUBLIC_UMAMI_BASE
				? `${import.meta.env.PUBLIC_UMAMI_BASE}/script.js`
				: "",
			shareId: import.meta.env.PUBLIC_UMAMI_SHARE_ID || "axPq9bMWEDi1N6am",
		},
	},

	// 图像优化及响应式配置
	// 图像优化压缩只保留avif或webp
	// 响应式图像是为在不同设备上提高性能而调整的图像。这些图像可以调整大小以适应其容器，并且可以根据访问者的屏幕尺寸和分辨率以不同的大小提供。
	// Astro 仅能对 src 目录下的图像进行优化，src 目录下的图像越多，构建时间会越长
	// Astro 图像文档 https://docs.astro.build/zh-cn/guides/images/
	imageOptimization: {
		// 输出图片格式
		// - "avif": 仅输出 AVIF 格式（最新技术，最小体积，目前兼容性较低）
		// - "webp": 仅输出 WebP 格式（体积适中，兼容性好）
		// - "both": 同时输出 AVIF 和 WebP（推荐，浏览器自动选择最佳格式）
		formats: "webp",
		// 图片压缩质量 (1-100)，值越低体积越小但质量越差，推荐 70-85
		quality: 85,
	},

	// 地图配置
	mapConfig: {
		// 高德地图 Web端 JS API Key
		// 申请地址: https://console.amap.com/dev/key/app
		amapKey: import.meta.env.PUBLIC_AMAP_KEY || "",
		// 地图初始中心点 [经度, 纬度]
		center: [104.195, 35.861],
		// 初始缩放级别
		zoom: 4,
		// 是否显示地图标记点
		showMarkers: true,
	},

	// 字体配置
	// 在src/config/fontConfig.ts中配置具体字体
	font: fontConfig,

	// 站点语言，在本配置文件顶部SITE_LANG定义
	lang: SITE_LANG,
};
