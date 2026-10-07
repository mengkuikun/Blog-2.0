/**
 * 顶部导航 Logo 资料卡面板控制器（常驻组件作用域）。
 *
 * 桌面端 hover/focus 展开双栏面板，定位在导航左段下方；
 * 移动端点击 logo 或通过事件弹出底部半屏卡片（遮罩 + 下滑关闭）。
 *
 * 右栏三态：default（倒计时 + 节日进度 + 建站日进度）、
 * site（「其他站点」列表）、posts（点击热力图周方块后的文章列表）。
 */

import {
	formatYmd,
	getHolidayOccurrences,
	type Milestone,
	milestoneFromOccurrences,
} from "@/utils/calendar-milestones";

export interface ProfileConfig {
	api: { holidays: string; posts: string };
	postBaseUrl: string;
	locale: string;
	anniversary: {
		name: string;
		occurrences: string[];
	};
	labels: {
		weekFormat: string;
		postCount: string;
		days: string;
		unavailable: string;
		noHoliday: string;
	};
}

export interface PostMeta {
	id: string;
	title: string;
	published: number;
}

export interface HolidayEntry {
	date: string;
	name: string;
	isWorkday?: boolean;
}

export interface ProfileData {
	holidays: HolidayEntry[];
	holidaysFailed: boolean;
	posts: PostMeta[];
	postsFailed: boolean;
}

export interface ProfileRefs {
	panel: HTMLElement;
	card: HTMLElement;
	mask: HTMLElement | null;
	leftSeg: HTMLElement | null;
	heatmap: HTMLElement | null;
	cells: Map<string, HTMLButtonElement>;
	siteTriggers: HTMLElement[];
	siteCtas: Map<string, HTMLElement>;
	panes: { default: HTMLElement; site: HTMLElement; posts: HTMLElement };
	days: { week: HTMLElement; month: HTMLElement; year: HTMLElement };
	events: {
		holiday: EventElements | null;
		anniversary: EventElements | null;
	};
	postsTitle: HTMLElement | null;
	postList: HTMLElement | null;
	mobileHeader: HTMLElement | null;
	backBtn: HTMLButtonElement | null;
	closeBtn: HTMLButtonElement | null;
	backLabel: HTMLElement | null;
}

export interface EventElements {
	title: HTMLElement | null;
	date: HTMLElement | null;
	progress: HTMLElement | null;
	fill: HTMLElement | null;
	remaining: HTMLElement | null;
}

const MOBILE_MEDIA = "(max-width: 1023.98px)";
const CLOSE_DELAY = 260;
const COUNTER_DURATION = 520;
export const NAVBAR_PROFILE_TOGGLE_EVENT = "navbar-profile:toggle";

let config: ProfileConfig | null = null;
let refs: ProfileRefs | null = null;
let initialized = false;

let data: ProfileData | null = null;
let dataPromise: Promise<void> | null = null;
let postsByCell = new Map<string, PostMeta[]>();

let selectedCellKey: string | null = null;
let siteListPinned = false;
let closeTimer: number | null = null;
let openedAsMobile = false;
let openedFrom: string | null = null;
let counterFrames: number[] = [];

function lockMobileScroll(): void {
	document.documentElement.style.overflow = "hidden";
	document.body.style.overflow = "hidden";
}

function unlockMobileScroll(): void {
	const menuSheet = document.getElementById("menu-sheet");
	if (menuSheet?.classList.contains("is-open")) return;
	document.documentElement.style.overflow = "";
	document.body.style.overflow = "";
}

function isMobileViewport(): boolean {
	return window.matchMedia(MOBILE_MEDIA).matches;
}

function parseConfig(card: HTMLElement): ProfileConfig | null {
	const raw = card.dataset.profileConfig;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as ProfileConfig;
	} catch {
		return null;
	}
}

