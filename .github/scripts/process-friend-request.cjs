const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { URL } = require("node:url");
const { chromium } = require("playwright");

const FRIENDS_DIR_REL = "src/content/friends";

// 本站信息（以 imki.cn 为主）
const SITE_INFO = {
	name: "夢酷",
	url: "https://imki.cn",
	avatar: "https://imki.cn/avatar.jpg",
	desc: "Crafting Dreams In Code.",
	targetHost: "imki.cn",
	forbiddenHosts: ["imki.cn", "mengku.shop"],
};

const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// 状态标签定义
const LABELS = {
	CHECKING: "验证中",
	NEEDS_UPDATE: "needs-update",
	AVATAR_OK: "头像可达",
	AVATAR_BAD: "头像不可达",
	SITE_OK: "网站可达",
	SITE_BAD: "网站不可达",
	ALL_OK: "URL全部可达",
	BIDIR: "双向链接验证",
	BIDIR_OK: "双向链接验证通过",
};

const LABEL_COLORS = {
	[LABELS.CHECKING]: "fbca04",
	[LABELS.NEEDS_UPDATE]: "d93f0b",
	[LABELS.AVATAR_OK]: "0e8a16",
	[LABELS.AVATAR_BAD]: "b60205",
	[LABELS.SITE_OK]: "0e8a16",
	[LABELS.SITE_BAD]: "b60205",
	[LABELS.ALL_OK]: "1d76db",
	[LABELS.BIDIR]: "5319e7",
	[LABELS.BIDIR_OK]: "0e8a16",
};

function normalizeUrl(value) {
	if (!value) return "";
	try {
		const u = new URL(value.trim());
		if (u.protocol !== "http:" && u.protocol !== "https:") return "";
		return u.toString();
	} catch {
		return "";
	}
}

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

function getCleanHost(urlStr) {
	try {
		return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, "");
	} catch {
		return "";
	}
}

// 判断是否为同站点（相同主域名或互为子域名）
function isSameSite(siteUrl, friendPageUrl) {
	const siteHost = getCleanHost(siteUrl);
	const pageHost = getCleanHost(friendPageUrl);
	if (!siteHost || !pageHost) return false;
	return (
		siteHost === pageHost ||
		pageHost.endsWith(`.${siteHost}`) ||
		siteHost.endsWith(`.${pageHost}`)
	);
}

// 检查是否指向本站域名
function isSelfSite(urlStr) {
	const host = getCleanHost(urlStr);
	if (!host) return false;
	return SITE_INFO.forbiddenHosts.some(
		(fh) => host === fh || host.endsWith(`.${fh}`),
	);
}

// 防 SSRF：拦截本地回环与内网 IP
function validateSafePublicUrl(urlStr) {
	try {
		const u = new URL(urlStr);
		if (u.protocol !== "http:" && u.protocol !== "https:") {
			return { ok: false, error: "仅支持 http/https 协议" };
		}
		const h = u.hostname.toLowerCase();
		if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]") {
			return { ok: false, error: "禁止填写本地回环地址" };
		}
		if (
			/^10\./.test(h) ||
			/^192\.168\./.test(h) ||
			/^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
			/^169\.254\./.test(h)
		) {
			return { ok: false, error: "禁止填写内网私有 IP" };
		}
		return { ok: true };
	} catch {
		return { ok: false, error: "无效的 URL 格式" };
	}
}

// 获取北京时间 YYYY-MM-DD（避免 UTC 跨天误差）
function getBeijingDate() {
	const now = new Date(Date.now() + 8 * 3600 * 1000);
	return now.toISOString().slice(0, 10);
}

