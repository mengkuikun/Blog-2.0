import type { MusicPlayerConfig } from "../types/config";

export const musicPlayerConfig: MusicPlayerConfig = {
	showInNavbar: true,
	mode: "local",
	volume: 0.7,
	playMode: "list",
	showLyrics: true,

	meting: {
		api: "https://your-meting-api.example.com/api?server=:server&type=:type&id=:id",
		server: "netease",
		type: "song",
		id: "30254265974",
		auth: "",
		fallbackApis: ["https://your-meting-api.example.com/api?server=:server&type=:type&id=:id"],
	},

	// 本地播放列表为空 — 音乐数据全部从 bangumi content collection 加载
	local: {
		playlist: [],
	},

	// 3D 可视化器配置
	visualizer: {
		background: {
			dark: "#0a0a15",
			light: "#2D2D2D",
		},
		camera: {
			position: {
				x: 0,
				y: 32,
				z: 52,
			},
		},
		autoRotate: true,
		autoRotateSpeed: 0.3,
		height: {
			idle: 0.6,
			subBass: 4.0,
			bass: 3.0,
			lowMid: 2.0,
			mid: 2.5,
			highMid: 2.0,
			energy: 4.0,
			ripple: 3.0,
			rippleAccent: 1.0,
		},
		theme: {
			base1: "#050810",
			base2: "#0a0f1a",
			coolCore: "#2255ff",
			coolEdge: "#8844ff",
			warmCore: "#ff4422",
			warmEdge: "#ffaa00",
			rippleColor: "#44ddff",
			fogColor: "#050810",
			glowIntensity: 1.2,
		},
	},
};
