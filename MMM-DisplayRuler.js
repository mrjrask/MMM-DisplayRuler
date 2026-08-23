/* global Module, Log */

/*
 * MMM-DisplayRuler
 * A MagicMirror² module that overlays two "elementary school ruler" style
 * rulers across the entire screen — one along the top (measuring width)
 * and one along the left (measuring height) — accurately marked in pixels
 * for whatever display it happens to be running on.
 *
 * https://github.com/mrjrask/MMM-DisplayRuler
 */

Module.register("MMM-DisplayRuler", {

	// -----------------------------------------------------------------
	// Defaults
	// -----------------------------------------------------------------
	defaults: {
		// Bar thickness in CSS pixels
		rulerThickness: 70,

		// Tick spacing, in real screen pixels
		minorTick: 10,   // short, unlabeled ticks
		mediumTick: 50,  // medium ticks, unlabeled
		majorTick: 100,  // long ticks, labeled with the pixel value

		// Colors — defaults evoke a wooden school ruler
		colorBody: "#e8d3a2",
		colorBodyAlt: "#d9bd82",
		colorTicks: "#241c11",
		colorText: "#241c11",
		colorAccent: "#c23b2c",

		// Font used for the tick numbers
		fontFamily: "'Courier New', Courier, monospace",

		// Small badge in the bottom-right corner showing the exact
		// resolution and device pixel ratio that was detected
		showDimensionsLabel: true,

		// Redraw automatically if the browser window / display resizes
		updateOnResize: true
	},

	// -----------------------------------------------------------------
	// Lifecycle
	// -----------------------------------------------------------------
	start () {
		Log.info(`Starting module: ${this.name}`);
		this.canvas = null;
		this.resizeTimer = null;
		this.boundResize = this.onResize.bind(this);

		// A zero/negative/non-numeric minorTick would make the tick-drawing
		// loops below increment by nothing (or backwards), hanging the
		// browser tab. Fall back to the default rather than let a typo in
		// config.js freeze the mirror.
		if (!(this.config.minorTick > 0)) {
			Log.warn(`${this.name}: minorTick must be a positive number, falling back to default (${this.defaults.minorTick})`);
			this.config.minorTick = this.defaults.minorTick;
		}
	},

	getStyles () {
		return ["MMM-DisplayRuler.css"];
	},

	getDom () {
		const wrapper = document.createElement("div");
		wrapper.className = "MMM-DisplayRuler-wrapper";
		wrapper.setAttribute("aria-hidden", "true");

		const canvas = document.createElement("canvas");
		canvas.className = "MMM-DisplayRuler-canvas";
		wrapper.appendChild(canvas);

		this.canvas = canvas;
		this.resizeAndDraw();

		if (this.config.updateOnResize) {
			window.addEventListener("resize", this.boundResize);
		}

		return wrapper;
	},

	// Redraw once every module has finished mounting, in case the
	// viewport settled to a slightly different size (e.g. scrollbars).
	notificationReceived (notification) {
		if (notification === "DOM_OBJECTS_CREATED") {
			this.resizeAndDraw();
		}
	},

	suspend () {
		clearTimeout(this.resizeTimer);
		if (this.config.updateOnResize) {
			window.removeEventListener("resize", this.boundResize);
		}
	},

	resume () {
		if (this.config.updateOnResize) {
			window.addEventListener("resize", this.boundResize);
		}
		this.resizeAndDraw();
	},

	onResize () {
		clearTimeout(this.resizeTimer);
		this.resizeTimer = setTimeout(() => this.resizeAndDraw(), 150);
	},

	// -----------------------------------------------------------------
	// Drawing
	// -----------------------------------------------------------------

	// Sizes the canvas to exactly match the display's pixel grid (using
	// devicePixelRatio so lines stay crisp on HiDPI screens) and redraws.
	resizeAndDraw () {
		if (!this.canvas) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		const width = window.innerWidth;
		const height = window.innerHeight;

		this.canvas.width = Math.round(width * dpr);
		this.canvas.height = Math.round(height * dpr);
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		const ctx = this.canvas.getContext("2d");
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		this.drawRulers(ctx, width, height, dpr);
	},

	drawRulers (ctx, width, height, dpr) {
		const cfg = this.config;
		const t = cfg.rulerThickness;

		ctx.clearRect(0, 0, width, height);

		// Vertical ruler first, horizontal ruler second — the horizontal
		// bar naturally overlaps the top of the vertical bar in the
		// corner, exactly the "overlapping rulers" look of two rulers
		// laid across a desk to measure width and height at once.
		this.drawVerticalRuler(ctx, height, t, cfg);
		this.drawHorizontalRuler(ctx, width, t, cfg);
		this.drawCornerBox(ctx, t, cfg);

		if (cfg.showDimensionsLabel) {
			this.drawDimensionBadge(ctx, width, height, dpr, cfg);
		}
	},

	// A flat wood-toned fill with a few faint grain lines running along
	// the long axis of the rectangle, like the printed wood grain on a
	// cheap classroom ruler.
	drawWoodBackground (ctx, x, y, w, h, cfg) {
		ctx.save();

		ctx.fillStyle = cfg.colorBody;
		ctx.fillRect(x, y, w, h);

		ctx.globalAlpha = 0.4;
		ctx.strokeStyle = cfg.colorBodyAlt;
		ctx.lineWidth = 1;

		const horizontal = w >= h;
		const spacing = 6;

		if (horizontal) {
			for (let i = spacing; i < h; i += spacing) {
				if (i % (spacing * 2) === 0) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(x, y + i + 0.5);
				ctx.lineTo(x + w, y + i + 0.5);
				ctx.stroke();
			}
		} else {
			for (let i = spacing; i < w; i += spacing) {
				if (i % (spacing * 2) === 0) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(x + i + 0.5, y);
				ctx.lineTo(x + i + 0.5, y + h);
				ctx.stroke();
			}
		}

		ctx.restore();
	},

	// Top bar — spans the full width of the display, ticks hang down
	// from the inner (bottom) edge, numbers sit just above each major tick.
	drawHorizontalRuler (ctx, width, thickness, cfg) {
		this.drawWoodBackground(ctx, 0, 0, width, thickness, cfg);

		ctx.font = `bold 11px ${cfg.fontFamily}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.lineWidth = 1;
		ctx.strokeStyle = cfg.colorTicks;
		ctx.fillStyle = cfg.colorText;

		for (let x = 0; x <= width; x += cfg.minorTick) {
			const isMajor = x % cfg.majorTick === 0;
			const isMedium = !isMajor && x % cfg.mediumTick === 0;
			const tickLen = isMajor ? thickness * 0.55 : isMedium ? thickness * 0.35 : thickness * 0.18;

			ctx.beginPath();
			ctx.moveTo(x + 0.5, thickness);
			ctx.lineTo(x + 0.5, thickness - tickLen);
			ctx.stroke();

			if (isMajor && x !== 0) {
				ctx.fillText(String(x), x, thickness - tickLen - 4);
			}
		}

		ctx.strokeStyle = cfg.colorAccent;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, thickness);
		ctx.lineTo(width, thickness);
		ctx.stroke();
	},

	// Left bar — spans the full height of the display, ticks reach in
	// from the inner (right) edge, numbers rotated to read bottom-to-top.
	drawVerticalRuler (ctx, height, thickness, cfg) {
		this.drawWoodBackground(ctx, 0, 0, thickness, height, cfg);

		ctx.font = `bold 11px ${cfg.fontFamily}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.lineWidth = 1;
		ctx.strokeStyle = cfg.colorTicks;
		ctx.fillStyle = cfg.colorText;

		for (let y = 0; y <= height; y += cfg.minorTick) {
			const isMajor = y % cfg.majorTick === 0;
			const isMedium = !isMajor && y % cfg.mediumTick === 0;
			const tickLen = isMajor ? thickness * 0.55 : isMedium ? thickness * 0.35 : thickness * 0.18;

			ctx.beginPath();
			ctx.moveTo(thickness, y + 0.5);
			ctx.lineTo(thickness - tickLen, y + 0.5);
			ctx.stroke();

			if (isMajor && y !== 0) {
				ctx.save();
				ctx.translate(thickness - tickLen - 4, y);
				ctx.rotate(-Math.PI / 2);
				ctx.fillText(String(y), 0, 0);
				ctx.restore();
			}
		}

		ctx.strokeStyle = cfg.colorAccent;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(thickness, 0);
		ctx.lineTo(thickness, height);
		ctx.stroke();
	},

	// The square where the two rulers cross — highlighted as the origin
	// (0,0) point that both rulers measure from.
	drawCornerBox (ctx, thickness, cfg) {
		ctx.save();

		ctx.fillStyle = cfg.colorAccent;
		ctx.fillRect(0, 0, thickness, thickness);

		ctx.strokeStyle = "rgba(255,255,255,0.6)";
		ctx.lineWidth = 1;
		ctx.strokeRect(2, 2, thickness - 4, thickness - 4);

		ctx.fillStyle = "#ffffff";
		ctx.font = `bold 14px ${cfg.fontFamily}`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("0", thickness / 2, thickness / 2 + 2);

		ctx.font = `9px ${cfg.fontFamily}`;
		ctx.fillText("px", thickness / 2, thickness / 2 + 16);

		ctx.restore();
	},

	// A small readout, bottom-right, confirming the exact resolution and
	// device pixel ratio that was measured for this display.
	drawDimensionBadge (ctx, width, height, dpr, cfg) {
		const text = `${width} \u00D7 ${height}px  \u2022  DPR ${dpr}`;

		ctx.save();
		ctx.font = `bold 13px ${cfg.fontFamily}`;

		const paddingX = 10;
		const paddingY = 7;
		const textWidth = ctx.measureText(text).width;
		const boxW = textWidth + paddingX * 2;
		const boxH = 14 + paddingY * 2;
		const boxX = width - boxW - 16;
		const boxY = height - boxH - 16;

		ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
		ctx.fillRect(boxX, boxY, boxW, boxH);

		ctx.strokeStyle = cfg.colorAccent;
		ctx.lineWidth = 1;
		ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

		ctx.fillStyle = "#ffffff";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(text, boxX + paddingX, boxY + boxH / 2 + 1);

		ctx.restore();
	}
});
