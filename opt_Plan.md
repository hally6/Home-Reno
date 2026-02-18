# Optimization Plan

## High Priority

### 1. Reduce Form State Complexity

**Problem:** Forms like `TaskForm` use 20+ individual `useState` calls, increasing risk of stale state and making reset/prefill logic error-prone.

**Solution:**
- Consolidate each form's state into a single `useReducer` or a unified state object.
- Create a shared `useForm` hook that handles field updates, validation, dirty tracking, and reset.
- Keep per-field error state colocated with the form reducer.

**Files:**
- `src/screens/forms/TaskFormScreen.tsx`
- `src/screens/forms/ExpenseFormScreen.tsx`
- `src/screens/forms/EventFormScreen.tsx`
- `src/screens/forms/QuoteFormScreen.tsx`
- New: `src/hooks/useForm.ts`

**Acceptance Criteria:**
- Each form uses a single state object or reducer instead of individual `useState` calls.
- Reset and prefill work by dispatching a single action.
- No regression in form validation behavior.

---

### 2. Add Soft Deletes to Rooms and Events

**Problem:** Tasks support `deleted_at` but rooms and events are hard-deleted. This risks orphaned foreign key references and inconsistent data integrity.

**Solution:**
- Add `deleted_at` column to `rooms` and `events` tables via migration.
- Update all repository queries to filter `WHERE deleted_at IS NULL` by default.
- Update delete operations to set `deleted_at = NOW()` instead of `DELETE FROM`.
- Add a "purge" option in settings to permanently remove soft-deleted records.

**Files:**
- `src/data/database.ts` (migration)
- `src/data/repositories/roomRepository.ts`
- `src/data/repositories/eventRepository.ts`
- `src/data/repositories/dashboardRepository.ts` (aggregation queries)
- `src/screens/settings/` (purge UI)

**Acceptance Criteria:**
- Deleting a room or event sets `deleted_at` rather than removing the row.
- All list/detail queries exclude soft-deleted records.
- Existing backup/restore handles the new column.
- A purge mechanism exists for permanent removal.

---

### 3. Granular Cache Invalidation

**Problem:** `refreshData()` clears the entire Zustand query cache, causing every screen to re-fetch after any single mutation.

**Solution:**
- Add key-based invalidation to `queryCacheStore` (e.g., `invalidate("tasks")`, `invalidate("room:{id}")`).
- Tag each cache entry with a domain key when stored.
- After a mutation, invalidate only the relevant domain keys.
- Keep `refreshData()` as a full-invalidation fallback for edge cases.

**Files:**
- `src/state/queryCacheStore.ts`
- `src/hooks/useQuery.ts`
- All repository call sites that trigger `refreshData()`

**Acceptance Criteria:**
- Editing a task only invalidates task-related and dashboard caches, not rooms or calendar.
- Full invalidation still works when called explicitly.
- No stale data visible after mutations.

---

### 4. Add Project README

**Problem:** No `README.md` exists. Onboarding requires reading source code to understand setup, running, and testing.

**Solution:**
- Create a `README.md` covering: project description, prerequisites, install steps, run commands (dev/build/test), project structure overview, and contribution notes.

**Files:**
- New: `README.md`

**Acceptance Criteria:**
- A new developer can clone, install, and run the app by following the README alone.

---

## Medium Priority

### 5. Move Notification Sync Off Startup Critical Path

**Problem:** The notification scheduler rebuilds the entire reminder queue on app launch, adding latency before the UI is interactive.

**Solution:**
- Defer notification sync using `InteractionManager.runAfterInteractions` or `requestIdleCallback`.
- Show the home dashboard immediately; sync notifications in the background.
- Add a loading indicator to the notification badge until sync completes.

**Files:**
- `src/services/notificationScheduler.ts`
- App entry point or root navigator where sync is triggered

**Acceptance Criteria:**
- Home screen renders without waiting for notification sync.
- Notifications still schedule correctly after background sync completes.
- No user-visible delay on app launch.

---

### 6. Add Deterministic Ordering to All Paginated Queries

**Problem:** Some queries with `LIMIT`/cursor-based pagination lack `ORDER BY`, leading to non-deterministic row ordering. Rows can be skipped or duplicated across pages.

**Solution:**
- Audit every repository method that uses `LIMIT`, `OFFSET`, or cursor-based pagination.
- Add explicit `ORDER BY` with a stable, unique sort key (e.g., primary key as tiebreaker).
- Add unit tests verifying pagination order consistency.

