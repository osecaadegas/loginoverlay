/* SC Premium VFX 3.8: authored crystal accent meshes rendered as GPU instances.
 * Meshes are generated offline and exported as GLB and as exact equivalent
 * Float32 vertex streams in premium-vfx-meshes.js. No runtime mesh tessellation.
 */
(function(root){'use strict';
const C=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 iOrigin;
layout(location=4) in vec4 iMotion;
uniform vec2 uResolution;
uniform float uProgress;
uniform float uStage;
uniform float uClock;
out vec3 vNormal;
out vec2 vUV;
out float vAlpha;
out float vSeed;
out float vDepth;
float ease(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
mat3 rotate(float x,float y,float z){float cx=cos(x),sx=sin(x),cy=cos(y),sy=sin(y),cz=cos(z),sz=sin(z);return
 mat3(cz*cy,sz*cy,-sy,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx);}
void main(){
 float p=uProgress,delay=iMotion.w,seed=iOrigin.w;
 float build=1.,travel=0.,alpha=1.;
 if(uStage<.5){
  float q=clamp((p-delay*.36)/max(.20,.83-delay*.36),0.,1.);
  build=ease(q);alpha=ease(q/.28);
 }else if(uStage<1.5){
  float q=clamp((p-.12-delay*.10)/max(.18,.88-delay*.10),0.,1.);
  travel=ease(q);alpha=1.-ease((q-.79)/.21);
 }else{
  if(p<.64){
   float q=clamp((p/.64-delay*.15)/max(.22,1.-delay*.15),0.,1.);
   travel=1.-ease(q);alpha=ease((p-delay*.04)/.22);
  }else if(p<.73){travel=0.;alpha=1.;}
  else{float q=clamp((p-.73)/.27,0.,1.);travel=ease(q);alpha=1.-ease((q-.80)/.20);}
 }
 // Metal/mineral hero spikes grow from the silhouette and retain thickness.
 vec3 local=aPos*iOrigin.z*build;
 float rx=seed*5.9+travel*(1.7+seed),ry=seed*9.7+travel*(2.1+seed*.7);
 mat3 R=rotate(rx*.23+travel*.9,ry*.25+travel*.8,(seed-.5)*.72+travel*3.2);
 vec3 world=vec3(iOrigin.xy,-18.-iOrigin.z*.28)+R*local;
 vec2 escape=iMotion.xy*travel;
 world.xy+=escape;
 world.z+=iMotion.z*travel;
 // Depth/parallax is based on the 3D mesh, not painted flat perspective.
 float focal=max(uResolution.x*.86,700.);
 float perspective=clamp(focal/(focal+world.z),.36,3.4);
 vec2 px=(world.xy-uResolution*.5)*perspective+uResolution*.5;
 gl_Position=vec4(px.x/uResolution.x*2.-1.,1.-px.y/uResolution.y*2.,clamp(-world.z/4600.,-.9,.9),1.);
 vNormal=normalize(R*aNormal);vUV=aUV;vAlpha=alpha;vSeed=seed;vDepth=world.z;
}`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vNormal;in vec2 vUV;in float vAlpha;in float vSeed;in float vDepth;
uniform vec3 uAccent;uniform float uClock;
out vec4 outColor;
float hash(float v){return fract(sin(v*127.31)*43827.533);}
void main(){
 if(vAlpha<.004)discard;
 vec3 n=normalize(vNormal);
 vec3 l=normalize(vec3(-.51,-.69,.57));
 vec3 h=normalize(l+vec3(0.,0.,1.));
 float d=max(0.,dot(n,l));
 float sparkle=pow(max(0.,dot(n,h)),85.);
 float fres=pow(1.-abs(n.z),3.5);
 float seam=pow(abs(sin(vUV.x*6.28318*7.+vUV.y*20.+vSeed*20.)),22.);
 float band=pow(.5+.5*sin(vUV.y*17.+vUV.x*14.+vSeed*44.),13.);
 float micro=.85+.15*hash(floor(vUV.y*54.)+floor(vUV.x*35.)*19.+vSeed*62.);
 vec3 base=mix(vec3(.12,.075,.26),uAccent*.71+.10,.43+.42*hash(vSeed*19.));
 vec3 c=base*(.20+.77*d)*micro;
 c+=vec3(.55,.70,.87)*sparkle*1.05;
 c+=vec3(.12,.31,.52)*fres*.80;
 c+=vec3(.22,.22,.36)*seam*.10+vec3(.29,.42,.70)*band*.20;
 float glint=pow(max(0.,sin(vSeed*39.+uClock*1.75)),50.);
 c+=glint*vec3(.23,.35,.55);
 float fog=clamp(1.-max(vDepth,0.)/2100.,.61,1.);
 outColor=vec4(clamp(c*fog,0.,1.),vAlpha);
}`;
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Premium Crystal shader: '+gl.getShaderInfoLog(s));return s;}
function makeProgram(gl){const v=shader(gl,gl.VERTEX_SHADER,VERT),f=shader(gl,gl.FRAGMENT_SHADER,FRAG),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Premium Crystal link: '+gl.getProgramInfoLog(p));return p;}
function rnd(seed){let x=seed>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
class PremiumAccents{
 constructor(gl,fx){
  if(!root.SCPremiumMeshes)throw Error('Premium 3D asset library was not loaded');
  this.gl=gl;this.program=makeProgram(gl);this.w=fx.W;this.h=fx.H;this.meshes=[];
  this.locations={};this.color=this.colorFrom(fx.tuning.accent||fx.config.color);
  const rand=rnd(((fx.o&&fx.o.seed)||13579)^0x2f173f5a),b=fx.b;
  const quality={Performance:17,Balanced:24,Cinematic:34,Ultra:48}[fx.quality]||34;
  const total=Math.min(72,Math.max(9,Math.round(quality*C(fx.detail||1,.45,1.65))));
  const groups=Array.from({length:8},()=>[]);
  let accepted=0;
  for(let i=0;i<total*14&&accepted<total;i++){
   const point=fx.field.points[Math.floor(rand()*fx.field.points.length)];if(!point)break;
   // Keep the largest clusters near shoulders and torso, but permit fragments
   // and extrusions to protrude outside the original alpha during the breakup.
   const rx=(point[0]-(b.x+b.w*.5))/Math.max(1,b.w);
   const ry=(point[1]-(b.y+b.h*.48))/Math.max(1,b.h);
   const scale=Math.min(fx.W,fx.H)*(.055+rand()*.070)*(rand()<.11?1.34:1);
   const dx=(rx*1.9+(rand()-.5)*.6)*fx.W*(.62+rand()*.32);
   const dy=(ry*1.7+(rand()-.5)*.5)*fx.H*(.64+rand()*.42);
   const dz=(rand()-.3)*Math.min(fx.W,fx.H)*1.1;
   const group=Math.floor(rand()*8);
   groups[group].push(point[0],point[1],scale,rand(),dx,dy,dz,rand());accepted++;
  }
  this.instances=accepted;
  this.instanceBuffers=[];
  for(let i=0;i<8;i++){
   const data=new Float32Array(groups[i]);if(!data.length)continue;
   const mesh=root.SCPremiumMeshes.get('crystal_'+String(i).padStart(2,'0'));
   if(!mesh)throw Error('Premium crystal mesh '+i+' missing');
   const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
   const inst=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,inst);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   this.meshes.push({vbo,inst,vertices:mesh.length/8,instances:data.length/8});this.instanceBuffers.push(vbo,inst);
  }
  this.triangles=this.meshes.reduce((sum,m)=>sum+m.vertices*m.instances/3,0);
 }
 colorFrom(h){if(!/^#[0-9a-f]{6}$/i.test(h||''))h='#aa77ef';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)}
 uniform(name,type,...vals){const gl=this.gl,p=this.program;if(!(name in this.locations))this.locations[name]=gl.getUniformLocation(p,name);const u=this.locations[name];if(u===null)return;if(type==='1f')gl.uniform1f(u,vals[0]);else if(type==='2f')gl.uniform2f(u,...vals);else if(type==='3f')gl.uniform3f(u,...vals)}
 render(stage,p,age){const gl=this.gl;if(!this.meshes.length)return;
  gl.useProgram(this.program);gl.disable(gl.DEPTH_TEST);
  this.uniform('uStage','1f',stage==='cover'?0:stage==='out'?1:2);
  this.uniform('uProgress','1f',p);this.uniform('uClock','1f',age);
  this.uniform('uResolution','2f',this.w,this.h);this.uniform('uAccent','3f',...this.color);
  for(const mesh of this.meshes){
   gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);
   for(const [index,n,offset] of [[0,3,0],[1,3,3],[2,2,6]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,n,gl.FLOAT,false,32,offset*4);gl.vertexAttribDivisor(index,0)}
   gl.bindBuffer(gl.ARRAY_BUFFER,mesh.inst);
   for(const [index,off] of [[3,0],[4,4]]){gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,4,gl.FLOAT,false,32,off*4);gl.vertexAttribDivisor(index,1)}
   gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.vertices,mesh.instances);
  }
  for(let i=3;i<=4;i++)gl.vertexAttribDivisor(i,0);
 }
 dispose(){const gl=this.gl;for(const b of this.instanceBuffers)gl.deleteBuffer(b);if(this.program)gl.deleteProgram(this.program);this.meshes=[];this.instanceBuffers=[];this.program=null}
 diagnostics(){return {authoredMeshes:this.meshes.length,authoredInstances:this.instances,authoredTriangles:this.triangles}}
}
root.SCPremiumAccents={PremiumAccents,shaders:{VERT,FRAG}};
})(window);
