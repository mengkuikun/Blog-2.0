import type { WalineComment, WalineRootComment } from "@waline/api";
import type {
	GuestbookEmojiPack,
	GuestbookImageAttachment,
} from "@/types/guestbook-chat";
import type { NotebookChatMessage, NotebookQuote } from "@/types/notebook-chat";

export const NOTEBOOK_CHANNEL: string = "/life/notebooks/";

export const NOTEBOOK_QUOTE_RE: RegExp = /^>>NOTEBOOK>>(.+?)<<NOTEBOOK<<\n?/s;

export const NOTEBOOK_REPLY_RE: RegExp =
	/^<!--notebook-reply:(\d+):([^>]*)-->\s*/u;

export const WALINE_INLINE_IMAGE_SIZE_LIMIT: number = 128_000;

const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^\s)]+(?:\s+"[^"]*")?\)/gu;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildEmojiAssetURL(
	folder: string,
	item: string,
	type: string,
): string {
	if (/^https?:\/\//u.test(item)) return item;
	const filename = item.endsWith(`.${type}`) ? item : `${item}.${type}`;
	return new URL(filename, `${folder.replace(/\/+$/u, "")}/`).href;
}

function applyEmojiAssetPrefix(item: string, prefix: string): string {
	if (/^https?:\/\//u.test(item) || !prefix || item.startsWith(prefix)) {
		return item;
	}
	return `${prefix}${item}`;
}

async function loadNotebookEmojiPack(
	source: string,
): Promise<GuestbookEmojiPack> {
	const folder = source.replace(/\/+$/u, "");
	const response = await fetch(`${folder}/info.json`);
	if (!response.ok) throw new Error(`表情包加载失败 (${response.status})`);

	const manifest: unknown = await response.json();
	if (!isRecord(manifest) || !Array.isArray(manifest.items)) {
		throw new Error("表情包配置格式不正确");
	}

	const items = manifest.items.filter(
		(item): item is string => typeof item === "string" && item.length > 0,
	);
	if (items.length === 0) throw new Error("表情包没有可用内容");

	const type =
		typeof manifest.type === "string" && manifest.type ? manifest.type : "png";
	const prefix = typeof manifest.prefix === "string" ? manifest.prefix : "";
	const iconName =
		typeof manifest.icon === "string" && manifest.icon
			? manifest.icon
			: items[0];

	return {
		name:
			typeof manifest.name === "string" && manifest.name
				? manifest.name
				: "Waline",
		icon: buildEmojiAssetURL(
			folder,
			applyEmojiAssetPrefix(iconName, prefix),
			type,
		),
		items: items.map((item) => ({
			key: `${prefix}${item}`,
			url: buildEmojiAssetURL(
				folder,
				applyEmojiAssetPrefix(item, prefix),
				type,
			),
		})),
	};
}

export async function loadNotebookEmojiPacks(
	sources: string[],
): Promise<GuestbookEmojiPack[]> {
	const settled = await Promise.allSettled(
		sources.filter(Boolean).map(loadNotebookEmojiPack),
	);
	const packs = settled.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);
	if (packs.length === 0) throw new Error("Waline 表情加载失败，请稍后重试");
	return packs;
}

export async function uploadNotebookImage(
	file: File,
	uploadURL: string,
): Promise<string> {
	if (!uploadURL) {
		if (file.size > WALINE_INLINE_IMAGE_SIZE_LIMIT) {
			throw new Error("Waline 原生图片不能超过 128 KB");
		}
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener("load", () => {
				if (typeof reader.result === "string") resolve(reader.result);
				else reject(new Error("图片读取失败，请重新选择"));
			});
			reader.addEventListener("error", () =>
				reject(new Error("图片读取失败，请重新选择")),
			);
			reader.readAsDataURL(file);
		});
	}
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(uploadURL, {
		method: "POST",
		headers: { Accept: "application/json" },
		body: formData,
	});
	const payload: unknown = await response.json().catch(() => null);
	const data =
		isRecord(payload) && isRecord(payload.data) ? payload.data : null;
	const links = data && isRecord(data.links) ? data.links : null;
	const url =
		(links && typeof links.url === "string" ? links.url : "") ||
		(data && typeof data.url === "string" ? data.url : "") ||
		(isRecord(payload) && typeof payload.url === "string" ? payload.url : "");

	if (!response.ok || !url) {
		const message =
			isRecord(payload) && typeof payload.message === "string"
				? payload.message
				: "图片上传失败，请稍后重试";
		throw new Error(message);
	}

	return url;
}

