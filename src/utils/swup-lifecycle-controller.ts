import { expressiveCodeConfig, siteConfig } from "@/config";
import { BANNER_HEIGHT_HOME } from "@/constants/constants";
import { pathsEqual, url } from "@/utils/url-utils";
import { initCustomScrollbar } from "./scrollbar-utils";
import { updateSidebarComponentsVisibility } from "./sidebar-utils";
import { updateMainGridCols } from "./grid-layout-utils";

declare global {
	interface Window {
		__momentsScrollState?: { observer: IntersectionObserver | null };
		__resetChangelogScroll?: () => void;
	}
}

/**
 * Initialize the Swup lifecycle hooks for page transitions.
 * Registers all Swup hooks: link:click, content:replace, visit:start,
 * page:view, and visit:end.
 */
export function initSwupLifecycle(): void {
	const bannerEnabled = !!document.getElementById("wallpaper-wrapper");
	let bannerAnimCtrl: AbortController | null = null;
	const mainContentTop = "5.5rem";

	const syncMainContentTop = (isHome: boolean) => {
		// 目标是 absolute 定位的外层容器（main-content-wrapper 的祖先）
		const outerWrapper = document.querySelector(
			".no-banner-layout.absolute",
		) as HTMLElement | null;
		if (!outerWrapper) return;
		outerWrapper.style.top = isHome ? "0" : mainContentTop;
	};

	const setup = () => {
		window.swup.hooks.on(
			"link:click",
			(visit: { to?: { url: string } }, { el }: { el: HTMLAnchorElement }) => {
				// Remove the delay for the first time page load
				document.documentElement.style.setProperty("--content-delay", "0ms");

				// Same-page links don't need transition protection
				const targetHref = el.getAttribute("href") || "";
				const targetPathname = (() => {
					try {
						return new URL(targetHref, window.location.origin).pathname;
					} catch {
						return targetHref;
					}
				})();
				const isSamePage = pathsEqual(targetPathname, window.location.pathname);
				if (!isSamePage) {
					// Add page transition protection to prevent navbar flicker
					document.documentElement.classList.add("is-page-transitioning");
				}

				// When navigating to music page, immediately hide sidebar components
				const toPath = visit?.to?.url || targetPathname;
				if (toPath === "/music/" || toPath === "/music") {
					document.documentElement.classList.add("is-navigating-to-music");
				}

				// Simplified navbar handling
				if (bannerEnabled) {
					const navbar = document.getElementById("navbar-wrapper");
					if (navbar) {
						const threshold =
							window.innerHeight * (BANNER_HEIGHT_HOME / 100) - 88;
						if (document.documentElement.scrollTop >= threshold) {
							navbar.classList.add("navbar-hidden");
						}
					}
				}
			},
		);

		// Merged content:replace hook (previously 2 separate hooks)
		window.swup.hooks.on("content:replace", () => {
			// Remove music page transition class
			document.documentElement.classList.remove("is-navigating-to-music");

			// Switch layout classes here to avoid banner height jump during visit:start
			const bodyElement = document.querySelector("body");
			const isHome = pathsEqual(window.location.pathname, url("/"));

			if (isHome) {
				bodyElement?.classList.add("lg:is-home");
				document.documentElement.classList.add("lg:is-home");
			} else {
				bodyElement?.classList.remove("lg:is-home");
				document.documentElement.classList.remove("lg:is-home");
			}

			// Home page layout dynamic switching
			const mainGrid = document.getElementById("main-grid");
			if (mainGrid) {
				const gridCarrier = document.getElementById("grid-class-carrier");
				const carrierGridClass = gridCarrier?.getAttribute("data-grid-class");

				if (isHome) {
					[
						"grid-cols-1",
						"md:grid-cols-[17.5rem_1fr]",
						"md:grid-cols-[1fr_17.5rem]",
						"xl:grid-cols-[17.5rem_1fr_17.5rem]",
					].forEach((cls) => {
						mainGrid.classList.remove(cls);
					});
					mainGrid.classList.add("grid-cols-1");
				} else if (carrierGridClass) {
					[
						"grid-cols-1",
						"md:grid-cols-[17.5rem_1fr]",
						"md:grid-cols-[1fr_17.5rem]",
						"xl:grid-cols-[17.5rem_1fr_17.5rem]",
					].forEach((cls) => {
						mainGrid.classList.remove(cls);
					});
					carrierGridClass.split(" ").forEach((cls) => {
						if (cls) mainGrid.classList.add(cls);
					});
				} else {
					updateMainGridCols();
				}

				// 2. Remove max-width and padding constraints on home page
				const parentWrapper = mainGrid.parentElement;
				if (parentWrapper) {
					if (isHome) {
						parentWrapper.style.maxWidth = "none";
						mainGrid.style.paddingLeft = "0";
						mainGrid.style.paddingRight = "0";
					} else {
						parentWrapper.style.maxWidth = "";
						mainGrid.style.paddingLeft = "";
						mainGrid.style.paddingRight = "";
					}
				}

				// 3. Update main content area positioning
				const mainContentWrapper = document.getElementById(
					"main-content-wrapper",
				);
				if (mainContentWrapper) {
					mainContentWrapper.classList.remove(
						"col-span-1",
						"xl:col-start-2",
						"xl:col-end-3",
						"md:col-span-2",
					);
					if (isHome) {
						mainContentWrapper.classList.add("col-span-1");
					} else {
						mainContentWrapper.classList.add("xl:col-start-2", "xl:col-end-3");
					}
				}
				syncMainContentTop(isHome);

				// 4. Update footer
				const footer = mainGrid.querySelector(".footer");
				if (footer) {
					footer.classList.remove(
						"col-span-1",
						"md:col-span-2",
						"xl:col-start-2",
						"xl:col-span-1",
					);
					if (isHome) {
						footer.classList.add("col-span-1");
					} else {
						footer.classList.add(
							"md:col-span-2",
							"xl:col-start-2",
							"xl:col-span-1",
						);
					}
				}
			}

			// Sync banner text overlay visibility
			const bannerTextOverlay = document.querySelector(
				".banner-home-text-overlay",
			);
			if (bannerTextOverlay) {
				if (isHome) {
					bannerTextOverlay.classList.remove("hidden");
				} else {
					bannerTextOverlay.classList.add("hidden");
				}
			}

			// Sync navbar transparent mode
			const navEl = document.getElementById("navbar");
			if (navEl) {
				navEl.setAttribute("data-is-home", isHome.toString());
			}

			// Update sidebar component visibility (based on new page URL)
			updateSidebarComponentsVisibility();

			// Reinitialize KaTeX scrollbar containers
			initCustomScrollbar();

			// Reinitialize icon loader
			import("@/utils/icon-loader")
				.then(({ initIconLoader }) => {
					initIconLoader();
				})
				.catch((e) => console.warn("[swup] icon-loader init failed:", e));

			// Reinitialize desktop TOC component for article pages only
			const tocWrapper = document.getElementById("toc-wrapper");
			const isArticlePage = tocWrapper !== null;

			if (isArticlePage) {
				const tocElement = document.querySelector<
					HTMLElement & { init: () => void }
				>("table-of-contents");
				if (tocElement && typeof tocElement.init === "function") {
					setTimeout(() => {
						tocElement.init();
					}, 100);
				}
			}

			// Notify Svelte components to re-initialize (synchronous dispatch)
			window.dispatchEvent(new CustomEvent("swup:content:replaced"));
		});

		window.swup.hooks.on(
			"visit:start",
			(visit: { to: { url: string }; abort: () => void }) => {
				// Music page uses different layout structure - force full page load
				const fromPath = window.location.pathname;
				let toPath: string;
				try {
					toPath = new URL(visit.to.url, window.location.origin).pathname;
				} catch {
					toPath = visit.to.url || "";
				}
				const isMusicPage = (p: string) => p === "/music/" || p === "/music";
				if (isMusicPage(fromPath) || isMusicPage(toPath)) {
					visit.abort();
					window.swup.loadPage(visit.to.url, {
						animate: false,
					});
					return;
				}

				// Destroy any leftover lightbox DOM to prevent cross-page image bleed
				const allLbs = document.querySelectorAll("#photo-lightbox");
				allLbs.forEach((lb) => {
					const img = lb.querySelector("#lightbox-image, .lightbox-img");
					if (img) {
						(img as HTMLImageElement).removeAttribute("src");
						(img as HTMLImageElement).src = "";
					}
					if (lb.parentNode) lb.parentNode.removeChild(lb);
				});
				document.body.style.overflow = "";

				// Start progress bar
				const progressBar = document.getElementById("progress-bar");
				if (progressBar) {
					progressBar.classList.remove("finishing", "done");
					// Force reflow so the animation restarts cleanly
					void progressBar.offsetWidth;
					progressBar.classList.add("loading");
				}

				// Control mobile banner visibility with improved staging animation
				const isMobile = window.innerWidth < 1024;
				const isHomePage = pathsEqual(visit.to.url, url("/"));

				// Disable post list container transition on mobile to prevent conflicts
				if (isMobile) {
					const postListContainer = document.getElementById(
						"post-list-container",
					);
					if (postListContainer) {
						postListContainer.style.transition = "none";
					}
				}

				const wallpaperWrapper = document.getElementById("wallpaper-wrapper");
				const mainContentWrapper = document.querySelector(
					".absolute.w-full.z-30",
				) as HTMLElement | null;

				if (isMobile && wallpaperWrapper && mainContentWrapper) {
					// Cancel any in-flight banner animation from previous navigation
					if (bannerAnimCtrl) bannerAnimCtrl.abort();
					bannerAnimCtrl = new AbortController();
					const sig = bannerAnimCtrl.signal;

					if (isHomePage) {
						// Home page: disable main content transition to prevent list shift
						mainContentWrapper.style.transition = "none";

						// Show banner first, then remove hidden class for smooth appearance
						wallpaperWrapper.style.display = "";
						setTimeout(() => {
							if (sig.aborted) return;
							wallpaperWrapper.classList.remove("mobile-hide-banner");
						}, 100);
						setTimeout(() => {
							if (sig.aborted) return;
							mainContentWrapper.classList.remove("mobile-main-no-banner");
							// Restore transition after position animation completes
							setTimeout(() => {
								if (sig.aborted) return;
								mainContentWrapper.style.transition = "";
							}, 50);
						}, 150);
					} else {
						// Non-home: staged hide - banner first, then content shift
						wallpaperWrapper.classList.add("mobile-hide-banner");
						setTimeout(() => {
							if (sig.aborted) return;
							mainContentWrapper.classList.add("mobile-main-no-banner");
						}, 100);
					}
				} else if (!isMobile && wallpaperWrapper) {
					// Desktop: ensure banner is visible
					wallpaperWrapper.style.display = "";
					wallpaperWrapper.classList.remove("mobile-hide-banner");
					if (mainContentWrapper) {
						mainContentWrapper.classList.remove("mobile-main-no-banner");
					}
				}

				// Increase page height during transition to prevent scroll animation jump
				const heightExtend = document.getElementById("page-height-extend");
				if (heightExtend) {
					heightExtend.classList.remove("hidden");
				}

				// Hide TOC while scrolling back to top
				const toc = document.getElementById("toc-wrapper");
				if (toc) {
					toc.classList.add("toc-not-ready");
				}
			},
		);

		window.swup.hooks.on("page:view", () => {
			const isHome = pathsEqual(window.location.pathname, url("/"));
			syncMainContentTop(isHome);

			// Update sidebar component visibility
			updateSidebarComponentsVisibility();

			// Hide temp height element when transition is done
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) {
				heightExtend.classList.remove("hidden");
			}

			// Scroll to top - use "auto" to avoid visual jitter during transitions
			window.scrollTo({
				top: 0,
				behavior: "auto",
			});

			// Restore mobile post list container transition
			const isMobile = window.innerWidth < 1024;
			if (isMobile) {
				setTimeout(() => {
					const postListContainer = document.getElementById(
						"post-list-container",
					);
					if (postListContainer) {
						postListContainer.style.transition = "";
					}
				}, 600);
			}

			// Sync theme state - fix code block rendering when entering article from home
			const storedTheme =
				localStorage.getItem("theme") ||
				siteConfig.themeColor.defaultMode ||
				"light";
			let isDark = false;

			if (storedTheme === "system") {
				isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
			} else {
				isDark = storedTheme === "dark";
			}

			const expectedTheme = isDark
				? expressiveCodeConfig.darkTheme
				: expressiveCodeConfig.lightTheme;
			const currentTheme = document.documentElement.getAttribute("data-theme");

			// Silent update if theme doesn't match (no event to avoid reload)
			if (currentTheme !== expectedTheme) {
				document.documentElement.setAttribute("data-theme", expectedTheme);
			}

			// Trigger comment system init and page-specific logic
			setTimeout(() => {
				if (document.getElementById("tcomment")) {
					const pageLoadedEvent = new CustomEvent("firefly:page:loaded", {
						detail: {
							path: window.location.pathname,
							timestamp: Date.now(),
						},
					});
					document.dispatchEvent(pageLoadedEvent);
					console.log(
						"Layout: triggered firefly:page:loaded event, path:",
						window.location.pathname,
					);
				}

				// Moments page infinite scroll
				(() => {
					const feed = document.getElementById("moments-feed");
					const sentinel = document.getElementById("load-more-sentinel");
					if (!feed || !sentinel) return;

					const BATCH = 5;
					if (!window.__momentsScrollState) {
						window.__momentsScrollState = { observer: null };
					}
					const gs = window.__momentsScrollState;
					let count = BATCH;
					let loading = false;
					let done = false;

					function items() {
						return Array.from(feed?.querySelectorAll(".wx-feed-item") ?? []);
					}
					function show() {
						const all = items();
						for (let i = 0; i < all.length; i++) {
							all[i].classList[i < count ? "remove" : "add"]("wx-feed-hidden");
						}
					}
					function check() {
						const total = items().length;
						done = count >= total;
						sentinel?.classList[done ? "add" : "remove"]("hidden");
					}
					function more() {
						if (loading || done) return;
						loading = true;
						setTimeout(() => {
							const all = items();
							const end = Math.min(count + BATCH, all.length);
							for (let i = count; i < end; i++) {
								all[i].classList.remove("wx-feed-hidden");
							}
							count = end;
							loading = false;
							check();
							if (!done && vis()) more();
						}, 300);
					}
					function vis() {
						const r = sentinel?.getBoundingClientRect();
						return r !== undefined && r.top < window.innerHeight + 200;
					}
					function obs() {
						if (gs.observer) {
							gs.observer.disconnect();
							gs.observer = null;
						}
						gs.observer = new IntersectionObserver(
							(e: IntersectionObserverEntry[]) => {
								if (e[0].isIntersecting) more();
							},
							{ rootMargin: "200px" },
						);
						if (sentinel) gs.observer.observe(sentinel);
					}

					count = BATCH;
					loading = false;
					done = false;
					show();
					check();
					obs();
				})();

				// Changelog page infinite scroll
				if (typeof window.__resetChangelogScroll === "function") {
					window.__resetChangelogScroll();
				}
			}, 300);
		});

		window.swup.hooks.on("visit:end", (_visit: { to: { url: string } }) => {
			// Finish progress bar
			const progressBar = document.getElementById("progress-bar");
			if (progressBar) {
				progressBar.classList.remove("loading");
				progressBar.classList.add("finishing");
				setTimeout(() => {
					progressBar.classList.remove("finishing");
					progressBar.classList.add("done");
					setTimeout(() => {
						progressBar.classList.remove("done");
					}, 150);
				}, 100);
			}

			setTimeout(() => {
				const heightExtend = document.getElementById("page-height-extend");
				if (heightExtend) {
					heightExtend.classList.add("hidden");
				}

				// Just make the transition looks better
				const toc = document.getElementById("toc-wrapper");
				if (toc) {
					toc.classList.remove("toc-not-ready");
				}

				// Remove page transition protection, restore transition animations
				document.documentElement.classList.remove("is-page-transitioning");
			}, 100);
		});
	};

	if (window?.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup);
	}
}
