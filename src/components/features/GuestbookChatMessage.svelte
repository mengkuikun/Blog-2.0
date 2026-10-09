<script lang="ts">
import {
	Ban,
	Check,
	Clock,
	Copy,
	Laptop,
	LoaderCircle,
	MapPin,
	Monitor,
	Pencil,
	Reply,
	RotateCcw,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { GuestbookChatMessage } from "@/types/guestbook-chat";
import type { MomentQuote } from "@/types/moment-chat";
import { getGuestbookInitials } from "@/utils/guestbook-chat";
import {
	renderGuestbookMessage,
	renderGuestbookQuotePreview,
} from "@/utils/guestbook-chat-markup";

interface Props {
	message: GuestbookChatMessage;
	referencedMessage?: GuestbookChatMessage;
	momentQuote?: MomentQuote | null;
	timeLabel: string;
	canManage: boolean;
	canAudit?: boolean;
	isEditing: boolean;
	isMutating: boolean;
	editDraft: string;
	actionError?: string;
	onReply: (message: GuestbookChatMessage) => void;
	onEdit: (message: GuestbookChatMessage) => void;
	onEditDraftChange: (draft: string) => void;
	onEditCancel: () => void;
	onEditSave: (message: GuestbookChatMessage) => void;
	onDelete: (message: GuestbookChatMessage) => void;
	onChangeStatus?: (
		message: GuestbookChatMessage,
		status: "approved" | "waiting" | "spam",
	) => void;
	onJump: (message: GuestbookChatMessage) => void;
	onRetry: (message: GuestbookChatMessage) => void;
	onDiscard: (message: GuestbookChatMessage) => void;
	onCopyError: (message: string) => void;
}

let {
	message,
	referencedMessage,
	momentQuote,
	timeLabel,
	canManage,
	canAudit = false,
	isEditing,
	isMutating,
	editDraft,
	actionError,
	onReply,
	onEdit,
	onEditDraftChange,
	onEditCancel,
	onEditSave,
	onDelete,
	onChangeStatus,
	onJump,
	onRetry,
	onDiscard,
	onCopyError,
}: Props = $props();

let copied = $state(false);
let auditMenuOpen = $state(false);

function handleWindowPointerdown(event: PointerEvent) {
	if (!auditMenuOpen) return;
	const target = event.target;
	if (!(target instanceof Node)) return;
	const wrap = document.getElementById(`guestbook-audit-menu-${message.id}`);
	if (wrap && !wrap.contains(target)) {
		auditMenuOpen = false;
	}
}

function formatMomentQuoteDate(value: string): string {
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value.slice(0, 10);
	return d.toISOString().slice(0, 10);
}

const quotePreview = $derived(
	referencedMessage
		? renderGuestbookQuotePreview(referencedMessage.body)
		: i18n(I18nKey.gbQuoteNotLoaded),
);
const renderedBody = $derived(renderGuestbookMessage(message.body));

async function copyMessage() {
	try {
		await navigator.clipboard.writeText(message.body);
		copied = true;
		window.setTimeout(() => (copied = false), 1600);
	} catch {
		onCopyError(i18n(I18nKey.gbCopyFailed));
	}
}
</script>

<svelte:window onpointerdown={handleWindowPointerdown} />

<article
	id={`guestbook-message-${message.id}`}
	class:is-admin={message.isAdmin}
	class:is-failed={message.localState === "failed"}
	class:is-sending={message.localState === "sending"}
	class="guestbook-message"
>
	{#if message.replyToId || message.replyToNick}
		<button
			class="guestbook-message__quote"
			type="button"
			onclick={() => onJump(message)}
			aria-label={i18n(I18nKey.gbJumpToQuoteAria).replace(
				"{nick}",
				message.replyToNick || i18n(I18nKey.gbVisitor),
			)}
			title={i18n(I18nKey.gbJumpToQuoteTitle)}
		>
			<span class="guestbook-message__quote-avatar" aria-hidden="true">
				<span>{getGuestbookInitials(referencedMessage?.nick || message.replyToNick || i18n(I18nKey.gbVisitor))}</span>
				{#if referencedMessage?.avatar}
					<img
						src={referencedMessage.avatar}
						alt=""
						loading="lazy"
						referrerpolicy="no-referrer"
						onerror={(event) =>
							((event.currentTarget as HTMLImageElement).style.display = "none")}
					/>
				{/if}
			</span>
			<span class="guestbook-message__quote-copy">
				<strong>@{message.replyToNick || i18n(I18nKey.gbVisitor)}</strong>
				<small>{@html quotePreview}</small>
			</span>
		</button>
	{:else if momentQuote}
		<div class="guestbook-message__quote" role="note" aria-label="引用的动态">
			<span class="guestbook-message__quote-copy">
				<strong>引用动态 · {formatMomentQuoteDate(momentQuote.published)}</strong>
				<small class="moment-quote__text">{momentQuote.excerpt}</small>
			</span>
		</div>
	{/if}

	<div class="guestbook-message__main">
		<div class="guestbook-message__avatar" aria-hidden="true">
			<span>{getGuestbookInitials(message.nick)}</span>
			{#if message.avatar}
				<img
					src={message.avatar}
					alt=""
					loading="lazy"
					referrerpolicy="no-referrer"
					onerror={(event) =>
						((event.currentTarget as HTMLImageElement).style.display = "none")}
				/>
			{/if}
		</div>

		<div class="guestbook-message__column">
			<div class="guestbook-message__heading">
				<span class="guestbook-message__author">
					{#if message.link}
						<a
							class="guestbook-message__author-link"
							href={message.link}
							target="_blank"
							rel="nofollow noopener noreferrer"
							title={i18n(I18nKey.gbVisitSiteTitle).replace(
								"{nick}",
								message.nick,
							)}
						>
							{message.nick}
						</a>
					{:else}
						<strong>{message.nick}</strong>
					{/if}
				</span>
				{#if message.isAdmin}
					<span class="guestbook-message__badge guestbook-message__badge--admin">{i18n(I18nKey.gbAdmin)}</span>
				{/if}
				{#if message.label}
					<span class="guestbook-message__badge">{message.label}</span>
				{/if}
				<time
					class="guestbook-message__time"
					datetime={new Date(message.createdAt).toISOString()}>{timeLabel}</time
				>
				{#if message.status === "waiting"}
					<span class="guestbook-message__badge guestbook-message__badge--waiting">{i18n(I18nKey.gbPendingReview)}</span>
				{:else if message.status === "spam"}
					<span class="guestbook-message__badge guestbook-message__badge--spam">{i18n(I18nKey.gbStatusSpam)}</span>
				{/if}
			</div>

			<div class="guestbook-message__bubble-row">
				<div class="guestbook-message__bubble">
					{#if isEditing}
						<textarea
							class="guestbook-message__edit-input"
							value={editDraft}
							oninput={(event) => onEditDraftChange(event.currentTarget.value)}
							maxlength="300"
							rows="4"
							disabled={isMutating}
							aria-label={i18n(I18nKey.gbEditMessageWithName).replace(
								"{nick}",
								message.nick,
							)}
						></textarea>
						<div class="guestbook-message__edit-actions">
							<span>{i18n(I18nKey.gbCharCount)
								.replace("{count}", String(editDraft.length))
								.replace("{max}", "300")}</span>
							<button type="button" onclick={onEditCancel} disabled={isMutating}>
								<X size={14} aria-hidden="true" />{i18n(I18nKey.cancel)}
							</button>
							<button
								type="button"
								onclick={() => onEditSave(message)}
								disabled={isMutating}
							>
								{#if isMutating}
									<LoaderCircle class="is-spinning" size={14} aria-hidden="true" />
								{:else}
									<Check size={14} aria-hidden="true" />
								{/if}
								{isMutating ? i18n(I18nKey.saving) : i18n(I18nKey.save)}
							</button>
						</div>
					{:else}
						<div class="guestbook-message__body">{@html renderedBody}</div>
					{/if}
				</div>

				{#if !message.localState && !isEditing}
					<div class="guestbook-message__tools" role="group" aria-label={i18n(I18nKey.gbMessageActionsAria)}>
						<button
							type="button"
							onclick={() => onReply(message)}
							aria-label={i18n(I18nKey.gbReplyAria).replace(
								"{nick}",
								message.nick,
							)}
							title={i18n(I18nKey.gbQuoteReply)}
						>
							<Reply size={15} aria-hidden="true" />
						</button>
						<button
							type="button"
							onclick={copyMessage}
							aria-label={copied
								? i18n(I18nKey.gbCopied)
								: i18n(I18nKey.gbCopyMessage)}
							title={copied
								? i18n(I18nKey.gbCopied)
								: i18n(I18nKey.gbCopyMessage)}
						>
							{#if copied}
								<Check size={15} aria-hidden="true" />
							{:else}
								<Copy size={15} aria-hidden="true" />
							{/if}
						</button>
						{#if canManage}
							<button
								type="button"
								onclick={() => onEdit(message)}
								aria-label={i18n(I18nKey.gbEditMessage)}
								title={i18n(I18nKey.gbEditMessage)}
								disabled={isMutating}
							>
								<Pencil size={15} aria-hidden="true" />
							</button>
							<button
								type="button"
								onclick={() => onDelete(message)}
								aria-label={i18n(I18nKey.gbDeleteMessage)}
								title={i18n(I18nKey.gbDeleteMessage)}
								disabled={isMutating}
							>
								<Trash2 size={15} aria-hidden="true" />
							</button>
						{/if}
						{#if canAudit && onChangeStatus}
							<div
								id={`guestbook-audit-menu-${message.id}`}
								class="guestbook-message__audit-menu-wrap"
							>
								<button
									type="button"
									class="guestbook-message__tool-btn--audit"
									class:is-active={auditMenuOpen}
									onclick={() => (auditMenuOpen = !auditMenuOpen)}
									aria-label="审核权限管理"
									title="审核权限管理"
									disabled={isMutating}
								>
									<ShieldCheck size={15} aria-hidden="true" />
								</button>

								{#if auditMenuOpen}
									<div
										class="guestbook-message__audit-popover"
										role="menu"
										aria-label="审核状态选项"
									>
										<button
											type="button"
											role="menuitem"
											class="guestbook-message__audit-popover-item guestbook-message__audit-popover-item--approved"
											class:is-active={!message.status || message.status === "approved"}
											onclick={() => {
												auditMenuOpen = false;
												onChangeStatus(message, "approved");
											}}
										>
											<Check size={13} aria-hidden="true" />
											<span>{i18n(I18nKey.gbStatusApproved)}</span>
										</button>
										<button
											type="button"
											role="menuitem"
											class="guestbook-message__audit-popover-item guestbook-message__audit-popover-item--waiting"
											class:is-active={message.status === "waiting"}
											onclick={() => {
												auditMenuOpen = false;
												onChangeStatus(message, "waiting");
											}}
										>
											<Clock size={13} aria-hidden="true" />
											<span>{i18n(I18nKey.gbStatusWaiting)}</span>
										</button>
										<button
											type="button"
											role="menuitem"
											class="guestbook-message__audit-popover-item guestbook-message__audit-popover-item--spam"
											class:is-active={message.status === "spam"}
											onclick={() => {
												auditMenuOpen = false;
												onChangeStatus(message, "spam");
											}}
										>
											<Ban size={13} aria-hidden="true" />
											<span>{i18n(I18nKey.gbStatusSpam)}</span>
										</button>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="guestbook-message__meta">
				{#if message.browser}
					<span><Monitor size={14} aria-hidden="true" />{message.browser}</span>
				{/if}
				{#if message.os}
					<span><Laptop size={14} aria-hidden="true" />{message.os}</span>
				{/if}
				{#if message.addr}
					<span><MapPin size={14} aria-hidden="true" />{message.addr}</span>
				{/if}
				{#if message.localState === "sending"}
					<span><LoaderCircle class="is-spinning" size={14} aria-hidden="true" />{i18n(I18nKey.sending)}</span>
				{/if}
			</div>

			{#if message.localState === "failed"}
				<div class="guestbook-message__failure" role="alert">
					<span>{message.failureReason}</span>
					<button type="button" onclick={() => onRetry(message)}>
						<RotateCcw size={14} aria-hidden="true" />{i18n(I18nKey.retry)}
					</button>
					<button type="button" onclick={() => onDiscard(message)}>
						<Trash2 size={14} aria-hidden="true" />{i18n(I18nKey.deleteLabel)}
					</button>
				</div>
			{/if}

			{#if actionError}
				<div class="guestbook-message__failure" role="alert">{actionError}</div>
			{/if}
		</div>
	</div>
</article>
