import base64, json, io, hashlib
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
B='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
O=ROOT/'qa_v28';O.mkdir(exist_ok=True)
H=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','').replace("image('./bill.png')","image('"+B+"')")
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for effect in ['smoke','toxic','money','ice']:
  for direction in (['out','in'] if effect in ['smoke','toxic'] else ['out']):
   size={'width':960,'height':540}
   page=browser.new_page(viewport=size)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=H.replace("const params=new URLSearchParams(location.search)",f"const params=new URLSearchParams('?preview=1&effect={effect}&direction={direction}&duration=3.0&intensity=85')")
   page.set_content(html,wait_until='domcontentloaded')
   page.wait_for_function('field && job && (job.effect==="money" ? moneyCoverage>.985 : job.effect==="ice" ? shards.length>0 : clouds.length>0)',timeout=25000)
   def snap(name,expr):
    data=page.evaluate('''(code)=>{ctx.clearRect(0,0,W,H);eval(code);return cvs.toDataURL('image/png').split(',')[1]}''',expr)
    raw=base64.b64decode(data)
    (O/name).write_bytes(raw)
    return Image.open(io.BytesIO(raw)).convert('RGBA')
   if effect in ('smoke','toxic'):
    if direction=='out':
     imgs=[snap(f'{effect}_{direction}_cover{int(p*100)}.png',f'drawSmokeCover({p},{p*1.76})') for p in [0.1,.45,.8,1]]
     opacity=page.evaluate('''()=>{ctx.clearRect(0,0,W,H);drawSmokeCover(1,1.76);return gasOpacityCoverage()}''')
     # manually ensure continuous animation at p1, age drifts every frame
     still=snap(f'{effect}_handoff0.png','drawSmokeCover(1,1.76)')
     moving=snap(f'{effect}_handoff1.png','drawSmokeCover(1,2.31)')
     diff=ImageStat.Stat(ImageChops.difference(still,moving)).mean
     tail=snap(f'{effect}_out_end.png','drawClouds(1,"out",false,5.2)')
     print(effect,direction,'coverage',round(opacity,4),'handoff channel diff',diff,'end alpha avg',ImageStat.Stat(tail).mean[3])
     assert opacity>=.985,(effect,opacity)
     assert max(diff[:3])>0.3,(effect,diff)
    else:
     start=snap(f'{effect}_in_start.png','drawClouds(0,"in",false,0)')
     imgs=[snap(f'{effect}_in_{int(p*100)}.png',f'drawClouds({p},"in",false,{p*3})') for p in [.20,.50,.80,1]]
     print(effect,direction,'alpha start',ImageStat.Stat(start).mean[3],'alpha end',ImageStat.Stat(imgs[-1]).mean[3])
     assert ImageStat.Stat(start).mean[3]>ImageStat.Stat(imgs[-1]).mean[3]*10
   elif effect=='money':
    print('money',page.evaluate('window.__scDebug()').get('moneyCoverageReport'))
    imgs=[snap(f'money_cover{int(p*100)}.png',f'drawMoneyCover({p})') for p in [.2,.60,1]]
    imgs+=[snap(f'money_out{int(p*100)}.png',f'drawMoney({p*3},"out",3)') for p in [.15,.40,.72,.88,1]]
   else:
    imgs=[snap(f'ice_cover{int(p*100)}.png',f'drawIceCover({p})') for p in [.2,.8,1]]
   assert not errors,(effect,direction,errors)
   page.close()
 browser.close()
print('ALL VISUAL CHECKS PASSED')
