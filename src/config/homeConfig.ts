import type { HomeConfig } from "../types/config";
import { profileConfig } from "./profileConfig";
import { siteConfig } from "./siteConfig";
import { skillsConfig } from "./skillsConfig";

// 构建时自动扫描背景图文件夹
const _deskGlob = import.meta.glob(
	"../assets/images/backgrounds/desktop/*.{webp,png,jpg,jpeg,avif}",
	{ eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const _mobGlob = import.meta.glob(
	"../assets/images/backgrounds/mobile/*.{webp,png,jpg,jpeg,avif}",
	{ eager: true, query: "?url", import: "default" },
) as Record<string, string>;
const _deskImgs = Object.values(_deskGlob);
const _mobImgs = Object.values(_mobGlob);

const replicaRoot = "/assets/images/home";
const bioLines = Array.isArray(profileConfig.bio)
	? profileConfig.bio
	: profileConfig.bio
		? [profileConfig.bio]
		: [];
const primaryBio = bioLines[0] || siteConfig.description || "";
const displayName = profileConfig.displayName || profileConfig.name;

export const homeConfig = {
	avatar: "/avatar.jpg",
	avatarOnWork: "/avatar.jpg",
	avatarOffWork: "/avatar.jpg",
	name: profileConfig.name,
	displayName,
	nameBadge: siteConfig.title,
	occupation: profileConfig.occupation,
	bio: profileConfig.bio,

	hero: {
		backgroundImage:
			_deskImgs.length > 0 ? _deskImgs[0] : `${replicaRoot}/main/home.webp`,
		backgroundImageMobile:
			_mobImgs.length > 0
				? _mobImgs[0]
				: `${replicaRoot}/main/home-mobile.webp`,
		backgroundImagePool: _deskImgs.length > 0 ? _deskImgs : [],
		backgroundImageMobilePool: _mobImgs.length > 0 ? _mobImgs : [],
		speechAccentImage: `${replicaRoot}/main/home2-1.webp`,
		dialogue: {
			enabled: true,
			speakers: {
				host: "夢酷",
				visitor: "访客",
			},
			menuTitle: "想聊点什么？",
			typingSpeed: 45,
			autoDelay: 1600,
			intro: [
				{ speaker: "host", text: "欸，来客人啦。欢迎来到夢酷的博客。" },
				{
					speaker: "host",
					text: `这里是 ${profileConfig.name} 的个人空间，技术、生活和喜欢的东西都会慢慢收进来。`,
				},
				{ speaker: "host", text: primaryBio },
				{ speaker: "host", text: "想先了解哪一块？点下面的话题，我们慢慢逛。" },
			],
			topics: [
				{
					title: "关于我",
					lines: [
						{ speaker: "visitor", text: "这里的站长是谁呀？" },
						{
							speaker: "host",
							text: `${profileConfig.name}，也可以叫 ${displayName}。`,
						},
						{
							speaker: "host",
							text:
								profileConfig.occupation || "喜欢折腾技术，也认真记录生活。",
						},
						{
							speaker: "host",
							text: bioLines[1] || "如果你喜欢，那么欢迎来到我的世界。",
						},
					],
				},
				{
					title: "博客特色",
					lines: [
						{ speaker: "visitor", text: "这个博客主要写什么？" },
						{
							speaker: "host",
							text: "这里会分享技术见解、实用工具、ACG 相关内容，也会留下日常生活的碎片。",
						},
						{
							speaker: "host",
							text: "首页也放了站点数据、文章导航和作品展示，慢慢滚动会有完整的视觉演出。",
						},
						{
							speaker: "host",
							text: "别急着走，下面还有很多值得翻一翻的地方。",
						},
					],
				},
			],
		},
		rightPanel: {
			pill: "BLOG",
			title: "博客",
			diamond: "✦",
			microText: "システム起動完了",
		},
		rain: {
			enabled: true,
			intensity: 0.6,
			color: "255, 255, 255",
		},
	},

	dataLayer: {
		visitImage: `${replicaRoot}/main/home-data-1.webp`,
		archiveImage: `${replicaRoot}/main/home-data-2.webp`,
		contactImage: `${replicaRoot}/main/home-data-3.webp`,
		skillsImage: `${replicaRoot}/main/home-data-4.webp`,
	},

	displayLayer: {
		enabled: true,
		kicker: "作品展示",
		title: "CRYSTALLIZE GALLERY",
		description:
			"Where fleeting visions crystallize into permanence — each frame a frozen breath of time, each work a memory hardened into light.",
		scrollDistance: 4000,
		pillarFinalWidth: "18vw",
		emitterImage: `${replicaRoot}/portrait/td.webp`,
	},

	portfolioShutter: {
		enabled: true,
		kicker: "The End",
		title: "愿你每一天 都闪闪发光",
		description: "岁岁常欢愉，万事皆胜意",
		scrollDistance: 3000,
		finalImage: {
			midgroundImage: `${replicaRoot}/portrait/utl-back1.webp`,
			backgroundVideo: `${replicaRoot}/portrait/utl-back2.webm`,
			foregroundImage: `${replicaRoot}/portrait/utl-1.webp`,
			alt: "愿你每一天都闪闪发光",
		},
		interlude: {
			foreground: `${replicaRoot}/portrait/b-1.webp`,
			stripLeft: `${replicaRoot}/portrait/b-2.webp`,
			stripRight: `${replicaRoot}/portrait/b-3.webp`,
			copyLeft: "夢酷",
			copyRight: "MengKu",
		},
		panels: [
			{
				title: "项目实践",
				english: "PROJECTS",
				description: "博客 · 工具 · 创意实验",
				image: `${replicaRoot}/portrait/1.webp`,
				alt: "项目实践",
			},
			{
				title: "技术学习",
				english: "LEARNING",
				description: "编程开发 · 技术随笔 · 踩坑记录",
				image: `${replicaRoot}/portrait/2.webp`,
				alt: "技术学习",
			},
			{
				title: "博客特色",
				english: "BLOG FEATURES",
				description: "文章索引 · 归档统计 · 生活记录",
				image: `${replicaRoot}/portrait/3.webp`,
				alt: "博客特色",
			},
			{
				title: "站点技术",
				english: "STACK",
				description: "Astro · Svelte · Tailwind CSS",
				image: `${replicaRoot}/portrait/4.webp`,
				alt: "站点技术",
			},
			{
				title: "相册收录",
				english: "PHOTO ALBUM",
				description: "日常照片 · 视觉收藏 · 灵感片段",
				image: `${replicaRoot}/portrait/5.webp`,
				alt: "相册收录",
			},
		],
	},

	skills: skillsConfig.items,
	links: profileConfig.links,
} satisfies HomeConfig;
