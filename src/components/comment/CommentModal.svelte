<script lang="ts">
import { onMount } from "svelte";
import CommentSidebarDesktop from "./CommentSidebarDesktop.svelte";
import CommentSidebarMobile from "./CommentSidebarMobile.svelte";

interface Props {
	serverURL: string;
	adminNicknames?: string[];
}

let { serverURL, adminNicknames = ["夢酷"] }: Props = $props();

interface Comment {
	objectId: number;
	comment: string;
	nick: string;
	mail?: string;
	link?: string;
	avatar?: string;
	time: number;
	addr?: string;
	browser?: string;
	os?: string;
	pid?: number | null;
	rid?: number | null;
	children?: Comment[];
	reply_user?: { nick: string; link?: string; avatar?: string };
}

let dialogEl: HTMLDialogElement | undefined = $state();
let messagesEl: HTMLDivElement | undefined = $state();

let visible = $state(false);
let phase = $state<"loader" | "comments">("loader");
let currentMomentId = $state("");
let currentPath = $state("");

let comments: Comment[] = $state([]);
let flatComments: Array<Comment & { depth: number }> = $derived.by(() => {
	const result: Array<Comment & { depth: number }> = [];
	function walk(list: Comment[], depth: number) {
		// 按时间排序
		const sorted = [...list].sort((a, b) => a.time - b.time);
		for (const c of sorted) {
			result.push({ ...c, depth });
			if (c.children?.length) walk(c.children, depth + 1);
		}
	}
	walk(comments, 0);
	return result;
});

// 去重评论者列表
let commenters = $derived.by(() => {
	const map = new Map<
		string,
		{ nick: string; avatar: string; link?: string; count: number }
	>();
	for (const c of flatComments) {
		const existing = map.get(c.nick);
		if (existing) {
			existing.count++;
		} else {
			map.set(c.nick, {
				nick: c.nick,
				avatar: getAvatarSrc(c),
				link: c.link,
				count: 1,
			});
		}
	}
	return Array.from(map.values());
});

let sidebarOpen = $state(false);
let loading = $state(false);
let sending = $state(false);
let commentText = $state("");
let nickText = $state("");
let mailText = $state("");
let linkText = $state("");

let timerDone = false;
let dataLoaded = false;

declare global {
	interface Window {
		__commentModal?: { open: (momentId: string, commentPath: string) => void };
	}
}

onMount(() => {
	nickText = localStorage.getItem("comment-nick") || "";
	mailText = localStorage.getItem("comment-mail") || "";
	linkText = localStorage.getItem("comment-link") || "";
	window.__commentModal = { open };
	return () => {
		delete window.__commentModal;
	};
});

function tryShowComments() {
	if (timerDone && dataLoaded) {
		phase = "comments";
		setTimeout(() => scrollToBottom(false), 100);
	}
}

function scrollToBottom(smooth = true) {
	if (!messagesEl) return;
	messagesEl.scrollTo({
		top: messagesEl.scrollHeight,
		behavior: smooth ? "smooth" : "auto",
	});
}

function formatDate(timestamp: number): string {
	try {
		const d = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (minutes < 1) return "刚刚";
		if (minutes < 60) return `${minutes}分钟前`;
		if (hours < 24) return `${hours}小时前`;
		if (days < 30) return `${days}天前`;
		return d.toLocaleDateString("zh-CN");
	} catch {
		return "";
	}
}

function isAdmin(c: Comment): boolean {
	return adminNicknames.includes(c.nick);
}

