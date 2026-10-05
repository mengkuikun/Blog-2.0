/**
 * Check whether the current page is a post detail page
 */
export function isCurrentPagePost(): boolean {
	const path = window.location.pathname.replace(/\/+$/, "");
	if (path === "/posts" || /^\/posts\/\d+$/.test(path)) return false;
	return path.startsWith("/posts/") || path.startsWith("/post/");
}

/**
 * Update the main grid column classes based on sidebar configuration
 * and whether the current page is a post
 */
export function updateMainGridCols(): void {
	const mainGrid = document.getElementById("main-grid");
	if (!mainGrid) return;

	const isPostPage = isCurrentPagePost();
	const sidebarPosition =
		mainGrid.getAttribute("data-sidebar-position") || "left";
	const tabletSidebar = mainGrid.getAttribute("data-tablet-sidebar") || "left";
	const showBothSidebarsOnPostPage =
		mainGrid.getAttribute("data-show-both-sidebars-on-post") === "true";

	const shouldBothSidebars =
		isPostPage && sidebarPosition !== "both" && showBothSidebarsOnPostPage;

	let newGridClasses: string;

	if (sidebarPosition === "both" || shouldBothSidebars) {
		// Dual sidebar (including temporary dual sidebar for post pages)
		// When expanding from right to both, tablet keeps right sidebar visible
		const effectiveTabletSidebar =
			shouldBothSidebars && sidebarPosition === "right"
				? "right"
				: tabletSidebar;
		if (effectiveTabletSidebar === "right") {
			newGridClasses =
				"grid-cols-1 md:grid-cols-[1fr_17.5rem] xl:grid-cols-[17.5rem_1fr_17.5rem]";
		} else {
			newGridClasses =
				"grid-cols-1 md:grid-cols-[17.5rem_1fr] xl:grid-cols-[17.5rem_1fr_17.5rem]";
		}
	} else if (sidebarPosition === "right") {
		// Right sidebar only
		newGridClasses = "grid-cols-1 md:grid-cols-[1fr_17.5rem]";
	} else {
		// Left sidebar only
		newGridClasses = "grid-cols-1 md:grid-cols-[17.5rem_1fr]";
	}

	// Remove old classes and add new ones
	[
		"grid-cols-1",
		"md:grid-cols-[17.5rem_1fr]",
		"md:grid-cols-[1fr_17.5rem]",
		"xl:grid-cols-[17.5rem_1fr_17.5rem]",
	].forEach((cls) => {
		mainGrid.classList.remove(cls);
	});

	newGridClasses.split(" ").forEach((cls) => {
		if (cls) mainGrid.classList.add(cls);
	});

	// When position is "right", Swup navigation does not replace static elements'
	// classes (right sidebar, main content container, footer).
	// Need to manually update their grid positioning to match 2-col/3-col layout.
	if (sidebarPosition === "right") {
		const rightSidebar = document.getElementById("right-sidebar");
		const swupContainer = document.getElementById("swup-container");
		const footer = mainGrid.querySelector(".footer");

		if (shouldBothSidebars) {
			// Post page temporary dual sidebar: right sidebar moves to col 3,
			// main content to col 2, footer centered
			rightSidebar?.classList.add("xl:col-start-3");
			swupContainer?.classList.add("xl:col-start-2", "xl:col-end-3");
			if (footer) {
				footer.classList.remove("md:col-start-1", "xl:col-start-1");
				footer.classList.add("xl:col-start-2");
			}
		} else {
			// Non-post page: restore 2-column layout positioning
			rightSidebar?.classList.remove("xl:col-start-3");
			swupContainer?.classList.remove("xl:col-start-2", "xl:col-end-3");
			if (footer) {
				footer.classList.add("md:col-start-1", "xl:col-start-1");
				footer.classList.remove("xl:col-start-2");
			}
		}
	}
}
