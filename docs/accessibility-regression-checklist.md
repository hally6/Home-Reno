# Accessibility Regression Checklist

Date: 2026-02-14
Scope: Screen-reader flow and dynamic-content announcements

## Platforms

- iOS (VoiceOver)
- Android (TalkBack)

## Core Navigation

1. Open each main tab (`Home`, `Rooms`, `Calendar`, `Settings`) and verify tab labels are announced.
2. Move through screen headers and primary CTAs with swipe navigation.
3. Verify focus order is logical and does not jump unexpectedly.

## Forms and Pickers

1. `TaskForm`: verify each field label is announced before field value.
2. `EventForm`: verify time-slot selector labels are announced.
3. `Settings`: verify theme/currency/layout controls are announced with current values.
4. `DateField` and `DateTimeField`: confirm modal controls are reachable and dismissible via screen reader.

## Dynamic Content

1. Trigger a load error and verify alert text is announced (`LoadError`).
2. Trigger retry and verify success/loading state changes are announced.
3. `SearchFilters`: run a query and verify result count/empty state is announced.

## Action Controls

1. Verify icon-only action buttons have meaningful labels (edit/delete/close).
2. Verify destructive actions include clear confirmation prompts.

## Contrast and Readability

1. Validate text and controls under light mode.
2. Validate text and controls under dark mode.
3. Check overlay text/buttons on image and colored tiles.

## Result Recording

- Mark each item `PASS` / `FAIL`.
- For failures, capture:
  - screen path
  - exact control
  - expected announcement
  - actual announcement
  - device/platform
