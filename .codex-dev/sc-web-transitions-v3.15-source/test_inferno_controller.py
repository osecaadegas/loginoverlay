"""Go OBS/WebSocket controller integration using mock OBS only, no real camera or OBS."""
from pathlib import Path
import json,threading,time,re,urllib.parse
from websockets.sync.server import serve
from urllib.request import Request,urlopen
prefix=Path(__file__).with_name('test_native_integration.py').read_text().split('mock=Mock()')[0]
exec(compile(prefix,'mock_support','exec'),globals())
mock=Mock()
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 html=req('/').decode();token=re.search(r"const TOKEN='([^']+)'",html).group(1)
 req('/api/connect','POST',{'password':'','port':4455},token)
 req('/api/install','POST',{'camera':'My Camera'},token)
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0]
 req('/heartbeat','POST',{'version':'3.3.0-inferno-rc1','rendererID':rid},expected=200)
 req('/api/effect','POST',{'effect':'inferno'},token)
 current=req('/api/status')['settings']['effect'];assert current=='inferno',current
 def send(action,jid,coverage=None):
  q='?rid='+urllib.parse.quote(rid)+'&id='+str(jid)
  if coverage is not None:q+='&coverage='+str(coverage)
  return req('/'+action+q,method='POST')
 req('/api/transition','POST',{'direction':'out','effect':'inferno','duration':2.0,'density':75},token)
 tick(lambda:state(rid)['phase']=='prepare',seconds=10)
 jid=state(rid)['job_id'];send('ready',jid)
 tick(lambda:state(rid)['phase']=='cover',seconds=10)
 # Incorrect coverage must not advance the camera (tested separately in Go ACK logic).
 send('covered',jid,1.0)
 tick(lambda:state(rid)['phase']=='play',seconds=10)
 assert mock.enabled[1] is False, 'Inferno OUT did not hide webcam'
 send('done',jid);tick(lambda:state(rid)['phase']=='idle',seconds=10)
 assert mock.enabled[1] is False
 print('Inferno OUT verified: camera OFF, renderer transition completed')
 req('/api/transition','POST',{'direction':'in','effect':'inferno','duration':2.0,'density':75},token)
 tick(lambda:state(rid)['phase']=='prepare',seconds=10)
 jid=state(rid)['job_id'];send('ready',jid)
 tick(lambda:state(rid)['phase']=='play',seconds=10)
 assert mock.enabled[1] is False, 'Inferno IN enabled camera before renderer requested reveal'
 send('reveal',jid)
 tick(lambda:bool(state(rid).get('camera_ready')),seconds=10)
 assert mock.enabled[1] is True
 send('done',jid);tick(lambda:state(rid)['phase']=='idle',seconds=10)
 assert mock.enabled[1] is True
 print('Inferno IN verified: camera ON after reveal and frame availability gate')
 print('PASS: Mock OBS controller IN/OUT')
