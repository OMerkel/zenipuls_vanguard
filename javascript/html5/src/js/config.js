export const GAME_CONFIG = {
	width: 960,
	height: 640,
	worldPadding: 24,
	playerSpeed: 420,
	playerShotSpeed: 640,
	hostileShotSpeed: 280,
	hostileDropDistance: 22,
	baseHostileSpeed: 44,
	maxHostileSpeed: 180,
	hostileShotInterval: [0.4, 1.4],
	reconSpawnInterval: [11, 20],
	reconSpeed: 150,
	levelHostileSpeedGain: 9,
	playerFireCooldown: 0.2,
	hostileAnimationRate: 0.45,
	particleDecay: 1.7,
	starCount: 120,
};

export const HOSTILE_ROWS = 5;
export const HOSTILE_COLS = 11;

export const HOSTILE_TYPES = [
	{ row: 0, key: "warden", points: 30, color: "#ffa84f" },
	{ row: 1, key: "raider", points: 20, color: "#82efff" },
	{ row: 2, key: "raider", points: 20, color: "#82efff" },
	{ row: 3, key: "drone", points: 10, color: "#91ff9b" },
	{ row: 4, key: "drone", points: 10, color: "#91ff9b" },
];

export const SPRITES = {
	player: ["0001000", "0011100", "0111110", "1111111", "1100011"],
	recon: ["0001111000", "0011111100", "0110110110", "1111111111", "0011001100"],
	warden: {
		a: ["00111100", "01100110", "11111111", "11011011", "01111110", "00100100"],
		b: ["00111100", "01100110", "11111111", "11011011", "00111100", "01011010"],
	},
	raider: {
		a: ["00100100", "01111110", "11111111", "10111101", "01100110", "11000011"],
		b: ["00100100", "01111110", "11111111", "10111101", "11000011", "00111100"],
	},
	drone: {
		a: ["00011000", "00111100", "11111111", "01111110", "00100100", "01011010"],
		b: ["00011000", "00111100", "11111111", "01111110", "01011010", "10000001"],
	},
};
