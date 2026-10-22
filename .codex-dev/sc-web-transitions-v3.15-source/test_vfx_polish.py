from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
out=Path('/mnt/data/SC_Web_Transitions_v3_4_1_VFX_Polish/qa_frames');out.mkdir(exist_ok=True)
source=Path('/mnt/data/SC_Web_Transitions_v3_4_1_VFX_Polish/expansion-effects.js').read_text()
init='''() => {
 const W=960,H=540,subject=document.createElement('canvas');subject.width=W;subject.height=H;
 const s=subject.getContext('2d');
 s.fillStyle='#24588e';s.beginPath();s.ellipse(W*.5,H*.76,W*.17,H*.41,0,0,6.283);s.fill();
 s.fillStyle='#edbd9a';s.beginPath();s.arc(W*.5,H*.25,W*.072,0,6.283);s.fill();
 s.fillRect(W*.315,H*.58,W*.04,H*.19);s.fillRect(W*.65,H*.58,W*.04,H*.19);
 const a=s.getImageData(0,0,W,H).data,mw=256,mh=144,map=new Uint8ClampedArray(mw*mh*4),points=[];
 let minX=W,minY=H,maxX=0,maxY=0;
 for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){if(a[(y*W+x)*4+3]>155){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
  const ox=Math.min(W-1,Math.floor((x+.5)/mw*W)),oy=Math.min(H-1,Math.floor((y+.5)/mh*H));
  const v=a[(oy*W+ox)*4+3];map[(y*mw+x)*4+3]=v;
  if(v>155 && x%2===0 && y%2===0)points.push([ox,oy]);
 }
 const field={bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1},mw,mh,map,points,
 contains(x,y,threshold=125){const ix=Math.floor(x/W*mw),iy=Math.floor(y/H*mh);return ix>=0&&iy>=0&&ix<mw&&iy<mh&&map[(iy*mw+ix)*4+3]>threshold;}};
 window.qa={W,H,subject,field,ctx:document.getElementById('fx').getContext('2d')};return points.length;
}'''
results={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':960,'height':540})
 errs=[];page.on('pageerror',lambda e: errs.append(str(e)))
 page.set_content('<!doctype html><html><body style="background:#10151f;margin:0"><canvas id="fx" width="960" height="540"></canvas></body></html>')
 page.add_script_tag(content=source)
 print('foreground points',page.evaluate(init),flush=True)
 for id in ['glitch','lightning','shadow','holy','sand','crystal','petal','plasma']:
  try:
   stats=page.evaluate('''id => {if(window.effect)effect.dispose();const x=window.qa;
    window.effect=window.SCExpansion.create(id,{field:x.field,subject:x.subject,W:x.W,H:x.H,ctx:x.ctx,intensity:75,quality:'Cinematic',seed:1451,tuning:{motion:1,detail:1}});
    return effect.getState();}''',id)
   print('EFFECT',id,stats,flush=True)
   results[id]={'coverage':stats['coverage'],'tiles':stats['tiles'],'particles':stats['particles']}
   for direction in ['out','in']:
    for q in ([.0,.15,.35,.6,.83,1] if direction=='out' else [.0,.16,.35,.54,.61,.68,.78,.89,1]):
     page.evaluate('''args=>{const c=qa.ctx;c.clearRect(0,0,qa.W,qa.H);
       if(args.dir==='out'&&args.q===0)effect.renderCover(1,2);else effect.renderPlay(args.q*3,args.dir,3,args.q*3);
      }''',{'dir':direction,'q':q})
     fn=out/f'{id}_{direction}_{round(q*100):03}.png';page.locator('#fx').screenshot(path=str(fn))
    print('  ',direction,'frames okay',flush=True)
  except Exception as e:
   print('ERROR',id,e,traceback.format_exc(),flush=True);results[id]={'error':str(e)}
 print('PAGE ERRORS',errs,flush=True)
 b.close()
Path('/mnt/data/SC_Web_Transitions_v3_4_1_VFX_Polish/qa_results.json').write_text(json.dumps({'effects':results,'page_errors':errs},indent=2))
