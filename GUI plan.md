# GUI Improvement Plan v2 - Home Planner App

## Objectives

- Increase visual hierarchy and polish without changing core flows.
- Preserve current light/dark theming model.
- Reduce regression risk with explicit testing and phased rollout.

## Guardrails

- Keep bottom-tab navigation and existing IA.
- Avoid introducing heavy UI libraries.
- Prefer incremental, test-backed changes over full-screen rewrites.
- Respect accessibility and reduced-motion settings.

## Implementation Status (February 15, 2026)

### Completed

- Phase 1: Token foundation (theme-safe tokens, status colors, shadows, expanded typography scale)
- Phase 2: Card upgrade (`accentColor`, `size`, `headerRight`, press feedback)
- Phase 3: ProgressBar component + rollout to rooms/dashboard/board
- Phase 4: Horizontal board layout with fixed-width columns and improved headers
- Phase 5: Dashboard polish (icons, hierarchy updates, project progress summary, budget header badge)
- Phase 6: Room visual identity + room status chips + room detail identity header
- Phase 7: Shared empty states rolled out to rooms/board/calendar/budget/search
- Phase 8: Motion polish with reduced-motion guardrails and tile stagger
- Test plan runs completed: `typecheck`, `test:component`, `test:unit`

### Deferred (Intentional)

- Room color picker persistence in room form/repository (Phase 6 optional P2)
- Drag-and-drop board interactions (future enhancement)
- Gradient-heavy dashboard experiments (explicitly out of scope)

### Remaining Closure Tasks

- Manual visual QA in Expo on light/dark themes
- Manual check of reduced-motion behavior on device/simulator
- Optional e2e smoke run via Maestro before release

---

## Phase 0: Baseline + Acceptance Criteria

Do this before UI changes.

### Definition of Done

- No TypeScript errors.
- Component tests pass.
- Existing dashboard and room list flows remain functional.
- Light and dark themes render with readable contrast.

### Baseline checks

- Capture before screenshots for: Home Dashboard, Rooms List, Board, Calendar, Budget.
- Note current frame timing on Board and Rooms screens to compare after animation work.

### Files

- `docs/accessibility-regression-checklist.md` (update checklist)
- `docs/code-review-report.md` (optional summary note)

---

## Phase 1: Token Foundation (Theme-safe)

Everything below must be defined for both `lightAppColors` and `darkAppColors`.

### 1a. Elevation and surfaces

Add layered surfaces while preserving existing keys:

- `surface0` (page background)
- `surface1` (default cards)
- `surface2` (modal/popover)

### 1b. Semantic status colors by scheme

Add semantic pairs as theme-aware groups, not single hardcoded values:

- `success: { bg, text }`
- `warning: { bg, text }`
- `danger: { bg, text }`
- `info: { bg, text }`
- `neutral: { bg, text }`

### 1c. Shadow tokens

Add reusable `shadows.sm|md|lg` tokens for RN iOS/Android parity.

### 1d. Typography scale

Introduce scale tokens (`xs` through `3xl`) and weight tokens while keeping current `typography` aliases for compatibility.

### 1e. Contrast requirement

Add a design rule: text on semantic backgrounds must meet WCAG AA contrast (4.5:1 for normal text).

### Files

- `src/theme/tokens.ts`

---

## Phase 2: Card Component Upgrade (Shared component first)

High impact because `Card` is used across most screens.

### 2a. Visual elevation

- Replace default border-only look with subtle elevation (`shadows.sm`).
- Keep border fallback where needed for dark-mode contrast.

### 2b. New Card API

- `accentColor?: string` (left stripe)
- `size?: 'compact' | 'default'`
- `headerRight?: React.ReactNode`

### 2c. Press feedback

- Add scale/opacity feedback with `Animated`.
- Trigger only on user press (not mount).

### 2d. Backward compatibility

- Existing usages with only `title/subtitle/onPress` should require no code changes.

### Files

- `src/components/Card.tsx`

---

## Phase 3: ProgressBar Component + Replacements

### 3a. New component

Create `ProgressBar`:

- 4-6px height
- value `0..100`
- optional label
- animated fill on first mount only

### 3b. Initial rollout targets

- `RoomsListScreen`: replace `% complete` text with bar.
- `HomeDashboardScreen` budget card: show planned vs actual.
- `BoardScreen` column headers: show column share.

### Files

