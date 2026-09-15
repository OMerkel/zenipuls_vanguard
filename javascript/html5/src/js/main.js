import { GAME_CONFIG } from "./config.js";
import { ZenipulsVanguardGame } from "./game.js";

function setupCanvasScaler(canvas) {
	const stagePanel = canvas.closest(".stage-panel");
	if (!stagePanel) {
		return;
	}

	const fitCanvas = () => {
		const panelRect = stagePanel.getBoundingClientRect();
		const panelStyle = window.getComputedStyle(stagePanel);
		const horizontalPadding =
			Number.parseFloat(panelStyle.paddingLeft) +
			Number.parseFloat(panelStyle.paddingRight);
		const verticalPadding =
			Number.parseFloat(panelStyle.paddingTop) +
			Number.parseFloat(panelStyle.paddingBottom);

		const availableWidth = Math.max(1, panelRect.width - horizontalPadding);
		const availableHeight = Math.max(1, panelRect.height - verticalPadding);
		const scale = Math.min(
			availableWidth / GAME_CONFIG.width,
			availableHeight / GAME_CONFIG.height,
		);

		const fittedWidth = Math.max(1, Math.floor(GAME_CONFIG.width * scale));
		const fittedHeight = Math.max(1, Math.floor(GAME_CONFIG.height * scale));

		canvas.style.width = `${fittedWidth}px`;
		canvas.style.height = `${fittedHeight}px`;
	};

	const resizeObserver = new ResizeObserver(fitCanvas);
	resizeObserver.observe(stagePanel);
	window.addEventListener("resize", fitCanvas);
	fitCanvas();
}

function bindUi() {
	const score = document.querySelector("[data-score]");
	const highScore = document.querySelector("[data-high-score]");
	const level = document.querySelector("[data-level]");
	const lives = document.querySelector("[data-lives]");
	const status = document.querySelector("[data-status]");
	const mute = document.querySelector("[data-mute]");

	return {
		setScore(value) {
			score.textContent = String(value).padStart(4, "0");
		},
		setHighScore(value) {
			highScore.textContent = String(value).padStart(4, "0");
		},
		setLevel(value) {
			level.textContent = String(value);
		},
		setLives(value) {
			lives.textContent = String(value);
		},
		setStatus(value) {
			status.textContent = value;
		},
		setMuteState(value) {
			mute.textContent = value ? "Off" : "On";
		},
	};
}

function setupControls(game) {
	document
		.querySelector("[data-action='start']")
		.addEventListener("click", () => {
			game.start();
		});

	document
		.querySelector("[data-action='pause']")
		.addEventListener("click", () => {
			game.togglePause();
		});

	document
		.querySelector("[data-action='mute']")
		.addEventListener("click", () => {
			game.toggleMute();
		});
}

function boot() {
	const canvas = document.querySelector("#game-canvas");
	const touchControls = document.querySelector("#touch-controls");
	const stagePanel = canvas.closest(".stage-panel");
	setupCanvasScaler(canvas);
	const ui = bindUi();
	const game = new ZenipulsVanguardGame(canvas, ui, touchControls, stagePanel);
	window.__zenipulsVanguardGame = game;

	setupControls(game);
	game.run();
}

if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("./sw.js", { scope: "./" });
}

boot();