function sanitizeFileName(name) {
	const cleaned = String(name)
		.trim()
		.replace(/[\\/:*?"<>|\s]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return cleaned || "friend";
}

// 解析 Issue Form 正文
function parseIssueBody(body) {
	const data = {
		site_name: "",
		site_url: "",
		avatar: "",
		desc: "",
		friend_page: "",
		tags: ["Blog"],
	};

	const lines = body.split(/\r?\n/).map((l) => l.trim());
	let pending = null;

	const assign = (field, val) => {
		if (!val || val === "_No response_") return;
		const v = val.trim();
		if (field === "site_name") data.site_name = v;
		else if (field === "site_url") data.site_url = normalizeUrl(v);
		else if (field === "avatar") data.avatar = normalizeUrl(v);
		else if (field === "desc") data.desc = v;
		else if (field === "friend_page") data.friend_page = normalizeUrl(v);
		else if (field === "tags") {
			const parsed = v
				.split(/[,，、]+/)
				.map((t) => t.trim())
				.filter(Boolean);
			if (parsed.length > 0) data.tags = parsed;
		}
	};

	for (const line of lines) {
		if (!line) continue;
		if (/^#+\s*网站名称/.test(line)) { pending = "site_name"; continue; }
		if (/^#+\s*网站链接/.test(line)) { pending = "site_url"; continue; }
		if (/^#+\s*头像链接/.test(line)) { pending = "avatar"; continue; }
		if (/^#+\s*网站描述/.test(line)) { pending = "desc"; continue; }
		if (/^#+\s*友链页面/.test(line)) { pending = "friend_page"; continue; }
		if (/^#+\s*站点标签/.test(line)) { pending = "tags"; continue; }

		if (pending) {
			assign(pending, line);
			pending = null;
		}
	}
	return data;
}

// 轻量 fetch 请求（带超时与 SSRF 防护）
async function fastFetch(url, timeoutMs = 12000) {
	const safeCheck = validateSafePublicUrl(url);
	if (!safeCheck.ok) return { ok: false, error: safeCheck.error };

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			method: "GET",
			redirect: "follow",
			headers: {
				"user-agent": USER_AGENT,
				accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
				"accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
			},
			signal: controller.signal,
		});
		const body = await res.text();
		return {
			ok: res.status >= 200 && res.status < 400,
			status: res.status,
			body,
			url: res.url,
		};
	} catch (err) {
		return { ok: false, error: err.name === "AbortError" ? "请求超时" : err.message };
	} finally {
		clearTimeout(timer);
	}
}

// 精确匹配 HTML / 链接列表中的 <a href> 是否指向本站域名 (imki.cn)
function matchBacklinkInHtmlOrLinks(html, hrefList = []) {
	const candidateLinks = [...hrefList];

	if (html) {
		const patterns = [/href\s*=\s*["']([^"']+)["']/gi, /href\s*=\s*([^\s>]+)/gi];
		for (const re of patterns) {
			let m;
			while ((m = re.exec(html)) !== null) {
				if (m[1]) candidateLinks.push(m[1].trim());
			}
		}
	}

	for (const rawHref of candidateLinks) {
		try {
			const u = new URL(rawHref);
			if (u.protocol !== "http:" && u.protocol !== "https:") continue;
			const h = u.hostname.toLowerCase().replace(/^www\./, "");
			if (h === SITE_INFO.targetHost || h.endsWith(`.${SITE_INFO.targetHost}`)) {
				return { found: true, matchedHref: rawHref };
			}
		} catch {
			/* 忽略相对路径或无效 href */
		}
	}
	return { found: false };
}

// 检测头像/站点 URL 可达性（fetch 优先，站点链接若被拦截则用 Playwright 兜底）
async function checkReachability(url, allowBrowserFallback = false) {
	const fast = await fastFetch(url, 12000);
	if (fast.ok) return { ok: true, status: fast.status, via: "fetch" };
	if (!allowBrowserFallback) return fast;

	const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	try {
		const context = await browser.newContext({ userAgent: USER_AGENT });
		const page = await context.newPage();
		const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
		const status = res ? res.status() : 0;
		return {
			ok: status >= 200 && status < 400,
			status,
			error: status ? `HTTP ${status}` : "无法连接",
			via: "playwright",
		};
	} catch (err) {
		return { ok: false, error: err.message || "浏览器访问失败" };
	} finally {
		await browser.close();
	}
}

// 双向链接验证：fetch 优先 -> 未找到或需 JS 渲染时 Playwright 兜底
async function validateBacklink(pageUrl) {
	const fast = await fastFetch(pageUrl, 12000);
	if (fast.ok) {
		const check = matchBacklinkInHtmlOrLinks(fast.body);
		if (check.found) {
			return { ok: true, actualUrl: fast.url || pageUrl, statusCode: fast.status, matchedHref: check.matchedHref, via: "fetch" };
		}
	}

	// Playwright 渲染兜底（应对 SPA / 动态渲染友链页或反爬）
	const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	try {
		const context = await browser.newContext({ userAgent: USER_AGENT });
		const page = await context.newPage();
		let response = null;
		let lastError = "";

		for (let i = 0; i < 2; i++) {
			try {
				response = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
				if (response && response.ok()) break;
				lastError = `HTTP ${response ? response.status() : "unknown"}`;
			} catch (err) {
				lastError = err.message || "页面请求失败";
			}
			if (i < 1) await page.waitForTimeout(2000);
		}

		const actualUrl = page.url() || pageUrl;
		const statusCode = response ? response.status() : null;

		if (!response || !response.ok()) {
			return { ok: false, kind: "unreachable", actualUrl, statusCode, error: lastError || fast.error };
		}

		await page.waitForTimeout(3000);
		const content = await page.content();
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll("a[href]")).map((a) => a.href),
		);
		const check = matchBacklinkInHtmlOrLinks(content, hrefs);
		if (!check.found) {
			return { ok: false, kind: "missing-backlink", actualUrl, statusCode };
		}
		return { ok: true, actualUrl, statusCode, matchedHref: check.matchedHref, via: "playwright" };
	} finally {
		await browser.close();
	}
}

// 确保仓库存在指定标签并更新互斥状态标签
async function syncLabels(github, owner, repo, issueNumber, { add = [], remove = [] }) {
	const currentRes = await github.rest.issues.get({ owner, repo, issue_number: issueNumber });
	const currentSet = new Set((currentRes.data.labels || []).map((l) => l.name));

	for (const name of add) {
		if (!LABEL_COLORS[name]) continue;
		try {
			await github.rest.issues.getLabel({ owner, repo, name });
		} catch (e) {
			if (e.status === 404) {
				await github.rest.issues
					.createLabel({ owner, repo, name, color: LABEL_COLORS[name] })
					.catch(() => {});
			}
		}
	}

	for (const name of remove) {
		if (currentSet.has(name) && !add.includes(name)) {
			await github.rest.issues
				.removeLabel({ owner, repo, issue_number: issueNumber, name })
				.catch(() => {});
		}
	}

	const toAdd = add.filter((name) => !currentSet.has(name));
	if (toAdd.length > 0) {
		await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: toAdd });
	}
}

// 生成或更新 src/content/friends/ 下的 .md 文件（dryRun 时仅预览）
function writeFriendMarkdown(repoRoot, data, dryRun = false) {
	const friendsDir = path.join(repoRoot, FRIENDS_DIR_REL);
	const files = fs.existsSync(friendsDir)
		? fs.readdirSync(friendsDir).filter((f) => f.endsWith(".md"))
		: [];
	const targetHostUrl = trimTrailingSlash(data.site_url);

	let existingFile = null;
	let maxPrefix = 0;

	for (const f of files) {
		const numMatch = f.match(/^(\d+)-/);
		if (numMatch) maxPrefix = Math.max(maxPrefix, Number(numMatch[1]));
		const raw = fs.readFileSync(path.join(friendsDir, f), "utf8");
		const urlMatch = raw.match(/^siteurl:\s*["']?([^"'\r\n]+)["']?/m);
		if (urlMatch && trimTrailingSlash(urlMatch[1].trim()) === targetHostUrl) {
			existingFile = f;
		}
	}

	const nextNum = String(maxPrefix + 1).padStart(2, "0");
	const fileName = existingFile || `${nextNum}-${sanitizeFileName(data.site_name)}.md`;
	const filePath = path.join(friendsDir, fileName);

	let addedDate = getBeijingDate();
	let group = "other";
	if (existingFile) {
		const oldRaw = fs.readFileSync(filePath, "utf8");
		const oldAdded = oldRaw.match(/^added:\s*(.+)$/m);
		const oldGroup = oldRaw.match(/^group:\s*(.+)$/m);
		if (oldAdded) addedDate = oldAdded[1].trim();
		if (oldGroup) group = oldGroup[1].trim();
	}

	const yamlEscape = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	const tagsLines = data.tags.map((t) => `  - ${yamlEscape(t)}`);

	const mdContent = [
		"---",
		`title: ${yamlEscape(data.site_name)}`,
		`imgurl: ${data.avatar}`,
		`desc: ${yamlEscape(data.desc)}`,
		`siteurl: ${trimTrailingSlash(data.site_url)}`,
		"tags:",
		...tagsLines,
		"weight: 0",
		"enabled: true",
		`added: ${addedDate}`,
		`group: ${group}`,
		"---",
		"",
	].join("\n");

	if (!dryRun) {
		fs.mkdirSync(friendsDir, { recursive: true });
		fs.writeFileSync(filePath, mdContent, "utf8");
	}
	return { fileName, addedDate, isUpdate: Boolean(existingFile), mdContent };
}

function runGit(args, cwd) {
	const res = spawnSync("git", args, { cwd, stdio: "inherit" });
	if (res.status !== 0) {
		throw new Error(`git ${args.join(" ")} 失败，退出码 ${res.status}`);
	}
}

module.exports = async function ({ github, context }) {
	const issue = context.payload.issue;
	if (!issue) return;

	if (issue.state === "closed" && context.payload.action !== "reopened") {
		console.log("Issue 已关闭，跳过处理。");
		return;
	}

	const { owner, repo } = context.repo;
	const issueNumber = issue.number;
	const body = issue.body || "";

	if (!body.includes("### 网站名称") || !body.includes("### 网站链接")) {
		return;
	}

	if (context.eventName === "issue_comment") {
		const commentUser = context.payload.comment?.user;
		if (commentUser?.type === "Bot") return;
		const commenter = commentUser?.login;
		if (commenter !== issue.user?.login && commenter !== owner) return;
	}

	try {
		await syncLabels(github, owner, repo, issueNumber, { add: [LABELS.CHECKING] });

		const formData = parseIssueBody(body);
		if (!formData.site_name || !formData.site_url || !formData.avatar || !formData.friend_page) {
			await syncLabels(github, owner, repo, issueNumber, {
				add: [LABELS.NEEDS_UPDATE],
				remove: [LABELS.CHECKING],
			});
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: "❌ 友链信息不完整或链接协议不合法（仅支持 `http://` 或 `https://`），请编辑 Issue 补充完整。",
			});
			return;
		}

		// 门禁 1：禁止填本站域名（防自指）
		if (isSelfSite(formData.site_url) || isSelfSite(formData.friend_page)) {
			await syncLabels(github, owner, repo, issueNumber, {
				add: [LABELS.NEEDS_UPDATE],
				remove: [LABELS.CHECKING],
			});
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: `❌ **链接填写错误**：检测到网站链接或友链页面指向了本站（\`${SITE_INFO.targetHost}\`），请填写**你自己的网站域名与友链页**！`,
			});
			return;
		}

		// 门禁 2：强制同域名校验（防止借用他人站点蒙混过关）
		if (!isSameSite(formData.site_url, formData.friend_page)) {
			await syncLabels(github, owner, repo, issueNumber, {
				add: [LABELS.NEEDS_UPDATE],
				remove: [LABELS.CHECKING],
			});
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: [
					"❌ **域名校验未通过**：**「友链页面 URL」必须与「网站链接」属于同一域名**（不允许填写他人站点页面）。",
					"",
					`- 网站链接域名：\`${getCleanHost(formData.site_url)}\``,
					`- 友链页面域名：\`${getCleanHost(formData.friend_page)}\``,
					"",
					"请修改 Issue 表单内容后，回复任意评论重新验证。",
				].join("\n"),
			});
			return;
		}

		// 门禁 3：头像与网站链接可达性探测
		const [avatarCheck, siteCheck] = await Promise.all([
			checkReachability(formData.avatar, false),
			checkReachability(formData.site_url, true),
		]);

		const reachAdd = [
			avatarCheck.ok ? LABELS.AVATAR_OK : LABELS.AVATAR_BAD,
			siteCheck.ok ? LABELS.SITE_OK : LABELS.SITE_BAD,
		];
		const reachRemove = [
			LABELS.AVATAR_OK,
			LABELS.AVATAR_BAD,
			LABELS.SITE_OK,
			LABELS.SITE_BAD,
			LABELS.ALL_OK,
		];

		if (!avatarCheck.ok || !siteCheck.ok) {
			await syncLabels(github, owner, repo, issueNumber, {
				add: [...reachAdd, LABELS.NEEDS_UPDATE],
				remove: [...reachRemove, LABELS.CHECKING],
			});
			const errLines = [];
			if (!avatarCheck.ok) errLines.push(`- **头像链接不可达**：\`${formData.avatar}\`（${avatarCheck.error || avatarCheck.status}）`);
			if (!siteCheck.ok) errLines.push(`- **网站链接不可达**：\`${formData.site_url}\`（${siteCheck.error || siteCheck.status}）`);
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: `❌ **资源可达性检查未通过**：\n${errLines.join("\n")}\n\n请确保你的网站与头像可以正常访问后，**在本 Issue 下回复任意评论**重新检测！`,
			});
			return;
		}

		await syncLabels(github, owner, repo, issueNumber, {
			add: [...reachAdd, LABELS.ALL_OK, LABELS.BIDIR],
			remove: reachRemove,
		});

		// 门禁 4：双向链接验证（精确校验 <a href> 中是否包含 imki.cn）
		const check = await validateBacklink(formData.friend_page);
		if (!check.ok) {
			await syncLabels(github, owner, repo, issueNumber, {
				add: [LABELS.BIDIR, LABELS.NEEDS_UPDATE],
				remove: [LABELS.CHECKING, LABELS.BIDIR_OK],
			});
			const msg =
				check.kind === "missing-backlink"
					? `❌ **双向链接验证未通过**：未在你的友链页面找到指向 \`${SITE_INFO.url}\` 的超链接（\`<a href="...">\`）。\n\n请先添加本站友链信息：\n- **名称**：${SITE_INFO.name}\n- **链接**：${SITE_INFO.url}\n- **头像**：${SITE_INFO.avatar}\n- **描述**：${SITE_INFO.desc}\n\n💡 添加完成后，**直接在本 Issue 下回复任意评论**，机器人会自动重新检查！`
					: `❌ **友链页面无法访问**：\`${formData.friend_page}\`（${check.error || check.statusCode}）。\n\n请确认页面可公网正常访问后，**在本 Issue 下回复任意评论**重新检查。`;

			await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: msg });
			return;
		}

		// 所有检测全部通过！
		const isDryRun = process.env.DRY_RUN === "true";
		const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
		const result = writeFriendMarkdown(repoRoot, formData, isDryRun);

		await syncLabels(github, owner, repo, issueNumber, {
			add: [LABELS.BIDIR_OK],
			remove: [LABELS.CHECKING, LABELS.NEEDS_UPDATE, LABELS.BIDIR],
		});

		if (isDryRun) {
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: [
					"✅ **[演习模式] 全部 4 道校验已通过！**（未写入仓库，仅预览生成结果）",
					"",
					`- **检测方式**：\`${check.via}\``,
					`- **匹配反链**：\`${check.matchedHref}\``,
					`- **目标文件**：\`${FRIENDS_DIR_REL}/${result.fileName}\``,
					`- **操作类型**：${result.isUpdate ? "更新已有友链" : "新增友链"}`,
					"",
					"即将生成的 Markdown 内容：",
					"```markdown",
					result.mdContent.trimEnd(),
					"```",
					"",
					"💡 确认无误后，将 `.github/workflows/friend-link-checker.yml` 中的 `DRY_RUN` 改为 `\"false\"` 即可正式上线！",
				].join("\n"),
			});
			return;
		}

		runGit(["config", "user.name", "github-actions[bot]"], repoRoot);
		runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], repoRoot);
		runGit(["add", FRIENDS_DIR_REL], repoRoot);

		const hasDiff = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: repoRoot }).status !== 0;
		if (hasDiff) {
			const actionText = result.isUpdate ? "更新" : "添加";
			runGit(["commit", "-m", `feat(friends): 自动${actionText}友链 ${formData.site_name}`], repoRoot);
			runGit(["pull", "--rebase", "origin", "main"], repoRoot);
			runGit(["push", "origin", "HEAD:main"], repoRoot);
		}

		await github.rest.issues.createComment({
			owner,
			repo,
			issue_number: issueNumber,
			body: `✅ **全部验证通过！** 你的站点 **${formData.site_name}** 已成功加入友链（文件：\`${result.fileName}\`，收录日期：\`${result.addedDate}\`）。\n\nEdgeOne 将在 1~2 分钟内自动构建上线，感谢互链！`,
		});

		await github.rest.issues.update({
			owner,
			repo,
			issue_number: issueNumber,
			state: "closed",
			state_reason: "completed",
		});
	} catch (err) {
		await syncLabels(github, owner, repo, issueNumber, {
			remove: [LABELS.CHECKING],
		}).catch(() => {});
		await github.rest.issues.createComment({
			owner,
			repo,
			issue_number: issueNumber,
			body: `❌ 自动审批脚本执行出错：\`${err.message}\`，等待站长人工介入处理。`,
		});
		throw err;
	}
};
