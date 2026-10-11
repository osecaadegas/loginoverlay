import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const server = await createServer({ server: { port: 0 }, plugins: [{ name: 'overlay-access-test-page', configureServer(s) {
  s.middlewares.use('/__access_test', (_req,res) => { res.setHeader('Content-Type','text/html'); res.end('<html><body style="background:#07111f;margin:24px;font-family:Arial"><div id="root"></div><script type="module" src="/@vite/client"></script></body></html>'); });
} }] });
await server.listen();
const origin = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1440,height:1000});
  await page.goto(`${origin}__access_test`);
  await page.evaluate(async () => {
    const RefreshRuntime = (await import('/@react-refresh')).default;
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { supabase } = await import('/src/config/supabaseClient.js');
    // Browser fixtures exercise forms and rendering only; SQL/RLS are tested separately.
    window.rows = { overlay_access_roles: [], overlay_access_assets: [], overlay_access_grants: [], overlay_access_members: [] };
    window.calls = [];
    supabase.from = table => {
      const request = { operation: 'select', conditions: [] };
      const q = {
        select:()=>q, order:()=>q,
        insert: data => { request.operation='insert'; request.data=data; return q; },
        update: data => { request.operation='update'; request.data=data; return q; },
        delete:()=>{ request.operation='delete'; return q; },
        eq:(key,value)=>{ request.conditions.push([key,value]); return q; },
        then(resolve) {
          window.calls.push({table,...request});
          const selected = window.rows[table].filter(row=>request.conditions.every(([k,v])=>row[k]===v));
          if(request.operation==='insert') window.rows[table].push({id:crypto.randomUUID(),...request.data});
          if(request.operation==='update') selected.forEach(row=>Object.assign(row,request.data));
          if(request.operation==='delete') window.rows[table]=window.rows[table].filter(row=>!selected.includes(row));
          return Promise.resolve({data:structuredClone(request.operation==='select'?selected:[]),error:null}).then(resolve);
        },
      }; return q;
    };
    supabase.rpc = async (name,args) => {
      window.calls.push({rpc:name,args});
      if (name === 'get_overlay_asset_access') return {data:window.rows.overlay_access_assets.map(a=>({id:a.id,key:a.asset_key,kind:a.kind,label:a.label,mediaType:a.media_type,restricted:a.restricted,allowed:!a.restricted || window.rows.overlay_access_grants.some(g=>g.asset_id===a.id && window.rows.overlay_access_members.some(m=>m.role_id===g.role_id && m.user_id===args.p_owner))})),error:null};
      if(name==='save_overlay_access_asset') {
        const a=args.p_asset;
        let row=window.rows.overlay_access_assets.find(r=>r.kind===a.kind&&r.asset_key===a.key);
        if(!row) {row={id:crypto.randomUUID()};window.rows.overlay_access_assets.push(row);}
        Object.assign(row,{kind:a.kind,asset_key:a.key,label:a.label,media_type:a.mediaType,restricted:a.restricted});
        window.rows.overlay_access_grants=window.rows.overlay_access_grants.filter(g=>g.asset_id!==row.id).concat(args.p_roles.map(role_id=>({asset_id:row.id,role_id})));
        return {data:row.id,error:null};
      }
      return {data:[],error:null};
    };
    const module=await import('/src/components/AdminPanel/OverlayRolesAdmin.jsx');
    const Gate=(await import('/src/components/OverlayCenter/editor/OverlayAssetGate.jsx')).default;
    window.root=createRoot(document.getElementById('root'));
    window.show=mode=>window.root.render(mode==='admin'?React.createElement(module.default): mode==='member'?React.createElement(module.OverlayRoleAssignments,{userId:'member'}):React.createElement(Gate,{userId:'member',config:{colourTheme:'orbital'},runtime:'obs'},React.createElement('div',{id:'allowed-widget'},'Live widget')));
    window.refreshAccess=(await import('/src/hooks/useOverlayAssetAccess.js')).refreshOverlayAssetAccess;
    window.show('admin');
  });
  const clickText = async text => { await page.waitForFunction(t=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===t&&!b.disabled),{},text); await page.evaluate(t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t).click(),text); };
  await page.waitForSelector('input[placeholder="e.g. Partner streamers"]');
  await page.type('input[placeholder="e.g. Partner streamers"]','Partners');
  await clickText('Create role');
  await page.waitForFunction(()=>window.rows.overlay_access_roles.length===1);
  await page.waitForFunction(()=>[...document.querySelectorAll('.ora-assets button')].some(b=>!b.disabled));
  await page.evaluate(()=>[...document.querySelectorAll('.ora-assets button')].find(b=>b.textContent.includes('Space / Orbital')).click());
  await page.waitForSelector('.ora-asset-editor');
  await page.click('.ora-asset-editor input[type=checkbox]');
  await page.waitForFunction(()=>document.querySelectorAll('.ora-asset-editor input[type=checkbox]').length===2);
  await page.evaluate(()=>document.querySelectorAll('.ora-asset-editor input[type=checkbox]')[1].click());
  await clickText('Save asset access');
  await page.waitForFunction(()=>window.rows.overlay_access_grants.length===1);
  const screenshot=join(tmpdir(),'streamers-overlay-roles-admin.png');
  await page.screenshot({path:screenshot,fullPage:true});
  for(const width of [1440,390]) {
    await page.setViewport({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}`);
  }
  await page.evaluate(()=>window.show('member'));
  await page.waitForSelector('.ora-choice input');
  await page.waitForFunction(()=>!document.querySelector('.ora-choice input').disabled);
  await page.click('.ora-choice input');
  await page.waitForFunction(()=>window.rows.overlay_access_members.length===1);
  await page.evaluate(()=>window.show('gate'));
  await page.waitForSelector('#allowed-widget');
  await page.evaluate(async()=>{window.rows.overlay_access_members=[];await window.refreshAccess();});
  await page.waitForFunction(()=>!document.querySelector('#allowed-widget'));
  await page.evaluate(async()=>{window.rows.overlay_access_members=[{user_id:'member',role_id:window.rows.overlay_access_roles[0].id}];await window.refreshAccess();});
  await page.waitForSelector('#allowed-widget');
  assert.deepEqual(errors,[]);
  console.log(`Overlay role browser forms, responsive layout, assignment, OBS revocation and regrant passed. Screenshot: ${screenshot}`);
} finally { await browser.close(); await server.close(); }
