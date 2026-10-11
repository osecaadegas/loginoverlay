import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { blockedOverlayAsset, canUseOverlayAsset, usesOverlayAsset } from '../src/utils/overlayAssetAccess.js';

// Optional isolated PostgreSQL runtime; never connects to production or creates real users.
const pglitePath = process.env.PGLITE_MODULE || join(process.env.TEMP || '/tmp', 'streamers-overlay-access-sql-test/node_modules/@electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(pglitePath).href);
const db = new PGlite();
const admin = '00000000-0000-0000-0000-000000000001';
const member = '00000000-0000-0000-0000-000000000002';
const outsider = '00000000-0000-0000-0000-000000000003';
await db.exec(`create role anon; create role authenticated; create schema auth;
alter default privileges grant execute on functions to anon,authenticated;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;
create table public.user_roles(user_id uuid,role text,is_active boolean,access_expires_at timestamptz);
create table public.overlay_widgets(user_id uuid,config jsonb);
create table public.better_editor_overlays(user_id uuid,draft_layout jsonb,published_layout jsonb);
create table public.better_overlay_publications(owner_user_id uuid,published_layout jsonb);
insert into auth.users values('${admin}'),('${member}'),('${outsider}');
insert into user_roles values('${admin}','admin',true,null);`);
await db.exec(readFileSync(new URL('../migrations/20261011055318_overlay_access_roles.sql', import.meta.url), 'utf8'));
await db.exec(readFileSync(new URL('../migrations/20261011060556_overlay_access_privileges.sql', import.meta.url), 'utf8'));
assert.equal((await db.query("select has_function_privilege('anon','public.save_overlay_access_asset(jsonb,uuid[])','execute') allowed")).rows[0].allowed,false);
const asUser = async user => db.exec(`reset role; set test.uid='${user}'; set role authenticated;`);
const one = async (sql, args=[]) => (await db.query(sql,args)).rows[0];
const denied = async (sql, args=[]) => assert.rejects(db.query(sql,args), /permission|policy|Administrator|Exclusive/i);
await asUser(outsider);
await denied("insert into overlay_access_roles(name) values('Unauthorised')");
await denied("select save_overlay_access_asset($1,$2)", [{kind:'theme',key:'orbital',label:'Space'},[]]);
await asUser(admin);
const role = (await one("insert into overlay_access_roles(name) values('Partners') returning id")).id;
const role2 = (await one("insert into overlay_access_roles(name) values('Artists') returning id")).id;
const saveAsset = async (asset,roles) => (await one('select save_overlay_access_asset($1,$2) id',[asset,roles])).id;
const themeId = await saveAsset({kind:'theme',key:'orbital',label:'Space',restricted:true},[role]);
await saveAsset({kind:'background',key:'/backgrounds/exclusive earth.webp',label:'Earth',restricted:true},[role2]);
await saveAsset({kind:'banner',key:'https://media.example/banner.mp4',label:'Banner',mediaType:'video',restricted:true},[role]);
await db.query('insert into overlay_access_members values($1,$2),($3,$2)',[role,member,role2]);
await asUser(member);
assert.equal((await db.query('select * from overlay_access_roles')).rows.length,0,'Members cannot enumerate private roles');
await denied('insert into overlay_access_members values($1,$2)',[role,outsider]);
await denied("select overlay_access_private.allowed($1,$2)",[member,themeId]);
const snapshot = async user => (await one('select get_overlay_asset_access($1) access',[user])).access;
const allowed = await snapshot(member);
assert.equal(allowed.every(a=>a.allowed),true,'Multiple role grants combine');
assert.equal(allowed.some(a=>'role_id' in a || 'user_id' in a),false,'Public access snapshot contains no private memberships');
const blocked = await snapshot(outsider);
assert.equal(blocked.every(a=>!a.allowed),true);
assert.equal(canUseOverlayAsset(blocked,'theme','space'),false);
assert.equal(canUseOverlayAsset(blocked,'theme','neon'),true);
assert.equal(canUseOverlayAsset(null,'theme','orbital'),false,'Loading/failure is closed');
const configs = [
 {colourTheme:'orbital'}, {colour:'theme_space'}, {nested:{theme:'orbital'}},
 {imageUrl:'/backgrounds/exclusive%20earth.webp?v=2'},
 {mediaText:'https://media.example/%62anner.mp4|video|Banner'},
];
for(const config of configs) {
 assert.ok(blockedOverlayAsset(config,blocked),'Browser matches restriction');
 await db.exec('reset role');
 await db.query('insert into overlay_widgets values($1,$2)',[member,config]);
 await denied('insert into overlay_widgets values($1,$2)',[outsider,config]);
 await denied('insert into better_editor_overlays values($1,$2,null)',[outsider,{instances:[{config}]}]);
 await denied('insert into better_overlay_publications values($1,$2)',[outsider,{instances:[{config}]}]);
}
await asUser(admin);
await db.query('delete from overlay_access_members where role_id=$1 and user_id=$2',[role,member]);
assert.equal((await snapshot(member)).find(a=>a.id===themeId).allowed,false,'Revocation affects existing published configurations');
await db.query('delete from overlay_access_roles where id=$1',[role]);
assert.equal((await snapshot(member)).find(a=>a.id===themeId).restricted,true,'Deleting a role never makes exclusive assets public');
assert.equal((await snapshot(admin)).every(a=>a.allowed),true);
await saveAsset({kind:'theme',key:'orbital',label:'Space',restricted:false},[]);
assert.equal((await snapshot(outsider)).find(a=>a.id===themeId).allowed,true,'Explicit public release works');
await assert.rejects(saveAsset({kind:'banner',key:'javascript:alert(1)',label:'Unsafe'},[]),/check constraint/);
await db.exec(`reset role; update user_roles set access_expires_at=now()-interval '1 day' where user_id='${admin}';`);
await asUser(admin);
await denied("insert into overlay_access_roles(name) values('Expired admin')");
assert.equal(usesOverlayAsset({colourTheme:'neon'},{kind:'theme',key:'orbital'}),false);
await db.close();
console.log('Overlay access: PostgreSQL RLS, admin expiry, grants, multiple roles, all save paths, URL variants, revocation and browser matching passed.');
