import { describe, expect, it, vi } from "vitest";

import {
	choose,
	clamp,
	intersects,
	lerp,
	randomInRange,
} from "../src/js/utils.js";

describe("utils", () => {
	it("clamps values within bounds", () => {
		expect(clamp(5, 1, 10)).toBe(5);
		expect(clamp(-1, 1, 10)).toBe(1);
		expect(clamp(999, 1, 10)).toBe(10);
	});

	it("creates random values within range", () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		expect(randomInRange(10, 14)).toBe(10);
		Math.random.mockRestore();

		vi.spyOn(Math, "random").mockReturnValue(0.5);
		expect(randomInRange(10, 14)).toBe(12);
		Math.random.mockRestore();
	});

	it("evaluates intersection true and false paths", () => {
		const a = { x: 2, y: 2, w: 8, h: 8 };
		expect(intersects(a, { x: 6, y: 6, w: 8, h: 8 })).toBe(true);
		expect(intersects(a, { x: 10, y: 10, w: 8, h: 8 })).toBe(false);
		expect(intersects(a, { x: -20, y: -20, w: 5, h: 5 })).toBe(false);
	});

	it("chooses from list based on random index", () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		expect(choose(["a", "b", "c"])).toBe("a");
		Math.random.mockRestore();

		vi.spyOn(Math, "random").mockReturnValue(0.99999);
		expect(choose(["a", "b", "c"])).toBe("c");
		Math.random.mockRestore();
	});

	it("lerps between values", () => {
		expect(lerp(0, 10, 0)).toBe(0);
		expect(lerp(0, 10, 0.25)).toBe(2.5);
		expect(lerp(0, 10, 1)).toBe(10);
	});
});
