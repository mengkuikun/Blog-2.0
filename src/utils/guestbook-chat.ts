import type { WalineComment, WalineRootComment } from "@waline/api";
import type {
	GuestbookChatMessage,
	GuestbookEmojiPack,
	GuestbookImageAttachment,
} from "@/types/guestbook-chat";

const REPLY_MARKER = /^<!--guestbook-reply:(\d+):([^>]*)-->\s*/u;
const MARKDOWN_IMAGE = /!\[[^\]]*\]\([^\s)]+(?:\s+"[^"]*")?\)/gu;
export const WALINE_INLINE_IMAGE_SIZE_LIMIT = 128_000;

export function hasGuestbookReplyMarker(value: string): boolean {
	return REPLY_MARKER.test(value);
}

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

async function loadGuestbookEmojiPack(
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

export async function loadGuestbookEmojiPacks(
	sources: string[],
): Promise<GuestbookEmojiPack[]> {
	const settled = await Promise.allSettled(
		sources.filter(Boolean).map(loadGuestbookEmojiPack),
	);
	const packs = settled.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);
	if (packs.length === 0) throw new Error("Waline 表情加载失败，请稍后重试");
	return packs;
}

export async function uploadGuestbookImage(
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

export function appendGuestbookImage(
	content: string,
	attachment?: GuestbookImageAttachment | null,
): string {
	if (!attachment) return content;
	const alt = attachment.name.replace(/[[\]]/gu, "").trim() || "图片";
	const image = `![${alt}](${attachment.url})`;
	return content ? `${content}\n\n${image}` : image;
}

export function hasGuestbookImage(content: string): boolean {
	MARKDOWN_IMAGE.lastIndex = 0;
	return MARKDOWN_IMAGE.test(content);
}

export function getGuestbookTextLength(content: string): number {
	MARKDOWN_IMAGE.lastIndex = 0;
	return Array.from(content.replace(MARKDOWN_IMAGE, "").trim()).length;
}

export function normalizeGuestbookTimestamp(value: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return Date.now();
	return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function decodeReplyNick(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parseGuestbookMessageBody(raw: string): {
	body: string;
	replyToId?: string;
	replyToNick?: string;
	marker?: string;
} {
	const match = raw.match(REPLY_MARKER);
	if (!match) return { body: raw.trim() };

	const replyToNick = decodeReplyNick(match[2]);
	const withoutMarker = raw.replace(REPLY_MARKER, "").trim();
	// 旧版把「@昵称 」写进了正文，新数据改由服务端 pid 承载，这里补掉前缀才能新旧一致
	const mention = `@${replyToNick} `;

	return {
		body: withoutMarker.startsWith(mention)
			? withoutMarker.slice(mention.length).trim()
			: withoutMarker,
		replyToId: match[1],
		replyToNick,
		marker: match[0],
	};
}

/**
 * 将 Waline 服务端下发的 HTML（当未登录访客缺失 comment.orig 原始 Markdown 字段时）
 * 还原为兼容富文本/表情包/图片的 Markdown 格式，防止表情图片丢失导致空白气泡。
 */
export function htmlToMarkdown(value: string): string {
	if (!value) return "";
	if (typeof DOMParser === "undefined") return value;
	const doc = new DOMParser().parseFromString(value, "text/html");

	function walk(node: Node): string {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || "";
		}
		if (node.nodeType === Node.COMMENT_NODE) {
			return `<!--${node.nodeValue || ""}-->`;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return "";
		}

		const el = node as HTMLElement;
		const tag = el.tagName.toLowerCase();
		if (["script", "style", "iframe", "object", "embed"].includes(tag)) {
			return "";
		}

		const children = Array.from(el.childNodes).map(walk).join("");

		switch (tag) {
			case "p":
			case "div":
				return `${children}\n\n`;
			case "br":
				return "\n";
			case "li":
				return `- ${children.trim()}\n`;
			case "ul":
			case "ol":
				return `\n${children}\n`;
			case "img": {
				const src = el.getAttribute("src") || "";
				if (!src) return "";
				const rawAlt =
					el.getAttribute("alt") || el.getAttribute("title") || "表情";
				const alt = rawAlt.replace(/[[\]]/gu, "").trim() || "表情";
				return `![${alt}](${src})`;
			}
			case "a": {
				const href = el.getAttribute("href") || "";
				if (!href) return children;
				const text = children.trim() || href;
				const safeText = text.replace(/[[\]]/gu, "").trim() || href;
				return `[${safeText}](${href})`;
			}
			case "strong":
			case "b":
				return children ? `**${children}**` : "";
			case "em":
			case "i":
				return children ? `*${children}*` : "";
			case "del":
			case "s":
				return children ? `~~${children}~~` : "";
			case "code":
				if (el.parentElement?.tagName.toLowerCase() === "pre") {
					return children;
				}
				return children ? `\`${children}\`` : "";
			case "pre":
				return `\n\`\`\`\n${children.trim()}\n\`\`\`\n`;
			case "blockquote":
				return `\n> ${children.trim()}\n`;
			default:
				return children;
		}
	}

	return walk(doc.body)
		.replace(/\n{3,}/gu, "\n\n")
		.trim();
}

export const htmlToPlainText: (value: string) => string = htmlToMarkdown;

function normalizeGuestbookLink(
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

export function normalizeGuestbookComment(
	comment: WalineComment,
	adminNicknames?: Set<string>,
): GuestbookChatMessage {
	const parsed = parseGuestbookMessageBody(
		comment.orig || htmlToPlainText(comment.comment),
	);

	const nick = comment.nick || "匿名访客";
	const isAdmin =
		comment.type === "administrator" || isAdminNick(nick, adminNicknames);

	// 引用关系优先取服务端的 pid（真回复，会触发邮件通知），历史数据才回退到正文里的注释标记
	const rawComment = comment as unknown as {
		pid?: string | number | null;
		rid?: string | number | null;
		reply_user?: { nick?: string } | string | null;
		at?: string | null;
	};
	const nativeReply = rawComment.pid ? String(rawComment.pid) : null;
	const replyNickFromUser =
		typeof rawComment.reply_user === "object" && rawComment.reply_user !== null
			? rawComment.reply_user.nick
			: typeof rawComment.reply_user === "string"
				? rawComment.reply_user
				: rawComment.at;

	return {
		id: String(comment.objectId),
		objectId: comment.objectId,
		rootId:
			typeof rawComment.rid === "number"
				? rawComment.rid
				: typeof comment.objectId === "number"
					? comment.objectId
					: undefined,
		userId: comment.user_id,
		nick,
		avatar: comment.avatar || "",
		link: normalizeGuestbookLink(comment.link),
		body: parsed.body,
		createdAt: normalizeGuestbookTimestamp(comment.time),
		browser: comment.browser,
		os: comment.os,
		addr: comment.addr,
		label: comment.label,
		isAdmin,
		replyToId: nativeReply ?? parsed.replyToId,
		replyToNick: nativeReply
			? (replyNickFromUser ?? parsed.replyToNick)
			: parsed.replyToNick,
		legacyReplyMarker: nativeReply ? undefined : parsed.marker,
		status: comment.status,
	};
}

/**
 * 智能补全/还原回复引用关系：
 * 当普通访客未登录管理员时，Waline 默认不向普通用户下发 comment.orig 字段，
 * 导致原始 HTML 注释 <!--guestbook-reply:id:nick--> 丢失。
 * 此时通过消息正文开头的 @昵称 与上下文历史消息进行倒序匹配，
 * 自动还原出精准的 replyToId 与 replyToNick，使普通访客也能看到完整的回复引用 UI。
 */
export function resolveGuestbookReplies(
	messages: GuestbookChatMessage[],
): GuestbookChatMessage[] {
	const sorted = [...messages].sort(
		(left, right) => left.createdAt - right.createdAt,
	);

	for (let i = 0; i < sorted.length; i++) {
		const msg = sorted[i];

		// 如果已有 replyToId，确保 replyToNick 完整
		if (msg.replyToId) {
			if (!msg.replyToNick) {
				const target = sorted.find(
					(candidate) => candidate.id === msg.replyToId,
				);
				if (target) msg.replyToNick = target.nick;
			}
			continue;
		}

		// 检查正文是否以 @昵称 开头（回复的标准格式）
		const atMatch = msg.body.match(/^@([^\s@\n]+)(?:\s+|$)/u);
		if (!atMatch) continue;

		const targetNick = atMatch[1].trim();
		if (!targetNick) continue;

		// 在该消息发布之前的历史消息中，倒序查找该昵称最近发布的消息
		let targetMessage: GuestbookChatMessage | undefined;
		for (let j = i - 1; j >= 0; j--) {
			if (sorted[j].nick === targetNick) {
				targetMessage = sorted[j];
				break;
			}
		}

		if (targetMessage) {
			msg.replyToId = targetMessage.id;
			msg.replyToNick = targetMessage.nick;
		} else {
			// 若更早的历史消息尚未分页加载到本地，先记录目标昵称
			msg.replyToNick = targetNick;
		}
	}

	return sorted;
}

export function flattenGuestbookComments(
	roots: WalineRootComment[],
	adminNicknames?: Set<string>,
): GuestbookChatMessage[] {
	const flattened = roots
		.flatMap((root) => [
			normalizeGuestbookComment(root, adminNicknames),
			...root.children.map((c) => normalizeGuestbookComment(c, adminNicknames)),
		])
		.sort((left, right) => left.createdAt - right.createdAt);

	return resolveGuestbookReplies(flattened);
}

export function mergeGuestbookMessages(
	current: GuestbookChatMessage[],
	incoming: GuestbookChatMessage[],
): GuestbookChatMessage[] {
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

	const merged = [...serverMessages.values(), ...localMessages].sort(
		(left, right) => left.createdAt - right.createdAt,
	);

	return resolveGuestbookReplies(merged);
}

export function buildGuestbookReplyFields(
	target: GuestbookChatMessage | null,
): { pid?: number; rid?: number } {
	if (!target?.objectId) return {};
	const pid = target.objectId;
	return { pid, rid: target.rootId ?? pid };
}

export function buildGuestbookMessageBody(
	content: string,
	target: GuestbookChatMessage | null,
): string {
	if (!target?.objectId) return content;
	const marker = `<!--guestbook-reply:${target.objectId}:${encodeURIComponent(target.nick)}-->`;
	return `${marker}\n@${target.nick} ${content}`;
}

export function buildGuestbookEditedMessageBody(
	content: string,
	message: GuestbookChatMessage,
): string {
	if (!message.legacyReplyMarker) return content;
	return `${message.legacyReplyMarker}\n${content}`;
}

export function getGuestbookErrorMessage(error: unknown): string {
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

export function isGuestbookAuthError(error: unknown): boolean {
	return (
		error instanceof Error &&
		/(401|403|unauthorized|forbidden|token|登录)/iu.test(error.message)
	);
}

export function getGuestbookInitials(name: string): string {
	return Array.from(name.trim() || "访")
		.slice(0, 2)
		.join("")
		.toUpperCase();
}
