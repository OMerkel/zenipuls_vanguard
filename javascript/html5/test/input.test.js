import { beforeEach, describe, expect, it, vi } from "vitest";

import { InputController } from "../src/js/input.js";

function installWindowMock() {
	const listeners = {
		keydown: [],
		keyup: [],
		pointerdown: [],
		pointermove: [],
		pointerup: [],
		pointercancel: [],
	};

	globalThis.window = {
		addEventListener(type, callback) {
			listeners[type].push(callback);
		},
	};

	return listeners;
}

function createPlayfield() {
	const listeners = {
		touchstart: [],
		touchmove: [],
		pointerdown: [],
		pointermove: [],
		pointerup: [],
		pointercancel: [],
	};
	return {
		style: {},
		addEventListener(type, callback) {
			listeners[type].push(callback);
		},
		getBoundingClientRect() {
			return { left: 10, top: 20, width: 300, height: 200 };
		},
		setPointerCapture: vi.fn(),
		releasePointerCapture: vi.fn(),
		listeners,
	};
}

function pointerEvent(pointerId, x, y) {
	return {
		pointerId,
		clientX: x,
		clientY: y,
		cancelable: true,
		preventDefault: vi.fn(),
	};
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

	it("maps a joystick drag using the dead zone, clamp, and horizontal tie break", () => {
		installWindowMock();
		const playfield = createPlayfield();
		const input = new InputController(playfield);

		playfield.listeners.pointerdown[0](pointerEvent(1, 110, 120));
		playfield.listeners.pointermove[0](pointerEvent(1, 128, 138));
		expect(input.consumeDirection()).toBe("right");
		expect(input.isDown("arrowright")).toBe(true);

		playfield.listeners.pointermove[0](pointerEvent(1, 10, 20));
		expect(input.joystickKnob).toEqual({
			x: 71.7157287525381,
			y: 71.7157287525381,
		});
		playfield.listeners.pointermove[0](pointerEvent(1, 114, 124));
		expect(input.consumeDirection()).toBe("left");

		playfield.listeners.pointerup[0](pointerEvent(1, 110, 120));
		expect(input.isDown("arrowright")).toBe(false);
	});

	it("keeps joystick capture while an action pointer queues an immediate action", () => {
		installWindowMock();
		const playfield = createPlayfield();
		const input = new InputController(playfield);

		playfield.listeners.pointerdown[0](pointerEvent(1, 80, 100));
		playfield.listeners.pointermove[0](pointerEvent(1, 130, 100));
		playfield.listeners.pointerdown[0](pointerEvent(2, 240, 150));

		expect(playfield.setPointerCapture).toHaveBeenCalledWith(1);
		expect(input.joystickPointerId).toBe(1);
		expect(input.consumeDirection()).toBe("right");
		expect(input.consumePress("action")).toBe(true);
		expect(input.consumePress("action")).toBe(false);

		playfield.listeners.pointercancel[0](pointerEvent(2, 240, 150));
		expect(input.joystickPointerId).toBe(1);
		playfield.listeners.pointercancel[0](pointerEvent(1, 130, 100));
		expect(input.joystickPointerId).toBe(null);
	});

	it("ignores pointers outside the playfield", () => {
		installWindowMock();
		const playfield = createPlayfield();
		const input = new InputController(playfield);

		playfield.listeners.pointerdown[0](pointerEvent(4, 9, 20));
		expect(input.joystickPointerId).toBe(null);
	});
});
