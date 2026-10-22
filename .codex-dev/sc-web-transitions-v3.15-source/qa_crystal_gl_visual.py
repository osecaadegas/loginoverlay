"""Mesa EGL OpenGL reference preview of the actual v3.7 CrystalHero shaders/mesh.
No Chromium/OBS integration is claimed. It uses source shader strings and geometry.
"""
import ctypes as C, json, re, subprocess, os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).parent
# Mesa surfaceless EGL offscreen context.
E=C.CDLL('libEGL.so.1');G=C.CDLL('libGL.so.1')
E.eglGetProcAddress.restype=C.c_void_p;E.eglGetProcAddress.argtypes=[C.c_char_p]
p=E.eglGetProcAddress(b'eglGetPlatformDisplayEXT');assert p
getDisplay=C.CFUNCTYPE(C.c_void_p,C.c_uint,C.c_void_p,C.c_void_p)(p)
d=getDisplay(0x31DD,None,None)
E.eglInitialize.restype=C.c_uint;E.eglInitialize.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)]
ma=C.c_int();mi=C.c_int();assert E.eglInitialize(d,C.byref(ma),C.byref(mi))
E.eglBindAPI.restype=C.c_uint;E.eglBindAPI.argtypes=[C.c_uint];assert E.eglBindAPI(0x30A2)
E.eglChooseConfig.restype=C.c_uint;E.eglChooseConfig.argtypes=[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)]
attrs=(C.c_int*13)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3040,0x08,0x3033,1,0x3038)
cfg=C.c_void_p();n=C.c_int();assert E.eglChooseConfig(d,attrs,C.byref(cfg),1,C.byref(n)) and n.value
E.eglCreatePbufferSurface.restype=C.c_void_p;E.eglCreatePbufferSurface.argtypes=[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)]
W,H=640,360
sattrs=(C.c_int*5)(0x3057,W,0x3056,H,0x3038)
surface=E.eglCreatePbufferSurface(d,cfg,sattrs);assert surface
E.eglCreateContext.restype=C.c_void_p;E.eglCreateContext.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)]
ctx=E.eglCreateContext(d,cfg,None,(C.c_int*3)(0x3098,3,0x3038));assert ctx
E.eglMakeCurrent.restype=C.c_uint;E.eglMakeCurrent.argtypes=[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p];assert E.eglMakeCurrent(d,surface,surface,ctx)
# signatures
G.glGetString.restype=C.c_char_p;G.glGetString.argtypes=[C.c_uint]
print('EGL GL',G.glGetString(0x1f02).decode())
G.glCreateShader.restype=C.c_uint;G.glCreateShader.argtypes=[C.c_uint]
G.glShaderSource.argtypes=[C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int)]
G.glCompileShader.argtypes=[C.c_uint];G.glGetShaderiv.argtypes=[C.c_uint,C.c_uint,C.POINTER(C.c_int)]
G.glGetShaderInfoLog.argtypes=[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_void_p]
G.glCreateProgram.restype=C.c_uint;G.glAttachShader.argtypes=[C.c_uint,C.c_uint];G.glLinkProgram.argtypes=[C.c_uint]
G.glGetProgramiv.argtypes=[C.c_uint,C.c_uint,C.POINTER(C.c_int)];G.glUseProgram.argtypes=[C.c_uint]
G.glGetProgramInfoLog.argtypes=[C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_void_p]
G.glGetUniformLocation.restype=C.c_int;G.glGetUniformLocation.argtypes=[C.c_uint,C.c_char_p]
G.glUniform1f.argtypes=[C.c_int,C.c_float];G.glUniform1i.argtypes=[C.c_int,C.c_int]
G.glUniform2f.argtypes=[C.c_int,C.c_float,C.c_float];G.glUniform3f.argtypes=[C.c_int,C.c_float,C.c_float,C.c_float]
G.glGenTextures.argtypes=[C.c_int,C.POINTER(C.c_uint)];G.glBindTexture.argtypes=[C.c_uint,C.c_uint]
G.glTexParameteri.argtypes=[C.c_uint,C.c_uint,C.c_int]
G.glTexImage2D.argtypes=[C.c_uint,C.c_int,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]
G.glGenBuffers.argtypes=[C.c_int,C.POINTER(C.c_uint)];G.glBindBuffer.argtypes=[C.c_uint,C.c_uint]
G.glBufferData.argtypes=[C.c_uint,C.c_size_t,C.c_void_p,C.c_uint]
G.glEnableVertexAttribArray.argtypes=[C.c_uint]
G.glVertexAttribPointer.argtypes=[C.c_uint,C.c_int,C.c_uint,C.c_uint,C.c_int,C.c_void_p]
G.glViewport.argtypes=[C.c_int,C.c_int,C.c_int,C.c_int]
G.glClearColor.argtypes=[C.c_float,C.c_float,C.c_float,C.c_float];G.glClear.argtypes=[C.c_uint]
G.glBlendFuncSeparate.argtypes=[C.c_uint,C.c_uint,C.c_uint,C.c_uint]
G.glDrawArrays.argtypes=[C.c_uint,C.c_int,C.c_int]
G.glReadPixels.argtypes=[C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p]
G.glPixelStorei.argtypes=[C.c_uint,C.c_int]
# compile actual JS shader literals
src=(ROOT/'crystal-hero3d.js').read_text()
def source(name):return re.search(r'const '+name+r'=`(.*?)`;',src,re.S).group(1).encode()
def prog(vname,fname):
 shaders=[]
 for name,typ in [(vname,0x8B31),(fname,0x8B30)]:
  code=source(name);o=G.glCreateShader(typ);cp=C.c_char_p(code);sz=C.c_int(len(code));G.glShaderSource(o,1,C.byref(cp),C.byref(sz));G.glCompileShader(o)
  ok=C.c_int();G.glGetShaderiv(o,0x8B81,C.byref(ok));assert ok.value, name
  shaders.append(o)
 pr=G.glCreateProgram()
 for o in shaders:G.glAttachShader(pr,o)
 G.glLinkProgram(pr);ok=C.c_int();G.glGetProgramiv(pr,0x8B82,C.byref(ok));assert ok.value,(vname,fname)
 return pr
