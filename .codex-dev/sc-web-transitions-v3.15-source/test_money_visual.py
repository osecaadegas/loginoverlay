"""Renderer visual regression: real Canvas 2D, synthetic figure, measured bill-alpha coverage."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
 for width,height in [(960,540),(1280,720)]:
  page=b.new_page(viewport={'width':width,'height':height})
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  data=HTML.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=money&duration=4.5&intensity=85')")
  # External images loaded from data URLs inside HTML to support page.set_content.
  import base64
  bill='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
  data=data.replace("image('./bill.png')",f"image('{bill}')")
  page.set_content(data,wait_until='domcontentloaded')
  try:
   page.wait_for_function("job&&job.effect==='money'",timeout=10000)
   values=page.evaluate("""() => ({coverage:moneyCoverage,n:billParts.length,report:moneyCoverageReport,mask:field.coverage})""")
   print(f'{width}x{height}',values)
   assert values['coverage']>=.985,values
   assert values['n']>30
   for p in [0,.27,.55,.77,1]:
    img=page.evaluate('''p=>{ctx.clearRect(0,0,W,H);drawMoneyCover(p);return cvs.toDataURL('image/png').split(',')[1]}''',p)
    (ROOT/f'test_money_{width}_{int(p*100)}.png').write_bytes(base64.b64decode(img))
   for p in [.10,.30,.58,.76,.90,.995,1]:
    img=page.evaluate('''p=>{ctx.clearRect(0,0,W,H);drawMoney(p*job.duration,'out',job.duration);return cvs.toDataURL('image/png').split(',')[1]}''',p)
    (ROOT/f'test_hero_{width}_{int(p*100)}.png').write_bytes(base64.b64decode(img))
   assert not errors,errors
  finally:page.close()
 b.close()
print('MONEY VISUAL TEST PASS')
