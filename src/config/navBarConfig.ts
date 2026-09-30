import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
	type PersonalSite,
} from "../types/config";
import { siteConfig } from "./siteConfig";

// 根据页面开关动态生成导航栏配置
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: (NavBarLink | LinkPreset)[] = [
		// 主页
		LinkPreset.Home,

		// 网站导航
		{
			name: "网站导航",
			url: "/projects/",
			icon: "material-symbols:public",
		},

		// 文章（带下拉子菜单）
		{
			name: "文章",
			url: "/posts/",
			icon: "material-symbols:article",
			children: [
				// 文章列表
				LinkPreset.Posts,

				// 文章分类
				{
					name: "分类",
					url: "/categories/",
					icon: "material-symbols:folder-open",
				},

				// 归档
				LinkPreset.Archive,
			],
		},
	];

	// 动态（带下拉子菜单）
	links.push({
		name: "动态",
		url: "/moments/",
		icon: "material-symbols:local-cafe",
		children: [
			{
				name: "说说",
				url: "/moments/",
				icon: "material-symbols:chat-bubble-outline",
			},
			{
				name: "相册",
				url: "/album/",
				icon: "material-symbols:photo-album-outline",
			},
			{
				name: "留言板",
				url: "/guestbook/",
				icon: "material-symbols:edit-outline",
			},
			{
				name: "笔记本",
				url: "/life/notebooks/",
				icon: "material-symbols:menu-book-outline",
			},
			// 朋友圈
			LinkPreset.Circle,
		],
	});

	// 记录入口 - 书架、影视与游戏、音乐、规划、足迹
	const recordChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.books) {
		recordChildren.push(LinkPreset.Books);
	}
	if (siteConfig.pages.moviesGames) {
		recordChildren.push(LinkPreset.MoviesGames);
	}
	// 音乐已移入「我的」分组，此处不再重复
	if (siteConfig.pages.changelog) {
		recordChildren.push(LinkPreset.Changelog);
	}
	// 足迹
	recordChildren.push({
		name: "足迹",
		url: "/life/places/",
		icon: "material-symbols:location-on",
	});
	if (recordChildren.length > 0) {
		const defaultUrl = siteConfig.pages.books
			? "/books/"
			: siteConfig.pages.moviesGames
				? "/movies-games/"
				: "/music/";

		links.push({
			name: "记录",
			url: defaultUrl,
			icon: "material-symbols:camera-outdoor",
			children: recordChildren,
		});
	}

	// 我的 - 日历、账单、应用展示、音乐
	links.push({
		name: "我的",
		url: "/schedules/",
		icon: "material-symbols:person",
		children: [
			{
				name: "日历",
				url: "/schedules/",
				icon: "material-symbols:calendar-today-outline",
			},
			{
				name: "账单",
				url: "/bills/",
				icon: "material-symbols:account-balance-wallet-outline",
			},
			{
				name: "应用展示",
				url: "/apps/",
				icon: "material-symbols:apps",
			},
			...(siteConfig.pages.musicPage
				? [
						{
							name: "音乐",
							url: "/music/",
							icon: "material-symbols:music-note",
							external: true,
						} as NavBarLink,
					]
				: []),
		],
	});

	// 关于及其子菜单
	links.push({
		name: "关于",
		url: "/about/",
		icon: "material-symbols:info",
		children: [
			// 关于页面
			LinkPreset.About,

			// 友链
			LinkPreset.Friends,

			// 我的设备
			{
				name: "我的设备",
				url: "/equipment/",
				icon: "material-symbols:devices",
			},

			// TODO: 如需 QQ 群，在此添加
			// 赞助
			...(siteConfig.pages.sponsor ? [LinkPreset.Sponsor] : []),
		],
	});

	// 个人网站（展示在资料卡「我的网站」面板中作为配置兜底）
	const personalSites: PersonalSite[] = [
		{
			name: "个人博客",
			url: "https://imki.cn",
			icon: "/avatar.jpg",
			description: "夢酷的个人博客主页，分享技术与生活记录。",
		},
		{
			name: "图床服务 | CloudFlare-ImgBed",
			url: "https://img.imki.cn",
			icon: "simple-icons:cloudflare",
			description: "个人自建图床与文件托管服务，支持多渠道存储与博客相册直链。",
		},
		{
			name: "Umami",
			url: "https://umami.imki.cn",
			icon: "https://umami.is/favicon.ico",
			description: "站点访问量统计后台（自建 Umami）。",
		},
		{
			name: "Waline评论系统",
			url: "https://comment.imki.cn",
			icon: "https://waline.js.org/favicon.ico",
			description: "本站评论与文章浏览量统计服务（自建 Waline 实例）。",
		},
	];

	return { links, personalSites } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();
