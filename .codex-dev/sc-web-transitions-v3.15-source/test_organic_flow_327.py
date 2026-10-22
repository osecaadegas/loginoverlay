"""Smoke/Toxic v3.2.7: physical alpha coverage, moving texture, rising plume centroid, zero alpha exit.
Synthetic renderer checks only. Does not prove actual OBS output.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
    for effect in ('smoke','toxic'):
        page=browser.new_page(viewport={'width':640,'height':360})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML.replace('const params=new URLSearchParams(location.search)',f"const params=new URLSearchParams('?preview=1&effect={effect}&direction=out&duration=3&intensity=78')"),wait_until='domcontentloaded')
        page.wait_for_function('clouds.length > 30 && gasSeal !== null',timeout=20000)
        observations=[]
        for stage,p,age in [('cover',1,1.76),('cover',1,2.40),('release',0,2.40),('release',.20,3.00),('release',.40,3.60),('release',.60,4.20),('release',.80,4.80),('release',1,5.40)]:
            r=page.evaluate('''({stage,p,age})=>{
              ctx.clearRect(0,0,W,H);drawClouds(p,'out',stage==='cover',age);
              const d=ctx.getImageData(0,0,W,H).data;
              let count=0,sum=0,weighted=0,colour=0,remaining=0;
              for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){let k=(y*W+x)*4;
                 const a=d[k+3];if(a>12){count++;sum+=a;weighted+=a*y;colour+=d[k+1]*a}}
              return {coverage:gasOpacityCoverage(),visiblePixels:count,alphaSum:sum,
                      centerY:sum?weighted/sum:null,avgGreen:sum?colour/sum:null};
            }''',{'stage':stage,'p':p,'age':age})
            observations.append(dict(stage=stage,progress=p,age=age,**r))
        assert observations[0]['coverage']>=.985,(effect,observations[0])
        assert observations[1]['coverage']>=.985,(effect,observations[1])
        assert observations[-1]['visiblePixels']==0,(effect,'nonempty final alpha')
        # Organic gas must meaningfully lift upward from the covered body.
        assert observations[4]['centerY'] is not None
        assert observations[4]['centerY']<observations[2]['centerY']-15,(effect,'plume did not rise',observations)
        assert observations[6]['alphaSum']<observations[4]['alphaSum'],(effect,'plume not dissipating')
        assert not errors,errors
        print(json.dumps({'effect':effect,'observations':observations},indent=2))
        page.close()
    browser.close()
print('PASS: high-opacity concealment, rising plume, dwindling alpha and complete exit')