function collectRefs(
	panel: HTMLElement,
	card: HTMLElement,
): ProfileRefs | null {
	const cells = new Map<string, HTMLButtonElement>();
	panel
		.querySelectorAll<HTMLButtonElement>("[data-profile-cell]")
		.forEach((cell) => {
			const key = cell.dataset.profileCell;
			if (key !== undefined) cells.set(key, cell);
		});

	const siteCtas = new Map<string, HTMLElement>();
	card
		.querySelectorAll<HTMLElement>("[data-profile-site-cta]")
		.forEach((cta) => {
			const key = cta.dataset.profileSiteCta;
			if (key !== undefined) siteCtas.set(key, cta);
		});

	const daysWeek = card.querySelector<HTMLElement>(
		"[data-profile-days='week']",
	);
	const daysMonth = card.querySelector<HTMLElement>(
		"[data-profile-days='month']",
	);
	const daysYear = card.querySelector<HTMLElement>(
		"[data-profile-days='year']",
	);

	const readEvent = (name: string): EventElements | null => {
		const root = card.querySelector<HTMLElement>(
			`[data-profile-event='${name}']`,
		);
		if (!root) return null;
		return {
			title: root.querySelector("[data-profile-event-title]"),
			date: root.querySelector("[data-profile-event-date]"),
			progress: root.querySelector("[data-profile-event-progress]"),
			fill: root.querySelector("[data-profile-event-progress-fill]"),
			remaining: root.querySelector("[data-profile-event-remaining]"),
		};
	};

	const pane = (name: string) =>
		card.querySelector<HTMLElement>(`[data-profile-pane='${name}']`);
	const defaultPane = pane("default");
	const sitePane = pane("site");
	const postsPane = pane("posts");
	if (!defaultPane || !sitePane || !postsPane) return null;
	if (!daysWeek || !daysMonth || !daysYear) return null;

	return {
		panel,
		card,
		mask: panel.querySelector("[data-profile-mask]"),
		leftSeg: document.querySelector(".navbar-seg--left"),
		heatmap: card.querySelector("[data-profile-heatmap]"),
		cells,
		siteTriggers: Array.from(
			card.querySelectorAll<HTMLElement>("[data-profile-site-trigger]"),
		),
		siteCtas,
		panes: { default: defaultPane, site: sitePane, posts: postsPane },
		days: { week: daysWeek, month: daysMonth, year: daysYear },
		events: {
			holiday: readEvent("holiday"),
			anniversary: readEvent("anniversary"),
		},
		postsTitle: card.querySelector("[data-profile-posts-title]"),
		postList: card.querySelector("[data-profile-post-list]"),
		mobileHeader: card.querySelector("[data-profile-mobile-header]"),
		backBtn: card.querySelector("[data-profile-back-btn]"),
		closeBtn: card.querySelector("[data-profile-close-btn]"),
		backLabel: card.querySelector("[data-profile-back-label]"),
	};
}

async function fetchData(): Promise<ProfileData> {
	if (!config) {
		return { holidays: [], holidaysFailed: true, posts: [], postsFailed: true };
	}
	const request = async (path: string): Promise<unknown> => {
		const response = await fetch(path, {
			headers: { Accept: "application/json" },
		});
		if (!response.ok) {
			throw new Error(`Profile card request failed: ${response.status}`);
		}
		return response.json();
	};

	const [holidayResult, postResult] = await Promise.allSettled([
		request(config.api.holidays),
		request(config.api.posts),
	]);

	const holidays =
		holidayResult.status === "fulfilled" && Array.isArray(holidayResult.value)
			? (holidayResult.value as HolidayEntry[])
			: [];
	const posts =
		postResult.status === "fulfilled" && Array.isArray(postResult.value)
			? (postResult.value as PostMeta[])
			: [];

	return {
		holidays,
		holidaysFailed: holidayResult.status !== "fulfilled",
		posts,
		postsFailed: postResult.status !== "fulfilled",
	};
}

function ensureData(): void {
	if (!config || !refs || dataPromise) return;
	refs.card.setAttribute("aria-busy", "true");
	dataPromise = fetchData()
		.then((result) => {
			data = result;
			postsByCell = buildPostsByCell(result.posts);
			renderHeatmapCounts();
			renderEvents();
		})
		.finally(() => {
			refs?.card.setAttribute("aria-busy", "false");
		});
}

function buildPostsByCell(posts: PostMeta[]): Map<string, PostMeta[]> {
	const year = new Date().getFullYear();
	const buckets = new Map<string, PostMeta[]>();
	for (const post of posts) {
		const published = Number(post.published);
		if (!Number.isFinite(published)) continue;
		const date = new Date(published);
		if (date.getFullYear() !== year) continue;
		const key = cellKeyOf(date.getMonth(), date.getDate());
		const bucket = buckets.get(key);
		if (bucket) bucket.push(post);
		else buckets.set(key, [post]);
	}
	for (const bucket of buckets.values()) {
		bucket.sort((a, b) => b.published - a.published);
	}
	return buckets;
}

