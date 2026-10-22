"""Purely synthetic previews of actual 3.2.7 Canvas renderer; no OBS capture."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64,io,math,subprocess
R=Path(__file__).resolve().parent
HTML=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
OUT=Path('/mnt/data/SC_v327_Cloud_Review');OUT.mkdir(parents=True,exist_ok=True)
W,H,FPS=720,406,16
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)

def make_bg(t,visible):
 im=Image.new('RGBA',(W,H),(13,19,29,255));d=ImageDraw.Draw(im)
 for k in range(8):d.line((k*120,0,k*116-60,H),fill=(27,35,49,255),width=1)
 if visible:
  dx=math.sin(t*2.4)*5;x=W*.5+dx
  d.ellipse((x-44,43,x+44,132),fill=(232,187,148,255))
  d.rounded_rectangle((x-106,140,x+106,H+24),radius=53,fill=(40,117,182,255))
  d.rectangle((x-36,77,x+37,92),fill=(20,25,37,255))
 return im

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for effect in ('smoke','toxic'):
  page=browser.new_page(viewport={'width':W,'height':H});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  h=HTML.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&direction=out&intensity=78')")
  page.set_content(h,wait_until='domcontentloaded');page.wait_for_function('clouds.length>30&&gasSeal!==null',timeout=30000)
  path=OUT/effect;path.mkdir(exist_ok=True)
  stages=[('OUT • build',1.76,'cover'),('OUT • lift and vanish',3.0,'release'),('IN • cloud lifts',3.0,'in')]
  frame=0;elapsed=0
  thumbs=[]
  for title,duration,stage in stages:
   for j in range(round(duration*FPS)):
    tt=j/FPS
    progress=min(1,tt/duration)
    age=elapsed+tt
    r=page.evaluate('''({progress,age,stage})=>{
      ctx.clearRect(0,0,W,H);
      drawClouds(progress,stage==='in'?'in':'out',stage==='cover',age);
      return cvs.toDataURL('image/png').split(',')[1];
    }''',{'progress':progress,'age':age,'stage':stage})
    fx=Image.open(io.BytesIO(base64.b64decode(r))).convert('RGBA')
    visible=(stage=='cover' or stage=='in')
    image=make_bg(elapsed+tt,visible);image.alpha_composite(fx)
    d=ImageDraw.Draw(image)
    d.rectangle((4,5,347,31),fill=(6,12,22,185))
    d.text((11,11),f'SC v3.2.7 {effect.upper()} | {title} | SYNTHETIC',font=font,fill='white')
    image.convert('RGB').save(path/f'{frame:04d}.jpg',quality=87)
    if frame in (7,20,28,38,50,62,78,92,107):thumbs.append(image.convert('RGB').resize((360,202)))
    frame+=1
   elapsed+=duration
  output=OUT/f'SC_v3.2.7_{effect.upper()}_Synthetic_Review.mp4'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(FPS),'-i',str(path/'%04d.jpg'),'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-crf','23','-movflags','+faststart',str(output)],check=True)
  contact=Image.new('RGB',(360*3,202*3),(10,16,25))
  for i,img in enumerate(thumbs[:9]):contact.paste(img,((i%3)*360,(i//3)*202))
  contact.save(OUT/f'{effect}_contact_327.jpg',quality=90)
  assert not errors,errors
  print(effect,'synthetic',frame,'frames',output.stat().st_size,'bytes')
  page.close()
 browser.close()
