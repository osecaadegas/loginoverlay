from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
from io import BytesIO
import ast,base64,subprocess,time,json
root=Path('/mnt/data/SC_Web_Transitions_v3_4_1_VFX_Polish')
source=(root/'expansion-effects.js').read_text()
tree=ast.parse((root/'test_vfx_polish.py').read_text())
init=next(ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and any(getattr(v,'id','')=='init' for v in node.targets))
init=init.replace('W=960,H=540','W=640,H=360')
out=root/'preview_videos';out.mkdir(exist_ok=True)
size=(640,360);fps=16
ids=['lightning','shadow','plasma']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
labels={'glitch':'VOID GLITCH','lightning':'LIGHTNING SURGE','shadow':'SHADOW SWARM','holy':'HOLY ASCENSION','sand':'SAND DISINTEGRATION','crystal':'CRYSTAL GROWTH','petal':'PETAL BLOOM','plasma':'NEON PLASMA'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':640,'height':360})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><body style="background:transparent;margin:0"><canvas id="fx" width="640" height="360"></canvas></body></html>')
 page.add_script_tag(content=source)
 page.evaluate(init)
 raw=page.evaluate("qa.subject.toDataURL('image/png').split(',')[1]")
 person=Image.open(BytesIO(base64.b64decode(raw))).convert('RGBA')
 for id in ids:
  start=time.monotonic()
  stats=page.evaluate('''id=>{if(window.effect)effect.dispose();const x=window.qa;
    window.effect=window.SCExpansion.create(id,{field:x.field,subject:x.subject,W:x.W,H:x.H,ctx:x.ctx,intensity:75,quality:'Cinematic',seed:1551,tuning:{motion:1,detail:1}});
    return effect.getState()}''',id)
  cmd=['ffmpeg','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','640x360','-framerate',str(fps),'-i','-','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p',str(out/f'SC_v3.4.1_{id}_IN_OUT_Synthetic.mp4')]
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
  for i in range(64):
   if i<15:
    stage='OUT • concealed buildup'; q=i/14;visible=True
    mode='cover'
   elif i<34:
    stage='OUT • disintegrate';q=(i-15)/18;visible=False;mode='out'
   elif i<49:
    stage='IN • reconstruct';q=(i-34)/14*.65;visible=False;mode='in'
   else:
    stage='IN • live reveal';q=.65+(i-49)/14*.35;visible=True;mode='in'
   enc=page.evaluate('''({mode,q})=>{qa.ctx.clearRect(0,0,qa.W,qa.H);
     if(mode==='cover')effect.renderCover(q,q*2);else effect.renderPlay(q*3,mode,3,q*3);
     return document.getElementById('fx').toDataURL('image/webp',.82).split(',')[1];}''',{'mode':mode,'q':q})
   fx=Image.open(BytesIO(base64.b64decode(enc))).convert('RGBA')
   frame=Image.new('RGBA',size,(13,19,29,255))
   if visible:frame.alpha_composite(person)
   frame.alpha_composite(fx)
   frame=frame.convert('RGB');d=ImageDraw.Draw(frame)
   d.rectangle((0,0,640,34),fill=(8,13,24))
   d.text((13,7),labels[id],font=font,fill=(236,243,255))
   d.text((365,7),stage,font=font,fill=(160,195,230))
   proc.stdin.write(frame.tobytes())
   if i in [7,25,44,56]:frame.save(out/f'{id}_key_{i:02}.jpg',quality=86)
  proc.stdin.close();message=proc.stderr.read().decode();code=proc.wait()
  print(id,'coverage',stats['coverage'],'video',code,'seconds',round(time.monotonic()-start,1),'bytes',(out/f'SC_v3.4.1_{id}_IN_OUT_Synthetic.mp4').stat().st_size if code==0 else message,flush=True)
 print('page errors',errors)
 browser.close()
