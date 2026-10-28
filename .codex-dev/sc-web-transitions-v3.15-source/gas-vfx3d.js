/* SC Web Transitions Smoke / Toxic renderer.
 * Buoyant, domain-warped gas volume ray-marched in WebGL2. Smoke and Toxic use
 * separate rise, spread, density and lighting profiles. This is procedural,
 * not a fluid solver. The OBS compositor still verifies visible coverage.
 */
(function(root){'use strict';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const qualityMap=Object.freeze({Performance:{scale:.40,steps:22,lightSteps:1,detail:0},Balanced:{scale:.55,steps:30,lightSteps:1,detail:1},Cinematic:{scale:.72,steps:42,lightSteps:2,detail:1},Ultra:{scale:1,steps:60,lightSteps:3,detail:1}});
const vert=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPosition;
out vec2 vUV;
void main(){vUV=(aPosition+1.)*.5;gl_Position=vec4(aPosition,0.,1.);}`;
const frag=`#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUV;
uniform vec2 uResolution;
uniform sampler3D uNoise;
uniform sampler2D uSilhouette;
uniform vec4 uBounds;
uniform float uTime;
uniform float uProgress;
uniform float uCover;
uniform float uToxic;
uniform float uDensity;
uniform float uSteps;
uniform float uLightSteps;
uniform float uDetail;
out vec4 outColor;
float sat(float x){return clamp(x,0.,1.);}
float noise3(vec3 p){return texture(uNoise,p).r;}
// The release starts with the exact cover density. Its velocity continues on
// the same monotonic time field while emission stops and extinction decays.
float sealStrength(float p){return uCover>.5?smoothstep(.48,.98,p):1.-smoothstep(.04,.74,p);}
vec3 advect(vec3 p){
 float t=uTime,heavy=uToxic;
 float rise=mix(.22,.11,heavy);
 // Rotating eddies act in all three dimensions. Vertical translation alone
 // made the previous field read as a textured upright curtain.
 vec3 q=p*vec3(2.9,2.7,3.1)+vec3(0.,t*rise,0.);
 float roll=sin(q.y*2.3+q.z*1.7-t*mix(.75,.43,heavy));
 // ABC-style divergence-free curl: each component is independent of its own
 // coordinate. Bounded displacement avoids stretched horizontal striations.
 vec3 curl=vec3(sin(q.z*1.7+t*.19)+cos(q.y*1.9-t*.11),
                sin(q.x*1.8-t*.14)+cos(q.z*1.7+t*.16),
                sin(q.y*1.9+t*.13)+cos(q.x*1.8-t*.17));
 q+=curl*mix(.19,.28,heavy);
 vec3 warp=vec3(noise3(q*.67+vec3(.17,t*.016,.39)),
                noise3(q*.61+vec3(.51,.23,-t*.012)),
                noise3(q*.73+vec3(.09,.63,t*.019)))-.5;
 q+=warp*mix(.63,.9,heavy)+vec3(roll*.12,0.,roll*.08);
 return q;
}
float plumeDensity(vec3 p,float seal,float front,float detail){
 vec3 q=advect(p);
 float macro=noise3(q*.58),fold=noise3(q*1.37+vec3(.31,.11,.47));
 float micro=detail>.5?noise3(q*3.73+vec3(.07,.43,.23)):.5;
 float structure=sat((macro*.48+fold*.36+micro*.16-.29)*2.65);
 vec2 c=uBounds.xy+uBounds.zw*.5;
 float edge=10.,span=max(.17,uBounds.z),height=max(.24,uBounds.w);
 float release=uCover>.5?0.:sat(uProgress);
 // Staggered puffs occupy independent positions and depths, rather than
 // copying the keyed portrait. Their optical depth conceals the source.
 for(int k=0;k<9;k++){
  float id=float(k),phase=id*2.39996,layer=floor(id/3.);
  float row=mod(id,3.)-1.;
  float rising=clamp(1.16-front,0.,1.6);
  float inertia=mix(.15,.09,uToxic);
  float curl=sin(uTime*inertia+phase+rising*.8);
  vec3 cell=vec3(c.x+row*span*.45+curl*span*.18,
                uBounds.y+height*(.05+layer*.45)+(1.-seal)*height*.22,
                .47+.19*sin(phase+uTime*inertia*.7));
  cell.x+=release*release*span*(row*.85+sin(phase)*.6);
  cell.y-=release*release*height*(.6+.32*layer);
  vec3 radius=vec3(span*(.57+.11*cos(phase)),
                   height*(.40+.07*sin(phase+1.)),.37+.07*cos(phase));
  radius*=mix(.68,1.18,seal);
  vec3 offset=p-cell;
  float angle=curl*.45;
  offset.xy=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*offset.xy;
  float shape=length(offset/radius)+(macro-.5)*.42+(fold-.5)*.22;
  float merge=sat(.5+.5*(shape-edge)/.32);
  edge=mix(shape,edge,merge)-.32*merge*(1.-merge);
 }
 float leading=front+(macro-.5)*.25+sin(p.x*12.+p.z*9.+uTime*.4)*.045;
 float rising=smoothstep(leading-.18,leading+.14,p.y);
 float billow=1.-smoothstep(.58,1.22,edge);
 float turbulence=.30+.95*smoothstep(.15,.80,structure);
 float density=billow*billow*rising*turbulence;
 density*=mix(.86+.25*fold,1.03+.24*macro,uToxic);
 // Dense gas hugs the lower emission region; soot has faster, finer wisps.
 density*=mix(1.,.85+.15*smoothstep(.05,.9,p.y),uToxic);
 float depthStart=.055+smoothstep(.22,.76,macro)*.36;
 float depthEdge=smoothstep(depthStart,depthStart+.12,p.z)*(1.-smoothstep(.82+(fold-.5)*.24,1.,p.z));
 return max(0.,density*depthEdge);
}
float shadowTransmittance(vec3 p,float seal,float front,vec3 lightDir){
 float optical=0.;
 for(int j=0;j<4;j++){
  if(float(j)>=uLightSteps)break;
  float d=(float(j)+.7)*.075;
  optical+=plumeDensity(p+lightDir*d,seal,front,0.)*.65;
 }
 return exp(-optical*2.1);
}
void main(){
 vec2 screen=vec2(vUV.x,1.-vUV.y);
 float p=sat(uProgress),seal=sealStrength(p);
 float release=uCover>.5?0.:p;
 float survival=uCover>.5?smoothstep(0.,.055,p):pow(1.-smoothstep(.03,1.,p),2.6);
 if(survival<.00001){outColor=vec4(0.);return;}
 float front=uCover>.5?mix(1.20,-.27,smoothstep(0.,1.,p)):-.27;
 vec2 center=uBounds.xy+uBounds.zw*.5;
 vec3 lightDir=normalize(vec3(-.65,-.65,.32));
 vec3 radiance=vec3(0.);float transmittance=1.;
 // Stable subpixel dithering removes ray-step bands without temporal sparkle.
 float jitter=.5+(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.36;
 for(int i=0;i<60;i++){
  if(float(i)>=uSteps)break;
  float z=(float(i)+jitter)/uSteps;
  // A pinhole ray with 35 mm style perspective, looking into the plume.
  vec2 projected=center+(screen-center)*(.91+z*.18);
  projected.x+=release*release*(.12+z*.07);
  projected.y+=release*release*.32;
  vec3 world=vec3(projected,z);
  float density=plumeDensity(world,seal,front,uDetail)*survival;
  if(density<.002)continue;
  // Leave an optical-density margin at the thin edge lobes. The minimum-alpha
  // reduction rejects even isolated subpixel holes, including full-canvas masks.
  float extinction=density*uDensity*29./uSteps;
  float segment=1.-exp(-extinction);
  float light=shadowTransmittance(world,seal,front,lightDir);
  float forward=.65+.35*pow(max(0.,dot(-lightDir,normalize(vec3(screen-center,1.)))),4.);
  vec3 ambient=mix(vec3(.035,.042,.054),vec3(.020,.039,.010),uToxic);
  vec3 key=mix(vec3(.62,.67,.72),vec3(.52,.69,.28),uToxic);
  vec3 color=ambient+key*pow(light,1.65)*forward*(.27+.97*smoothstep(.06,.5,density));
  // A broad cool skylight enters from the rear, so shadowed folds retain depth
  // instead of all collapsing to the same neutral grey during full coverage.
  color+=mix(vec3(.035,.065,.095),vec3(.014,.045,.006),uToxic)*(1.-light)*(.4+.6*world.z);
  // Secondary cool rim scatters through thin smoke; toxic uses an internal,
  // slowly rolling green source that remains restrained in dense regions.
  float rim=pow(max(0.,1.-density),2.)*.12;
  color+=mix(vec3(.17,.24,.30),vec3(.08,.18,.016),uToxic)*rim;
  float glow=noise3(advect(world)*.49+vec3(.7,.1,.4));
  color+=uToxic*vec3(.075,.25,.008)*smoothstep(.44,.76,glow)*(.35+world.y*.65);
  radiance+=color*segment*transmittance;
  transmittance*=1.-segment;
  if(transmittance<.001)break;
 }
 float alpha=1.-transmittance;
 // Straight alpha is deliberate: OBS performs the final compositor multiply.
 outColor=vec4(clamp(radiance/max(alpha,.00001),vec3(0.),vec3(1.)),alpha);
}`;
function compile(gl,type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Smoke GPU shader: '+e)}return sh}
function createProgram(gl){const v=compile(gl,gl.VERTEX_SHADER,vert),f=compile(gl,gl.FRAGMENT_SHADER,frag),prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);gl.linkProgram(prog);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('Smoke GPU shader link: '+gl.getProgramInfoLog(prog));return prog}
// 3D noise volume seeded at preparation time, no per-frame CPU pixel synthesis.
const noiseCache=new Map();
function volumeBytes(n){if(noiseCache.has(n))return noiseCache.get(n);const data=new Uint8Array(n*n*n),hash=(x,y,z)=>{let h=Math.imul(x+13,374761393)^Math.imul(y+23,668265263)^Math.imul(z+37,1442695041);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295};const smooth=t=>t*t*(3-2*t);const rand=(x,y,z)=>hash((x+n)%n,(y+n)%n,(z+n)%n);
 function sample(x,y,z,step){const a=Math.floor(x/step),b=Math.floor(y/step),c=Math.floor(z/step),u=smooth((x-a*step)/step),v=smooth((y-b*step)/step),w=smooth((z-c*step)/step);const H=(i,j,k)=>rand(((i%(n/step))+(n/step))%(n/step),((j%(n/step))+(n/step))%(n/step),((k%(n/step))+(n/step))%(n/step));const L=(a,b,t)=>a+(b-a)*t;return L(L(L(H(a,b,c),H(a+1,b,c),u),L(H(a,b+1,c),H(a+1,b+1,c),u),v),L(L(H(a,b,c+1),H(a+1,b,c+1),u),L(H(a,b+1,c+1),H(a+1,b+1,c+1),u),v),w)}
 let k=0;for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const val=.52*sample(x,y,z,16)+.30*sample(x,y,z,8)+.18*sample(x,y,z,4);data[k++]=Math.round(Math.max(0,Math.min(1,val))*255)}noiseCache.set(n,data);return data;}
class Renderer{
 constructor(){this.canvas=document.createElement('canvas');this.canvas.id='sc-raymarched-gas';this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:5;background:transparent;display:none;pointer-events:none';document.body.appendChild(this.canvas);this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl){this.canvas.remove();throw Error('WebGL2 unavailable for gas volume')}this.isReady=false;this.contextLost=false;this.frames=0;this.gpuSamples=[];this.cpuSamples=[];this.pendingQueries=[];this.timer=this.gl.getExtension('EXT_disjoint_timer_query_webgl2');this.lost=e=>{e.preventDefault();this.contextLost=true;this.isReady=false;this.canvas.style.display='none'};this.canvas.addEventListener('webglcontextlost',this.lost)}
 prepare(subject,W,H,quality,effect,intensity){const gl=this.gl;if(this.contextLost)throw Error('Smoke GPU context lost');this.W=W;this.H=H;this.quality=qualityMap[quality]?quality:'Cinematic';this.cfg=qualityMap[this.quality];this.effect=effect;this.intensity=clamp((Number.isFinite(intensity)?intensity:78)/100,.15,1);const actualScale=Math.min(this.cfg.scale,1920/W,1080/H);this.canvas.width=Math.max(1,Math.round(W*actualScale));this.canvas.height=Math.max(1,Math.round(H*actualScale));gl.viewport(0,0,this.canvas.width,this.canvas.height);if(!this.program)this.program=createProgram(gl);
 const quad=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]);if(!this.vbo)this.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);gl.bufferData(gl.ARRAY_BUFFER,quad,gl.STATIC_DRAW);if(!this.vao)this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 const n=64;const uploadNoise=!this.noise;if(uploadNoise)this.noise=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,this.noise);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.REPEAT);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);if(uploadNoise)gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,n,n,n,0,gl.RED,gl.UNSIGNED_BYTE,volumeBytes(n));
 if(!this.silhouette)this.silhouette=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const mw=192,mh=Math.max(60,Math.round(mw*H/W)),c=document.createElement('canvas');c.width=mw;c.height=mh;
 const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(subject,0,0,mw,mh);
 const data=cx.getImageData(0,0,mw,mh).data,mono=new Uint8Array(mw*mh*4);
 let minX=mw,minY=mh,maxX=-1,maxY=-1;
 for(let i=0;i<mw*mh;i++){
  const px=i%mw,py=Math.floor(i/mw),alpha=data[4*i+3];
  if(alpha>100){minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py)}
  let a=0;
  for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){
   const xx=px+ox,yy=py+oy;
   if(xx>=0&&xx<mw&&yy>=0&&yy<mh)a=Math.max(a,data[4*(yy*mw+xx)+3]);
  }
  a=a>100?255:0;mono[4*i]=mono[4*i+1]=mono[4*i+2]=mono[4*i+3]=a;
 }
 this.maskBoundsFound=maxX>=minX&&maxY>=minY;
 this.bounds=this.maskBoundsFound?[minX/mw,minY/mh,(maxX-minX+1)/mw,(maxY-minY+1)/mh]:[0,0,1,1];
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,mw,mh,0,gl.RGBA,gl.UNSIGNED_BYTE,mono);
 gl.useProgram(this.program);this.uniforms={};for(const name of ['uResolution','uNoise','uSilhouette','uBounds','uTime','uProgress','uCover','uToxic','uDensity','uSteps','uLightSteps','uDetail'])this.uniforms[name]=gl.getUniformLocation(this.program,name);this.isReady=true;for(const q of this.pendingQueries)gl.deleteQuery(q);this.pendingQueries.length=0;this.lastAge=0;this.frames=0;this.cpuSamples.length=0;this.gpuSamples.length=0;this.draw(.72,true,0);
 if(root.SCGPU3D&&root.SCGPU3D.CoverageProbe){
  if(!this.coverageProbe)this.coverageProbe=new root.SCGPU3D.CoverageProbe(gl);
  this.coverageProbe.invalidate();
  this.coverageProbe.measure({map:mono,mw,mh},this.canvas.width,this.canvas.height);
  this.coverageProbe.invalidate();
 }
 this.hide();return true;
 }
 clear(){if(!this.isReady)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
 draw(progress,cover,age){if(!this.isReady)throw Error('Smoke raymarcher not ready');const began=performance.now();const gl=this.gl;this.pollTimers();age=Math.max(this.lastAge,Number.isFinite(age)?age:0);this.lastAge=age;this.canvas.style.display='block';this.clear();if(progress>=1&&!cover)return true;gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,this.noise);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.uniform1i(this.uniforms.uNoise,0);gl.uniform1i(this.uniforms.uSilhouette,1);gl.uniform2f(this.uniforms.uResolution,this.W,this.H);gl.uniform4f(this.uniforms.uBounds,...this.bounds);gl.uniform1f(this.uniforms.uTime,age);gl.uniform1f(this.uniforms.uProgress,clamp(progress));gl.uniform1f(this.uniforms.uCover,cover?1:0);gl.uniform1f(this.uniforms.uToxic,this.effect==='toxic'?1:0);gl.uniform1f(this.uniforms.uDensity,.90+.45*this.intensity);gl.uniform1f(this.uniforms.uSteps,this.cfg.steps);gl.uniform1f(this.uniforms.uLightSteps,this.cfg.lightSteps);gl.uniform1f(this.uniforms.uDetail,this.cfg.detail);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);const query=this.timer&&this.pendingQueries.length<4?gl.createQuery():null;if(query)gl.beginQuery(this.timer.TIME_ELAPSED_EXT,query);gl.drawArrays(gl.TRIANGLES,0,6);if(query){gl.endQuery(this.timer.TIME_ELAPSED_EXT);this.pendingQueries.push(query)}gl.bindVertexArray(null);this.frames++;this.cpuSamples.push(performance.now()-began);if(this.cpuSamples.length>180)this.cpuSamples.shift();return true;}
 pollTimers(){const gl=this.gl;if(!this.timer)return;const disjoint=gl.getParameter(this.timer.GPU_DISJOINT_EXT);while(this.pendingQueries.length){const q=this.pendingQueries[0];if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))break;this.pendingQueries.shift();if(!disjoint){this.gpuSamples.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);if(this.gpuSamples.length>180)this.gpuSamples.shift()}gl.deleteQuery(q)}if(disjoint)this.gpuSamples.length=0;}
 measureCoverage(field){
  if(!this.isReady||this.contextLost||!field||!field.map)return 0;
  // Min-reduce every rendered camera pixel on the GPU. The old nearest-blit
  // probe could miss one-pixel holes; this reads only the final four bytes.
  if(!root.SCGPU3D||!root.SCGPU3D.CoverageProbe)return 0;
  if(!this.coverageProbe)this.coverageProbe=new root.SCGPU3D.CoverageProbe(this.gl);
  return this.coverageProbe.measure(field,this.canvas.width,this.canvas.height);
 }
 measureCoverageAsync(field){
  if(!this.isReady||this.contextLost||!field||!field.map||!root.SCGPU3D||!root.SCGPU3D.CoverageProbe)return {ready:true,ratio:0};
  if(!this.coverageProbe)this.coverageProbe=new root.SCGPU3D.CoverageProbe(this.gl);
  return this.coverageProbe.sampleAsync(field,this.canvas.width,this.canvas.height);
 }

 hide(){if(this.coverageProbe)this.coverageProbe.cancelPending();this.canvas.style.display='none';this.clear()}
 dispose(){const gl=this.gl;if(!gl)return;if(!this.contextLost){this.hide();if(this.noise)gl.deleteTexture(this.noise);if(this.silhouette)gl.deleteTexture(this.silhouette);if(this.vbo)gl.deleteBuffer(this.vbo);if(this.vao)gl.deleteVertexArray(this.vao);if(this.program)gl.deleteProgram(this.program);if(this.coverageProbe)this.coverageProbe.dispose();for(const q of this.pendingQueries)gl.deleteQuery(q)}this.canvas.removeEventListener('webglcontextlost',this.lost);this.isReady=false;this.pendingQueries.length=0;this.program=this.vbo=this.vao=this.noise=this.silhouette=this.coverageProbe=null;this.canvas.remove();}
 diagnostics(){const percentile=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]:null;return {mode:'WebGL2 rolling 3D emitter volume',quality:this.quality,steps:this.cfg&&this.cfg.steps,lightSteps:this.cfg&&this.cfg.lightSteps,detailOctaves:this.cfg&&this.cfg.detail?3:2,resolution:this.canvas.width+'×'+this.canvas.height,frames:this.frames,contextLost:this.contextLost,effect:this.effect,maskBoundsFound:this.maskBoundsFound,maskBounds:this.bounds,simulatedFluid:false,alpha:true,coverageVerifiedExternally:true,coverageProbe:this.coverageProbe&&this.coverageProbe.diagnostics(),gpuTimerAvailable:!!this.timer,gpuMsP50:percentile(this.gpuSamples,.5),gpuMsP95:percentile(this.gpuSamples,.95),cpuSubmitMsP95:percentile(this.cpuSamples,.95),gpuSamples:this.gpuSamples.length,pendingQueries:this.pendingQueries.length}}

}
root.SCGasVolume={Renderer,qualityMap,shaders:{vert,frag}};
})(window);