PR=prog('VS','FS');SEAL=prog('SEALVS','SEALFS')
# Exact generated tessellation
geom=np.fromfile(ROOT/'qa_crystal_vertices.f32',dtype=np.float32);assert len(geom)%17==0
vbo=C.c_uint();G.glGenBuffers(1,C.byref(vbo));G.glBindBuffer(0x8892,vbo);G.glBufferData(0x8892,geom.nbytes,geom.ctypes.data_as(C.c_void_p),0x88E4)
quad=np.array([0,0,1,0,0,1,1,0,1,1,0,1],dtype=np.float32)
qbo=C.c_uint();G.glGenBuffers(1,C.byref(qbo));G.glBindBuffer(0x8892,qbo);G.glBufferData(0x8892,quad.nbytes,quad.ctypes.data_as(C.c_void_p),0x88E4)
# Synthetic alpha-matted webcam snapshot. The hue/color is *inside* the mask.
img=Image.new('RGBA',(W,H),(0,0,0,0));dr=ImageDraw.Draw(img)
dr.ellipse((280,40,380,154),fill=(208,165,142,255));dr.ellipse((225,165,435,450),fill=(45,90,141,255));dr.ellipse((211,194,274,349),fill=(202,159,142,255));dr.ellipse((387,194,448,349),fill=(202,159,142,255))
dr.ellipse((284,50,375,109),fill=(49,35,46,255));dr.rectangle((300,101,344,116),fill=(57,38,47,255));dr.ellipse((305,105,355,147),fill=(86,49,52,255))
# Fontless detail to show preservation of photographed tones
base=np.array(img,dtype=np.uint8);tex=C.c_uint();G.glGenTextures(1,C.byref(tex));G.glBindTexture(0x0DE1,tex)
for par,val in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:G.glTexParameteri(0x0DE1,par,val)
G.glPixelStorei(0x0CF5,1);G.glTexImage2D(0x0DE1,0,0x1908,W,H,0,0x1908,0x1401,base.ctypes.data_as(C.c_void_p))
G.glViewport(0,0,W,H);G.glEnable(0x0BE2);G.glBlendFuncSeparate(0x0302,0x0303,1,0x0303)
COLOR=[.70,.39,.91];root=Path(os.environ.get('SC_V37_PREVIEW_OUTPUT',str(ROOT/'qa_visual_outputs')));root.mkdir(exist_ok=True)
def uniform(pr,name,value):
 loc=G.glGetUniformLocation(pr,name.encode());
 if loc<0:return
 if len(value)==1:G.glUniform1f(loc,value[0])
 if len(value)==2:G.glUniform2f(loc,*value)
 if len(value)==3:G.glUniform3f(loc,*value)
