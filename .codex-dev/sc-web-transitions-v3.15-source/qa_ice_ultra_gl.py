"""Real GLSL ES shader visual and motion check on offscreen Mesa EGL.
This is NOT native Windows/OBS hardware validation. The extracted mesh/photo
come from the actual browser ice setup using a synthetic alpha camera portrait.
"""
import base64,ctypes as C,re,os
from pathlib import Path
from io import BytesIO
import numpy as np
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=Path('/mnt/data/SC_Ice_Shatter_Ultra_Review');OUT.mkdir(exist_ok=True)
html=(ROOT/'overlay.html').read_text()
for name in ['money-vfx3d','ice-vfx3d','premium-vfx-meshes','premium-crystal-accents','crystal-hero3d','gpu-vfx3d','expansion-effects']:
 html=html.replace(f'<script src="/{name}.js"></script>',f'<script>\n{(ROOT/(name+".js")).read_text()}\n</script>')
html=html.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=ice&direction=out&duration=3&quality=Ultra&gpu=0')")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':640,'height':360});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded');page.wait_for_function('job&&shards.length>=18',timeout=30000)
 val=page.evaluate('''() => {
 const m=SCIceUltra.buildMesh(shards,W,H,'Ultra');
 const orig=stage;stage='prepared';ctx.clearRect(0,0,W,H);drawIceCover(1);
 const cover=cvs.toDataURL('image/png');stage=orig;
 return {floats:Array.from(m.data),tris:m.stats.triangles,shards:shards.length,
         photo:iceFrozenLayer.toDataURL('image/png'),cover,iceCoverage};}''')
 assert not errors,errors
 b.close()
