# plan.md

## 1. Overview

### Problem

Homeowners struggle to run renovations because planning, scheduling, and budget tracking are spread across notes, messages, and spreadsheets. Existing project tools are often desktop-first and timeline-heavy.

### Goal

Deliver a mobile-first renovation planner that helps homeowners:

- Break work into rooms and phases
- Track tasks through real renovation states
- Manage visits/deliveries/inspections
- Monitor planned vs actual spend
- Keep working offline and sync later

### Non-goals (MVP)

- AI room redesign/image generation
- Gantt/timeline chart UI
- Multi-user collaboration
- Cloud sync implementation (design for it, do local-first now)
- Multiple themes/dark mode (theme-ready only)

---

## 2. Target Users + Jobs-To-Be-Done

### Primary users

- Homeowners self-managing renovations
- Homeowners coordinating multiple trades
- Small projects and full-home refurbs

### Jobs-To-Be-Done

- “Help me know what must happen today.”
- “Help me organize tasks by room and renovation phase.”
- “Help me see what is blocked and why.”
- “Help me coordinate trade visits, deliveries, and inspections.”
- “Help me avoid budget surprises.”

---

## 3. Core User Flows

### Flow A: Create project

1. User opens app first time.
2. User creates one project with name, address, start date, budget baseline.
3. App opens Home Dashboard with empty-state prompts.

### Flow B: Add room

1. User opens Rooms tab.
2. User taps Add Room.
3. User enters room name/type and optional target dates/budget.
4. App suggests phase/task templates.
5. Room appears in Rooms List and Home progress card.

### Flow C: Add tasks

1. User opens Room Detail.
2. User adds task or applies template task.
3. User sets status, phase, estimate, optional due date, optional assignee/trade, optional waiting reason.
4. Task appears in Room Detail, Board, and Today if due/overdue/next.
5. Task appears in Calendar only if date/time assigned.

### Flow D: Schedule event

1. User opens Calendar or Room Detail.
2. User adds event type (Trade visit/Delivery/Inspection).
3. User sets date/time or all-day, links room and optional task.
4. Event appears in Agenda and Upcoming card on Home.

### Flow E: Track spend

1. User opens Budget from Home.
2. User adds expense with room, category, amount, date, optional receipt attachment.
3. Budget summary updates planned vs actual per room/category and project total.

---

## 4. Information Architecture

### Bottom Tab Navigation (MVP final)

1. Home
2. Rooms
3. Calendar
4. Settings

### Home stack

- Home Dashboard (root)
- Today
- Board (Kanban)
- Budget
- Task Detail
- Event Detail
- Expense Detail
- Search/Filters (V1 required; route from Home via "Search & Filters")

### Rooms stack

- Rooms List (root)
- Room Detail
- Task Detail
- Expense Detail
- Attachment Viewer

### Calendar stack

- Agenda (root)
- Event Detail
- Task Detail
- Create/Edit Event

### Settings stack

- Settings (root)
- Project Settings
- Data & Backup (local export/import)
- Theme Tokens Preview (dev/admin style screen optional)

---

## 5. Screen-by-Screen Specification

### Home Dashboard

Purpose: Snapshot + launchpad.

Core sections:

- Today snapshot: due count, overdue count, waiting count.
- Rooms progress overview: per-room completion and blocked count.
- Upcoming events: next 7 days trades/deliveries/inspections.
- Budget summary: planned vs actual and variance.

Primary actions:

- Open Today
- Open Board
- Open Budget
- Open Rooms
- Open Calendar

States:

- Empty: “Create first room/task/event/expense” quick actions.
- Populated: cards with concise metrics.
- Offline: badge showing local mode and pending sync count (future sync queue count can be local placeholder).

### Today

Purpose: action-focused daily list.

Sections:

- Overdue
- Due Today
- Next (next 3–7 days)
- Waiting

Task item fields shown:

