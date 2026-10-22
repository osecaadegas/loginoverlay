"""Render transparent synthetic Ice previews through the real browser renderer.
Not a physical webcam/OBS Program recording.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, base64

ROOT=Path(__file__).resolve().parent
html=ROOT.joinpath('overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace(
    'const params=new URLSearchParams(location.search)',
    "const params=new URLSearchParams('?preview=1&effect=ice&duration=3&intensity=80')")
FPS=20
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':960,'height':540})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.wait_for_function('iceGrowthFrames.length>=30&&shards.length>=18',timeout=45000)
 for direction in ('OUT','IN'):
  output=Path('/mnt/data')/f'SC_v3.2.5_Organic_Ice_{direction}_Synthetic.mp4'
  args=['ffmpeg','-y','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate',str(FPS),'-i','pipe:0','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-crf','20',str(output)]
  proc=subprocess.Popen(args,stdin=subprocess.PIPE)
  runtime=1.37+3 if direction=='OUT' else 3
  for f in range(round(runtime*FPS)+1):
   second=f/FPS
   if direction=='OUT' and second<=1.37:
    mode='cover';progress=second/1.37
   else:
    mode=direction.lower();progress=(second-(1.37 if direction=='OUT' else 0))/3
   image=page.evaluate('''([mode,p])=>{
     ctx.clearRect(0,0,W,H);
     if(mode==='cover')drawIceCover(p);
     else drawIce(clamp(p)*job.duration,mode,job.duration);
     const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;
     const g=tmp.getContext('2d');g.fillStyle='#111b28';g.fillRect(0,0,W,H);
     g.drawImage(cvs,0,0);
     return tmp.toDataURL('image/png').split(',')[1];
   }''',[mode,progress])
   proc.stdin.write(base64.b64decode(image))
  proc.stdin.close();exitcode=proc.wait(timeout=70)
  if exitcode!=0:raise RuntimeError('ffmpeg failed: '+str(exitcode))
  print(direction,'rendered',output,output.stat().st_size)
 print('page errors',errors)
 assert not errors,errors
 browser.close()
