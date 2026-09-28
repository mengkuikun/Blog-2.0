import { getSortedPosts } from "@/utils/content-utils";
import { removeFileExtension } from "@/utils/url-utils";

export async function GET() {
	const posts = await getSortedPosts();

	const allPostsData = posts
		.map((post) => ({
			id: removeFileExtension(post.id),
			title: post.data.title,
			published: post.data.published.getTime(),
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData));
}
