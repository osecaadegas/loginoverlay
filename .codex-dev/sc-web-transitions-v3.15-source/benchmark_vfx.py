from pathlib import Path
from playwright.sync_api import sync_playwright
import json,statistics,ast,time
root=Path('/mnt/data/SC_Web_Transitions_v3_4_1_VFX_Polish')
src=(root/'expansion-effects.js').read_text()
tree=ast.parse((root/'test_vfx_polish.py').read_text())
init=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(getattr(v,'id','')=='init' for v in n.targets))
init=init.replace('W=960,H=540','W=1920,H=1080').replace('mw=256,mh=144','mw=256,mh=144')
results={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1920,'height':1080})
 page.set_content('<!doctype html><html><body style="margin:0"><canvas id="fx" width="1920" height="1080"></canvas></body></html>')
 page.add_script_tag(content=src)
 page.evaluate(init)
 for effect in ['glitch','lightning','shadow','holy','sand','crystal','petal','plasma']:
  result=page.evaluate('''id=>{const x=qa;
     if(window.effect)effect.dispose();
     const started=performance.now();
     window.effect=SCExpansion.create(id,{field:x.field,subject:x.subject,W:x.W,H:x.H,ctx:x.ctx,intensity:75,quality:'Cinematic',seed:1451,tuning:{motion:1,detail:1}});
     const prepared=performance.now()-started;
     const measured=[];
     for(const [mode,q] of [['cover',.5],['cover',1],['out',.15],['out',.35],['out',.65],['out',.90],['in',.16],['in',.48],['in',.61],['in',.89]]){
       x.ctx.clearRect(0,0,x.W,x.H);
       const s=performance.now();if(mode==='cover')effect.renderCover(q,q*2);else effect.renderPlay(q*3,mode,3,q*3);
       measured.push(Math.round((performance.now()-s)*100)/100);
     }
     const cover=effect.coverage;
     return {prepare_ms:Math.round(prepared*100)/100,frame_ms:measured,coverage:cover};
  }''',effect)
  s=sorted(result['frame_ms']);result['median_ms']=statistics.median(s);result['p95_ms']=s[-1] # small sample worst-case
  results[effect]=result
  print(effect,'coverage',round(result['coverage']*100,2),'prep ms',result['prepare_ms'],'median ms',result['median_ms'],'sample max ms',result['p95_ms'],flush=True)
 b.close()
(root/'performance_v341.json').write_text(json.dumps({'environment':'1920x1080 Chromium headless software test, ten deterministic rendered frames per effect; not real OBS, not a representative gaming load','results':results},indent=2))