**Files:**
- `src/data/repositories/taskRepository.ts`
- `src/data/repositories/eventRepository.ts`
- `src/data/repositories/expenseRepository.ts`
- `src/data/repositories/searchRepository.ts`

**Acceptance Criteria:**
- Every paginated query includes an `ORDER BY` clause with a unique tiebreaker.
- Pagination tests confirm no skipped or duplicated rows.

---

### 7. Reduce Default Page Size

**Problem:** Fetching 200 items per page can cause jank on older or low-memory devices.

**Solution:**
- Reduce default page size to 50.
- Implement incremental loading (fetch next page on scroll near bottom).
- Keep 200 as a configurable max for power users or desktop/web.

**Files:**
- `src/data/repositories/` (any file with hardcoded `LIMIT 200`)
- `src/hooks/useQuery.ts` (pagination support)
- List screens that render paginated data

**Acceptance Criteria:**
- Default page size is 50.
- Scrolling to the bottom of a list triggers the next page load.
- Total item count or "load more" indicator is visible to the user.

---

### 8. Wire Up Dark Mode

**Problem:** Theme tokens for light and dark mode exist and settings has a theme preference toggle, but the UI doesn't respond to the preference.

**Solution:**
- Read `themePreference` from `AppContext` in the theme provider.
- Map preference values (`light`, `dark`, `system`) to the correct token set.
- Ensure all components reference theme tokens rather than hardcoded colors.
- Test both themes on key screens.

**Files:**
- `src/theme/` (token sets)
- `src/state/AppContext.tsx`
- Root layout or theme provider component
- Any component with hardcoded color values

**Acceptance Criteria:**
- Toggling theme preference in settings immediately switches the UI.
- "System" option follows OS dark mode setting.
- No hardcoded colors remain outside the theme token files.

---

## Low Priority

### 9. Optimistic Updates for Common Mutations

**Problem:** Toggling task status or checking off items waits for the SQLite round-trip, making the UI feel sluggish.

**Solution:**
- For simple, high-frequency mutations (task status toggle, expense check-off), update the local cache/UI state immediately.
- Perform the SQLite write in the background.
- Roll back the optimistic update if the write fails and show an error toast.

**Files:**
- `src/hooks/useQuery.ts` (optimistic update support)
- `src/state/queryCacheStore.ts`
- `src/screens/home/BoardScreen.tsx`
- `src/screens/home/TodayScreen.tsx`

**Acceptance Criteria:**
- Task status toggles reflect instantly in the UI.
- Failed writes roll back the UI and display an error message.
- No data inconsistency between UI and database.

---

### 10. Memoize Inline Styles

**Problem:** Some screens create style objects inline on every render, causing unnecessary re-renders in child components that receive them as props.

**Solution:**
- Audit screens for inline `style={{ ... }}` objects.
- Extract static styles to `StyleSheet.create()`.
- Wrap dynamic styles in `useMemo` with appropriate dependencies.

**Files:**
- All screen and component files with inline style objects (audit required)

**Acceptance Criteria:**
- No inline style object literals passed as props to child components.
- Dynamic styles are memoized.
- No visual regressions.

---

### 11. Expand E2E Test Coverage

**Problem:** Only smoke tests exist via Maestro. No regression suite covers critical user flows end to end.

**Solution:**
- Add Maestro flows for key scenarios:
  - Create task, mark as done, verify dashboard updates.
  - Add expense, verify budget totals on budget screen.
  - Create room, add tasks to it, verify room detail aggregation.
  - Backup data, restore from file, verify all entities intact.
  - Search for a task by title, verify FTS results.
- Integrate E2E run into CI as a nightly or pre-release job.

**Files:**
- `.maestro/` (new YAML flow files)
- `.github/workflows/` (CI integration)

**Acceptance Criteria:**
- At least 5 critical user flows covered by E2E tests.
- E2E tests pass consistently in CI.

---

### 12. Add Search Index Rebuild Option

**Problem:** If the FTS5 index becomes corrupted, the LIKE fallback works but is slower. Users have no way to self-recover without reinstalling.

**Solution:**
- Add a "Rebuild search index" button in settings.
- On tap, drop and recreate the `search_fts` virtual table and triggers.
- Re-index all existing tasks, events, and expenses.
- Show a progress indicator during rebuild.

**Files:**
- `src/data/database.ts` (rebuild function)
- `src/data/repositories/searchRepository.ts`
- `src/screens/settings/` (UI button)

**Acceptance Criteria:**
- Tapping "Rebuild search index" recreates the FTS table and re-populates it.
- Search works correctly after rebuild.
- Progress indicator shown during the operation.
