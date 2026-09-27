import { siteConfig } from "@/config";

/**
 * Initialize tab title interaction:
 * When the user leaves the tab, the title changes to a playful message.
 * When they return, it briefly shows a welcome message then restores the original.
 */
export function initTabTitleInteraction(): void {
	let originTitle = document.title;
	let titleTime: ReturnType<typeof setTimeout>;

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			originTitle = document.title;
			document.title =
				siteConfig.navbar?.hoverTitle || "w(°Δ°)w 不要走！再看看嘛！";
			clearTimeout(titleTime);
		} else {
			document.title = "欢迎回来，这里是夢酷的博客";
			titleTime = setTimeout(() => {
				document.title = originTitle;
			}, 2000);
		}
	});
}
