import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createSlotRequest, refundSlotRequest, slotRequestHandler, streamElementsConnectionHandler } from '../api/_lib/slot-request-runtime.js';
import { verifyStreamElementsCommunity } from '../api/_lib/streamelements-community.js';
import { resolveSlotRequestSettings, slotRequestCost } from '../shared/slotRequestSettings.js';

if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE as documented in SLOT_REQUEST_POINTS.md. Never uses production.');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const pg = new PGlite();
const user = { id: randomUUID(), identities: [{ provider: 'twitch', identity_data: { sub: '123' } }] };
const other = { id: randomUUID(), identities: [{ provider: 'twitch', identity_data: { sub: '999' } }] };
const channel = '123456789012345678901234';
const connection = { user_id: user.id, se_channel_id: channel, se_jwt_token: 'test-token', verified_twitch_id: '123', verified_at: new Date().toISOString() };
await pg.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
  CREATE TABLE auth.users(id UUID PRIMARY KEY);
  CREATE TABLE streamelements_connections(user_id UUID PRIMARY KEY, se_channel_id TEXT, se_jwt_token TEXT, se_username TEXT, connected_at TIMESTAMPTZ);
  CREATE TABLE slots(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT,image TEXT);
  CREATE TABLE overlay_widgets(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID,widget_type TEXT,config JSONB,updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE slot_requests(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL,slot_name TEXT NOT NULL,slot_image TEXT,
    requested_by TEXT NOT NULL,status TEXT DEFAULT 'pending',created_at TIMESTAMPTZ DEFAULT now(),points_deducted INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT UNIQUE,refunded_at TIMESTAMPTZ,refunded_points INTEGER,rejection_reason TEXT,updated_at TIMESTAMPTZ DEFAULT now());
  CREATE UNIQUE INDEX idx_slot_requests_unique_pending ON slot_requests(user_id,lower(slot_name)) WHERE status='pending';
  ALTER TABLE slot_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE streamelements_connections ENABLE ROW LEVEL SECURITY;
  CREATE POLICY own_requests ON slot_requests FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
  CREATE POLICY own_connections ON streamelements_connections FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT SELECT,INSERT,UPDATE,DELETE ON slot_requests,streamelements_connections TO authenticated;
`);
await pg.exec(readFileSync(new URL('../migrations/20260914083638_secure_slot_request_points.sql', import.meta.url),'utf8'));
await pg.query('INSERT INTO slots(name,image) VALUES($1,$2)', ['Gates of Olympus','/slot.webp']);
await pg.query('INSERT INTO overlay_widgets(user_id,widget_type,config) VALUES($1,$2,$3)', [user.id,'bonus_hunt',{ srSeEnabled: true, srSeCost: 100 }]);
await pg.query('INSERT INTO streamelements_connections(user_id,se_channel_id,se_jwt_token,verified_twitch_id,verified_at) VALUES($1,$2,$3,$4,now())', [user.id,channel,'test-token','123']);

// Translate the small Supabase query surface used by the real runtime into SQL.
// All state changes, claims and reservations execute against the actual migration.
class Query {
  constructor(table) { assert.match(table,/^[a-z_]+$/); this.table=table; this.conditions=[]; this.args=[]; this.fields='*'; }
  param(value) { this.args.push(value); return '$'+this.args.length; }
  select(fields='*') { assert.match(fields,/^[a-z_,*]+$/); this.fields=fields; return this; }
  eq(column,value) { this.conditions.push(`${column}=${this.param(value)}`); return this; }
  in(column,values) { this.conditions.push(`${column}=ANY(${this.param(values)})`); return this; }
  ilike(column,value) { this.conditions.push(`${column} ILIKE ${this.param(value)}`); return this; }
  limit(limit) { this.limitCount=limit; return this; }
  update(values) { this.action='update'; this.values=values; return this; }
  upsert(values) { this.action='upsert'; this.values=values; return this; }
  delete() { this.action='delete'; return this; }
  maybeSingle() { this.singleRow=true; return this; }
  then(resolve,reject) { return this.run().then(resolve,reject); }
  async run() {
    if (this.table === 'slot_requests' && this.action === 'update' && this.values.status !== 'refunding' && state.failFinalize) return {data:null,error:{message:'database unavailable'}};
    if (this.action === 'upsert' && state.failSave) return {data:null,error:{message:'save failed'}};
    const where=this.conditions.length?' WHERE '+this.conditions.join(' AND '):'';
    let sql;
    if(this.action==='update') sql=`UPDATE ${this.table} SET ${Object.entries(this.values).map(([key,value])=>`${key}=${this.param(value)}`).join(',')}${where} RETURNING ${this.fields}`;
    else if(this.action==='delete') sql=`DELETE FROM ${this.table}${where} RETURNING *`;
    else if(this.action==='upsert') {
      const keys=Object.keys(this.values);
      sql=`INSERT INTO ${this.table}(${keys.join(',')}) VALUES(${keys.map(key=>this.param(this.values[key])).join(',')}) ON CONFLICT(user_id) DO UPDATE SET ${keys.map(key=>`${key}=EXCLUDED.${key}`).join(',')} RETURNING *`;
    } else sql=`SELECT ${this.fields} FROM ${this.table}${where}${this.limitCount?' LIMIT '+this.limitCount:''}`;
    try { const {rows}=await pg.query(sql,this.args); return {data:this.singleRow?rows[0]||null:rows,error:null}; }
    catch(error) { return {data:null,error}; }
  }
}
const db={from:table=>new Query(table),auth:{getUser:async token=>({data:{user:token==='owner'?user:token==='other'?other:null},error:null})},
  rpc:async(name,args)=>{
    assert.equal(name,'reserve_slot_request');
    try {const values=Object.values(args);const {rows}=await pg.query(`SELECT reserve_slot_request(${values.map((_,i)=>'$'+(i+1)).join(',')}) result`,values);return {data:rows[0].result,error:null};}
    catch(error){return {data:null,error};}
  }};
const state={balance:500,puts:[],nextPut:'confirmed',failFinalize:false,failSave:false,providerId:'123'};
const fetcher=async(url,options={})=>{
  if(url.endsWith('/channels/me')) return Response.json({_id:channel,provider:'twitch',providerId:state.providerId,username:'streamer'});
  if(url.endsWith('/points/'+channel))return Response.json({users:[]});
  if(options.method==='PUT'){
    const amount=Number(url.split('/').at(-1));state.puts.push(amount);
    if(state.nextPut==='unknown'){state.balance+=amount;throw new Error('Response lost after remote commit');}
    if(state.nextPut==='failed')return Response.json({error:'Forbidden'},{status:403});
    if(state.nextPut==='server_error')return Response.json({error:'Unexpected'},{status:500});
    state.balance+=amount;return Response.json({points:state.balance});
  }
  if(url.includes('/bot/'))return Response.json({success:true});
  return Response.json({points:state.balance});
};
const dependencies={db,fetcher,lookupTwitchUser:async()=> '456'};
const params=()=>({user_id:user.id,slot:'gates olympus',requester:'Viewer',message_id:randomUUID(),chatter_id:'456',broadcaster_id:'123'});
const rows=async()=> (await pg.query('SELECT * FROM slot_requests ORDER BY created_at')).rows;
async function reset() {await pg.exec('DELETE FROM slot_requests');Object.assign(state,{balance:500,puts:[],nextPut:'confirmed',failFinalize:false,failSave:false,providerId:'123'});}
async function endpoint(cmd,body,token='owner',method='POST') {
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
  await slotRequestHandler({method,query:{cmd},body,headers:{authorization:token?'Bearer '+token:''}},res,dependencies);return res;
}
let checks=0;
async function test(name,fn){await reset();await fn();checks++;console.log('ok - '+name);}
try {
  await test('current Bonus Hunt settings, legacy fallback and explicit zero cost',async()=>{
    assert.equal(resolveSlotRequestSettings([{id:'1',widget_type:'slot_requests',config:{srSeCost:900}},{id:'2',widget_type:'bonus_hunt',config:{srSeCost:0}}]).config.srSeCost,0);
    assert.equal(slotRequestCost({srSeEnabled:true,srSeCost:0}),0);
    assert.throws(()=>slotRequestCost({srSeEnabled:true,srSeCost:-1}));
    assert.equal(resolveSlotRequestSettings([]),null);
  });
  await test('unauthenticated, cross-streamer, GET and mismatched chat identity denied without charges',async()=>{
    assert.equal((await endpoint('sr',params(),'')).statusCode,401);
    assert.equal((await endpoint('sr',params(),'other')).statusCode,403);
    assert.equal((await endpoint('sr',params(),'owner','GET')).statusCode,405);
    assert.equal((await endpoint('sr',{...params(),broadcaster_id:'999'})).statusCode,403);
    assert.equal((await endpoint('sr',{...params(),chatter_id:'999'})).statusCode,403);
    assert.equal(state.puts.length,0);
  });
  await test('correct community and credential verification rejects copied/unknown ownership',async()=>{
    assert.equal((await verifyStreamElementsCommunity(user,connection,fetcher)).verified_twitch_id,'123');
    await assert.rejects(verifyStreamElementsCommunity(other,connection,fetcher),/different community/);
    await assert.rejects(verifyStreamElementsCommunity({...user,identities:[]},connection,fetcher),/Twitch/);
    state.providerId='999';await assert.rejects(createSlotRequest(db,user,params(),dependencies),/different community/);
    assert.equal(state.puts.length,0);
  });
  await test('one charge for concurrent/replayed messages and exact original community recorded',async()=>{
    const input=params();const first=createSlotRequest(db,user,input,dependencies);const second=createSlotRequest(db,user,input,dependencies);
    await first;await second;
    const [row]=await rows();assert.equal(row.status,'pending');assert.equal(row.points_deducted,100);assert.equal(row.charged_channel_id,channel);
    assert.deepEqual(state.puts,[-100]);
    await createSlotRequest(db,user,params(),dependencies);assert.deepEqual(state.puts,[-100]);
  });
  await test('insufficient balance and definite API rejection never create pending paid requests',async()=>{
    state.balance=10;await createSlotRequest(db,user,params(),dependencies);assert.equal((await rows())[0].status,'denied');assert.equal(state.puts.length,0);
    await reset();state.nextPut='failed';await createSlotRequest(db,user,params(),dependencies);assert.equal((await rows())[0].status,'denied');assert.equal(state.balance,500);
  });
  await test('lost deduction response and failed database finalization never re-charge',async()=>{
    const input=params();state.nextPut='unknown';await createSlotRequest(db,user,input,dependencies);assert.equal((await rows())[0].status,'charge_unknown');
    await createSlotRequest(db,user,input,dependencies);assert.deepEqual(state.puts,[-100]);
    await reset();state.failFinalize=true;const next=params();await assert.rejects(createSlotRequest(db,user,next,dependencies),/state could not be saved/);
    assert.equal((await rows())[0].status,'charging');state.failFinalize=false;await createSlotRequest(db,user,next,dependencies);assert.deepEqual(state.puts,[-100]);
  });
  await test('single reject and clear-all share atomic claims, never double refund',async()=>{
    await createSlotRequest(db,user,params(),dependencies);const [row]=await rows();
    await Promise.all([refundSlotRequest(db,user,row.id,dependencies),endpoint('sr-clear-all',{})]);
    assert.deepEqual(state.puts,[-100,100]);assert.equal(state.balance,500);assert.equal((await rows())[0].status,'refunded');
  });
  await test('free and historical zero-deduction requests never receive invented refunds',async()=>{
    await pg.query("INSERT INTO slot_requests(user_id,slot_name,requested_by,status) VALUES($1,'Free','viewer','pending')",[user.id]);
    const [row]=await rows();await refundSlotRequest(db,user,row.id,dependencies);assert.equal(state.puts.length,0);assert.equal((await rows())[0].refunded_points,0);
  });
  await test('original channel is enforced and failed refunds remain visible/retryable',async()=>{
    await createSlotRequest(db,user,params(),dependencies);const [row]=await rows();
    await pg.query("UPDATE slot_requests SET charged_channel_id='old-channel' WHERE id=$1",[row.id]);
    assert.equal((await refundSlotRequest(db,user,row.id,dependencies)).status,'refund_failed');assert.deepEqual(state.puts,[-100]);
    await pg.query('UPDATE slot_requests SET charged_channel_id=$1 WHERE id=$2',[channel,row.id]);state.nextPut='failed';
    assert.equal((await refundSlotRequest(db,user,row.id,dependencies)).status,'refund_failed');state.nextPut='confirmed';
    assert.equal((await refundSlotRequest(db,user,row.id,dependencies)).status,'refunded');assert.equal(state.balance,500);
  });
  await test('unknown refund outcomes cannot be automatically retried',async()=>{
    await createSlotRequest(db,user,params(),dependencies);const [row]=await rows();state.nextPut='unknown';
    assert.equal((await refundSlotRequest(db,user,row.id,dependencies)).status,'refund_unknown');
    await refundSlotRequest(db,user,row.id,dependencies);await endpoint('sr-clear-all',{});assert.deepEqual(state.puts,[-100,100]);
  });
  await test('credential-save failure cannot report success or expose JWT',async()=>{
    state.failSave=true;const res={status(code){this.code=code;return this;},json(value){this.body=value;return this;}};
    await streamElementsConnectionHandler({method:'POST',body:connection,headers:{authorization:'Bearer owner'}},res,dependencies);
    assert.equal(res.code,503);assert.match(res.body.error,/saving failed/);assert.ok(!JSON.stringify(res.body).includes('test-token'));
  });
  await test('database prevents forged deductions, refund replays and self-verification',async()=>{
    await createSlotRequest(db,user,params(),dependencies);const [row]=await rows();
    await pg.exec('SET ROLE authenticated');await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user.id]);
    await assert.rejects(pg.query('UPDATE slot_requests SET points_deducted=999 WHERE id=$1',[row.id]),/permission denied/);
    await assert.rejects(pg.query("UPDATE slot_requests SET status='refunded' WHERE id=$1",[row.id]),/authenticated slot request API/);
    await assert.rejects(pg.query('DELETE FROM slot_requests WHERE id=$1',[row.id]),/permission denied/);
    await assert.rejects(pg.query("SELECT reserve_slot_request($1,'x',null,'viewer','456','id',1,'channel',50,0)",[user.id]),/permission denied/);
    await pg.query("UPDATE streamelements_connections SET verified_twitch_id='123',verified_at=now() WHERE user_id=$1",[user.id]);
    assert.equal((await pg.query('SELECT verified_at FROM streamelements_connections')).rows[0].verified_at,null);
    await pg.exec('RESET ROLE');
  });
  console.log(`Slot request points: ${checks} integration groups passed; no real points used.`);
} finally { await pg.close(); }
