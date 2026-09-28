import { loadRenderers } from "astro:container";
import { render } from "astro:content";
import { getContainerRenderer as getMDXRenderer } from "@astrojs/mdx/container-renderer";
import { getSortedPosts } from "@utils/content-utils";
import { removeFileExtension, url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import sanitizeHtml from "sanitize-html";
import { profileConfig, siteConfig } from "@/config";
import pkg from "../../package.json";

export const prerender = true;

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

function escapeXml(str: string): string {
	return stripInvalidXmlChars(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

// 正文用 CDATA 原样保留，并安全处理内容中可能出现的 "]]>"（如代码块）。
function cdataWrapped(text: string): string {
	return `<![CDATA[${text.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET(context: APIContext): Promise<Response> {
	const blog = await getSortedPosts();
	const renderers = await loadRenderers([getMDXRenderer()]);
	const container = await AstroContainer.create({ renderers });

	const site = context.site ?? new URL(siteConfig.site_url);
	const toAbsoluteUrl = (path: string) =>
		new URL(path.startsWith("/") ? path : `/${path}`, site).href;

	const entries: string[] = [];
	let latestUpdated: Date | null = null;
	for (const post of blog) {
		const link = url(`/posts/${removeFileExtension(post.id)}/`);
		const published = post.data.published;
		if (latestUpdated === null || published > latestUpdated) {
			latestUpdated = published;
		}
		const entryUrl = toAbsoluteUrl(link);

		const { Content } = await render(post);
		const rawContent = await container.renderToString(Content);
		const cleanedContent = stripInvalidXmlChars(rawContent);
		const contentHtml = sanitizeHtml(cleanedContent, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
		});

		entries.push(
			`    <entry>
      <id>${escapeXml(entryUrl)}</id>
      <title type="text">${escapeXml(post.data.title)}</title>
      <published>${published.toISOString()}</published>
      <updated>${published.toISOString()}</updated>
      <author><name>${escapeXml(profileConfig.name)}</name></author>
      <link rel="alternate" href="${escapeXml(entryUrl)}"/>
      <summary type="text">${escapeXml(post.data.description || "")}</summary>
      <content type="html">${cdataWrapped(contentHtml)}</content>
    </entry>`,
		);
	}

	const feedUpdated = latestUpdated ?? new Date();
	const siteRoot = toAbsoluteUrl("/");
	const selfLink = toAbsoluteUrl("atom.xml");

	const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(siteRoot)}</id>
  <title type="text">${escapeXml(siteConfig.title)}</title>
  <subtitle type="text">${escapeXml(siteConfig.subtitle || siteConfig.description || "")}</subtitle>
  <updated>${feedUpdated.toISOString()}</updated>
  <author><name>${escapeXml(profileConfig.name)}</name></author>
  <link rel="alternate" href="${escapeXml(siteRoot)}"/>
  <link rel="self" href="${escapeXml(selfLink)}"/>
  <generator uri="https://github.com/CuteLeaf/Firefly">${escapeXml(`Firefly v${pkg.version}`)}</generator>
${entries.join("\n")}
</feed>
`;

	return new Response(xml, {
		headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
	});
}