- Title
- Room
- Status
- Due date/time (if present)
- Waiting reason badge (if status Waiting)

Actions:

- Change status (quick)
- Set/clear due date
- Open Task Detail

### Rooms List

Purpose: room-level planning entry.

Room card fields:

- Room name/type
- % progress
- Next actionable task
- Blocked/waiting count
- Budget spent vs planned (mini)

Actions:

- Add room
- Open Room Detail
- Filter by active/completed

### Room Detail

Purpose: phase-based execution for one room.

Sections:

- Room header: progress, budget mini-summary, target dates.
- Phases: Plan, Buy, Prep, Install, Finish, Inspect/Snag.
- Tasks grouped by phase.
- Attachments section.

Actions:

- Add task in phase
- Apply room template tasks
- Move task status
- Add attachment
- Add room-specific expense
- Add room-specific event

### Board (Kanban)

Columns:

- Ideas (or Backlog)
- Ready
- In Progress
- Waiting
- Done

Card fields:

- Title
- Room
- Trade tag
- Due date chip (if set)
- Waiting reason chip (if Waiting)

Rules:

- Mobile horizontal swipe between columns.
- Drag/drop optional for MVP; tap “Move to…” required.

### Calendar (Agenda)

View:

- Agenda list with day headers.
- Items: Events always; tasks only when dated.

Event types:

- Trade visit
- Delivery
- Inspection
- All-day item (e.g., drying time)

Actions:

- Add event
- Edit event
- Open Event Detail
- Open linked Task Detail

### Budget

Purpose: spending control.

Sections:

- Project totals (planned, actual, variance)
- By room
- By category
- Recent expenses

Actions:

- Add expense
- Edit/delete expense
- Attach receipt/photo
- Filter by room/category/date range

### Task Detail

Fields:

- Title, description
- Room
- Phase
- Status
- Waiting reason (required if Waiting)
- Due date/time optional
- Start date optional
- Trade tag(s)
- Estimate labor/material
- Actual labor/material
- Priority
- Attachments
- Linked events
- Linked expenses

Actions:

- Update fields
- Move status
- Link/unlink event
- Add attachment/expense

### Settings

Sections:

- Project profile
- Default currency/tax
- Data export/import (local)
- Notification preferences
- About/version
- Theme readiness note (single active theme in MVP)

Data & Backup behavior:

- Export backup file action (JSON snapshot, unencrypted with warning).
- Import backup file action with preflight validation.
- Destructive restore warning: replacing current project data.
- Success/failure states with retry and error messaging.

### Search/Filters (V1)

Purpose: quickly locate actionable data across project entities.

Scope:

- Query across tasks, events, and expenses.
- Filter chips: room, status, phase, date range, category.
- Sort options: relevance, date, last updated.
- Empty and no-result states.

Stretch:

- Saved filter presets (optional in V1).

---

## 6. Data Model (Entities + Fields + Relationships)

### Storage choice

Use `SQLite` via `expo-sqlite` with typed repository layer.

Justification:

- Reliable offline persistence
- Queryable/filterable for lists, agenda, and budget rollups
- Better relational integrity than AsyncStorage
- Simpler and lighter than WatermelonDB/Realm for MVP
- Clean migration path for future sync and optional ORM adoption

### Entities and fields

#### Project

| Field              | Type                          | Notes             |
| ------------------ | ----------------------------- | ----------------- |
| id                 | string (uuid)                 | PK                |
| name               | string                        | required          |
| address            | string \| null                | optional          |
| startDate          | string (ISO date) \| null     | optional          |
| targetEndDate      | string (ISO date) \| null     | optional          |
| currency           | string                        | ISO currency code |
| budgetPlannedTotal | number                        | default 0         |
| createdAt          | string (ISO datetime)         | required          |
| updatedAt          | string (ISO datetime)         | required          |
| archivedAt         | string (ISO datetime) \| null | optional          |

#### Room

