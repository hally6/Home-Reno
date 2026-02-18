import { getDatabase } from '@/data/database';
import { buildCostInsights, type CostInsightSummary, type RoomCostRiskCandidate } from './costInsightsRules';

export type { CostInsightSummary };

export async function getCostInsightSummary(projectId: string): Promise<CostInsightSummary> {
  const db = await getDatabase();

  const totals = await db.getFirstAsync<{ planned: number; actual: number }>(
    `
      WITH room_totals AS (
        SELECT SUM(budget_planned) AS planned
        FROM rooms
        WHERE project_id = ?
      ),
      expense_totals AS (
        SELECT SUM(amount) AS actual
        FROM expenses
        WHERE project_id = ?
      )
      SELECT
        CASE
          WHEN COALESCE(p.budget_planned_total, 0) > 0 THEN p.budget_planned_total
          ELSE COALESCE(room_totals.planned, 0)
        END AS planned,
        COALESCE(expense_totals.actual, 0) AS actual
      FROM projects p
      LEFT JOIN room_totals ON 1 = 1
      LEFT JOIN expense_totals ON 1 = 1
      WHERE p.id = ?
      LIMIT 1
    `,
    [projectId, projectId, projectId]
  );

  const roomCandidates = await db.getAllAsync<RoomCostRiskCandidate>(
    `
      WITH project_rooms AS (
        SELECT
          id,
          name,
          budget_planned,
          order_index
        FROM rooms
        WHERE project_id = ?
      ),
      expense_by_room AS (
        SELECT
          e.room_id,
          SUM(e.amount) AS actual
        FROM expenses e
        INNER JOIN project_rooms r ON r.id = e.room_id
        GROUP BY e.room_id
      ),
      task_stats AS (
        SELECT
          t.room_id,
          SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END) AS openTaskCount,
          SUM(
            CASE
              WHEN t.status != 'done'
               AND t.due_at IS NOT NULL
               AND datetime(t.due_at) < datetime('now', 'localtime')
              THEN 1
              ELSE 0
            END
          ) AS overdueTaskCount
        FROM tasks t
        INNER JOIN project_rooms r ON r.id = t.room_id
        WHERE t.deleted_at IS NULL
        GROUP BY t.room_id
      )
      SELECT
        r.id AS roomId,
        r.name AS roomName,
        r.budget_planned AS planned,
        COALESCE(expense_by_room.actual, 0) AS actual,
        COALESCE(task_stats.openTaskCount, 0) AS openTaskCount,
        COALESCE(task_stats.overdueTaskCount, 0) AS overdueTaskCount
      FROM project_rooms r
      LEFT JOIN expense_by_room ON expense_by_room.room_id = r.id
      LEFT JOIN task_stats ON task_stats.room_id = r.id
      ORDER BY r.order_index ASC
    `,
    [projectId]
  );

  return buildCostInsights(
    Number(totals?.planned ?? 0),
    Number(totals?.actual ?? 0),
    roomCandidates.map((candidate) => ({
      ...candidate,
      planned: Number(candidate.planned ?? 0),
      actual: Number(candidate.actual ?? 0),
      openTaskCount: Number(candidate.openTaskCount ?? 0),
      overdueTaskCount: Number(candidate.overdueTaskCount ?? 0)
    }))
  );
}
