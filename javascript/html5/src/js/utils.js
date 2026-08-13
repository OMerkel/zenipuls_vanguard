export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function randomInRange(min, max) {
	return min + Math.random() * (max - min);
}

export function intersects(a, b) {
	return (
		a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
	);
}

export function choose(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export function lerp(a, b, t) {
	return a + (b - a) * t;
}
