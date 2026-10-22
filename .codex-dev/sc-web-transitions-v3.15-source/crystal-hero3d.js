/* SC Web Transitions 3.7: Crystal Growth GPU hero pass.
 * Voronoi cells are mutually fitted in source coordinates, with inset bevels,
 * physical side faces and deterministic per-fragment motion.  The original
 * keyed alpha is sampled in the fragment shader. No repeated screenshots.
 * This is a real-time approximation, NOT path-traced refractive crystal.
 */
(function(root){'use strict';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,q)=>a+(b-a)*q;
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec2 aCenter;
layout(location=4) in vec3 aVelocity;
layout(location=5) in vec4 aMeta;
uniform vec2 uResolution;uniform float uPhase;uniform float uProgress;uniform float uClock;
out vec3 vNormal;out vec2 vUV;out float vSeed;out float vDepth;out float vBevel;out float vOpacity;
float ease(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
mat3 rotate(float x,float y,float z){float cx=cos(x),sx=sin(x),cy=cos(y),sy=sin(y),cz=cos(z),sz=sin(z);return
 mat3(cz*cy,sz*cy,-sy,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx);}
void main(){
 float delay=aMeta.y,seed=aMeta.x,sz=aMeta.z;
 float movement=0.;float alpha=1.;
 float growth=1.;
 if(uPhase<.5){ // fixed shards during fracture build
   movement=0.;
 }else if(uPhase<1.5){ // explosion with per-facet launch delay
   float q=clamp((uProgress-delay*.16)/max(.2,1.-delay*.16),0.,1.);
   movement=ease(q);alpha=1.-ease((uProgress-.87)/.13);
 }else if(uPhase<2.5){ // reverse travel into precise fitted positions
   float q=clamp((uProgress-delay*.12)/max(.32,.86-delay*.12),0.,1.);
   movement=1.-ease(q);alpha=ease((uProgress-delay*.09)/.18);
 }else { // mineral fronts sprout as raised crystal cells
   float q=clamp((uProgress-delay*.34)/max(.23,.86-delay*.34),0.,1.);
   growth=ease(q);alpha=ease(q/.18);
 }
 float sway=sin(seed*5.1+uClock*.73)*.004;
 vec3 normal=aNormal;
 vec3 local=(aPosition-vec3(aCenter,0.))*growth;
 float angle=movement*(1.5*sin(seed*13.4)+.48*cos(seed*19.2));
 mat3 r=rotate(angle*.84,angle*.67,angle);
 vec3 world=vec3(aCenter,0.)+r*local;
 world+=aVelocity*movement;
 world.z-=75.*movement*(.4+sz);
 float focal=max(uResolution.x*.83,700.);
 float perspective=clamp(focal/(focal+world.z),.35,3.8);
 vec2 px=(world.xy-uResolution*.5)*perspective+uResolution*.5;
 gl_Position=vec4(px.x/uResolution.x*2.-1.,1.-px.y/uResolution.y*2.,clamp(-world.z/4500.,-.95,.95),1.);
 vUV=aUV;vSeed=seed;vNormal=normalize(r*normal);vDepth=world.z;vBevel=aMeta.w;vOpacity=clamp(alpha,0.,1.);
}`;
const FS=`#version 300 es
precision highp float;
in vec3 vNormal;in vec2 vUV;in float vSeed;in float vDepth;in float vBevel;in float vOpacity;
uniform sampler2D uMask;uniform vec3 uAccent;uniform float uClock;uniform float uCrack;
out vec4 outColor;
float hash(float v){return fract(sin(v*127.1)*43758.5453);}
void main(){
 vec4 base=texture(uMask,vUV);
 if(base.a<.045||vOpacity<.007)discard;
 vec3 n=normalize(vNormal);
 float diffuse=.30+.70*max(0.,dot(n,normalize(vec3(-.40,-.59,.71))));
 float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.36,-.54,.76)),n),vec3(0.,0.,1.))),32.);
 float fres=pow(1.-abs(n.z),2.7);
 float prism=clamp(.30+.70*hash(floor(vSeed*271.)),0.,1.);
 float band=.50+.50*sin(vUV.y*47.+vUV.x*31.+vSeed*24.);
 vec3 mineral=mix(vec3(.16,.10,.31),uAccent*.76+.07,prism*.78+.16);
 // Preserve part of the person's photographed tonal variation inside the mineral.
 vec3 tint=base.rgb*.25+mineral*(.42+.55*diffuse);
 tint+=vec3(.35,.54,.69)*pow(band,13.)*.18;
 tint+=vec3(.64,.77,.98)*spec*.75;
 tint+=vec3(.28,.41,.57)*fres*.63;
 // A beveled border becomes a fine icy seam as tension rises.
 tint+=vec3(.32,.25,.48)*vBevel*(.28+.55*uCrack);
 float glint=pow(max(0.,sin(vSeed*47.+uClock*.72)),22.)*.10;
 tint+=glint*vec3(.4,.60,.85);
 float opacity=base.a>.52?1.:base.a;
 outColor=vec4(clamp(tint,0.,1.),opacity*vOpacity);
}`;
const SEALVS=`#version 300 es
precision highp float;layout(location=0) in vec2 aPosition;
out vec2 vUV;void main(){vUV=aPosition;gl_Position=vec4(aPosition*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`;
const SEALFS=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uMask;uniform vec3 uAccent;
uniform float uProgress;uniform float uClock;uniform float uCrack;uniform float uFade;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
void main(){
 vec4 src=texture(uMask,vUV);if(src.a<.045||uFade<=.002)discard;
 vec2 uv=vUV;
 float f=noise(uv*vec2(11.,17.));float n=noise(uv*vec2(39.,47.));
 float veins=pow(abs(sin(uv.x*119.+uv.y*79.+f*7.)),22.);
 float branches=pow(max(0.,sin(uv.x*44.-uv.y*63.+n*8.)),17.);
 float seedlings=1.;
 // Staggered mineral nuclei extend in irregular crystalline fingers.
 for(int i=0;i<9;i++){
  float j=float(i);
  vec2 seed=vec2(fract(sin(j*12.73+4.1)*3476.3),fract(cos(j*6.91+2.8)*793.1));
  float dist=length((uv-seed)*vec2(1.17,.85));
  seedlings=min(seedlings,dist*(.79+.27*noise(uv*15.+j)));
 }
 float threshold=clamp(seedlings*1.76+.18*f+.13*n-.04*veins-.03*branches,.02,.97);
 float front=uProgress>.998?1.:smoothstep(threshold-.034,threshold+.030,uProgress);
 if(front<.002)discard;
 float facet=noise(uv*vec2(27.,34.));
 float ridge=pow(max(0.,sin(uv.x*93.+uv.y*66.+facet*4.)),20.);
 float luminous=pow(max(0.,sin(uv.x*57.-uv.y*101.+f*3.)),25.);
 float crack=pow(max(0.,sin(uv.x*79.+uv.y*48.+n*8.)),45.)*uCrack;
 vec3 mineral=mix(src.rgb*.33,uAccent*.82+.09,.60)+vec3(.10,.14,.25)*facet;
 mineral+=vec3(.25,.43,.55)*ridge*.5+vec3(.40,.60,.72)*luminous*.18;
 mineral+=vec3(.45,.53,.83)*crack*.55;
 float opacity=src.a>.52?1.:src.a;
 outColor=vec4(clamp(mineral,0.,1.),opacity*front*uFade);
}`;
function makeProgram(gl,vs,fs){function compile(t,src){const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Crystal 3D shader compilation: '+gl.getShaderInfoLog(s));return s;}
 const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Crystal 3D shader linking: '+gl.getProgramInfoLog(p));return p;}
function seed(x){let a=x>>>0;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return (a>>>0)/4294967296}}
function clip(poly,c,v){if(poly.length<3)return [];
 const mx=(c[0]+v[0])*.5,my=(c[1]+v[1])*.5,dx=v[0]-c[0],dy=v[1]-c[1];
 const inside=q=>(q[0]-mx)*dx+(q[1]-my)*dy;
 const out=[];let a=poly[poly.length-1],da=inside(a);
 for(const b of poly){const db=inside(b);if((da<0)!==(db<0)){const t=da/(da-db);out.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)])}if(db<=0)out.push(b);a=b;da=db}return out;
}
function triangulateCells(fx){
 const b=fx.b,W=fx.W,H=fx.H,rand=seed((fx.o?.seed||38941)^0x6a8f25);
 const seeds=[];
 // Quasi-Poisson placement instead of a neat tile grid. Variable local spacing
 // creates genuinely different hero/medium/micro facet sizes.
 const quality={Performance:.66,Balanced:.83,Cinematic:1,Ultra:1.27}[fx.quality]||1;
 const detail=clamp(fx.detail||1,.45,1.65);
 const target=clamp(Math.round(90*quality*detail),42,165);
 const nominal=Math.sqrt(Math.max(1,b.w*b.h)/(target*.86));
 let trials=0;
 while(seeds.length<target&&trials++<target*70){
  const candidate=[b.x+rand()*b.w,b.y+rand()*b.h];
  const wanted=nominal*(rand()<.23?.45:rand()<.65?.70:.92);
  if(seeds.every(q=>Math.hypot(candidate[0]-q[0],candidate[1]-q[1])>wanted))seeds.push(candidate);
 }
 if(seeds.length<40)throw Error('Crystal 3D: insufficient varied facet seeds');
 const vertices=[];let visible=0,facets=0;
 const append=(a,c,d,normal,center,vel,meta,bevel)=>{
  for(const q of [a,c,d])vertices.push(q[0],q[1],q[2],normal[0],normal[1],normal[2],q[0]/W,q[1]/H,center[0],center[1],vel[0],vel[1],vel[2],meta[0],meta[1],meta[2],bevel);
 };
 function planeNormal(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];let len=Math.hypot(...n)||1;return n.map(t=>t/len);}
 const cx=b.x+b.w*.5,cy=b.y+b.h*.5;
 for(const s of seeds){
  let polygon=[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
  for(const other of seeds){if(s===other)continue;polygon=clip(polygon,s,other);if(polygon.length<3)break;}
  if(polygon.length<3)continue;
  let center=[0,0];for(const p of polygon){center[0]+=p[0];center[1]+=p[1]};center=center.map(v=>v/polygon.length);
  const area=Math.abs(polygon.reduce((v,p,i)=>{const q=polygon[(i+1)%polygon.length];return v+p[0]*q[1]-q[0]*p[1]},0)*.5);
  if(area<30)continue;
  // Keep pieces touching the silhouette; the fragment shader clips the exact edges.
  let relevant=fx.field.contains(center[0],center[1],45);
  for(const p of polygon)if(!relevant&&fx.field.contains(p[0],p[1],35))relevant=true;
  if(!relevant)continue;
  const r=Math.sqrt(area/Math.PI),thickness=clamp(r*.36,6,24);
  const seedValue=rand(),delay=rand(),speed=.72+rand()*.54;
  const nx=(center[0]-cx)/Math.max(1,b.w*.48),ny=(center[1]-cy)/Math.max(1,b.h*.46);
  const vx=(nx*(.67+.28*rand())+(rand()-.5)*.38)*W*.78;
  const vy=(ny*(.62+.24*rand())+(rand()-.5)*.30)*H*.63;
  const vz=-(.28+rand()*.9)*Math.min(W,H)*.27;
  const velocity=[vx,vy,vz],meta=[seedValue,delay,speed,0];
  // Top face: an inset facet rising above a bevelled outer edge.
  const inner=polygon.map(p=>[lerp(p[0],center[0],.090),lerp(p[1],center[1],.090),-thickness*.30]);
  const outer=polygon.map(p=>[p[0],p[1],0]);
  const peak=[center[0],center[1],-thickness*(.44+.18*rand())];
  for(let i=0;i<polygon.length;i++){
   const j=(i+1)%polygon.length;
   const n=planeNormal(peak,inner[i],inner[j]);
   append(peak,inner[i],inner[j],n,center,velocity,meta,0);
   const bevelN=planeNormal(inner[i],outer[i],outer[j]);
   append(inner[i],outer[i],outer[j],bevelN,center,velocity,meta,1);
   append(inner[i],outer[j],inner[j],bevelN,center,velocity,meta,1);
   const back1=[outer[i][0],outer[i][1],thickness*.81],back2=[outer[j][0],outer[j][1],thickness*.81];
   const wallN=planeNormal(outer[i],back1,back2);
   append(outer[i],back1,back2,wallN,center,velocity,meta,1);
   append(outer[i],back2,outer[j],wallN,center,velocity,meta,1);
  }
  facets++;visible++;
 }
 if(facets<12)throw Error('Crystal 3D: insufficient faceted cells for this camera silhouette');
 return {vertices:new Float32Array(vertices),facets,triangles:vertices.length/17/3};
}
class CrystalHero{
 constructor(gl,fx){this.gl=gl;this.mask=fx.seal;this.facets=0;this.program=makeProgram(gl,VS,FS);this.sealProgram=makeProgram(gl,SEALVS,SEALFS);
  this.uniformCache=new Map();this.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.mask);
  const geom=triangulateCells(fx);this.facets=geom.facets;this.triangles=geom.triangles;
  this.premium=root.SCPremiumAccents?new root.SCPremiumAccents.PremiumAccents(gl,fx):null;
  this.vertexCount=geom.vertices.length/17;this.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);gl.bufferData(gl.ARRAY_BUFFER,geom.vertices,gl.STATIC_DRAW);
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,0,1,1,0,1]),gl.STATIC_DRAW);
  this.w=fx.W;this.h=fx.H;this.color=this.getColor(fx.tuning.accent||fx.config.color);
 }
 getColor(hex){if(!/^#[a-fA-F0-9]{6}$/.test(hex||''))hex='#b178fa';return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
 uniform(prog,key,type,...vals){const gl=this.gl;let lookup=this.uniformCache.get(prog);if(!lookup){lookup=new Map();this.uniformCache.set(prog,lookup)}if(!lookup.has(key))lookup.set(key,gl.getUniformLocation(prog,key));const u=lookup.get(key);if(u===null)return;
  if(type==='1i')gl.uniform1i(u,vals[0]);else if(type==='1f')gl.uniform1f(u,vals[0]);else if(type==='2f')gl.uniform2f(u,...vals);else if(type==='3f')gl.uniform3f(u,...vals);
 }
 seal(progress,fade,clock,crack){if(fade<=.001)return;const gl=this.gl,pr=this.sealProgram;gl.useProgram(pr);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tex);
  this.uniform(pr,'uMask','1i',0);this.uniform(pr,'uAccent','3f',...this.color);this.uniform(pr,'uProgress','1f',progress);this.uniform(pr,'uClock','1f',clock);this.uniform(pr,'uCrack','1f',crack);this.uniform(pr,'uFade','1f',fade);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 shards(phase,progress,clock,crack){const gl=this.gl,pr=this.program;gl.useProgram(pr);gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);
  const entries=[[0,3,0],[1,3,3],[2,2,6],[3,2,8],[4,3,10],[5,4,13]];
  for(const [at,size,off] of entries){gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,size,gl.FLOAT,false,68,off*4);gl.vertexAttribDivisor(at,0)}
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tex);this.uniform(pr,'uMask','1i',0);
  this.uniform(pr,'uResolution','2f',this.w,this.h);this.uniform(pr,'uPhase','1f',phase);this.uniform(pr,'uProgress','1f',progress);
  this.uniform(pr,'uClock','1f',clock);this.uniform(pr,'uCrack','1f',crack);this.uniform(pr,'uAccent','3f',...this.color);
  gl.drawArrays(gl.TRIANGLES,0,this.vertexCount);
 }
 render(stage,p,age,inBuild){p=clamp(p);const gl=this.gl;gl.disable(gl.DEPTH_TEST);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  if(stage==='cover'){this.seal(p,.80,age,0);if(p>.07)this.shards(3,p,age,0);if(this.premium)this.premium.render('cover',p,age);return true;}
  if(stage==='out'){
   if(p<.25)this.seal(1,1-clamp((p-.11)/.14),age,clamp(p/.19));
   const q=clamp((p-.23)/.77);
   this.shards(p<.23?0:1,q,age,p<.25?clamp(p/.20):1);
   if(this.premium)this.premium.render('out',p,age);
  }else if(stage==='in'){
   const b=inBuild||.64;
   if(p<b){const q=clamp(p/b);this.shards(2,q,age,0);if(q>.92)this.seal(1,clamp((q-.92)/.08),age,0)}
   else if(p<b+.09){this.seal(1,1,age,clamp((p-b)/.09));this.shards(0,0,age,1)}
   else{const q=clamp((p-b-.09)/(1-b-.09));if(q<.16)this.seal(1,1-clamp(q/.16),age,1);this.shards(1,q,age,1)}
  }
  if(stage==='in'&&this.premium)this.premium.render('in',p,age);
  return true;
 }
 dispose(){if(this.premium){this.premium.dispose();this.premium=null}const gl=this.gl;for(const p of [this.program,this.sealProgram])if(p)gl.deleteProgram(p);if(this.tex)gl.deleteTexture(this.tex);if(this.vbo)gl.deleteBuffer(this.vbo);if(this.quad)gl.deleteBuffer(this.quad);this.program=this.sealProgram=this.tex=this.vbo=this.quad=null;this.uniformCache.clear()}
 diagnostics(){return {mode:'WebGL2 fitted crystal + authored GPU meshes',facets:this.facets,triangles:this.triangles,vertices:this.vertexCount,...(this.premium?this.premium.diagnostics():{})}}
}
root.SCCrystalHero={CrystalHero,triangulateCells,shaders:{VS,FS,SEALVS,SEALFS}};
})(window);
