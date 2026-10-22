"""Real Mesa EGL preview for SC Premium authored crystal meshes.
Tests shader compile/link and actual instanced draw; not an OBS certification.
"""
from pathlib import Path
import base64,ctypes as C,json,re,math
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
base=(ROOT/'qa_crystal_gl_visual.py').read_text().split('# compile actual JS shader literals')[0]
exec(compile(base,'qa_crystal_gl_visual.py','exec'),globals())
G.glVertexAttribDivisor.argtypes=[C.c_uint,C.c_uint]
G.glDrawArraysInstanced.argtypes=[C.c_uint,C.c_int,C.c_int,C.c_int]
G.glActiveTexture.argtypes=[C.c_uint]
# Extract and compile exactly the authored-asset GLSL used in the application.
src=(ROOT/'premium-crystal-accents.js').read_text()
vs=re.search(r'const VERT=`(.*?)`;',src,re.S).group(1).encode()
fs=re.search(r'const FRAG=`(.*?)`;',src,re.S).group(1).encode()
def make_shader(typ,code):
 sh=G.glCreateShader(typ);cp=C.c_char_p(code);size=C.c_int(len(code));G.glShaderSource(sh,1,C.byref(cp),C.byref(size));G.glCompileShader(sh)
 ok=C.c_int();G.glGetShaderiv(sh,0x8B81,C.byref(ok));
 if not ok.value:
  buf=C.create_string_buffer(8192);G.glGetShaderInfoLog(sh,8192,None,buf);raise RuntimeError('GLSL compile: '+buf.value.decode())
 return sh
v=make_shader(0x8B31,vs);f=make_shader(0x8B30,fs);pr=G.glCreateProgram();G.glAttachShader(pr,v);G.glAttachShader(pr,f);G.glLinkProgram(pr)
ok=C.c_int();G.glGetProgramiv(pr,0x8B82,C.byref(ok))
if not ok.value:
 buf=C.create_string_buffer(8192);G.glGetProgramInfoLog(pr,8192,None,buf);raise RuntimeError('GLSL link: '+buf.value.decode())
source=(ROOT/'premium-vfx-meshes.js').read_text()
pack=json.loads(re.search(r'const PACK=(\{.*?\});',source,re.S).group(1))
objects=[];rng=np.random.default_rng(246801)
for name in ['crystal_00','crystal_02','crystal_04','crystal_06']:
 geo=np.frombuffer(base64.b64decode(pack[name]),dtype=np.float32)
 assert len(geo)%8==0
 k=len(objects)
 instances=[]
 for i in range(7):
  x=245+(i%3)*72+rng.uniform(-20,20)
  y=90+(i//3)*90+rng.uniform(-14,14)
  size=42+rng.uniform(0,42)
  seed=rng.uniform(0,1)
  dx=(x-320)*3+rng.uniform(-150,150)
  dy=(y-165)*2+rng.uniform(-120,120)
  dz=rng.uniform(-60,200)
  delay=rng.uniform(0,.9)
  instances.extend([x,y,size,seed,dx,dy,dz,delay])
 data=np.asarray(instances,dtype=np.float32)
 obj=[]
 for arr in (geo,data):
  buf=C.c_uint();G.glGenBuffers(1,C.byref(buf));G.glBindBuffer(0x8892,buf);G.glBufferData(0x8892,arr.nbytes,arr.ctypes.data_as(C.c_void_p),0x88E4);obj.append(buf)
 objects.append((obj[0],obj[1],len(geo)//8,len(data)//8))
G.glViewport(0,0,W,H);G.glEnable(0x0BE2);G.glBlendFuncSeparate(0x0302,0x0303,1,0x0303)
OUT=ROOT/'qa_premium_gpu_frames';OUT.mkdir(exist_ok=True)
G.glUseProgram(pr)
def uniform(name,vals):
 loc=G.glGetUniformLocation(pr,name.encode());
 if loc<0:raise RuntimeError('Missing shader uniform: '+name)
 if len(vals)==1:G.glUniform1f(loc,float(vals[0]))
 if len(vals)==2:G.glUniform2f(loc,*map(float,vals))
 if len(vals)==3:G.glUniform3f(loc,*map(float,vals))
def frame(stage,p):
 G.glClearColor(0,0,0,0);G.glClear(0x4000|0x100);G.glUseProgram(pr)
 uniform('uResolution',[W,H]);uniform('uClock',[p*3+2]);uniform('uProgress',[p]);uniform('uStage',[{'cover':0,'out':1,'in':2}[stage]]);uniform('uAccent',[.66,.41,.92]);
 for mesh,inst,nverts,ninst in objects:
  G.glBindBuffer(0x8892,mesh)
  for at,n,off in [(0,3,0),(1,3,3),(2,2,6)]:
   G.glEnableVertexAttribArray(at);G.glVertexAttribPointer(at,n,0x1406,0,32,C.c_void_p(off*4));G.glVertexAttribDivisor(at,0)
  G.glBindBuffer(0x8892,inst)
  for at,off in [(3,0),(4,4)]:
   G.glEnableVertexAttribArray(at);G.glVertexAttribPointer(at,4,0x1406,0,32,C.c_void_p(off*4));G.glVertexAttribDivisor(at,1)
  G.glDrawArraysInstanced(4,0,nverts,ninst)
 pixels=np.zeros((H,W,4),dtype=np.uint8)
 G.glReadPixels(0,0,W,H,0x1908,0x1401,pixels.ctypes.data_as(C.c_void_p))
 image=Image.fromarray(np.flipud(pixels),'RGBA')
 return image
samples=[('cover',.16),('cover',.40),('cover',.70),('cover',1),('out',.24),('out',.50),('out',.75),('out',1),('in',.08),('in',.32),('in',.64),('in',.84),('in',1)]
cols=4;rows=math.ceil(len(samples)/cols)
sheet=Image.new('RGB',(W*cols,rows*(H+32)),(14,17,28));painter=ImageDraw.Draw(sheet)
for index,(stage,p) in enumerate(samples):
 im=frame(stage,p)
 im.save(OUT/f'{stage}_{round(p*100):03}.png')
 bg=Image.new('RGBA',(W,H),(19,22,35,255));bg.alpha_composite(im)
 x=(index%cols)*W;y=(index//cols)*(H+32)
 sheet.paste(bg.convert('RGB'),(x,y))
 painter.text((x+16,y+H+7),f'{stage.upper()} {p:.2f} - authored 3D mesh shader',(230,231,239))
 print(stage,p,'alphaMax',int(np.asarray(im)[...,3].max()),'opaque',(np.asarray(im)[...,3]>247).sum())
for stage in ['out','in']:
 assert np.asarray(frame(stage,1))[...,3].max()==0,stage+' not transparent at end'
sheet.save(OUT/'SC_Premium_GPU_Instanced_Review.jpg',quality=91)
print('PASS: authored 3D instanced meshes rendered through actual Mesa OpenGL, final alpha zero')
