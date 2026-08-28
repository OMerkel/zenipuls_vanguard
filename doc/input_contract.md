# Zenipuls Vanguard Input Contract

## Purpose

`InputController` translates keyboard and playfield pointer events into normalized movement and action intents for `ZenipulsVanguardGame`. It owns input event state only; the game model owns movement, fire cooldown, and intent consumption timing.

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

The canvas is the playfield. Pointer coordinates are measured in its CSS-pixel bounding rectangle, so the mapping remains correct when the canvas is responsively scaled.

- A pointer down inside the playfield and outside the action button creates the joystick at that touch origin.
- The joystick pointer receives pointer capture. Additional non-action pointers do not replace the active joystick pointer.
- The playfield sets `touch-action: none` and cancels raw `touchstart`/`touchmove` defaults so mobile browsers cannot reinterpret a drag as a page scroll and cancel the pointer stream.
- Pointer movement computes its vector from the origin. Movement past the playfield edge is clamped to the playfield rectangle instead of being discarded.
- The dead-zone radius is 18 CSS pixels.
- The visual knob is clamped to 40 CSS pixels from the origin.
- The dominant vector axis selects the direction. Equal horizontal and vertical magnitudes select the horizontal direction.
- A selected joystick direction remains active until that joystick pointer is released or cancelled, including when the pointer returns to the dead zone.
- Input beginning outside the playfield does not create a joystick.

## Action Button

- The action button is a fixed circular target in the lower-right of the canvas, offset by a 24 CSS-pixel margin.
- Its radius is 46 CSS pixels.
- Pointer down in the action target immediately queues an `action` intent.
- An action pointer never captures or clears the joystick pointer.
- Joystick drag and action press can occur concurrently.
- Touch controls are not drawn until the playfield has received its first touch or pen input, and they are drawn only while the game status is `ready` or `running`. Hiding the overlay does not disable the underlying pointer mapping.

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