function getQuotePreview(c: Comment): string {
	if (!c.pid) return "";
	// 在 flatComments 中找到被回复的评论
	const parent = flatComments.find((fc) => fc.objectId === c.pid);
	if (!parent) return "";
	// 提取纯文本预览（去掉 HTML 标签）
	const text = parent.comment.replace(/<[^>]*>/g, "").trim();
	return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

function getAvatarSrc(c: Comment): string {
	if (c.avatar) return c.avatar;
	if (c.mail) {
		let h = 0;
		const m = c.mail.trim().toLowerCase();
		for (let i = 0; i < m.length; i++) h = ((h << 5) - h + m.charCodeAt(i)) | 0;
		return `https://gravatar.loli.net/avatar/${Math.abs(h).toString(16).padStart(8, "0")}?d=mm`;
	}
	return "";
}

async function fetchComments() {
	if (!serverURL || !currentPath) {
		dataLoaded = true;
		tryShowComments();
		return;
	}
	loading = true;
	try {
		const res = await fetch(
			`${serverURL}/api/comment?path=${encodeURIComponent(currentPath)}&pageSize=100`,
		);
		const data = await res.json();
		comments = data.data?.data || [];
	} catch (err) {
		console.error("[CommentModal] fetch error:", err);
	} finally {
		loading = false;
		dataLoaded = true;
		tryShowComments();
	}
}

async function postComment() {
	if (!commentText.trim() || !nickText.trim() || sending) return;
	sending = true;
	try {
		localStorage.setItem("comment-nick", nickText);
		if (mailText) localStorage.setItem("comment-mail", mailText);
		if (linkText) localStorage.setItem("comment-link", linkText);
		const body = {
			comment: `<p>${commentText.replace(/\n/g, "</p><p>")}</p>`,
			nick: nickText,
			mail: mailText || "",
			link: linkText || "",
			url: currentPath,
			ua: navigator.userAgent,
		};
		const res = await fetch(`${serverURL}/api/comment`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const data = await res.json();
		if (data.data) {
			comments = [...comments, data.data];
			commentText = "";
			setTimeout(() => scrollToBottom(), 100);
		}
	} catch (err) {
		console.error("[CommentModal] post error:", err);
	} finally {
		sending = false;
	}
}

function handleInputKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		postComment();
	}
}

export function open(momentId: string, commentPath: string) {
	currentMomentId = momentId;
	currentPath = commentPath;
	phase = "loader";
	comments = [];
	commentText = "";
	timerDone = false;
	dataLoaded = false;
	visible = true;
	requestAnimationFrame(() => {
		if (dialogEl && !dialogEl.open) dialogEl.showModal();
	});
	setTimeout(() => fetchComments(), 100);
	setTimeout(() => {
		timerDone = true;
		tryShowComments();
	}, 2000);
}

function toggleSidebar() {
	sidebarOpen = !sidebarOpen;
}

