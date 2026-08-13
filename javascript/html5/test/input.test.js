import { beforeEach, describe, expect, it, vi } from "vitest";

import { InputController } from "../src/js/input.js";

function installWindowMock() {
	const listeners = {
		keydown: [],
		keyup: [],
	};

	globalThis.window = {
		addEventListener(type, callback) {
			listeners[type].push(callback);
		},
	};

	return listeners;
}

describe("input controller", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("tracks held keys and consume-once key presses", () => {
		const listeners = installWindowMock();
		const input = new InputController();

		const event = { key: "ArrowLeft", preventDefault: vi.fn() };
		listeners.keydown[0](event);

		expect(input.isDown("arrowleft")).toBe(true);
		expect(input.consumePress("arrowleft")).toBe(true);
		expect(input.consumePress("arrowleft")).toBe(false);
		expect(event.preventDefault).toHaveBeenCalledTimes(1);
	});

	it("does not call preventDefault for unrelated keys", () => {
		const listeners = installWindowMock();
		new InputController();

		const event = { key: "x", preventDefault: vi.fn() };
		listeners.keydown[0](event);
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it("ignores repeated keydown for justPressed while key is held", () => {
		const listeners = installWindowMock();
		const input = new InputController();

		listeners.keydown[0]({ key: "d", preventDefault: vi.fn() });
		listeners.keydown[0]({ key: "d", preventDefault: vi.fn() });

		expect(input.consumePress("d")).toBe(true);
		expect(input.consumePress("d")).toBe(false);
	});

	it("clears one-frame presses and releases held keys", () => {
		const listeners = installWindowMock();
		const input = new InputController();

		listeners.keydown[0]({ key: "m", preventDefault: vi.fn() });
		expect(input.consumePress("m")).toBe(true);

		listeners.keydown[0]({ key: "p", preventDefault: vi.fn() });
		input.nextFrame();
		expect(input.consumePress("p")).toBe(false);

		listeners.keyup[0]({ key: "M" });
		expect(input.isDown("m")).toBe(false);
	});
});
