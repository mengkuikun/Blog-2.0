import type { Live2DModelConfig, SpineModelConfig } from "../types/config";

// Spine 看板娘配置
export const spineModelConfig: SpineModelConfig = {
	// Spine 看板娘开关
	enable: true,
	// 仅在留言板页面显示（非留言板页面彻底休眠隐藏，节省性能）
	onlyOnGuestbook: true,
	// 留言板专属小助手模式（播报留言统计与互动提示）
	guestbookAssistant: true,

	// Spine模型配置
	model: {
		// Spine模型文件路径
		path: "/pio/models/spine/firefly/1310.json",
		// 模型缩放比例
		scale: 1.0,
		// X轴偏移
		x: 0,
		// Y轴偏移
		y: 0,
	},

	// 位置配置
	position: {
		// 显示位置 bottom-left，bottom-right，top-left，top-right，注意：在右下角可能会挡住返回顶部按钮
		corner: "bottom-left",
		// 距离边缘0px
		offsetX: 0,
		// 距离下边缘0px
		offsetY: 0,
	},

	// 尺寸配置
	size: {
		// 容器宽度
		width: 135,
		// 容器高度
		height: 165,
	},

	// 交互配置
	interactive: {
		// 交互功能开关
		enabled: true,
		// 点击时随机播放的动画列表
		clickAnimations: [
			"emoji_0",
			"emoji_1",
			"emoji_2",
			"emoji_3",
			"emoji_4",
			"emoji_5",
			"emoji_6",
		],
		// 点击时随机显示的文字消息
		clickMessages: [
			"你好呀！我是留言板小向导流萤~ ✨",
			"有什么悄悄话想对博主说吗？快写下来吧~ 💬",
			"点击别人的留言可以快速引用回复哦！",
			"按 Enter 回车键就可以快速发送消息啦 🚀",
			"支持好玩的表情包和图片呢，试试看吧！🌸",
			"每一条留言都会好好珍藏哦~ 💫",
			"今天也是元气满满的一天，祝你有好心情！💖",
		],
		// 文字显示时间（毫秒）
		messageDisplayTime: 3200,
		// 待机动画列表
		idleAnimations: ["idle", "emoji_0", "emoji_1", "emoji_3", "emoji_4"],
		// 待机动画切换间隔（毫秒）
		idleInterval: 8000,
	},

	// 响应式配置
	responsive: {
		// 在移动端隐藏（留言板移动端避免遮挡屏幕）
		hideOnMobile: true,
		// 移动端断点
		mobileBreakpoint: 768,
	},

	// 层级
	zIndex: 1000, // 层级

	// 透明度
	opacity: 1.0,
};

// Live2D 看板娘配置
export const live2dModelConfig: Live2DModelConfig = {
	// Live2D 看板娘开关
	enable: false,
	// Live2D模型配置
	model: {
		// Live2D模型文件路径
		path: "/pio/models/live2d/snow_miku/model.json",
		// path: "/pio/models/live2d/illyasviel/illyasviel.model.json",
	},

	// 位置配置
	position: {
		// 显示位置 bottom-left，bottom-right，top-left，top-right，注意：在右下角可能会挡住返回顶部按钮
		corner: "bottom-left",
		// 距离边缘0px
		offsetX: 0,
		// 距离下边缘0px
		offsetY: 0,
	},

	// 尺寸配置
	size: {
		// 容器宽度
		width: 135,
		// 容器高度
		height: 165,
	},

	// 交互配置
	interactive: {
		// 交互功能开关
		enabled: true,
		// 点击时随机显示的文字消息，motions 和 expressions 将从模型 JSON 文件中自动读取
		clickMessages: [
			"你好！我是Miku~",
			"有什么需要帮助的吗？",
			"今天天气真不错呢！",
			"要不要一起玩游戏？",
			"记得按时休息哦！",
		],
		// 随机显示的文字消息显示时间（毫秒）
		messageDisplayTime: 3000,
	},

	// 响应式配置
	responsive: {
		// 在移动端隐藏
		hideOnMobile: false,
		// 移动端断点
		mobileBreakpoint: 768,
	},
};
