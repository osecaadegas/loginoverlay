"""Actual Chromium smoke/toxic renderer: coverage, continuity and alpha cleanup.
Uses the same renderer functions but synthetic camera, never asserts real OBS behavior.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import io,base64,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
OUT=Path('/mnt/data/sc326_cloud_previews');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-sandbox'])
 rows=[];results=[]
 for effect in ('smoke','toxic'):
  page=b.new_page(viewport={'width':640,'height':360})
  errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(HTML.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&duration=3&intensity=78')"),wait_until='domcontentloaded')
  page.wait_for_function('clouds.length>30 && gasSeal!==null',timeout=30000)
  frames=[]
  for label,mode,pvalue,age in [ ('start','cover',0,0),('rise25','cover',.25,.5),('rise55','cover',.55,1.),('rise85','cover',.85,1.5),('seal','cover',1,1.8),('hold','cover',1,2.5),('release0','release',0,2.5),('release25','release',.25,3.25),('release50','release',.50,4.0),('release75','release',.75,4.75),('clear','release',1,5.5)]:
   z=page.evaluate('''({mode,p,age})=>{
     ctx.clearRect(0,0,W,H);
     drawClouds(p,'out',mode==='cover',age);
     const d=ctx.getImageData(0,0,W,H).data;
     let nontransparent=0,edge=0;
     for(let i=3;i<d.length;i+=4){if(d[i]>5)nontransparent++}
     return {image:cvs.toDataURL('image/png').split(',')[1],coverage:gasOpacityCoverage(), nontransparent};
   }''',{'mode':mode,'p':pvalue,'age':age})
   im=Image.open(io.BytesIO(base64.b64decode(z['image']))).convert('RGBA')
   bg=Image.new('RGBA',im.size,(22,26,34,255))
   bg.alpha_composite(im)
   draw=ImageDraw.Draw(bg);draw.text((8,8),f'{effect.upper()} {label} cover={z["coverage"]:.4f}',fill='white',stroke_width=1,stroke_fill='black')
   bg.convert('RGB').save(OUT/f'{effect}_{label}.png')
   frames.append(bg.convert('RGB'))
   if label=='seal':
    assert z['coverage']>=.985,(effect,'insufficient coverage',z['coverage'])
   if label=='clear':
    assert z['nontransparent']==0,(effect,'persistent FX',z['nontransparent'])
  assert not errors, errors
  row=Image.new('RGB',(640*4,360*3),(22,26,34))
  for idx,im in enumerate(frames):row.paste(im,(idx%4*640,idx//4*360))
  row.save(OUT/f'{effect}_contact.jpg',quality=87)
  results.append({'effect':effect,'covered_ratio':round(page.evaluate('''()=>{ctx.clearRect(0,0,W,H);drawClouds(1,'out',true,1.8);return gasOpacityCoverage()}'''),5),'finish_alpha_empty':True,'browser_errors':errors})
  page.close()
 b.close()
print(json.dumps(results,indent=2))
