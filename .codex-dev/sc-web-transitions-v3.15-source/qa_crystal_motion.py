"""Render the actual GLSL + tessellated mesh on offscreen Mesa EGL.
This is a synthetic preview, not a camera recording or browser/OBS benchmark.
"""
import importlib.util, json, subprocess, time, os, numpy as np
from pathlib import Path
src=Path(__file__).parent
spec=importlib.util.spec_from_file_location('crystal_reference',src/'qa_crystal_gl_visual.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
out=Path(os.environ.get('SC_V37_PREVIEW_OUTPUT',str(src/'qa_visual_outputs')));out.mkdir(exist_ok=True)
FPS=24
results={}
for name,phases in [('OUT',[('cover',1.8),('out',2.5)]),('IN',[('in',3.3)])]:
 dest=out/f'SC_v3.7_Crystal_{name}_Mesa_Synthetic.mp4'
 ff=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{m.W}x{m.H}','-framerate',str(FPS),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','19',str(dest)]
 p=subprocess.Popen(ff,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
 frame_times=[];count=0
 for stage,duration in phases:
  for j in range(round(FPS*duration)):
   q=j/max(1,round(FPS*duration)-1);t=time.perf_counter();im=m.shot(stage,q)
   bg=m.Image.new('RGBA',(m.W,m.H),(19,23,32,255));bg.alpha_composite(im)
   p.stdin.write(bg.convert('RGB').tobytes());frame_times.append((time.perf_counter()-t)*1000);count+=1
 p.stdin.close();err=p.stderr.read();p.wait()
 if p.returncode:raise RuntimeError(err.decode()[:1000])
 results[name]={'frames':count,'duration_seconds':count/FPS,'fps':FPS,'median_mesa_render_and_readback_ms':round(float(np.median(frame_times)),2),'p95_mesa_render_and_readback_ms':round(float(np.percentile(frame_times,95)),2),'video_path':str(dest)}
 print(name,results[name],flush=True)
(out/'SC_v37_Crystal_SyntheticPerformance.json').write_text(json.dumps(results,indent=2))
