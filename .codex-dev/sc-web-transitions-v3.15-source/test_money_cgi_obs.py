"""Back-end mock OBS camera handoff specifically for new Money CGI renderer.
This does NOT test actual OBS or the WebGL rendering inside OBS.
"""
import json,threading,time,re,urllib.parse
from pathlib import Path
from websockets.sync.server import serve
source=Path(__file__).with_name('test_native_integration.py').read_text().split('mock=Mock()')[0]
exec(compile(source,'mock_support','exec'),globals())
mock=Mock()
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 html=req('/').decode();token=re.search(r"const TOKEN='([^']+)'",html).group(1)
 req('/api/connect','POST',{'password':'','port':4455},token)
 req('/api/install','POST',{'camera':'My Camera'},token)
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0]
 req('/heartbeat','POST',{'version':'3.10.0-money-cgi-ultra-rc1','rendererID':rid,'rendererMode':'WebGL2 CGI Paper 3D'},expected=200)
 assert b'money-vfx3d.js' in req('/overlay.html?rid='+rid)
 for direction in ['out','in']:
  req('/api/transition','POST',{'effect':'money','direction':direction,'duration':2.8,'density':70},token)
  tick(lambda:state(rid)['phase']=='prepare',seconds=7)
  jid=state(rid)['job_id'];req('/ready?rid='+rid+'&id='+str(jid),'POST',{})
  if direction=='out':
   tick(lambda:state(rid)['phase']=='cover',seconds=7)
   assert mock.enabled[1], 'camera hidden before coverage'
   req('/covered?rid='+rid+'&id='+str(jid)+'&coverage=0.996','POST',{})
   tick(lambda:state(rid)['phase']=='play',seconds=7)
   assert not mock.enabled[1], 'camera still enabled after verified coverage'
  else:
   tick(lambda:state(rid)['phase']=='play',seconds=7)
   assert not mock.enabled[1], 'camera enabled before 3D money cover'
   req('/reveal?rid='+rid+'&id='+str(jid),'POST',{})
   tick(lambda:state(rid)['camera_ready'],seconds=7)
   assert mock.enabled[1], 'camera did not enable after reveal'
  req('/done?rid='+rid+'&id='+str(jid),'POST',{})
  tick(lambda:state(rid)['phase']=='idle',seconds=7)
  print('PASS: Money CGI',direction,'camera switched correctly')
 req('/api/transition','POST',{'effect':'money','direction':'out','duration':2.8,'density':70},token)
 tick(lambda:state(rid)['phase']=='prepare',seconds=7);jid=state(rid)['job_id']
 req('/ready?rid='+rid+'&id='+str(jid),'POST',{})
 tick(lambda:state(rid)['phase']=='cover',seconds=7)
 req('/covered?rid='+rid+'&id='+str(jid)+'&coverage=0.80','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=7)
 assert mock.enabled[1], 'unsafe camera-off on insufficient coverage'
 print('PASS: insufficient coverage cannot hide camera')
