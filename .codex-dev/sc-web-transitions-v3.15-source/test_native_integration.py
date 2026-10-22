"""End-to-end local mock OBS + real browser renderer test for v2.3.
Run `SC_NO_BROWSER=1 ./sc_v23_linux` separately. The tests never contact a real user's OBS.
"""
import base64,io,json,threading,time,re,urllib.parse
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from websockets.sync.server import serve
from PIL import Image,ImageDraw
ROOT='http://127.0.0.1:18767'

def make_frame(transparent=True):
 im=Image.new('RGBA',(1280,720),(0,0,0,0) if transparent else (18,28,40,255));d=ImageDraw.Draw(im)
 d.ellipse((500,90,790,480),fill=(210,170,140,255));d.ellipse((400,350,890,840),fill=(28,117,188,255))
 b=io.BytesIO();im.save(b,format='PNG');return b.getvalue()
FRAME=make_frame(); BLANK=Image.new('RGBA',(1280,720),(0,0,0,0));bf=io.BytesIO(); BLANK.save(bf,format='PNG'); BLANK=bf.getvalue()
class Mock:
 def __init__(self):
  self.items=[{'sourceName':'My Camera','sceneItemId':1}]
  self.inputs=[{'inputName':'My Camera'}];self.enabled={1:True};self.url='';self.transparentFX=False;self.opaqueCamera=False
  self.transform={1:{'sourceWidth':1280,'sourceHeight':720,'positionX':625,'positionY':155,'rotation':0,'alignment':5,'scaleX':.33,'scaleY':.33,'boundsType':'OBS_BOUNDS_NONE','cropLeft':0,'cropRight':0,'cropTop':0,'cropBottom':0,'boundsAlignment':0}}
  self.calls=[]
 def handler(self,sock):
  sock.send(json.dumps({'op':0,'d':{'obsStudioVersion':'32.2.2','rpcVersion':1}}));ident=json.loads(sock.recv());assert ident['op']==1
  sock.send(json.dumps({'op':2,'d':{'negotiatedRpcVersion':1}}))
  for msg in sock:
   pkt=json.loads(msg); assert pkt['op']==6
   d=pkt['d'];k=d['requestType'];a=d.get('requestData') or {};self.calls.append((k,a));data={}
   if k=='GetStudioModeEnabled':data={'studioModeEnabled':False}
   elif k=='GetCurrentProgramScene':data={'currentProgramSceneName':'Live'}
   elif k=='GetSceneItemList':data={'sceneItems':self.items}
   elif k=='GetInputList':data={'inputs':self.inputs}
   elif k=='GetSceneItemTransform':data={'sceneItemTransform':self.transform[a['sceneItemId']]}
   elif k=='CreateInput':
    self.items.append({'sourceName':a['inputName'],'sceneItemId':2});self.inputs.append({'inputName':a['inputName']});self.enabled[2]=True;self.url=a['inputSettings']['url'];data={'sceneItemId':2}
   elif k=='CreateSceneItem':raise AssertionError('Unexpected repeated CreateSceneItem')
   elif k=='SetInputSettings':self.url=a['inputSettings'].get('url',self.url)
   elif k=='SetSceneItemTransform':self.transform[a['sceneItemId']]=a['sceneItemTransform']
   elif k=='SetSceneItemEnabled':self.enabled[a['sceneItemId']]=a['sceneItemEnabled']
   elif k=='GetSceneItemEnabled':data={'sceneItemEnabled':self.enabled[a['sceneItemId']]}
   elif k=='GetSourceScreenshot':
    pic=BLANK if a['sourceName']=='SC Web Transitions | FX' and self.transparentFX else make_frame(False) if self.opaqueCamera else FRAME
    data={'imageData':'data:image/png;base64,'+base64.b64encode(pic).decode()}
   elif k in ('SetSceneItemIndex','PressInputPropertiesButton'):pass
   else:raise AssertionError('Unexpected OBS action: '+k)
   sock.send(json.dumps({'op':7,'d':{'requestId':d['requestId'],'requestStatus':{'result':True,'code':100},'responseData':data}}))
