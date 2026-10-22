"""Synthetic 3D CGI bill movement review; GLSL and tessellated mesh are from the shipping module.
Camera silhouette, OBS, and 2D safety cover are NOT represented in these films.
"""
from pathlib import Path
import runpy,ctypes as C,math,subprocess
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).parent
v=runpy.run_path(str(ROOT/'qa_money_cgi_gl.py'))
G=v['G'];pr=v['pr'];W=v['W'];H=v['H'];M=v['m'];I=v['i'];FRONT=v['front'];NORMAL=v['normal'];ROUGHNESS=v['roughness'];VERTS=len(v['mesh'])//4
OUT=Path('/mnt/data/SC_Money_CGI_3D_Review')
rng=np.random.default_rng(1029)
N=33
seeds=[]
for j in range(N):
 ang=j*2.4;rad=math.sqrt((j+.5)/N)
 x=W*.50+math.cos(ang)*rad*W*.20;y=H*.54+math.sin(ang)*rad*H*.37
 vx=(x-W*.5)*2.2+rng.normal(0,65);vy=(y-H*.5)*1.6+rng.normal(-85,28)
 seeds.append((x,y,vx,vy,rng.uniform(.1,6.2),rng.uniform(0,.16),rng.uniform(115,170)))

def ease(q):
 q=min(1,max(0,q));return q*q*(3-2*q)

def draw(direction,t):
 records=[]
 for x,y,vx,vy,phase,delay,width in seeds:
  if direction=='out':
   q=ease((t-.10-delay)/.57)
   px=x+vx*q*1.6;py=y+(vy*1.6)*q+145*q*q
   alpha=(1-ease((t-.75)/.2))
   if q<.015: alpha=1
   age=t*2.1;scale=1+.17*q
  else:
   q=ease((t-.05-delay*.45)/.46)
   startx=x+(x-W*.5)*.4+math.sin(phase)*85;starty=-H*.5-phase*H*.11
   px=startx+(x-startx)*q;py=starty+(y-starty)*q
   release=ease((t-.75-delay*.13)/.24)
   px+=vx*release;py+=vy*release
   alpha=ease((t-.005-delay*.2)/.1)*(1-ease((t-.89)/.1));age=(1-q)*.8+release*2;scale=1+.08*release
  if alpha<.004:continue
  yaw=math.sin(phase+age*3.8)*(.14+.38*(1-q if direction=='in' else q))
  pitch=math.sin(phase*.6+age*4.2)*.26
  records.append([px,py,width*scale,alpha,age,.15*math.sin(age*2.4+phase),-42*q,phase,.96,yaw,pitch,0])
 if direction=='out':
  q=ease((t-.43)/.37)
  if .43<t<.99:
   z=60-435*q
   slide=ease((t-.80)/.19)
   records.append([W*.51,H*.43+H*2*slide,268,1-ease((t-.965)/.03),t*2.2,.04,-250*q,1.35,.69,math.sin(q*6)*.24*(1-q),math.sin(q*5)*.18,1])
 data=np.asarray(records,dtype=np.float32).reshape(-1,12)
 G.glClearColor(0,0,0,0);G.glClear(0x4000);G.glUseProgram(pr)
 G.glBindBuffer(0x8892,M)
 for a,off in [(0,0),(1,2)]:G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,2,0x1406,0,16,C.c_void_p(off*4));G.glVertexAttribDivisor(a,0)
 G.glBindBuffer(0x8892,I);G.glBufferData(0x8892,data.nbytes,data.ctypes.data_as(C.c_void_p),0x88E8)
 for a,off in [(2,0),(3,4),(4,8)]:G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,4,0x1406,0,48,C.c_void_p(off*4));G.glVertexAttribDivisor(a,1)
 G.glActiveTexture(0x84C0);G.glBindTexture(0x0DE1,FRONT);G.glActiveTexture(0x84C1);G.glBindTexture(0x0DE1,NORMAL)
 G.glActiveTexture(0x84C2);G.glBindTexture(0x0DE1,ROUGHNESS)
 G.glUniform1i(G.glGetUniformLocation(pr,b'uPaperRoughness'),2)
 G.glUniform1f(G.glGetUniformLocation(pr,b'uQuality'),1.)
 G.glUniform1i(G.glGetUniformLocation(pr,b'uBanknote'),0);G.glUniform1i(G.glGetUniformLocation(pr,b'uPaperNormal'),1)
 G.glUniform2f(G.glGetUniformLocation(pr,b'uResolution'),W,H);G.glUniform1f(G.glGetUniformLocation(pr,b'uClock'),t*3.0)
 G.glDrawArraysInstanced(0x0004,0,VERTS,len(data))
 pix=np.zeros((H,W,4),dtype=np.uint8);G.glReadPixels(0,0,W,H,0x1908,0x1401,pix.ctypes.data_as(C.c_void_p))
 return Image.fromarray(np.flipud(pix),'RGBA')

for direction in ['out','in']:
 frames=OUT/('frames_'+direction);frames.mkdir(exist_ok=True)
 for k in range(48):
  im=draw(direction,k/47)
  base=Image.new('RGBA',(W,H),(18,21,31,255));base.alpha_composite(im)
  base.save(frames/(f'{k:03}.png'))
 movie=OUT/('SC_Money_CGI_'+direction.upper()+'_Mesa_Synthetic.mp4')
 cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate','24','-i',str(frames/'%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','19',str(movie)]
 subprocess.run(cmd,check=True)
 print('created motion preview',movie,movie.stat().st_size)
