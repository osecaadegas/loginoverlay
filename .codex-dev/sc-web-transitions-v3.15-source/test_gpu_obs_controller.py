"""SC 3.4: all eight new effect families verified through mock OBS websocket.
Real OBS and camera driver are NOT used. A separate Chromium renderer smoke test covers visual paths."""
from pathlib import Path
import json,threading,time,re,urllib.parse
from websockets.sync.server import serve
source=Path(__file__).with_name('test_native_integration.py').read_text().split('mock=Mock()')[0]
exec(compile(source,'mock_support','exec'),globals())
mock=Mock()
effects=['glitch','lightning','shadow','holy','sand','crystal','petal','plasma']
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 html=req('/').decode();token=re.search(r"const TOKEN='([^']+)'",html).group(1)
 assert all('choose-'+e in html for e in effects),'effect selectors are missing'
 assert len(req('/expansion-effects.js'))>10000
 req('/api/connect','POST',{'password':'','port':4455},token)
 req('/api/install','POST',{'camera':'My Camera'},token)
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0]
 req('/heartbeat','POST',{'version':'3.4.1-vfx-polish-rc1','rendererID':rid},expected=200)
 options={e:{'accent':'#55aaff','motion':1.30,'detail':.80} for e in effects}
 settings=req('/api/status')['settings'];settings['effectOptions']=options
 got=req('/api/save','POST',{'settings':settings},token)['data']['settings']
 assert got['effectOptions']['crystal']['motion']==1.3,'effect options not saved'
 for e in effects:
  req('/api/effect','POST',{'effect':e},token)
  assert req('/api/status')['settings']['effect']==e
  for direction in ('out','in'):
   req('/api/transition','POST',{'effect':e,'direction':direction,'duration':1.8,'density':68},token)
   tick(lambda: state(rid).get('phase')=='prepare',seconds=7)
   jid=state(rid)['job_id']
   tune=state(rid)['tuning'];assert tune['accent']=='#55aaff' and tune['motion']==1.3,(e,tune)
   req('/ready?rid='+rid+'&id='+str(jid),'POST',{})
   if direction=='out':
    tick(lambda:state(rid)['phase']=='cover',seconds=7)
    assert mock.enabled[1] is True
    req('/covered?rid='+rid+'&id='+str(jid)+'&coverage=0.993','POST',{})
    tick(lambda:state(rid)['phase']=='play',seconds=7)
    assert mock.enabled[1] is False,(e,'camera not hidden after coverage')
   else:
    tick(lambda:state(rid)['phase']=='play',seconds=7)
    assert mock.enabled[1] is False,(e,'camera enabled before reveal')
    req('/reveal?rid='+rid+'&id='+str(jid),'POST',{})
    tick(lambda:state(rid).get('camera_ready'),seconds=7)
    assert mock.enabled[1] is True,(e,'camera not enabled after reveal')
   req('/done?rid='+rid+'&id='+str(jid),'POST',{})
   tick(lambda:state(rid)['phase']=='idle',seconds=7)
  print('PASS',e,'IN/OUT final webcam state verified',flush=True)
 # Coverage failure for new family must never disable the camera
 req('/api/transition','POST',{'effect':'glitch','direction':'out','duration':1.2,'density':75},token)
 tick(lambda:state(rid).get('phase')=='prepare',seconds=7)
 jid=state(rid)['job_id'];req('/ready?rid='+rid+'&id='+str(jid),'POST',{})
 tick(lambda:state(rid)['phase']=='cover',seconds=7)
 req('/covered?rid='+rid+'&id='+str(jid)+'&coverage=0.80','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=8)
 assert mock.enabled[1] is True
 assert 'coverage failed' in req('/api/status')['status'].lower()
 print('PASS low coverage rejects camera-off')
 print('PASS eight families and 16 mock OBS transitions')
