'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProductionPlan, approvePlan } = require('../domain/productionPlan');

const valid = () => ({ planId: 'p1', siteId: 'site1', recipeId: 'r1', recipeVersion: '4', scheduledStart: '2026-08-01T10:00:00Z', targetVolumeLiters: 100, expectedYield: 0.8, demandEvidenceRef: 'orders:42', allergens: ['barley'], ingredients: [{ id: 'malt', quantityPerLiter: 0.2, lots: [{ lotCode: 'L1', supplierTraceRef: 'po:1', released: true, expiresAt: '2027-01-01T00:00:00Z', availableQuantity: 30 }] }], equipment: { status: 'available', maintenanceDueAt: '2026-09-01T00:00:00Z' }, haccpChecks: [{ controlPoint: 'sanitation', status: 'verified', evidenceRef: 'cip:1' }] });

test('rolls demand and yield into a dual-approved executable plan', () => {
  const plan = buildProductionPlan(valid());
  assert.equal(plan.requiredInputVolumeLiters, 125);
  assert.equal(plan.status, 'awaiting_production_approval');
  const first = approvePlan(plan, [], { id: 'p1', role: 'production_manager' });
  assert.equal(first.status, 'awaiting_production_approval');
  assert.equal(approvePlan(plan, first.approvals, { id: 'q1', role: 'quality_manager' }).status, 'released_to_schedule');
});

test('blocks shortages, quality holds, and missing HACCP evidence', () => {
  const input = valid(); input.ingredients[0].lots[0].availableQuantity = 1; input.qualityHold = true; input.haccpChecks = [];
  const plan = buildProductionPlan(input);
  assert.equal(plan.status, 'blocked');
  assert.ok(plan.blockers.some((b) => b.code === 'INSUFFICIENT_RELEASED_INVENTORY'));
  assert.throws(() => approvePlan(plan, [], { id: 'p1', role: 'production_manager' }), /cannot be approved/);
});
