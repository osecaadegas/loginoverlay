import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import { createUpdatesHandler } from '../api/_lib/routes/updates.js';
import { releaseNotes } from '../api/_lib/release-notes.js';

const server = await createServer({ server: { host: '127.0.0.1', port: 3014, strictPort: true }, logLevel: 'silent' });
await server.listen();
const browser = await puppeteer.launch({ headless: true });
let member = true, fail = false, feedRequests = 0;
const handler = createUpdatesHandler({ createClient: () => ({}), authenticate: async req => {
  if (req.headers.authorization !== 'Bearer fixture-token') throw Object.assign(new Error(), {statusCode:401});
  return { id:'updates-fixture' };
}, resolveAccess: async () => { if(fail) throw new Error('unavailable'); return { hasStreamerAccess: member }; } });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({width:1440,height:1050});
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const url = new URL(request.url());
    if (url.pathname === '/__updates-test') return request.respond({contentType:'text/html',body:`<html><head><link rel="stylesheet" href="/src/index.css"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`});
    if (url.pathname === '/api/premium') return request.respond({contentType:'application/json',body:JSON.stringify({access:{hasStreamerAccess:member,roles:[],roleNames:[]}})});
    if (url.pathname === '/api/updates') {
      feedRequests++;
      let status=200, body;
      const res={setHeader:()=>{},status:value=>{status=value;return res;},json:value=>{body=value;},end:()=>{}};
      await handler({method:'GET',headers:request.headers()},res);
      return request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
    }
    if (url.origin === 'http://127.0.0.1:3014') return request.continue();
    return request.abort();
  });
  await page.goto('http://127.0.0.1:3014/__updates-test');
  const {browserHash}=JSON.parse(readFileSync(new URL('../node_modules/.vite/deps/_metadata.json',import.meta.url),'utf8'));
  await page.evaluate(async hash=>{
    const {default:React}=await import('/node_modules/.vite/deps/react.js?v='+hash);
    const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js?v='+hash);
    const {MemoryRouter,Routes,Route}=await import('/node_modules/.vite/deps/react-router-dom.js?v='+hash);
    const {QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js?v='+hash);
    const {queryClient}=await import('/src/config/queryClient.js');
    const {supabase}=await import('/src/config/supabaseClient.js');
    const {AuthProvider}=await import('/src/context/AuthContext.jsx');
    const {default:Guard}=await import('/src/components/ProtectedRoute/ProtectedAdminRoute.jsx');
    const {default:Updates}=await import('/src/components/UpdatesPage/UpdatesPage.jsx');
    const {default:Nav}=await import('/src/components/Navigation/TopNavigation.jsx');
    let session={access_token:'fixture-token',user:{id:'updates-fixture'}};
    let notify;
    supabase.auth.getSession=async()=>({data:{session}});
    supabase.auth.onAuthStateChange=callback=>{notify=callback;return {data:{subscription:{unsubscribe:()=>{}}}};};
    supabase.from=()=>{const q={select:()=>q,eq:()=>q,then:resolve=>Promise.resolve({data:[],error:null}).then(resolve)};return q;};
    window.updatesSignOut=()=>{session=null;notify('SIGNED_OUT',null);};
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:queryClient},React.createElement(AuthProvider,null,React.createElement(MemoryRouter,{initialEntries:['/updates']},React.createElement(Nav),React.createElement(Routes,null,
      React.createElement(Route,{path:'/updates',element:React.createElement(Guard,{allowPremium:true},React.createElement(Updates))}),
      React.createElement(Route,{path:'/login',element:React.createElement('h1',null,'Sign in required')}),
      React.createElement(Route,{path:'/premium',element:React.createElement('h1',null,'Premium required')}))))));
  },browserHash);
  await page.waitForSelector('.product-updates__entry');
  assert.equal(await page.$$eval('.product-updates__entry',rows=>rows.length),releaseNotes.length);
  assert.ok(await page.$('a[href="/updates"]'));
  await page.click('.product-updates__filters button:last-child');
  assert.equal(await page.$$eval('.product-updates__entry',rows=>rows.length),releaseNotes.filter(entry=>entry.category==='browser').length);
  await page.type('[aria-label="Search updates"]','nothing-matches-this');
  await page.waitForFunction(()=>document.body.innerText.includes('No matching updates'));
  await page.click('.product-updates__status button');
  assert.equal(await page.$$eval('.product-updates__entry',rows=>rows.length),releaseNotes.length);
  mkdirSync('.codex-dev',{recursive:true});
  await page.screenshot({path:'.codex-dev/premium-updates-desktop.png',fullPage:true});
  await page.setViewport({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page must not overflow');
  await page.screenshot({path:'.codex-dev/premium-updates-mobile.png',fullPage:true});
  const requests=feedRequests;
  await page.evaluate(()=>window.updatesSignOut());
  await page.waitForFunction(()=>document.body.innerText.includes('Sign in required'));
  assert.equal(await page.$('.product-updates__entry'),null);
  assert.equal(await page.$('a[href="/updates"]'),null);
  assert.equal(feedRequests,requests,'Signing out must not request or expose release notes');
  member=false;
  assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/updates',{headers:{Authorization:'Bearer fixture-token'}});return r.status;}),403);
  assert.deepEqual(errors,[]);
  console.log('Premium updates: real page/API handler rendering, category/search, mobile layout, navigation, logout isolation and non-premium denial passed.');
} finally {await browser.close();await server.close();}
