export type RoomCostRiskCandidate = {
  roomId: string;
  roomName: string;
  planned: number;
  actual: number;
  openTaskCount: number;
  overdueTaskCount: number;
};

export type RoomCostRisk = {
  roomId: string;
  roomName: string;
  planned: number;
  actual: number;
  variance: number;
  utilization: number | null;
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
};

export type CostInsightSummary = {
  projectPlanned: number;
  projectActual: number;
  projectVariance: number;
  projectRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  roomRisks: RoomCostRisk[];
};

let lastCacheKey = '';
let lastCacheValue: CostInsightSummary | null = null;

export function riskToTrafficLabel(risk: 'low' | 'medium' | 'high'): 'Green' | 'Amber' | 'Red' {
  if (risk === 'high') {
    return 'Red';
  }
  if (risk === 'medium') {
    return 'Amber';
  }
  return 'Green';
}

function roundUtilization(value: number): number {
  return Math.round(value * 100) / 100;
}

function assessRoomRisk(input: RoomCostRiskCandidate): RoomCostRisk {
  const planned = Number(input.planned ?? 0);
  const actual = Number(input.actual ?? 0);
  const variance = planned - actual;
  const utilization = planned > 0 ? actual / planned : null;
  const reasons: string[] = [];
  let risk: 'low' | 'medium' | 'high' = 'low';

  if (planned <= 0 && actual > 0) {
    risk = 'high';
    reasons.push('Spending recorded without a room budget baseline');
  } else if (variance < 0) {
    risk = 'high';
    reasons.push('Already over budget');
  } else if (utilization != null && utilization >= 0.9 && input.openTaskCount > 0) {
    risk = 'high';
    reasons.push('Above 90% of budget with open tasks remaining');
  } else if (utilization != null && utilization >= 0.75) {
    risk = 'medium';
    reasons.push('Above 75% of budget');
  }

  if (input.overdueTaskCount > 0) {
    reasons.push('Overdue tasks may create rush-cost pressure');
    if (risk === 'low') {
      risk = 'medium';
    }
  }

  if (reasons.length === 0) {
    reasons.push('Spending level is currently within expected range');
  }

  return {
    roomId: input.roomId,
    roomName: input.roomName,
    planned,
    actual,
    variance,
    utilization: utilization == null ? null : roundUtilization(utilization),
    risk,
    reasons
  };
}

export function buildCostInsights(
  projectPlanned: number,
  projectActual: number,
  rooms: RoomCostRiskCandidate[],
  maxRooms = 3
): CostInsightSummary {
  const cacheKey = JSON.stringify({
    projectPlanned: Number(projectPlanned ?? 0),
    projectActual: Number(projectActual ?? 0),
    maxRooms,
    rooms: rooms.map((room) => ({
      roomId: room.roomId,
      planned: Number(room.planned ?? 0),
      actual: Number(room.actual ?? 0),
      openTaskCount: Number(room.openTaskCount ?? 0),
      overdueTaskCount: Number(room.overdueTaskCount ?? 0)
    }))
  });

  if (cacheKey === lastCacheKey && lastCacheValue) {
    return lastCacheValue;
  }

  const roomRisks = rooms.map(assessRoomRisk).sort((a, b) => {
    const rank = (value: RoomCostRisk['risk']): number => (value === 'high' ? 3 : value === 'medium' ? 2 : 1);
    const riskDiff = rank(b.risk) - rank(a.risk);
    if (riskDiff !== 0) {
      return riskDiff;
    }
    return b.actual - b.planned - (a.actual - a.planned);
  });

  const projectVariance = Number(projectPlanned ?? 0) - Number(projectActual ?? 0);
  const reasons: string[] = [];
  let projectRisk: 'low' | 'medium' | 'high' = 'low';

  if (projectVariance < 0) {
    projectRisk = 'high';
    reasons.push('Project is over budget');
  } else if (projectPlanned > 0 && projectActual / projectPlanned >= 0.85) {
    projectRisk = 'medium';
    reasons.push('Project has consumed over 85% of planned budget');
  }

  if (roomRisks.some((room) => room.risk === 'high')) {
    projectRisk = 'high';
    reasons.push('At least one room is high risk for overrun');
  } else if (projectRisk === 'low' && roomRisks.some((room) => room.risk === 'medium')) {
    projectRisk = 'medium';
    reasons.push('Some rooms are trending toward budget pressure');
  }

  if (reasons.length === 0) {
    reasons.push('Spend trend is stable against current plan');
  }

  const summary = {
    projectPlanned: Number(projectPlanned ?? 0),
    projectActual: Number(projectActual ?? 0),
    projectVariance,
    projectRisk,
    reasons,
    roomRisks: roomRisks.slice(0, maxRooms)
  };

  lastCacheKey = cacheKey;
  lastCacheValue = summary;

  return summary;
}
