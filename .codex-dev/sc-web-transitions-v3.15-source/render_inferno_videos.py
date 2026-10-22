"""Render synthetic app output into 20-fps review videos; no physical OBS source."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import base64,io,subprocess,statistics
R=Path(__file__).resolve().parent
OUT=Path('/mnt/data/SC_v33_Inferno_Review');OUT.mkdir(exist_ok=True)
S=(R/'overlay.html').read_text().replace('<script src="/webgl3d.js"></script>','')
FPS=20;W=960;H=540

def encode_video(page,direction):
    path=OUT/f'SC_v3.3.0_Inferno_{direction.upper()}_Synthetic.mp4'
    args=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}',
          '-framerate',str(FPS),'-i','pipe:0','-c:v','libx264','-preset','ultrafast','-crf','22','-pix_fmt','yuv420p',str(path)]
    proc=subprocess.Popen(args,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    camera_bytes=page.evaluate("subject.toDataURL('image/png').split(',')[1]")
    camera=Image.open(io.BytesIO(base64.b64decode(camera_bytes))).convert('RGBA')
    base=Image.new('RGB',(W,H),(15,20,29))
    dark=Image.new('RGBA',(W,H),(15,20,29,255))
    total=(1.95+3.0) if direction=='out' else 3.2
    n=int(total*FPS)
    for i in range(n):
        sec=i/FPS
        if direction=='out':
            if sec<1.95:
                phase=sec/1.95
                expr=f'drawInfernoCover({phase},{sec})'
                camVisible=True
            else:
                phase=(sec-1.95)/3.0
                expr=f'drawInferno({phase*3},"out",3)'
                camVisible=False
        else:
            phase=min(1,sec/3.2)
            # The real IN simulation holds at build=.61 waiting for camera readiness.
            # This review plays at nominal pacing and reveals the keyed live camera
            # under fully assembled cover in the simulated handoff.
            expr=f'drawInferno({phase*3},"in",3)'
            camVisible=phase>=.61
        raw=base64.b64decode(page.evaluate('''(s)=>{ctx.clearRect(0,0,W,H);eval(s);return cvs.toDataURL('image/png').split(',')[1]}''',expr))
        fx=Image.open(io.BytesIO(raw)).convert('RGBA')
        img=Image.new('RGBA',(W,H),(15,20,29,255))
        if camVisible:img.alpha_composite(camera)
        img.alpha_composite(fx)
        frame=img.convert('RGB')
        if i in [int(n*.14),int(n*.38),int(n*.65),int(n*.84)]:
            frame.save(OUT/f'{direction}_filmframe_{i:03d}.jpg',quality=90)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    err=proc.stderr.read().decode();ret=proc.wait()
    assert ret==0,(ret,err)
    print(path,'frames',n,'duration',n/FPS)
    return path

with sync_playwright() as pw:
    br=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
    page=br.new_page(viewport={'width':W,'height':H});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    html=S.replace('const params=new URLSearchParams(location.search)',"const params=new URLSearchParams('?preview=1&effect=inferno&direction=out&duration=3&intensity=77')")
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_function("job && job.effect==='inferno' && infernoSeal && infernoCoverFrames.length===22",timeout=60000)
    encode_video(page,'out')
    encode_video(page,'in')
    assert not errors, errors
    br.close()
print('Synthetic videos exported')
