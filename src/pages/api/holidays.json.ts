export type HolidayEntry = {
	date: string; // "YYYY-MM-DD"
	name: string;
	isOfficial?: boolean;
	isWorkday?: boolean;
	source: "api" | "builtin";
};

type TimorHoliday = {
	holiday: boolean; // true = 节假日, false = 补班
	name: string;
	wage?: number;
	date?: string;
	rest?: number;
};

type TimorResponse = {
	code: number;
	holiday: Record<string, TimorHoliday>;
};

const BUILTIN_FALLBACK_HOLIDAYS: HolidayEntry[] = [
	// 2025
	{ date: "2025-01-01", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2025-01-28", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-01-29", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-01-30", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-01-31", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-02-01", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-02-02", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-02-03", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-02-04", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2025-04-04", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2025-04-05", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2025-04-06", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-01", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-02", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-03", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-04", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-05", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2025-05-31", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2025-06-01", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2025-06-02", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-01", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-02", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-03", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-04", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-05", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-06", name: "中秋节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-07", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2025-10-08", name: "国庆节", isWorkday: false, source: "builtin" },

	// 2026
	{ date: "2026-01-01", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2026-01-02", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2026-01-03", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2026-02-15", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-16", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-17", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-18", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-19", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-20", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-21", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-22", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-02-23", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2026-04-04", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2026-04-05", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2026-04-06", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2026-05-01", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2026-05-02", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2026-05-03", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2026-05-04", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2026-05-05", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2026-06-19", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2026-06-20", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2026-06-21", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2026-09-25", name: "中秋节", isWorkday: false, source: "builtin" },
	{ date: "2026-09-26", name: "中秋节", isWorkday: false, source: "builtin" },
	{ date: "2026-09-27", name: "中秋节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-01", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-02", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-03", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-04", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-05", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-06", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2026-10-07", name: "国庆节", isWorkday: false, source: "builtin" },

	// 2027
	{ date: "2027-01-01", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2027-01-02", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2027-01-03", name: "元旦", isWorkday: false, source: "builtin" },
	{ date: "2027-02-05", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-06", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-07", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-08", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-09", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-10", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-11", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-02-12", name: "春节", isWorkday: false, source: "builtin" },
	{ date: "2027-04-04", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2027-04-05", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2027-04-06", name: "清明节", isWorkday: false, source: "builtin" },
	{ date: "2027-05-01", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2027-05-02", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2027-05-03", name: "劳动节", isWorkday: false, source: "builtin" },
	{ date: "2027-06-09", name: "端午节", isWorkday: false, source: "builtin" },
	{ date: "2027-09-15", name: "中秋节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-01", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-02", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-03", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-04", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-05", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-06", name: "国庆节", isWorkday: false, source: "builtin" },
	{ date: "2027-10-07", name: "国庆节", isWorkday: false, source: "builtin" },
];

async function fetchYear(year: number): Promise<HolidayEntry[]> {
	const url = `https://timor.tech/api/holiday/year/${year}`;
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 4000);
		const res = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: controller.signal,
		});
		clearTimeout(timer);
		if (!res.ok) return [];
		const data = (await res.json()) as TimorResponse;
		if (data.code !== 0 || !data.holiday) return [];

		const entries: HolidayEntry[] = [];
		for (const [dayKey, item] of Object.entries(data.holiday)) {
			const date = item.date || `${year}-${dayKey}`;
			entries.push({
				date,
				name: item.name,
				isOfficial: true,
				isWorkday: !item.holiday,
				source: "api",
			});
		}
		return entries;
	} catch {
		return [];
	}
}

export async function GET(): Promise<Response> {
	const currentYear = new Date().getFullYear();
	const years = [currentYear - 1, currentYear, currentYear + 1];

	const results = await Promise.allSettled(years.map((y) => fetchYear(y)));
	const apiEntries: HolidayEntry[] = [];

	for (const res of results) {
		if (res.status === "fulfilled" && res.value.length > 0) {
			apiEntries.push(...res.value);
		}
	}

	// 如果 API 获取成功则以 API 为主，内置节日补充兜底
	const dateMap = new Map<string, HolidayEntry>();

	for (const item of BUILTIN_FALLBACK_HOLIDAYS) {
		dateMap.set(item.date, item);
	}

	for (const item of apiEntries) {
		dateMap.set(item.date, item);
	}

	const allEntries = Array.from(dateMap.values()).sort((a, b) =>
		a.date.localeCompare(b.date),
	);

	return new Response(JSON.stringify(allEntries), {
		headers: {
			"Content-Type": "application/json",
		},
	});
}
