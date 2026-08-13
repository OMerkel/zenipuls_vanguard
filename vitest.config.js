import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["javascript/html5/test/**/*.test.js"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: [
				"javascript/html5/src/js/audio.js",
				"javascript/html5/src/js/config.js",
				"javascript/html5/src/js/entities.js",
				"javascript/html5/src/js/input.js",
				"javascript/html5/src/js/utils.js",
			],
			thresholds: {
				statements: 96,
				branches: 96,
				functions: 96,
				lines: 96,
			},
		},
	},
});
