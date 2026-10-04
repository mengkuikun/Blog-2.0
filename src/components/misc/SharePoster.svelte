<script lang="ts">
import QRCode from "qrcode";
import Icon from "@/components/common/Icon.svelte";
import { coverImageConfig } from "../../config/coverImageConfig";
import I18nKey from "../../i18n/i18nKey";
import { i18n } from "../../i18n/translation";

export let title: string;
export let author: string;
export let description = "";
export let pubDate: string;
export let coverImage: string | null = null;
export let url: string;
export let siteTitle: string;
export let avatar: string | null = null;

let showModal = false;
let posterImage: string | null = null;
let generating = false;

function getHashSeed(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

function loadImage(
	src: string,
	timeoutMs = 2500,
): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		if (!src) {
			resolve(null);
			return;
		}

		let settled = false;
		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				resolve(null);
			}
		}, timeoutMs);

		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => {
			if (!settled) {
				settled = true;
				clearTimeout(timer);
				resolve(img);
			}
		};
		img.onerror = () => {
			const isLocalOrData =
				src.startsWith("/") ||
				src.startsWith("data:") ||
				src.includes("localhost") ||
				src.includes("127.0.0.1");

			if (!isLocalOrData && !src.includes("images.weserv.nl")) {
				const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=png`;
				const proxyImg = new Image();
				proxyImg.crossOrigin = "anonymous";
				proxyImg.onload = () => {
					if (!settled) {
						settled = true;
						clearTimeout(timer);
						resolve(proxyImg);
					}
				};
				proxyImg.onerror = () => {
					if (!settled) {
						settled = true;
						clearTimeout(timer);
						resolve(null);
					}
				};
				proxyImg.src = proxyUrl;
			} else {
				if (!settled) {
					settled = true;
					clearTimeout(timer);
					resolve(null);
				}
			}
		};
		img.src = src;
	});
}

function getLines(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
): string[] {
	const chars = text.split("");
	const lines: string[] = [];
	let currentLine = "";

	for (let i = 0; i < chars.length; i++) {
		const char = chars[i];
		const width = ctx.measureText(currentLine + char).width;
		if (width < maxWidth) {
			currentLine += char;
		} else {
			lines.push(currentLine);
			currentLine = char;
		}
	}
	if (currentLine) {
		lines.push(currentLine);
	}
	return lines;
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

async function generatePoster() {
	showModal = true;
	if (posterImage) return;

	generating = true;
	try {
		const scale = 2;
		const width = 425 * scale;
		const padding = 24 * scale;

		// 1. Prepare resources
		const qrCodeUrl = await QRCode.toDataURL(url, {
			margin: 1,
			width: 100 * scale,
			color: { dark: "#000000", light: "#ffffff" },
		});
		// 确定封面图源：优先文章指定封面；若无，从全站 62 张精选封面库中真随机抽取一张
		let targetCoverUrl = coverImage?.trim() ? coverImage : null;
		if (!targetCoverUrl) {
			const apis = coverImageConfig.randomCoverImage?.apis || [];
			if (apis.length > 0) {
				const randomIndex = Math.floor(Math.random() * apis.length);
				targetCoverUrl = apis[randomIndex];
			} else {
				targetCoverUrl = "/assets/images/covers/1.webp";
			}
		}

		let coverImg: HTMLImageElement | null = null;
		if (targetCoverUrl) {
			coverImg = await loadImage(targetCoverUrl);
		}

		const [qrImg, avatarImg] = await Promise.all([
			loadImage(qrCodeUrl),
			avatar ? loadImage(avatar) : Promise.resolve(null),
		]);

		// 2. Setup Canvas for measuring
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Canvas context not available");

		canvas.width = width;
		// Initial height estimation, will be adjusted
		canvas.height = 1000 * scale;

		// 3. Layout Calculation
		const contentWidth = width - padding * 2;
		let currentY = 0;

		// Cover
		const coverHeight = 200 * scale;
		currentY += coverHeight;
		currentY += padding; // Gap after cover

		// Meta (Date on Cover) - No extra height needed

		// Title
		ctx.font = `700 ${24 * scale}px 'Roboto', sans-serif`;
		const titleLines = getLines(ctx, title, contentWidth);
		const titleLineHeight = 30 * scale;
		const titleHeight = titleLines.length * titleLineHeight;
		currentY += titleHeight;
		currentY += 16 * scale; // Gap

		// Description
		let descHeight = 0;
		if (description) {
			ctx.font = `${14 * scale}px 'Roboto', sans-serif`;
			const descLines = getLines(ctx, description, contentWidth - 16 * scale); // minus border width and gap
			// Limit to 6 lines
			const maxDescLines = 6;
			const displayDescLines = descLines.slice(0, maxDescLines);
			const descLineHeight = 25 * scale; // 1.8 line-height approx
			descHeight = displayDescLines.length * descLineHeight;
			currentY += descHeight;
			// currentY += 24 * scale; // Gap to footer (Removed to reduce whitespace)
		} else {
			currentY += 8 * scale; // Smaller gap if no desc
		}

		// Footer (Author + QR)
		// Footer top border + padding
		currentY += 24 * scale;

		// Calculate author text area width for wrapping
		const avatarWidth = avatar ? 64 * scale + 16 * scale : 0;
		const qrSize = 64 * scale;
		const qrX = width - padding - qrSize;
		const authorTextAreaWidth =
			width - padding * 2 - avatarWidth - qrSize - 16 * scale;

		// Measure author text height
		ctx.font = `700 ${20 * scale}px 'Roboto', sans-serif`;
		const authorLines = author
			? getLines(ctx, author, authorTextAreaWidth)
			: [];
		const authorLineHeight = 24 * scale;
		const authorHeight = authorLines.length * authorLineHeight + 24 * scale; // +24 for "作者" label

		// Footer includes QR code (64*scale) + scan text below (20*scale) + spacing
		const qrWithTextHeight = qrSize + 32 * scale;
		const footerHeight = Math.max(qrWithTextHeight, authorHeight);
		currentY += footerHeight;
		currentY += padding; // Bottom padding

		// 4. Resize Canvas to fit content
		canvas.height = currentY;

		// 5. Draw Content
		// Fill Background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw Decorative Circles
		ctx.save();
		ctx.globalAlpha = 0.08;
		ctx.fillStyle = "#64748b";

		// Top Right Circle
		// CSS: top: -50px, right: -50px, width: 150px, height: 150px
		// Radius = 75px
		// Center X = width + 50 - 75 = width - 25
		// Center Y = -50 + 75 = 25
		ctx.beginPath();
		ctx.arc(width - 25 * scale, 25 * scale, 75 * scale, 0, Math.PI * 2);
		ctx.fill();

		// Bottom Left Circle
		// Adjusted to cover the avatar
		ctx.beginPath();
		ctx.arc(10 * scale, canvas.height - 10 * scale, 50 * scale, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		// Parse Date
		let dateObj: { day: string; month: string; year: string } | null = null;
		try {
			const d = new Date(pubDate);
			if (!Number.isNaN(d.getTime())) {
				dateObj = {
					day: d.getDate().toString().padStart(2, "0"),
					month: (d.getMonth() + 1).toString().padStart(2, "0"),
					year: d.getFullYear().toString(),
				};
			}
		} catch (e) {}

		// Draw Cover
		if (coverImg) {
			// Object-fit: cover implementation
			const imgRatio = coverImg.width / coverImg.height;
			const targetRatio = width / coverHeight;
			let sx: number;
			let sy: number;
			let sWidth: number;
			let sHeight: number;

			if (imgRatio > targetRatio) {
				sHeight = coverImg.height;
				sWidth = sHeight * targetRatio;
				sx = (coverImg.width - sWidth) / 2;
				sy = 0;
			} else {
				sWidth = coverImg.width;
				sHeight = sWidth / targetRatio;
				sx = 0;
				sy = (coverImg.height - sHeight) / 2;
			}
			ctx.drawImage(
				coverImg,
				sx,
				sy,
				sWidth,
				sHeight,
				0,
				0,
				width,
				coverHeight,
			);
		} else {
			// 专业科技杂志风 Canvas 专属封面（离线或无图时的专业级视觉保障）
			ctx.save();
			// 1. 底层深邃冷调暗夜渐变
			const grad = ctx.createLinearGradient(0, 0, width, coverHeight);
			grad.addColorStop(0, "#0b0f19");
			grad.addColorStop(1, "#1a2234");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, width, coverHeight);

			// 2. 绘制精密科技网格（Tech Blueprint Grid）
			const gridSize = 28 * scale;
			ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
			ctx.lineWidth = 1;
			for (let x = 0; x < width; x += gridSize) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, coverHeight);
				ctx.stroke();
			}
			for (let y = 0; y < coverHeight; y += gridSize) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}

			// 3. 装饰性微光弧形光斑
			ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
			ctx.beginPath();
			ctx.arc(
				width * 0.85,
				coverHeight * 0.2,
				coverHeight * 0.75,
				0,
				Math.PI * 2,
			);
			ctx.fill();

			// 4. 左上方：精致科技徽章小胶囊 [ ✦ ARTICLE SHARE ]
			const badgeX = padding;
			const badgeY = 20 * scale;
			const badgeText = "✦ ARTICLE SHARE";
			ctx.font = `600 ${10 * scale}px 'Roboto', monospace, sans-serif`;
			const badgeTextW = ctx.measureText(badgeText).width;
			const badgePaddingX = 8 * scale;
			const badgeH = 18 * scale;

			ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
			drawRoundedRect(
				ctx,
				badgeX,
				badgeY,
				badgeTextW + badgePaddingX * 2,
				badgeH,
				4 * scale,
			);
			ctx.fill();
			ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
			ctx.stroke();

			ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(badgeText, badgeX + badgePaddingX, badgeY + badgeH / 2);

			// 5. 居中：品牌水印与技术排版
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = `700 ${22 * scale}px 'Roboto', sans-serif`;
			ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
			ctx.fillText(siteTitle || "FIREFLY BLOG", width / 2, coverHeight / 2);

			// 底部微光分割线
			ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
			ctx.beginPath();
			ctx.moveTo(0, coverHeight - 1);
			ctx.lineTo(width, coverHeight - 1);
			ctx.stroke();

			ctx.restore();
		}

		// Draw Date Overlay
		if (dateObj) {
			const dateBoxW = 60 * scale;
			const dateBoxH = 60 * scale;
			const dateBoxX = padding;
			const dateBoxY = coverHeight - dateBoxH;

			// Background (Semi-transparent black)
			ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
			drawRoundedRect(ctx, dateBoxX, dateBoxY, dateBoxW, dateBoxH, 4 * scale);
			ctx.fill();

			// Day
			ctx.fillStyle = "#ffffff";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = `700 ${30 * scale}px 'Roboto', sans-serif`;
			ctx.fillText(dateObj.day, dateBoxX + dateBoxW / 2, dateBoxY + 24 * scale);

			// Line
			ctx.beginPath();
			ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
			ctx.lineWidth = 1 * scale;
			ctx.moveTo(dateBoxX + 10 * scale, dateBoxY + 42 * scale);
			ctx.lineTo(dateBoxX + dateBoxW - 10 * scale, dateBoxY + 42 * scale);
			ctx.stroke();

			// Year Month
			ctx.font = `${10 * scale}px 'Roboto', sans-serif`;
			ctx.fillText(
				`${dateObj.year} ${dateObj.month}`,
				dateBoxX + dateBoxW / 2,
				dateBoxY + 51 * scale,
			);
		}

		// Reset Y for drawing
		let drawY = coverHeight + padding;

		// Draw Title
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		ctx.font = `700 ${24 * scale}px 'Roboto', sans-serif`;
		ctx.fillStyle = "#111827";
		titleLines.forEach((line) => {
			ctx.fillText(line, padding, drawY);
			drawY += titleLineHeight;
		});
		drawY += 16 * scale - (titleLineHeight - 24 * scale); // Adjust for line-height diff

		// Draw Description
		if (description) {
			// Draw vertical line
			ctx.fillStyle = "#e5e7eb";
			const descLineH = descHeight; // Approximate
			// Extend the line slightly above and below the text
			drawRoundedRect(
				ctx,
				padding,
				drawY - 8 * scale,
				4 * scale,
				descLineH + 8 * scale,
				2 * scale,
			);
			ctx.fill();

			ctx.font = `${14 * scale}px 'Roboto', sans-serif`;
			ctx.fillStyle = "#4b5563";
			const descLines = getLines(ctx, description, contentWidth - 16 * scale);
			const maxDescLines = 6;

			descLines.slice(0, maxDescLines).forEach((line) => {
				ctx.fillText(line, padding + 16 * scale, drawY);
				drawY += 25 * scale; // line height
			});
			// drawY += 24 * scale; // Removed to reduce whitespace
		} else {
			drawY += 8 * scale;
		}

		// Draw Footer Divider
		drawY += 24 * scale; // Spacing before line
		ctx.beginPath();
		ctx.strokeStyle = "#f3f4f6";
		ctx.lineWidth = 1 * scale;
		ctx.moveTo(padding, drawY);
		ctx.lineTo(width - padding, drawY);
		ctx.stroke();
		drawY += 24 * scale; // Spacing after line

		// Draw Footer Content
		const footerY = drawY;

		// Left: Author
		if (avatarImg) {
			ctx.save();
			const avatarSize = 64 * scale;
			const avatarX = padding;

			// Circle clip
			ctx.beginPath();
			ctx.arc(
				avatarX + avatarSize / 2,
				footerY + avatarSize / 2,
				avatarSize / 2,
				0,
				Math.PI * 2,
			);
			ctx.closePath();
			ctx.clip();

			ctx.drawImage(avatarImg, avatarX, footerY, avatarSize, avatarSize);
			ctx.restore();

			// Border for avatar
			ctx.beginPath();
			ctx.arc(
				avatarX + (64 * scale) / 2,
				footerY + (64 * scale) / 2,
				(64 * scale) / 2,
				0,
				Math.PI * 2,
			);
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2 * scale;
			ctx.stroke();
		}

		const authorTextX = padding + (avatar ? 64 * scale + 16 * scale : 0);

		// authorLines, authorLineHeight already calculated in layout phase
		const authorStartY = footerY + 12 * scale;

		ctx.fillStyle = "#9ca3af";
		ctx.font = `${12 * scale}px 'Roboto', sans-serif`;
		ctx.fillText(i18n(I18nKey.author), authorTextX, authorStartY);

		ctx.fillStyle = "#1f2937";
		ctx.font = `700 ${20 * scale}px 'Roboto', sans-serif`;
		let authorDrawY = authorStartY + 20 * scale;
		authorLines.forEach((line) => {
			ctx.fillText(line, authorTextX, authorDrawY);
			authorDrawY += authorLineHeight;
		});

		// Right: QR Code
		// qrSize and qrX already defined above

		// QR Background/Shadow effect (simplified as border)
		ctx.fillStyle = "#ffffff";
		// Shadow simulation
		ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
		ctx.shadowBlur = 4 * scale;
		ctx.shadowOffsetY = 2 * scale;
		drawRoundedRect(ctx, qrX, footerY, qrSize, qrSize, 4 * scale);
		ctx.fill();
		ctx.shadowColor = "transparent"; // Reset shadow

		// Draw QR
		const qrInnerSize = 56 * scale;
		const qrPadding = (qrSize - qrInnerSize) / 2;
		if (qrImg) {
			ctx.drawImage(
				qrImg,
				qrX + qrPadding,
				footerY + qrPadding,
				qrInnerSize,
				qrInnerSize,
			);
		}

		// Scan to read text below QR
		ctx.textAlign = "center";
		ctx.fillStyle = "#9ca3af";
		ctx.font = `${12 * scale}px 'Roboto', sans-serif`;
		ctx.fillText(
			"扫码阅读文章👆",
			qrX + qrSize / 2,
			footerY + qrSize + 20 * scale,
		);

		// Site branding below QR text
		if (siteTitle) {
			ctx.font = `700 ${10 * scale}px Roboto, sans-serif`;
			ctx.fillStyle = "#9ca3af";
			ctx.fillText(siteTitle, width / 2, footerY + qrSize + 42 * scale);
		}

		// Finalize
		posterImage = canvas.toDataURL("image/png");
		generating = false;
	} catch (error) {
		console.error("Failed to generate poster:", error);
		generating = false;
	}
}

function downloadPoster() {
	if (posterImage) {
		const a = document.createElement("a");
		a.href = posterImage;
		a.download = `poster-${title.replace(/\s+/g, "-")}.png`;
		a.click();
	}
}

function closeModal() {
	showModal = false;
	// 若文章未指定封面，关闭弹窗时重置缓存，下次打开重新随机换一张
	if (!coverImage?.trim()) {
		posterImage = null;
	}
}

function refreshPoster() {
	if (generating) return;
	posterImage = null;
	generatePoster();
}

let copied = false;
function copyLink() {
	navigator.clipboard.writeText(url);
	copied = true;
	setTimeout(() => {
		copied = false;
	}, 2000);
}

function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			if (node.parentNode) {
				node.parentNode.removeChild(node);
			}
		},
	};
}
</script>

<!-- Trigger Button -->
<button 
  class="btn-regular rounded-lg h-12 px-6 gap-2 hover:scale-105 active:scale-95 whitespace-nowrap"
  on:click={generatePoster}
  aria-label="Generate Share Poster"
>
  <Icon icon="material-symbols:share" size="md" />
  <span>{i18n(I18nKey.shareArticle)}</span>
</button>



<!-- Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div use:portal class="share-poster-overlay" on:click={closeModal}>
    <div class="share-poster-panel" on:click={(e) => e.stopPropagation()}>
      
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-(--line-divider) flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2.5 text-(--deep-text) font-semibold text-sm tracking-tight">
          <span class="w-6 h-6 rounded-lg bg-(--primary)/10 flex items-center justify-center text-(--primary)">
            <Icon icon="material-symbols:share" size="xs" />
          </span>
          <span>{i18n(I18nKey.shareArticle)}</span>
        </div>
        
        <button 
          type="button"
          class="btn-plain w-7 h-7 rounded-lg text-(--content-meta) hover:text-(--deep-text) transition-colors flex items-center justify-center cursor-pointer"
          on:click={closeModal}
          aria-label="关闭弹窗"
        >
          <Icon icon="material-symbols:close" size="sm" />
        </button>
      </div>

      <!-- Poster Gallery Preview Area -->
      <div class="p-6 flex flex-col items-center justify-center min-h-[300px]">
        {#if posterImage}
          <!-- 相框级悬浮画廊容器 -->
          <div class="max-w-[340px] w-full mx-auto">
            <div class="relative overflow-hidden rounded-xl border border-(--line-divider) bg-white shadow-[0_16px_36px_-10px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] transition-transform duration-300">
              <img src={posterImage} alt="Poster" class="w-full h-auto block" />
            </div>

            {#if !coverImage?.trim()}
              <!-- 居中毛玻璃流体胶囊控制栏（全站标志性药丸设计） -->
              <div class="mt-4 flex items-center justify-center">
                <button 
                  type="button"
                  class="group/btn inline-flex items-center gap-2 px-4 py-2 rounded-full border border-(--line-divider) bg-(--card-bg-transparent) hover:bg-(--btn-regular-bg-hover) text-(--content-meta) hover:text-(--deep-text) text-xs font-medium backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  on:click={refreshPoster}
                  disabled={generating}
                  title="从全站 62 张精选封面库随机抽换一张"
                >
                  <Icon 
                    icon="material-symbols:shuffle" 
                    size="sm" 
                    class="text-(--primary) transition-transform duration-300 group-hover/btn:rotate-180 {generating ? 'animate-spin' : ''}" 
                  />
                  <span>换一张封面</span>
                  <span class="w-1 h-1 rounded-full bg-(--line-divider)"></span>
                  <span class="text-[11px] opacity-75">精选随机库</span>
                </button>
              </div>
            {/if}
          </div>
        {:else}
           <div class="flex flex-col items-center justify-center gap-3.5 py-24 min-h-[380px]">
             <div class="relative flex items-center justify-center">
               <div class="w-10 h-10 border-2 border-(--line-divider) border-t-(--primary) rounded-full animate-spin"></div>
               <Icon icon="material-symbols:draw" size="xs" class="absolute text-(--primary) animate-pulse" />
             </div>
             <span class="text-xs font-medium text-(--content-meta) tracking-wider">{i18n(I18nKey.generatingPoster)}...</span>
           </div>
        {/if}
      </div>
      
      <!-- Modal Actions -->
      <div class="px-6 py-4 border-t border-(--line-divider) grid grid-cols-2 gap-3.5 flex-shrink-0 bg-(--float-panel-bg)">
        <button 
          class="btn-regular h-11 rounded-xl font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          on:click={copyLink}
        >
          {#if copied}
            <Icon icon="material-symbols:check" size="md" class="text-green-500" />
            <span>{i18n(I18nKey.copied)}</span>
          {:else}
            <Icon icon="material-symbols:link" size="md" />
            <span>{i18n(I18nKey.copyLink)}</span>
          {/if}
        </button>
        <button 
          class="h-11 bg-(--primary) text-white dark:text-neutral-950 font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
          on:click={downloadPoster}
          disabled={!posterImage}
        >
          <Icon icon="material-symbols:download" size="md" />
          <span>{i18n(I18nKey.savePoster)}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .share-poster-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: oklch(0 0 0 / 0.45);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: shareFadeIn 0.2s ease-out;
  }

  .share-poster-panel {
    background-color: var(--float-panel-bg);
    border: 1px solid var(--line-divider);
    border-radius: 1.25rem;
    box-shadow: 0 20px 48px -12px oklch(0 0 0 / 0.18), 0 0 0 1px var(--line-divider);
    max-width: 440px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    animation: shareSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  :root.dark .share-poster-panel {
    background-color: oklch(0.12 0 0);
    border-color: var(--line-divider);
    box-shadow: 0 25px 60px -12px oklch(0 0 0 / 0.65), 0 0 0 1px var(--line-divider);
  }

  @keyframes shareFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes shareSlideIn {
    from { opacity: 0; transform: translateY(-0.75rem) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
</style>
