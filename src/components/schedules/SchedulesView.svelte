<script lang="ts">
import type { CollectionEntry } from "astro:content";
import {
	Cake,
	Calendar,
	CalendarCheck2,
	LayoutGrid,
	Rows3,
} from "lucide-svelte";
import { Lunar } from "lunar-javascript";
import { onMount } from "svelte";
import { lunarLabel } from "@/utils/lunar";

type ScheduleEntry = CollectionEntry<"schedules">;

interface Props {
	schedules: ScheduleEntry[];
	initialYear: number;
	initialMonth: number;
	initialSelected: string;
}

let { schedules, initialYear, initialMonth, initialSelected }: Props = $props();

function toDateKey(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${dd}`;
}

function parseSchedules(raw: ScheduleEntry[]): ScheduleEntry[] {
	return raw.map((e) => {
		const rawDate = (e.data as unknown as Record<string, unknown>)
			.date as unknown as string | Date | undefined;
		let date: Date;
		if (rawDate instanceof Date) date = rawDate;
		else if (typeof rawDate === "string" && rawDate) date = new Date(rawDate);
		else date = new Date(8640000000000000); // 无 date 的农历由 effectiveDate 重算
		return { ...e, data: { ...e.data, date } };
	});
}

// 农历(慢历) → 阳历(快历) 当年换算：isLunar 本地按当前日历年份动态映射，保证每年自动对
function solarForLunar(entry: ScheduleEntry, displayYear: number): Date | null {
	const d = entry.data as unknown as Record<string, unknown>;
	if (!d.isLunar) return null;
	const lm = d.lunarMonth as number | undefined;
	const ld = d.lunarDay as number | undefined;
	const leap = Boolean(d.lunarLeap);
	if (!lm || !ld) return null;
	try {
		const l = Lunar.fromYmd(displayYear, lm, ld, leap);
		const s = l.getSolar();
		return new Date(s.getYear(), s.getMonth() - 1, s.getDay());
	} catch {
		return null;
	}
}
function effectiveDate(entry: ScheduleEntry, displayYear: number): Date {
	const solar = solarForLunar(entry, displayYear);
	if (solar) return solar;
	return entry.data.date as Date;
}

let parsed = $derived(parseSchedules(schedules));

// 首屏消闪：初始化即按 URL 或客户端今天算好，不等 onMount 再覆写
function resolveInitial(): {
	y: number;
	m: number;
	d: string;
	v: "month" | "week";
} {
	if (typeof window !== "undefined") {
		const p = new URLSearchParams(window.location.search);
		const qy = p.get("y");
		const qm = p.get("m");
		const qd = p.get("d");
		const qv = p.get("view");
		const today = new Date();
		const todayD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
		if (qy && qm) {
			const y = Number.parseInt(qy, 10);
			const m = Number.parseInt(qm, 10);
			if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
				return {
					y,
					m,
					d: qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayD,
					v:
						qv === "month" || qv === "week" ? (qv as "month" | "week") : "week",
				};
			}
		}
		// 无 URL 时直接用客户端今天，避免构建时旧月份闪烁
		return {
			y: today.getFullYear(),
			m: today.getMonth() + 1,
			d: qd && /^\d{4}-\d{2}-\d{2}$/.test(qd) ? qd : todayD,
			v: qv === "month" || qv === "week" ? (qv as "month" | "week") : "week",
		};
	}
	return { y: initialYear, m: initialMonth, d: initialSelected, v: "week" };
}
const _init = resolveInitial();
let year = $state(_init.y);
let month = $state(_init.m);
let selected = $state(_init.d);
let viewMode = $state<"month" | "week">(_init.v);

// 仅同步年月与视图，不再从 URL 恢复选中日期（避免刷新闪回）；选中日期仅内存内
function syncFromUrl(): void {
	if (typeof window === "undefined") return;
	const params = new URLSearchParams(window.location.search);
	const qy = params.get("y");
	const qm = params.get("m");
	const qv = params.get("view");
	if (qv === "week" || qv === "month") viewMode = qv;
	if (qy && qm) {
		const y = Number.parseInt(qy, 10);
		const m = Number.parseInt(qm, 10);
		if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
			year = y;
			month = m;
		}
	}
}

function pushUrl(): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.set("y", String(year));
	url.searchParams.set("m", String(month));
	url.searchParams.set("view", viewMode);
	url.searchParams.delete("d");
	window.history.replaceState({}, "", url.toString());
}

let eventsByDate = $derived.by(() => {
	const map = new Map<string, ScheduleEntry[]>();
	// 农历条目按当前日历 year 换算为当年阳历，保证每年自动换算
	const withEffective = parsed.map((e) => ({ e, ed: effectiveDate(e, year) }));
	const sorted = [...withEffective].sort(
		(a, b) => a.ed.getTime() - b.ed.getTime(),
	);
	for (const { e, ed } of sorted) {
		const k = toDateKey(ed);
		if (!map.has(k)) map.set(k, []);
		// 用换算后日期覆盖展示，但保留原始 isLunar 标记供标签用
		map.get(k)?.push({ ...e, data: { ...e.data, date: ed } } as ScheduleEntry);
	}
	return map;
});

let cells = $derived.by(() => {
	const first = new Date(year, month - 1, 1);
	const startWeek = first.getDay();
	const daysInMonth = new Date(year, month, 0).getDate();
	const prevMonthDays = new Date(year, month - 1, 0).getDate();
	const arr: { day: number; inMonth: boolean; dateStr: string }[] = [];
	for (let i = startWeek - 1; i >= 0; i--) {
		const d = prevMonthDays - i;
		const pm = month === 1 ? 12 : month - 1;
		const py = month === 1 ? year - 1 : year;
		arr.push({
			day: d,
			inMonth: false,
			dateStr: `${py}-${String(pm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		});
	}
	for (let d = 1; d <= daysInMonth; d++) {
		arr.push({
			day: d,
			inMonth: true,
			dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		});
	}
	while (arr.length < 42) {
		const nextIdx = arr.length - (startWeek + daysInMonth);
		const d = nextIdx + 1;
		const nm = month === 12 ? 1 : month + 1;
		const ny = month === 12 ? year + 1 : year;
		arr.push({
			day: d,
			inMonth: false,
			dateStr: `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		});
	}
	return arr.slice(0, 42);
});

let rows = $derived.by(() => {
	const r: (typeof cells)[] = [];
	for (let i = 0; i < cells.length; i += 7) r.push(cells.slice(i, i + 7));
	return r;
});

// 周视图：以 selected 为中心的周
let weekCells = $derived.by(() => {
	const sel = new Date(`${selected}T00:00:00`);
	const day = sel.getDay();
	const start = new Date(sel);
	start.setDate(sel.getDate() - day);
	const arr: { day: number; inMonth: boolean; dateStr: string }[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		arr.push({
			day: d.getDate(),
			inMonth: d.getMonth() + 1 === month,
			dateStr,
		});
	}
	return arr;
});

let weekRangeLabel = $derived.by(() => {
	if (weekCells.length === 0) return "";
	const start = `${weekCells[0].dateStr.slice(5).replace("-", "月")}日`;
	const end = `${weekCells[6].dateStr.slice(5).replace("-", "月")}日`;
	const startYear = Number.parseInt(weekCells[0].dateStr.slice(0, 4), 10);
	const endYear = Number.parseInt(weekCells[6].dateStr.slice(0, 4), 10);
	if (startYear !== endYear)
		return `${weekCells[0].dateStr} ~ ${weekCells[6].dateStr}`;
	if (weekCells[0].dateStr.slice(0, 7) === weekCells[6].dateStr.slice(0, 7))
		return `${start} - ${end}`;
	return `${weekCells[0].dateStr.slice(5, 7)}月${weekCells[0].dateStr.slice(8)}日 ~ ${weekCells[6].dateStr.slice(5, 7)}月${weekCells[6].dateStr.slice(8)}日`;
});

let todayKey = $derived.by(() => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
});

let prevYear = $derived(month === 1 ? year - 1 : year);
let prevMonth = $derived(month === 1 ? 12 : month - 1);
let nextYear = $derived(month === 12 ? year + 1 : year);
let nextMonthVal = $derived(month === 12 ? 1 : month + 1);

let allForSelected = $derived(eventsByDate.get(selected) || []);
let todaySchedules = $derived(
	allForSelected.filter((e) => e.data.category === "schedule"),
);
let todayHolidays = $derived(
	allForSelected.filter((e) => e.data.category === "holiday"),
);
let todayFestivals = $derived(
	allForSelected.filter((e) => e.data.category !== "schedule"),
);
// 生日/纪念日展示全年（按当前日历年份换算，农历跨年也显示）
let yearBirthdays = $derived.by(() => {
	const list = parsed.filter(
		(e) => e.data.category === "birthday" || e.data.category === "anniversary",
	);
	const withSolar = list.map((e) => ({ e, sd: effectiveDate(e, year) }));
	const src = withSolar.map(
		({ e, sd }) => ({ ...e, data: { ...e.data, date: sd } }) as ScheduleEntry,
	);
	return [...src].sort((a, b) => {
		const am = a.data.date.getMonth();
		const ad = a.data.date.getDate();
		const bm = b.data.date.getMonth();
		const bd = b.data.date.getDate();
		if (am !== bm) return am - bm;
		if (ad !== bd) return ad - bd;
		return a.data.title.localeCompare(b.data.title, "zh-CN");
	});
});
let displayFestivals = $derived.by(() => {
	// 节假日仅当天且需 isRecent， 生日全年常显
	const holidays = isRecent ? todayHolidays : [];
	return [...holidays, ...yearBirthdays];
});

// 一个月前的过滤：selected 早于今天 30 天则下方列表收起
let isRecent = $derived.by(() => {
	const today = new Date(`${todayKey}T00:00:00`);
	const sel = new Date(`${selected}T00:00:00`);
	const diff = today.getTime() - sel.getTime();
	const thirtyDays = 30 * 24 * 60 * 60 * 1000;
	// 未来日期视为近期待办，需要展示；仅过去 30 天以上的隐藏
	if (sel.getTime() > today.getTime()) return true;
	return diff <= thirtyDays;
});

let selDate = $derived(new Date(`${selected}T00:00:00`));
let dateLabel = $derived(
	`${selected} · 周${"日一二三四五六"[selDate.getDay()]}`,
);
let festivalLabel = $derived(
	todayFestivals.length
		? todayFestivals.map((e) => e.data.title).join("、")
		: "",
);

const FESTIVAL_SET = new Set([
	"春节",
	"龙抬头",
	"端午",
	"七夕",
	"中秋",
	"重阳",
	"元旦",
	"情人节",
	"妇女节",
	"劳动节",
	"青年节",
	"儿童节",
	"教师节",
	"国庆节",
	"圣诞节",
	"除夕",
	"元宵节",
]);
function isFestival(label: string): boolean {
	return FESTIVAL_SET.has(label);
}

const priorityColor: Record<string, string> = {
	none: "#9ca3af",
	low: "#3b82f6",
	medium: "#f59e0b",
	high: "#ef4444",
};

function goPrev(): void {
	if (viewMode === "week") {
		const d = new Date(`${selected}T00:00:00`);
		d.setDate(d.getDate() - 7);
		selected = toDateKey(d);
		year = d.getFullYear();
		month = d.getMonth() + 1;
	} else {
		if (month === 1) {
			year = year - 1;
			month = 12;
		} else {
			month = month - 1;
		}
	}
	pushUrl();
}
function goNext(): void {
	if (viewMode === "week") {
		const d = new Date(`${selected}T00:00:00`);
		d.setDate(d.getDate() + 7);
		selected = toDateKey(d);
		year = d.getFullYear();
		month = d.getMonth() + 1;
	} else {
		if (month === 12) {
			year = year + 1;
			month = 1;
		} else {
			month = month + 1;
		}
	}
	pushUrl();
}
function onPrevDay(): void {
	const d = new Date(`${selected}T00:00:00`);
	d.setDate(d.getDate() - 1);
	selectDate(toDateKey(d));
}
function selectDate(dateStr: string): void {
	selected = dateStr;
	const d = new Date(`${dateStr}T00:00:00`);
	year = d.getFullYear();
	month = d.getMonth() + 1;
}
function toggleView(): void {
	viewMode = viewMode === "month" ? "week" : "month";
	pushUrl();
}
function goToday(): void {
	const today = new Date();
	selected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	year = today.getFullYear();
	month = today.getMonth() + 1;
}

onMount(() => {
	const onPop = () => syncFromUrl();
	window.addEventListener("popstate", onPop);
	const onSwup = () => syncFromUrl();
	document.addEventListener("swup:content:replaced", onSwup);
	return () => {
		window.removeEventListener("popstate", onPop);
		document.removeEventListener("swup:content:replaced", onSwup);
	};
});
</script>

<div class="schedules-inner">
	<!-- 视图切换操作栏（标题已由外层统一 PageTitle 渲染） -->
	<div class="schedules-actions">
		<button class="schedules-view-toggle" type="button" onclick={toggleView} aria-label="切换视图" title={viewMode === "month" ? "切换为周视图" : "切换为月视图"}>
			{#if viewMode === "month"}
				<Rows3 size={16} />
				<span>周视图</span>
			{:else}
				<LayoutGrid size={16} />
				<span>月视图</span>
			{/if}
		</button>
	</div>

	<div class="sched-cal" data-view={viewMode}>
		<div class="sched-cal__header">
			<button class="sched-cal__nav" type="button" aria-label={viewMode === "week" ? "上一周" : "上个月"} onclick={goPrev}>‹</button>
			<div class="sched-cal__title-wrap">
				<button class="sched-cal__today-btn" type="button" onclick={goToday} aria-label="回到今日" title="回到今日"><span class="sched-cal__title">{year}年 {month}月</span>{#if viewMode === "week"}<span class="sched-cal__subtitle">{weekRangeLabel}</span>{/if}</button>
			</div>
			<button class="sched-cal__nav" type="button" aria-label={viewMode === "week" ? "下一周" : "下个月"} onclick={goNext}>›</button>
		</div>
		<div class="sched-cal__week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>
		<div class="sched-cal__grid">
			{#if viewMode === "month"}
				{#each rows as row}
					<div class="sched-cal__row">
						{#each row as cell}
							{@const lunar = lunarLabel(Number.parseInt(cell.dateStr.slice(0, 4)), Number.parseInt(cell.dateStr.slice(5, 7)), cell.day)}
							{@const dayEvents = eventsByDate.get(cell.dateStr) || []}
							{@const isToday = cell.dateStr === todayKey}
							{@const isSelected = cell.dateStr === selected}
							<button
								class="sched-cal__cell"
								class:is-outside={!cell.inMonth}
								class:is-today={isToday}
								class:is-selected={isSelected}
								data-date={cell.dateStr}
								type="button"
								onclick={() => selectDate(cell.dateStr)}
							>
								<span class="sched-cal__day-row"><b class="sched-cal__day">{cell.day}</b><small class="sched-cal__lunar" class:is-festival={isFestival(lunar)}>{lunar}</small></span>
								<span class="sched-cal__events">
									{#each dayEvents.slice(0, 2) as e}
										<span class="sched-cal__event" class:is-holiday={e.data.category === "holiday"} class:is-birthday={e.data.category === "birthday"} class:is-anniversary={e.data.category === "anniversary"} class:is-schedule={e.data.category === "schedule"} title={e.data.title}>{e.data.title}</span>
									{/each}
									{#if dayEvents.length > 2}<span class="sched-cal__more">+{dayEvents.length - 2}</span>{/if}
								</span>
							</button>
						{/each}
					</div>
				{/each}
			{:else}
				<!-- 周视图：一排 7 天 -->
				<div class="sched-cal__row sched-cal__row--week">
					{#each weekCells as cell}
						{@const lunar = lunarLabel(Number.parseInt(cell.dateStr.slice(0, 4)), Number.parseInt(cell.dateStr.slice(5, 7)), cell.day)}
						{@const dayEvents = eventsByDate.get(cell.dateStr) || []}
						{@const isToday = cell.dateStr === todayKey}
						{@const isSelected = cell.dateStr === selected}
						<button
							class="sched-cal__cell sched-cal__cell--week"
							class:is-today={isToday}
							class:is-selected={isSelected}
							data-date={cell.dateStr}
							type="button"
							onclick={() => selectDate(cell.dateStr)}
						>
							<span class="sched-cal__day-row"><b class="sched-cal__day">{cell.day}</b><small class="sched-cal__lunar" class:is-festival={isFestival(lunar)}>{lunar}</small></span>
							<span class="sched-cal__events">
								{#each dayEvents.slice(0, 2) as e}
									<span class="sched-cal__event" class:is-holiday={e.data.category === "holiday"} class:is-birthday={e.data.category === "birthday"} class:is-anniversary={e.data.category === "anniversary"} class:is-schedule={e.data.category === "schedule"} title={e.data.title}>{e.data.title}</span>
								{/each}
								{#if dayEvents.length > 2}<span class="sched-cal__more">+{dayEvents.length - 2}</span>{/if}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="schedules-below">
		<!-- 左：今日日程 - 独立卡片 -->
		<div class="schedules-panel schedules-panel--schedule">
			<div class="schedules-panel__header">
				<div class="schedules-panel__title-wrap">
					<span class="schedules-panel__icon schedules-panel__icon--schedule"><CalendarCheck2 size={16} strokeWidth={2.2} /></span>
					<h3 class="schedules-panel__title">今日日程</h3>
					{#if festivalLabel}<span class="schedules-panel__badge">{festivalLabel}</span>{/if}
				</div>
				<span class="schedules-panel__count">{todaySchedules.length}</span>
			</div>
			<div class="schedules-panel__body">
				<p class="schedules-panel__date">{dateLabel}</p>
				{#if !isRecent}
					<div class="schedules-panel__archive-tip">
						<p class="schedules-panel__empty">一个月前的数据已收起，仅在日历格子中显示</p>
						<p class="schedules-panel__hint">点击上方日历块可查看当日详情</p>
					</div>
				{:else if todaySchedules.length === 0}
					<p class="sched-list__empty">当日无日程</p>
					{:else}
						<div class="sched-list">
							{#each todaySchedules as e}
								<div class="sched-row" class:is-done={e.data.status === "done"}>
									<span class="sched-row__dot" style={`background:${priorityColor[e.data.priority] || "#9ca3af"}`}></span>
									<span class="sched-row__title">{e.data.title}</span>
									<span class="sched-row__time">{e.data.allDay ? "全天" : new Date(e.data.date).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
									<span class="sched-row__check">{e.data.status === "done" ? "✓" : "○"}</span>
								</div>
							{/each}
						</div>
					{/if}
			</div>
		</div>
		<!-- 右：生日纪念日 - 独立卡片 -->
		<div class="schedules-panel schedules-panel--festival">
			<div class="schedules-panel__header">
				<div class="schedules-panel__title-wrap">
					<span class="schedules-panel__icon schedules-panel__icon--festival"><Cake size={16} strokeWidth={2.2} /></span>
					<h3 class="schedules-panel__title">生日 · 纪念日 · 节假日</h3>
				</div>
				<span class="schedules-panel__count schedules-panel__count--festival">{displayFestivals.length}</span>
			</div>
			<div class="schedules-panel__body">
					{#if displayFestivals.length === 0}
						<p class="schedules-panel__empty">暂无生日/纪念日</p>
					{:else}
						{#each displayFestivals as e}
							<div class="sched-festival" data-kind={e.data.category}>
								<span class="sched-festival__main">{e.data.title}</span>
								<span class="sched-festival__tail">
									{#if e.data.person}<span class="sched-festival__person">{e.data.person}</span><span class="sched-festival__sep"> / </span>{/if}
									<span class="sched-festival__date">{String(e.data.date.getMonth()+1).padStart(2,"0")}-{String(e.data.date.getDate()).padStart(2,"0")}</span>
								</span>
							</div>
						{/each}
					{/if}
			</div>
		</div>
	</div>
</div>

<style>
@reference "../../styles/main.css";
.schedules-actions{ display:flex; justify-content:flex-end; margin-bottom:0.75rem; }
.schedules-view-toggle{ display:inline-flex; align-items:center; gap:0.35rem; padding:0.45rem 0.75rem; border:1.5px solid var(--deep-text); border-radius:9999px; background:var(--card-bg); color:var(--deep-text); font-size:0.78rem; font-weight:600; cursor:pointer; white-space:nowrap; transition: all 0.15s ease; }
.schedules-view-toggle:hover{ background:var(--deep-text); color:var(--card-bg); }
:root.dark .schedules-view-toggle{ border-color: oklch(1 0 0 / 0.18); background: transparent; color:var(--deep-text); }
:root.dark .schedules-view-toggle:hover{ background:var(--deep-text); color:var(--card-bg); }
.sched-cal{ border:1.5px solid #111; border-radius:0.85rem; overflow:hidden; background: #fff; padding:0.7rem; transition: all 0.25s ease; }
:root.dark .sched-cal{ border-color: oklch(1 0 0 / 0.18); background: oklch(0.16 0 0 / 0.86); }
.sched-cal__header{ display:flex; align-items:center; justify-content:space-between; padding:0.3rem 0.2rem 0.55rem; }
.sched-cal__title-wrap{ display:flex; flex-direction:column; align-items:center; gap:0.1rem; }
.sched-cal__today-btn{ display:flex; flex-direction:column; align-items:center; gap:0.1rem; border:none; background:none; cursor:pointer; padding:0.15rem 0.5rem; border-radius:0.4rem; }
.sched-cal__today-btn:hover{ background: oklch(0 0 0 / 0.06); }
:root.dark .sched-cal__today-btn:hover{ background: oklch(1 0 0 / 0.08); }
.sched-cal__title{ font-size:0.95rem; font-weight:800; }
:root.dark .sched-cal__title{ color: oklch(0.92 0 0); }
.sched-cal__subtitle{ font-size:0.68rem; color:var(--guestbook-muted); }
.sched-cal__nav{ width:2rem; height:2rem; border:1.5px solid #111; border-radius:0.45rem; background:#fff; font-size:1.1rem; line-height:1; cursor:pointer; }
:root.dark .sched-cal__nav{ border-color: oklch(1 0 0 / 0.18); background: transparent; color:#fff; }
.sched-cal__week{ display:grid; grid-template-columns:repeat(7,1fr); text-align:center; font-size:0.72rem; color:var(--guestbook-muted); padding:0.45rem 0.2rem; }
.sched-cal__grid{ display:flex; flex-direction:column; }
.sched-cal__row{ display:grid; grid-template-columns:repeat(7,1fr); }
.sched-cal__row + .sched-cal__row{ border-top:1px solid oklch(0 0 0 / 0.08); }
:root.dark .sched-cal__row + .sched-cal__row{ border-color: oklch(1 0 0 / 0.08); }
.sched-cal__row--week{ border-top:none; }
.sched-cal__cell{ aspect-ratio:1; padding:0.32rem 0.36rem; text-align:left; border-right:1px solid oklch(0 0 0 / 0.08); background:#fff; display:flex; flex-direction:column; gap:0.2rem; overflow:hidden; cursor:pointer; }
.sched-cal__cell:last-child{ border-right:none; }
.sched-cal__cell--week{ aspect-ratio: 1.1; }
:root.dark .sched-cal__cell{ background: transparent; border-color: oklch(1 0 0 / 0.06); }
.sched-cal__cell.is-outside{ color:#9ca3af; background: #fafafa; }
:root.dark .sched-cal__cell.is-outside{ background: oklch(0.14 0 0 / 1); }
.sched-cal__cell.is-today{ background: oklch(0.97 0 0); }
.sched-cal__cell.is-selected{ outline:2px solid #111; outline-offset:-2px; }
:root.dark .sched-cal__cell.is-selected{ outline-color:#fff; }
.sched-cal__day-row{ display:flex; justify-content:space-between; align-items:baseline; font-size:0.72rem; }
.sched-cal__day{ font-size:0.82rem; font-weight:700; }
:root.dark .sched-cal__day{ color: oklch(0.92 0 0); }
.sched-cal__lunar{ color:var(--guestbook-muted); font-size:0.62rem; }
.sched-cal__lunar.is-festival{ color:#dc2626; font-weight:700; }
:root.dark .sched-cal__lunar.is-festival{ color:#f87171; }
.sched-cal__events{ display:flex; flex-direction:column; gap:0.15rem; min-height:1.6rem; }
.sched-cal__event{ font-size:0.62rem; line-height:1.2; padding:0.1rem 0.25rem; border-radius:0.25rem; background: oklch(0.96 0 0); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border:1px solid transparent; }
.sched-cal__event.is-schedule{ background: #dbeafe; color:#1d4ed8; border-color:#93c5fd; }
.sched-cal__event.is-holiday{ background: #fef2f2; color:#dc2626; border-color:#fecaca; }
.sched-cal__event.is-birthday{ background: #fef9c3; color:#a16207; border-color:#fde68a; }
.sched-cal__event.is-anniversary{ background: #fce7f3; color:#be185d; border-color:#f9a8d4; }
:root.dark .sched-cal__event{ background: oklch(0.22 0 0); border-color: oklch(1 0 0 / 0.08); color: oklch(0.9 0 0); }
:root.dark .sched-cal__event.is-schedule{ background: oklch(0.22 0.6 250 / 0.35); color:#93c5fd; border-color: oklch(0.4 0.2 250 / 0.3); }
:root.dark .sched-cal__event.is-holiday{ background: oklch(0.22 0.2 25 / 0.35); color:#fca5a5; border-color: oklch(0.4 0.2 25 / 0.3); }
:root.dark .sched-cal__event.is-birthday{ background: oklch(0.25 0.15 80 / 0.3); color:#fde68a; border-color: oklch(0.4 0.15 80 / 0.3); }
:root.dark .sched-cal__event.is-anniversary{ background: oklch(0.22 0.2 330 / 0.3); color:#f9a8d4; border-color: oklch(0.4 0.2 330 / 0.3); }
.sched-cal__more{ font-size:0.6rem; color:var(--guestbook-muted); }
@media(max-width:768px){
  .sched-cal__day{ font-size:0.74rem; }
  .sched-cal__lunar{ font-size:0.58rem; }
  .sched-cal__event{ font-size:0.56rem; }
}
.schedules-inner{ display:flex; flex-direction:column; gap:0.9rem; }
.schedules-inner :global(.sched-cal){ width:100%; margin-inline:0; }
.schedules-below{ display:grid; grid-template-columns:1fr; gap:0.9rem; align-items:stretch; width:100%; margin-inline:0; }
@media(min-width:900px){ .schedules-below{ grid-template-columns:1fr 1fr; } }
/* 两个下方卡片：等高 + 分页，纵向翻倍，同日历卡片统一 1.5px #111 边框体系，且两侧与日历对齐 */
.schedules-panel{ background:#fff; border:1.5px solid #111; border-radius:0.85rem; overflow:hidden; display:flex; flex-direction:column; }
:root.dark .schedules-panel{ background: oklch(0.16 0 0 / 0.86); border-color: oklch(1 0 0 / 0.18); }
.schedules-panel__header{ display:flex; align-items:center; justify-content:space-between; gap:0.6rem; padding:0.65rem 0.8rem; background:#fafafa; border-bottom:1px solid oklch(0 0 0 / 0.08); }
:root.dark .schedules-panel__header{ background: oklch(0.14 0 0); border-color: oklch(1 0 0 / 0.08); }
.schedules-panel__title-wrap{ display:flex; align-items:center; gap:0.45rem; min-width:0; }
.schedules-panel__icon{ display:flex; align-items:center; justify-content:center; width:1.6rem; height:1.6rem; border-radius:0.4rem; flex-shrink:0; }
.schedules-panel__icon--schedule{ background:#111; color:#fff; }
:root.dark .schedules-panel__icon--schedule{ background:#fff; color:#111; }
.schedules-panel__icon--festival{ background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
:root.dark .schedules-panel__icon--festival{ background: oklch(0.22 0 0); color:#f87171; border-color: oklch(1 0 0 / 0.08); }
.schedules-panel__title{ font-size:0.85rem; font-weight:800; white-space:nowrap; }
:root.dark .schedules-panel__title{ color: oklch(0.92 0 0); }
.schedules-panel__badge{ font-size:0.68rem; color:var(--guestbook-muted); border:1px solid var(--guestbook-line); border-radius:9999px; padding:0.05rem 0.4rem; white-space:nowrap; max-width:8rem; overflow:hidden; text-overflow:ellipsis; }
.schedules-panel__count{ font-size:0.72rem; font-weight:700; background:#111; color:#fff; border-radius:9999px; padding:0.15rem 0.5rem; min-width:1.4rem; text-align:center; flex-shrink:0; }
:root.dark .schedules-panel__count{ background:#fff; color:#111; }
.schedules-panel__count--festival{ background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
:root.dark .schedules-panel__count--festival{ background: oklch(0.22 0 0); color:#f87171; }
.schedules-panel__body{ padding:0.8rem; flex:1; background:#fff; display:flex; flex-direction:column; }
:root.dark .schedules-panel__body{ background: transparent; }
.schedules-panel__date{ font-size:0.78rem; font-weight:700; color:var(--guestbook-muted); margin:0 0 0.6rem; }
.schedules-panel__empty{ color:var(--guestbook-muted); font-size:0.78rem; text-align:center; padding:0.8rem 0; }
.schedules-panel__archive-tip{ padding:0.4rem 0; text-align:center; }
.schedules-panel__hint{ font-size:0.72rem; color:var(--guestbook-muted); margin-top:0.3rem; text-align:center; }
.sched-festival{ display:flex; align-items:center; gap:0.5rem; font-size:0.82rem; padding:0.5rem 0; border-bottom:1px solid var(--guestbook-line); }
:root.dark .sched-festival{ color: oklch(0.86 0 0); }
.sched-festival:last-child{ border-bottom:none; }
.sched-festival__main{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; }
.sched-festival__tail{ display:inline-flex; align-items:center; gap:0.2rem; flex-shrink:0; margin-left:auto; white-space:nowrap; }
.sched-festival__person{ font-size:0.78rem; color: var(--guestbook-muted); }
.sched-festival__sep{ color: var(--guestbook-muted); opacity:0.7; }
.sched-festival__date{ font-size:0.78rem; font-weight:700; flex-shrink:0; }
.sched-festival[data-kind="anniversary"] .sched-festival__date{ color:#ec4899; }
:root.dark .sched-festival[data-kind="anniversary"] .sched-festival__date{ color:#f472b6; }
.sched-festival[data-kind="birthday"] .sched-festival__date{ color:#eab308; }
:root.dark .sched-festival[data-kind="birthday"] .sched-festival__date{ color:#facc15; }
.sched-festival[data-kind="holiday"] .sched-festival__date{ color:var(--guestbook-muted); }
.schedules-panel__add{ margin-top:0.7rem; font-size:0.72rem; color:var(--guestbook-muted); padding-top:0.6rem; border-top:1px dashed var(--guestbook-line); text-align:center; }
.schedules-panel__add a{ color:var(--primary); }
.sched-list{ display:flex; flex-direction:column; }
.sched-row{ display:grid; grid-template-columns:0.45rem 1fr auto auto; gap:0.6rem; align-items:center; padding:0.55rem 0; border-bottom:1px solid var(--guestbook-line); font-size:0.82rem; }
.sched-row:last-child{ border-bottom:none; }
.sched-row.is-done{ opacity:0.6; text-decoration: line-through; }
.sched-row__dot{ width:0.45rem; height:0.45rem; border-radius:9999px; display:inline-block; }
.sched-row__time{ color:var(--guestbook-muted); font-size:0.72rem; }
.sched-list__empty{ color:var(--guestbook-muted); font-size:0.82rem; text-align:center; padding:0.8rem 0; }
</style>
