const CACHE_NAME = "zenipuls-vanguard-v1";
const APP_SHELL = [
	"./",
	"./index.html",
	"./css/index.css",
	"./js/audio.js",
	"./js/config.js",
	"./js/entities.js",
	"./js/game.js",
	"./js/input.js",
	"./js/main.js",
	"./js/utils.js",
	"./icons/zenipuls.svg",
	"./fonts/Aldrich-Regular.ttf",
	"./fonts/ChakraPetch-Regular.ttf",
	"./fonts/ChakraPetch-Medium.ttf",
	"./fonts/ChakraPetch-SemiBold.ttf",
	"./fonts/ChakraPetch-Bold.ttf",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}
			return fetch(event.request).then((networkResponse) => {
				if (
					networkResponse.ok &&
					new URL(event.request.url).origin === self.location.origin
				) {
					const responseToCache = networkResponse.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
				}
				return networkResponse;
			});
		}),
	);
});
