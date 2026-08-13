export class AudioEngine {
	constructor() {
		this.enabled = true;
		this.ctx = null;
	}

	initialize() {
		if (this.ctx || !this.enabled) {
			return;
		}
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) {
			this.enabled = false;
			return;
		}
		this.ctx = new AudioContextClass();
	}

	toggleMute() {
		this.enabled = !this.enabled;
		if (!this.enabled) {
			return false;
		}
		this.initialize();
		return true;
	}

	beep({
		frequency = 330,
		duration = 0.08,
		type = "square",
		gain = 0.035,
		slideTo = null,
	}) {
		if (!this.enabled) {
			return;
		}
		this.initialize();
		if (!this.ctx) {
			return;
		}

		const now = this.ctx.currentTime;
		const oscillator = this.ctx.createOscillator();
		const envelope = this.ctx.createGain();

		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, now);
		if (slideTo !== null) {
			oscillator.frequency.exponentialRampToValueAtTime(
				slideTo,
				now + duration,
			);
		}

		envelope.gain.setValueAtTime(0.0001, now);
		envelope.gain.exponentialRampToValueAtTime(gain, now + 0.015);
		envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

		oscillator.connect(envelope);
		envelope.connect(this.ctx.destination);
		oscillator.start(now);
		oscillator.stop(now + duration + 0.01);
	}
}
