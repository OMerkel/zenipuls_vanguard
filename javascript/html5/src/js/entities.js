import {
	GAME_CONFIG,
	HOSTILE_COLS,
	HOSTILE_ROWS,
	HOSTILE_TYPES,
} from "./config.js";
import { randomInRange } from "./utils.js";

export function createPlayer(worldWidth, worldHeight) {
	const width = 48;
	const height = 24;

	return {
		x: worldWidth / 2 - width / 2,
		y: worldHeight - 66,
		w: width,
		h: height,
		speed: GAME_CONFIG.playerSpeed,
		fireCooldown: 0,
		lives: 3,
	};
}

export function createHostileFormation(level = 1) {
	const list = [];
	const spacingX = 56;
	const spacingY = 46;
	const baseX = 110;
	const baseY = 110;

	for (let row = 0; row < HOSTILE_ROWS; row += 1) {
		for (let col = 0; col < HOSTILE_COLS; col += 1) {
			const type = HOSTILE_TYPES.find((item) => item.row === row);
			list.push({
				x: baseX + col * spacingX,
				y: baseY + row * spacingY,
				w: 40,
				h: 30,
				row,
				col,
				type: type.key,
				points: type.points,
				color: type.color,
				alive: true,
				level,
				rotationPhase: 0,
				rotationAmplitude: 20,
				rotationFrequency: 0.5,
				isFalling: false,
				vy: 0,
			});
		}
	}

	return list;
}

export function createBunkers() {
	const pattern = [
		"0011111100",
		"0111111110",
		"1111111111",
		"1110000111",
		"1100000011",
	];

	const bunkers = [];
	const size = 8;
	const top = GAME_CONFIG.height - 170;
	const centers = [176, 380, 580, 784];

	for (const centerX of centers) {
		const blocks = [];
		for (let row = 0; row < pattern.length; row += 1) {
			for (let col = 0; col < pattern[row].length; col += 1) {
				if (pattern[row][col] === "1") {
					blocks.push({
						x: centerX + (col - pattern[row].length / 2) * size,
						y: top + row * size,
						w: size,
						h: size,
						hp: 3,
					});
				}
			}
		}
		bunkers.push({ blocks });
	}

	return bunkers;
}

export function createStars() {
	const stars = [];
	for (let i = 0; i < GAME_CONFIG.starCount; i += 1) {
		stars.push({
			x: Math.random() * GAME_CONFIG.width,
			y: Math.random() * GAME_CONFIG.height,
			size: randomInRange(0.8, 2.4),
			speed: randomInRange(2, 14),
			twinkle: Math.random() * Math.PI * 2,
		});
	}
	return stars;
}