function cellKeyOf(month: number, day: number): string {
	return `${month}-${Math.min(3, Math.floor((day - 1) / 7))}`;
}

function cellDateRangeOf(key: string): {
	month: number;
	start: number;
	end: number;
} {
	const [monthRaw, weekRaw] = key.split("-").map(Number);
	const start = weekRaw * 7 + 1;
	const lastDay = new Date(new Date().getFullYear(), monthRaw + 1, 0).getDate();
	return { month: monthRaw, start, end: weekRaw === 3 ? lastDay : start + 6 };
}

function formatWeekLabel(key: string): string {
	if (!config) return "";
	const [monthRaw, weekRaw] = key.split("-").map(Number);
	const monthName = new Intl.DateTimeFormat(config.locale, {
		month: "long",
	}).format(new Date(2000, monthRaw, 1));
	return config.labels.weekFormat
		.replace("{month}", monthName)
		.replace("{week}", String(weekRaw + 1));
}

function renderCountdowns(): void {
	applyCountdowns(1);
}

function computeCountdownTargets(): {
	week: number;
	month: number;
	year: number;
} {
	const now = new Date();
	const dayTimestamp = (d: Date) =>
		new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const diffDays = (target: Date) =>
		Math.max(
			0,
			Math.round((dayTimestamp(target) - dayTimestamp(now)) / 86400000),
		);

	const endOfWeek = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + (6 - ((now.getDay() + 6) % 7)),
	);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const endOfYear = new Date(now.getFullYear(), 11, 31);

	return {
		week: diffDays(endOfWeek),
		month: diffDays(endOfMonth),
		year: diffDays(endOfYear),
	};
}

function applyCountdowns(progressRatio: number): void {
	if (!refs || !config) return;
	const targets = computeCountdownTargets();
	const unit = config.labels.days;
	refs.days.week.textContent = `${Math.round(targets.week * progressRatio)}${unit}`;
	refs.days.month.textContent = `${Math.round(targets.month * progressRatio)}${unit}`;
	refs.days.year.textContent = `${Math.round(targets.year * progressRatio)}${unit}`;
}

function cancelAnimations(): void {
	for (const frame of counterFrames) cancelAnimationFrame(frame);
	counterFrames = [];
}

function playEntranceAnimation(): void {
	if (!refs || !config) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	cancelAnimations();

	const targets = computeCountdownTargets();
	const unit = config.labels.days;
	const startTime = performance.now();

	const step = (now: number) => {
		if (!refs) return;
		const progress = Math.min(1, (now - startTime) / COUNTER_DURATION);
		const ease = 1 - (1 - progress) ** 3;
		refs.days.week.textContent = `${Math.round(targets.week * ease)}${unit}`;
		refs.days.month.textContent = `${Math.round(targets.month * ease)}${unit}`;
		refs.days.year.textContent = `${Math.round(targets.year * ease)}${unit}`;
		if (progress < 1) {
			counterFrames.push(requestAnimationFrame(step));
		}
	};
	counterFrames.push(requestAnimationFrame(step));

	// 节日与建站日倒计时动画
	playEventCounters();
	replayProgressFills();
}

function playEventCounters(): void {
	if (!refs || !config) return;
	const targets = [refs.events.holiday, refs.events.anniversary]
		.map((e) => e?.remaining ?? null)
		.filter(
			(el): el is HTMLElement => !!el && el.dataset.profileTarget !== undefined,
		)
		.map((el) => ({ el, value: Number(el.dataset.profileTarget) }));

	if (targets.length === 0) return;
	const unit = config.labels.days;
	const startTime = performance.now();

	const step = (now: number) => {
		if (!refs) return;
		const progress = Math.min(1, (now - startTime) / COUNTER_DURATION);
		const ease = 1 - (1 - progress) ** 3;
		for (const { el, value } of targets) {
			el.textContent = `${Math.round(value * ease)}${unit}`;
		}
		if (progress < 1) {
			counterFrames.push(requestAnimationFrame(step));
		}
	};
	counterFrames.push(requestAnimationFrame(step));
}

function replayProgressFills(): void {
	if (!refs) return;
	for (const event of [refs.events.holiday, refs.events.anniversary]) {
		if (!event?.fill || !event.progress) continue;
		const target = Number(event.progress.getAttribute("aria-valuenow") ?? 0);
		setBarProgress(event.fill, target);
	}
}