| Field         | Type                                                       | Notes         |
| ------------- | ---------------------------------------------------------- | ------------- |
| id            | string (uuid)                                              | PK            |
| projectId     | string (uuid)                                              | FK -> Project |
| name          | string                                                     | required      |
| type          | enum(`kitchen`,`bathroom`,`bedroom`,`living_room`,`other`) | required      |
| orderIndex    | number                                                     | list ordering |
| status        | enum(`active`,`completed`,`on_hold`)                       |               |
| budgetPlanned | number                                                     | default 0     |
| notes         | string \| null                                             | optional      |
| createdAt     | string                                                     |               |
| updatedAt     | string                                                     |               |

#### Task

| Field             | Type                                                                          | Notes                          |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| id                | string (uuid)                                                                 | PK                             |
| projectId         | string (uuid)                                                                 | FK                             |
| roomId            | string (uuid)                                                                 | FK                             |
| title             | string                                                                        | required                       |
| description       | string \| null                                                                | optional                       |
| phase             | enum(`plan`,`buy`,`prep`,`install`,`finish`,`inspect_snag`)                   | required                       |
| status            | enum(`ideas`,`ready`,`in_progress`,`waiting`,`done`)                          | required                       |
| waitingReason     | enum(`materials`,`trades`,`drying_time`,`access`,`approvals`,`other`) \| null | required when status=`waiting` |
| dueAt             | string (ISO datetime) \| null                                                 | nullable                       |
| startAt           | string (ISO datetime) \| null                                                 | nullable                       |
| completedAt       | string (ISO datetime) \| null                                                 | nullable                       |
| priority          | enum(`low`,`medium`,`high`)                                                   | default medium                 |
| estimateLabor     | number \| null                                                                | optional                       |
| estimateMaterials | number \| null                                                                | optional                       |
| actualLabor       | number \| null                                                                | optional                       |
| actualMaterials   | number \| null                                                                | optional                       |
| sortIndex         | number                                                                        | for phase ordering             |
| createdAt         | string                                                                        |                                |
| updatedAt         | string                                                                        |                                |
| deletedAt         | string \| null                                                                | soft delete                    |

#### Event

| Field        | Type                                                  | Notes         |
| ------------ | ----------------------------------------------------- | ------------- |
| id           | string (uuid)                                         | PK            |
| projectId    | string (uuid)                                         | FK            |
| roomId       | string (uuid) \| null                                 | optional FK   |
| taskId       | string (uuid) \| null                                 | optional FK   |
| type         | enum(`trade_visit`,`delivery`,`inspection`,`all_day`) | required      |
| title        | string                                                | required      |
| description  | string \| null                                        | optional      |
| startsAt     | string (ISO datetime)                                 | required      |
| endsAt       | string (ISO datetime) \| null                         | optional      |
| isAllDay     | boolean                                               | default false |
| location     | string \| null                                        | optional      |
| contactName  | string \| null                                        | optional      |
| contactPhone | string \| null                                        | optional      |
| createdAt    | string                                                |               |
| updatedAt    | string                                                |               |

#### Expense

| Field      | Type                                                           | Notes       |
| ---------- | -------------------------------------------------------------- | ----------- |
| id         | string (uuid)                                                  | PK          |
| projectId  | string (uuid)                                                  | FK          |
| roomId     | string (uuid) \| null                                          | optional FK |
| taskId     | string (uuid) \| null                                          | optional FK |
| category   | enum(`materials`,`labor`,`tools`,`delivery`,`permits`,`other`) | required    |
| vendor     | string \| null                                                 | optional    |
| amount     | number                                                         | required    |
| taxAmount  | number \| null                                                 | optional    |
| incurredOn | string (ISO date)                                              | required    |
| notes      | string \| null                                                 | optional    |
| createdAt  | string                                                         |             |
| updatedAt  | string                                                         |             |

#### Attachment

