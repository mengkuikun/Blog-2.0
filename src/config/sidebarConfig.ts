import type { SidebarLayoutConfig } from "../types/config";

/**
 * 侧边栏布局配置
 */
export const sidebarLayoutConfig: SidebarLayoutConfig = {
	// 是否启用侧边栏功能
	enable: true,

	// 侧边栏位置：
	// left: 仅显示左侧边栏
	// right: 仅显示右侧边栏
	// both: 双侧边栏，1280px以上同时显示左右，769-1279px根据tabletSidebar配置显示其中一侧
	position: "both",

	// 平板端(769-1279px)显示哪侧侧边栏，仅position为both时生效
	// left: 平板端显示左侧边栏
	// right: 平板端显示右侧边栏
	tabletSidebar: "left",

	// 使用单侧栏(position为left或right)时，是否在文章详情页显示双侧边栏
	// 当position为left时开启此项，文章详情页将额外显示右侧边栏
	// 当position为right时开启此项，文章详情页将额外显示左侧边栏
	// 适用在只想用单侧栏，但在文章详情页想用对侧栏的目录等组件的场景
	showBothSidebarsOnPostPage: true,

	// 左侧边栏组件配置列表
	// 组件的渲染顺序完全取决于它们在配置数组中出现的顺序，但top的组件会优先于sticky位置的组件渲染
	// type 组件类型
	// enable 是否启用该组件
	// position 组件位置：top固定顶部，sticky粘性定位(会跟随页面滚动)
	// showOnPostPage 是否在文章详情页显示该组件
	// showOnNonPostPage 是否在非文章详情页显示该组件（除文章详情页外都显示）
	// configId 组件配置ID（目前仅广告组件使用），用于区分不同的广告配置
	// responsive 响应式配置（部分组件可用，可用来设定部分组件需要的参数）
	leftComponents: [
		{
			// 组件类型：用户资料组件
			type: "profile",
			enable: true,
			position: "top",
			showOnPostPage: false,
		},
		{
			// 组件类型：公告组件
			type: "announcement",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：音乐播放器
			type: "music",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：全站文章目录（只在文章详情页显示）
			type: "postDirectory",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			showOnNonPostPage: false,
		},
		{
			// 组件类型：文章目录（已移至右侧边栏，此处禁用）
			type: "sidebarToc",
			enable: false,
			position: "sticky",
			showOnPostPage: true,
			showOnNonPostPage: false,
		},
		{
			// 组件类型：分类组件
			type: "categories",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: false,
			// 响应式配置
			responsive: {
				// 折叠阈值：当分类数量超过>5个时自动折叠
				collapseThreshold: 5,
			},
		},
		{
			// 组件类型：标签组件
			type: "tags",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: false,
			// 响应式配置
			responsive: {
				// 折叠阈值：当标签数量超过>20个时自动折叠
				collapseThreshold: 20,
			},
		},
		{
			// 组件类型：广告栏组件 1
			type: "advertisement",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: true,
			// 配置ID：使用第一个广告配置
			configId: "ad1",
		},
		{
			// 组件类型：生活统计小组件
			type: "lifeStats",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：天气组件
			type: "weather",
			enable: true,
			position: "top",
			showOnPostPage: false,
		},
		{
			// 组件类型：日历组件
			type: "calendar",
			// 是否启用该组件
			enable: true,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：站点统计组件
			type: "stats",
			// 是否启用该组件
			enable: true,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
	],

	// 右侧边栏组件配置列表
	rightComponents: [
		{
			// 组件类型：恋爱计时小组件
			type: "relationship",
			enable: false,
			position: "top",
			showOnPostPage: false,
		},
		{
			// 组件类型：抖音热搜
			type: "douyinHot",
			enable: true,
			position: "top",
			showOnPostPage: false,
		},
		{
			// 组件类型：网站更新热力图
			type: "siteHeatmap",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：今日一言
			type: "quoteOfTheDay",
			// 是否启用该组件
			enable: true,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：最近更新组件
			type: "recentItems",
			// 是否启用该组件
			enable: true,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：站点信息组件
			type: "siteInfo",
			// 是否启用该组件
			enable: true,
			// 组件位置
			position: "top",
			// 是否在文章详情页显示
			showOnPostPage: false,
		},
		{
			// 组件类型：文章目录（仅在文章详情页显示）
			type: "sidebarToc",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			showOnNonPostPage: false,
		},
		{
			// 组件类型：广告栏组件 2
			type: "advertisement",
			// 是否启用该组件
			enable: false,
			// 组件位置
			position: "sticky",
			// 是否在文章详情页显示
			showOnPostPage: true,
			// 配置ID：使用第二个广告配置
			configId: "ad2",
		},
	],

	// 移动端底部组件配置列表
	// 这些组件只在移动端(<768px)显示在页面底部，独立于左右侧边栏配置
	mobileBottomComponents: [
		{
			// 组件类型：用户资料组件
			type: "profile",
			// 是否启用该组件（移动端已关闭）
			enable: false,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：恋爱计时小组件
			type: "relationship",
			// 是否启用该组件
			enable: false,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：最近更新组件
			type: "recentItems",
			// 是否启用该组件
			enable: true,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：公告组件
			type: "announcement",
			// 是否启用该组件
			enable: false,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：音乐播放器
			type: "music",
			// 是否启用该组件
			enable: false,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
		{
			// 组件类型：站点统计组件
			type: "stats",
			// 是否启用该组件
			enable: true,
			// 是否在文章详情页显示
			showOnPostPage: true,
		},
	],
};
