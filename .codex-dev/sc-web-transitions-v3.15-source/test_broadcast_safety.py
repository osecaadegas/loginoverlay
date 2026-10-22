"""Simulated OBS regression tests for v3.9.1. Requires SC_NO_BROWSER=1 server on localhost:18767.
Mock screenshots do NOT certify real OBS output or streaming performance.
"""
import threading, urllib.parse, re, time
from pathlib import Path
from websockets.sync.server import serve
support=Path(__file__).with_name('test_native_integration.py').read_text().split('mock=Mock()')[0]
exec(compile(support,'mock_support','exec'),globals())
mock=Mock()
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 version=req('/health')['version'];assert version=='3.10.0-money-cgi-ultra-rc1',version
 token=re.search(r"const TOKEN='([^']+)'",req('/').decode()).group(1)
 req('/api/connect','POST',{'password':'','port':4455},token)
 req('/api/install','POST',{'camera':'My Camera'},token)
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0]
 def beat(stage='idle',fps=60,p95=7):
  return req('/heartbeat','POST',{'version':version,'rendererID':rid,'stage':stage,'fps':fps,'renderP95':p95,'rendererMode':'WebGL2 CGI Paper 3D'})
 def launch(direction):
  beat();req('/api/transition','POST',{'effect':'money','direction':direction,'duration':1.3,'density':75},token)
  tick(lambda:state(rid).get('phase')=='prepare',seconds=7)
  jid=state(rid)['job_id'];qual=state(rid)['quality'];req(f'/ready?rid={rid}&id={jid}','POST',{})
  tick(lambda:state(rid)['phase']==('cover' if direction=='out' else 'play'),seconds=7)
  return jid,qual
 def done(jid):
  req(f'/done?rid={rid}&id={jid}','POST',{})
  tick(lambda:state(rid)['phase']=='idle',seconds=9)
 def out_ok(slow=False):
  jid,qual=launch('out')
  assert mock.enabled[1], 'camera hidden before verified coverage'
  if slow:
   beat('cover',39,28);beat('cover',39,28)
  req(f'/covered?rid={rid}&id={jid}&coverage=0.996','POST',{})
  tick(lambda:state(rid)['phase']=='play',seconds=7)
  assert mock.enabled[1] is False
  done(jid)
  assert mock.enabled[1] is False
  return qual
 # Busy settings / effect changes rejected (preserve selected camera/effect)
 jid,qual=launch('out')
 req('/api/effect','POST',{'effect':'ice'},token,expected=400)
 s=req('/api/status')['settings'];req('/api/save','POST',{'settings':s},token,expected=400)
 req(f'/covered?rid={rid}&id={jid}&coverage=0.996','POST',{})
 tick(lambda:state(rid)['phase']=='play',seconds=7);done(jid)
 assert mock.enabled[1] is False
 # Rejected duplicate OUT must NOT accidentally recover an intentionally hidden webcam.
 req('/api/transition','POST',{'effect':'money','direction':'out','duration':1.3,'density':75},token)
 tick(lambda:'Transition rejected before camera/FX changes' in req('/api/status')['status'] and not req('/api/status')['busy'],seconds=7)
 assert mock.enabled[1] is False,'duplicate OUT revealed an intentionally hidden camera'
 print('PASS: duplicate OUT preserves hidden camera')
 print('PASS: configuration mutations rejected while transition running')
 # Missing IN reveal ACK is an error; recovery reveals the webcam safely.
 jid,quality=launch('in')
 req(f'/done?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=9)
 assert mock.enabled[1] is True,'IN early done failed to recover visible camera'
 assert mock.enabled[2] is False,'IN early done failed to remove FX layer'
 assert 'without a reveal' in req('/api/status')['status'],req('/api/status')['status']
 print('PASS: IN done-before-reveal rejected; camera recovered ON and FX disabled')
 # Slow frames during a cover make subsequent transitions use lower GPU quality.
 before=out_ok(slow=True)
 assert req('/api/status')['adaptiveQuality']>=1,req('/api/status')['adaptiveQuality']
 jid,after=launch('in')
 assert after in ('Balanced','Performance'),after
 req(f'/reveal?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['camera_ready'],seconds=8)
 done(jid)
 print('PASS: adaptive GPU detail applies only to NEXT transition, not mid-effect:',before,'->',after)
 # Real FX screenshot in IN is transparent despite renderer reveal ACK.
 out_ok()
 mock.transparentFX=True
 jid,_=launch('in')
 req(f'/reveal?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=12)
 assert mock.enabled[1] is True,'uncovered IN failed to recover camera ON'
 assert mock.enabled[2] is False,'uncovered IN failed to clear FX'
 assert 'IN concealment not confirmed' in req('/api/status')['status'],req('/api/status')['status']
 print('PASS: IN alpha fails visual verification; webcam recovered ON and FX off')
 mock.transparentFX=False
 # Renderer hangs after verified OUT camera hide; watchdog must restore the webcam.
 jid,_=launch('out')
 req(f'/covered?rid={rid}&id={jid}&coverage=0.996','POST',{})
 tick(lambda:state(rid)['phase']=='play',seconds=7)
 assert mock.enabled[1] is False
 # No heartbeat or DONE event. The browser renderer is now assumed stalled.
 tick(lambda:state(rid)['phase']=='idle',seconds=9)
 assert mock.enabled[1] is True,'stalled OUT failed to recover camera'
 assert mock.enabled[2] is False,'stalled OUT failed to clear FX'
 assert 'heartbeat lost' in req('/api/status')['status'],req('/api/status')['status']
 print('PASS: stalled renderer watchdog restores webcam and clears FX')
 # Explicit user recovery can interrupt a hanging renderer before timeout.
 jid,_=launch('out')
 req('/api/recover','POST',{},token)
 tick(lambda:state(rid)['phase']=='idle',seconds=7)
 assert mock.enabled[1] is True and mock.enabled[2] is False
 print('PASS: user Recover Camera works during active transition')
 print('ALL BROADCAST SAFE INTEGRATION TESTS PASSED')
