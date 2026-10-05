type DetectBuildPlatformOptions = {
	env?: Record<string, string | undefined>;
	isCI?: boolean;
	ciName?: string | null;
	isDev?: boolean;
	unknownBuildPlatform?: string;
};

// 支持通过环境变量手动覆盖构建平台名称
const BUILD_PLATFORM_OVERRIDE_KEY = "FIREFLY_BUILD_PLATFORM";

function hasNonEmptyEnv(
	env: Record<string, string | undefined>,
	key: string,
): boolean {
	const value = env[key];
	return typeof value === "string" && value.trim() !== "";
}

/**
 * 检测当前博客构建平台
 * 生产环境托管在 EdgeOne Pages 时，优先根据 EDGEONE_PROJECT_ID 自动识别
 */
export function detectBuildPlatform(
	options: DetectBuildPlatformOptions = {},
): string {
	const env = options.env || process.env;
	const isDev =
		options.isDev !== undefined ? options.isDev : import.meta.env.DEV;
	const unknownBuildPlatform = options.unknownBuildPlatform || "Unknown CI";

	// 1. 显式环境变量覆盖最优先
	const overrideValue = env[BUILD_PLATFORM_OVERRIDE_KEY];
	if (typeof overrideValue === "string" && overrideValue.trim() !== "") {
		return overrideValue.trim();
	}

	// 2. 传入的 ciName（如果有）
	if (options.ciName?.trim()) {
		return options.ciName.trim();
	}

	// 3. 常见平台特征环境变量检测
	if (hasNonEmptyEnv(env, "EDGEONE_PROJECT_ID")) {
		return "EdgeOne Pages";
	}
	if (env.GITHUB_ACTIONS === "true") {
		return "GitHub Actions";
	}
	if (env.VERCEL === "1") {
		return "Vercel";
	}
	if (env.CF_PAGES === "1") {
		return "Cloudflare Pages";
	}
	if (env.NETLIFY === "true") {
		return "Netlify";
	}

	// 4. 通用 CI 环境变量
	if (options.isCI || env.CI === "true" || env.CI === "1") {
		return unknownBuildPlatform;
	}

	// 5. 本地环境
	return isDev ? "Local Dev" : "Local";
}
