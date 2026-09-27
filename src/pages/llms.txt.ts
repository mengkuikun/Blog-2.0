import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";

export const prerender = true;

export async function GET(context: APIContext): Promise<Response> {
	const base = context.site ?? new URL(siteConfig.site_url);
	const abs = (path: string) => new URL(url(path), base).href;

	const posts = await getSortedPosts();

	const lines: string[] = [
		`# ${siteConfig.title}`,
		`> ${siteConfig.description || siteConfig.subtitle || ""}`,
		"",
		"## Posts",
	];
	for (const post of posts) {
		const link = abs(`/posts/${post.id}/`);
		const desc = post.data.description || "";
		lines.push(
			desc
				? `- [${post.data.title}](${link}): ${desc}`
				: `- [${post.data.title}](${link})`,
		);
	}

	const body = `${lines.join("\n")}\n`;
	// 前置 UTF-8 BOM：静态托管或编辑器对无 BOM 的 .txt 默认按本地编码解码，BOM 可避免中文乱码。
	return new Response(`\uFEFF${body}`, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}