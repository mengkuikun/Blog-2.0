import type { CollectionEntry } from "astro:content";

export type ChangelogType = "feature" | "improvement" | "fix" | "removal";

export interface ChangelogEntry {
	title: string;
	date: string;
	summary: string;
	detail: string;
	pages: string[];
	type: ChangelogType;
	version?: string;
	rawDate?: Date;
}

export interface PageMeta {
	label: string;
	url?: string;
}

export const PAGE_META: Record<string, PageMeta> = {
	home: { label: "首页", url: "/" },
	archive: { label: "归档", url: "/archive/" },
	posts: { label: "文章", url: "/posts/" },
	categories: { label: "分类", url: "/categories/" },
	friends: { label: "友链", url: "/friends/" },
	guestbook: { label: "留言", url: "/guestbook/" },
	about: { label: "关于", url: "/about/" },
	changelog: { label: "更新日志", url: "/changelog/" },
	site: { label: "全站" },
	feature: { label: "功能新增" },
	improvement: { label: "功能优化" },
	fix: { label: "问题修复" },
	removal: { label: "功能删除" },
};

const VALID_TYPES: readonly ChangelogType[] = [
	"feature",
	"improvement",
	"fix",
	"removal",
];

function normalizeType(raw: string | undefined): ChangelogType {
	const v = (raw ?? "").trim().toLowerCase();
	return (VALID_TYPES as readonly string[]).includes(v)
		? (v as ChangelogType)
		: "feature";
}

export function changelogEntriesFromCollection(
	entries: CollectionEntry<"changelog">[],
): ChangelogEntry[] {
	return entries
		.sort((a, b) => {
			const diff = b.data.date.getTime() - a.data.date.getTime();
			if (diff !== 0) return diff;
			if (b.data.time && a.data.time) {
				return b.data.time.localeCompare(a.data.time);
			}
			if (b.data.version && a.data.version) {
				return b.data.version.localeCompare(a.data.version, undefined, { numeric: true });
			}
			return b.id.localeCompare(a.id);
		})
		.map((e) => {
			const raw = e.body ?? "";
			const detail = raw.trim();
			return {
				title: e.data.description || e.data.version || e.id,
				date: e.data.date.toISOString().slice(0, 10),
				summary: e.data.description || "",
				detail: detail || e.data.description || "",
				pages: [e.data.type],
				type: normalizeType(e.data.type),
				version: e.data.version,
				rawDate: e.data.date,
			} satisfies ChangelogEntry;
		});
}

export interface ChangelogLink {
	target: number;
	sharedPages: string[];
}

export function buildChangelogLinks(
	entries: ChangelogEntry[],
): Map<number, ChangelogLink[]> {
	const links = new Map<number, ChangelogLink[]>();
	const MAX_PER_CARD = 6;
	const canLink = (a: number, b: number) =>
		(links.get(a)?.length ?? 0) < MAX_PER_CARD &&
		(links.get(b)?.length ?? 0) < MAX_PER_CARD;
	for (let i = 0; i < entries.length; i++) {
		for (let j = i + 1; j < entries.length; j++) {
			if (!canLink(i, j)) continue;
			const sharedPages = entries[i].pages.filter((page) =>
				entries[j].pages.includes(page),
			);
			if (sharedPages.length === 0) continue;
			if (!links.has(i)) links.set(i, []);
			if (!links.has(j)) links.set(j, []);
			links.get(i)?.push({ target: j, sharedPages });
			links.get(j)?.push({ target: i, sharedPages });
			if (
				(links.get(i)?.length ?? 0) >= MAX_PER_CARD &&
				(links.get(j)?.length ?? 0) >= MAX_PER_CARD
			) {
				let bothFull = true;
				for (let k = 0; k < entries.length; k++)
					if ((links.get(k)?.length ?? 0) < MAX_PER_CARD) bothFull = false;
				if (bothFull) break;
			}
		}
	}
	return links;
}