function close() {
	if (dialogEl) dialogEl.close();
	visible = false;
	phase = "loader";
	sidebarOpen = false;
}
function handleDialogClose() {
	visible = false;
	phase = "loader";
}
function handleBackdropClick(e: MouseEvent) {
	if (e.target === dialogEl) close();
}
function handleDialogKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") close();
}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialogEl} class="comment-modal" onclose={handleDialogClose} onclick={handleBackdropClick} onkeydown={handleDialogKeydown}>
	<div class="modal-overlay">
		<div class="modal-card">
			<!-- 关闭按钮（卡片右上角） -->
			<button class="close-btn close-btn--absolute" onclick={close} aria-label="关闭">
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
			</button>

			<header class="chat-header">
				<div class="header-left">
					<span class="header-title">评论</span>
					<span class="header-count">{flatComments.length > 0 ? `${flatComments.length} 条` : ""}</span>
				</div>
				<div class="header-right">
					<button class="members-btn members-btn--mobile" onclick={toggleSidebar} aria-label="查看成员">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
						<span class="members-count">{commenters.length}</span>
					</button>
					<button class="close-btn close-btn--mobile" onclick={close} aria-label="关闭">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
					</button>
				</div>
			</header>
			<div class="chat-workspace">
				<!-- 加载动画 -->
				{#if phase === "loader"}
					<div class="loader-overlay">
						<div class="loader-wrap">
							<div class="loader">
								<span><span></span><span></span><span></span><span></span></span>
								<div class="base"><span></span><div class="face"></div></div>
							</div>
							<div class="longfazers"><span></span><span></span><span></span><span></span></div>
						</div>
					</div>
				{/if}

				<!-- 内容区 -->
				<div class="chat-body">
					<div class="chat-messages" class:is-visible={phase === "comments"} bind:this={messagesEl}>
						{#if flatComments.length === 0 && !loading && phase === "comments"}
							<div class="empty-state"><p>还没有评论，来抢沙发吧~</p></div>
						{/if}
						{#each flatComments as comment (comment.objectId)}
							<div class="msg" class:is-admin={isAdmin(comment)}>
								<div class="msg-row">
									<div class="msg-avatar">
										{#if getAvatarSrc(comment)}
											<img src={getAvatarSrc(comment)} alt={comment.nick} loading="lazy" />
										{:else}
											<span class="avatar-fallback">{comment.nick.charAt(0)}</span>
										{/if}
									</div>
									<div class="msg-col">
										<div class="msg-head">
											{#if comment.link}
												<a class="msg-nick msg-nick--link" href={comment.link} target="_blank" rel="noopener">{comment.nick}</a>
											{:else}
												<span class="msg-nick">{comment.nick}</span>
											{/if}
											{#if isAdmin(comment)}<span class="msg-badge">站长</span>{/if}
											<span class="msg-addr">{comment.addr || ""}</span>
										</div>
										<time class="msg-time">{formatDate(comment.time)}</time>
										<div class="msg-bubble">
											{#if comment.reply_user}
												<div class="msg-quote">
													<span class="msg-quote-nick">@{comment.reply_user.nick}</span>
													{#if getQuotePreview(comment)}
														<small class="msg-quote-preview">{getQuotePreview(comment)}</small>
													{/if}
												</div>
											{/if}
											<div class="msg-body">{@html comment.comment}</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
					<div class="chat-composer" class:is-visible={phase === "comments"}>
						<div class="composer-fields">
							<input type="text" class="field" placeholder="昵称" bind:value={nickText} />
							<input type="email" class="field" placeholder="邮箱（方便接收回复消息）" bind:value={mailText} />
							<input type="url" class="field" placeholder="网址（可选）" bind:value={linkText} />
						</div>
						<div class="composer-editor">
							<textarea class="composer-textarea" placeholder="说点什么..." rows="3" maxlength="300" bind:value={commentText} onkeydown={handleInputKeydown}></textarea>
							<div class="composer-footer">
								<span class="composer-count">{commentText.length}/300</span>
								<div class="composer-tools">
									<button class="send-btn" disabled={!commentText.trim() || !nickText.trim() || sending} onclick={postComment}>{sending ? "..." : "发送"}</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 侧边栏 -->
				<div class="sidebar-desktop">
					<CommentSidebarDesktop {commenters} />
				</div>
				<div class="sidebar-mobile">
					<CommentSidebarMobile {commenters} isOpen={sidebarOpen} onClose={toggleSidebar} />
				</div>
			</div>
		</div>
	</div>
</dialog>


<style>
	@reference "../../styles/main.css";

	/* ===================== 弹窗 ===================== */
	.comment-modal { padding: 0; border: none; background: transparent; }
	.comment-modal[open] {
		position: fixed; top: 0; left: 0; width: 100%; height: 100%;
		margin: 0; padding: 0; border: none; background: transparent; overflow: hidden;
	}
	.comment-modal::backdrop {
		background: rgba(0, 0, 0, 0.25);
		backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
	}
	.comment-modal[open]::backdrop { animation: fadeIn 0.2s ease; }
	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

	.modal-overlay {
		position: fixed; inset: 0;
		display: flex; align-items: center; justify-content: center;
	}

	/* ===================== 卡片 ===================== */
	.modal-card {
		position: relative;
		width: min(960px, 94vw); height: min(780px, 88vh);
		background: var(--guestbook-editor-bg);
		opacity: 0.92;
		border-radius: var(--radius-medium);
		border: 1px solid var(--line-divider);
		box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
		display: flex; flex-direction: column; overflow: hidden;
		animation: cardIn 0.2s ease;
	}
	:root.dark .modal-card { box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5); }
	@keyframes cardIn {
		from { opacity: 0; transform: scale(0.95) translateY(12px); }
		to { opacity: 1; transform: scale(1) translateY(0); }
	}

	/* ===================== 头部 ===================== */
	.chat-header {
		display: flex; align-items: center;
		padding: 12px 16px; flex-shrink: 0;
		background: var(--guestbook-editor-bg);
		border-bottom: 1px solid var(--line-divider);
	}
	.header-left {
		display: flex; align-items: center; gap: 0.5rem;
		flex: 1; min-width: 0;
	}
	.header-right {
		display: flex; align-items: center; gap: 0.5rem;
	}
	.header-title { font-size: 0.88rem; font-weight: 700; color: var(--deep-text); }
	.header-count { flex: 1; font-size: 0.76rem; color: var(--guestbook-muted); }
	.close-btn {
		display: grid; place-items: center;
		width: var(--control-size); height: var(--control-size);
		border-radius: var(--radius-small); border: none;
		background: transparent; color: var(--guestbook-muted);
		cursor: pointer; transition: background 0.15s;
	}
	.close-btn:hover { background: var(--guestbook-editor-hover); }
	.close-btn--absolute {
		position: absolute; top: 0.75rem; right: 0.75rem; z-index: 10;
	}
	.close-btn--mobile {
		display: none;
	}

	.members-btn {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 4px 8px; border: none; border-radius: var(--radius-small);
		background: transparent; color: var(--guestbook-muted);
		font-size: 0.75rem; cursor: pointer;
		transition: background 0.15s;
	}
	.members-btn:hover { background: var(--guestbook-editor-hover); }
	.members-btn--mobile { display: none; }
	.members-count { font-weight: 600; }

	/* ===================== 工作区（消息 + 侧边栏） ===================== */
	.chat-workspace {
		flex: 1; display: grid;
		grid-template-columns: 1fr 11rem;
		min-height: 0; overflow: hidden;
	}

	/* 桌面端显示，移动端隐藏 */
	.sidebar-desktop { min-height: 0; overflow: hidden; }
	.sidebar-mobile { display: none; }

	/* ===================== 内容区 ===================== */
	.chat-body {
		min-width: 0; min-height: 0;
		display: flex; flex-direction: column; overflow: hidden;
	}

	/* ===================== 加载动画 ===================== */
	.loader-overlay {
		position: absolute; inset: 0;
		z-index: 20;
		display: flex; align-items: center; justify-content: center;
		background: var(--guestbook-editor-bg);
	}

	/* ===================== 消息列表 ===================== */
	.chat-messages {
		flex: 1; min-height: 0; overflow-y: auto;
		padding: var(--space-3) clamp(var(--space-3), 3vw, 1.75rem) var(--space-6);
		opacity: 0; transition: opacity 0.3s ease;
		scrollbar-gutter: stable;
	}
	.chat-messages.is-visible { opacity: 1; }

	.empty-state {
		display: flex; align-items: center; justify-content: center;
		height: 100%; color: var(--guestbook-muted); font-size: 0.88rem;
		opacity: 0.7;
	}

	/* ===================== 单条评论（留言板样式） ===================== */
	.msg {
		display: flex; align-items: flex-start;
		gap: var(--space-3); width: 100%;
		margin-bottom: calc(var(--space-5) + 1.25rem);
		position: relative;
	}
	.msg.is-admin { flex-direction: row-reverse; }

	.msg-row { display: flex; align-items: flex-start; gap: var(--space-3); width: 100%; }
	.msg.is-admin .msg-row { flex-direction: row-reverse; }

	/* 日期（整个卡片居中，气泡上方） */
	.msg-time {
		position: absolute;
		left: 50%; transform: translateX(-50%);
		top: 0;
		font-size: 0.72rem; color: var(--guestbook-muted);
		white-space: nowrap;
	}

	/* 头像 */
	.msg-avatar {
		position: relative; display: grid; place-items: center;
		flex: 0 0 auto;
		width: var(--guestbook-avatar-size); height: var(--guestbook-avatar-size);
		overflow: hidden;
		border: 1px solid var(--guestbook-line);
		border-radius: var(--radius-full);
		background: var(--guestbook-panel);
		color: var(--guestbook-muted);
		font-size: 0.7rem; font-weight: 700;
	}
	.msg-avatar img {
		position: absolute; inset: 0;
		width: 100%; height: 100%; object-fit: cover;
	}
	.avatar-fallback {
		width: 100%; height: 100%;
		display: flex; align-items: center; justify-content: center;
	}

	/* 内容列 */
	.msg-col { flex: 1; min-width: 0; padding-top: 1.25rem; }
	.msg.is-admin .msg-col { display: flex; flex-direction: column; align-items: flex-end; }

	/* 昵称行 */
	.msg-head {
		display: flex; align-items: center; flex-wrap: wrap;
		gap: var(--space-1);
		min-height: 1.375rem; margin-bottom: var(--space-1);
		color: var(--guestbook-muted); font-size: 0.76rem;
	}
	.msg.is-admin .msg-head { justify-content: flex-end; }
	.msg-nick { font-size: 0.88rem; font-weight: 700; color: var(--deep-text); text-decoration: none; }
	.msg-nick--link { color: var(--guestbook-link); }
	.msg-nick--link:hover { text-decoration: underline; }
	.msg-badge {
		display: inline-flex; align-items: center;
		padding: 0 6px; height: 1.125rem;
		border-radius: var(--radius-small);
		background: var(--primary); color: #fff;
		font-size: 0.625rem; font-weight: 600;
	}
	:root.dark .msg-badge { color: #000; }
	.msg-addr { opacity: 0.6; }

	/* 气泡（包含引用 + 正文） */
	.msg-bubble {
		position: relative; width: fit-content; max-width: 85%;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-medium);
		background: var(--guestbook-bubble);
		color: var(--guestbook-bubble-text);
		line-height: 1.65;
	}
	.msg.is-admin .msg-bubble {
		background: var(--guestbook-admin-bubble);
		color: var(--guestbook-admin-text);
	}

	/* 引用（气泡内部） */
	.msg-quote {
		position: relative; display: block; width: 100%;
		min-height: var(--control-size);
		margin: 0 0 var(--space-2);
		padding: var(--space-2) calc(var(--space-4) + 1rem) var(--space-2) var(--space-2);
		border: 0; border-left: 3px solid currentColor;
		border-radius: var(--radius-small);
		background: transparent; color: inherit;
		text-align: left; opacity: 0.78;
	}
	.msg-quote-nick {
		display: block; margin-bottom: var(--space-1);
		font-size: 0.75rem; font-weight: 700;
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.msg-quote-preview {
		display: block; font-size: 0.72rem;
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}

	/* 正文 */
	.msg-body :global(p) { margin: 0; overflow-wrap: anywhere; font-size: 0.95rem; }
	.msg-body :global(p + p) { margin-top: var(--space-2); }
	.msg-body :global(a) {
		color: inherit; text-decoration: underline;
		text-underline-offset: var(--space-1);
	}
	.msg-body :global(img) { max-width: 100%; }
	.msg-body :global(img.wl-emoji) {
		display: inline-block; width: 1.75em; height: 1.75em;
		object-fit: contain; vertical-align: middle;
	}

	/* ===================== 输入框（留言板编辑器样式） ===================== */
	.chat-composer {
		flex-shrink: 0;
		position: relative; overflow: hidden; min-width: 0;
		padding: var(--space-3) var(--space-4) var(--space-2);
		background: var(--guestbook-editor-bg);
		border-top: 1px solid var(--line-divider);
		opacity: 0; transition: opacity 0.3s ease;
	}
	.chat-composer.is-visible { opacity: 1; }

	.composer-fields { display: flex; gap: var(--space-2); margin-bottom: var(--space-2); }
	.field {
		flex: 1; padding: 7px 10px;
		border: 2px solid var(--guestbook-editor-line);
		border-radius: var(--radius-medium);
		background: transparent; color: var(--guestbook-editor-text);
		font-size: 0.8125rem; outline: none;
		transition: border-color 0.16s;
	}
	.field::placeholder { color: var(--guestbook-editor-muted); opacity: 0.68; }
	.field:focus { border-color: var(--guestbook-focus); }

	.composer-editor {
		position: relative; overflow: visible; min-width: 0;
		border: 2px solid var(--guestbook-editor-line);
		border-radius: var(--radius-medium);
		background: transparent; color: var(--guestbook-editor-text);
		transition: border-color 0.16s;
	}
	.composer-editor:focus-within { border-color: var(--guestbook-focus); }

	.composer-textarea {
		display: block; width: 100%;
		min-height: 4rem; max-height: min(30dvh, 14rem);
		resize: none; padding: var(--space-3);
		border: 0; outline: 0; background: transparent;
		color: var(--guestbook-editor-text);
		font: inherit; font-size: 0.9rem; line-height: 1.5;
	}
	.composer-textarea::placeholder { color: var(--guestbook-editor-muted); opacity: 0.68; }

	.composer-footer {
		display: flex; align-items: center; justify-content: space-between;
		gap: var(--space-2); min-height: 2.75rem;
		padding: var(--space-1) var(--space-2);
	}
	.composer-count {
		font-size: 0.72rem; color: var(--guestbook-muted);
	}
	.composer-tools { display: flex; align-items: center; gap: var(--space-1); }

	.send-btn {
		display: inline-flex; align-items: center; justify-content: center;
		gap: var(--space-1);
		min-height: 2.25rem; padding: 0 0.625rem;
		border: 1px solid var(--guestbook-send-bg);
		border-radius: var(--radius-small);
		background: var(--guestbook-send-bg);
		color: var(--guestbook-send-text);
		font-size: 0.78rem; cursor: pointer;
		transition: background-color 0.18s, color 0.18s;
	}
	.send-btn:hover:not(:disabled) {
		background: transparent; color: var(--guestbook-editor-text);
	}
	.send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

	/* ===================== 侧边栏（评论成员） ===================== */
	/* 桌面端：侧边栏始终显示 */

	/* ===================== 响应式 ===================== */
	@media (max-width: 640px) {
		.modal-overlay { align-items: flex-end; }
		.modal-card {
			width: 100vw; height: 72vh;
			border-radius: var(--radius-medium) var(--radius-medium) 0 0;
		}
		@keyframes cardIn {
			from { opacity: 0; transform: translateY(100%); }
			to { opacity: 1; transform: translateY(0); }
		}
		/* 移动端：隐藏桌面侧边栏，显示移动端侧边栏 */
		.chat-workspace { grid-template-columns: 1fr; }
		.sidebar-desktop { display: none; }
		.sidebar-mobile { display: block; }
		.close-btn--absolute { display: none; }
		.members-btn--mobile { display: inline-flex; }
		.close-btn--mobile {
			display: flex;
			width: 28px; height: 28px;
			align-items: center; justify-content: center;
		}
		.chat-header { padding: 10px 14px; }
		.chat-messages { padding: var(--space-2) var(--space-3) var(--space-4); }
		.chat-composer { padding: var(--space-2) var(--space-3) var(--space-1); }
		.composer-fields { flex-direction: column; gap: 4px; }
		.msg-col { max-width: 80%; }
		.msg-bubble { max-width: 100%; }
		.msg-time { font-size: 0.625rem; }
	}

	/* ===================== 赛车动画 ===================== */
	.loader-wrap { position: relative; width: 300px; height: 120px; overflow: visible; }
	.loader { position: absolute; top: 50%; left: 50%; margin-left: -50px; margin-top: -10px; animation: speeder 0.4s linear infinite; }
	.loader > span { height: 5px; width: 35px; background: var(--deep-text); position: absolute; top: -19px; left: 60px; border-radius: 2px 10px 1px 0; }
	.base span { position: absolute; width: 0; height: 0; border-top: 6px solid transparent; border-right: 100px solid var(--deep-text); border-bottom: 6px solid transparent; }
	.base span:before { content: ""; height: 22px; width: 22px; border-radius: 50%; background: var(--deep-text); position: absolute; right: -110px; top: -16px; }
	.base span:after { content: ""; position: absolute; width: 0; height: 0; border-top: 0 solid transparent; border-right: 55px solid var(--deep-text); border-bottom: 16px solid transparent; top: -16px; right: -98px; }
	.face { position: absolute; height: 12px; width: 20px; background: var(--deep-text); border-radius: 20px 20px 0 0; transform: rotate(-40deg); right: -125px; top: -15px; }
	.face:after { content: ""; height: 12px; width: 12px; background: var(--deep-text); right: 4px; top: 7px; position: absolute; transform: rotate(40deg); transform-origin: 50% 50%; border-radius: 0 0 0 2px; }
	.loader > span > span:nth-child(1), .loader > span > span:nth-child(2), .loader > span > span:nth-child(3), .loader > span > span:nth-child(4) { width: 30px; height: 1px; background: var(--deep-text); position: absolute; animation: fazer1 0.2s linear infinite; }
	.loader > span > span:nth-child(2) { top: 3px; animation: fazer2 0.4s linear infinite; }
	.loader > span > span:nth-child(3) { top: 1px; animation: fazer3 0.4s linear infinite; animation-delay: -1s; }
	.loader > span > span:nth-child(4) { top: 4px; animation: fazer4 1s linear infinite; animation-delay: -1s; }
	@keyframes fazer1 { 0% { left: 0; } 100% { left: -80px; opacity: 0; } }
	@keyframes fazer2 { 0% { left: 0; } 100% { left: -100px; opacity: 0; } }
	@keyframes fazer3 { 0% { left: 0; } 100% { left: -50px; opacity: 0; } }
	@keyframes fazer4 { 0% { left: 0; } 100% { left: -150px; opacity: 0; } }
	@keyframes speeder { 0% { transform: translate(2px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -3px) rotate(-1deg); } 20% { transform: translate(-2px, 0px) rotate(1deg); } 30% { transform: translate(1px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 3px) rotate(-1deg); } 60% { transform: translate(-1px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-2px, -1px) rotate(1deg); } 90% { transform: translate(2px, 1px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
	.longfazers { position: absolute; width: 100%; height: 100%; }
	.longfazers span { position: absolute; height: 2px; width: 20%; background: var(--deep-text); opacity: 0.3; }
	.longfazers span:nth-child(1) { top: 20%; animation: lf 0.6s linear infinite; animation-delay: -5s; }
	.longfazers span:nth-child(2) { top: 40%; animation: lf2 0.8s linear infinite; animation-delay: -1s; }
	.longfazers span:nth-child(3) { top: 60%; animation: lf3 0.6s linear infinite; }
	.longfazers span:nth-child(4) { top: 80%; animation: lf4 0.5s linear infinite; animation-delay: -3s; }
	@keyframes lf { 0% { left: 200%; } 100% { left: -200%; opacity: 0; } }
	@keyframes lf2 { 0% { left: 200%; } 100% { left: -200%; opacity: 0; } }
	@keyframes lf3 { 0% { left: 200%; } 100% { left: -100%; opacity: 0; } }
	@keyframes lf4 { 0% { left: 200%; } 100% { left: -100%; opacity: 0; } }
</style>
