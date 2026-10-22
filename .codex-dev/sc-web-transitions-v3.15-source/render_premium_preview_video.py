"""Mesa offscreen authored-mesh shader videos. NO real OBS or complete composite."""
import sys,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
import qa_premium_gpu as qa
OUT=Path(__file__).parent/'qa_premium_gpu_frames'
for name in ['out','in']:
 fps=24;duration=3.4;n=round(fps*duration)
 command=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s','640x360','-r',str(fps),'-i','-','-an','-c:v','libx264','-crf','19','-preset','veryfast','-pix_fmt','yuv420p',str(OUT/f'SC_Premium_3D_Assets_{name.upper()}_Mesa.mp4')]
 ff=subprocess.Popen(command,stdin=subprocess.PIPE)
 try:
  for i in range(n):
   q=i/(n-1)
   if name=='out':
    if q<.34:im=qa.frame('cover',q/.34)
    else:im=qa.frame('out',(q-.34)/.66)
   else:im=qa.frame('in',q)
   bg=Image.new('RGBA',(640,360),(19,22,35,255));bg.alpha_composite(im)
   ff.stdin.write(bg.convert('RGB').tobytes())
 finally:
  ff.stdin.close()
  assert ff.wait()==0,'ffmpeg failed'
 print('VIDEO:',OUT/f'SC_Premium_3D_Assets_{name.upper()}_Mesa.mp4')