- `src/components/ProgressBar.tsx`
- `src/screens/rooms/RoomsListScreen.tsx`
- `src/screens/home/HomeDashboardScreen.tsx`
- `src/screens/home/BoardScreen.tsx`

---

## Phase 4: Board Layout Fix (Core UX)

### 4a. Horizontal Kanban

- Convert vertically stacked columns to horizontal `ScrollView`.
- Fixed-width columns (~280px).

### 4b. Column headers

- Title + count + progress bar.
- Use semantic, theme-safe tinted backgrounds.

### 4c. Empty state in columns

- Replace generic `Card` with dashed placeholder style.

### 4d. Future compatibility

- Keep structure drag-and-drop ready, but do not implement DnD now.

### Files

- `src/screens/home/BoardScreen.tsx`

---

## Phase 5: Dashboard Polish (Scoped)

### In scope

- Tile icons (Ionicons already available).
- Stronger metric hierarchy (hero number sizing).
- Project summary progress bar at top.
- Replace budget risk absolute overlay by using `Card.headerRight`.
- Make "Today" card a visual hero with controlled emphasis.

### Out of scope (defer)

- Gradient-heavy redesign experiments.
- Any information architecture changes.

### Files

- `src/screens/home/HomeDashboardScreen.tsx`
- `src/data/repositories/dashboardRepository.ts` (only if extra aggregate fields are needed)

---

## Phase 6: Rooms Visual Upgrade (Scoped)

### In scope

- Room visual identity indicator (accent stripe or avatar circle).
- Progress bar integration.
- Structured chips for blocked/in-progress/done counts.
- Next task moved to secondary row.

### Optional (P2)

- Room color picker in form + persistence.

### Files

- `src/screens/rooms/RoomsListScreen.tsx`
- `src/screens/rooms/RoomDetailScreen.tsx`
- Optional P2:
  - `src/screens/forms/RoomFormScreen.tsx`
  - `src/data/repositories/roomRepository.ts`

---

## Phase 7: Empty States (Complete Scope)

Create shared `EmptyState` component:

- `icon`, `title`, `description`, optional action slot.

Apply to:

- Rooms empty list
- Board empty column/board
- Calendar no items
- Budget no expenses
- Search no results

### Files

- `src/components/EmptyState.tsx`
- `src/screens/rooms/RoomsListScreen.tsx`
- `src/screens/home/BoardScreen.tsx`
- `src/screens/calendar/CalendarAgendaScreen.tsx`
- `src/screens/home/BudgetScreen.tsx`
- `src/screens/home/SearchFiltersScreen.tsx`

---

## Phase 8: Motion Polish (Guarded)

Apply small motion only where it adds clarity.

### Rules

- Honor reduced-motion preference.
- Avoid re-running mount animations on every data refresh.
- Prefer first-render-only animations for tiles/badges.
- Do not use `LayoutAnimation` on large lists without profiling.

### Targets

- Card press feedback
- ProgressBar fill animation
- Tile stagger on dashboard first mount
- Verify stack transitions remain consistent

### Files

- `src/components/Card.tsx`
- `src/components/ProgressBar.tsx`
- `src/screens/home/HomeDashboardScreen.tsx`
- `src/navigation/HomeStack.tsx`

---

## Test Plan (Required)

### Component tests

- Extend `tests/components/Card.jest.test.tsx` for new props and accessibility labels.
- Add `tests/components/ProgressBar.jest.test.tsx`.
- Add `tests/components/EmptyState.jest.test.tsx`.

### Screen tests

- Update `tests/screens/HomeDashboardScreen.jest.test.tsx` for headerRight/progress usage.
- Add/extend board screen test for horizontal layout and empty placeholder behavior.
- Add/extend rooms screen test for progress/chips rendering.

### Run

- `npm run typecheck`
- `npm run test:component`
- `npm run test:unit`

---

## Recommended Implementation Order

1. Phase 1: Token Foundation
2. Phase 2: Card Upgrade
3. Phase 3: ProgressBar
4. Phase 4: Board Layout
5. Phase 5: Dashboard Polish
6. Phase 6: Rooms Upgrade
7. Phase 7: Empty States
8. Phase 8: Motion Polish
9. Test Plan execution after each phase

---

## Risks and Mitigations

- Theme regressions: enforce dual-scheme tokens and contrast checks.
- Shared component regressions: ship `Card` changes with targeted tests first.
- Animation jank: gate animations to first mount and profile list-heavy screens.
- Scope creep: treat Room color picker and advanced visuals as P2 only.