export function appendNotebookImage(
	content: string,
	attachment?: GuestbookImageAttachment | null,
): string {
	if (!attachment) return content;
	const alt = attachment.name.replace(/[[\]]/gu, "").trim() || "图片";
	const image = `![${alt}](${attachment.url})`;
	return content ? `${content}\n\n${image}` : image;
}

export function hasNotebookImage(content: string): boolean {
	MARKDOWN_IMAGE.lastIndex = 0;
	return MARKDOWN_IMAGE.test(content);
}

export function getNotebookTextLength(content: string): number {
	MARKDOWN_IMAGE.lastIndex = 0;
	return Array.from(content.replace(MARKDOWN_IMAGE, "").trim()).length;
}

export function normalizeNotebookTimestamp(value: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return Date.now();
	return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

import { htmlToMarkdown } from "@/utils/guestbook-chat";

const htmlToPlainText = htmlToMarkdown;

function normalizeNotebookLink(
	value: string | null | undefined,
): string | undefined {
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:"
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

function isAdminNick(nick: string, adminNicknames?: Set<string>): boolean {
	if (!adminNicknames || adminNicknames.size === 0) return false;
	if (adminNicknames.has(nick)) return true;
	const normalized = nick.trim().toLocaleLowerCase();
	for (const admin of adminNicknames) {
		if (admin.trim().toLocaleLowerCase() === normalized) return true;
	}
	return false;
}

export function buildNotebookBody(quote: NotebookQuote, body: string): string {
	const head = `>>NOTEBOOK>>${quote.id}||${quote.published}||${quote.excerpt.replace(/\n/gu, " ")}<<NOTEBOOK<<`;
	return `${head}\n${body}`;
}

export function parseNotebookQuote(comment: string): NotebookQuote | null {
	const m = comment.match(NOTEBOOK_QUOTE_RE);
	if (!m) return null;
	const [id, published, excerpt] = m[1].split("||");
	if (!id) return null;
	return { id, published: published ?? "", excerpt: excerpt ?? "" };
}

function decodeReplyNick(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function hasNotebookReplyMarker(value: string): boolean {
	NOTEBOOK_REPLY_RE.lastIndex = 0;
	return NOTEBOOK_REPLY_RE.test(value);
}

export function parseNotebookReplyMarker(raw: string): {
	body: string;
	replyToId?: string;
	replyToNick?: string;
} {
	const match = raw.match(NOTEBOOK_REPLY_RE);
	if (!match) return { body: raw };
	return {
		body: raw.replace(NOTEBOOK_REPLY_RE, "").trim(),
		replyToId: match[1],
		replyToNick: decodeReplyNick(match[2]),
	};
}

export function parseNotebookMessageBody(raw: string): {
	body: string;
	notebookQuote: NotebookQuote | null;
	momentQuote: NotebookQuote | null;
	replyToId?: string;
	replyToNick?: string;
} {
	let rest = raw.trim();
	let quote: NotebookQuote | null = null;
	const q = rest.match(NOTEBOOK_QUOTE_RE);
	if (q) {
		quote = parseNotebookQuote(rest);
		rest = rest.replace(NOTEBOOK_QUOTE_RE, "").trim();
	}
	const reply = parseNotebookReplyMarker(rest);
	if (reply.replyToId) {
		rest = reply.body;
		if (!quote) {
			const q2 = rest.match(NOTEBOOK_QUOTE_RE);
			if (q2) {
				quote = parseNotebookQuote(rest);
				rest = rest.replace(NOTEBOOK_QUOTE_RE, "").trim();
			}
		}
	}
	return {
		body: rest.trim(),
		notebookQuote: quote,
		momentQuote: quote,
		replyToId: reply.replyToId,
		replyToNick: reply.replyToNick,
	};
}

export function buildNotebookReplyBody(
	content: string,
	target: NotebookChatMessage | null,
): string {
	if (!target?.objectId) return content;
	const marker = `<!--notebook-reply:${target.objectId}:${encodeURIComponent(target.nick)}-->`;
	return `${marker}
@${target.nick} ${content}`;
}

export function buildNotebookEditedReplyBody(
	content: string,
	message: NotebookChatMessage,
): string {
	if (!message.replyToId) return content;
	const marker = `<!--notebook-reply:${message.replyToId}:${encodeURIComponent(message.replyToNick || "访客")}-->`;
	return `${marker}
${content}`;
}

export function normalizeNotebookComment(
	comment: WalineComment,
	adminNicknames?: Set<string>,
): NotebookChatMessage {
	const raw = comment.orig || htmlToPlainText(comment.comment);
	const parsed = parseNotebookMessageBody(raw);

	const nick = comment.nick || "匿名访客";
	const isAdmin =
		comment.type === "administrator" || isAdminNick(nick, adminNicknames);

	return {
		id: String(comment.objectId),
		objectId: comment.objectId,
		userId: comment.user_id,
		nick,
		avatar: comment.avatar || "",
		link: normalizeNotebookLink(comment.link),
		body: parsed.body,
		notebookQuote: parsed.notebookQuote,
		momentQuote: parsed.momentQuote,
		createdAt: normalizeNotebookTimestamp(comment.time),
		browser: comment.browser,
		os: comment.os,
		addr: comment.addr,
		label: comment.label,
		isAdmin,
		replyToId: parsed.replyToId,
		replyToNick: parsed.replyToNick,
		status: comment.status,
	};
}

export function flattenNotebookComments(
	roots: WalineRootComment[],
	adminNicknames?: Set<string>,
): NotebookChatMessage[] {
	return roots
		.flatMap((root) => [
			normalizeNotebookComment(root, adminNicknames),
			...root.children.map((c) => normalizeNotebookComment(c, adminNicknames)),
		])
		.sort((left, right) => left.createdAt - right.createdAt);
}

export function mergeNotebookMessages(
	current: NotebookChatMessage[],
	incoming: NotebookChatMessage[],
): NotebookChatMessage[] {
	const localMessages = current.filter((message) => message.localState);
	const serverMessages = new Map(
		current
			.filter((message) => !message.localState)
			.map((message) => [message.id, message]),
	);

	for (const message of incoming) {
		const existing = serverMessages.get(message.id);
		if (existing?.isAdmin && !message.isAdmin) {
			serverMessages.set(message.id, { ...message, isAdmin: true });
		} else {
			serverMessages.set(message.id, message);
		}
	}

	return [...serverMessages.values(), ...localMessages].sort(
		(left, right) => left.createdAt - right.createdAt,
	);
}

export function getNotebookErrorMessage(error: unknown): string {
	if (error instanceof DOMException && error.name === "AbortError") return "";
	if (error instanceof Error) {
		const message = error.message;
		if (/failed to fetch|networkerror|network request/iu.test(message)) {
			return "无法连接到留言服务，请检查网络后重试";
		}
		if (/(401|403|unauthorized|forbidden|token|登录)/iu.test(message)) {
			return "登录状态已失效，请重新登录";
		}
		if (/(429|too many|too fast|rate limit|频繁|太快)/iu.test(message)) {
			return "游客留言有频率限制，请稍后再试";
		}
		if (/(required|word|length|content|字数|内容)/iu.test(message)) {
			return "消息内容不符合留言服务要求，请检查后重试";
		}
	}
	return "留言服务暂时不可用，请稍后重试";
}

export function isNotebookAuthError(error: unknown): boolean {
	return (
		error instanceof Error &&
		/(401|403|unauthorized|forbidden|token|登录)/iu.test(error.message)
	);
}

export function getNotebookInitials(name: string): string {
	return Array.from(name.trim() || "访")
		.slice(0, 2)
		.join("")
		.toUpperCase();
}