def common(pr):
 uniform(pr,'uAccent',COLOR)
 G.glActiveTexture.argtypes=[C.c_uint];G.glActiveTexture(0x84C0);G.glBindTexture(0x0DE1,tex)
 loc=G.glGetUniformLocation(pr,b'uMask');G.glUniform1i(loc,0)
def drawseal(progress=1,fade=1,crack=0,clock=0):
 if fade<=.001:return
 G.glUseProgram(SEAL);G.glBindBuffer(0x8892,qbo);G.glEnableVertexAttribArray(0);G.glVertexAttribPointer(0,2,0x1406,0,8,None)
 common(SEAL)
 for name,val in [('uProgress',progress),('uClock',clock),('uCrack',crack),('uFade',fade)]:uniform(SEAL,name,[val])
 G.glDrawArrays(4,0,6)
def drawshards(phase,progress,clock,crack):
 G.glUseProgram(PR);G.glBindBuffer(0x8892,vbo)
 for loc,size,off in [(0,3,0),(1,3,3),(2,2,6),(3,2,8),(4,3,10),(5,4,13)]:
  G.glEnableVertexAttribArray(loc);G.glVertexAttribPointer(loc,size,0x1406,0,17*4,C.c_void_p(off*4))
 common(PR)
 for name,val in [('uPhase',phase),('uProgress',progress),('uClock',clock),('uCrack',crack)]:uniform(PR,name,[val])
 uniform(PR,'uResolution',[W,H]);G.glDrawArrays(4,0,len(geom)//17)
def shot(stage,p):
 G.glClearColor(0,0,0,0);G.glClear(0x4000|0x100)
 if stage=='cover':
  drawseal(p,.8,0,p*2)
  if p>.07:drawshards(3,p,p*2,0)
 elif stage=='out':
  if p<.25:drawseal(1,1-clamp((p-.11)/.14),clamp(p/.19),2+p*2)
  q=clamp((p-.23)/.77);drawshards(0 if p<.23 else 1,q,2+p*2,clamp(p/.2))
 elif stage=='in':
  b=.64
  if p<b:
   q=clamp(p/b);drawshards(2,q,p*3,0)
   if q>.92:drawseal(1,clamp((q-.92)/.08),0,p*3)
  elif p<b+.09:drawseal(1,1,clamp((p-b)/.09),p*3);drawshards(0,0,p*3,1)
  else:
   q=clamp((p-b-.09)/(1-b-.09));
   if q<.16:drawseal(1,1-clamp(q/.16),1,p*3)
   drawshards(1,q,p*3,1)
 out=np.zeros((H,W,4),dtype=np.uint8);G.glReadPixels(0,0,W,H,0x1908,0x1401,out.ctypes.data_as(C.c_void_p));out=np.flipud(out)
 return Image.fromarray(out,'RGBA')
def clamp(v):return max(0,min(1,v))
frames=[]
for stage,steps in [('cover',[0,.16,.34,.54,.72,1]),('out',[0,.16,.27,.44,.65,.84,1]),('in',[0,.20,.40,.58,.64,.70,.78,.87,1])]:
 for p in steps:
  im=shot(stage,p);filename=root/f'{stage}_{round(p*100):03}.png';im.save(filename)
  alpha=np.asarray(im)[...,3];print(stage,p,'opaque',np.sum(alpha>250),'alpha',int(alpha.max()),'file',filename.name)
  frames.append((stage,p,im))
# Report exact last frame alpha and montage
for stage in ['out','in']:
 ar=np.asarray(shot(stage,1));assert ar[...,3].max()==0,f'{stage} ends with visible pixels'
from PIL import ImageFont
thumbw=320;thumbh=180
sheet=Image.new('RGB',(thumbw*6,(thumbh+26)*4),(18,20,29));d=ImageDraw.Draw(sheet)
for i,(stage,p,im) in enumerate(frames):
 row=i//6;col=i%6
 bg=Image.new('RGBA',im.size,(19,23,31,255));bg.alpha_composite(im)
 sheet.paste(bg.convert('RGB').resize((thumbw,thumbh)),(col*thumbw,row*(thumbh+26)))
 d.text((col*thumbw+8,row*(thumbh+26)+thumbh+4),f'{stage.upper()} {p:.2f}',fill=(225,226,235))
sheet.save(root/'SC_v37_Crystal_ContactSheet.jpg',quality=90)
print('PASS Mesa shader preview rendered',len(frames),'frames; final OUT/IN alpha zero')