function renderHeatmapCounts(): void {
	if (!refs || !config || !data) return;
	for (const [key, cell] of refs.cells) {
		const count = data.postsFailed ? 0 : (postsByCell.get(key)?.length ?? 0);
		cell.classList.remove("is-level-1", "is-level-2", "is-level-3");
		if (count > 0) {
			cell.classList.add(`is-level-${Math.min(3, count)}`);
		}
		const weekLabel = formatWeekLabel(key);
		const tip =
			count > 0
				? `${weekLabel} · ${config.labels.postCount.replace("{count}", String(count))}`
				: weekLabel;
		cell.dataset.tooltip = tip;
		cell.setAttribute("aria-label", tip);
	}
}

function highlightCurrentWeek(): void {
	if (!refs) return;
	const now = new Date();
	const key = cellKeyOf(now.getMonth(), now.getDate());
	refs.cells.get(key)?.classList.add("is-current");
}

function renderEventItem(
	elements: EventElements | null,
	milestone: Milestone | null,
	emptyText: string,
): void {
	if (!elements) return;
	if (!milestone) {
		if (elements.title) elements.title.textContent = emptyText;
		if (elements.date) elements.date.textContent = "";
		if (elements.remaining) {
			elements.remaining.textContent = "--";
			delete elements.remaining.dataset.profileTarget;
		}
		if (elements.progress) elements.progress.setAttribute("aria-valuenow", "0");
		if (elements.fill) elements.fill.style.width = "0%";
		return;
	}

	if (elements.title) elements.title.textContent = milestone.title;
	if (elements.date)
		elements.date.textContent = formatDateLabel(milestone.date);
	if (elements.remaining) {
		elements.remaining.dataset.profileTarget = String(milestone.remainingDays);
		elements.remaining.textContent = `${milestone.remainingDays}${config?.labels.days ?? ""}`;
	}
	if (elements.progress) {
		elements.progress.setAttribute("aria-valuenow", String(milestone.progress));
		elements.progress.setAttribute("aria-valuetext", `${milestone.progress}%`);
	}
	setBarProgress(elements.fill, milestone.progress);
}

function setBarProgress(fill: HTMLElement | null, percent: number): void {
	if (!fill) return;
	fill.style.transition = "none";
	fill.style.width = "0%";
	void fill.offsetWidth; // 触发 reflow
	fill.style.removeProperty("transition");
	fill.style.width = `${percent}%`;
}

function formatDateLabel(dateKey: string): string {
	if (!config) return dateKey;
	const [y, m, d] = dateKey.split("-").map(Number);
	try {
		return new Intl.DateTimeFormat(config.locale, {
			month: "long",
			day: "numeric",
		}).format(new Date(y, m - 1, d));
	} catch {
		return dateKey;
	}
}

function renderEvents(): void {
	if (!refs || !config || !data) return;
	const todayKey = formatYmd(new Date());

	// 节日进度
	const holidayMilestone = data.holidaysFailed
		? null
		: milestoneFromOccurrences(getHolidayOccurrences(data.holidays), todayKey);
	renderEventItem(
		refs.events.holiday,
		holidayMilestone,
		data.holidaysFailed ? config.labels.unavailable : config.labels.noHoliday,
	);

	// 建站日进度
	const annivTitle = config.anniversary.name;
	const anniversaryOccurrences = config.anniversary.occurrences.map((d) => ({
		title: annivTitle,
		date: d,
	}));
	const anniversaryMilestone = milestoneFromOccurrences(
		anniversaryOccurrences,
		todayKey,
	);
	renderEventItem(
		refs.events.anniversary,
		anniversaryMilestone,
		config.labels.unavailable,
	);

	playEventCounters();
}

function switchPane(state: "default" | "site" | "posts"): void {
	if (!refs) return;
	refs.panes.default.hidden = state !== "default";
	refs.panes.site.hidden = state !== "site";
	refs.panes.posts.hidden = state !== "posts";
}

function toggleSiteList(): void {
	if (siteListPinned) {
		siteListPinned = false;
		switchPane(selectedCellKey ? "posts" : "default");
	} else {
		siteListPinned = true;
		switchPane("site");
	}
	updateSiteTriggerPressed();
}

function updateSiteTriggerPressed(): void {
	if (!refs) return;
	for (const trigger of refs.siteTriggers) {
		trigger.setAttribute("aria-pressed", String(siteListPinned));
	}
}

