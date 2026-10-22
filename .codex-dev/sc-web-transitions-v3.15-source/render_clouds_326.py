"""Generate synthetic PNG/MP4 cloud review by rendering actual overlay.html code."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64,io,subprocess
ROOT=Path(__file__).resolve().parent
OUTPUT=Path('/mnt/data/sc326_cloud_previews');OUTPUT.mkdir(exist_ok=True)
HTML=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
FPS=10;WIDTH=640;HEIGHT=360
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for effect in ['smoke','toxic']:
  page=browser.new_page(viewport={'width':WIDTH,'height':HEIGHT})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&duration=3&intensity=78')"))
  page.wait_for_function('clouds.length>30 && gasSeal!==null',timeout=30000)
  frame_dir=OUTPUT/(effect+'_frames');frame_dir.mkdir(exist_ok=True)
  duration=7.70;count=int(duration*FPS)
  for i in range(count):
   t=i/FPS
   if t<1.76:
    mode='cover';progress=t/1.76;age=t;visible=True;direction='OUT / RISE'
   elif t<4.76:
    mode='release';progress=(t-1.76)/3;age=t;visible=False;direction='OUT / DISPERSE'
   else:
    mode='release';progress=(t-4.76)/2.94;age=t-4.76;visible=True;direction='IN / REVEAL'
   data=page.evaluate('''({mode,p,age})=>{
       ctx.clearRect(0,0,W,H);
       drawClouds(p,'out',mode==='cover',age);
       return cvs.toDataURL('image/png').split(',')[1];
   }''',{'mode':mode,'p':progress,'age':age})
   layer=Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')
   scene=Image.new('RGBA',(WIDTH,HEIGHT),(27,30,40,255))
   d=ImageDraw.Draw(scene)
   d.rectangle((0,HEIGHT-25,WIDTH,HEIGHT),fill=(14,18,30,255))
   if visible:
    sw=int(13*__import__('math').sin(t*1.8))
    d.ellipse((WIDTH*.45+sw,HEIGHT*.12,WIDTH*.55+sw,HEIGHT*.32),fill=(217,174,141,255))
    d.ellipse((WIDTH*.35+sw,HEIGHT*.31,WIDTH*.65+sw,HEIGHT*.97),fill=(32,90,158,255))
   scene.alpha_composite(layer)
   d=ImageDraw.Draw(scene)
   d.rectangle((4,4,284,26),fill=(16,18,25,235))
   d.text((10,9),f'SC V3.2.6  | {effect.upper()}  | {direction}',fill=(235,246,254),stroke_width=0)
   scene.convert('RGB').save(frame_dir/f'{i:04d}.jpg',quality=84)
  output=OUTPUT/f'SC_v3.2.6_{effect.upper()}_Synthetic_Review.mp4'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(FPS),'-i',str(frame_dir/'%04d.jpg'),'-c:v','libx264','-preset','veryfast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],check=True)
  print(effect, count,'frames',output.stat().st_size,'bytes', 'browser_errors',errors,flush=True)
  assert not errors,errors
  page.close()
 browser.close()
