# Home Planner App - Code Review Report

**Date:** 2026-02-13
**Overall Score:** B+ (7.5/10)

Good architecture, solid data layer, well-chosen dependencies. The main gaps are in testing, performance optimization, and a few correctness issues.

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Performance Issues](#2-performance-issues)
3. [Architecture & State Management](#3-architecture--state-management)
4. [Navigation & Screens](#4-navigation--screens)
5. [Component Library](#5-component-library)
6. [Theme System](#6-theme-system)
7. [Data Layer & Database](#7-data-layer--database)
8. [Query Patterns & Performance](#8-query-patterns--performance)
9. [Validation](#9-validation)
10. [Services (Notifications)](#10-services-notifications)
11. [Backup & Restore](#11-backup--restore)
12. [Utilities](#12-utilities)
13. [TypeScript Configuration](#13-typescript-configuration)
14. [Testing](#14-testing)
15. [Accessibility](#15-accessibility)
16. [Dependency Management](#16-dependency-management)
17. [Recommended Priorities](#17-recommended-priorities)

---

## 1. Critical Issues

### ~~1.1 Dynamic Table Interpolation in Backup Repository~~ (COMPLETED 2026-02-14)

- **File:** `src/data/backup/backupRepository.ts:30,39`
- **Severity:** LOW (maintainability smell, not a practical security vulnerability)
- **Description:** Dynamic table names interpolated into SQL strings. Table names are constrained to `keyof BackupPayload` and only called with hardcoded string literals from `exportProjectBackup`/`restoreProjectBackup` -- so user input never reaches these queries. This is a code-hygiene concern rather than an exploitable injection vector.
- **Code:**
  ```typescript
  const rows = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table} WHERE project_id = ? ORDER BY id`, [projectId]);
  ```
- **Fix:** Consider an explicit allowlist/switch for defense-in-depth, but this is not urgent.

### ~~1.2 N+1 Query in Tag Creation~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/taskRepository.ts:58-94`
- **Severity:** HIGH
- **Description:** Resolved. Tag lookup/linking now uses batched operations within a transaction instead of per-tag SELECT loops.
- **Fix:** Implemented in `upsertTaskTags` with batched lookup and `INSERT OR IGNORE` for `task_tags`.

### ~~1.3 Race Condition in Tag Upsert~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/taskRepository.ts:75-93`
- **Severity:** HIGH
- **Description:** Resolved. Tag upsert now runs inside `BEGIN IMMEDIATE TRANSACTION`, removing concurrent check-then-act races during tag creation/linking.
- **Code:**
  ```typescript
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM tags WHERE project_id = ? AND name = ? AND type = ? LIMIT 1`,
    [projectId, tag.name, tag.type]
  );
  if (existing?.id) {
    tagId = existing.id;
  } else {
    tagId = createId('tag');
    await db.runAsync(`INSERT INTO tags ...`, [tagId, projectId, tag.name, tag.type]);
  }
  ```
- **Fix:** Implemented transactional upsert path in `upsertTaskTags`.

### ~~1.4 Notification Queue Grows Unbounded~~ (RETRACTED)

- **File:** `src/services/notificationService.ts:91-93`
- **Severity:** N/A -- this issue does not exist in the current implementation.
- **Description:** The original report claimed the notification queue grows unbounded with duplicates. This is incorrect. `syncScheduledNotifications()` wraps its work in a transaction that first deletes all existing queue entries for the project (`DELETE FROM notification_queue WHERE project_id = ?` at line 93), then rebuilds from scratch. The queue is cleared and repopulated on every sync, so duplicates cannot accumulate.

### ~~1.5 Board Screen Silently Hides Tasks~~ (COMPLETED 2026-02-14)

- **File:** `src/screens/home/BoardScreen.tsx:74`
- **Severity:** HIGH
- **Description:** Resolved. Board columns now render full task lists (no silent truncation).
- **Fix:** Removed column truncation behavior.

### ~~1.6 Backup JSON Displayed in Plain Text~~ (COMPLETED 2026-02-14)

- **File:** `src/screens/settings/SettingsScreen.tsx:296`
- **Severity:** HIGH
- **Description:** Resolved. Settings backup restore flow now uses file picker input only.
- **Fix:** Plain-text JSON input area removed from settings screen.

### ~~1.7 Foreign Keys Not Enforced~~ (COMPLETED 2026-02-14)

- **File:** `src/data/database.ts`
- **Severity:** MEDIUM
- **Description:** Resolved. FK enforcement is enabled during initialization.
- **Fix:** `PRAGMA foreign_keys = ON` is executed in `initDatabase()`.

---

## 2. Performance Issues

| Issue                                       | Location                                                                   | Severity   | Impact                                                                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ~~No memoization on list screens~~          | ~~All list/form screens~~                                                  | ~~MEDIUM~~ | ~~Every state change re-renders all children~~ RESOLVED 2026-02-14 (Today/Board/Rooms/Calendar/SearchFilters optimized)         |
| ~~Inline styles in render~~                 | ~~`BudgetScreen.tsx`~~                                                     | ~~LOW~~    | ~~Creates new style objects each render~~ RESOLVED 2026-02-14                                                                  |
| ~~LOWER() in search defeats indexes~~       | ~~`searchRepository.ts:25-28`~~                                            | ~~MEDIUM~~ | ~~Full table scan on every search~~ RESOLVED 2026-02-14 (FTS-backed search with fallback)                                      |
| ~~Correlated subqueries in cost insights~~  | ~~`costInsightsRepository.ts:24-37`~~                                      | ~~MEDIUM~~ | ~~N subqueries per room instead of JOIN+GROUP BY~~ RESOLVED 2026-02-14 (project-scoped CTEs with JOIN + GROUP BY)              |
| ~~TaskForm has 25+ useState calls~~         | ~~`TaskFormScreen.tsx:27-58`~~                                             | ~~HIGH~~   | ~~Each field change re-renders entire form~~ RESOLVED 2026-02-14                                                               |
| ~~Calendar helpers called every render~~    | ~~`CalendarAgendaScreen.tsx`~~                                             | ~~MEDIUM~~ | ~~`agendaSubtitle()` and `agendaDotColor()` not memoized~~ RESOLVED 2026-02-14 (render path memoized and callbacks stabilized) |
| ~~No pagination on large result sets~~      | ~~`eventRepository.ts:82,130`~~                                            | ~~LOW~~    | ~~LIMIT 200/500 loaded into memory at once~~ RESOLVED 2026-02-14 (cursor-based paging APIs)                                    |
| ~~LIMIT without ORDER BY~~                  | ~~`taskRepository.ts:123`, `eventRepository.ts:82`, `searchRepository.ts:69`~~ | ~~MEDIUM~~ | ~~Non-deterministic results across app restarts~~ RESOLVED 2026-02-14                                                          |
| ~~Room grouping recalculated every render~~ | ~~`RoomsListScreen.tsx:99-105`~~                                           | ~~MEDIUM~~ | ~~IIFE grouping logic runs on every state change~~ RESOLVED 2026-02-14 (`useMemo` grouping)                                    |
| ~~Inefficient room risk calculation~~       | ~~`costInsightsRules.ts:89-136`~~                                          | ~~LOW~~    | ~~Entire project recalculates when one task updates~~ RESOLVED 2026-02-14 (input-signature cache in `buildCostInsights`)       |

---

## 3. Architecture & State Management

### Strengths

- Clean layered architecture: UI -> Business Rules -> Repositories -> SQLite
- Proper repository pattern with 16 repos and separate `*Rules.ts` validation files
- 4-tab navigation with typed route params
- Offline-first SQLite with WAL mode
- Minimal, well-chosen dependencies (18 total)
- Domain-driven directory structure with clear separation of concerns

### Issues

#### ~~3.1 Minimal Global State~~ (COMPLETED 2026-02-14)

- **File:** `src/state/AppContext.tsx`
- **Description:** `AppContext` only holds `projectId` + a refresh counter. Every screen re-fetches data on focus via `useFocusEffect`.
- **Recommendation:** Add a simple `useQuery` hook or Zustand for caching.

#### ~~3.2 No Context Value Memoization~~ (COMPLETED 2026-02-14)

- **File:** `src/state/AppContext.tsx:11-12`
- **Description:** Resolved. `AppContextProvider` now memoizes context value with `useMemo`.
- **Recommendation:** Completed.

#### ~~3.3 No Error State in Context~~ (COMPLETED 2026-02-14)

- **File:** `src/state/AppContext.tsx:3-7`
- **Description:** No way to communicate errors to child components without prop drilling.
- **Recommendation:** Add `currentError` and `clearError` to context.

#### ~~3.4 Screen-Level Data Fetching (Not Centralized)~~ (COMPLETED 2026-02-14)

- **Description:** Resolved. Shared query state/fetch boilerplate is now centralized in `src/hooks/useQuery.ts`.
- **Recommendation:** Completed and adopted in `HomeDashboardScreen`, `TodayScreen`, `BoardScreen`, `BudgetScreen`, and `CalendarAgendaScreen`.

#### ~~3.5 No Error Boundaries~~ (COMPLETED 2026-02-14)

- **Description:** Resolved. Navigation stacks are now wrapped with a reusable boundary component.
- **Recommendation:** Completed with `NavigationErrorBoundary` in Home/Rooms/Calendar and Settings tab wrapper.

---

## 4. Navigation & Screens

### Navigation Architecture

- **Root:** Bottom-tab navigator (4 tabs)
- **Tab 1 - Home:** Nested stack with 9 screens (dashboard, today, board, budget, detail views, forms)
- **Tab 2 - Rooms:** Nested stack with 3 unique screens + shared detail screens
- **Tab 3 - Calendar:** Nested stack with 1 unique screen + shared detail/form screens
- **Tab 4 - Settings:** Single screen

**Total:** 19 screens across 4 tabs.

### Screen Issues

| Severity   | Screen           | Issue                                                                                                                                                                 | Location          |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| ~~HIGH~~   | ~~BoardScreen~~  | ~~8-task column limit with no overflow indicator~~ RESOLVED 2026-02-14                                                                                                | ~~Line 74~~       |
| ~~HIGH~~   | ~~TaskForm~~     | ~~25+ individual useState calls; should use useReducer~~ RESOLVED 2026-02-14                                                                                          | ~~Lines 27-58~~   |
| ~~HIGH~~   | ~~RoomDetail~~   | ~~Fullscreen modal has no close button; only tap to dismiss~~ RESOLVED 2026-02-14                                                                                    | ~~Line 344~~      |
| ~~HIGH~~   | ~~TaskDetail~~   | ~~Silent error handling, no loading state~~ RESOLVED 2026-02-14                                                                                                      | ~~Lines 25, 34-39~~ |
| ~~MEDIUM~~ | ~~HomeDashboard~~ | ~~Cross-tab navigation via `getParent()?.navigate()` is fragile~~ RESOLVED 2026-02-14                                                                               | ~~Line 86~~       |
| ~~MEDIUM~~ | ~~CalendarAgenda~~ | ~~Hardcoded English week labels~~ RESOLVED 2026-02-14                                                                                                               | ~~Line 148~~      |
| ~~MEDIUM~~ | ~~SearchFilters~~ | ~~Hard-coded 250ms debounce, no visual spinner~~ RESOLVED 2026-02-14                                                                                                | ~~Lines 92, 166~~ |
| ~~MEDIUM~~ | ~~QuotesScreen~~ | ~~No immediate UI update on quote selection~~ (RETRACTED: `refreshData()` is called at line 81 after `selectQuote`, triggering refetch via `refreshToken` dependency) | ~~Lines 120-125~~ |
| ~~MEDIUM~~ | ~~EventForm~~    | ~~Hard-coded time slot hours (AM: 9-12, PM: 1-5)~~ RESOLVED 2026-02-14                                                                                              | ~~Lines 150-156~~ |
| ~~MEDIUM~~ | ~~AttachmentForm~~ | ~~Dynamic `require()` at runtime for expo-image-picker~~ RESOLVED 2026-02-14                                                                                        | ~~Lines 102, 131~~ |
| ~~MEDIUM~~ | ~~SettingsScreen~~ | ~~Currency field is free text with no ISO validation~~ RESOLVED 2026-02-14                                                                                          | ~~Line 102~~      |
| ~~LOW~~    | ~~AttachmentForm~~ | ~~No file size limit validation~~ RESOLVED 2026-02-14                                                                                                               | ~~Line 214~~      |
| ~~LOW~~    | ~~TaskForm~~     | ~~String sentinel `'__add_new__'` instead of enum/Symbol~~ RESOLVED 2026-02-14                                                                                      | ~~Line 18~~       |
| ~~LOW~~    | ~~RoomDetail~~   | ~~Swipe hint animation timing hardcoded (250ms/1500ms/350ms)~~ RESOLVED 2026-02-14                                                                                  | ~~Lines 104-114~~ |

### Cross-Tab Navigation Fragility

- **Files:** `HomeDashboardScreen.tsx:86` and 2+ other locations
- **Description:** Uses `navigation.getParent()?.navigate('Rooms')` which breaks if navigation hierarchy changes.
- **Fix:** Use navigation params or a navigation service.

---

## 5. Component Library

### Existing Components (8 total)

| Component            | Purpose                                     | Lines | Quality   |
| -------------------- | ------------------------------------------- | ----- | --------- |
| `Screen.tsx`         | ScrollView wrapper with theme padding       | ~32   | Excellent |
| `Card.tsx`           | Pressable container with title/subtitle/dot | ~66   | Excellent |
| `PrimaryButton.tsx`  | CTA button                                  | ~30   | Good      |
| `FormInput.tsx`      | Text input with label                       | ~58   | Good      |
| `SelectDropdown.tsx` | Custom dropdown picker                      | ~120  | Fair      |
| `DateField.tsx`      | Date picker                                 | ~150  | Fair      |
| `DateTimeField.tsx`  | DateTime picker                             | ~310  | Fair      |
| `LoadError.tsx`      | Error state (Card + Button composition)     | ~40   | Good      |

### Missing Components

- ~~Secondary/outline button variant~~ RESOLVED 2026-02-14 (`src/components/SecondaryButton.tsx`)
- ~~Badge/Chip for status indicators (currently inline-styled everywhere)~~ RESOLVED 2026-02-14 (`src/components/BadgeChip.tsx`)
- ~~Typography wrapper (font sizes scattered across screens)~~ RESOLVED 2026-02-14 (`src/components/Typography.tsx`)
- ~~Shared Modal component (duplicated in DateField + DateTimeField = 460 lines of overlap)~~ RESOLVED 2026-02-14 (`PickerModal`)
- ~~Loading spinner component (ActivityIndicator used directly)~~ RESOLVED 2026-02-14 (`src/components/LoadingSpinner.tsx`)

### ~~DateField/DateTimeField Duplication~~ (COMPLETED 2026-02-14)

- **Files:** `src/components/DateField.tsx`, `src/components/DateTimeField.tsx`
- **Description:** Resolved. Shared date/time parsing/options helpers and modal shell are extracted.
- **Fix:** Added `src/utils/datePickerHelpers.ts` and `src/components/PickerModal.tsx`, then migrated both fields.

---

## 6. Theme System

### Strengths

- Centralized color palette in `tokens.ts` (9 semantic colors)
- Consistent spacing scale: `xs: 4, sm: 8, md: 12, lg: 16, xl: 24`
- Border radius tokens: `sm: 8, md: 12, lg: 16`
- Navigation theme properly maps app tokens
- 90%+ of components use tokens consistently

### Issues

#### ~~6.1 Hard-coded Colors~~ (COMPLETED 2026-02-14)

| File                             | Color             | Should Be                              |
| -------------------------------- | ----------------- | -------------------------------------- |
| ~~`PrimaryButton.tsx:24`~~       | ~~`'#FFFFFF'`~~   | ~~`appColors.buttonText`~~ DONE        |
| ~~`HomeDashboardScreen.tsx:62`~~ | ~~`'#FFFFFF'`~~   | ~~`appColors.overlayText`~~ DONE       |
| ~~`BudgetScreen.tsx`~~           | ~~`'#FFFFFFCC'`~~ | ~~`appColors.overlayBackground`~~ DONE |
| ~~`CalendarAgendaScreen.tsx`~~   | ~~`'#FFFFFF'`~~   | ~~`appColors.overlayText`~~ DONE       |
| ~~`RoomDetailScreen.tsx`~~       | ~~`'#FFFFFF'`~~   | ~~`appColors.overlayText`~~ DONE       |
| ~~`AttachmentFormScreen.tsx`~~   | ~~`'#5A655F'`~~   | ~~`appColors.textMuted`~~ DONE         |
| ~~`SettingsScreen.tsx`~~         | ~~`'#5A655F'`~~   | ~~`appColors.textMuted`~~ DONE         |

#### ~~6.2 Missing Typography Tokens~~ (COMPLETED 2026-02-14)

- Resolved. Theme now exports `typography` presets (`titleLg`, `titleMd`, `body`, `bodyStrong`, `caption`, `captionStrong`, `metric`).
- Shared components were migrated to use typography tokens.

#### ~~6.3 No Dark Mode Path~~ (COMPLETED 2026-02-14)

- Resolved. Theme tokens now include both light and dark palettes with a selector helper.
- Navigation theme creation now supports runtime color-scheme selection.

---

## 7. Data Layer & Database

### Schema Design

10 tables with 16 strategic indexes:

- **Core entities:** projects, rooms, tasks, events, expenses, attachments, tags
- **Relationships:** task_tags (many-to-many)
- **Features:** notification_preferences, notification_queue, builder_quotes

### Strengths

- Normalized design with proper FK relationships
- Soft delete pattern via `deleted_at` for tasks
- WAL mode enabled for concurrency safety
- Timestamp auditing on all entities (created_at/updated_at)
- Parameterized queries throughout (protection against SQL injection in repositories)

### Issues

#### ~~7.1 Missing Error Handling in Schema Migration~~ (COMPLETED 2026-02-14)

- **File:** `src/data/database.ts:231-259`
- **Severity:** MEDIUM
- **Description:** Schema upgrades silently fail with empty catch blocks. If migration fails for non-platform reasons (e.g., corrupted DB), error is swallowed.
- **Fix:** Log migration failures or surface them to the caller.

#### ~~7.2 No Timeout on Database Queries~~ (COMPLETED 2026-02-14)

- **File:** `src/data/database.ts:6-18`
- **Severity:** MEDIUM
- **Description:** Only database opening has a 15-second timeout. All subsequent queries have no timeout, risking UI freezes.
- **Fix:** Implement query-level timeouts or a query execution monitor.

#### ~~7.3 Missing Transaction Error Context~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/roomRepository.ts:240-302`
- **Severity:** MEDIUM
- **Description:** Resolved. Transaction catch paths now include operation-specific context and preserve rollback-failure details.
- **Fix:** Added shared helper `src/data/repositories/transactionError.ts` and applied it to transaction flows in `roomRepository`, `projectRepository`, `quoteRepository`, and `taskRepository`.

#### ~~7.4 Inconsistent Transaction Scope~~ (COMPLETED 2026-02-14)

- **Files:** `projectRepository.ts:122`, `roomRepository.ts:243`, `quoteRepository.ts:199`
- **Severity:** MEDIUM
- **Description:** Resolved for core multi-step write paths. `taskRepository` task-save flows now wrap task row updates and tag-link updates in a single transaction.
- **Fix:** Added atomic transaction scope to `createTask` and `updateTask` in `src/data/repositories/taskRepository.ts`.

#### ~~7.5 Weak ID Generation~~ (COMPLETED 2026-02-14)

- **File:** `src/data/bootstrap.ts:3-5`
- **Severity:** MEDIUM
- **Description:** ID uses `Date.now()` + `Math.random().toString(36).slice(2, 8)`. Not cryptographically secure; collision risk with high-frequency creation.
- **Fix:** Use `crypto.getRandomValues()` or UUID v4.

---

## 8. Query Patterns & Performance

### ~~8.1 N+1 Query in Tag Management~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/taskRepository.ts:58-94`
- **Severity:** HIGH
- **Description:** Resolved. Tag lookup/link now uses batched lookup and transactional upsert path.
- **Fix:** Implemented batched operations with `INSERT OR IGNORE` linking.

### ~~8.2 Inefficient Cost Calculation~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/costInsightsRepository.ts:24-37`
- **Severity:** MEDIUM
- **Description:** Resolved. Cost insights now use project-scoped CTEs and explicit JOIN + GROUP BY aggregations for room expense/task stats.
- **Fix:** Implemented in `getCostInsightSummary()` with `project_rooms`, `expense_by_room`, and `task_stats` CTEs.

### ~~8.3 LOWER() Defeats Index Usage in Search~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/searchRepository.ts:25-28`
- **Severity:** MEDIUM
- **Description:** Resolved. Search now uses SQLite FTS (`search_fts`) with fallback logic where FTS is unavailable.
- **Fix:** Added FTS table + triggers and integrated FTS matching in `searchRepository`.

### ~~8.4 Search Results Not Globally Limited~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/searchRepository.ts:52-161`
- **Severity:** LOW
- **Description:** Resolved. Search now supports cursor-based pagination and UI "Load more" flow.
- **Fix:** Added `searchProjectPage()` with `cursor`/`limit`, and wired it in `SearchFiltersScreen`.

### 8.5 Search Relevance Scoring Too Simple

- **File:** `src/data/repositories/searchQuery.ts:60-75`
- **Severity:** LOW
- **Description:** Only considers title text match, no field weighting. Exact title match not ranked above partial room name match.
- **Fix:** Implement field weighting (title = 100%, room = 50%).

---

## 9. Validation

### ~~9.1 No Upper Bound on Expense Amounts~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/expenseRules.ts:6-13`
- **Severity:** MEDIUM
- **Description:** Only validates `amount > 0`. User can accidentally enter 1,000,000 instead of 10,000.
- **Fix:** Add max amount validation.

### ~~9.2 Weak Event Date Validation~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/eventRules.ts:6-13`
- **Severity:** MEDIUM
- **Description:** No date format validation, no future date check, no reasonable range check. User could create event in year 9999.
- **Fix:** Add ISO date format validation and date range bounds.

### ~~9.3 No Max Length on Tag Names~~ (COMPLETED 2026-02-14)

- **File:** `src/data/repositories/taskRules.ts:10-22`
- **Severity:** LOW
- **Description:** Resolved. Tag normalization now enforces maximum length constraints.
- **Fix:** Added tag length validation in `validateTaskInput`.

### ~~9.4 No Input Length Validation Across Repositories~~ (COMPLETED 2026-02-14)

- **Files:** Various repositories
- **Severity:** MEDIUM
- **Description:** Resolved. Form-backed repository validations now enforce input length limits.
- **Fix:** Added centralized limits in `src/data/repositories/inputLimits.ts` and applied checks in `taskRules`, `eventRules`, `expenseRules`, `quoteRepository`, `attachmentRepository`, `roomRepository`, and `projectRepository`.

---

## 10. Services (Notifications)

### Strengths

- Preference system for notification types (task due, event, waiting follow-up)
- Smart scheduling with configurable lead time
- Transaction protection for queue updates

### Issues

#### ~~10.1 Duplicate Notification Creation~~ (RETRACTED)

- **File:** `src/services/notificationService.ts:91-93`
- **Severity:** N/A -- this issue does not exist.
- **Description:** The original report claimed notifications duplicate indefinitely. This is incorrect. `syncScheduledNotifications()` deletes all queue entries for the project before rebuilding (line 93), within a single transaction. No duplicates accumulate.

#### ~~10.2 No Cleanup of Fired Notifications~~ (COMPLETED 2026-02-14)

- **File:** `src/services/notificationService.ts:91-104`
- **Severity:** MEDIUM
- **Description:** Queue is cleared and rebuilt on each sync. No record that notifications were fired. No audit trail.
- **Fix:** Add `fired_at` timestamp and archive fired notifications.

#### ~~10.3 Incomplete Date Parsing~~ (COMPLETED 2026-02-14)

- **File:** `src/services/notificationScheduler.ts:30-36`
- **Severity:** LOW
- **Description:** Invalid dates return null via `toDate()`, but not all calling code handles null consistently. Malformed ISO dates in the database could cause crashes.
- **Fix:** Validate ISO date format on write, not just read.

#### ~~10.4 Duplicated Lead Time Logic~~ (COMPLETED 2026-02-14)

- **File:** `src/services/notificationScheduler.ts:55,91`
- **Severity:** LOW
- **Description:** `new Date(due.getTime() - prefs.leadMinutes * 60_000)` duplicated in two places.
- **Fix:** Extract to helper function.

---

## 11. Backup & Restore

### Strengths

- Comprehensive validation in `backupValidation.ts` (FK checks, schema version)
- Warnings that backups are unencrypted
- Dual-confirmation for destructive restore operations

### Issues

#### ~~11.1 No Size Limits on Backup Files~~ (COMPLETED 2026-02-14)

- **File:** `src/data/backup/backupValidation.ts:15-38`
- **Severity:** HIGH
- **Description:** Resolved. Backup validation enforces per-table and total payload row limits.
- **Fix:** Added row-limit checks in `backupValidation.ts`.

#### ~~11.2 No Business Rule Validation During Restore~~ (COMPLETED 2026-02-14)

- **File:** `src/data/backup/backupRepository.ts:44-49`
- **Severity:** HIGH
- **Description:** Resolved. Restore path validates incoming backup through `validateBackupFile()` before any writes.
- **Fix:** Validation gate retained in `restoreProjectBackup()` before transaction starts.

#### ~~11.3 Race Condition in Export~~ (COMPLETED 2026-02-14)

- **File:** `src/data/backup/backupRepository.ts:52-63`
- **Severity:** MEDIUM
- **Description:** Resolved. Export reads payload under a transaction and commits as a consistent snapshot.
- **Fix:** `exportProjectBackup()` wraps reads in `BEGIN TRANSACTION` / `COMMIT`.

#### ~~11.4 Restore Failure Recovery~~ (COMPLETED 2026-02-14)

- **File:** `src/data/backup/backupRepository.ts:78-124`
- **Severity:** LOW
- **Description:** Restore is wrapped in a single `BEGIN IMMEDIATE TRANSACTION` (line 90) with `ROLLBACK` in the catch block (line 121). Normal failures (query errors, constraint violations) will correctly roll back both the deletes and inserts, preserving the original data. The original report overstated this as "guaranteed data loss." A pre-restore backup would add defense-in-depth against edge cases (e.g., process crash or power loss mid-transaction where the journal might not replay), but the current implementation handles standard failure modes correctly.
- **Fix (implemented):** Pre-restore snapshots are now stored in `backup_snapshots` before destructive restore writes.

---

## 12. Utilities

### File: `src/utils/format.ts` (88 lines)

### Functions

| Function                                 | Purpose                                     | Quality   |
| ---------------------------------------- | ------------------------------------------- | --------- |
| `formatCurrency(amount, currency)`       | Intl.NumberFormat-based currency formatting | Excellent |
| `formatDateTime(value)`                  | Locale-aware datetime string                | Excellent |
| `formatDate(value)`                      | Locale-aware date string                    | Excellent |
| `formatOptionLabel(value)`               | Dropdown label formatting                   | Good      |
| `getDueTrafficLight(dueAt, status, now)` | Task urgency calculation (Red/Amber/Green)  | Excellent |

### Strengths

- Proper null/undefined handling in all functions
- Locale-aware via native `Intl` API
- `getDueTrafficLight()` accepts `now` parameter for deterministic testing
- Pure functions throughout

### Issues

#### ~~12.1 No Timezone Handling~~ (COMPLETED 2026-02-14)

- **Description:** Resolved. `formatDate()` and `formatDateTime()` now accept optional timezone-aware formatting options.
- **Fix:** Added `locale`/`timeZone` options and unit tests covering timezone behavior.

#### ~~12.2 formatOptionLabel Edge Cases~~ (COMPLETED 2026-02-14)

- **Lines 45-58**
- **Description:** Doesn't handle hyphens (`'first-fix'` -> `'First-fix'`), camelCase (`'myCustomValue'` -> `'Mycustomvalue'`), or acronyms.
- **Fix:** Enhance to split on hyphens and camelCase boundaries.

#### ~~12.3 Missing Utility Functions~~ (COMPLETED 2026-02-14)

Functions needed across app but not present:

- `formatTime(hours, minutes)` - time-only display
- `calculateDaysUntilDue(dueAt)` - used for filtering
- `isOverdue(dueAt, status)` - used in multiple views
- `formatBudgetVariance(planned, actual)` - for budget display

---

## 13. TypeScript Configuration

### Strengths

- `strict: true` enabled
- Path aliases (`@/*` -> `src/*`) consistent between tsconfig and babel
- Separate `tsconfig.tests.json` targeting Node.js
- Extends `expo/tsconfig.base` for best practices

### Issues

#### ~~13.1 Navigation Props Typed as `any`~~ (COMPLETED 2026-02-14)

- **File:** `src/screens/home/HomeDashboardScreen.tsx:24` (and most other screens)
- **Description:** Resolved. Screen props now use typed navigation route definitions (`NativeStackScreenProps`), and remaining screen-level `any` usage was removed.
- **Fix:** Applied typed props across screens and replaced `any` picker-result parsing in `AttachmentFormScreen`.

#### ~~13.2 No Discriminated Unions for Complex Types~~ (COMPLETED 2026-02-14)

- **File:** `src/data/types.ts`
- **Description:** Resolved. Task domain types now include discriminated unions for waiting vs non-waiting status.
- **Fix:** Implemented in `src/data/types.ts`:
  ```typescript
  type Task = BaseTask &
    | { status: 'waiting'; waitingReason: WaitingReason }
    | { status: Exclude<TaskStatus, 'waiting'>; waitingReason: null };
  ```

---

## 14. Testing

### Current Coverage

| Category       | Files  | Tests    | Coverage status          |
| -------------- | ------ | -------- | ------------------------ |
| Business rules | 7+     | 30+      | Strong                   |
| Components     | 8      | 7        | Initial suite in place   |
| Screens        | 19     | 0        | Not started              |
| Navigation     | 4      | 0        | Not started              |
| Services       | 2      | 1+ file  | Partial                  |
| Repositories   | 16     | 0 direct | Indirect via rules       |
| Utils          | 1+     | Added    | Timezone coverage added  |
| **Total**      | **57** | **40+**  | **Coverage gate active** |

### Test Infrastructure

- Uses Node.js built-in `node:test` for unit/rules tests
- Uses Jest + React Native Testing Library for component tests
- Tests compiled via TypeScript -> `.test-dist/` -> `node --test` for unit path
- Maestro smoke flow added at `.maestro/smoke.yaml`
- Coverage scripts + threshold checks are available via `npm run test:coverage` and `npm run test:coverage:check`

### Strengths

- Business rule tests are well-written (proper assertions, edge cases, deterministic dates)
- Good test structure: clear names, Arrange-Act-Assert pattern
- Backup validation tests are comprehensive

### Gaps

- ~~Initial component test suite exists; needs expansion~~ RESOLVED 2026-02-14 (LoadError + existing component suite expanded)
- ~~Zero screen/integration tests~~ RESOLVED 2026-02-14 (TaskDetail, HomeDashboard, SearchFilters screen tests added)
- ~~E2E automation is currently a smoke flow only; expand scenarios~~ RESOLVED 2026-02-14 (`.maestro/core-flows.yaml`)
- ~~No CI/CD integration~~ RESOLVED 2026-02-14 (GitHub Actions workflow with typecheck/lint/coverage/component tests)
- ~~Missing test fixtures/factories~~ RESOLVED 2026-02-14 (`tests/factories/index.ts`)

### Recommended Testing Roadmap

1. Expand component tests to 20+ focused cases
2. Write 15+ integration tests for screen flows
3. Expand Maestro beyond smoke flow
4. Add CI test/coverage gates
5. Maintain 70%+ coverage threshold

---

## 15. Accessibility

### Current State: Partial accessibility support

Accessibility props ARE present in multiple screens -- the original report incorrectly claimed zero support. Examples of existing coverage:

- `HomeDashboardScreen.tsx:62-71` -- Search and Filters buttons have `accessibilityRole="button"` and descriptive `accessibilityLabel` values.
- `QuotesScreen.tsx:126-149` -- Select, Edit, and Delete action buttons all have `accessibilityRole="button"` and contextual labels (e.g., `"Select quote from ${quote.builderName}"`).
- `RoomDetailScreen.tsx:169-178,266-273` -- Header edit/delete buttons and attachment action buttons have proper accessibility roles and labels.

### Remaining Gaps

Accessibility groundwork is now complete:

| Area               | Status                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Screen reader flow | Checklist added for iOS/Android verification (`docs/accessibility-regression-checklist.md`) |
| Dynamic content    | `LoadError` now uses live-region alert semantics for async failures    |
| QA                 | Dedicated accessibility regression checklist added                      |

### Recommendation

Keep shared-component defaults and add platform accessibility QA passes before release.

---

## 16. Dependency Management

### Production Dependencies (16 packages)

| Dependency                                   | Purpose          | Grade |
| -------------------------------------------- | ---------------- | ----- |
| expo ~54.0.33                                | Framework        | A+    |
| react 19.1.0                                 | UI library       | A+    |
| react-native 0.81.5                          | Native rendering | A+    |
| expo-sqlite ~16.0.10                         | Offline database | A+    |
| @react-navigation/\* ^6.x                    | Navigation       | A+    |
| expo-document-picker ~14.0.7                 | File picking     | A     |
| expo-image-picker ~17.0.8                    | Photo picking    | A     |
| expo-file-system ^19.0.21                    | File storage     | A     |
| @react-native-community/datetimepicker 8.4.4 | Date/time input  | A     |

### Dev Dependencies (3 packages)

- TypeScript 5.6.3, babel-plugin-module-resolver, babel-preset-expo

### Assessment

- Conservative, stable version choices
- Minimal bloat (18 total packages)
- Well-chosen libraries for offline-first architecture

### Missing Dependencies

| Package                           | Purpose               | Priority                                  |
| --------------------------------- | --------------------- | ----------------------------------------- |
| ~~jest~~                          | ~~Testing framework~~ | ~~HIGH~~ INSTALLED 2026-02-14             |
| ~~@testing-library/react-native~~ | ~~Component testing~~ | ~~HIGH~~ INSTALLED 2026-02-14             |
| ~~eslint~~                        | ~~Code linting~~      | ~~MEDIUM~~ INSTALLED 2026-02-14           |
| ~~prettier~~                      | ~~Code formatting~~   | ~~LOW~~ INSTALLED 2026-02-14              |
| ~~zustand~~                       | ~~State management~~  | ~~MEDIUM (for v1+)~~ INSTALLED 2026-02-14 |
| ~~detox or maestro~~              | ~~E2E testing~~       | ~~MEDIUM~~ MAESTRO FLOW ADDED 2026-02-14  |

---

## 17. Recommended Priorities

### Phase 1 - Correctness & Safety (P0)

1. ~~Enable `PRAGMA foreign_keys = ON` in database init~~ (DONE 2026-02-14)
2. ~~Fix N+1 + race condition in tag creation (`INSERT OR IGNORE`)~~ (DONE 2026-02-14)
3. ~~Add "Show more" to board columns (remove 8-task truncation)~~ (DONE 2026-02-14)
4. ~~Remove backup JSON textarea from settings screen~~ (DONE 2026-02-14)
5. ~~Add max size validation to backup file parsing~~ (DONE 2026-02-14)

### Phase 2 - Performance & Developer Experience (P1)

1. ~~Add `useQuery` hook to eliminate per-screen fetch boilerplate~~ (DONE 2026-02-14)
2. ~~Consolidate TaskForm's 25 `useState` calls into `useReducer`~~ (DONE 2026-02-14)
3. ~~Add `React.memo` / `useMemo` to list screens and calendar~~ (DONE 2026-02-14)
4. ~~Refactor cost insights to use JOIN instead of correlated subqueries~~ (DONE 2026-02-14)
5. ~~Extract shared date picker logic (eliminate 460-line duplication)~~ (DONE 2026-02-14)
6. ~~Add proper transaction wrapping to all multi-step operations~~ (DONE 2026-02-14)
7. ~~Memoize AppContext value~~ (DONE 2026-02-14)

### Phase 3 - Quality & Polish (P2)

1. ~~Install Jest + React Native Testing Library; write component tests~~ (DONE 2026-02-14)
2. ~~Extend accessibility props to shared components (screens already have partial coverage)~~ (DONE 2026-02-14)
3. ~~Add typography tokens to theme system~~ (DONE 2026-02-14)
4. ~~Add error boundaries around stack navigators~~ (DONE 2026-02-14)
5. ~~Type screen navigation props properly (eliminate `any`)~~ (DONE 2026-02-14)
6. ~~Add input length validation across all forms~~ (DONE 2026-02-14)
7. ~~Fix hard-coded colors in screens (replace with tokens)~~ (DONE 2026-02-14)
8. ~~Add proper error context to transaction error handling~~ (DONE 2026-02-14)
9. ~~Set up ESLint + Prettier~~ (DONE 2026-02-14)

### Phase 4 - Enhancements (P3)

1. ~~Implement cursor-based pagination for large lists~~ (DONE 2026-02-14)
2. ~~Add SQLite FTS for search performance~~ (DONE 2026-02-14)
3. ~~Implement Zustand or similar for state caching~~ (DONE 2026-02-14)
4. ~~Automate E2E tests with Detox/Maestro~~ (DONE 2026-02-14)
5. ~~Add timezone support to date utilities~~ (DONE 2026-02-14)
6. ~~Create discriminated union types for task status~~ (DONE 2026-02-14)
7. ~~Consider pre-restore backup for extra safety (current transaction rollback handles normal failures)~~ (DONE 2026-02-14)
8. ~~Add coverage reporting (target 70%+)~~ (DONE 2026-02-14)

---

## Complete Issue Index

| #   | Severity   | Category             | File                                | Description                                                                                              |
| --- | ---------- | -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | ~~LOW~~    | ~~Maintainability~~  | ~~backupRepository.ts:30,39~~       | ~~Dynamic table interpolation (not a practical injection vector; table names are fixed internal keys)~~ RESOLVED 2026-02-14 |
| 2   | ~~HIGH~~   | ~~Performance~~      | ~~taskRepository.ts:58-94~~         | ~~N+1 query in tag creation~~ RESOLVED 2026-02-14                                                        |
| 3   | ~~HIGH~~   | ~~Concurrency~~      | ~~taskRepository.ts:75-93~~         | ~~Race condition in tag upsert~~ RESOLVED 2026-02-14                                                     |
| 4   | ~~HIGH~~   | ~~Memory~~           | ~~notificationScheduler.ts:69-82~~  | ~~Unbounded notification queue~~ RETRACTED: queue is cleared and rebuilt each sync                       |
| 5   | ~~HIGH~~   | ~~UX~~               | ~~BoardScreen.tsx:74~~              | ~~Tasks hidden by silent truncation~~ RESOLVED 2026-02-14                                                |
| 6   | ~~HIGH~~   | ~~Security~~         | ~~SettingsScreen.tsx:296~~          | ~~Backup JSON in plain text textarea~~ RESOLVED 2026-02-14                                               |
| 7   | ~~MEDIUM~~ | ~~Data Integrity~~   | ~~database.ts~~                     | ~~Foreign keys not enforced~~ RESOLVED 2026-02-14                                                        |
| 8   | ~~MEDIUM~~ | ~~Error Handling~~   | ~~database.ts:231-259~~             | ~~Silent schema migration failures~~ RESOLVED 2026-02-14                                                |
| 9   | ~~MEDIUM~~ | ~~Performance~~      | ~~database.ts:6-18~~                | ~~No query timeout~~ RESOLVED 2026-02-14                                                                |
| 10  | ~~HIGH~~   | ~~Performance~~      | ~~costInsightsRepository.ts:24-37~~ | ~~Inefficient correlated subqueries~~ RESOLVED 2026-02-14                                                |
| 11  | ~~MEDIUM~~ | ~~Performance~~      | ~~searchRepository.ts:25-28~~       | ~~LOWER() defeats indexes~~ RESOLVED 2026-02-14 (FTS-backed search)                                      |
| 12  | ~~MEDIUM~~ | ~~Query~~            | ~~Multiple files~~                  | ~~LIMIT without ORDER BY~~ RESOLVED 2026-02-14                                                          |
| 13  | ~~HIGH~~   | ~~Error Handling~~   | ~~roomRepository.ts:240-302~~       | ~~Weak transaction error handling~~ RESOLVED 2026-02-14                                                  |
| 14  | ~~MEDIUM~~ | ~~Data Integrity~~   | ~~Multiple files~~                  | ~~Inconsistent transaction scope~~ RESOLVED 2026-02-14                                                   |
| 15  | ~~MEDIUM~~ | ~~Input Validation~~ | ~~Multiple files~~                  | ~~No length/sanitization validation~~ RESOLVED 2026-02-14                                                |
| 16  | ~~MEDIUM~~ | ~~State~~            | ~~AppContext.tsx:5-6~~              | ~~Overly simple refresh mechanism~~ RESOLVED 2026-02-14                                                 |
| 17  | ~~MEDIUM~~ | ~~State~~            | ~~AppContext.tsx:3-7~~              | ~~No error state in context~~ RESOLVED 2026-02-14                                                       |
| 18  | ~~LOW~~    | ~~Performance~~      | ~~AppContext.tsx:11-12~~            | ~~No context value memoization~~ RESOLVED 2026-02-14                                                     |
| 19  | ~~HIGH~~   | ~~Memory~~           | ~~notificationScheduler.ts:69-82~~  | ~~Duplicate notifications per task~~ RETRACTED: queue is cleared and rebuilt each sync                   |
| 20  | ~~MEDIUM~~ | ~~Audit~~            | ~~notificationService.ts:91-104~~   | ~~No fired notification log~~ RESOLVED 2026-02-14                                                       |
| 21  | ~~MEDIUM~~ | ~~Validation~~       | ~~expenseRules.ts:6-13~~            | ~~No upper bound on amounts~~ RESOLVED 2026-02-14                                                       |
| 22  | ~~MEDIUM~~ | ~~Validation~~       | ~~eventRules.ts:6-13~~              | ~~Weak date validation~~ RESOLVED 2026-02-14                                                            |
| 23  | ~~LOW~~    | ~~Validation~~       | ~~taskRules.ts:10-22~~              | ~~No max length on tag names~~ RESOLVED 2026-02-14                                                       |
| 24  | ~~HIGH~~   | ~~Security~~         | ~~backupValidation.ts:15-38~~       | ~~No size limits on backup files~~ RESOLVED 2026-02-14                                                   |
| 25  | ~~HIGH~~   | ~~Data Integrity~~   | ~~backupRepository.ts:44-49~~       | ~~No validation during restore~~ RESOLVED 2026-02-14                                                    |
| 26  | ~~MEDIUM~~ | ~~Concurrency~~      | ~~backupRepository.ts:52-63~~       | ~~Race condition in export~~ RESOLVED 2026-02-14                                                        |
| 27  | ~~LOW~~    | ~~Reliability~~      | ~~backupRepository.ts:78-124~~      | ~~Restore uses transaction with rollback; pre-restore backup would be nice-to-have~~ RESOLVED 2026-02-14 |
| 28  | ~~MEDIUM~~ | ~~Security~~         | ~~bootstrap.ts:3-5~~                | ~~Weak ID generation~~ RESOLVED 2026-02-14                                                              |
| 29  | ~~HIGH~~   | ~~UX~~               | ~~TaskFormScreen.tsx:27-58~~        | ~~25+ useState calls; needs useReducer~~ RESOLVED 2026-02-14                                             |
| 30  | ~~MEDIUM~~ | ~~Navigation~~       | ~~HomeDashboardScreen.tsx:86~~      | ~~Cross-tab navigation fragility~~ RESOLVED 2026-02-14                                                  |
| 31  | ~~HIGH~~   | ~~Components~~       | ~~DateField/DateTimeField~~         | ~~460 lines duplicated code~~ RESOLVED 2026-02-14                                                        |
| 32  | ~~MEDIUM~~ | ~~Theme~~            | ~~Multiple screens~~                | ~~Hard-coded colors instead of tokens~~ RESOLVED 2026-02-14                                              |
| 33  | ~~MEDIUM~~ | ~~Theme~~            | ~~N/A~~                             | ~~Missing typography tokens~~ RESOLVED 2026-02-14                                                        |
| 34  | ~~HIGH~~   | ~~Testing~~          | ~~N/A~~                             | ~~Zero component tests~~ RESOLVED 2026-02-14                                                             |
| 35  | ~~HIGH~~   | ~~Testing~~          | ~~N/A~~                             | ~~Zero screen/integration tests~~ RESOLVED 2026-02-14 (TaskDetail, HomeDashboard, SearchFilters tests added) |
| 36  | ~~LOW~~    | ~~Accessibility~~    | ~~Shared components~~               | ~~Partial coverage exists in screens; shared components still missing a11y props~~ RESOLVED 2026-02-14   |
| 37  | ~~MEDIUM~~ | ~~TypeScript~~       | ~~Screen files~~                    | ~~Navigation props typed as `any`~~ RESOLVED 2026-02-14                                                  |
| 38  | ~~LOW~~    | ~~TypeScript~~       | ~~types.ts~~                        | ~~No discriminated unions for status~~ RESOLVED 2026-02-14                                               |
| 39  | ~~MEDIUM~~ | ~~Utils~~            | ~~format.ts~~                       | ~~No timezone handling~~ RESOLVED 2026-02-14                                                             |
| 40  | ~~LOW~~    | ~~Utils~~            | ~~format.ts~~                       | ~~formatOptionLabel edge cases~~ RESOLVED 2026-02-14                                                    |

---

_Generated by Claude Code review on 2026-02-13_
