import { describe, expect, it } from "vitest";

import { GAME_CONFIG, HOSTILE_COLS, HOSTILE_ROWS } from "../src/js/config.js";
import {
	createBunkers,
	createHostileFormation,
	createPlayer,
	createStars,
} from "../src/js/entities.js";

describe("entities", () => {
	it("creates player with expected defaults", () => {
		const player = createPlayer(960, 640);
		expect(player.x).toBe(456);
		expect(player.y).toBe(574);
		expect(player.w).toBe(48);
		expect(player.h).toBe(24);
		expect(player.lives).toBe(3);
		expect(player.speed).toBe(GAME_CONFIG.playerSpeed);
	});

	it("creates hostile formation with correct dimensions and row typing", () => {
		const formation = createHostileFormation(3);
		expect(formation).toHaveLength(HOSTILE_ROWS * HOSTILE_COLS);

		const first = formation[0];
		expect(first.row).toBe(0);
		expect(first.col).toBe(0);
		expect(first.type).toBe("warden");
		expect(first.points).toBe(30);
		expect(first.level).toBe(3);
		expect(first.alive).toBe(true);

		const last = formation.at(-1);
		expect(last.row).toBe(4);
		expect(last.col).toBe(10);
		expect(last.type).toBe("drone");
		expect(last.points).toBe(10);
	});

	it("creates four bunkers with destructible blocks", () => {
		const bunkers = createBunkers();
		expect(bunkers).toHaveLength(4);

		for (const bunker of bunkers) {
			expect(bunker.blocks).toHaveLength(34);
			for (const block of bunker.blocks) {
				expect(block.w).toBe(8);
				expect(block.h).toBe(8);
				expect(block.hp).toBe(3);
			}
		}
	});

	it("creates animated starfield values within configured ranges", () => {
		const stars = createStars();
		expect(stars).toHaveLength(GAME_CONFIG.starCount);
		for (const star of stars) {
			expect(star.x).toBeGreaterThanOrEqual(0);
			expect(star.x).toBeLessThanOrEqual(GAME_CONFIG.width);
			expect(star.y).toBeGreaterThanOrEqual(0);
			expect(star.y).toBeLessThanOrEqual(GAME_CONFIG.height);
			expect(star.size).toBeGreaterThanOrEqual(0.8);
			expect(star.size).toBeLessThanOrEqual(2.4);
			expect(star.speed).toBeGreaterThanOrEqual(2);
			expect(star.speed).toBeLessThanOrEqual(14);
		}
	});
});
