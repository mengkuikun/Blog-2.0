/**
 * 顶部导航共享下拉面板控制器。
 *
 * 交互模型：整条导航共享一个下拉面板（[data-navbar-dropdown-panel]），
 * 悬停在带子菜单的导航项上时，面板平滑滑到该项下方并切换到对应内容页，
 * 箭头对准当前触发项中心，箱体自适应内容宽高并带有缓动过渡。
 * 滑到无子菜单的导航项或移出导航栏时平滑收起。
 */

interface PanelElements {
	panel: HTMLElement;
	box: HTMLElement;
	arrow: HTMLElement;
	pages: Map<number, HTMLElement>;
}

/** 键盘 Enter/ArrowDown 打开后的「钉住」态：悬停不再抢占，Escape/外点/导航才收起 */
let pinnedIndex: number | null = null;
let delegationInitialized = false;

function parseIndex(raw: string | undefined): number | null {
	if (raw === undefined) return null;
	const index = Number.parseInt(raw, 10);
	return Number.isInteger(index) ? index : null;
}

function getPanelElements(): PanelElements | null {
	const panel = document.querySelector<HTMLElement>(
		"[data-navbar-dropdown-panel]",
	);
	if (!panel) return null;
	const box = panel.querySelector<HTMLElement>(".navbar-dropdown-box");
	const arrow = panel.querySelector<HTMLElement>(".navbar-dropdown-arrow");
	if (!box || !arrow) return null;

	const pages = new Map<number, HTMLElement>();
	panel
		.querySelectorAll<HTMLElement>("[data-dropdown-page]")
		.forEach((page) => {
			const index = parseIndex(page.dataset.dropdownPage);
			if (index !== null) pages.set(index, page);
		});
	return { panel, box, arrow, pages };
}

function getItemIndex(item: HTMLElement): number | null {
	return parseIndex(item.dataset.dropdownIndex);
}

function getActivePageIndex(elements: PanelElements): number | null {
	for (const [index, page] of elements.pages) {
		if (page.classList.contains("is-active")) return index;
	}
	return null;
}

/**
 * 面板定位：面板左缘对齐导航项左缘，箭头对齐导航项中心，
 * 箱体尺寸切换到目标内容页（left/宽高均有过渡，产生滑动效果）。
 */
function positionPanel(
	elements: PanelElements,
	item: HTMLElement,
	page: HTMLElement,
): void {
	const navContainer = item.parentElement;
	if (!navContainer) return;
	const navRect = navContainer.getBoundingClientRect();
	const rect = item.getBoundingClientRect();
	elements.panel.style.left = `${rect.left - navRect.left}px`;
	elements.arrow.style.left = `calc(${rect.width / 2}px - 0.375rem)`;
	elements.box.style.width = `${page.offsetWidth}px`;
	elements.box.style.height = `${page.offsetHeight}px`;
}

function freezePanelTransitions(elements: PanelElements): void {
	elements.panel.style.transition = "none";
	elements.arrow.style.transition = "none";
	elements.box.style.transition = "none";
}

function unfreezePanelTransitions(elements: PanelElements): void {
	elements.panel.style.transition = "";
	elements.arrow.style.transition = "";
	elements.box.style.transition = "";
}

function syncTriggerStates(activeIndex: number | null): void {
	document
		.querySelectorAll<HTMLElement>("[data-dropdown]")
		.forEach((container) => {
			const trigger = container.querySelector("[data-dropdown-trigger]");
			const index = getItemIndex(container);
			const isActive = index !== null && index === activeIndex;
			container.classList.toggle("is-dropdown-open", isActive);
			trigger?.setAttribute("aria-expanded", String(isActive));
		});
}

function activatePage(
	elements: PanelElements,
	index: number,
): HTMLElement | null {
	const page = elements.pages.get(index);
	if (!page) return null;
	elements.pages.forEach((p) => {
		p.classList.toggle("is-active", p === page);
	});
	return page;
}

function openForItem(item: HTMLElement, index: number): void {
	const elements = getPanelElements();
	if (!elements) return;
	const page = activatePage(elements, index);
	if (!page) return;

	const wasOpen = elements.panel.classList.contains("is-open");
	if (!wasOpen) {
		// 收起态下打开不做滑动过渡：直接就位后淡入，避免从上次旧位置闪过
		freezePanelTransitions(elements);
		positionPanel(elements, item, page);
		void elements.panel.offsetWidth;
		unfreezePanelTransitions(elements);
		elements.panel.classList.add("is-open");
	} else {
		positionPanel(elements, item, page);
	}
	syncTriggerStates(index);
}

