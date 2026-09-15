# Zenipuls Vanguard

An original fixed-shooter implementation built with HTML5 canvas, modular JavaScript, and an arcade presentation.

## Play Online

- [Start game now...](https://omerkel.github.io/zenipuls_vanguard/javascript/html5/src/)

## Features

- Classic hostile-formation movement, edge-drop behavior, and escalating wave pressure.
- Player cannon, laser firing cooldown, destructible bunkers, and recon ship bonus target.
- Responsive HUD with score, high score, level, lives, pause, and mute controls.
- Touch controls use a full-stage-panel overlay, allowing joystick placement anywhere within the game stage without covering the control deck.
- Unit-tested core modules with strict coverage thresholds.

## Project Structure

- `javascript/html5/src/index.html`: game shell and HUD markup
- `javascript/html5/src/css/index.css`: visual theme and responsive layout
- `javascript/html5/src/js/game.js`: main game orchestration and frame pipeline
- `javascript/html5/src/js/entities.js`: entity factory functions
- `javascript/html5/src/js/input.js`: keyboard and stage-panel pointer input adapter
- `javascript/html5/src/js/config.js`: gameplay and UI configuration, including joystick visibility
- `javascript/html5/src/fonts/`: locally hosted UI fonts and their licenses
- `javascript/html5/src/js/audio.js`: audio synthesis adapter
- `javascript/html5/src/js/utils.js`: shared math and collision utilities
- `doc/software_architecture.md`: in-depth architecture and UML diagrams
- `doc/input_contract.md`: keyboard, touch, and input-intent contract

## Requirements

- Node.js 20+ (recommended)
- npm 10+

## Installation

From the repository root:

```bash
npm install
```

## Usage

### 1. Run the game in a local web server

From the repository root, start a static server (example with `http-server`):

```bash
npx http-server javascript/html5/src -p 8080
```

Then open:

```text
http://localhost:8080
```

The game is installable as a fullscreen PWA when served from `localhost` or HTTPS. On Android or desktop Chromium, open the browser menu and choose **Install app** or **Add to Home screen**. On iOS/iPadOS Safari, use **Share** and choose **Add to Home Screen**. The service worker caches the app shell and local fonts for offline launches. Opening `index.html` directly with `file://` does not enable PWA installation.

Alternative in VS Code: use Live Server on `javascript/html5/src/index.html`.

### 2. Controls

- Move: Left/Right Arrow or A/D
- Shoot: Space
- Pause/Resume: P (or Pause button)
- Mute: M (or Sound button)
- Start/Restart: Start button
- Touch: drag anywhere outside the lower-right Fire target to move; tap Fire to shoot

### 3. Development commands

Lint:

```bash
npm run lint
```

Auto-fix lint/format issues:

```bash
npm run lint:fix
```

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run coverage
```

## Testing and Coverage

Vitest is configured in `vitest.config.js` with coverage thresholds set above 96%:

- Statements: 96%
- Branches: 96%
- Functions: 96%
- Lines: 96%

Current implemented suite targets core logic modules (`audio`, `config`, `entities`, `input`, `utils`).

## Notes

- High score is persisted in browser local storage.
- Rendering and simulation are driven by `requestAnimationFrame`.
- Fonts are served locally from the hosted site; the game does not request fonts from third-party domains.
