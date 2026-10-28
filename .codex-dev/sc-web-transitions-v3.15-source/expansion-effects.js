/* SC Web Transitions v3.5: audited, material-specific procedural animation modules.
 * All visible material is generated from the actual keyed camera snapshot.
 * OBS switches remain controlled by the host; this renderer never fakes a camera state.
 */
(function (root) {
'use strict';
const TYPES = Object.freeze({
 glitch:{name:'Void Glitch',color:'#6f94ff',glyph:'▦',mode:'digital',inBuild:.61},
 lightning:{name:'Lightning Surge',color:'#55baff',glyph:'ϟ',mode:'electrical',inBuild:.61},
 shadow:{name:'Shadow Swarm',color:'#7761a4',glyph:'◆',mode:'swarm',inBuild:.62},
 holy:{name:'Holy Ascension',color:'#ffca6e',glyph:'✦',mode:'radiant',inBuild:.61},
 sand:{name:'Sand Disintegration',color:'#d4a36e',glyph:'◌',mode:'granular',inBuild:.63},
 crystal:{name:'Crystal Growth',color:'#b178fa',glyph:'◇',mode:'mineral',inBuild:.64},
 petal:{name:'Petal Bloom',color:'#f06da9',glyph:'❀',mode:'petals',inBuild:.64},
 plasma:{name:'Plasma Flow',color:'#5ce7ef',glyph:'◉',mode:'plasma',inBuild:.61},
 neon:{name:'Neon Lattice',color:'#68baff',glyph:'⬡',mode:'neon',inBuild:.58}
});
const keys=Object.keys(TYPES);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
function seeded(seed){let z=seed>>>0;return ()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return (z>>>0)/4294967296}}
function rgb(hex){if(!/^#[0-9a-f]{6}$/i.test(hex||''))hex='#78b6ea';return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
function hash(x,y,seed){let k=Math.imul(x+seed,374761393)+Math.imul(y+seed,668265263);k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967295}
function path(c,g){c.beginPath();c.moveTo(g[0][0],g[0][1]);for(let i=1;i<g.length;i++)c.lineTo(g[i][0],g[i][1]);c.closePath()}
class Effect {
 constructor(type,opts){
  if(!TYPES[type])throw Error('Unknown expansion effect '+type);
  this.type=type;this.config=TYPES[type];this.o=opts;this.W=opts.W;this.H=opts.H;
  this.field=opts.field;this.ctx=opts.ctx;this.subject=opts.subject;
  this.intensity=clamp((opts.intensity||75)/100,.15,1);
  this.quality=opts.quality||'Cinematic';
  this.tuning=opts.tuning||{};
  this.motion=clamp(Number(this.tuning.motion)||1,.45,2.25);
  this.detail=clamp(Number(this.tuning.detail)||1,.45,1.65);
  this.color=rgb(this.tuning.accent||this.config.color);
  this.customColor=!!(this.tuning.accent&&this.tuning.accent.toLowerCase()!==this.config.color.toLowerCase());
  this.colorCSS=`rgb(${this.color.join(',')})`;
  this.rand=seeded((opts.seed||38941)^((keys.indexOf(type)+1)*7812397));
  this.b=this.field.bounds;this.particles=[];this.tiles=[];this.lines=[];
  this.prepareV35();
 }
 random(a,b){return a+(b-a)*this.rand()}
 measureCoverage(){
  const w=this.field.mw,h=this.field.mh,probe=canvas(w,h),g=probe.getContext('2d',{willReadFrequently:true});
  g.drawImage(this.seal,0,0,w,h);
  const v=g.getImageData(0,0,w,h).data,m=this.field.map;
  let all=0,yes=0;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const k=(y*w+x)*4+3;if(m[k]<196)continue;
   all++;if(v[k]>=248)yes++;
  }
  return all?yes/all:0;
 }
 // V3.5 audit rebuild: material-specific simulation, no shared painted-silhouette wipe.
 prepareV35(){
  const W=this.W,H=this.H,b=this.b,t=this.type,ctx2=this.ctx;
  const subject=this.subject;
  const sm=canvas(W,H),sg=sm.getContext('2d',{willReadFrequently:true});sg.drawImage(subject,0,0,W,H);
  const im=sg.getImageData(0,0,W,H),src=im.data;
  const out=sg.createImageData(W,H),pix=out.data;
  const C=this.color, id=keys.indexOf(t);
  const noiseW=Math.max(12,Math.ceil(W/39)),noiseH=Math.max(12,Math.ceil(H/39));
  const coarse=canvas(noiseW,noiseH),ng=coarse.getContext('2d');
  const ni=ng.createImageData(noiseW,noiseH);
  for(let y=0;y<noiseH;y++)for(let x=0;x<noiseW;x++){
   const o=(y*noiseW+x)*4,v=(hash(x,y,251+id*23)*255)|0;
   ni.data[o]=ni.data[o+1]=ni.data[o+2]=v;ni.data[o+3]=255;
  }
  ng.putImageData(ni,0,0);
  const soft=canvas(W,H),sctx=soft.getContext('2d',{willReadFrequently:true});
  sctx.imageSmoothingEnabled=true;sctx.drawImage(coarse,0,0,W,H);
  const np=sctx.getImageData(0,0,W,H).data;
  const mx=Math.max(1,Math.floor(b.x)),my=Math.max(1,Math.floor(b.y));
  const ex=Math.min(W-1,Math.ceil(b.x+b.w)),ey=Math.min(H-1,Math.ceil(b.y+b.h));
  for(let y=my;y<ey;y++)for(let x=mx;x<ex;x++){
   const k=(y*W+x)*4,a=src[k+3];if(a<12)continue;
   const lum=(src[k]*.2126+src[k+1]*.7152+src[k+2]*.0722)/255;
   const macro=np[k]/255,detail=hash(x>>2,y>>2,id*191+55),fine=hash(x,y,621+id*73);
   const yy=(y-b.y)/Math.max(1,b.h),xx=(x-b.x)/Math.max(1,b.w);
   const edge=(src[k-4+3]<150||src[k+4+3]<150||src[k-W*4+3]<150||src[k+W*4+3]<150)?1:0;
   const outRGB=[0,0,0];
   if(t==='glitch'){
    const shift=hash(x>>5,y>>3,79)>.81?.23:0;
    outRGB[0]=src[k]*.64+38+shift*100;outRGB[1]=src[k+1]*.68+22+macro*35;outRGB[2]=src[k+2]*.82+60+shift*120;
   }else if(t==='lightning'){
    const flash=Math.pow(Math.max(0,Math.sin(xx*11+yy*8+macro*11)),24)*.50;
    const bright=.36+lum*.40+macro*.16+flash;
    for(let i=0;i<3;i++)outRGB[i]=src[k+i]*.28+C[i]*bright+(edge?C[i]*.25:0);
   }else if(t==='shadow'){
    const dark=.19+lum*.22+macro*.12,shade=(fine-.5)*15;
    outRGB[0]=12+src[k]*.11+C[0]*dark*.40+shade;
    outRGB[1]=10+src[k+1]*.12+C[1]*dark*.43+shade;
    outRGB[2]=19+src[k+2]*.17+C[2]*dark*.57+shade;
   }else if(t==='holy'){
    const rays=Math.pow(Math.max(0,Math.sin(xx*23+macro*5)),9)*.13,shine=.26+.42*lum+macro*.28+rays;
    for(let i=0;i<3;i++)outRGB[i]=src[k+i]*.25+C[i]*shine+(edge?48:0);
   }else if(t==='sand'){
    const grit=(fine-.5)*.58+(detail-.5)*.21,shade=.36+.20*lum+macro*.26+grit;
    outRGB[0]=C[0]*shade+src[k]*.08;outRGB[1]=C[1]*shade+src[k+1]*.07;outRGB[2]=C[2]*shade+src[k+2]*.04;
   }else if(t==='crystal'){
    const facet=Math.abs(Math.sin(xx*13+yy*10+macro*4)),shine=Math.pow(facet,16)*.27;
    const shade=.22+lum*.29+macro*.38+shine;
    for(let i=0;i<3;i++)outRGB[i]=C[i]*shade+src[k+i]*.17+(edge?44:0);
   }else if(t==='petal'){
    const sw=.32+lum*.23+macro*.22+Math.sin(xx*31+yy*14)*.055;
    outRGB[0]=C[0]*sw+src[k]*.25+34;outRGB[1]=C[1]*sw+src[k+1]*.16+17;outRGB[2]=C[2]*sw+src[k+2]*.22+35;
   }else{
    const wave=Math.sin(yy*24+Math.sin(xx*10+macro*8)*3)*.14,shine=.30+lum*.37+macro*.25+wave;
    for(let i=0;i<3;i++)outRGB[i]=C[i]*shine+src[k+i]*.17+(edge?60:0);
   }
   for(let c=0;c<3;c++)pix[k+c]=clamp(outRGB[c],0,255)|0;
   pix[k+3]=a>110?255:Math.min(255,a*2);
  }
  sg.putImageData(out,0,0);this.seal=sm;
  this.coverage=this.measureCoverage();
  if(this.coverage<.985)throw Error(this.config.name+': key coverage below safe threshold '+(this.coverage*100).toFixed(1)+'%');
  // A persistent organic growth/dissolution threshold per low-resolution cell.
  this.resScale=Math.min(1,270/W);
  this.mw=Math.max(1,Math.round(W*this.resScale));this.mh=Math.max(1,Math.round(H*this.resScale));
  this.maskCanvas=canvas(this.mw,this.mh);this.maskCtx=this.maskCanvas.getContext('2d',{willReadFrequently:true});
  this.maskPixels=this.maskCtx.createImageData(this.mw,this.mh);this.levels=new Float32Array(this.mw*this.mh);
  const ct=b.x+b.w*.5,cy=b.y+b.h*.5;
  for(let y=0;y<this.mh;y++)for(let x=0;x<this.mw;x++){
   const X=x/this.mw*W,Y=y/this.mh*H,xx=(X-b.x)/Math.max(1,b.w),yy=(Y-b.y)/Math.max(1,b.h);
   const n=hash(x>>2,y>>2,id*53+18),f=hash(x,y,id*193+31),n2=hash(x>>4,y>>4,id*97+13);
   const a=Math.atan2(Y-cy,X-ct),r=Math.sqrt(((X-ct)/Math.max(1,b.w*.52))**2+((Y-cy)/Math.max(1,b.h*.52))**2);
   let v=0;
   if(t==='glitch')v=.60*hash(x>>3,y>>2,712)+.25*hash(x>>6,y>>1,293)+.15*yy;
   else if(t==='lightning')v=r*.62+n*.28+f*.1;
   else if(t==='shadow')v=.19*r+.38*(.5+.5*Math.sin(a*2+r*5))+.25*n+.18*yy;
   else if(t==='holy')v=.76*(1-yy)+.16*n+.08*f;
   else if(t==='sand')v=.58*(1-xx)+.24*yy+.14*n+.04*f;
   else if(t==='crystal')v=.44*Math.min(r,1)+.32*n2+.16*n+.08*f;
   else if(t==='petal')v=.73*yy+.19*n+.08*f;
   else v=.30*r+.29*(.5+.5*Math.sin(a*2.4+yy*12))+.28*n+.13*f;
   this.levels[y*this.mw+x]=clamp(v*.94);
  }
  const budget=this.quality==='Ultra'?.85:this.quality==='Performance'?.39:this.quality==='Balanced'?.53:.68;
  this.surfaceScale=Math.min(1,budget*1280/Math.max(1280,W));
  this.sw=Math.max(1,Math.round(W*this.surfaceScale));this.sh=Math.max(1,Math.round(H*this.surfaceScale));
  this.sealSmall=canvas(this.sw,this.sh);this.sealSmall.getContext('2d').drawImage(this.seal,0,0,this.sw,this.sh);
  this.work=canvas(this.sw,this.sh);this.workCtx=this.work.getContext('2d');
  this.sprite=this.makeSpriteV35();
  this.particles=[];this.tiles=[];this.arcs=[];
  const perf={Performance:.5,Balanced:.78,Cinematic:1,Ultra:1.26}[this.quality]||1;
  const countBase={glitch:220,lightning:200,shadow:320,holy:310,sand:1700,crystal:180,petal:320,plasma:250,neon:210}[t];
  const count=Math.round(countBase*perf*this.detail);
  const pts=this.field.points;if(!pts.length)throw Error('Empty subject mask');
  for(let i=0;i<count;i++){
   const xy=pts[(this.rand()*pts.length)|0],phase=this.random(0,6.283),range=this.random(.7,1.4);
   const dx=(xy[0]-ct)/Math.max(40,b.w*.5),dy=(xy[1]-cy)/Math.max(40,b.h*.5);
   const tx=t==='sand' ? W*(.56+.32*range) : t==='holy'?dx*W*.12 : t==='petal'?dx*W*.24+Math.sin(phase)*W*.15:t==='shadow'?dx*W*.4+Math.cos(phase*2)*W*.18:dx*W*.3+Math.cos(phase*2)*W*.13;
   const ty=t==='sand'?H*(.02+.18*range) : t==='glitch' ? dy*H*.18 : -(H*(t==='holy'?.78:t==='petal'?.52:t==='shadow'?.47:.58)*range);
   this.particles.push({x:xy[0],y:xy[1],phase,tx,ty,spin:this.random(-5,5),size:this.random(.65,1.45),delay:this.random(0,.22),depth:this.random(.72,1.36),
    wind:this.random(-.32,.32),gravity:this.random(.035,.13),flutter:this.random(.55,1.55)});
  }
  this.buildFragmentsV35();
  this.buildArcsV35();
 }
 makeSpriteV35(){
  const typ=this.type,c=canvas(76,76),g=c.getContext('2d'),rgb0=this.color;
  if(typ==='shadow'){
   g.translate(38,38);g.rotate(-.30);const grad=g.createLinearGradient(-19,-16,19,17);
   grad.addColorStop(0,'rgba(178,157,213,.72)');grad.addColorStop(.46,'rgba(37,27,60,.97)');grad.addColorStop(1,'rgba(8,7,19,0)');
   g.fillStyle=grad;g.beginPath();g.moveTo(-28,-3);g.quadraticCurveTo(2,-31,24,-14);g.quadraticCurveTo(34,0,-7,21);g.quadraticCurveTo(-11,3,-28,-3);g.fill();
   g.strokeStyle='rgba(183,171,217,.38)';g.lineWidth=1;g.beginPath();g.moveTo(-23,-3);g.lineTo(23,-13);g.stroke();
  }else if(typ==='petal'){
   g.translate(38,38);const grad=g.createRadialGradient(-8,-10,3,0,0,36);
   grad.addColorStop(0,'rgba(255,239,242,1)');grad.addColorStop(.44,`rgba(${rgb0[0]},${rgb0[1]},${rgb0[2]},.98)`);grad.addColorStop(1,'rgba(94,22,57,.8)');
   g.fillStyle=grad;g.beginPath();g.moveTo(0,-29);g.bezierCurveTo(24,-28,30,2,4,29);g.bezierCurveTo(-16,31,-29,7,0,-29);g.fill();
   g.strokeStyle='rgba(255,239,241,.5)';g.beginPath();g.moveTo(0,-24);g.quadraticCurveTo(0,6,5,24);g.stroke();
  }else if(typ==='sand'){
   const gr=g.createRadialGradient(34,31,0,38,38,27);
   gr.addColorStop(0,'rgba(255,229,178,.98)');gr.addColorStop(.4,`rgba(${rgb0.join(',')},.8)`);gr.addColorStop(1,'rgba(73,46,22,0)');g.fillStyle=gr;g.beginPath();g.ellipse(38,38,24,20,0,0,6.283);g.fill();
  }else{
   const gr=g.createRadialGradient(38,38,0,38,38,35);
   gr.addColorStop(0,'rgba(255,255,255,.99)');gr.addColorStop(.12,`rgba(${rgb0.join(',')},.88)`);gr.addColorStop(.54,`rgba(${rgb0.join(',')},.18)`);gr.addColorStop(1,`rgba(${rgb0.join(',')},0)`);
   g.fillStyle=gr;g.fillRect(0,0,76,76);
  }
  return c;
 }
 buildFragmentsV35(){
  if(this.type!=='glitch'&&this.type!=='crystal')return;
  const b=this.b,W=this.W,H=this.H,t=this.type,centers=[];
  if(t==='glitch'){
   const cols=15,rows=Math.max(14,Math.round(cols*b.h/Math.max(1,b.w)));
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=Math.floor(b.x+b.w*i/cols),y=Math.floor(b.y+b.h*j/rows);
    const w=Math.ceil(b.w/cols)+1,h=Math.ceil(b.h/rows)+1;
    if(!this.field.contains(x+w*.5,y+h*.5,45))continue;
    const tile=canvas(w,h),g=tile.getContext('2d');
    g.drawImage(this.seal,x,y,w,h,0,0,w,h);
    this.tiles.push({image:tile,x,y,w,h,delay:this.random(0,.28),dx:(i-cols*.5)*W*.053,dy:Math.sin(i*7+j*11)*H*.19,spin:0});
   }
  }else{
   const cols=6,rows=Math.max(8,Math.round(cols*b.h/Math.max(1,b.w)));
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const x=b.x+(i+.5+this.random(-.38,.38))*b.w/cols;
    const y=b.y+(j+.5+this.random(-.38,.38))*b.h/rows;
    if(this.field.contains(x,y,20))centers.push([x,y]);
   }
   const clipHalf=(poly,mx,my,nx,ny)=>{
    if(!poly.length)return poly;
    const out=[];let prev=poly[poly.length-1],pd=(prev[0]-mx)*nx+(prev[1]-my)*ny;
    for(const pt of poly){let d=(pt[0]-mx)*nx+(pt[1]-my)*ny;
     if((pd<=0)!==(d<=0)){const q=pd/(pd-d);out.push([mix(prev[0],pt[0],q),mix(prev[1],pt[1],q)]);}
     if(d<=0)out.push(pt);prev=pt;pd=d;
    }return out;
   };
   for(const c of centers){
    let poly=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
    for(const v of centers){if(c===v)continue;poly=clipHalf(poly,(c[0]+v[0])*.5,(c[1]+v[1])*.5,v[0]-c[0],v[1]-c[1]);if(poly.length<3)break;}
    if(poly.length<3)continue;
    const x=Math.max(0,Math.floor(Math.min(...poly.map(p=>p[0]))-4)),y=Math.max(0,Math.floor(Math.min(...poly.map(p=>p[1]))-4));
    const w=Math.min(W-x,Math.ceil(Math.max(...poly.map(p=>p[0]))+4)-x),h=Math.min(H-y,Math.ceil(Math.max(...poly.map(p=>p[1]))+4)-y);
    if(w<=3||h<=3)continue;
    const tile=canvas(w,h),g=tile.getContext('2d');
    g.save();g.translate(-x,-y);g.beginPath();g.moveTo(...poly[0]);for(let i=1;i<poly.length;i++)g.lineTo(...poly[i]);g.closePath();g.clip();g.drawImage(this.seal,0,0,W,H);g.restore();
    g.save();g.translate(-x,-y);g.beginPath();g.moveTo(...poly[0]);for(let i=1;i<poly.length;i++)g.lineTo(...poly[i]);g.closePath();
    g.lineJoin='round';g.lineWidth=2.0;g.strokeStyle='rgba(234,213,255,.82)';g.stroke();
    g.strokeStyle='rgba(51,21,92,.25)';g.lineWidth=4;g.stroke();g.restore();
    g.globalCompositeOperation='destination-in';g.drawImage(this.subject,x,y,w,h,0,0,w,h);
    const cx=x+w*.5,cy=y+h*.5;
    this.tiles.push({image:tile,x,y,w,h,delay:this.random(0,.18),dx:(cx-(b.x+b.w*.5))/Math.max(10,b.w*.48)*W*.68+this.random(-W*.10,W*.10),dy:(cy-(b.y+b.h*.5))/Math.max(10,b.h*.48)*H*.42+this.random(-H*.06,H*.05),spin:this.random(-4,4)});
   }
  }
 }
 buildArcsV35(){
  const t=this.type;if(t!=='lightning'&&t!=='plasma'&&t!=='neon'&&t!=='crystal')return;
  const b=this.b,pt=this.field.points;
  for(let i=0;i<(t==='lightning'?26:(t==='plasma'||t==='neon')?13:12);i++){
   const seed=pt[Math.floor(this.rand()*pt.length)],arr=[[seed[0],seed[1]]];
   let x=seed[0],y=seed[1],dir=(t==='plasma'||t==='neon')?-Math.PI/2:this.random(-Math.PI,Math.PI);
   for(let j=0;j<(t==='lightning'?10:16);j++){
    dir+=t==='lightning'?this.random(-.75,.75):this.random(-.19,.19);
    const step=t==='lightning'?this.random(9,22):this.random(11,21);
    let nx=x+Math.cos(dir)*step,ny=y+Math.sin(dir)*step;
    if(t==='lightning'&&!this.field.contains(nx,ny,70)){
      // Surface-conducting current: bend back across the real keyed body.
      dir=Math.atan2(b.y+b.h*.45-y,b.x+b.w*.5-x)+this.random(-.45,.45);
      nx=x+Math.cos(dir)*step;ny=y+Math.sin(dir)*step;
      if(!this.field.contains(nx,ny,45))break;
    }
    x=nx;y=ny;
    arr.push([x,y]);
   }
   if(arr.length<3)continue;this.arcs.push({pts:arr,phase:this.random(0,6.283),delay:this.random(0,.6),width:this.random(.8,2.2)});
  }
 }
 // Dynamic, noise-domain threshold matte: transparent geometry is intentional;
 // the RGB plate never becomes a hard uniform curtain.
 renderMaterialV35(progress,which='growth'){
  const p=clamp(progress),g=this.ctx;
  if(p>=.999){g.drawImage(this.seal,0,0);return;}
  if(p<=.002)return;
  const dat=this.maskPixels.data,levels=this.levels,shift=which==='break'?.06:0;
  for(let i=0;i<levels.length;i++){
   const k=i*4,v=clamp((p-levels[i]-shift)/.052+.50);
   dat[k]=dat[k+1]=dat[k+2]=255;dat[k+3]=(255*ease(v))|0;
  }
  this.maskCtx.putImageData(this.maskPixels,0,0);
  const wg=this.workCtx;wg.setTransform(1,0,0,1,0,0);wg.globalCompositeOperation='source-over';wg.clearRect(0,0,this.sw,this.sh);
  wg.drawImage(this.sealSmall,0,0);
  wg.globalCompositeOperation='destination-in';wg.imageSmoothingEnabled=true;wg.drawImage(this.maskCanvas,0,0,this.sw,this.sh);
  wg.globalCompositeOperation='source-over';g.drawImage(this.work,0,0,this.W,this.H);
 }
 drawTileMotionV35(q,incoming){
  const g=this.ctx,t=this.type;
  const end=incoming?1-q:q;
  for(const a of this.tiles){
   const start=a.delay*(incoming?.32:1);
   const f=clamp((end-start)/Math.max(.15,.88-start));
   const eased=ease(f),x=a.x+a.dx*eased*this.motion,y=a.y+a.dy*eased*this.motion;
   if(x<-a.w||x>this.W+a.w||y<-a.h||y>this.H+a.h)continue;
   const fading=incoming?ease((q-.02)/.23):1-ease((q-.79)/.21);
   if(fading<.006)continue;
   g.save();g.globalAlpha=fading;g.translate(x+a.w*.5,y+a.h*.5);
   if(t==='crystal')g.rotate(a.spin*eased);else g.translate(Math.sin(q*48+a.delay*13)*eased*5,0);
   const perspective=t==='crystal'?1+eased*.22:1;
   g.scale(perspective,perspective);g.drawImage(a.image,-a.w*.5,-a.h*.5);g.restore();
  }
 }
 drawParticlesV35(progress,incoming,age){
  const g=this.ctx,t=this.type,b=this.b;
  const target=incoming?1-progress:progress;
  const disperse=clamp(target),F=ease(disperse),N=this.particles.length;
  if(t==='crystal'||t==='glitch')this.drawTileMotionV35(progress,incoming);
  for(let i=0;i<N;i++){
   const o=this.particles[i],d=clamp((target-o.delay*.46)/Math.max(.4,.90-o.delay*.35));
   const r=ease(d),time=age*this.motion;
   const sway=Math.sin(o.phase+time*(t==='sand'?2.2:t==='petal'?1.4:1.8))*b.w*.018*o.flutter;
   const curlX=Math.sin(time*1.1+o.phase*1.7)*b.w*.025*r*r;
   const curlY=Math.cos(time*.83+o.phase)*b.h*.018*r;
   const xx=o.x+o.tx*r*this.motion+
    (t==='petal'||t==='shadow'||(t==='plasma'||t==='neon')?sway*r:0)+
    (t==='shadow'||(t==='plasma'||t==='neon')?curlX:0)+
    (t==='sand'?o.wind*b.w*r+Math.sin(time*1.7+o.phase)*b.w*.012*r:0);
   const yy=o.y+o.ty*r*this.motion+
    (t==='sand'?this.H*(o.gravity+.12)*r*r:0)+
    (t==='petal'?this.H*o.gravity*.12*r*r:0)+
    (t==='shadow'||(t==='plasma'||t==='neon')?curlY:0);
   if(xx<-90||xx>this.W+90||yy<-90||yy>this.H+90)continue;
   const visible=incoming?ease((progress-.015)/.28):1-ease((progress-.78)/.22);
   if(visible<=.01)continue;
   const sz=o.size*(t==='sand'?this.randomSafeV35(i)*3.9+1.4:t==='petal'?this.b.w*.056:t==='shadow'?this.b.w*.037:t==='holy'?this.b.w*.028:t==='glitch'?5:t==='lightning'?this.b.w*.015:this.b.w*.026);
   g.save();g.globalAlpha=clamp(visible*(.70+.26*o.depth));
   if(t==='sand'){
    g.fillStyle=i%5===0?'#f7d9a2':i%3===0?'#9d7046':this.colorCSS;
    const grain=Math.max(.7,sz*.40),flatten=.58+o.depth*.12;
    g.beginPath();g.ellipse(xx,yy,grain,grain*flatten,o.phase,0,Math.PI*2);g.fill();
    if(i%4===0){g.globalAlpha*=.38;g.fillStyle='#fff0ce';g.beginPath();g.ellipse(xx-grain*.22,yy-grain*.24,grain*.32,grain*.20,o.phase,0,Math.PI*2);g.fill()}
   }else if(t==='glitch'){
    g.fillStyle=i%3===0?'rgba(240,88,184,.82)':this.colorCSS;
    g.fillRect(xx,yy,sz*(i%2?2.1:1),sz*.58);
   }else if(t==='lightning'){
    g.globalCompositeOperation='screen';g.strokeStyle=i%4===0?'rgba(255,255,255,.9)':this.colorCSS;
    g.lineWidth=i%3===0?1.6:.8;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+Math.sin(age*11+o.phase)*sz*1.7,yy-sz*2.6);g.stroke();
   }else{
    const size=t==='shadow'?sz*1.9:t==='petal'?sz*1.75:t==='holy'?sz*.74:sz*.55;
    const rotate=o.spin*r+Math.sin(age*(t==='petal'?1.7:.8)+o.phase)*.34;
    g.translate(xx,yy);g.rotate(rotate);
    if(t==='holy'||(t==='plasma'||t==='neon'))g.globalCompositeOperation='screen';
    g.drawImage(this.sprite,-size*.52,-size*.52,size,size);
    if(t==='petal'&&i%4===0){g.globalAlpha*=.32;g.drawImage(this.sprite,-size*.50+4,-size*.50-4,size,size)}
   }
   g.restore();
  }
 }
 randomSafeV35(i){return hash(i,155,61)}
 drawEnergyV35(p,age,phase){
  const g=this.ctx,t=this.type,b=this.b,v=p;
  if(t==='lightning'){
   const active=phase==='cover'?ease(p):1-ease((p-.58)/.42);
   for(let i=0;i<this.arcs.length;i++){
    const arc=this.arcs[i],flicker=hash(i,Math.floor(age*16),842);
    if(flicker<.28||v<arc.delay*.35)continue;
    const length=arc.pts.length-1,visible=Math.floor(length*(.3+.7*ease((v-arc.delay*.3)/.42)));
    g.save();g.globalCompositeOperation='screen';g.strokeStyle=`rgba(${this.color.join(',')},${(active*.45).toFixed(3)})`;
    g.shadowColor=this.colorCSS;g.shadowBlur=8;g.lineWidth=arc.width*2.7;g.beginPath();
    for(let j=0;j<=visible;j++){
     const P=arc.pts[j],xx=P[0]+Math.sin(j*3+age*9+arc.phase)*3.2,yy=P[1];
     if(!j)g.moveTo(xx,yy);else g.lineTo(xx,yy);
    }g.stroke();g.shadowBlur=0;g.strokeStyle=`rgba(232,249,255,${(active*.83).toFixed(3)})`;g.lineWidth=Math.max(.6,arc.width*.85);g.stroke();g.restore();
   }
  }else if((t==='plasma'||t==='neon')){
   const A=phase==='cover'?ease(p):1-ease((p-.65)/.35);
   g.save();g.globalCompositeOperation='screen';
   // Six long, non-identical spline streams follow the silhouette's contours.
   // They do not form a repeated vertical spring or fill the whole browser.
   for(let i=0;i<6;i++){
    const shift=age*(.42+.07*i)*this.motion+i*1.13;
    const side=i%2===0?-1:1;
    const mag=.20+.04*Math.sin(shift*.7);
    g.beginPath();let x,y;
    for(let j=0;j<=42;j++){
     const v=j/42;
     const arc=Math.sin(v*Math.PI);
     const width=b.w*(mag+.09*Math.sin(v*5+shift*.9));
     x=b.x+b.w*.5+side*width*arc+Math.sin(v*7.5+shift)*b.w*.085*arc;
     y=b.y+b.h*(1.02-v*1.08)+Math.cos(v*4+shift)*b.h*.025*arc;
     if(!j)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.strokeStyle=`rgba(${this.color.join(',')},${(A*.20).toFixed(3)})`;g.shadowColor=this.colorCSS;g.shadowBlur=11;g.lineWidth=7;g.stroke();
    g.strokeStyle=`rgba(223,255,255,${(A*.65).toFixed(3)})`;g.lineWidth=1.3;g.shadowBlur=0;g.stroke();
   }g.restore();
  }else if(t==='holy'){
   const A=phase==='cover'?ease(p):1-ease((p-.55)/.45);
   g.save();g.globalCompositeOperation='screen';
   for(let i=0;i<15;i++){
    const x=b.x+b.w*(i+.5)/15+Math.sin(age*.7+i*2)*b.w*.045;
    const y=b.y+b.h*(1.10-(age*.12+i*.05)%1.2);
    const gr=g.createLinearGradient(x,y+this.H*.18,x,y-this.H*.35);
    gr.addColorStop(0,`rgba(${this.color.join(',')},0)`);
    gr.addColorStop(.42,`rgba(${this.color.join(',')},${(A*.28).toFixed(3)})`);
    gr.addColorStop(1,`rgba(${this.color.join(',')},0)`);
    g.strokeStyle=gr;g.lineWidth=i%4===0?3:1.2;g.beginPath();g.moveTo(x,y+this.H*.18);g.lineTo(x+Math.sin(age+i)*12,y-this.H*.35);g.stroke();
   }g.restore();
  }else if(t==='glitch'){
   g.save();g.globalCompositeOperation='screen';
   for(let i=0;i<15;i++){
    const y=b.y+((Math.floor(age*110)+i*39)%Math.max(1,b.h));
    const w=b.w*(.12+.58*hash(i,Math.floor(age*13),45));
    const x=b.x+b.w*hash(i,Math.floor(age*7),71);
    g.fillStyle=i%3===0?'rgba(239,84,183,.19)':'rgba(81,175,255,.13)';
    g.fillRect(x,y,w,1.5+(i%3));
   }g.restore();
  }
 }
 drawGlitchTearingV35(p,age){
  if(this.type!=='glitch'||p<=0)return;
  const g=this.ctx,b=this.b,frame=Math.floor(age*22);
  g.save();g.globalCompositeOperation='screen';
  for(let i=0;i<16;i++){
   const y=Math.floor(b.y+hash(i,frame,21)*b.h);
   const h=2+Math.floor(hash(i,frame,34)*b.h*.032);
   const x=Math.floor(b.x+b.w*hash(i,frame,41)*.62);
   const w=Math.floor(b.w*(.15+hash(i,frame,50)*.42));
   const displaced=(hash(i,frame,52)-.5)*28;
   g.globalAlpha=.15+.25*hash(i,frame,61);
   g.drawImage(this.seal,x,y,w,h,x+displaced,y,w,h);
   if(i%4===0){g.fillStyle='#e84da5';g.fillRect(x+displaced+3,y,w*.56,1.3)}
  }
  g.restore();
 }
 renderCover(p,age){
  this.renderMaterialV35(p,'growth');
  this.drawEnergyV35(p,age,'cover');
  this.drawGlitchTearingV35(p,age);
  if(p>.1)this.drawParticlesV35(p*.18,false,age);
 }
 renderPlay(t,direction,duration,age){
  const p=clamp(t/duration);if(p>=.999)return;
  const g=this.ctx;
  if(direction==='out'){
   const q=clamp(p/.78);
   this.renderMaterialV35(1-ease(q),'break');
   this.drawParticlesV35(q,false,age);
   this.drawEnergyV35(q,age,'release');this.drawGlitchTearingV35(1-q,age);
  }else{
   const build=this.config.inBuild,exit=.72;
   if(p<build){
    const a=clamp(p/build),assemble=ease((a-.23)/.77);
    this.drawParticlesV35(a,true,age);
    this.renderMaterialV35(assemble,'growth');
    this.drawEnergyV35(a,age,'cover');
   }else if(p<exit){
    g.drawImage(this.seal,0,0);this.drawEnergyV35(.82,age,'cover');
   }else{
    const q=clamp((p-exit)/(.955-exit));
    this.renderMaterialV35(1-ease(q),'break');
    this.drawParticlesV35(q,false,age);
    this.drawEnergyV35(q,age,'release');
   }
  }
 }
 getState(){return {type:this.type,coverage:this.coverage,particles:this.particles.length,tiles:this.tiles.length,arcCount:this.arcs.length,renderer:'v3.5 material-specific'};}
 dispose(){this.particles.length=0;this.tiles.length=0;this.arcs.length=0;this.work.width=1;this.seal.width=1;this.sealSmall.width=1;this.maskCanvas.width=1;}
}
function pathLine(g,p,age){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0]+Math.sin(age*2+i)*1.5,p[i][1]);}
root.SCExpansion={TYPES,keys,create:(effect,options)=>new Effect(effect,options)};
})(window);
