# Zenipuls Vanguard Input Contract

## Purpose

`InputController` translates keyboard and viewport pointer events into normalized movement and action intents for `ZenipulsVanguardGame`. It owns input event state only; the game model owns movement, fire cooldown, and intent consumption timing.

## Keyboard Mapping

- `keydown` events normalize `event.key` to lowercase tokens.
- `pressed` tracks held keys for continuous movement.
- `justPressed` records one-frame transitions for pause and mute.
- Supported movement keys are `ArrowLeft`, `ArrowRight`, `A`, and `D`.
- `Space` queues an action intent.
- `P` toggles pause and `M` toggles mute through their edge-triggered intents.
- Repeated `keydown` events are permitted. Action input remains queued until consumed, and player fire cooldown controls its effective firing rate.
- `nextFrame()` clears only `justPressed`; it does not clear a queued action.

## Pointer Touch Mapping

Touch controls are rendered on a separate absolute canvas covering the visible stage panel. Pointer coordinates are measured in stage-panel CSS pixels, so joystick and action targets are independent of the scaled game board while remaining outside the control deck.

- A pointer down anywhere in the stage panel and outside the action button creates the joystick at that touch origin.
- Pointer tracking is attached to the stage panel; the visual overlay uses `pointer-events: none` so it does not block the game canvas beneath it or any controls outside the panel.
- The input surface sets `touch-action: none` and cancels raw `touchstart`/`touchmove` defaults so mobile browsers cannot reinterpret a drag as a page scroll and cancel the pointer stream.
- Pointer movement computes its vector from the stage-panel origin and remains valid even when the drag leaves the game board.
- The dead-zone radius is 18 CSS pixels.
- The visual knob is clamped to 40 CSS pixels from the origin.
- The dominant vector axis selects the direction. Equal horizontal and vertical magnitudes select the horizontal direction.
- A selected joystick direction remains active until that joystick pointer is released or cancelled, including when the pointer returns to the dead zone.
- `PERMANENT_JOYSTICK` in `config.js` controls initial visibility. When false, the controls appear after the first touch or pen input; when true, they are visible immediately in `ready` or `running` state.

## Action Button

- The action button is a fixed circular target in the lower-right of the stage panel, offset by a 24 CSS-pixel margin.
- Its radius is 46 CSS pixels.
- Pointer down in the action target immediately queues an `action` intent.
- An action pointer never captures or clears the joystick pointer.
- Joystick drag and action press can occur concurrently.
- Touch controls are drawn only while the game status is `ready` or `running`. When `PERMANENT_JOYSTICK` is false, they remain hidden until the first touch or pen input. Hiding the overlay does not disable the underlying pointer mapping.

## Intent Merge and Consumption

- The most recent joystick direction replaces the prior pending direction.
- Action and direction intents remain independent.
- When action and direction happen in the same frame window, both remain available: direction stays queued and action is available to fire.
- The game consumes an action only when the player has no active shot and its fire cooldown has elapsed. A queued action is retained until this condition is met.

## Pointer Cleanup

- `pointerup` and `pointercancel` clear joystick state only when their `pointerId` matches the active joystick.
- Cancelling or releasing an action pointer does not affect the active joystick.

## Public Input API

- `isDown(key)`: reports the current held state for normalized movement keys.
- `consumePress(key)`: consumes one-frame keyboard presses; `"action"` and `" "` consume the queued action.
- `consumeAction()`: consumes the queued action intent.
- `consumeDirection()`: consumes the latest queued joystick direction.
- `nextFrame()`: clears one-frame keyboard transitions.

## Related Documentation

- [Software Architecture](software_architecture.md) describes the broader runtime and domain design.