def req(path,method='GET',body=None,token=None,expected=None):
 data=json.dumps(body).encode() if body is not None else None
 headers={'Content-Type':'application/json'}
 if token:headers['X-SC-Token']=token
 try:
  res=urlopen(Request(ROOT+path,data=data,headers=headers,method=method),timeout=9)
  got=res.status
 except HTTPError as e:res=e;got=e.code
 if expected:assert got==expected,(path,got,res.read())
 contents=res.read();return json.loads(contents) if res.info().get_content_type()=='application/json' else contents
def state(rid):return req('/state?rid='+rid)
def tick(condition,seconds=12):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if condition():return True
  time.sleep(.045)
 raise AssertionError('Timeout: '+str(condition))
mock=Mock()
with serve(mock.handler,'127.0.0.1',4455) as server:
 threading.Thread(target=server.serve_forever,daemon=True).start()
 html=req('/').decode();token=re.search(r"const TOKEN='([^']+)'",html).group(1)
 print('Connect:',req('/api/connect','POST',{'password':'','port':4455},token))
 print('Install:',req('/api/install','POST',{'camera':'My Camera'},token))
 rid=urllib.parse.parse_qs(urllib.parse.urlparse(mock.url).query)['rid'][0];print('Renderer instance:',rid)
 assert req('/state?rid=incorrect',expected=409)['error']
 assert req('/heartbeat','POST',{'version':'3.0.0-rc1','rendererID':'wrong'},expected=409)['error']
 assert req('/heartbeat','POST',{'version':'3.0.0-rc1','rendererID':rid},expected=200)['ok']
 diagnostic=req('/api/camera-snapshot','POST',{},token)['data']
 assert diagnostic['stats']['alphaBackground']>.1
 assert diagnostic['stats']['foreground']>.02
 assert diagnostic['image'].startswith('data:image/png;base64,')
 print('Actual OBS source capture diagnostic: passed')
 assert mock.transform[2]['positionX']==625 and mock.transform[2]['scaleX']==.33
 for direction in ['out','in']:
  print('Start',direction)
  req('/api/transition','POST',{'direction':direction,'effect':'money','duration':1.15},token)
  tick(lambda:state(rid).get('phase')=='prepare')
  jid=state(rid)['job_id']
  req(f'/ready?rid={rid}&id={jid}','POST',{})
  if direction=='out':
   tick(lambda:state(rid)['phase']=='cover')
   assert mock.enabled[1]
   req(f'/covered?rid={rid}&id={jid}&coverage=0.992','POST',{})
   tick(lambda:state(rid)['phase']=='play')
   assert not mock.enabled[1]
   req(f'/done?rid={rid}&id={jid}','POST',{})
  else:
   tick(lambda:state(rid)['phase']=='play')
   assert not mock.enabled[1]
   req(f'/reveal?rid={rid}&id={jid}','POST',{})
   tick(lambda:mock.enabled[1])
   req(f'/done?rid={rid}&id={jid}','POST',{})
  tick(lambda:state(rid)['phase']=='idle')
  print('Passed',direction)
 # Regression: all additional transitions use the same OBS timing protocol.
 for effect in ['ice','smoke','toxic']:
  for direction in ['out','in']:
   req('/api/transition','POST',{'direction':direction,'effect':effect,'duration':1.15,'density':78},token)
   tick(lambda:state(rid).get('phase')=='prepare')
   jid=state(rid)['job_id']
   req(f'/ready?rid={rid}&id={jid}','POST',{})
   if direction=='out':
    tick(lambda:state(rid)['phase']=='cover')
    assert mock.enabled[1], (effect,'webcam hidden before cover')
    req(f'/covered?rid={rid}&id={jid}&coverage=0.992','POST',{})
    tick(lambda:state(rid)['phase']=='play')
    assert not mock.enabled[1], (effect,'webcam not hidden at play')
   else:
    tick(lambda:state(rid)['phase']=='play')
    req(f'/reveal?rid={rid}&id={jid}','POST',{})
    tick(lambda:mock.enabled[1])
   req(f'/done?rid={rid}&id={jid}','POST',{})
   tick(lambda:state(rid)['phase']=='idle')
  print('PASS:',effect,'OUT/IN handoff')
 # failure case: camera left ON because OBS source never painted
 mock.transparentFX=True
 req('/api/transition','POST',{'direction':'out','effect':'smoke','duration':1.2},token)
 tick(lambda:state(rid)['phase']=='prepare');jid=state(rid)['job_id']
 req(f'/ready?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='cover');req(f'/covered?rid={rid}&id={jid}&coverage=0.992','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=10)
 assert mock.enabled[1],'Should retain webcam when OBS overlay is transparent'
 status=req('/api/status');assert 'OBS FX COVERAGE FAILED' in status['status'],status
 print('PASS: transparent OBS FX source detected and camera left visible')
 # New v2.7 safety regression: bogus 80% bill coverage can NEVER hide camera.
 mock.transparentFX=False
 req('/api/transition','POST',{'direction':'out','effect':'money','duration':1.1},token)
 tick(lambda:state(rid)['phase']=='prepare');jid=state(rid)['job_id']
 req(f'/ready?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='cover')
 req(f'/covered?rid={rid}&id={jid}&coverage=0.80','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=8)
 assert mock.enabled[1],'Money camera was hidden despite insufficient coverage!'
 assert 'coverage failed' in req('/api/status')['status'].lower()
 print('PASS: insufficient actual bill coverage rejected before camera-off')
 # Regression: unsupported smoke opacity must also keep the live webcam ON.
 req('/api/transition','POST',{'direction':'out','effect':'toxic','duration':1.1},token)
 tick(lambda:state(rid)['phase']=='prepare'); jid=state(rid)['job_id']
 req(f'/ready?rid={rid}&id={jid}','POST',{})
 tick(lambda:state(rid)['phase']=='cover')
 req(f'/covered?rid={rid}&id={jid}&coverage=0.65','POST',{})
 tick(lambda:state(rid)['phase']=='idle',seconds=8)
 assert mock.enabled[1], 'Toxic camera hidden before effective alpha cover!'
 assert 'coverage failed' in req('/api/status')['status'].lower()
 print('PASS: partial transparent toxic smoke rejected before camera-off')
 # Bad webcam image is recognized without camera going off
 mock.transparentFX=False;mock.opaqueCamera=True
 req('/api/transition','POST',{'direction':'out','effect':'money'},token)
 tick(lambda:'no green-screen' in req('/api/status')['status'],seconds=10)
 assert mock.enabled[1]
 print('PASS: unsuitable OBS camera alpha diagnosed')
 # v3.2.7: OBS scene item IDs may change while the named camera remains.
 # The new controller must re-resolve the camera source by its name before
 # every visibility command rather than toggling the saved installation ID.
 mock.opaqueCamera=False
 for entry in mock.items:
  if entry['sourceName']=='My Camera':entry['sceneItemId']=11
 mock.enabled[11]=mock.enabled.pop(1)
 mock.transform[11]=mock.transform.pop(1)
 for direction in ('out','in'):
  req('/api/transition','POST',{'direction':direction,'effect':'smoke','duration':1.1},token)
  tick(lambda:state(rid).get('phase')=='prepare')
  jid=state(rid)['job_id'];req(f'/ready?rid={rid}&id={jid}','POST',{})
  if direction=='out':
   tick(lambda:state(rid)['phase']=='cover')
   req(f'/covered?rid={rid}&id={jid}&coverage=0.995','POST',{})
   tick(lambda:state(rid)['phase']=='play')
   assert mock.enabled[11] is False
  else:
   tick(lambda:state(rid)['phase']=='play')
   req(f'/reveal?rid={rid}&id={jid}','POST',{})
   tick(lambda:mock.enabled[11] is True)
  req(f'/done?rid={rid}&id={jid}','POST',{})
  tick(lambda:state(rid)['phase']=='idle')
 print('PASS: recreated camera item ID is re-resolved for OUT and IN')
 print('ALL INTEGRATION TESTS PASSED')
