export type NextTaskCandidate = {
  id: string;
  title: string;
  roomName: string;
  status: string;
  phase: string;
  dueAt: string | null;
  priority: string;
  sortIndex: number;
  updatedAt: string;
};

export type RecommendedTask = {
  id: string;
  title: string;
  roomName: string;
  status: string;
  phase: string;
  dueAt: string | null;
  score: number;
  reasons: string[];
};

const phaseRank: Record<string, number> = {
  plan: 1,
  buy: 2,
  prep: 3,
  install: 4,
  finish: 5,
  inspect_snag: 6
};

const priorityScore: Record<string, number> = {
  high: 24,
  medium: 12,
  low: 4
};

function getDueScore(dueAt: string | null, now: Date): number {
  if (!dueAt) {
    return 0;
  }
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return 0;
  }
  const hours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hours < 0) {
    return 60;
  }
  if (hours <= 24) {
    return 40;
  }
  if (hours <= 72) {
    return 24;
  }
  return 8;
}

function hasEarlierPhaseBlocker(candidate: NextTaskCandidate, all: NextTaskCandidate[]): boolean {
  const currentRank = phaseRank[candidate.phase] ?? 99;
  return all.some(
    (task) =>
      task.roomName === candidate.roomName &&
      task.id !== candidate.id &&
      task.status !== 'done' &&
      (phaseRank[task.phase] ?? 99) < currentRank
  );
}

function scoreCandidate(candidate: NextTaskCandidate, all: NextTaskCandidate[], now: Date): RecommendedTask {
  const reasons: string[] = [];
  let score = 0;

  if (candidate.status === 'in_progress') {
    score += 36;
    reasons.push('Already in progress');
  } else if (candidate.status === 'ready') {
    score += 24;
    reasons.push('Ready to start');
  } else if (candidate.status === 'ideas') {
    score += 6;
  }

  const dueScore = getDueScore(candidate.dueAt, now);
  score += dueScore;
  if (dueScore >= 60) {
    reasons.push('Overdue');
  } else if (dueScore >= 40) {
    reasons.push('Due within 24h');
  } else if (dueScore >= 24) {
    reasons.push('Due within 72h');
  }

  const pScore = priorityScore[candidate.priority] ?? 0;
  score += pScore;
  if (candidate.priority === 'high') {
    reasons.push('High priority');
  }

  if (hasEarlierPhaseBlocker(candidate, all)) {
    score -= 16;
    reasons.push('Earlier phase work still open');
  } else {
    score += 8;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    roomName: candidate.roomName,
    status: candidate.status,
    phase: candidate.phase,
    dueAt: candidate.dueAt,
    score,
    reasons
  };
}

export function buildRecommendedTasks(
  candidates: NextTaskCandidate[],
  now: Date = new Date(),
  maxItems = 3
): RecommendedTask[] {
  const eligible = candidates.filter((task) => task.status !== 'done' && task.status !== 'waiting');
  const scored = eligible.map((task) => scoreCandidate(task, eligible, now));
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  return scored.slice(0, maxItems);
}
