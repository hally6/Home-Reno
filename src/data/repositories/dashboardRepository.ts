import { getDatabase } from '@/data/database';
import { buildRecommendedTasks, type NextTaskCandidate, type RecommendedTask } from './nextTaskRules';
import { getCostInsightSummary } from './costInsightsRepository';

export type DashboardSnapshot = {
  projectName: string;
  homeLayout: 'standard' | 'tile';
  overallProgress: number;
  todayCounts: {
    overdue: number;
    dueToday: number;
    waiting: number;
    next: number;
  };
  totalTaskCount: number;
  dueCount: number;
  overdueCount: number;
  waitingCount: number;
  roomsSummary: string;
  upcomingSummary: string;
  budgetPlanned: number;
  budgetActual: number;
  currency: string;
  topRecommendedTasks: RecommendedTask[];
  recommendedTasks: RecommendedTask[];
  costInsightSummary: string;
  costRisk: 'low' | 'medium' | 'high';
};

export async function getDashboardSnapshot(projectId: string): Promise<DashboardSnapshot> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const counts = await db.getFirstAsync<{
    dueCount: number;
    overdueCount: number;
    waitingCount: number;
    nextCount: number;
    totalTaskCount: number;
  }>(
    `
      SELECT
        SUM(CASE WHEN t.status != 'done' AND t.due_at IS NOT NULL AND date(t.due_at) = date('now', 'localtime') THEN 1 ELSE 0 END) AS dueCount,
        SUM(CASE WHEN t.status != 'done' AND t.due_at IS NOT NULL AND datetime(t.due_at) < datetime('now', 'localtime') THEN 1 ELSE 0 END) AS overdueCount,
        SUM(CASE WHEN t.status = 'waiting' THEN 1 ELSE 0 END) AS waitingCount,
        SUM(CASE WHEN t.status != 'done' AND t.due_at IS NOT NULL AND datetime(t.due_at) > datetime('now', 'localtime') THEN 1 ELSE 0 END) AS nextCount,
        COUNT(t.id) AS totalTaskCount
      FROM tasks t
      WHERE t.project_id = ? AND t.deleted_at IS NULL
    `,
    [projectId]
  );

  const rooms = await db.getAllAsync<{ doneCount: number; totalCount: number }>(
    `
      SELECT
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS doneCount,
        COUNT(t.id) AS totalCount
      FROM rooms r
      LEFT JOIN tasks t ON t.room_id = r.id AND t.deleted_at IS NULL
      WHERE r.project_id = ?
      GROUP BY r.id
      ORDER BY r.order_index ASC
    `,
    [projectId]
  );

  const nextEvent = await db.getFirstAsync<{ title: string; startsAt: string }>(
    `
      SELECT e.title AS title, e.starts_at AS startsAt
      FROM events e
      WHERE e.project_id = ? AND e.starts_at >= ?
      ORDER BY e.starts_at ASC
      LIMIT 1
    `,
    [projectId, nowIso]
  );

  const project = await db.getFirstAsync<{ name: string; homeLayout: 'standard' | 'tile' | null }>(
    `
      SELECT
        name,
        home_layout AS homeLayout
      FROM projects
      WHERE id = ?
      LIMIT 1
    `,
    [projectId]
  );

  const budget = await db.getFirstAsync<{ planned: number; actual: number; currency: string }>(
    `
      SELECT
        CASE
          WHEN COALESCE(p.budget_planned_total, 0) > 0 THEN p.budget_planned_total
          ELSE COALESCE((SELECT SUM(r.budget_planned) FROM rooms r WHERE r.project_id = p.id), 0)
        END AS planned,
        COALESCE((SELECT SUM(amount) FROM expenses ex WHERE ex.project_id = p.id), 0) AS actual,
        p.currency AS currency
      FROM projects p
      WHERE p.id = ?
      LIMIT 1
    `,
    [projectId]
  );

  const candidates = await db.getAllAsync<NextTaskCandidate>(
    `
      SELECT
        t.id,
        t.title,
        r.name AS roomName,
        t.status,
        t.phase,
        t.due_at AS dueAt,
        t.priority,
        t.sort_index AS sortIndex,
        t.updated_at AS updatedAt
      FROM tasks t
      INNER JOIN rooms r ON r.id = t.room_id
      WHERE t.project_id = ? AND t.deleted_at IS NULL
    `,
    [projectId]
  );

  const recommendedTasks = buildRecommendedTasks(
    candidates.map((candidate) => ({
      ...candidate,
      sortIndex: Number(candidate.sortIndex ?? 0)
    }))
  );
  const topRecommendedTasks = recommendedTasks.slice(0, 3);
  const costInsights = await getCostInsightSummary(projectId);
  const topRoomRisk = costInsights.roomRisks[0];
  const costInsightSummary = topRoomRisk
    ? `Top room: ${topRoomRisk.roomName}  Variance ${topRoomRisk.variance.toFixed(0)}`
    : 'No room risk data yet';

  const roomCount = rooms.length;
  const averageRoomProgress = roomCount
    ? Math.round(
        rooms.reduce((sum, room) => {
          const total = Number(room.totalCount ?? 0);
          const done = Number(room.doneCount ?? 0);
          const progress = total > 0 ? (done / total) * 100 : 0;
          return sum + progress;
        }, 0) / roomCount
      )
    : 0;

  return {
    projectName: project?.name ?? 'Home Planner',
    homeLayout: project?.homeLayout === 'tile' ? 'tile' : 'standard',
    overallProgress: averageRoomProgress,
    todayCounts: {
      overdue: Number(counts?.overdueCount ?? 0),
      dueToday: Number(counts?.dueCount ?? 0),
      waiting: Number(counts?.waitingCount ?? 0),
      next: Number(counts?.nextCount ?? 0)
    },
    totalTaskCount: Number(counts?.totalTaskCount ?? 0),
    dueCount: Number(counts?.dueCount ?? 0),
    overdueCount: Number(counts?.overdueCount ?? 0),
    waitingCount: Number(counts?.waitingCount ?? 0),
    roomsSummary: roomCount ? `Average ${averageRoomProgress}% across ${roomCount} room(s)` : 'No rooms yet',
    upcomingSummary: nextEvent
      ? `${nextEvent.title} - ${new Date(nextEvent.startsAt).toLocaleString()}`
      : 'No upcoming events',
    budgetPlanned: Number(budget?.planned ?? 0),
    budgetActual: Number(budget?.actual ?? 0),
    currency: budget?.currency ?? 'USD',
    topRecommendedTasks,
    recommendedTasks,
    costInsightSummary,
    costRisk: costInsights.projectRisk
  };
}
