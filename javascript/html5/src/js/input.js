export class InputController {
	constructor() {
		this.pressed = new Set();
		this.justPressed = new Set();

		window.addEventListener("keydown", (event) => {
			const key = event.key.toLowerCase();
			if (["arrowleft", "arrowright", " ", "p", "m", "a", "d"].includes(key)) {
				event.preventDefault();
			}
			if (!this.pressed.has(key)) {
				this.justPressed.add(key);
			}
			this.pressed.add(key);
		});

		window.addEventListener("keyup", (event) => {
			this.pressed.delete(event.key.toLowerCase());
		});
	}

	isDown(key) {
		return this.pressed.has(key.toLowerCase());
	}

	consumePress(key) {
		const normalized = key.toLowerCase();
		const hasPress = this.justPressed.has(normalized);
		if (hasPress) {
			this.justPressed.delete(normalized);
		}
		return hasPress;
	}

	nextFrame() {
		this.justPressed.clear();
	}
}
