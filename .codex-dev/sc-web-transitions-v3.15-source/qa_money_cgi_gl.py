"""Actual Mesa EGL image test of the exact Money CGI GPU shaders and paper mesh.
Not an OBS test. OpenGL driver shim is used because headless Chromium refuses WebGL2.
"""
from pathlib import Path
import ctypes as C, re, math, os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
base=(ROOT/'qa_crystal_gl_visual.py').read_text().split('# compile actual JS shader literals')[0]
exec(compile(base,'egl_bootstrap','exec'),globals())
G.glVertexAttribDivisor.argtypes=[C.c_uint,C.c_uint]
G.glDrawArraysInstanced.argtypes=[C.c_uint,C.c_int,C.c_int,C.c_int]
G.glActiveTexture.argtypes=[C.c_uint]
G.glDisable.argtypes=[C.c_uint]
src=(ROOT/'money-vfx3d.js').read_text()
def shader(which):return re.search(r'const '+which+r'=`(.*?)`;',src,re.S).group(1).encode()
def compile_shader(kind,text):
 sh=G.glCreateShader(kind);ptr=C.c_char_p(text);l=C.c_int(len(text));G.glShaderSource(sh,1,C.byref(ptr),C.byref(l));G.glCompileShader(sh)
 ok=C.c_int();G.glGetShaderiv(sh,0x8B81,C.byref(ok))
 if not ok.value:
  buf=C.create_string_buffer(8192);G.glGetShaderInfoLog(sh,8192,None,buf);raise RuntimeError(buf.value.decode())
 return sh
vs=compile_shader(0x8B31,shader('VERT'));fs=compile_shader(0x8B30,shader('FRAG'))
pr=G.glCreateProgram();G.glAttachShader(pr,vs);G.glAttachShader(pr,fs);G.glLinkProgram(pr)
ok=C.c_int();G.glGetProgramiv(pr,0x8B82,C.byref(ok));assert ok.value,'Money CGI shaders did not link'
# Actual JS grid topology: each quad becomes two triangles; aTexcoord is top-down.
cols,rows=32,14
mesh=[]
def point(x,y):mesh.extend([x/cols-.5,y/rows-.5,x/cols,y/rows])
for y in range(rows):
 for x in range(cols):
  point(x,y);point(x,y+1);point(x+1,y)
  point(x+1,y);point(x,y+1);point(x+1,y+1)
mesh=np.asarray(mesh,dtype=np.float32)
m=C.c_uint();G.glGenBuffers(1,C.byref(m));G.glBindBuffer(0x8892,m);G.glBufferData(0x8892,mesh.nbytes,mesh.ctypes.data_as(C.c_void_p),0x88E4)
i=C.c_uint();G.glGenBuffers(1,C.byref(i))
def tex_upload(file):
 im=np.asarray(Image.open(file).convert('RGBA'))
 # OpenGL images draw with v=0 at bottom; original rows top-down.
 # Keeping source rows unchanged matches WebGL texImage2D + UNPACK_FLIP=false.
 v=C.c_uint();G.glGenTextures(1,C.byref(v));G.glBindTexture(0x0DE1,v)
 for p,z in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x2901),(0x2803,0x2901)]:G.glTexParameteri(0x0DE1,p,z)
 G.glPixelStorei(0x0CF5,1);G.glTexImage2D(0x0DE1,0,0x1908,im.shape[1],im.shape[0],0,0x1908,0x1401,im.ctypes.data_as(C.c_void_p))
 return v
