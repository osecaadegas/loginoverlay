"""Real Chromium renderer + OBS fake server. Requires GO local server active and playwright."""
import base64,json,time,re,threading,urllib.parse
from pathlib import Path
from urllib.request import Request,urlopen
from websockets.sync.server import serve
from playwright.sync_api import sync_playwright
source=Path(__file__).with_name('test_native_integration.py').read_text().split('mock=Mock()')[0]
exec(compile(source,'mock_support','exec'),globals())
mock=Mock()
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 html=req('/').decode();token=re.search(r"const TOKEN='([^']+)'",html).group(1)
 req('/api/connect','POST',{'password':'','port':4455},token)
 req('/api/install','POST',{'camera':'My Camera'},token)
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':720})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(ROOT+'/overlay.html?rid='+rid,wait_until='domcontentloaded')
  tick(lambda:req('/api/status')['rendererAlive'],seconds=8)
  print('OBS-origin renderer active in Chromium with instance',rid)
  for effect in ['inferno']:
   req('/api/transition','POST',{'direction':'out','effect':effect,'duration':1.05,'density':65},token)
   tick(lambda:state(rid)['phase']=='cover',seconds=10)
   time.sleep(.5)
   coverage=page.evaluate("""() => { const c=document.getElementById('fx');const im=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let visible=0;for(let i=3;i<im.length;i+=4*33)if(im[i]>10)visible++;return visible/Math.ceil(im.length/(4*33)) }""")
   assert coverage>.005,('Canvas remains transparent',effect,coverage,page.evaluate('window.__scDebug()'))
   tick(lambda:state(rid)['phase']=='idle',seconds=12)
   assert not mock.enabled[1],(effect,'OUT camera remained visible',req('/api/status')['status'])
   print(effect,'OUT visible canvas coverage',round(coverage*100,1),'%')
   req('/api/transition','POST',{'direction':'in','effect':effect,'duration':1.05,'density':65},token)
   tick(lambda:state(rid)['phase']=='idle',seconds=12)
   assert mock.enabled[1],effect+' IN camera did not turn on'
   print(effect,'IN done')
  assert not errors,errors
  print('Inferno real Chromium render + mock OBS passed')
  browser.close()
