import { PERMANENT_JOYSTICK } from "./config.js";

const DEAD_ZONE_RADIUS = 18;
const MAX_KNOB_DISPLACEMENT = 40;
const ACTION_BUTTON_RADIUS = 46;
const ACTION_BUTTON_MARGIN = 24;

export class InputController {
	constructor(playfield = null, controlSurface = null) {
		this.pressed = new Set();
		this.justPressed = new Set();
		this.pendingAction = false;
		this.pendingDirection = null;
		this.joystickPointerId = null;
		this.joystickOrigin = null;
		this.joystickKnob = null;
		this.joystickDirection = null;
		this.hasTouchInput = PERMANENT_JOYSTICK;

		window.addEventListener("keydown", (event) => {
			const key = event.key.toLowerCase();
			if (["arrowleft", "arrowright", " ", "p", "m", "a", "d"].includes(key)) {
				event.preventDefault();
			}
			if (key === " ") {
				this.pendingAction = true;
			}
			if (!this.pressed.has(key)) {
				this.justPressed.add(key);
			}
			this.pressed.add(key);
		});

		window.addEventListener("keyup", (event) => {
			this.pressed.delete(event.key.toLowerCase());
		});

		if (playfield) {
			this.bindPointerControls(playfield, controlSurface);
		}
	}

	bindPointerControls(playfield, controlSurface = null) {
		const stageControls = Boolean(controlSurface);
		const inputTarget = stageControls ? controlSurface : playfield;
		if (playfield.style) {
			playfield.style.touchAction = "none";
		}
		if (controlSurface?.style) {
			controlSurface.style.touchAction = "none";
		}

		// Android browsers turn an unclaimed drag into a page scroll and then kill the
		// pointer stream with pointercancel, so claim the raw touch gesture explicitly.
		const swallowTouch = (event) => {
			this.hasTouchInput = true;
			if (event.cancelable) {
				event.preventDefault();
			}
		};
		inputTarget.addEventListener("touchstart", swallowTouch, {
			passive: false,
		});
		inputTarget.addEventListener("touchmove", swallowTouch, { passive: false });

		inputTarget.addEventListener(
			"pointerdown",
			(event) => {
				if (event.pointerType === "touch" || event.pointerType === "pen") {
					this.hasTouchInput = true;
				}
				const point = stageControls
					? this.getPlayfieldPoint(controlSurface, event)
					: this.getPlayfieldPoint(playfield, event);
				if (!point) {
					return;
				}
				if (this.isActionPoint(point)) {
					this.pendingAction = true;
					return;
				}
				if (this.joystickPointerId !== null) {
					return;
				}

				this.joystickPointerId = event.pointerId;
				this.joystickOrigin = point;
				this.joystickKnob = point;
				if (!stageControls) {
					try {
						playfield.setPointerCapture?.(event.pointerId);
					} catch {
						// Capture is best-effort; the stage panel continues tracking the pointer.
					}
				}
				if (event.cancelable) {
					event.preventDefault();
				}
			},
			{ passive: false },
		);

		const handleMove = (event) => {
			if (event.pointerId !== this.joystickPointerId) {
				return;
			}
			this.updateJoystick(
				stageControls
					? this.getPlayfieldPoint(controlSurface, event, true)
					: this.getPlayfieldPoint(playfield, event, true),
			);
			if (event.cancelable) {
				event.preventDefault();
			}
		};
		inputTarget.addEventListener("pointermove", handleMove, { passive: false });

		const releasePointer = (event) => {
			if (event.pointerId !== this.joystickPointerId) {
				return;
			}
			const pointerId = this.joystickPointerId;
			this.clearJoystick();
			if (!stageControls) {
				try {
					playfield.releasePointerCapture?.(pointerId);
				} catch {
					// Capture may already have been lost.
				}
			}
		};
		inputTarget.addEventListener("pointerup", releasePointer);
		inputTarget.addEventListener("pointercancel", releasePointer);
	}