front=tex_upload(ROOT/'bill.png');normal=tex_upload(ROOT/'vfx_assets/golden_sheep_paper_normal.png');roughness=tex_upload(ROOT/'vfx_assets/golden_sheep_paper_roughness.png')
G.glViewport(0,0,W,H);G.glEnable(0x0BE2);G.glBlendFuncSeparate(0x0302,0x0303,1,0x0303)
# Payload: x y width alpha; age roll z phase; wave yaw pitch hero
rng=np.random.default_rng(55321)
def render(name,t,hero=False):
 instances=[]
 if hero:
  instances=[[315,163,460,1,t,0.12,-520,3.13,.63,.13,-.06,1]]
 else:
  for j in range(15):
   angle=j*.4+t*1.15;cx=65+j%5*120+35*np.sin(angle);cy=40+j//5*100+25*np.cos(angle)
   instances.append([cx,cy,132+j%3*25,1,t,.07*np.sin(angle),35+45*np.cos(angle),.3+j*.27,.9,.28*np.sin(angle),.10*np.cos(angle),0])
 records=np.asarray(instances,dtype=np.float32)
 G.glClearColor(0,0,0,0);G.glClear(0x4000);G.glUseProgram(pr)
 G.glBindBuffer(0x8892,m)
 for a,off in [(0,0),(1,2)]:G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,2,0x1406,0,16,C.c_void_p(off*4));G.glVertexAttribDivisor(a,0)
 G.glBindBuffer(0x8892,i);G.glBufferData(0x8892,records.nbytes,records.ctypes.data_as(C.c_void_p),0x88E8)
 for a,off in [(2,0),(3,4),(4,8)]:G.glEnableVertexAttribArray(a);G.glVertexAttribPointer(a,4,0x1406,0,48,C.c_void_p(off*4));G.glVertexAttribDivisor(a,1)
 G.glActiveTexture(0x84C0);G.glBindTexture(0x0DE1,front)
 G.glActiveTexture(0x84C1);G.glBindTexture(0x0DE1,normal)
 G.glActiveTexture(0x84C2);G.glBindTexture(0x0DE1,roughness)
 G.glUniform1i(G.glGetUniformLocation(pr,b'uBanknote'),0);G.glUniform1i(G.glGetUniformLocation(pr,b'uPaperNormal'),1);G.glUniform1i(G.glGetUniformLocation(pr,b'uPaperRoughness'),2);G.glUniform1f(G.glGetUniformLocation(pr,b'uQuality'),1.)
 G.glUniform2f(G.glGetUniformLocation(pr,b'uResolution'),W,H);G.glUniform1f(G.glGetUniformLocation(pr,b'uClock'),t)
 G.glDisable(0x0B44);G.glDrawArraysInstanced(0x0004,0,len(mesh)//4,len(records))
 pixels=np.zeros((H,W,4),dtype=np.uint8)
 G.glReadPixels(0,0,W,H,0x1908,0x1401,pixels.ctypes.data_as(C.c_void_p))
 image=Image.fromarray(np.flipud(pixels),'RGBA');path=OUT/f'{name}.png';image.save(path)
 return image
OUT=Path('/mnt/data/SC_Money_CGI_3D_Review');OUT.mkdir(exist_ok=True)
samples=[('Bills_3D_Flow_A',.28,False),('Bills_3D_Flow_B',1.28,False),('Bills_3D_Flow_C',2.15,False),('Hero_Lens_A',.5,True),('Hero_Lens_B',1.15,True),('Hero_Lens_C',2.3,True)]
sheet=Image.new('RGB',(W*3,(H+33)*2),(12,16,26));d=ImageDraw.Draw(sheet)
for k,(name,t,hero) in enumerate(samples):
 im=render(name,t,hero);bg=Image.new('RGBA',(W,H),(19,23,38,255));bg.alpha_composite(im)
 x=k%3*W;y=k//3*(H+33);sheet.paste(bg.convert('RGB'),(x,y));d.text((x+15,y+H+9),name,fill=(240,240,245))
 assert np.asarray(im)[...,3].max()>10,name+' shader did not produce visible output'
sheet.save(OUT/'SC_Money_CGI_3D_Shaders_Review.jpg',quality=92)
print('PASS: compiled real Money CGI shaders and rendered 3D flexible bills with Mesa EGL')
