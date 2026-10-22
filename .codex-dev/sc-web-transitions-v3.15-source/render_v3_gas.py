"""Synthetic, not OBS: exports both gas effects for full-motion QA."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
import base64,io,subprocess,math
R=Path(__file__).resolve().parent
H=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
OUT=R/'qa_v3_gas_frames';OUT.mkdir(exist_ok=True)
W,HT=800,450;fps=20
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
def live(t,show):
 im=Image.new('RGB',(W,HT),(12,18,28));d=ImageDraw.Draw(im)
 for k in range(8):d.line((k*130,0,k*130-60,HT),fill=(21,30,47),width=2)
 if show:
  dx=math.sin(t*2.6)*7; x=W*.5+dx
  d.ellipse((x-52,45,x+52,150),fill=(230,175,140));d.rounded_rectangle((x-120,155,x+120,475),radius=63,fill=(25,103,169))
  d.rectangle((x-44,80,x+44,105),fill=(10,19,29))
 return im
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 first=[]
 for effect in ['smoke','toxic']:
  page=browser.new_page(viewport={'width':W,'height':HT});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  text=H.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&duration=3&intensity=85')")
  page.set_content(text,wait_until='domcontentloaded');page.wait_for_function('clouds.length>30',timeout=30000)
  folder=OUT/effect;folder.mkdir(exist_ok=True)
  frames=[];samples=[];cover=1.76;play=3.0
  total=int((cover+play+play)*fps)
  for i in range(total):
   t=i/fps
   if t<cover: js=f'drawSmokeCover({t/cover},{t})';visible=True
   elif t<cover+play: js=f'drawSmoke({t-cover},"out",3)';visible=False
   else: js=f'drawSmoke({t-cover-play},"in",3)';visible=True
   img=page.evaluate('''expr=>{ctx.clearRect(0,0,W,H);eval(expr);return cvs.toDataURL('image/png').split(',')[1]}''',js)
   layer=Image.open(io.BytesIO(base64.b64decode(img))).convert('RGBA')
   bg=live(t,visible);bg.paste(layer,(0,0),layer)
   title=f'SC WEB TRANSITIONS 3.0 RC1 | {effect.upper()} | SYNTHETIC QA'
   ImageDraw.Draw(bg).text((12,12),title,font=font,fill=(220,234,249))
   file=folder/f'{i:04d}.jpg';bg.save(file,quality=86)
   if i in [0,12,26,35,44,62,90,120,151]:samples.append(bg.copy())
   frames.append(file)
  output=R/f'SC_v3_{effect.upper()}_Review.mp4'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(fps),'-i',str(folder/'%04d.jpg'),'-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-crf','24','-movflags','+faststart',str(output)],check=True)
  assert not errors,errors
  first.append(samples)
  print(effect,len(frames),'frames',output.stat().st_size,'bytes')
  page.close()
 browser.close()
sheet=Image.new('RGB',(3*400,6*225),(10,15,24))
for section,images in enumerate(first):
 for idx,img in enumerate(images[:9]):sheet.paste(img.resize((400,225)),((idx%3)*400,(section*3+idx//3)*225))
sheet.save(R/'SC_v3_Gas_Contact_Sheet.jpg',quality=90)
print('Full motion QA complete (synthetic)')
