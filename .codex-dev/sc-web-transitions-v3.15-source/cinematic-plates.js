/* SC Web Transitions v3.15: cinematic simulation plate playback engine.
 * The footage is an offline-created, transparent VP9 WebM animation from a
 * professionally simulated source (EmberGen/Houdini/Blender). This engine does
 * not invent/synthesize fluid simulation. No sample stock footage bundled.
 * Three clips per effect: COVER (ends opaque at the handoff), RELEASE (starts
 * opaque and clears), IN (starts opaque and clears). Playback follows OBS
 * transition progress, with an alpha coverage readback before camera-off.
 */
(function(root){'use strict';
 const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
 const phases=['cover','release','in'];
 const keys=['smoke','toxic'];
 const videoURL=(effect,phase)=>'/cinematic-plates/'+effect+'_'+phase+'.webm';
 function canPlay(){const v=document.createElement('video');return !!v.canPlayType('video/webm; codecs="vp9"')}
 function loadVideo(src){return new Promise((resolve,reject)=>{
   const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.loop=false;v.crossOrigin='anonymous';
   let finished=false;
   const done=(err)=>{if(finished)return;finished=true;clearTimeout(timeout);v.removeEventListener('loadeddata',ok);v.removeEventListener('error',fail);err?reject(err):resolve(v)};
   const ok=()=>done(),fail=()=>done(new Error('Cinematic plate cannot decode '+src));
   const timeout=setTimeout(()=>done(new Error('Cinematic plate load timed out '+src)),6500);
   v.addEventListener('loadeddata',ok);v.addEventListener('error',fail);
   v.src=src;v.load();
 })}
 class Renderer{
  constructor(){
   this.canvas=document.createElement('canvas');this.canvas.id='sc-cinematic-plates';
   this.canvas.style.cssText='position:absolute;inset:0;z-index:7;width:100%;height:100%;display:none;background:transparent;pointer-events:none';
   document.body.appendChild(this.canvas);
   this.ctx=this.canvas.getContext('2d',{alpha:true,desynchronized:true,willReadFrequently:false});
   if(!this.ctx)throw Error('2D cinematic plate compositor unavailable');
   this.ready=false;this.isReady=false;this.videos={};this.active=null;this.phase='';this.frames=0;this.errors=[];
  }
  async prepare(effect,W,H){
   if(!keys.includes(effect))throw Error('Unknown plate effect');
   if(!canPlay())throw Error('VP9 WebM unsupported by OBS browser runtime');
   this.effect=effect;this.W=W;this.H=H;this.canvas.width=W;this.canvas.height=H;
   // HEAD requests identify missing assets early, avoiding decoder stalls.
   const res=await Promise.all(phases.map(phase=>fetch(videoURL(effect,phase),{method:'HEAD',cache:'no-store'})));
   if(res.some(r=>!r.ok))throw Error('Professional cinematic plates not installed for '+effect);
   const loaded=await Promise.all(phases.map(phase=>loadVideo(videoURL(effect,phase))));
   for(let i=0;i<phases.length;i++)this.videos[phases[i]]=loaded[i];
   this.ready=true;this.isReady=true;this.clear();return true;
  }
  clear(){const c=this.ctx;if(!c)return;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,this.canvas.width,this.canvas.height)}
  draw(progress,phase,targetSeconds){
   if(!this.isReady||!phases.includes(phase))throw Error('Cinematic plate not ready');
   const p=clamp(progress),v=this.videos[phase];
   if(!v||v.readyState<2)throw Error('Cinematic plate frame not ready');
   if(this.phase!==phase){
    if(this.active){this.active.pause();this.active.playbackRate=1}
    this.phase=phase;this.active=v;
    try{v.currentTime=0}catch(_){}
   }
   const seconds=Math.max(.2,Number(targetSeconds)||3);
   const duration=Math.max(.1,v.duration||seconds);
   const rate=clamp(duration/seconds,.25,4);
   if(Math.abs(v.playbackRate-rate)>.02)v.playbackRate=rate;
   const goal=clamp(p*duration,0,Math.max(0,duration-.035));
   if(Math.abs(v.currentTime-goal)>.28){try{v.currentTime=goal}catch(_){}}
   if(p>=.998){v.pause();if(Math.abs(v.currentTime-goal)>.05)try{v.currentTime=goal}catch(_){}}
   else if(v.paused){const promise=v.play();if(promise&&promise.catch)promise.catch(e=>{this.errors.push(String(e))})}
   this.clear();this.canvas.style.display='block';
   // Preserve RGBA from the decoded professional plate; never flatten to black.
   this.ctx.drawImage(v,0,0,this.W,this.H);this.frames++;return true;
  }
  measureCoverage(field){
   if(!this.isReady||!field)return 0;
   // Small alpha probe of the *actual composited plate*; camera isn't hidden
   // unless this passes. No software-synthesized silhouette guard.
   const w=Math.min(this.W,384),h=Math.max(1,Math.round(w*this.H/this.W));
   if(!this.probe){this.probe=document.createElement('canvas');this.probe.width=w;this.probe.height=h;this.probeCtx=this.probe.getContext('2d',{willReadFrequently:true})}
   this.probeCtx.clearRect(0,0,w,h);this.probeCtx.drawImage(this.canvas,0,0,w,h);
   const pixels=this.probeCtx.getImageData(0,0,w,h).data;
   let total=0,covered=0;
   for(let y=1;y<field.mh-1;y+=2)for(let x=1;x<field.mw-1;x+=2){
    if(field.map[(y*field.mw+x)*4+3]<196)continue;
    total++;const sx=Math.min(w-1,Math.floor((x+.5)/field.mw*w)),sy=Math.min(h-1,Math.floor((y+.5)/field.mh*h));
    if(pixels[4*(sy*w+sx)+3]>=250)covered++;
   }
   return total?covered/total:0;
  }
  hide(){this.canvas.style.display='none';this.clear();if(this.active)this.active.pause()}
  dispose(){this.hide();for(const v of Object.values(this.videos)){v.pause();v.removeAttribute('src');v.load()}
    this.videos={};this.isReady=false;this.ready=false;this.canvas.remove();}
  diagnostics(){return {mode:'Professional simulated RGBA WebM plates',effect:this.effect,frames:this.frames,loaded:phases.filter(p=>!!this.videos[p]),decoderErrors:this.errors.slice(-2)}}
 }
 root.SCCinematicPlates={Renderer,formats:['webm-vp9-alpha'],phases};
})(window);