function clearCellSelection(): void {
	if (!refs) return;
	if (selectedCellKey) {
		const prev = refs.cells.get(selectedCellKey);
		prev?.classList.remove("is-selected");
		prev?.setAttribute("aria-pressed", "false");
	}
	selectedCellKey = null;
	if (refs.postList) refs.postList.replaceChildren();
}

function selectCell(key: string): void {
	if (!refs || !config) return;
	const posts = postsByCell.get(key);
	clearCellSelection();
	siteListPinned = false;
	updateSiteTriggerPressed();

	if (!posts || posts.length === 0) {
		switchPane("default");
		return;
	}

	selectedCellKey = key;
	const cell = refs.cells.get(key);
	cell?.classList.add("is-selected");
	cell?.setAttribute("aria-pressed", "true");

	if (refs.postsTitle) {
		const { month, start, end } = cellDateRangeOf(key);
		const pad = (n: number) => String(n).padStart(2, "0");
		refs.postsTitle.textContent = `${formatWeekLabel(key)} · ${pad(month + 1)}.${pad(start)} – ${pad(month + 1)}.${pad(end)}`;
	}

	if (refs.postList) {
		refs.postList.replaceChildren();
		for (const post of posts) {
			const link = document.createElement("a");
			link.className = "navbar-profile-card__post-link";
			link.href = `${config.postBaseUrl}${String(post.id).replace(/^\/+|\/+$/g, "")}/`;
			link.textContent = post.title;
			refs.postList.appendChild(link);
		}
	}

	switchPane("posts");
}

function cancelCloseTimer(): void {
	if (closeTimer !== null) {
		window.clearTimeout(closeTimer);
		closeTimer = null;
	}
}

function scheduleClose(): void {
	if (closeTimer === null) {
		closeTimer = window.setTimeout(() => {
			closeTimer = null;
			close();
		}, CLOSE_DELAY);
	}
}

function updateDesktopPosition(): void {
	if (!refs || isMobileViewport()) return;
	const leftSeg = refs.leftSeg || document.querySelector(".navbar-seg--left");
	if (leftSeg) {
		refs.leftSeg = leftSeg as HTMLElement;
		const rect = leftSeg.getBoundingClientRect();
		refs.panel.style.left = `${Math.max(8, rect.left)}px`;
		refs.panel.style.top = `${rect.bottom}px`;
	}
}

export function open(options?: { from?: string }): void {
	if (!refs) return;
	cancelCloseTimer();
	if (!refs.panel.classList.contains("is-open")) {
		ensureData();
		openedAsMobile = isMobileViewport();
		openedFrom = options?.from ?? null;
		if (refs.backLabel) {
			refs.backLabel.textContent = openedFrom === "menu" ? "返回菜单" : "返回";
		}
		if (!openedAsMobile) {
			updateDesktopPosition();
		}
		refs.panel.classList.add("is-open");
		playEntranceAnimation();
		if (openedAsMobile) {
			lockMobileScroll();
		}
	}
}

export function close(options?: { keepScrollLock?: boolean }): void {
	if (!refs) return;
	cancelCloseTimer();
	if (refs.panel.classList.contains("is-open")) {
		refs.panel.classList.remove("is-open");
		cancelAnimations();
		if (openedAsMobile && !options?.keepScrollLock) {
			unlockMobileScroll();
		}
		openedAsMobile = false;
		openedFrom = null;
		clearCellSelection();
		siteListPinned = false;
		updateSiteTriggerPressed();
		switchPane("default");
	}
}

export function back(): void {
	if (!refs) return;
	const shouldReturnToMenu = openedAsMobile && openedFrom === "menu";
	close({ keepScrollLock: shouldReturnToMenu });
	if (shouldReturnToMenu) {
		window.setTimeout(() => {
			window.dispatchEvent(new CustomEvent("mobile-menu:open"));
		}, 160);
	}
}

export function toggle(options?: { from?: string }): void {
	if (refs?.panel.classList.contains("is-open")) {
		close();
	} else {
		open(options);
	}
}

