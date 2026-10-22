"""Synthetic browser visual regression for non-linear top/bottom silhouette frost."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import base64, io, statistics, hashlib

ROOT = Path(__file__).resolve().parent
FILE = ROOT / 'overlay.html'
html = FILE.read_text().replace('<script src="/webgl3d.js"></script>', '').replace(
    'const params=new URLSearchParams(location.search)',
    "const params=new URLSearchParams('?preview=1&effect=ice&duration=3.0&intensity=80')")

out = Path('/mnt/data/SC_v325_OrganicFrost_ContactSheet.jpg')
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                                   args=['--no-sandbox','--disable-gpu-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':960,'height':540})
    errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_function('job&&shards.length>=18&&iceGrowthFrames.length>20',timeout=45000)
    meta=page.evaluate('''() => ({growth:iceGrowthDebug,shards:shards.length, stages:iceGrowthFrames.length})''')
    print('Growth', {k:v for k,v in meta['growth'].items() if k!='fronts'}, 'shards',meta['shards'])
    assert meta['growth']['activePixels']>5000
    assert meta['stages']>=30
    def capture(mode,progress):
        frame=page.evaluate('''([mode,p])=>{
          ctx.clearRect(0,0,W,H);
          if(mode==='cover')drawIceCover(p);
          else drawIce(p*job.duration,mode,job.duration);
          return cvs.toDataURL('image/png').split(',')[1];
        }''',[mode,progress])
        return Image.open(io.BytesIO(base64.b64decode(frame))).convert('RGBA')
    points=[('cover',0),('cover',.17),('cover',.34),('cover',.50),('cover',.63),('cover',.73),('cover',.83),('cover',1),('out',.45),('out',.90),('in',.45),('in',1)]
    frames=[]
    for mode,p in points:
        image=capture(mode,p)
        frames.append(image)
        if mode=='cover' and p in (.17,.34,.5,.63,.73):
            image.save(ROOT/f'organic_cover_{int(p*100):02d}.png')
    assert frames[-1].getextrema()[3]==(0,0), 'Ice IN must end with transparent FX layer'
    assert capture('out',1).getextrema()[3]==(0,0), 'Ice OUT must end with transparent FX layer'
    # Intermediate freeze changes should be visible and progress upward/downward.
    def changed(src,tgt):
        from PIL import ImageChops
        return ImageChops.difference(src,tgt).getbbox() is not None
    assert changed(frames[2],frames[3]) and changed(frames[3],frames[4]),'freeze progression stalled'
    mask=page.evaluate('''() => {
        const src=document.createElement('canvas');src.width=iceGrowthFrames[0].width;
        src.height=iceGrowthFrames[0].height;
        const q=src.getContext('2d');q.drawImage(subject,0,0,src.width,src.height);
        const data=q.getImageData(0,0,src.width,src.height).data;
        return {width:src.width,height:src.height,alpha:Array.from(data.filter((_,i)=>i%4===3))};
    }''')
    # At 50% growth, for each column with a substantial foreground run,
    # measure top advance and compare the actual boundary variance to a flat wipe.
    growth = capture('cover',.50)
    before = capture('cover',0)
    px = growth.load(); bpx=before.load()
    spans=[]
    for x in range(270,685,15):
        ys=[]
        for y in range(70,490):
            a=px[x,y];z=bpx[x,y]
            if a[3]>128 and ((a[2]-z[2])>9 or (a[1]-z[1])>9):ys.append(y)
        if len(ys)>25:spans.append((x,min(ys),max(ys)))
    print('front sample x/top/bottom:',spans[:10]);print('span count',len(spans))
    assert len(spans)>=8,'Cannot find enough frost front column samples'
    # Non-flatness is a visible property, not just the underlying noise field.
    assert statistics.pstdev(s[1] for s in spans)>4.5, 'Top frost contour looks too straight'
    # Synthetic frames only, not physical OBS or frame readiness validation.
    ww,hh=480,270;cellh=hh+28
    board=Image.new('RGB',(ww*4,cellh*3),(14,20,29))
    label=ImageDraw.Draw(board)
    for i,((mode,p),frame) in enumerate(zip(points,frames)):
        x=(i%4)*ww;y=(i//4)*cellh
        dark=Image.new('RGBA',frame.size,(18,24,34,255));dark.alpha_composite(frame)
        board.paste(dark.convert('RGB').resize((ww,hh)),(x,y+28));label.text((x+12,y+8),f'{mode.upper()}  {round(p*100)}%',fill='white')
    board.save(out,quality=90)
    print('WROTE',out)
    print('SHA256 overlay:',hashlib.sha256(FILE.read_bytes()).hexdigest())
    assert not errors,errors
    browser.close()
print('PASS: Organic ice frost progression, visible jagged fronts, IN/OUT transparency')
