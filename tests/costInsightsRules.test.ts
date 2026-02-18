import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCostInsights } from '../src/data/repositories/costInsightsRules';

test('buildCostInsights marks project high risk when over budget', () => {
  const result = buildCostInsights(10000, 12000, [
    { roomId: 'k', roomName: 'Kitchen', planned: 6000, actual: 8000, openTaskCount: 2, overdueTaskCount: 1 }
  ]);
  assert.equal(result.projectRisk, 'high');
  assert.match(result.reasons.join(' '), /over budget/i);
});

test('buildCostInsights marks room medium risk near budget threshold', () => {
  const result = buildCostInsights(20000, 12000, [
    { roomId: 'b', roomName: 'Bathroom', planned: 10000, actual: 7800, openTaskCount: 3, overdueTaskCount: 0 }
  ]);
  assert.equal(result.roomRisks[0].risk, 'medium');
});

test('buildCostInsights marks room high risk without baseline budget but with spend', () => {
  const result = buildCostInsights(20000, 12000, [
    { roomId: 'x', roomName: 'Utility', planned: 0, actual: 500, openTaskCount: 1, overdueTaskCount: 0 }
  ]);
  assert.equal(result.roomRisks[0].risk, 'high');
  assert.match(result.roomRisks[0].reasons.join(' '), /without a room budget baseline/i);
});
