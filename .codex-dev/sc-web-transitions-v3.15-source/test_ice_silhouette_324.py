"""Browser-frame regression for Ice OUT/IN, synthetic keyed silhouette only.
Needs Python playwright and system Chromium; cannot certify OBS playback.
"""
from pathlib import Path
import base64
import io
import re
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / 'overlay.html').read_text()
# v3.11 embeds self-contained shader modules; inline them for set_content().
for module in ['money-vfx3d','ice-vfx3d','premium-vfx-meshes','premium-crystal-accents','crystal-hero3d','gpu-vfx3d','expansion-effects']:
    HTML=HTML.replace('<script src="/'+module+'.js"></script>', '<script>\n'+(ROOT/(module+'.js')).read_text()+'\n</script>')
HTML = HTML.replace('<script src="/webgl3d.js"></script>', '')
HTML = HTML.replace('new URLSearchParams(location.search)',
                    'new URLSearchParams("?preview=1&effect=ice&direction=out&duration=3&intensity=80&gpu=0")')

def raster(page, phase, t):
    data = page.evaluate('''([phase, t]) => {
      stage = 'prepared';
      ctx.clearRect(0,0,W,H);
      if (phase === 'cover') drawIceCover(t);
      else drawIce(t*3, phase, 3);
      return cvs.toDataURL('image/png').split(',')[1];
    }''', [phase, t])
    return Image.open(io.BytesIO(base64.b64decode(data))).convert('RGBA')

def measurements(image, mask):
    a=image.getchannel('A'); m=mask.getchannel('A')
    ap=a.load(); mp=m.load();w,h=image.size
    body=visible=background=0
    for y in range(0,h,3):
        for x in range(0,w,3):
            if mp[x,y]>200:
                body += 1
                if ap[x,y]>245: visible+=1
            elif ap[x,y]>8:background+=1
    return visible/max(1,body),background

with sync_playwright() as browser_api:
    browser=browser_api.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':960,'height':540},device_scale_factor=1)
    issues=[];page.on('pageerror',lambda e:issues.append(str(e)))
    page.set_content(HTML,wait_until='load')
    page.wait_for_function('window.__scDebug && window.__scDebug().shards >= 18',timeout=30000)
    page.evaluate("stage='prepared'")
    maskdata=page.evaluate("subject.toDataURL('image/png').split(',')[1]")
    mask=Image.open(io.BytesIO(base64.b64decode(maskdata))).convert('RGBA')
    cover,bg=measurements(raster(page,'cover',1),mask)
    assert cover >= .985, f'Ice OUT mask concealment below threshold: {cover:.3f}'
    assert bg < 300, f'Ice OUT paints outside silhouette: {bg} pixels'
    incoming_early,bg_early=measurements(raster(page,'in',.22),mask)
    assert bg_early > 30, 'Ice IN shards are not visibly entering the viewport'
    incoming,bg_in=measurements(raster(page,'in',.55),mask)
    assert incoming >= .985, f'Ice IN cannot hide webcam before reveal: {incoming:.3f}'
    assert bg_in < 300, f'Assembled ice has a visible window border: {bg_in}'
    outlast=raster(page,'out',1).getchannel('A').getextrema()[1]
    inlast=raster(page,'in',1).getchannel('A').getextrema()[1]
    assert outlast == 0 and inlast == 0, f'Ice is not transparent after exit: OUT {outlast} IN {inlast}'
    assert not issues, f'Browser runtime errors: {issues}'
    print(f'PASS: cover={cover:.3%}, assembled-IN={incoming:.3%}, outside={bg}, '
          f'incoming shard pixels={bg_early}, alpha end OUT/IN={outlast}/{inlast}')
    browser.close()

original=(Path(__file__).resolve().parent.parent/'SC_Web_Transitions_v3_2_3_MoneySmokeToxic'/'overlay.html')
if original.exists():
    now=(ROOT/'overlay.html').read_text()
    before=original.read_text()
    # Money and Smoke/Toxic are outside this Ice-only change's scope.
    def region(s,a,b):return s[s.index(a):s.index(b)]
    assert region(now,'function drawMoney(t,dir,duration){','// ICE 3.2.4:').strip()==region(before,'function drawMoney(t,dir,duration){','function buildIceMaterial(){').strip(), 'Money animation was modified'
    assert region(now,'function makePuff(effect,seed){','function coverTime(effect){')==region(before,'function makePuff(effect,seed){','function coverTime(effect){'), 'Smoke/Toxic animation was modified'
    print('PASS: Money and Smoke/Toxic VFX functions unchanged')
