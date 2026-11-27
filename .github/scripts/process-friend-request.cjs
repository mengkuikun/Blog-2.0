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
	matchKeywords: ["imki.cn", "夢酷"],
};

function normalizeUrl(value) {
	if (!value) return "";
	try {
		return new URL(value.trim()).toString();
	} catch {
		return "";
	}
}

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

// 获取北京时间 YYYY-MM-DD（避免 UTC 跨天误差）
function getBeijingDate() {
	const now = new Date(Date.now() + 8 * 3600 * 1000);
	return now.toISOString().slice(0, 10);
}

// 清理文件名中的非法字符
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
		if (/^#+\s*网站名称/.test(line)) {
			pending = "site_name";
			continue;
		}
		if (/^#+\s*网站链接/.test(line)) {
			pending = "site_url";
			continue;
		}
		if (/^#+\s*头像链接/.test(line)) {
			pending = "avatar";
			continue;
		}
		if (/^#+\s*网站描述/.test(line)) {
			pending = "desc";
			continue;
		}
		if (/^#+\s*友链页面/.test(line)) {
			pending = "friend_page";
			continue;
		}
		if (/^#+\s*站点标签/.test(line)) {
			pending = "tags";
			continue;
		}

		if (pending) {
			assign(pending, line);
			pending = null;
		}
	}
	return data;
}

// 使用 Playwright 验证对方友链页是否包含本站反链
async function validateBacklink(pageUrl) {
	const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	let response = null;
	let lastError = "";

	try {
		for (let i = 0; i < 3; i++) {
			try {
				response = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
				if (response && response.ok()) break;
				lastError = `HTTP ${response ? response.status() : "unknown"}`;
			} catch (err) {
				lastError = err.message || "页面请求失败";
			}
			if (i < 2) await page.waitForTimeout(2000);
		}

		const actualUrl = page.url() || pageUrl;
		const statusCode = response ? response.status() : null;

		if (!response || !response.ok()) {
			return { ok: false, kind: "unreachable", actualUrl, statusCode, error: lastError };
		}

		await page.waitForTimeout(3000);
		const content = await page.content();
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll("a[href]")).map((a) => a.href)
		);
		const combined = `${content}\n${hrefs.join("\n")}`.toLowerCase();

		const hasBacklink = SITE_INFO.matchKeywords.some((kw) =>
			combined.includes(kw.toLowerCase())
		);

		if (!hasBacklink) {
			return { ok: false, kind: "missing-backlink", actualUrl, statusCode };
		}
		return { ok: true, actualUrl, statusCode };
	} finally {
		await browser.close();
	}
}

// 生成或更新 src/content/friends/ 下的 .md 文件（dryRun 时仅预览，不写入磁盘）
function writeFriendMarkdown(repoRoot, data, dryRun = false) {
	const friendsDir = path.join(repoRoot, FRIENDS_DIR_REL);
	const files = fs.existsSync(friendsDir)
		? fs.readdirSync(friendsDir).filter((f) => f.endsWith(".md"))
		: [];
	const targetHostUrl = trimTrailingSlash(data.site_url);

	// 1. 检查是否已存在相同 siteurl
	let existingFile = null;
	let maxPrefix = 0;

	for (const f of files) {
		const numMatch = f.match(/^(\d+)-/);
		if (numMatch) {
			maxPrefix = Math.max(maxPrefix, Number(numMatch[1]));
		}
		const raw = fs.readFileSync(path.join(friendsDir, f), "utf8");
		const urlMatch = raw.match(/^siteurl:\s*["']?([^"'\r\n]+)["']?/m);
		if (urlMatch && trimTrailingSlash(urlMatch[1].trim()) === targetHostUrl) {
			existingFile = f;
		}
	}

	const nextNum = String(maxPrefix + 1).padStart(2, "0");
	const fileName = existingFile || `${nextNum}-${sanitizeFileName(data.site_name)}.md`;
	const filePath = path.join(friendsDir, fileName);

	// 如果是已存在的文件，保留其原有的 added 日期与 group
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

	// 已关闭的 Issue 若有新评论（如感谢回复），不再重复处理
	if (issue.state === "closed" && context.payload.action !== "reopened") {
		console.log("Issue 已关闭，跳过处理。");
		return;
	}

	const { owner, repo } = context.repo;
	const issueNumber = issue.number;
	const body = issue.body || "";

	// 仅处理包含友链模板字段的 Issue
	if (!body.includes("### 网站名称") || !body.includes("### 网站链接")) {
		return;
	}

	// 如果是评论事件，屏蔽机器人自身评论，仅允许 Issue 发起者本人或仓库所有者回复触发重检
	if (context.eventName === "issue_comment") {
		const commentUser = context.payload.comment?.user;
		if (commentUser?.type === "Bot") return;
		const commenter = commentUser?.login;
		if (commenter !== issue.user?.login && commenter !== owner) {
			return;
		}
	}

	try {
		await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: ["验证中"] });

		const formData = parseIssueBody(body);
		if (!formData.site_name || !formData.site_url || !formData.avatar || !formData.friend_page) {
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: "❌ 友链信息不完整，或链接格式不正确（需以 `http://` 或 `https://` 开头），请编辑 Issue 补充完整。",
			});
			return;
		}

		const check = await validateBacklink(formData.friend_page);
		if (!check.ok) {
			const msg =
				check.kind === "missing-backlink"
					? `❌ **反链验证未通过**：未在你的友链页面检测到 \`${SITE_INFO.url}\`。\n\n请先添加本站友链信息：\n- **名称**：${SITE_INFO.name}\n- **链接**：${SITE_INFO.url}\n- **头像**：${SITE_INFO.avatar}\n- **描述**：${SITE_INFO.desc}\n\n💡 添加完成后，**直接在本 Issue 下回复任意评论**，机器人会自动重新检查！`
					: `❌ **页面访问失败**：无法访问 \`${formData.friend_page}\`（${check.error || check.statusCode}）。\n\n请确认页面可公网正常访问后，**在本 Issue 下回复任意评论**重新检查。`;

			await github.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body: msg });
			await github.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels: ["needs-update"] });
			return;
		}

		const isDryRun = process.env.DRY_RUN === "true";
		const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
		const result = writeFriendMarkdown(repoRoot, formData, isDryRun);

		if (isDryRun) {
			await github.rest.issues.createComment({
				owner,
				repo,
				issue_number: issueNumber,
				body: [
					`✅ **[演习模式] 反链验证通过！**（未写入仓库，仅预览生成结果）`,
					"",
					`- **检测页面**：\`${check.actualUrl}\``,
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

			for (const label of ["验证中", "needs-update"]) {
				await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label }).catch(() => {});
			}
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
			body: `✅ **验证通过！** 你的站点 **${formData.site_name}** 已成功加入友链（文件：\`${result.fileName}\`，收录日期：\`${result.addedDate}\`）。\n\nEdgeOne 将在 1~2 分钟内自动构建上线，感谢互链！`,
		});

		for (const label of ["验证中", "needs-update"]) {
			await github.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: label }).catch(() => {});
		}
		await github.rest.issues.update({
			owner,
			repo,
			issue_number: issueNumber,
			state: "closed",
			state_reason: "completed",
		});
	} catch (err) {
		await github.rest.issues.createComment({
			owner,
			repo,
			issue_number: issueNumber,
			body: `❌ 自动审批脚本执行出错：\`${err.message}\`，等待站长人工介入处理。`,
		});
		throw err;
	}
};

