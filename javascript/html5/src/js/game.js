import { AudioEngine } from "./audio.js";
import { GAME_CONFIG, SPRITES } from "./config.js";
import {
	createBunkers,
	createHostileFormation,
	createPlayer,
	createStars,
} from "./entities.js";
import { InputController } from "./input.js";
import { choose, clamp, intersects, lerp, randomInRange } from "./utils.js";

const STORAGE_KEY = "zenipuls_vanguard_high_score";

export class ZenipulsVanguardGame {
	constructor(canvas, ui, touchControls = null, touchSurface = null) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.ui = ui;
		this.touchControls = touchControls;
		this.touchContext = touchControls?.getContext("2d") || null;
		this.input = new InputController(canvas, touchSurface || touchControls);
		this.audio = new AudioEngine();

		this.canvas.width = GAME_CONFIG.width;
		this.canvas.height = GAME_CONFIG.height;

		this.highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
		this.status = "ready";
		this.isMuted = false;
		this.lastFrameTime = 0;
		this.hostileFrame = "a";
		this.hostileFrameTimer = 0;

		this.stars = createStars();
		this.resetCampaign();
	}

	resetCampaign() {
		this.score = 0;
		this.level = 1;
		this.player = createPlayer(GAME_CONFIG.width, GAME_CONFIG.height);
		this.beginLevel(this.level);
	}

	beginLevel(level) {
		this.hostiles = createHostileFormation(level);
		this.bunkers = createBunkers();
		this.playerShot = null;
		this.hostileShots = [];
		this.particles = [];
		this.floatingScores = [];
		this.recon = {
			active: false,
			x: -120,
			y: 62,
			w: 84,
			h: 32,
			dir: 1,
			speed: GAME_CONFIG.reconSpeed,
			points: 100,
			baseY: 62,
			sinePhase: 0,
			sineAmplitude: 20,
			sineFrequency: 0.5,
		};

		this.hostileDirection = 1;
		this.hostileSpeed = Math.min(
			GAME_CONFIG.baseHostileSpeed +
				GAME_CONFIG.levelHostileSpeedGain * (level - 1),
			GAME_CONFIG.maxHostileSpeed,
		);
		this.hostileShotTimer = randomInRange(...GAME_CONFIG.hostileShotInterval);
		this.reconSpawnTimer = randomInRange(...GAME_CONFIG.reconSpawnInterval);
	}

	start() {
		if (this.status === "ready" || this.status === "gameover") {
			this.resetCampaign();
		}
		this.status = "running";
		this.audio.initialize();
	}

	togglePause() {
		if (this.status === "running") {
			this.status = "paused";
		} else if (this.status === "paused") {
			this.status = "running";
		}
	}

	toggleMute() {
		this.isMuted = !this.audio.toggleMute();
		this.ui.setMuteState(this.isMuted);
	}

	update(dt) {
		if (this.input.consumePress("p")) {
			this.togglePause();
		}
		if (this.input.consumePress("m")) {
			this.toggleMute();
		}

		if (this.status !== "running") {
			this.input.nextFrame();
			this.updateUi();
			return;
		}

		this.updateStars(dt);
		this.updatePlayer(dt);
		this.updateHostiles(dt);
		this.updateShots(dt);
		this.updateRecon(dt);
		this.updateParticles(dt);
		this.updateFloatingScores(dt);
		this.checkLevelProgression();

		this.updateUi();
		this.input.nextFrame();
	}

	updateStars(dt) {
		for (const star of this.stars) {
			star.y += star.speed * dt;
			star.twinkle += dt * 1.8;
			if (star.y > GAME_CONFIG.height + 2) {
				star.y = -2;
				star.x = Math.random() * GAME_CONFIG.width;
			}
		}
	}

	updatePlayer(dt) {
		const moveLeft = this.input.isDown("arrowleft") || this.input.isDown("a");
		const moveRight = this.input.isDown("arrowright") || this.input.isDown("d");
		const direction = Number(moveRight) - Number(moveLeft);

		this.player.x += direction * this.player.speed * dt;
		this.player.x = clamp(
			this.player.x,
			GAME_CONFIG.worldPadding,
			GAME_CONFIG.width - this.player.w - GAME_CONFIG.worldPadding,
		);

		this.player.fireCooldown -= dt;
		if (
			this.player.fireCooldown <= 0 &&
			!this.playerShot &&
			this.input.consumeAction()
		) {
			this.playerShot = {
				x: this.player.x + this.player.w / 2 - 2,
				y: this.player.y - 14,
				w: 4,
				h: 14,
				speed: GAME_CONFIG.playerShotSpeed,
			};
			this.player.fireCooldown = GAME_CONFIG.playerFireCooldown;
			this.audio.beep({
				frequency: 680,
				duration: 0.07,
				gain: 0.03,
				slideTo: 880,
			});
		}
	}

	updateHostiles(dt) {
		this.hostileFrameTimer += dt;
		if (this.hostileFrameTimer >= GAME_CONFIG.hostileAnimationRate) {
			this.hostileFrame = this.hostileFrame === "a" ? "b" : "a";
			this.hostileFrameTimer = 0;
			this.audio.beep({ frequency: 170, duration: 0.05, gain: 0.01 });
		}

		// Update rotation and falling physics for all hostiles
		for (const hostile of this.hostiles) {
			if (hostile.alive) {
				hostile.rotationPhase += hostile.rotationFrequency * Math.PI * 2 * dt;
			}
			// Update falling physics for Raiders
			if (hostile.isFalling) {
				const FALL_GRAVITY = 300; // pixels/s²
				hostile.vy += FALL_GRAVITY * dt;
				hostile.y += hostile.vy * dt;
			}
		}

		const activeHostiles = this.hostiles.filter((hostile) => hostile.alive);
		if (!activeHostiles.length) {
			return;
		}

		const minX = Math.min(...activeHostiles.map((hostile) => hostile.x));
		const maxX = Math.max(
			...activeHostiles.map((hostile) => hostile.x + hostile.w),
		);

		let shouldDrop = false;
		if (
			maxX >= GAME_CONFIG.width - GAME_CONFIG.worldPadding &&
			this.hostileDirection > 0
		) {
			shouldDrop = true;
		}
		if (minX <= GAME_CONFIG.worldPadding && this.hostileDirection < 0) {
			shouldDrop = true;
		}

		if (shouldDrop) {
			this.hostileDirection *= -1;
			for (const hostile of activeHostiles) {
				hostile.y += GAME_CONFIG.hostileDropDistance;
			}
			this.hostileSpeed = Math.min(
				this.hostileSpeed + 7,
				GAME_CONFIG.maxHostileSpeed + 65,
			);
		} else {
			for (const hostile of activeHostiles) {
				hostile.x += this.hostileDirection * this.hostileSpeed * dt;
			}
		}

		// Continue horizontal movement for falling Raiders
		for (const hostile of this.hostiles) {
			if (hostile.isFalling) {
				hostile.x += this.hostileDirection * this.hostileSpeed * dt;
			}
		}

		this.hostileShotTimer -= dt;
		if (this.hostileShotTimer <= 0) {
			this.fireHostileShot(activeHostiles);
			const difficultyPressure = lerp(
				1,
				0.48,
				1 - activeHostiles.length / this.hostiles.length,
			);
			this.hostileShotTimer =
				randomInRange(...GAME_CONFIG.hostileShotInterval) * difficultyPressure;
		}

		for (const hostile of activeHostiles) {
			if (!hostile.isFalling && hostile.y + hostile.h >= this.player.y + 6) {
				this.triggerGameOver("HOSTILES BREACHED THE DEFENSE LINE");
				break;
			}
		}

		// Remove falling hostiles that have gone off-screen
		for (let i = this.hostiles.length - 1; i >= 0; i -= 1) {
			const hostile = this.hostiles[i];
			if (hostile.isFalling && hostile.y > GAME_CONFIG.height) {
				hostile.alive = false;
			}
		}
	}

	fireHostileShot(activeHostiles) {
		const byColumn = new Map();
		for (const hostile of activeHostiles) {
			const existing = byColumn.get(hostile.col);
			if (!existing || hostile.y > existing.y) {
				byColumn.set(hostile.col, hostile);
			}
		}
		const candidates = [...byColumn.values()];
		if (!candidates.length) {
			return;
		}
		const shooter = choose(candidates);
		this.hostileShots.push({
			x: shooter.x + shooter.w / 2 - 2,
			y: shooter.y + shooter.h,
			w: 4,
			h: 12,
			speed: GAME_CONFIG.hostileShotSpeed,
		});
		this.audio.beep({
			frequency: 220,
			duration: 0.06,
			gain: 0.018,
			slideTo: 140,
		});
	}

	updateShots(dt) {
		if (this.playerShot) {
			this.playerShot.y -= this.playerShot.speed * dt;
			if (this.playerShot.y < -20) {
				this.playerShot = null;
			} else {
				this.handlePlayerShotCollisions();
			}
		}

		for (const shot of this.hostileShots) {
			shot.y += shot.speed * dt;
		}

		this.handleHostileShotCollisions();
		this.hostileShots = this.hostileShots.filter(
			(shot) => shot.y <= GAME_CONFIG.height + 30,
		);
	}

	handlePlayerShotCollisions() {
		if (!this.playerShot) {
			return;
		}

		for (const hostile of this.hostiles) {
			if (!hostile.alive) {
				continue;
			}
			if (intersects(this.playerShot, hostile)) {
				// Raiders fall when hit; other hostiles disappear immediately
				if (hostile.type === "raider") {
					hostile.isFalling = true;
					hostile.vy = 0;
				} else {
					hostile.alive = false;
				}
				this.score += hostile.points;
				this.spawnBurst(
					hostile.x + hostile.w / 2,
					hostile.y + hostile.h / 2,
					hostile.color,
					14,
					hostile.row,
				);
				this.spawnFloatingScore(
					hostile.x + hostile.w / 2,
					hostile.y,
					hostile.points,
				);
				this.audio.beep({
					frequency: 480,
					duration: 0.09,
					gain: 0.025,
					slideTo: 220,
				});
				this.playerShot = null;
				return;
			}
		}

		if (this.recon.active && intersects(this.playerShot, this.recon)) {
			this.recon.active = false;
			this.score += this.recon.points;
			this.spawnBurst(
				this.recon.x + this.recon.w / 2,
				this.recon.y + this.recon.h / 2,
				"#ff6f6f",
				20,
			);
			this.spawnFloatingScore(
				this.recon.x + this.recon.w / 2,
				this.recon.y,
				this.recon.points,
			);
			this.audio.beep({
				frequency: 890,
				duration: 0.16,
				gain: 0.05,
				slideTo: 260,
			});
			this.playerShot = null;
			return;
		}

		for (const bunker of this.bunkers) {
			for (const block of bunker.blocks) {
				if (block.hp <= 0) {
					continue;
				}
				if (intersects(this.playerShot, block)) {
					block.hp = Math.max(0, block.hp - 2);
					this.spawnBurst(this.playerShot.x, this.playerShot.y, "#96ffc3", 5);
					this.playerShot = null;
					return;
				}
			}
		}
	}

	handleHostileShotCollisions() {
		const remaining = [];

		for (const shot of this.hostileShots) {
			let consumed = false;

			for (const bunker of this.bunkers) {
				for (const block of bunker.blocks) {
					if (block.hp <= 0) {
						continue;
					}
					if (intersects(shot, block)) {
						block.hp -= 1;
						this.spawnBurst(shot.x, shot.y, "#8ad6ff", 4);
						consumed = true;
						break;
					}
				}
				if (consumed) {
					break;
				}
			}

			if (!consumed && intersects(shot, this.player)) {
				this.player.lives -= 1;
				this.spawnBurst(
					this.player.x + this.player.w / 2,
					this.player.y + this.player.h / 2,
					"#ff9b9b",
					18,
				);
				this.audio.beep({
					frequency: 130,
					duration: 0.17,
					gain: 0.06,
					slideTo: 70,
				});
				if (this.player.lives <= 0) {
					this.triggerGameOver("DEFENSE GRID COLLAPSED");
				}
				consumed = true;
			}

			if (!consumed) {
				remaining.push(shot);
			}
		}

		this.hostileShots = remaining;
		for (const bunker of this.bunkers) {
			bunker.blocks = bunker.blocks.filter((block) => block.hp > 0);
		}
	}

	updateRecon(dt) {
		if (!this.recon.active) {
			this.reconSpawnTimer -= dt;
			if (this.reconSpawnTimer <= 0) {
				this.recon.active = true;
				this.recon.dir = Math.random() > 0.5 ? 1 : -1;
				this.recon.x =
					this.recon.dir === 1 ? -this.recon.w - 24 : GAME_CONFIG.width + 24;
				this.recon.sinePhase = 0;
				this.reconSpawnTimer = randomInRange(...GAME_CONFIG.reconSpawnInterval);
				this.audio.beep({
					frequency: 280,
					duration: 0.22,
					gain: 0.012,
					type: "sawtooth",
					slideTo: 440,
				});
			}
			return;
		}

		// Horizontal movement
		this.recon.x += this.recon.dir * this.recon.speed * dt;

		// Sinusoidal vertical movement
		this.recon.sinePhase += this.recon.sineFrequency * Math.PI * 2 * dt;
		this.recon.y =
			this.recon.baseY +
			Math.sin(this.recon.sinePhase) * this.recon.sineAmplitude;

		if (this.recon.dir > 0 && this.recon.x > GAME_CONFIG.width + 60) {
			this.recon.active = false;
		}
		if (this.recon.dir < 0 && this.recon.x < -120) {
			this.recon.active = false;
		}
	}

	updateParticles(dt) {
		for (const p of this.particles) {
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt * GAME_CONFIG.particleDecay;
		}
		this.particles = this.particles.filter((p) => p.life > 0);
	}

	updateFloatingScores(dt) {
		for (const score of this.floatingScores) {
			score.y -= 40 * dt; // Drift upward
			score.lifetime -= dt;
		}
		this.floatingScores = this.floatingScores.filter((s) => s.lifetime > 0);
	}

	spawnFloatingScore(x, y, points) {
		this.floatingScores.push({
			x,
			y,
			points,
			lifetime: 1.0, // Visible for 1 second
		});
	}

	spawnBurst(x, y, color, count, hostileRow = undefined) {
		// Scale particle effect based on enemy row (0 = most spectacular, 4 = minimal)
		let particleCount = count;
		let minSize = 1;
		let maxSize = 3.2;
		let minSpeed = 26;
		let maxSpeed = 180;
		let particleColors = [color]; // Default: use original color

		if (hostileRow !== undefined) {
			// Row 0 (Warden): most spectacular with explosive fire colors
			if (hostileRow === 0) {
				particleCount = 64;
				minSize = 2;
				maxSize = 5;
				minSpeed = 50;
				maxSpeed = 280;
				particleColors = [
					"#ffff00",
					"#ffdd00",
					"#ffaa00",
					"#ff7700",
					"#ff3300",
					"#ff0000",
				];
			}
			// Rows 1-2 (Raider): medium explosion with warm colors
			else if (hostileRow === 1 || hostileRow === 2) {
				particleCount = 42;
				minSize = 1.4;
				maxSize = 4;
				minSpeed = 40;
				maxSpeed = 240;
				particleColors = [
					"#ffdd44",
					"#ffbb22",
					"#ff8800",
					"#ff5500",
					"#ff3300",
				];
			}
			// Rows 3-4 (Drone): keep as default with original color
		}

		for (let i = 0; i < particleCount; i += 1) {
			const angle = Math.random() * Math.PI * 2;
			const speed = randomInRange(minSpeed, maxSpeed);
			const particleColor =
				particleColors[Math.floor(Math.random() * particleColors.length)];
			this.particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: randomInRange(0.45, 1.2),
				size: randomInRange(minSize, maxSize),
				color: particleColor,
			});
		}
	}

	checkLevelProgression() {
		if (this.hostiles.every((hostile) => !hostile.alive)) {
			this.level += 1;
			this.audio.beep({
				frequency: 520,
				duration: 0.15,
				gain: 0.04,
				type: "triangle",
				slideTo: 920,
			});
			this.beginLevel(this.level);
		}
	}

	triggerGameOver(reason) {
		this.status = "gameover";
		this.ui.setStatus(reason);
		if (this.score > this.highScore) {
			this.highScore = this.score;
			localStorage.setItem(STORAGE_KEY, String(this.highScore));
		}
	}

	updateUi() {
		this.ui.setScore(this.score);
		this.ui.setHighScore(this.highScore);
		this.ui.setLevel(this.level);
		this.ui.setLives(this.player.lives);
		if (this.status === "running") {
			this.ui.setStatus("DEFENSE GRID ACTIVE");
		}
		if (this.status === "paused") {
			this.ui.setStatus("PAUSED");
		}
		if (this.status === "ready") {
			this.ui.setStatus("PRESS START TO ENGAGE");
		}
	}

	drawPixelSprite(
		x,
		y,
		spriteRows,
		color,
		scale = 4,
		glow = true,
		rotationDegrees = 0,
	) {
		const ctx = this.ctx;
		if (glow) {
			ctx.shadowColor = color;
			ctx.shadowBlur = 14;
		}
		ctx.fillStyle = color;

		// Calculate sprite dimensions for rotation center
		const spriteWidth = spriteRows[0].length * scale;
		const spriteHeight = spriteRows.length * scale;
		const centerX = x + spriteWidth / 2;
		const centerY = y + spriteHeight / 2;

		// Apply rotation if needed
		if (rotationDegrees !== 0) {
			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate((rotationDegrees * Math.PI) / 180);
			ctx.translate(-centerX, -centerY);
		}

		for (let row = 0; row < spriteRows.length; row += 1) {
			const rowData = spriteRows[row];
			for (let col = 0; col < rowData.length; col += 1) {
				if (rowData[col] === "1") {
					ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
				}
			}
		}

		if (rotationDegrees !== 0) {
			ctx.restore();
		}

		ctx.shadowBlur = 0;
	}

	render() {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		this.renderBackground(ctx);
		this.renderBunkers(ctx);
		this.renderHostiles(ctx);
		this.renderRecon(ctx);
		this.renderPlayer(ctx);
		this.renderShots(ctx);
		this.renderParticles(ctx);
		this.renderFloatingScores(ctx);
		if (this.touchContext) {
			this.input.renderTouchControls(
				this.touchContext,
				this.touchControls,
				this.status === "ready" || this.status === "running",
			);
		}
		this.renderOverlays(ctx);
	}

	renderBackground(ctx) {
		const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height);
		gradient.addColorStop(0, "#0c1f46");
		gradient.addColorStop(0.5, "#14123f");
		gradient.addColorStop(1, "#140b25");
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

		for (const star of this.stars) {
			const alpha = 0.35 + (Math.sin(star.twinkle) + 1) * 0.28;
			ctx.fillStyle = `rgba(180, 216, 255, ${alpha.toFixed(3)})`;
			ctx.fillRect(star.x, star.y, star.size, star.size);
		}

		ctx.strokeStyle = "rgba(115, 186, 255, 0.28)";
		ctx.lineWidth = 2;
		ctx.strokeRect(
			GAME_CONFIG.worldPadding,
			GAME_CONFIG.worldPadding,
			GAME_CONFIG.width - GAME_CONFIG.worldPadding * 2,
			GAME_CONFIG.height - GAME_CONFIG.worldPadding * 2,
		);

		ctx.fillStyle = "rgba(159, 218, 255, 0.05)";
		for (let y = 0; y < GAME_CONFIG.height; y += 5) {
			ctx.fillRect(0, y, GAME_CONFIG.width, 1);
		}
	}

	renderPlayer(_ctx) {
		if (this.player.lives <= 0) {
			return;
		}

		const ctx = this.ctx;
		ctx.fillStyle = "rgba(142, 255, 174, 0.12)";
		ctx.shadowColor = "rgba(142, 255, 174, 0.42)";
		ctx.shadowBlur = 16;
		ctx.fillRect(
			this.player.x - 4,
			this.player.y + this.player.h - 4,
			this.player.w + 8,
			8,
		);
		ctx.shadowBlur = 0;

		this.drawPixelSprite(
			this.player.x,
			this.player.y,
			SPRITES.player,
			"#8effae",
			6,
		);
	}

	renderHostiles(_ctx) {
		for (const hostile of this.hostiles) {
			// Render falling hostiles too; they're only removed after going off-screen
			if (!hostile.alive && !hostile.isFalling) {
				continue;
			}
			const sprite = SPRITES[hostile.type][this.hostileFrame];
			// Calculate rotation angle: sine wave between -amplitude and +amplitude
			const rotationAngle =
				Math.sin(hostile.rotationPhase) * hostile.rotationAmplitude;
			this.drawPixelSprite(
				hostile.x,
				hostile.y,
				sprite,
				hostile.color,
				4,
				true,
				rotationAngle,
			);
		}
	}

	renderBunkers(ctx) {
		for (const bunker of this.bunkers) {
			for (const block of bunker.blocks) {
				const integrity = block.hp / 3;
				const hue = Math.floor(132 - (1 - integrity) * 24);
				ctx.fillStyle = `hsla(${hue}, 92%, 70%, 0.92)`;
				ctx.fillRect(block.x, block.y, block.w, block.h);
			}
		}
	}

	renderShots(ctx) {
		if (this.playerShot) {
			ctx.fillStyle = "#fefdb9";
			ctx.shadowColor = "#fefdb9";
			ctx.shadowBlur = 10;
			ctx.fillRect(
				this.playerShot.x,
				this.playerShot.y,
				this.playerShot.w,
				this.playerShot.h,
			);
		}

		ctx.fillStyle = "#ff9fb4";
		ctx.shadowColor = "#ff9fb4";
		ctx.shadowBlur = 8;
		for (const shot of this.hostileShots) {
			ctx.fillRect(shot.x, shot.y, shot.w, shot.h);
		}
		ctx.shadowBlur = 0;
	}

	renderRecon(_ctx) {
		if (!this.recon.active) {
			return;
		}
		this.drawPixelSprite(
			this.recon.x,
			this.recon.y,
			SPRITES.recon,
			"#ff6f6f",
			4,
		);
	}

	renderParticles(ctx) {
		for (const p of this.particles) {
			ctx.fillStyle = p.color;
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillRect(p.x, p.y, p.size, p.size);
		}
		ctx.globalAlpha = 1;
	}

	renderFloatingScores(ctx) {
		ctx.font = "bold 20px 'Trebuchet MS', sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";

		for (const score of this.floatingScores) {
			const alpha = score.lifetime; // Fade from 1 to 0
			const text = `+${score.points}`;

			// Glow effect
			ctx.shadowColor = `rgba(255, 200, 0, ${alpha * 0.8})`;
			ctx.shadowBlur = 20;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;

			ctx.fillStyle = `rgba(255, 255, 150, ${alpha})`;
			ctx.fillText(text, score.x, score.y);
		}

		ctx.shadowBlur = 0;
	}

	renderOverlays(ctx) {
		if (this.status === "running") {
			return;
		}

		ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
		ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

		ctx.textAlign = "center";
		ctx.fillStyle = "#dbf5ff";
		ctx.font = "700 34px 'Trebuchet MS', sans-serif";
		ctx.fillText(
			"ZENIPULS VANGUARD",
			GAME_CONFIG.width / 2,
			GAME_CONFIG.height / 2 - 26,
		);

		ctx.font = "500 17px 'Trebuchet MS', sans-serif";
		if (this.status === "ready") {
			ctx.fillText(
				"Press Start to begin orbital defense",
				GAME_CONFIG.width / 2,
				GAME_CONFIG.height / 2 + 18,
			);
		}
		if (this.status === "paused") {
			ctx.fillText(
				"Press P to continue",
				GAME_CONFIG.width / 2,
				GAME_CONFIG.height / 2 + 18,
			);
		}
		if (this.status === "gameover") {
			ctx.fillText(
				"Press Start to deploy again",
				GAME_CONFIG.width / 2,
				GAME_CONFIG.height / 2 + 18,
			);
		}
	}

	tick = (timestamp) => {
		const dt = Math.min(
			(timestamp - this.lastFrameTime) / 1000 || 0.016,
			0.033,
		);
		this.lastFrameTime = timestamp;

		this.update(dt);
		this.render();
		window.requestAnimationFrame(this.tick);
	};

	run() {
		this.updateUi();
		window.requestAnimationFrame(this.tick);
	}
}
