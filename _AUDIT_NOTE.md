# Audit Apply Note — AIBreweryCraftBeverageOps

Source: `_AUDIT/reports/batch_01.md` § 9.

## Original audit recommendations
- Missing notifications system
- Missing reporting / export
- Missing integration API (no webhooks)
- Strategic: agentic workflows, RAG, real-time anomaly detection, white-label

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoints |
|---|------|------|-----------|
| 1 | Webhook subscription stub | `backend/routes/webhooks.js` (new) + `backend/server.js` | `GET/POST/DELETE /api/webhooks`, `POST /api/webhooks/:id/test`, `GET /api/webhooks/_/events` |

Allowed events: batch.created/completed/failed, lab_result.recorded/out_of_spec, fermentation.alert, tank.cip_due, inventory.low, distribution.shipped, event.scheduled. Lazy table; payload-only test (no outbound HTTP). `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| Email/SMS/push notifications | NEEDS-CREDS | SMTP / Twilio / FCM credentials |
| Reporting / export | TOO-RISKY | Templates + UI |
| Outbound webhook delivery | TOO-RISKY | Background job infra |
| Multi-agent orchestration | NEEDS-PRODUCT-DECISION | Agent topology |
| RAG over brew logs / recipes | NEEDS-PRODUCT-DECISION | Vector store + corpus |
| White-label / reseller | NEEDS-PRODUCT-DECISION | Multi-tenant model |

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — FE already wired.
- **Stack:** Vite-React + Express.
- `frontend/src/services/api.js` exposes all 15 AI helpers (`generateRecipeSuggestion` … `generateCarbonFootprint`, plus `fetchWebhooks/createWebhook/deleteWebhook/testWebhook`).
- `pages/AIFeaturePage.jsx` is a single dynamic page that renders per-feature input forms for all 15 AI tools, with structured-JSON display + copy-to-clipboard.
- Dedicated `WebhooksPage.jsx` lists/creates/deletes webhooks and supports the test endpoint.
- JWT bearer auth via `localStorage.getItem('token')` is applied through the `api` axios instance (services/api.js).
- Two backend AI endpoints (`/predict-quality`, `/seasonal-planner`) appear to be older variants of the wired `quality-analysis` / `seasonal-menu-planner`; no duplicate UI added.

## Apply pass 4 (mechanical backlog)

SKIPPED. All remaining backlog items are tagged NEEDS-CREDS (Email/SMS/push), TOO-RISKY (reporting/export, outbound webhook delivery), or NEEDS-PRODUCT-DECISION (multi-agent orchestration, RAG, white-label). No mechanical items remain. AI feature surface is already comprehensive (15 AI tools wired through `AIFeaturePage.jsx`).
