"""Synthetic real-browser Inferno frames, coverage checks, IN/OUT continuity. No claim of real OBS."""
from pathlib import Path
import re,base64,io,json
from PIL import Image, ImageChops, ImageStat, ImageOps, ImageDraw
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
OUT=Path('/mnt/data/SC_v33_Inferno_Review');OUT.mkdir(exist_ok=True)
S=(ROOT/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
B64='data:image/png;base64,'+base64.b64encode((ROOT/'bill.png').read_bytes()).decode()
S=S.replace("image('./bill.png')", "image('"+B64+"')")
summary={}
with sync_playwright() as pw:
    br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-gpu-sandbox'])
    page=br.new_page(viewport={'width':960,'height':540},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    html=S.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=inferno&direction=out&intensity=77&duration=3')")
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_function("window.__scDebug && job && job.effect==='inferno' && infernoSeal && infernoCoverFrames.length===22",timeout=55000)
    summary['coverage']=page.evaluate('infernoCoverage')
    summary['frame_count']=page.evaluate('infernoCoverFrames.length')
    print('Inferno prepared: coverage',summary['coverage'])
    frames=[]
    for mode,times in [('cover',[0,.12,.25,.4,.57,.72,.86,1]),('out',[0,.06,.18,.32,.48,.62,.78,.91,1]),('in',[0,.12,.25,.43,.58,.61,.69,.75,.83,.92,1])]:
        clips=[]
        for p in times:
            expr=f'drawInfernoCover({p},1.4)' if mode=='cover' else f'drawInferno({p*3},"{mode}",3)'
            b64=page.evaluate('''(src)=>{ctx.clearRect(0,0,W,H);eval(src);return cvs.toDataURL('image/png').split(',')[1]}''',expr)
            raw=base64.b64decode(b64)
            im=Image.open(io.BytesIO(raw)).convert('RGBA')
            path=OUT/f'{mode}_{int(p*100):03d}.png';path.write_bytes(raw)
            nonzero=sum(1 for a in im.getchannel('A').getdata() if a>4)
            avg=ImageStat.Stat(im).mean[3]
            print(mode, p, 'coverage_pixels',nonzero,'mean_alpha',round(avg,2))
            clips.append({'phase':p,'alpha_avg':round(avg,4),'px':nonzero})
            bg=Image.new('RGB',im.size,(15,20,29));bg.paste(im,mask=im.getchannel('A'))
            draw=ImageDraw.Draw(bg);draw.rectangle((0,0,135,28),fill=(8,14,23));draw.text((8,8),f'{mode.upper()} {p:.2f}',fill='white')
            frames.append(bg)
        summary[mode]=clips
    # 5-column storyboard
    W,H=480,270
    board=Image.new('RGB',(5*W,6*H),(9,15,25))
    for i,im in enumerate(frames):board.paste(im.resize((W,H),Image.Resampling.LANCZOS),((i%5)*W,(i//5)*H))
    board.save(OUT/'Inferno_Contact_Sheet.jpg',quality=88)
    last_out=Image.open(OUT/'out_100.png').convert('RGBA')
    last_in=Image.open(OUT/'in_100.png').convert('RGBA')
    assert ImageStat.Stat(last_out).mean[3] < .5
    assert ImageStat.Stat(last_in).mean[3] < .5
    assert summary['coverage']>=.985
    assert not errors,errors
    (OUT/'visual_metrics.json').write_text(json.dumps(summary,indent=2))
    br.close()
print('All Inferno synthetic visual tests passed')