function bindEvents(): void {
	if (!refs) return;
	const { panel, card, mask, heatmap, siteTriggers, backBtn, closeBtn } = refs;

	backBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		back();
	});

	closeBtn?.addEventListener("click", (e) => {
		e.stopPropagation();
		close();
	});

	const bindHoverSource = () => {
		const leftSeg =
			refs?.leftSeg || document.querySelector(".navbar-seg--left");
		if (!leftSeg) return;
		if (refs) refs.leftSeg = leftSeg as HTMLElement;

		leftSeg.addEventListener("click", (e) => {
			if (
				(e.target as HTMLElement).closest(".navbar-logo") &&
				isMobileViewport()
			) {
				e.preventDefault();
				e.stopPropagation();
				toggle();
			}
		});

		leftSeg.addEventListener("mouseenter", () => {
			if (!isMobileViewport()) open();
		});

		leftSeg.addEventListener("mouseleave", () => {
			if (!isMobileViewport()) scheduleClose();
		});

		leftSeg.addEventListener("focusin", () => open());
		leftSeg.addEventListener("focusout", (e: FocusEvent) => {
			const related = e.relatedTarget;
			if (
				related instanceof Node &&
				(card.contains(related) || leftSeg.contains(related))
			) {
				return;
			}
			scheduleClose();
		});
	};

	bindHoverSource();

	panel.addEventListener("mouseenter", cancelCloseTimer);
	panel.addEventListener("mouseleave", () => {
		if (!isMobileViewport()) scheduleClose();
	});

	panel.addEventListener("focusout", (e: FocusEvent) => {
		const related = e.relatedTarget;
		if (
			related instanceof Node &&
			(card.contains(related) || (refs?.leftSeg?.contains(related) ?? false))
		) {
			return;
		}
		scheduleClose();
	});

	mask?.addEventListener("click", () => {
		back();
	});

	mask?.addEventListener(
		"touchmove",
		(e) => {
			e.preventDefault();
		},
		{ passive: false },
	);

	// 滚动时立即收起面板（桌面端 fixed 锚点跟随）
	window.addEventListener(
		"scroll",
		() => {
			if (refs?.panel.classList.contains("is-open") && !isMobileViewport()) {
				close();
			}
		},
		{ passive: true },
	);

	// Esc 关闭 / 回退
	document.addEventListener("keydown", (e) => {
		if (e.key !== "Escape" || !panel.classList.contains("is-open")) return;
		e.preventDefault();
		back();
	});

	// 「其他站点」按钮
	for (const trigger of siteTriggers) {
		trigger.addEventListener("click", () => toggleSiteList());
	}

	// 热力图点击
	heatmap?.addEventListener("click", (e) => {
		const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
			"[data-profile-cell]",
		);
		const cellKey = target?.dataset.profileCell;
		if (cellKey) {
			if (cellKey === selectedCellKey) {
				clearCellSelection();
				switchPane("default");
				return;
			}
			selectCell(cellKey);
		}
	});

	// 移动端下滑手势回退
	let touchStartY: number | null = null;
	card.addEventListener(
		"touchstart",
		(e) => {
			touchStartY = e.touches[0]?.clientY ?? null;
		},
		{ passive: true },
	);

	card.addEventListener(
		"touchmove",
		(e) => {
			if (touchStartY === null || !openedAsMobile) return;
			const delta = (e.touches[0]?.clientY ?? 0) - touchStartY;
			if (delta > 64) {
				touchStartY = null;
				back();
			}
		},
		{ passive: true },
	);

	card.addEventListener(
		"touchend",
		() => {
			touchStartY = null;
		},
		{ passive: true },
	);

	// 外部触发事件
	window.addEventListener(NAVBAR_PROFILE_TOGGLE_EVENT, (e: Event) => {
		const detail = (e as CustomEvent).detail;
		toggle(detail);
	});

	window.addEventListener("navbar-profile:open", (e: Event) => {
		const detail = (e as CustomEvent).detail;
		open(detail);
	});

	// Swup 导航 / pageshow 触发时关闭卡片，并重新连接 leftSeg
	document.addEventListener("swup:visit:start", () => {
		close();
		unlockMobileScroll();
	});
	document.addEventListener("swup:content:replaced", () => {
		close();
		unlockMobileScroll();
		bindHoverSource();
	});
	window.addEventListener("pageshow", () => {
		close();
		unlockMobileScroll();
	});
}

export function initNavbarProfileCard(): void {
	if (initialized) return;
	initialized = true;

	const panel = document.querySelector<HTMLElement>(
		"[data-navbar-profile-panel]",
	);
	const card = panel?.querySelector<HTMLElement>("[data-profile-card]");
	if (!panel || !card) return;

	const parsedConfig = parseConfig(card);
	if (!parsedConfig) return;

	config = parsedConfig;
	refs = collectRefs(panel, card);
	if (!refs) return;

	renderCountdowns();
	highlightCurrentWeek();
	bindEvents();
}