mesh=np.asarray(val['floats'],dtype=np.float32)
photo=Image.open(BytesIO(base64.b64decode(val['photo'].split(',')[1]))).convert('RGBA')
cover=Image.open(BytesIO(base64.b64decode(val['cover'].split(',')[1]))).convert('RGBA')
photo.save(OUT/'Ice_Original_Frozen_Keyed.png');cover.save(OUT/'Ice_Cover_Keyed.png')
assert photo.size==(640,360) and val['iceCoverage']>=.985, val['iceCoverage']
print('Browser extracted',val['shards'],'physical shards,',val['tris'],'tris,',len(mesh)//17,'vertices, cover',val['iceCoverage'])
# Mesa EGL graphics setup reused from existing tested shader QA harness
base=(ROOT/'qa_crystal_gl_visual.py').read_text().split('# compile actual JS shader literals')[0]
exec(compile(base,'egl_bootstrap','exec'),globals())
G.glActiveTexture.argtypes=[C.c_uint]
G.glEnable.argtypes=[C.c_uint];G.glDisable.argtypes=[C.c_uint];G.glDepthFunc.argtypes=[C.c_uint]
GLV=0x8B31;GLF=0x8B30
src=(ROOT/'ice-vfx3d.js').read_text()
def source(key):return re.search(r'const '+key+r'=`(.*?)`;',src,re.S).group(1).encode()
def compile_shader(kind,txt):
 sh=G.glCreateShader(kind);ptr=C.c_char_p(txt);ln=C.c_int(len(txt));G.glShaderSource(sh,1,C.byref(ptr),C.byref(ln));G.glCompileShader(sh)
 ok=C.c_int();G.glGetShaderiv(sh,0x8B81,C.byref(ok));
 if not ok.value:
  buf=C.create_string_buffer(8192);G.glGetShaderInfoLog(sh,8192,None,buf);raise RuntimeError(buf.value.decode())
 return sh
v=compile_shader(GLV,source('VERT'));f=compile_shader(GLF,source('FRAG'))
program=G.glCreateProgram();G.glAttachShader(program,v);G.glAttachShader(program,f);G.glLinkProgram(program)
ok=C.c_int();G.glGetProgramiv(program,0x8B82,C.byref(ok));assert ok.value,'Ice GLSL shaders failed to link'
vbo=C.c_uint();G.glGenBuffers(1,C.byref(vbo));G.glBindBuffer(0x8892,vbo);G.glBufferData(0x8892,mesh.nbytes,mesh.ctypes.data_as(C.c_void_p),0x88E4)
for i,n,start in [(0,3,0),(1,2,3),(2,3,5),(3,4,8),(4,4,12),(5,1,16)]:
 G.glEnableVertexAttribArray(i);G.glVertexAttribPointer(i,n,0x1406,0,17*4,C.c_void_p(start*4))
tex=C.c_uint();G.glGenTextures(1,C.byref(tex));G.glBindTexture(0x0DE1,tex)
for p,z in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:G.glTexParameteri(0x0DE1,p,z)
G.glPixelStorei(0x0CF5,1)
a=np.asarray(photo,dtype=np.uint8);G.glTexImage2D(0x0DE1,0,0x1908,640,360,0,0x1908,0x1401,a.ctypes.data_as(C.c_void_p))
G.glViewport(0,0,640,360);G.glEnable(0x0BE2);G.glBlendFuncSeparate(0x0302,0x0303,1,0x0303)
G.glEnable(0x0B71);G.glDepthFunc(0x0203);G.glDisable(0x0B44)
def render(mode,p):
 G.glClearColor(0,0,0,0);G.glClear(0x4000|0x0100);G.glUseProgram(program)
 G.glActiveTexture(0x84C0);G.glBindTexture(0x0DE1,tex)
 G.glUniform1i(G.glGetUniformLocation(program,b'uFrozen'),0)
 G.glUniform2f(G.glGetUniformLocation(program,b'uResolution'),640,360)
 G.glUniform1f(G.glGetUniformLocation(program,b'uProgress'),p)
 G.glUniform1f(G.glGetUniformLocation(program,b'uInbound'),float(mode=='IN'))
 G.glUniform1f(G.glGetUniformLocation(program,b'uClock'),2+p*3)
 G.glUniform1f(G.glGetUniformLocation(program,b'uQuality'),1)
 G.glDrawArrays(0x0004,0,len(mesh)//17)
 buf=np.zeros((360,640,4),dtype=np.uint8);G.glReadPixels(0,0,640,360,0x1908,0x1401,buf.ctypes.data_as(C.c_void_p))
 return Image.fromarray(np.flipud(buf),'RGBA')
frames=[]
for mode in ['OUT','IN']:
 for ix,p in enumerate([0,.08,.2,.38,.58,.76,.92,1.]):
  im=render(mode,p);im.save(OUT/f'{mode}_{ix:02d}.png');frames.append((mode,p,im))
  if p<.80 and (mode=='OUT' or p<=.38):
   count=np.count_nonzero(np.asarray(im)[...,3]>25)
   assert count>100, (mode,p,'No physical prism pixels rendered')
# Contact sheet includes original frozen cover and individual offscreen GL render frames.
from PIL import ImageFont
sheet=Image.new('RGB',(640*4,(360+38)*5),(15,22,36));d=ImageDraw.Draw(sheet)
panels=[('Keyed frost build',cover),('Original textured portrait',photo)]+[(f'{m} • flight {int(p*100)}%',im) for m,p,im in frames]
for i,(name,im) in enumerate(panels):
 x=(i%4)*640;y=(i//4)*(360+38)
 bg=Image.new('RGBA',(640,360),(21,29,44,255));bg.alpha_composite(im);sheet.paste(bg.convert('RGB'),(x,y));d.text((x+16,y+365),name,fill=(230,238,248))
sheet.save('/mnt/data/SC_Ice_Shatter_Ultra_Contact_Sheet.jpg',quality=90)
print('PASS real Mesa EGL WebGL2 GLSL shader pixel rendering',val['tris'],'triangles / source photo / sixteen motion frames')
