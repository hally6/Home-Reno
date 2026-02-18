# E2E Smoke Checklist (Main Flows)

Date: 2026-02-09
Scope: Milestone 6 "E2E smoke tests for main flows"

## Environment

- App start command: `npm run start`
- Offline start check (already verified): `expo start --offline --port 8083`
- Automated pre-checks:
  - `npm run typecheck` -> pass
  - `npm run test:unit` -> pass

## Flow 1: Create/Edit Room

1. Open `Rooms` tab.
2. Tap `Add room`.
3. Enter room name (e.g. `Kitchen`).
4. Use `Type` dropdown (verify human-readable labels with spaces/caps).
5. Save.
6. Open created room from list.
7. Tap `Edit room`, change a value, save.
8. Verify room card updates in Rooms list.

Expected:

- Room appears in list.
- Edit persists after returning to list.

## Flow 2: Create/Edit Task (including custom dropdown options)

1. Open room detail.
2. Tap `Add task`.
3. Enter title.
4. Use `Choose room` dropdown.
5. Use `Phase`, `Status`, `Waiting reason`, `Priority` dropdowns.
6. For at least one dropdown, choose `+ Add New ...`, add custom text, confirm it is selected.
7. Save task.
8. Re-open task and verify custom value persists.

Expected:

- Task saves and appears in Room/Today/Board as applicable.
- Custom dropdown value is selectable and persisted.

## Flow 3: Create/Edit Event (AM/PM/All Day)

1. Open `Calendar` tab.
2. Tap `Add event`.
3. Enter title.
4. Select event `Type`.
5. Select `Time slot` as:
   - `AM` (verify default AM time range is applied)
   - `PM` (verify default PM time range is applied)
   - `All Day` (verify all-day behavior)
6. Save event.
7. Re-open event and verify selected slot and fields are correct.

Expected:

- Event appears in agenda.
- Slot mapping behaves correctly (`All Day` sets all-day event).

## Flow 4: Create/Edit Expense

1. Open `Budget`.
2. Tap `Add expense`.
3. Enter amount/date.
4. Use `Category` dropdown.
5. Optionally add custom category via `+ Add New Category`.
6. Choose room from dropdown (or `No room`).
7. Save.
8. Open saved expense and edit/save.

Expected:

- Expense appears in recent expenses.
- Budget totals and category/room groupings update.

## Flow 5: Offline/Error States + Retry UI

1. Start app in offline mode.
2. Navigate Home / Today / Board / Budget / Rooms / Calendar.
3. Force a load failure scenario if possible (e.g., interrupt DB open/startup once).
4. Verify error card appears with `Retry`.
5. Tap `Retry` and verify recovery behavior.

Expected:

- No silent load failures.
- User sees clear load failure message + retry action.

## Flow 6: Backup Export + Restore

1. Open `Settings` tab.
2. In `Data & Backup`, tap `Export Backup JSON`.
3. Confirm share sheet opens and backup data is generated.
4. Create a temporary room/task/expense so there is a visible delta.
5. In `Settings`, paste a known-good backup JSON into `Import backup JSON`.
6. Tap `Restore from JSON`.
7. Confirm destructive warning appears and proceed.
8. Return to `Rooms`/`Budget` and verify restored state matches backup snapshot.

Expected:

- Export completes without crash.
- Restore validation catches malformed JSON.
- Restore confirmation is required before data replacement.
- Restored snapshot is reflected across Rooms/Budget/Calendar views.

## Recording Results

- Mark each flow `PASS` / `FAIL`.
- For failures, capture:
  - screen path
  - exact action
  - expected vs actual
  - timestamp/device

## Results (2026-02-09)

- Flow 1: Create/Edit Room -> PASS
- Flow 2: Create/Edit Task (custom dropdown option) -> PASS
- Flow 3: Create/Edit Event (AM/PM/All Day) -> PASS
- Flow 4: Create/Edit Expense -> PASS
- Flow 5: Offline/Error States + Retry UI -> PASS
- Flow 6: Backup Export + Restore -> PENDING

Notes:

- Picker UX was iterated for iOS and web.
- Date/time fields now use picker-based UI where appropriate.
