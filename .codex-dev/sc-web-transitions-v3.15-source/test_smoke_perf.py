"""Optional, developer-only smoke benchmark. Chromium + Playwright required.

The forced readback approximates the cost of rasterizing the canvas, unlike just
measuring JavaScript draw command issue times. Not an OBS hardware benchmark.
"""
from pathlib import Path
import statistics
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent
HTML = (ROOT / "overlay.html").read_text().replace('<script src="/webgl3d.js"></script>', '')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
        args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
    for effect in ('smoke', 'toxic'):
        for w,h in ((1280,720),(1920,1080)):
            page = browser.new_page(viewport={'width':w,'height':h})
            html = HTML.replace('const params=new URLSearchParams(location.search)',
                f"const params=new URLSearchParams('?preview=1&effect={effect}&duration=3&intensity=85')")
            page_errors=[]
            page.on('pageerror',lambda e: page_errors.append(str(e)))
            page.set_content(html,wait_until='domcontentloaded')
            page.wait_for_function('typeof clouds!=="undefined"&&clouds.length>30',timeout=15000)
            samples=page.evaluate('''() => {
                const results=[];
                for(let k=0;k<55;k++){
                    const st=performance.now();ctx.clearRect(0,0,W,H);
                    drawClouds(1,'out',true,1.25+k*.0167);
                    ctx.getImageData(0,0,1,1);results.push(performance.now()-st);
                }
                return results.slice(10);
            }''')
            samples.sort()
            p95=samples[int((len(samples)-1)*.95)]
            print(f'{effect:5} {w}x{h} buffer={page.evaluate("smokeBufferScale")} '
                  f'clouds={page.evaluate("clouds.length")} '
                  f'p50={statistics.median(samples):.1f}ms p95={p95:.1f}ms')
            assert not page_errors, page_errors
            page.close()
    browser.close()
