import { beforeEach, describe, expect, it, vi } from "vitest";

import { AudioEngine } from "../src/js/audio.js";

function makeAudioContextMocks() {
	const frequencySet = vi.fn();
	const frequencyRamp = vi.fn();
	const gainSet = vi.fn();
	const gainRamp = vi.fn();
	const oscillatorConnect = vi.fn();
	const envelopeConnect = vi.fn();
	const start = vi.fn();
	const stop = vi.fn();

	const oscillator = {
		type: "",
		frequency: {
			setValueAtTime: frequencySet,
			exponentialRampToValueAtTime: frequencyRamp,
		},
		connect: oscillatorConnect,
		start,
		stop,
	};

	const gainNode = {
		gain: {
			setValueAtTime: gainSet,
			exponentialRampToValueAtTime: gainRamp,
		},
		connect: envelopeConnect,
	};

	const ctx = {
		currentTime: 10,
		destination: { id: "dest" },
		createOscillator: vi.fn(() => oscillator),
		createGain: vi.fn(() => gainNode),
	};

	return {
		ctx,
		spies: {
			frequencySet,
			frequencyRamp,
			gainSet,
			gainRamp,
			oscillatorConnect,
			envelopeConnect,
			start,
			stop,
		},
	};
}

describe("audio engine", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		globalThis.window = {};
	});

	it("disables itself when Web Audio API is unavailable", () => {
		const engine = new AudioEngine();
		engine.initialize();
		expect(engine.enabled).toBe(false);
		expect(engine.ctx).toBeNull();
	});

	it("initializes once when AudioContext exists", () => {
		const { ctx } = makeAudioContextMocks();
		const AudioContextCtor = vi.fn(() => ctx);
		globalThis.window = { AudioContext: AudioContextCtor };

		const engine = new AudioEngine();
		engine.initialize();
		engine.initialize();

		expect(AudioContextCtor).toHaveBeenCalledTimes(1);
		expect(engine.ctx).toBe(ctx);
	});

	it("supports legacy webkitAudioContext fallback", () => {
		const { ctx } = makeAudioContextMocks();
		const WebkitCtor = vi.fn(() => ctx);
		globalThis.window = { webkitAudioContext: WebkitCtor };

		const engine = new AudioEngine();
		engine.initialize();

		expect(WebkitCtor).toHaveBeenCalledTimes(1);
		expect(engine.ctx).toBe(ctx);
	});

	it("toggleMute transitions enabled state and returns expected boolean", () => {
		const { ctx } = makeAudioContextMocks();
		globalThis.window = { AudioContext: vi.fn(() => ctx) };
		const engine = new AudioEngine();

		expect(engine.toggleMute()).toBe(false);
		expect(engine.enabled).toBe(false);
		expect(engine.ctx).toBeNull();

		expect(engine.toggleMute()).toBe(true);
		expect(engine.enabled).toBe(true);
		expect(engine.ctx).toBe(ctx);
	});

	it("beep no-ops when muted", () => {
		const engine = new AudioEngine();
		engine.enabled = false;
		expect(() => engine.beep({})).not.toThrow();
	});

	it("beep shapes oscillator and envelope including slide branch", () => {
		const { ctx, spies } = makeAudioContextMocks();
		globalThis.window = { AudioContext: vi.fn(() => ctx) };
		const engine = new AudioEngine();
		engine.initialize();

		engine.beep({
			frequency: 440,
			duration: 0.2,
			gain: 0.05,
			type: "triangle",
			slideTo: 660,
		});

		expect(spies.frequencySet).toHaveBeenCalledWith(440, 10);
		expect(spies.frequencyRamp).toHaveBeenCalledWith(660, 10.2);
		expect(spies.gainSet).toHaveBeenCalledWith(0.0001, 10);
		expect(spies.gainRamp).toHaveBeenCalledTimes(2);
		expect(spies.oscillatorConnect).toHaveBeenCalledTimes(1);
		expect(spies.envelopeConnect).toHaveBeenCalledWith(ctx.destination);
		expect(spies.start).toHaveBeenCalledWith(10);
		expect(spies.stop.mock.calls[0][0]).toBeCloseTo(10.21, 8);
	});

	it("beep skips slide ramp when slideTo is null", () => {
		const { ctx, spies } = makeAudioContextMocks();
		globalThis.window = { AudioContext: vi.fn(() => ctx) };
		const engine = new AudioEngine();
		engine.initialize();

		engine.beep({ frequency: 300, duration: 0.1, slideTo: null });
		expect(spies.frequencyRamp).not.toHaveBeenCalled();
	});
});
