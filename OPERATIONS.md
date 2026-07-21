# Governed production planning

`POST /api/production-plans` converts demand evidence, a versioned recipe, target yield, released ingredient lots, equipment availability, allergens, HACCP checks, and quality state into a deterministic plan. It calculates required input volume, blocks shortages/expired lots/missing traceability/maintenance conflicts/quality holds, and requires both production and quality approval before `released_to_schedule`. Requests are idempotent, tenant-scoped, version-checked, and audited.

Copy `.env.example`, run `scripts/bootstrap.sh`, provision the existing base schema, and run `scripts/migrate.sh`. `start.sh` is non-destructive and will not free occupied ports. The existing demo seed drops tables and therefore requires `CONFIRM_DESTRUCTIVE_DEMO_SEED=yes`.

POS/order, inventory/procurement, telemetry, lab/food-safety, delivery, notification, and regulatory reporting adapters remain blocked on real provider contracts and credentials. HACCP/allergen policy and recall readiness require qualified food-safety review and site-specific validation; a local release is not regulatory approval.