export function closeNavbarDropdownPanel(): void {
	pinnedIndex = null;
	const elements = getPanelElements();
	if (!elements) return;
	elements.panel.classList.remove("is-open");
	elements.pages.forEach((inactivePage) => {
		inactivePage.classList.remove("is-active");
	});
	syncTriggerStates(null);
}

/**
 * 悬停驱动的面板同步：item 传 null 表示鼠标已离开导航行。
 */
export function syncNavbarDropdownOnHover(item: HTMLElement | null): void {
	if (pinnedIndex !== null) return;
	const elements = getPanelElements();
	if (!elements) return;
	if (!item) {
		closeNavbarDropdownPanel();
		return;
	}
	const index = getItemIndex(item);
	if (index === null || !elements.pages.has(index)) {
		closeNavbarDropdownPanel();
		return;
	}
	openForItem(item, index);
}

/** 键盘打开（钉住）：Enter / ArrowDown 在触发器上触发 */
export function openNavbarDropdownPinned(item: HTMLElement): void {
	const index = getItemIndex(item);
	if (index === null) return;
	pinnedIndex = index;
	openForItem(item, index);
}

export function isNavbarDropdownPinned(): boolean {
	return pinnedIndex !== null;
}

/** 窗口/布局尺寸变化后，让打开中的面板重新对齐当前导航项 */
export function repositionNavbarDropdown(): void {
	if (pinnedIndex !== null) return;
	const elements = getPanelElements();
	if (!elements?.panel.classList.contains("is-open")) return;
	const index = getActivePageIndex(elements);
	if (index === null) return;
	const item = document.querySelector<HTMLElement>(
		`[data-dropdown-index="${index}"]`,
	);
	const page = elements.pages.get(index);
	if (item && page) positionPanel(elements, item, page);
}

/**
 * 点击 / 键盘的文档级委托。面板在 Swup 容器之外且导航栏常驻。
 */
export function initNavbarDropdownDelegation(): void {
	if (delegationInitialized) return;
	delegationInitialized = true;

	document.addEventListener("keydown", (event: KeyboardEvent) => {
		const target = event.target as HTMLElement | null;
		const trigger = target?.closest?.(
			"[data-dropdown-trigger]",
		) as HTMLElement | null;

		if (event.key === "Escape") {
			if (pinnedIndex === null) return;
			const index = pinnedIndex;
			closeNavbarDropdownPanel();
			const container = document.querySelector<HTMLElement>(
				`[data-dropdown-index="${index}"] [data-dropdown-trigger]`,
			);
			container?.focus();
			return;
		}

		if (trigger) {
			const container = trigger.closest<HTMLElement>("[data-dropdown]");
			if (!container) return;
			const index = getItemIndex(container);
			if (index === null) return;

			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				if (pinnedIndex === index) {
					closeNavbarDropdownPanel();
				} else {
					openNavbarDropdownPinned(container);
				}
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				openNavbarDropdownPinned(container);
				const firstItem = document.querySelector<HTMLElement>(
					`[data-dropdown-page="${index}"] .dropdown-item`,
				);
				firstItem?.focus();
			}
		}
	});

	document.addEventListener("click", (event: MouseEvent) => {
		const target = event.target as HTMLElement | null;
		const navContainer = document.querySelector<HTMLElement>(
			"[data-navbar-nav] .navbar-nav",
		);
		if (navContainer && !navContainer.contains(target)) {
			closeNavbarDropdownPanel();
		}

		if (target?.closest(".dropdown-item")) {
			closeNavbarDropdownPanel();
			(document.activeElement as HTMLElement | null)?.blur?.();
			return;
		}

		const trigger = target?.closest<HTMLElement>("[data-dropdown-trigger]");
		if (trigger) {
			// 鼠标点击触发按钮后主动脱焦，避免留存原生 :focus 导致箭头无法随鼠标离开复位
			trigger.blur();
		}
	});

	// Swup 导航 / 页面切换时重置并关闭
	document.addEventListener("swup:visit:start", () => {
		closeNavbarDropdownPanel();
	});
	document.addEventListener("swup:content:replaced", () => {
		closeNavbarDropdownPanel();
	});
	window.addEventListener("pageshow", () => {
		closeNavbarDropdownPanel();
	});
}