| Field     | Type                               | Notes          |
| --------- | ---------------------------------- | -------------- |
| id        | string (uuid)                      | PK             |
| projectId | string (uuid)                      | FK             |
| roomId    | string (uuid) \| null              | optional FK    |
| taskId    | string (uuid) \| null              | optional FK    |
| expenseId | string (uuid) \| null              | optional FK    |
| kind      | enum(`photo`,`document`,`receipt`) | required       |
| uri       | string                             | local file uri |
| fileName  | string \| null                     | optional       |
| mimeType  | string \| null                     | optional       |
| sizeBytes | number \| null                     | optional       |
| createdAt | string                             |                |

#### Tag

Approach: structured fields first (`roomId`, event/task `type`, expense `category`, task `trade`) plus optional free tags.
| Field | Type | Notes |
|---|---|---|
| id | string (uuid) | PK |
| projectId | string (uuid) | FK |
| name | string | lowercase normalized |
| type | enum(`trade`,`custom`) | |
| colorToken | string \| null | theme token key |

#### TaskTag (join)

| Field  | Type          | Notes |
| ------ | ------------- | ----- |
| taskId | string (uuid) | FK    |
| tagId  | string (uuid) | FK    |

### Relationships

- Project 1:N Rooms
- Project 1:N Tasks
- Room 1:N Tasks
- Project 1:N Events
- Task 0:N Events (linked optional)
- Project 1:N Expenses
- Room 0:N Expenses
- Task 0:N Expenses
- Attachments can belong to Room or Task or Expense
- Task N:M Tags via TaskTag

### Indexes

- `tasks(projectId, status, dueAt)`
- `tasks(projectId, roomId, phase, sortIndex)`
- `tasks(projectId, dueAt)`
- `events(projectId, startsAt, isAllDay)`
- `expenses(projectId, incurredOn)`
- `expenses(projectId, roomId, category)`
- `rooms(projectId, orderIndex)`
- `attachments(projectId, createdAt)`
- `task_tags(taskId, tagId)` unique

### Filtering and sorting strategy

- Today: `status != done`, split by overdue/due today/next/waiting, sort by dueAt asc then priority desc.
- Rooms List: sort by `orderIndex`, optional by highest blocked count.
- Room Detail: group by phase order, then `status != done` first, then `sortIndex`.
- Board: filter by status columns, sort by priority then due date.
- Calendar Agenda: events + dated tasks merged by datetime asc.
- Budget: aggregate by room/category/date range.

### Offline storage considerations

- Local-first writes with optimistic UI.
- `updatedAt` and `deletedAt` for future sync conflict handling.
- Store attachment metadata in DB; files in app document directory.
- Add lightweight operation log table in V1 for cloud sync queue.
- Migrations managed with schema version table.

---

## 7. UX Rules & State Transitions

### Task status transitions

Allowed:

- Ideas -> Ready
- Ready -> In Progress
- In Progress -> Waiting
- Waiting -> In Progress
- In Progress -> Done
- Ready -> Done (small tasks)
- Done -> Ready (reopen)

### Blocked logic

- Task is blocked when `status=waiting`.
- `waitingReason` is mandatory when blocked.
- Blocked tasks surface in Home snapshot and Today Waiting section.
- Room blocked count = count of room tasks with `status=waiting`.

### Calendar inclusion rule

- Tasks appear in Calendar only when `dueAt` or `startAt` exists.
- Events always appear when `startsAt` exists.

### Date rules

- Tasks can exist without dates by default.
- All-day events set `isAllDay=true`, time hidden in list.
- Overdue = dueAt before current local datetime and status not done.

### Filters

- Global filters: room, status, phase, trade tag, waiting reason, date range.
- Board filters: room + trade + due window.
- Budget filters: room + category + date range.

### Search

- MVP optional in Home stack.
- V1 required: search by task title, room name, event title, vendor.

---

## 8. MVP Scope (In/Out)

### In MVP

