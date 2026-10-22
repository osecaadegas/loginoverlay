"""Ice Ultra camera handoff validation with a simulated OBS WebSocket service.
Not a validation of genuine OBS output or GPU timing.
"""
import threading,time,re,urllib.parse
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
 req('/heartbeat','POST',{'version':'3.11.0-ice-shatter-ultra-rc1','rendererID':rid,'rendererMode':'Ice Shatter Ultra WebGL2 3D'})
 assert b'SCIceUltra' in req('/ice-vfx3d.js')
 for direction in ['out','in']:
  req('/api/transition','POST',{'effect':'ice','direction':direction,'duration':2.9,'density':80},token)
  tick(lambda:state(rid)['phase']=='prepare',seconds=7)
  jid=state(rid)['job_id'];req(f'/ready?rid={rid}&id={jid}','POST',{})
  if direction=='out':
   tick(lambda:state(rid)['phase']=='cover',seconds=7)
   assert mock.enabled[1], 'Camera hidden before verified ice coverage'
   req(f'/covered?rid={rid}&id={jid}&coverage=0.991','POST',{})
   tick(lambda:state(rid)['phase']=='play',seconds=7)
   assert not mock.enabled[1], 'Camera still enabled after ice coverage'
  else:
   tick(lambda:state(rid)['phase']=='play',seconds=7)
   assert not mock.enabled[1], 'IN activated camera before assembly'
   req(f'/reveal?rid={rid}&id={jid}','POST',{})
   tick(lambda:state(rid)['camera_ready'],seconds=7)
   assert mock.enabled[1], 'Camera not visible after IN verification'
  req(f'/done?rid={rid}&id={jid}','POST',{})
  tick(lambda:state(rid)['phase']=='idle',seconds=7)
  print('PASS Ice Ultra',direction,'mock OBS visibility handoff')
 req('/api/transition','POST',{'effect':'ice','direction':'out','duration':2.9},token)
 tick(lambda:state(rid)['phase']=='prepare',seconds=7)
 jid=state(rid)['job_id'];req(f'/ready?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='cover',seconds=7)
 req(f'/covered?rid={rid}&id={jid}&coverage=0.80','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=7)
 assert mock.enabled[1], 'Ice false coverage switched camera OFF!'
 print('PASS Ice Ultra rejects 80% coverage and leaves camera visible')
