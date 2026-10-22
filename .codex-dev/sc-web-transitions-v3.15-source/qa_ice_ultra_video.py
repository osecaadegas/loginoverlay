"""Synthetic-only full-motion Mesa shader preview, not an OBS recording."""
import subprocess,math
from pathlib import Path
from PIL import Image
import numpy as np
from qa_ice_ultra_gl import render,cover,photo
out=Path('/mnt/data')
W,H=640,360
bg=Image.new('RGBA',(W,H),(13,20,32,255))
for direction in ['OUT','IN']:
 path=out/f'SC_Ice_Shatter_Ultra_{direction}_Mesa_Synthetic.mp4'
 command=['ffmpeg','-nostdin','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','640x360','-r','24','-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(path)]
 pipe=subprocess.Popen(command,stdin=subprocess.PIPE)
 try:
  for n in range(96):
   p=n/95
   frame=bg.copy()
   if direction=='OUT':
    if p<.29:
     # Synthetic demonstration: textured portrait gradually ices over.
     photoBlend=Image.blend(photo,cover, min(1,p/.25))
     frame.alpha_composite(photoBlend)
    else:
     q=max(0,min(1,(p-.29)/.71))
     if q<.11:
      hold=cover.copy();hold.putalpha(hold.getchannel('A').point(lambda a:int(a*(1-min(1,q/.11)))))
      frame.alpha_composite(hold)
     frame.alpha_composite(render('OUT',q))
   else:
    if p<.47:
     q=1-(3*min(1,p/.47)**2-2*min(1,p/.47)**3)
     frame.alpha_composite(render('IN',q))
    elif p<.72:frame.alpha_composite(cover)
    else:
     q=max(0,min(1,(p-.72)/.28))
     if q<.10:
      hold=cover.copy();hold.putalpha(hold.getchannel('A').point(lambda a:int(a*(1-min(1,q/.10)))))
      frame.alpha_composite(hold)
     # Live webcam is NOT simulated as truly live; this visual uses static snapshot.
     frame.alpha_composite(render('OUT',q))
   pipe.stdin.write(np.asarray(frame.convert('RGB')).tobytes())
 finally:
  pipe.stdin.close()
  code=pipe.wait()
  if code:raise RuntimeError(f'ffmpeg failed {code} for {direction}')
 print('Created',path,path.stat().st_size,'bytes')