- Bottom tabs: Home, Rooms, Calendar, Settings
- Home Dashboard with required cards and primary actions
- Today, Board, Budget screens
- Rooms List + Room Detail with phase-grouped tasks
- Calendar month view + Agenda with events and dated tasks
- Task/Event/Expense details and CRUD
- Attachments (photo/file/url pickers, preview, edit/remove)
- Single default theme with tokens architecture
- Offline-first local database

### Out of MVP (V1+)

- Cloud sync
- Collaboration/multi-user
- Advanced search screen (required by V1)
- Push notifications
- Dark mode
- Board drag-and-drop polish
- Promoting Board/Budget to dedicated tabs
- AI room redesign/image generation

---

## 9. Implementation Plan (Ordered Milestones)

Status key: `[x]` completed, `[-]` in progress, `[ ]` not started.

### Milestone 1: Foundations

- [x] Initialize Expo + TypeScript app.
- [x] Configure navigation with 4 tabs and stack navigators.
- [x] Add theme token system (`colors`, `spacing`, `radius`, `typography`).
- [x] Set up SQLite schema and migration runner.
- [x] Create repository interfaces and basic query helpers.

### Milestone 2: Core data and CRUD

- [x] Implement Project, Room, Task repositories.
- [x] Build seed/empty-state bootstrap for first project creation.
- [x] Implement Task status transitions and validation rules.
- [x] Add Tag and TaskTag support for trade/custom tags.

### Milestone 3: Rooms experience

- [x] Build Rooms List cards with progress and blocked counts.
- [x] Build Room Detail with phase groups and task CRUD.
- [x] Add room attachments and room budget mini-summary.

### Milestone 4: Home + planning views

- [x] Build Home Dashboard cards and navigation actions.
- [x] Build Today view sections and quick status updates.
- [x] Build Board columns and move actions.
- [x] Build Budget aggregates and expense list.

### Milestone 5: Calendar + events

- [x] Implement Event entity CRUD and Agenda rendering.
- [x] Merge dated tasks into Agenda stream.
- [x] Add Event Detail and link/unlink task flow.
- [x] Support all-day events.

### Milestone 6: Settings + hardening

- [x] Hide raw room IDs in task/expense forms and use room-name selection UI.
- [x] Project settings, currency, export/import stub.
- [x] Performance tuning for list queries and indexes.
- [x] Offline behavior checks and error states.
- [x] Unit tests for reducers/repositories and critical rules.
- [x] E2E smoke tests for main flows.
- [x] Add "Clear all data" action with destructive confirmations.
- [x] Replace raw attachment fields with add-photo/add-file/add-URL flow.
- [x] Add attachment edit/remove and long-press full-screen preview.
- [x] Add expense delete flow from Expense Detail.

### Milestone 7: Local Backup/Restore (MVP completion)

- [x] Implement backup export/import flow from Settings (export + JSON restore input + restore from file).
- [x] Add backup schema versioning and validation.
- [x] Add destructive restore confirmation flow and transaction-safe restore.
- [x] Add failure states and recovery messaging.
- [x] Add unit tests for backup schema validation edge cases.
- [x] Run and record backup/restore smoke tests on device.

### Milestone 8: V1 productivity additions

- [x] Search/Filters screen and query support.
- [x] Notifications/reminders for tasks/events (local scheduling queue scaffolding; OS push not shipped).
- [x] Notification preferences and lead-time presets in Settings.
- [x] Add room floor grouping with logical floor order and normalized labels.
- [x] Add task due traffic-light dots across Today/Board/Rooms/Calendar views.
- [x] Add event room linking dropdown (remove raw room/task ID inputs).

### Phase 5+: Builder and intelligence roadmap

- [x] Builder and quotes workflows (quote capture, compare, and selection).
- [x] Smart "what's next" rules for task prioritization and sequencing.
- [x] Cost intelligence insights (variance and overrun risk guidance).
- [ ] AI features later (post-core roadmap).

---