	getPlayfieldPoint(playfield, event, clampToBounds = false) {
		const rect = playfield.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
			if (!clampToBounds) {
				return null;
			}
			return {
				x: Math.min(Math.max(x, 0), rect.width),
				y: Math.min(Math.max(y, 0), rect.height),
				width: rect.width,
				height: rect.height,
			};
		}
		return { x, y, width: rect.width, height: rect.height };
	}

	isActionPoint(point) {
		const centerX = point.width - ACTION_BUTTON_MARGIN - ACTION_BUTTON_RADIUS;
		const centerY = point.height - ACTION_BUTTON_MARGIN - ACTION_BUTTON_RADIUS;
		return (
			Math.hypot(point.x - centerX, point.y - centerY) <= ACTION_BUTTON_RADIUS
		);
	}

	updateJoystick(point) {
		if (!point || !this.joystickOrigin) {
			return;
		}
		const dx = point.x - this.joystickOrigin.x;
		const dy = point.y - this.joystickOrigin.y;
		const distance = Math.hypot(dx, dy);
		const scale =
			distance > MAX_KNOB_DISPLACEMENT ? MAX_KNOB_DISPLACEMENT / distance : 1;
		this.joystickKnob = {
			x: this.joystickOrigin.x + dx * scale,
			y: this.joystickOrigin.y + dy * scale,
		};

		if (distance < DEAD_ZONE_RADIUS) {
			return;
		}

		const direction =
			Math.abs(dx) >= Math.abs(dy)
				? dx < 0
					? "left"
					: "right"
				: dy < 0
					? "up"
					: "down";
		this.joystickDirection = direction;
		this.pendingDirection = direction;
		this.pressed.delete("arrowleft");
		this.pressed.delete("arrowright");
		if (direction === "left") {
			this.pressed.add("arrowleft");
		}
		if (direction === "right") {
			this.pressed.add("arrowright");
		}
	}

	clearJoystick() {
		this.joystickPointerId = null;
		this.joystickOrigin = null;
		this.joystickKnob = null;
		this.joystickDirection = null;
		this.pressed.delete("arrowleft");
		this.pressed.delete("arrowright");
	}

	renderTouchControls(ctx, playfield, visible = true) {
		const rect = playfield.getBoundingClientRect();
		const isOverlaySurface = playfield.id === "touch-controls";
		const width = isOverlaySurface
			? Math.max(1, Math.floor(rect.width))
			: playfield.width || rect.width;
		const height = isOverlaySurface
			? Math.max(1, Math.floor(rect.height))
			: playfield.height || rect.height;
		if (playfield.width !== width || playfield.height !== height) {
			playfield.width = width;
			playfield.height = height;
		}
		ctx.clearRect(0, 0, width, height);
		if (!visible || !this.hasTouchInput) {
			return;
		}
		if (!rect.width || !rect.height) {
			return;
		}
		const scaleX = width / rect.width;
		const scaleY = height / rect.height;
		const toCanvasPoint = (point) => ({
			x: point.x * scaleX,
			y: point.y * scaleY,
		});
		const actionCenter = toCanvasPoint({
			x: width / scaleX - ACTION_BUTTON_MARGIN - ACTION_BUTTON_RADIUS,
			y: height / scaleY - ACTION_BUTTON_MARGIN - ACTION_BUTTON_RADIUS,
		});
		const actionRadius = ACTION_BUTTON_RADIUS * Math.min(scaleX, scaleY);

		ctx.save();
		ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
		ctx.strokeStyle = "rgba(255, 211, 112, 0.86)";
		ctx.fillStyle = "rgba(255, 152, 87, 0.2)";
		ctx.beginPath();
		ctx.arc(actionCenter.x, actionCenter.y, actionRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#ffe18a";
		ctx.font = `${Math.max(10, 13 * Math.min(scaleX, scaleY))}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("FIRE", actionCenter.x, actionCenter.y);

		if (this.joystickOrigin && this.joystickKnob) {
			const origin = toCanvasPoint(this.joystickOrigin);
			const knob = toCanvasPoint(this.joystickKnob);
			const joystickRadius = MAX_KNOB_DISPLACEMENT * Math.min(scaleX, scaleY);
			ctx.strokeStyle = "rgba(122, 239, 255, 0.72)";
			ctx.fillStyle = "rgba(90, 244, 255, 0.16)";
			ctx.beginPath();
			ctx.arc(origin.x, origin.y, joystickRadius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "rgba(182, 251, 255, 0.88)";
			ctx.beginPath();
			ctx.arc(knob.x, knob.y, 14 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	isDown(key) {
		return this.pressed.has(key.toLowerCase());
	}

	consumePress(key) {
		const normalized = key.toLowerCase();
		if (normalized === "action" || normalized === " ") {
			return this.consumeAction();
		}
		const hasPress = this.justPressed.has(normalized);
		if (hasPress) {
			this.justPressed.delete(normalized);
		}
		return hasPress;
	}

	consumeAction() {
		const hasAction = this.pendingAction;
		this.pendingAction = false;
		return hasAction;
	}

	consumeDirection() {
		const direction = this.pendingDirection;
		this.pendingDirection = null;
		return direction;
	}

	nextFrame() {
		this.justPressed.clear();
	}
}
