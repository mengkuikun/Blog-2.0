/**
 * 常驻孤岛：整个文档生命周期只执行一次。
 * 用于 Swup 容器之外的组件 —— 它们的 DOM 跨导航持久存在，重复初始化只会叠加监听。
 */
export function definePersistentIsland(name: string, setup: () => void): void {
	if (typeof window === "undefined") return;
	const globalKey = `__firefly_island_${name}`;
	const win = window as unknown as Record<string, boolean>;
	if (win[globalKey]) return;
	win[globalKey] = true;
	try {
		setup();
	} catch (error) {
		console.error(`[swup-lifecycle] ${name} setup 失败:`, error);
	}
}