## 10. Acceptance Criteria (Testable Checklist)

- [x] App shows exactly 4 tabs: Home, Rooms, Calendar, Settings.
- [x] No Project tab is present.
- [x] No Gantt/timeline chart UI exists.
- [x] Home Dashboard includes Today snapshot, Rooms progress, Upcoming events, Budget summary.
- [x] Home Dashboard includes actions to open Today, Board, Budget, Rooms, Calendar.
- [x] Rooms List shows each room with progress %, next task, and blocked count.
- [x] Room Detail groups tasks by phases: Plan, Buy, Prep, Install, Finish, Inspect/Snag.
- [x] Task statuses supported: Ideas/Backlog, Ready, In Progress, Waiting, Done.
- [x] Setting status to Waiting requires selecting a waiting reason.
- [x] Tasks without dates do not appear in Calendar.
- [x] Dated tasks appear in Calendar agenda in chronological order.
- [x] Calendar supports event types: trade visit, delivery, inspection, all-day.
- [x] Calendar tab supports month grid view and Agenda toggle.
- [x] Budget shows planned vs actual totals and variance.
- [x] Expense can be linked to room and optional task.
- [x] Expense Detail supports deleting an expense.
- [x] Task and Expense forms use room-name selection (no raw room ID input for end users).
- [x] App is usable offline after initial install and data persists across app restarts.
- [x] Theme values are token-driven (no hard-coded screen colors in components).
- [x] Search/Filters screen is optional in MVP and marked required for V1.
- [x] Rooms can be grouped by floor using readable labels and logical ordering.
- [x] Task urgency is visible via traffic-light dots (complete=green, <72h=red, otherwise amber).
- [x] Attachments support photo/file/url add flows, previews, and edit/remove actions.
- [x] Settings includes destructive "Clear all data" action.
- [x] Settings supports restore from backup file picker.

---

## 11. Future Enhancements

- Dark mode using existing theme token system.
- Cloud sync with conflict resolution and operation log replay.
- Collaboration (shared household/trade access, permissions).
- Renovation templates library by property type and scope.
- Promote Board and/or Budget to dedicated bottom tabs if usage justifies.
- AI Room Regen feature: upload photo, style goals, generated concept mockups (post-V1 only).

---

## Starter Templates

### Room templates

| Room        | Default phases enabled | Notes                                            |
| ----------- | ---------------------- | ------------------------------------------------ |
| Kitchen     | All                    | Highest trade coordination, appliance lead times |
| Bathroom    | All                    | Waterproofing and inspection sensitivity         |
| Bedroom     | All                    | Lower service complexity, finish-heavy           |
| Living Room | All                    | Joinery/lighting/paint sequencing                |

### Task templates by phase

| Phase        | Template tasks                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Plan         | Measure room, capture photos, define scope, set budget, collect quotes, confirm permits/approvals                  |
| Buy          | Finalize materials list, order long-lead items, confirm delivery windows, book key trades, track purchase receipts |
| Prep         | Clear room, protect adjacent areas, isolate utilities, strip-out demo, waste removal booking                       |
| Install      | First fix services, substrate prep, core installations, second fix services, fixture/fitting install               |
| Finish       | Paint/decorate, sealant/caulking, hardware install, clean and polish, styling/setup                                |
| Inspect/Snag | Walkthrough checklist, defects/snag log, trade callbacks, final inspection sign-off, completion photos/docs        |

### High-level renovation milestones

| Milestone  | Description                                                 |
| ---------- | ----------------------------------------------------------- |
| Strip-out  | Demolition and disposal complete                            |
| First fix  | Hidden services (plumbing/electrical/HVAC framing) complete |
| Plaster    | Wall/ceiling close-up and plaster complete                  |
| Second fix | Visible fixtures, outlets, trims, fittings complete         |
| Snag       | Defects identified and rectified                            |
| Completion | Final clean, sign-off, handover documentation complete      |
