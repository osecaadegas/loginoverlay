import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3011';
const origin = new URL(base).origin;
const publication = `bo_${'a'.repeat(48)}`;
const legacy = 'b'.repeat(48);
const slots = Array.from({ length: 47 }, (_, i) => ({
  id: i === 46 ? '' : `11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`,
  name: i < 2 ? 'Same title' : `Slot ${i + 1}`, provider: `Provider ${i % 3}`,
}));
const rows = slots.map((slot, i) => i === 46
  ? { id: 'bonus-row-not-slot-id', slotName: slot.name, providerName: slot.provider, betSize: 1, payout: 10, opened: true }
  : { id: `bonus-${i}`, slot, slotName: slot.name, betSize: 1, payout: 10, opened: true });
rows.push({ ...rows[0], id: 'repeat-bonus' });
const best = (slot, owner) => {
  const i = slots.findIndex(item => slot.id ? item.id === slot.id : item.name === slot.name && item.provider === slot.provider);
  assert.ok(i >= 0, `Valid catalog identity: ${JSON.stringify(slot)}`);
  return { slot_id: slots[i].id || null, slot_name: slots[i].name, slot_provider: slots[i].provider, best_win: (owner === 'owner-b' ? 5000 : 1000) + i, best_multiplier: 300 + i };
};
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [], batches = [];
  let failed = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    const json = (data, status = 200) => request.respond({ status, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return request.respond({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':request.headers()['access-control-request-headers'] || '*'}});
    if(url.pathname === '/__hunt-record-test') return request.respond({contentType:'text/html',body:'<html><body style="background:#111"><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>t=>t;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>'});
    if(url.pathname === '/api/slot-personal-best') {
      if(request.method() === 'POST') {
        const body=JSON.parse(request.postData()); batches.push(body.slots.length);
        if(body.slots.length>40) return json({error:'Invalid overlay or slots'},400);
        if(failed) return json({error:'Temporary outage'},503);
        const owner=body.publicOverlayId === publication ? 'owner-a' : 'owner-b';
        return json({bests:body.slots.map(slot=>best(slot,owner))});
      }
      const owner=url.searchParams.get('publicOverlayId') === publication ? 'owner-a' : 'owner-b';
      return json({best:best({id:url.searchParams.get('slotId'),name:url.searchParams.get('slotName'),provider:url.searchParams.get('provider')},owner)});
    }
    if(url.pathname === '/rest/v1/slots') return json(null);
    if(url.origin === origin) return request.continue();
    return request.abort();
  });
  await page.setViewport({width:1440,height:1000});
  await page.goto(base+'/__hunt-record-test');
  const entry=await(await fetch(base+'/src/main.jsx')).text();
  const deps={react:entry.match(/from "([^"\n]*\/react.js\?[^"\n]*)"/)[1],dom:entry.match(/from "([^"\n]*\/react-dom_client.js\?[^"\n]*)"/)[1]};
  await page.evaluate(async ({deps,rows,slots,publication,legacy})=>{
    const {default:React}=await import(deps.react),{default:DOM}=await import(deps.dom);
    const {BetterBonusHuntStyle:Hunt}=await import('/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx');
    const {default:Rtp}=await import('/src/components/OverlayCenter/widgets/rtp-stats/RtpStatsWidget.jsx');
    const root=DOM.createRoot(document.getElementById('root'));
    window.huntRecords={render:(owner='owner-a',slotIndex=0,orientation='vertical')=>{
      const credentials=owner==='owner-a'?{publicOverlayId:publication}:{overlayToken:legacy};
      root.render(React.createElement(React.Fragment,null,
        React.createElement('div',{id:'hunt',style:{width:360,height:1080}},React.createElement(Hunt,{userId:owner,...credentials,config:{orientation,listMode:'image',carouselMode:'imagestats',sessionState:'opening',animations:false,showRequests:false},bonuses:rows,stats:{},currency:'€'})),
        React.createElement('div',{id:'rtp',style:{width:1200,height:90}},React.createElement(Rtp,{userId:owner,...credentials,config:{displayStyle:'better_rtp'},allWidgets:[{widget_type:'current_slot',config:{slot:slots[slotIndex]}}]}))
      ));
    },refresh:()=>window.dispatchEvent(new Event('slot-result-saved'))};
    window.huntRecords.render();
  },{deps,rows,slots,publication,legacy});
  const wait = amount => page.waitForFunction(amount=>Array.from(document.querySelectorAll('.better-hunt-mini-stat--best')).some(e=>e.textContent.replaceAll(',','').includes(String(amount))),{},amount);
  await wait(1046);
  assert.deepEqual(batches,[40,7],'47 unique games use two valid requests; duplicate bonus is not re-requested');
  const values=await page.$$eval('.better-hunt-mini-stat--best',els=>els.map(e=>e.textContent.replaceAll(',','')));
  for(let i=0;i<47;i++) assert.ok(values.some(value=>value.includes(String(1000+i))),`Card ${i+1} shows its own historical best`);
  for(const i of [0,1,39,40,46]) {
    await page.evaluate(i=>window.huntRecords.render('owner-a',i),i);
    await page.waitForFunction(amount=>document.querySelector('#rtp [data-appearance-part="personalBest"]')?.textContent.replaceAll(',','').includes(String(amount)),{},1000+i);
  }
  assert.deepEqual(batches,[40,7],'Changing RTP active slot must not refetch all cards');
  failed=true;await page.evaluate(()=>window.huntRecords.refresh());await page.waitForNetworkIdle();
  await wait(1046); // Keep the same account's successful all-time values during an outage.
  failed=false;
  await page.evaluate(()=>window.huntRecords.render('owner-b',46,'mainstream'));
  await wait(5046);
  const other=await page.$$eval('.better-hunt-mini-stat--best',els=>els.map(e=>e.textContent.replaceAll(',','')));
  assert.ok(other.every(value=>!value.includes('1046')),'Previous owner records are cleared');
  assert.ok(other.some(value=>value.includes('5000')) && other.some(value=>value.includes('5046')));
  assert.ok(batches.every(size=>size<=40));
  assert.deepEqual(errors,[]);
  console.log('Carousel all-time BEST passed: 47 slots, duplicates, legacy identities, provider isolation, RTP parity, both OBS tokens, account switch and failed refresh.');
} finally { await browser.close(); }
