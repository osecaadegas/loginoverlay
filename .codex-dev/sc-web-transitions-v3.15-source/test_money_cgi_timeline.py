"""Browser runs actual Money Cover/IN/OUT JS orchestration with stubbed GPU class.
WebGL pixel shader is validated separately by qa_money_cgi_gl.py on real Mesa EGL.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
ROOT=Path(__file__).parent
HTML=(ROOT/'overlay.html').read_text()
for m in ['money-vfx3d','premium-vfx-meshes','premium-crystal-accents','crystal-hero3d','gpu-vfx3d','expansion-effects']:
 HTML=HTML.replace('<script src="/'+m+'.js"></script>','<script>\n'+(ROOT/(m+'.js')).read_text()+'\n</script>')
HTML=HTML.replace("image('./bill.png')", "image('data:image/png;base64,"+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()+"')")
HTML=HTML.replace("image('/vfx-assets/golden_sheep_paper_normal.png')", "image('data:image/png;base64,"+base64.b64encode((ROOT/'vfx_assets/golden_sheep_paper_normal.png').read_bytes()).decode()+"')")
HTML=HTML.replace("image('/vfx-assets/golden_sheep_paper_roughness.png')", "image('data:image/png;base64,"+base64.b64encode((ROOT/'vfx_assets/golden_sheep_paper_roughness.png').read_bytes()).decode()+"')")
HTML=HTML.replace("const params=new URLSearchParams(location.search)", "const params=new URLSearchParams('?preview=1&effect=money&direction=out&duration=3&intensity=75')")
HTML=HTML.replace("<script>\n'use strict';", """<script>window.SCMoneyCGI.Renderer=class {
 constructor(){this.canvas=document.createElement('canvas');document.body.appendChild(this.canvas);this.canvas.style.display='none';this.calls=[];this.isReady=false}
 prepare(){this.isReady=true;return true}
 clear(){} draw(notes,t){this.calls.push({n:notes.length,t,hero:notes.some(n=>n.hero)});this.canvas.style.display='block';return true}
 hide(){this.canvas.style.display='none'} dispose(){this.hide();this.isReady=false}
 diagnostics(){return {mode:'mock 3D JS timeline',calls:this.calls.length}}
};</script><script>\n'use strict';""")
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 pg=b.new_page(viewport={'width':960,'height':540})
 errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
 pg.set_content(HTML,wait_until='domcontentloaded')
 pg.wait_for_function('moneyCGI&&moneyCGI.isReady',timeout=12000)
 result=pg.evaluate('''() => {
 const result={mode:__scDebug().renderMode,coverage:moneyCoverage,n:billParts.length};
 for(const p of [.06,.36,.60,.88,1]){ctx.clearRect(0,0,W,H);drawMoneyCoverCGI(p)}
 result.cover=moneyCGI.calls.slice(-5);
 for(const dir of ['out','in'])for(const p of [.04,.30,.55,.62,.75,.85,.98,1]){ctx.clearRect(0,0,W,H);drawMoneyCGI(p*job.duration,dir,job.duration)}
 result.play=moneyCGI.calls.slice(-16);return result;
}''')
 print('Timeline',result)
 assert result['coverage']>=.985
 assert result['cover'][-1]['n']==0 # final settled cover is pixel-exact 2D
 assert any(r['n']>0 for r in result['cover'])
 assert any(r['hero'] for r in result['play'])
 assert result['play'][-1]['n']==0 and result['play'][7]['n']==0
 assert not errors,errors
 b.close()
print('PASS: GPU Money timeline, safety cover, hero and transparent completion')
