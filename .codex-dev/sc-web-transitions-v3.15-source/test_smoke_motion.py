"""Regression: continuous gas movement at 100% cover and seamless play handoff.
Uses a synthetic demo silhouette and real Chromium canvas drawing; no OBS needed.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
HTML = (ROOT / 'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>', '')

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                  args=['--no-sandbox', '--disable-gpu-sandbox', '--disable-gpu'])
    for effect in ['smoke', 'toxic']:
        page = browser.new_page(viewport={'width':960,'height':540})
        errors=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        html = HTML.replace('const params=new URLSearchParams(location.search)',
                            f"const params=new URLSearchParams('?preview=1&effect={effect}&duration=3&intensity=80')")
        page.set_content(html, wait_until='domcontentloaded')
        page.wait_for_function('typeof clouds !== "undefined" && clouds.length > 20', timeout=10000)
        def frame(mode, age):
            return page.evaluate('''({mode,age}) => {
                ctx.clearRect(0,0,W,H);
                drawClouds(mode==='cover'?1:0,'out',mode==='cover',age);
                const d=ctx.getImageData(0,0,cvs.width,cvs.height).data;
                const pixels=[];
                for(let i=0;i<d.length;i+=4*7) pixels.push(d[i],d[i+1],d[i+2],d[i+3]);
                return pixels;
            }''', {'mode':mode, 'age':age})
        a,b,c=frame('cover',2.0),frame('cover',2.5),frame('cover',3.0)
        release=frame('play',3.0)
        distance=lambda x,y: sum(abs(u-v) for u,v in zip(x,y))/len(x)
        changes=[distance(a,b),distance(b,c)]
        boundary=distance(c,release)
        print(json.dumps({'effect':effect,'cover_motion_per_half_second':list(map(lambda n:round(n,3),changes)),
                          'cover_to_release_jump':round(boundary,4),'script_errors':errors}))
        assert min(changes)>1, f'{effect} held a nearly static frame during OBS handoff'
        assert boundary<0.15, f'{effect} reset its appearance when playback started'
        assert not errors, errors
        page.close()
    browser.close()
print('PASS: both gas effects animate during covered hold and continue seamlessly into release')
