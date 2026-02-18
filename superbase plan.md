# Supabase Implementation Plan

## 1. Goals

1. Enable shared projects for partner collaboration.
2. Keep offline-first behavior with local SQLite cache.
3. Control costs with per-membership quotas.
4. Add secure auth + role-based permissions.

## 2. Platform Decisions

1. Supabase Auth for user identity.
2. Supabase Postgres as cloud source of truth.
3. Supabase Storage for attachments/backups.
4. Realtime only for high-value entities (tasks/events) in initial rollout.

## 3. Cloud Data Model

1. `profiles (id, name, created_at)`
2. `projects (id, owner_id, name, currency, home_layout, created_at, updated_at)`
3. `project_members (project_id, user_id, role)` where role = `owner|editor|viewer`
4. Domain tables mirrored from app:
   - `rooms, tasks, events, expenses, attachments, tags, task_tags, builder_quotes`
5. Billing/quota tables:
   - `membership_plans (id, name, limits_json)`
   - `project_billing (project_id, plan_id, status)`
   - `project_usage (project_id, bytes_used, attachments_count, tasks_count, rooms_count, events_count, expenses_count, updated_at)`

## 4. Security and Access (RLS)

1. Enable RLS on all project-scoped tables.
2. Read access requires membership in `project_members`.
3. Write access:
   - `owner/editor`: insert/update/delete
   - `viewer`: read only
4. Storage policies scoped by `project_id` and membership checks.

## 5. Quota Enforcement

1. Define plan limits in `membership_plans.limits_json`:
   - max projects
   - max rooms/tasks/events/expenses
   - max attachment count
   - max attachment bytes
2. Enforce limits server-side in Postgres functions/triggers before writes.
3. Update `project_usage` counters transactionally.
4. Return explicit error codes, e.g.:
   - `QUOTA_STORAGE_EXCEEDED`
   - `QUOTA_TASK_LIMIT_EXCEEDED`

## 6. Sync Architecture (Offline-First)

1. Keep SQLite as local cache.
2. Add local `operation_log` table for queued mutations.
3. Sync loop:
   - Push local operations to Supabase
   - Pull remote deltas since last sync cursor
4. Conflict policy v1:
   - Last-write-wins for simple fields
   - Tombstone strategy for deletes
   - Rule-validation for status transitions

## 7. Collaboration Features by Phase

1. Phase A: Shared project + member invites + manual refresh.
2. Phase B: Background sync + conflict banners.
3. Phase C: Realtime updates for tasks/events.

## 8. Attachment Strategy

1. Store files in Supabase Storage path `project/{project_id}/...`.
2. Store metadata in `attachments` table.
3. Use signed URLs for access.
4. Enforce upload + cumulative storage quotas.

## 9. Client App Changes

1. Add auth/session flow.
2. Add sharing UI:
   - invite member
   - role assignment
3. Add usage/plan UI with quota meters.
4. Add sync status indicators:
   - pending
   - syncing
   - conflicts
   - last synced

## 10. Rollout Milestones

1. Milestone 1: Auth + schema + RLS.
2. Milestone 2: One-way cloud sync.
3. Milestone 3: Two-way sync + conflict handling.
4. Milestone 4: Quotas + usage UI.
5. Milestone 5: Realtime enhancements.

## 11. Acceptance Criteria

1. Two users can collaborate on one project with role permissions enforced.
2. Offline edits sync correctly when reconnecting.
3. Quotas are enforced server-side and surfaced in UI.
4. RLS tests verify no cross-project data access.
5. Private attachment access is membership-scoped.

## 12. Risks and Mitigations

1. RLS mistakes:
   - mitigate with policy test suite before launch
2. Realtime overuse:
   - limit subscriptions to high-value entities first
3. Storage/egress growth:
   - enforce strict quotas + compression + cleanup jobs
4. Conflict UX confusion:
   - show clear conflict messages and resolution outcomes

## 13. Suggested Next Step

1. Convert this plan into sprint backlog tickets with effort estimates and dependencies.
