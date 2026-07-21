'use strict';
const crypto = require('crypto');

class ProductionPlanError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function buildProductionPlan(input) {
  if (!input || typeof input !== 'object') throw new ProductionPlanError('INVALID_INPUT', 'production plan is required');
  for (const field of ['planId', 'siteId', 'recipeId', 'recipeVersion', 'scheduledStart']) if (!input[field]) throw new ProductionPlanError('INVALID_INPUT', `${field} is required`);
  const targetVolumeLiters = Number(input.targetVolumeLiters);
  const expectedYield = Number(input.expectedYield);
  if (!(targetVolumeLiters > 0) || !(expectedYield > 0 && expectedYield <= 1)) throw new ProductionPlanError('INVALID_INPUT', 'target volume and yield are invalid');
  const blockers = [];
  const requiredInputVolume = targetVolumeLiters / expectedYield;
  for (const ingredient of input.ingredients || []) {
    const required = Number(ingredient.quantityPerLiter) * requiredInputVolume;
    const available = (ingredient.lots || []).filter((lot) => lot.released === true && Date.parse(lot.expiresAt) > Date.parse(input.scheduledStart)).reduce((sum, lot) => sum + Number(lot.availableQuantity || 0), 0);
    if (!ingredient.id || !Number.isFinite(required)) blockers.push({ code: 'INVALID_INGREDIENT' });
    else if (available < required) blockers.push({ code: 'INSUFFICIENT_RELEASED_INVENTORY', ingredientId: ingredient.id, required, available });
    if (!Array.isArray(ingredient.lots) || ingredient.lots.some((lot) => !lot.lotCode || !lot.supplierTraceRef)) blockers.push({ code: 'LOT_TRACEABILITY_INCOMPLETE', ingredientId: ingredient.id });
  }
  if (!Array.isArray(input.allergens)) blockers.push({ code: 'ALLERGEN_DECLARATION_REQUIRED' });
  if (input.equipment?.status !== 'available' || Date.parse(input.equipment?.maintenanceDueAt) <= Date.parse(input.scheduledStart)) blockers.push({ code: 'EQUIPMENT_NOT_CLEARED' });
  const haccp = input.haccpChecks || [];
  if (!haccp.length || haccp.some((check) => !check.controlPoint || check.status !== 'verified' || !check.evidenceRef)) blockers.push({ code: 'HACCP_VERIFICATION_REQUIRED' });
  if (input.qualityHold === true) blockers.push({ code: 'QUALITY_HOLD_ACTIVE' });
  if (!input.demandEvidenceRef) blockers.push({ code: 'DEMAND_EVIDENCE_REQUIRED' });
  const canonical = { planId: input.planId, siteId: input.siteId, recipeId: input.recipeId, recipeVersion: input.recipeVersion, scheduledStart: input.scheduledStart, targetVolumeLiters, expectedYield, ingredients: input.ingredients || [], allergens: input.allergens || [], equipment: input.equipment, haccpChecks: haccp, demandEvidenceRef: input.demandEvidenceRef };
  return { ...canonical, requiredInputVolumeLiters: Number(requiredInputVolume.toFixed(3)), planHash: crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex'), blockers, status: blockers.length ? 'blocked' : 'awaiting_production_approval', requiredApprovals: ['production_manager', 'quality_manager'] };
}

function approvePlan(plan, approvals, actor) {
  if (!plan || plan.status === 'blocked') throw new ProductionPlanError('INVALID_TRANSITION', 'blocked plan cannot be approved');
  if (!actor || !plan.requiredApprovals.includes(actor.role)) throw new ProductionPlanError('FORBIDDEN', 'production or quality approval required');
  const next = [...(approvals || [])];
  if (!next.some((entry) => entry.role === actor.role)) next.push({ actorId: actor.id, role: actor.role, at: new Date().toISOString() });
  const complete = plan.requiredApprovals.every((role) => next.some((entry) => entry.role === role));
  return { approvals: next, status: complete ? 'released_to_schedule' : 'awaiting_production_approval' };
}

module.exports = { ProductionPlanError, buildProductionPlan, approvePlan };
