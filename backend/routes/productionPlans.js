'use strict';
const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const { buildProductionPlan, approvePlan } = require('../domain/productionPlan');
const router = express.Router();
const tenantFor = (user) => String(user.tenantId || `user:${user.id}`);

router.post('/', async (req, res, next) => {
  const key = req.get('Idempotency-Key'); if (!key || key.length > 200) return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
  let plan; try { plan = buildProductionPlan(req.body); } catch (error) { return res.status(422).json({ error: error.message, code: error.code }); }
  const hash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
  const client = await pool.connect().catch(() => null); if (!client) return res.status(503).json({ error: 'Workflow store unavailable' });
  try {
    await client.query('BEGIN'); const id = crypto.randomUUID();
    const inserted = await client.query(`INSERT INTO production_plan_workflows (id,tenant_id,idempotency_key,request_hash,plan_id,site_id,status,plan,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (tenant_id,idempotency_key) DO NOTHING RETURNING *`, [id,tenantFor(req.user),key,hash,plan.planId,plan.siteId,plan.status,plan,req.user.id]);
    let workflow = inserted.rows[0];
    if (!workflow) { workflow=(await client.query('SELECT * FROM production_plan_workflows WHERE tenant_id=$1 AND idempotency_key=$2',[tenantFor(req.user),key])).rows[0]; if (workflow.request_hash!==hash) { await client.query('ROLLBACK'); return res.status(409).json({error:'Idempotency-Key was reused with different input'}); } await client.query('COMMIT'); return res.json({workflow,replayed:true}); }
    await client.query(`INSERT INTO production_plan_events (id,workflow_id,tenant_id,actor_id,event_type,to_status,evidence_hash) VALUES ($1,$2,$3,$4,'plan.assessed',$5,$6)`,[crypto.randomUUID(),id,tenantFor(req.user),req.user.id,plan.status,plan.planHash]);
    await client.query('COMMIT'); res.status(201).json({workflow});
  } catch(error) { await client.query('ROLLBACK').catch(()=>{}); if(error.code==='42P01') return res.status(503).json({error:'Database migration is required',code:'MIGRATION_REQUIRED'}); next(error); } finally { client.release(); }
});

router.get('/:id', async (req,res,next)=>{ try { const result=await pool.query(`SELECT w.*,COALESCE(json_agg(e ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL),'[]') events FROM production_plan_workflows w LEFT JOIN production_plan_events e ON e.workflow_id=w.id WHERE w.id=$1 AND w.tenant_id=$2 GROUP BY w.id`,[req.params.id,tenantFor(req.user)]); if(!result.rows[0]) return res.status(404).json({error:'Workflow not found'}); res.json({workflow:result.rows[0]}); } catch(error){next(error);} });

router.post('/:id/approve', async (req,res,next)=>{
  const client=await pool.connect().catch(()=>null); if(!client) return res.status(503).json({error:'Workflow store unavailable'});
  try { await client.query('BEGIN'); const row=(await client.query('SELECT * FROM production_plan_workflows WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,tenantFor(req.user)])).rows[0]; if(!row){await client.query('ROLLBACK');return res.status(404).json({error:'Workflow not found'});}
    let decision; try { decision=approvePlan(row.plan,row.approvals,req.user); } catch(error){await client.query('ROLLBACK');return res.status(error.code==='FORBIDDEN'?403:409).json({error:error.message,code:error.code});}
    const updated=(await client.query(`UPDATE production_plan_workflows SET status=$1,approvals=$2,version=version+1,updated_at=NOW() WHERE id=$3 AND version=$4 RETURNING *`,[decision.status,decision.approvals,row.id,row.version])).rows[0]; if(!updated){await client.query('ROLLBACK');return res.status(409).json({error:'Workflow was concurrently modified'});}
    await client.query(`INSERT INTO production_plan_events (id,workflow_id,tenant_id,actor_id,event_type,from_status,to_status,evidence_hash) VALUES ($1,$2,$3,$4,'plan.approved',$5,$6,$7)`,[crypto.randomUUID(),row.id,row.tenant_id,req.user.id,row.status,decision.status,row.plan.planHash]); await client.query('COMMIT');res.json({workflow:updated});
  } catch(error){await client.query('ROLLBACK').catch(()=>{});next(error);} finally{client.release();}
});
module.exports=router;
