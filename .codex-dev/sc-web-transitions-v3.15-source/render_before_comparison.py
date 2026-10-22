"""Synthetic animation review. Does not use real OBS or webcam hardware."""
import base64, io, math, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/SC_Web_Transitions_v2_6_5')
D=Path('/mnt/data/sc_before_frames');D.mkdir(exist_ok=True)
W,H=960,540
html=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
bill='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
html=html.replace("image('./bill.png')","image('"+bill+"')")
html=html.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=money&duration=4.5&intensity=80')")
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',18)

def live_frame(t,visible):
 img=Image.new('RGB',(W,H),(9,13,24));d=ImageDraw.Draw(img)
 for k in range(9):
  x=k*155+30
  d.line((x,0,x-60,H),fill=(19,27,42),width=3)
 if visible:
  sway=math.sin(t*3.2)*8;arm=math.sin(t*5.5)*10
  cx=W*.5+sway
  d.ellipse((cx-60,60,cx+60,180),fill=(237,186,147))
  d.rounded_rectangle((cx-145,176,cx+145,570),radius=88,fill=(30,106,173))
  d.rounded_rectangle((cx-158+arm,296,cx-98+arm,510),radius=20,fill=(232,179,146))
  d.rounded_rectangle((cx+97-arm,296,cx+158-arm,510),radius=20,fill=(232,179,146))
  d.rectangle((cx-50,104,cx+50,131),fill=(8,14,24))
 return img

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':W,'height':H});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.wait_for_function('job&&billParts.length>15',timeout=30000)
 fps=24;duration_cover=1.88;duration_play=4.5;out_duration=duration_cover+duration_play
 all_frames=[];samples=[]
 for frame in range(round(out_duration*fps)):
  t=frame/fps;cover=t<duration_cover
  data=page.evaluate('''({t,cover})=>{ctx.clearRect(0,0,W,H);
    if(cover)drawMoneyCover(t/1.88);
    else drawMoney(t-1.88,'out',4.5);
    return cvs.toDataURL('image/png').split(',')[1];}''',{'t':t,'cover':cover})
  fx=Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')
  bg=live_frame(t,cover)
  bg.paste(fx,(0,0),fx)
  ImageDraw.Draw(bg).text((20,18),'SC WEB TRANSITIONS 2.6.5  |  MONEY OUT  |  SYNTHETIC PREVIEW',font=font,fill=(200,225,242))
  dest=D/f'{frame:04d}.png';bg.save(dest)
  if frame in (0,19,36,48,68,88,115,145):samples.append(bg.copy())
  all_frames.append(dest)
 # QA review contains OUT then IN for a complete loop.
 for i in range(round(3.8*fps)):
  p=i/(round(3.8*fps)-1);data=page.evaluate('''p=>{ctx.clearRect(0,0,W,H);drawMoney(p*3.8,'in',3.8);return cvs.toDataURL('image/png').split(',')[1];}''',p)
  fx=Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')
  bg=live_frame(out_duration+i/fps,p>=.86)
  bg.paste(fx,(0,0),fx)
  ImageDraw.Draw(bg).text((20,18),'SC WEB TRANSITIONS 2.6.5  |  MONEY IN  |  SYNTHETIC PREVIEW',font=font,fill=(200,225,242))
  dest=D/f'{len(all_frames):04d}.png';bg.save(dest)
  all_frames.append(dest)
 assert not errors,errors
 print('Wrote',len(all_frames),'frames with no JavaScript errors')
 browser.close()

# Build a filmstrip and encoded video. These are synthetic, not live OBS footage.
cols=4;thumb_w=480;thumb_h=270
sheet=Image.new('RGB',(cols*thumb_w,2*thumb_h),(12,18,28))
for i,img in enumerate(samples[:8]):sheet.paste(img.resize((thumb_w,thumb_h),Image.Resampling.LANCZOS),((i%cols)*thumb_w,(i//cols)*thumb_h))
sheet.save(Path('/mnt/data/SC_v2.6.5_Money_Before_Filmstrip.jpg'),quality=91)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(fps),'-i',str(D/'%04d.png'),'-c:v','libx264','-preset','fast','-pix_fmt','yuv420p','-crf','22','-movflags','+faststart',str(Path('/mnt/data/SC_v2.6.5_Money_Before.mp4'))],check=True)
print('Video:',Path('/mnt/data/SC_v2.6.5_Money_Before.mp4'))
