/* SC Web Transitions 2.5: original dependency-free WebGL cinematic renderer.
   OBS receives the SAME browser source / handshake and same source-local coordinates.
   The legacy 2D renderer is automatically used if WebGL cannot be initialized. */
(function(){
'use strict';
const pi=Math.PI,TAU=pi*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const sm=t=>{t=clamp(t);return t*t*(3-2*t)};
const ease=t=>1-Math.pow(1-clamp(t),3);
const mix=(a,b,t)=>a+(b-a)*t;
function shader(gl,kind,src){const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('WebGL shader error: '+gl.getShaderInfoLog(s));return s}
function program(gl,v,f){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('WebGL program link error: '+gl.getProgramInfoLog(p));return p}
const base = `precision highp float;\nuniform vec2 uResolution;\nvec4 screen(vec3 v){ float focal=1100.0; float k=clamp(focal/(focal+v.z),0.22,6.);vec2 xy=(v.xy-uResolution*.5)*k+uResolution*.5; return vec4(xy.x/uResolution.x*2.-1.,1.-xy.y/uResolution.y*2.,clamp(v.z/3600.,-.8,.8),1.);}\n`;
const quadVS=base+`attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(aUV.x*2.-1.,1.-aUV.y*2.,0.,1.);}`;
const quadFS=`precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;uniform float uAlpha;uniform vec3 uColor;void main(){vec4 c=texture2D(uTexture,vUV);gl_FragColor=vec4(c.rgb*uColor,c.a*uAlpha);}`;
const meshVS=base+`
attribute vec2 aUV;attribute vec4 aPose;attribute vec4 aShape;attribute vec4 aFlow;
uniform float uClock;varying vec2 vUV;varying float vLight;varying float vEdge;varying float vOpacity;
void main(){
  float u=aUV.x-.5,v=aUV.y-.5;
  float bend=sin(aUV.x*6.28318+aFlow.x+uClock*.7)*aFlow.y;
  vec3 pos=vec3(u*aShape.x,v*aShape.y,bend);
  float ry=aShape.w,rx=aFlow.w,rz=aShape.z;
  float sy=sin(ry),cy=cos(ry),sx=sin(rx),cx=cos(rx),sz=sin(rz),cz=cos(rz);
  pos=vec3(cy*pos.x+sy*pos.z,pos.y,-sy*pos.x+cy*pos.z);
  pos=vec3(pos.x,cx*pos.y-sx*pos.z,sx*pos.y+cx*pos.z);
  pos=vec3(cz*pos.x-sz*pos.y,sz*pos.x+cz*pos.y,pos.z);
  vec3 normal=normalize(vec3(-sin(ry),sin(rx),cos(ry)*cos(rx)));
  float lit=max(0.,dot(normal,normalize(vec3(-.30,-.58,1.))));
  vLight=(.53+lit*.47)*aFlow.z+pow(max(0.,dot(normal,normalize(vec3(.35,-.35,1.)))),14.)*.37;
  vEdge=pow(abs(u)*2.,5.)*.22;
  vUV=aUV;vOpacity=aPose.w;
  gl_Position=screen(vec3(aPose.xy,aPose.z)+pos);
}`;
const moneyFS=`precision mediump float;varying vec2 vUV;varying float vLight;varying float vEdge;varying float vOpacity;uniform sampler2D uTexture;
void main(){vec4 tex=texture2D(uTexture,vUV);vec3 shade=tex.rgb*clamp(vLight,0.48,1.45)+vEdge*.11;gl_FragColor=vec4(shade,tex.a*vOpacity);}`;
const smokeVS=base+`
attribute vec2 aUV;attribute vec4 aPose;attribute vec4 aShape;attribute vec4 aFlow;
varying vec2 vUV;varying float vOpacity;varying float vDepth;varying float vSeed;
void main(){vec2 xy=(aUV-.5)*aShape.xy;float ca=cos(aShape.z),sa=sin(aShape.z);xy=vec2(ca*xy.x-sa*xy.y,sa*xy.x+ca*xy.y);
 float tilt=aShape.w;vec3 local=vec3(xy.x*cos(tilt),xy.y,xy.x*sin(tilt));
 gl_Position=screen(aPose.xyz+local);vUV=aUV;vOpacity=aPose.w;vDepth=aPose.z;vSeed=aFlow.x;
}`;
const smokeFS=`precision highp float;varying vec2 vUV;varying float vOpacity;varying float vDepth;varying float vSeed;
uniform sampler2D uAtlas;uniform float uClock;uniform float uToxic;
float ease(float v){return v*v*(3.0-2.0*v);}
void main(){
 // Advect the density field, not just the outer polygon. Two octaves give clouds
 // internal rolling movement and prevent static 'radial circle' sprites.
 vec2 uv=vUV; float idx=mod(floor(vSeed),5.0);
 float ti=uClock*.135 + vSeed*.23;
 vec2 warp=vec2(sin(uv.y*7.5+ti*5.2+vSeed),cos(uv.x*8.7-ti*4.1+vSeed))*0.026;
 vec2 coord=clamp(uv+warp,vec2(.006),vec2(.994));
 vec4 cloud=texture2D(uAtlas,vec2((coord.x+idx)/5.0,coord.y));
 vec4 details=texture2D(uAtlas,vec2((clamp(coord.x*1.28-.14+ti*.035,.006,.994)+mod(idx+2.0,5.0))/5.0,clamp(coord.y*1.24-.12-ti*.025,.006,.994)));
 float radius=length((uv-.5)*vec2(1.55,1.72));
 float feather=1.0-smoothstep(.47,.83,radius);
 float billow=clamp(cloud.a*.78+details.a*.46,0.0,1.0);
 float density=smoothstep(.075,.68,billow)*feather;
 float shadow=.52+.65*details.r;
 float keylight=pow(clamp(1.0-radius,0.0,1.0),2.0)*(.18+.4*cloud.g);
 vec3 charcoal=mix(vec3(.055,.062,.084),vec3(.35,.41,.47),clamp(shadow*.74+keylight,0.0,1.0));
 vec3 acid=mix(vec3(.017,.105,.015),vec3(.24,.74,.055),clamp(.35+details.g*.59+keylight,0.0,1.0));
 float a=density*vOpacity*(uToxic>.5?.91:.88);
 gl_FragColor=vec4(mix(charcoal,acid,uToxic),a);
}`;
// Edge-driven frost growth. The frost texture encodes distance INSIDE the
// real camera mask, so freezing advances from the person's outline inward.
const frostFS=`precision highp float;varying vec2 vUV;
uniform sampler2D uCamera;uniform sampler2D uFrost;uniform float uProgress;uniform float uAlpha;uniform float uClock;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
void main(){
 vec4 cam=texture2D(uCamera,vUV);if(cam.a<.004)discard;
 float dist=texture2D(uFrost,vUV).r;
 vec2 px=vUV*vec2(360.,220.);
 float crystalline=noise(px*.085)*.075+noise(px*.34)*.034;
 float advancing=uProgress*1.27+crystalline;
 float ice=1.0-smoothstep(advancing-.075,advancing+.052,dist);
 float ridges=pow(max(0.0,noise(px*.55)-.60),3.0)*3.4;
 float veins=pow(max(0.,sin((vUV.x*1.9+vUV.y*.8+noise(px*.13)*.28)*105.)),18.);
 vec3 frost=mix(cam.rgb*.51+vec3(.16,.36,.46),vec3(.71,.87,.96),clamp(.20+veins*.19+ridges*.18,0.,1.));
 float edge=smoothstep(.02,.13,dist)*(1.0-smoothstep(.16,.32,dist));
 vec3 rgb=mix(cam.rgb,frost+vec3(.16,.26,.32)*edge*ice,ice*.90);
 float shimmer=(1.0-ice)*ice*.25;
 rgb+=vec3(.17,.30,.37)*shimmer;
 gl_FragColor=vec4(rgb,cam.a*uAlpha);
}`;
const iceVS=base+`attribute vec3 aPosition;attribute vec2 aUV;attribute vec3 aNormal;attribute vec2 aData;
varying vec2 vUV;varying vec3 vNormal;varying float vFace;varying float vAlpha;
void main(){gl_Position=screen(aPosition);vUV=aUV;vNormal=aNormal;vFace=aData.x;vAlpha=aData.y;}`;
const iceFS=`precision mediump float;varying vec2 vUV;varying vec3 vNormal;varying float vFace;varying float vAlpha;uniform sampler2D uCamera;uniform float uClock;
void main(){vec4 c=texture2D(uCamera,vUV);vec3 n=normalize(vNormal);float lit=max(.0,dot(n,normalize(vec3(-.42,-.62,1.0))));
 float spec=pow(max(0.,dot(reflect(normalize(vec3(.40,.52,-1.)),n),vec3(0.,0.,1.))),24.);
 vec3 ice= c.rgb*(.71+.41*lit)+vec3(.13,.38,.54)*(.28+spec*.90);
 if(vFace>.5)ice=mix(vec3(.08,.34,.50),vec3(.65,.93,1.),lit*.55+spec*.5);
 float a=(vFace>.5?c.a*.85:c.a)*vAlpha;gl_FragColor=vec4(ice+spec*.33,a);}`;
const lineVS=base+`attribute vec3 aPosition;void main(){gl_Position=screen(aPosition);}`;
const lineFS=`precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`;
function mat3rotate(v,rx,ry,rz){let [x,y,z]=v;const cy=Math.cos(ry),sy=Math.sin(ry);[x,z]=[cy*x+sy*z,-sy*x+cy*z];const cx=Math.cos(rx),sx=Math.sin(rx);[y,z]=[cx*y-sx*z,sx*y+cx*z];const cz=Math.cos(rz),sz=Math.sin(rz);return [cz*x-sz*y,sz*x+cz*y,z];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function normal(a,b,c){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=cross(u,v);let l=Math.hypot(...n)||1;return n.map(x=>x/l)}
class SCWebGL {
 constructor(){
  const canvas=document.createElement('canvas');canvas.id='sc3d-gpu';canvas.style.cssText='position:fixed;inset:0;display:block;width:100%;height:100%;background:transparent;pointer-events:none;z-index:2';document.body.appendChild(canvas);
  this.canvas=canvas;
  const attrs={alpha:true,premultipliedAlpha:false,antialias:true,preserveDrawingBuffer:true,depth:true,stencil:false,powerPreference:'high-performance'};
  const gl=canvas.getContext('webgl2',attrs)||canvas.getContext('webgl',attrs)||canvas.getContext('experimental-webgl',attrs);
  if(!gl)throw Error('WebGL is unavailable in the OBS browser');
  this.gl=gl;this.kind=(typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext)?'WebGL2':'WebGL1';
  this.ext=this.kind==='WebGL2'?null:gl.getExtension('ANGLE_instanced_arrays');
  if(!this.ext&&this.kind!=='WebGL2')throw Error('GPU instanced geometry not supported; using safe 2D fallback');
  this.mesh=program(gl,meshVS,moneyFS);this.smoke=program(gl,smokeVS,smokeFS);this.ice=program(gl,iceVS,iceFS);this.frost=program(gl,quadVS,frostFS);this.quad=program(gl,quadVS,quadFS);this.lines=program(gl,lineVS,lineFS);
  this.quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quadBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  this.plane=gl.createBuffer();this.index=gl.createBuffer();this.instance=gl.createBuffer();this.iceBuffer=gl.createBuffer();this.lineBuffer=gl.createBuffer();
  const vert=[],indices=[],NX=8,NY=4;for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++)vert.push(x/NX,y/NY);
  for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const k=y*(NX+1)+x;indices.push(k,k+1,k+NX+1,k+1,k+NX+2,k+NX+1)}
  this.planeIndexCount=indices.length;gl.bindBuffer(gl.ARRAY_BUFFER,this.plane);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vert),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  this.frames=new Map();this.lastW=0;this.lastH=0;this.pending=null;this.ready=true;
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.ready=false;console.error('SC WebGL context lost; reload Browser Source to restore 3D')});
  canvas.addEventListener('webglcontextrestored',()=>{location.reload()});
  this.resize();gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);
 }
 resize(){const gl=this.gl;const w=Math.max(1,Math.round(innerWidth)),h=Math.max(1,Math.round(innerHeight)),dpr=Math.min(1.5,devicePixelRatio||1);const bw=Math.round(w*dpr),bh=Math.round(h*dpr);
  if(bw===this.lastW&&bh===this.lastH)return;this.canvas.width=bw;this.canvas.height=bh;this.lastW=bw;this.lastH=bh;gl.viewport(0,0,bw,bh);this.w=w;this.h=h;}
 setUniform(p,k,v){const gl=this.gl,l=gl.getUniformLocation(p,k);if(l===null)return;
  if(Array.isArray(v)){if(v.length===2)gl.uniform2fv(l,v);else if(v.length===3)gl.uniform3fv(l,v);else if(v.length===4)gl.uniform4fv(l,v)}else if(/^(uTexture|uAtlas|uCamera|uFrost)$/.test(k))gl.uniform1i(l,v);else gl.uniform1f(l,v)}
 attrib(p,name,size,stride,offset,divisor=0){const gl=this.gl,a=gl.getAttribLocation(p,name);if(a<0)return;
  gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,stride*4,offset*4);
  if(this.kind==='WebGL2')gl.vertexAttribDivisor(a,divisor);else this.ext.vertexAttribDivisorANGLE(a,divisor);
 }
 tex(img){if(!img)return null;const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return t}
 bindTex(t,unit=0){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t)}
 release(){for(const t of this.frames.values())if(t)this.gl.deleteTexture(t);this.frames.clear()}
 prepare(o){this.release();this.resize();this.frames.set('subject',this.tex(o.subject));if(o.bill)this.frames.set('bill',this.tex(o.bill));
  if(o.moneyMatte)this.frames.set('matte',this.tex(o.moneyMatte));if(o.billMosaic)this.frames.set('mosaic',this.tex(o.billMosaic));
  if(o.smokeMatte)this.frames.set('smokeMatte',this.tex(o.smokeMatte));
  if(o.frostMap)this.frames.set('frostMap',this.tex(o.frostMap));
  if(o.smokeSprites&&o.smokeSprites.length){const atlas=document.createElement('canvas');atlas.width=192*5;atlas.height=192;
   const ctx=atlas.getContext('2d');o.smokeSprites.forEach((im,i)=>ctx.drawImage(im,i*192,0,192,192));this.frames.set('smokeAtlas',this.tex(atlas));}
  this.activeEffect=o.effect;
  const gl=this.gl;this.bindTex(this.frames.get('subject'));if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL texture upload failed');
 }
 clear(){if(!this.ready)return;const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)}
 begin(){this.resize();const gl=this.gl;gl.viewport(0,0,this.lastW,this.lastH);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)}
 quadTex(tex,alpha=1,color=[1,1,1]){if(!tex||alpha<=.001)return;const gl=this.gl,p=this.quad;gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,this.quadBuffer);
  this.attrib(p,'aUV',2,2,0);this.bindTex(tex);this.setUniform(p,'uTexture',0);this.setUniform(p,'uAlpha',clamp(alpha));this.setUniform(p,'uColor',color);gl.drawArrays(gl.TRIANGLES,0,6)}
 frostCover(progress,alpha=1){
  const cam=this.frames.get('subject'),map=this.frames.get('frostMap');
  if(!cam)return;
  if(!map){this.quadTex(cam,alpha,[.79,.92,1]);return;}
  const gl=this.gl,p=this.frost;gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quadBuffer);this.attrib(p,'aUV',2,2,0);
  this.bindTex(cam,0);this.bindTex(map,1);
  this.setUniform(p,'uCamera',0);this.setUniform(p,'uFrost',1);
  this.setUniform(p,'uProgress',clamp(progress));this.setUniform(p,'uAlpha',alpha);
  this.setUniform(p,'uClock',performance.now()/1000);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 drawMoney(list,clock){if(!list.length||!this.frames.get('bill'))return;const gl=this.gl,p=this.mesh;
  const packed=new Float32Array(list.length*12);
  list.sort((a,b)=>b.z-a.z);
  for(let i=0;i<list.length;i++){const n=list[i],o=i*12;
   packed.set([n.x,n.y,n.z,n.alpha,n.w,n.h||n.w*.454,n.rot||0,n.yaw||0,n.phase||0,n.bend||0,n.light||1,n.pitch||0],o)}
  gl.useProgram(p);this.setUniform(p,'uResolution',[this.w,this.h]);this.setUniform(p,'uClock',clock);this.setUniform(p,'uTexture',0);
  this.bindTex(this.frames.get('bill'));gl.bindBuffer(gl.ARRAY_BUFFER,this.plane);this.attrib(p,'aUV',2,2,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.instance);gl.bufferData(gl.ARRAY_BUFFER,packed,gl.DYNAMIC_DRAW);
  this.attrib(p,'aPose',4,12,0,1);this.attrib(p,'aShape',4,12,4,1);this.attrib(p,'aFlow',4,12,8,1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.index);
  if(this.kind==='WebGL2')gl.drawElementsInstanced(gl.TRIANGLES,this.planeIndexCount,gl.UNSIGNED_SHORT,0,list.length);
  else this.ext.drawElementsInstancedANGLE(gl.TRIANGLES,this.planeIndexCount,gl.UNSIGNED_SHORT,0,list.length);
  for(const name of ['aPose','aShape','aFlow']){const a=gl.getAttribLocation(p,name);if(this.kind==='WebGL2')gl.vertexAttribDivisor(a,0);else this.ext.vertexAttribDivisorANGLE(a,0)}
 }
 cloudVols(list,time,toxic){if(!list.length||!this.frames.get('smokeAtlas'))return;const gl=this.gl,p=this.smoke;
  const packed=new Float32Array(list.length*12);list.sort((a,b)=>b.z-a.z);
  for(let i=0;i<list.length;i++){const n=list[i],o=i*12;packed.set([n.x,n.y,n.z,n.alpha,n.size,n.size,n.rot||0,n.tilt||0,n.seed||0,0,1,0],o)}
  gl.useProgram(p);this.setUniform(p,'uResolution',[this.w,this.h]);this.setUniform(p,'uClock',time);this.setUniform(p,'uToxic',toxic?1:0);this.setUniform(p,'uAtlas',0);
  this.bindTex(this.frames.get('smokeAtlas'));gl.bindBuffer(gl.ARRAY_BUFFER,this.quadBuffer);this.attrib(p,'aUV',2,2,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.instance);gl.bufferData(gl.ARRAY_BUFFER,packed,gl.DYNAMIC_DRAW);
  this.attrib(p,'aPose',4,12,0,1);this.attrib(p,'aShape',4,12,4,1);this.attrib(p,'aFlow',4,12,8,1);
  if(this.kind==='WebGL2')gl.drawArraysInstanced(gl.TRIANGLES,0,6,list.length);
  else this.ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,6,list.length);
  for(const name of ['aPose','aShape','aFlow']){const a=gl.getAttribLocation(p,name);if(this.kind==='WebGL2')gl.vertexAttribDivisor(a,0);else this.ext.vertexAttribDivisorANGLE(a,0)}
 }
 iceBatch(list){if(!list.length)return;const gl=this.gl,p=this.ice,verts=[];gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  function vpush(pos,uv,n,side,alpha){verts.push(pos[0],pos[1],pos[2],uv[0],uv[1],n[0],n[1],n[2],side,alpha)}
  for(const s of list){const v=s.edges.map(e=>[s.cx+e[0],s.cy+e[1]]);
   const front=v.map(pt=>{const r=mat3rotate([pt[0]-s.cx,pt[1]-s.cy,0],s.rx,s.ry,s.rz);return [s.x+r[0],s.y+r[1],s.z+r[2]]});
   const back=v.map(pt=>{const r=mat3rotate([pt[0]-s.cx,pt[1]-s.cy,s.thickness],s.rx,s.ry,s.rz);return [s.x+r[0],s.y+r[1],s.z+r[2]]});
   const uvs=v.map(pt=>[pt[0]/this.w,pt[1]/this.h]);const nf=normal(front[0],front[1],front[2]);
   for(let j=0;j<3;j++)vpush(front[j],uvs[j],nf,0,s.alpha);
   for(let j=2;j>=0;j--)vpush(back[j],uvs[j],nf.map(x=>-x),1,s.alpha);
   for(let j=0;j<3;j++){const k=(j+1)%3,nn=normal(front[j],back[j],front[k]);
    for(const id of [front[j],back[j],front[k],front[k],back[j],back[k]])vpush(id,uvs[j],nn,1,s.alpha)}
  }
  gl.useProgram(p);this.setUniform(p,'uResolution',[this.w,this.h]);this.setUniform(p,'uClock',performance.now()/1000);this.setUniform(p,'uCamera',0);this.bindTex(this.frames.get('subject'));
  gl.bindBuffer(gl.ARRAY_BUFFER,this.iceBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);
  this.attrib(p,'aPosition',3,10,0);this.attrib(p,'aUV',2,10,3);this.attrib(p,'aNormal',3,10,5);this.attrib(p,'aData',2,10,8);gl.drawArrays(gl.TRIANGLES,0,verts.length/10);gl.disable(gl.DEPTH_TEST);
 }
 cracks(shards,p){const gl=this.gl,pts=[];for(const s of shards){const val=sm((p-.18-s.delay*.42)/.55);if(val<=0)continue;const es=s.edges;
  for(let i=0;i<3;i++){const a=es[i],b=es[(i+1)%3],x=s.cx,y=s.cy;pts.push(x+a[0],y+a[1],-2,x+mix(a[0],b[0],val),y+mix(a[1],b[1],val),-2)}}
  if(!pts.length)return;const pr=this.lines;gl.useProgram(pr);this.setUniform(pr,'uResolution',[this.w,this.h]);this.setUniform(pr,'uColor',[.67,.92,1.,Math.min(.82,p*.9)]);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pts),gl.DYNAMIC_DRAW);this.attrib(pr,'aPosition',3,3,0);gl.drawArrays(gl.LINES,0,pts.length/3)}
 renderCover(p,s){
  if(!this.ready)return false;
  this.begin();
  const effect=s.job.effect,subj=this.frames.get('subject'),clock=performance.now()/1000;
  if(effect==='money'){
   // Stop-motion progression: the frozen real frame is printed into physical
   // golden-sheep notes; the last 20% is a completely motionless silhouette.
   const ink=sm((p-.16)/.65);
   this.quadTex(subj,1-ink);
   this.quadTex(this.frames.get('matte'),ink*.80);
   const notes=[];
   for(const n of s.billParts){
    const q=sm((p-.18-n.assemble*.17)/(.59+n.assemble*.17));
    if(q<=.005)continue;
    const settle=(1-q)*(1-q);
    notes.push({x:n.x+n.fromX*.22*settle,y:n.y+n.fromY*.27*settle,
     z:mix(-135,0,q),alpha:sm(q/.26),w:n.w*(.74+.26*q),
     rot:n.rot+(1-q)*.11*Math.sin(n.phase),yaw:(1-q)*.38,
     pitch:(1-q)*.21,phase:n.phase,bend:(1-q)*4,light:1.05});
   }
   this.drawMoney(notes,clock);
   this.quadTex(this.frames.get('mosaic'),sm((p-.78)/.19)*.46);
  }else if(effect==='ice'){
   // Frost genuinely grows from silhouette edges; cracks FOLLOW the freeze.
   this.frostCover(sm((p-.10)/.77));
   if(p>.31)this.cracks(s.shards,(p-.20)*.84);
  }else{
   // ONLY dynamic cloud geometry: the actual OBS webcam stays live underneath.
   this.smokeClouds(s,p,true,clock);
  }
  return true;
 }
 smokeClouds(s,p,cover,clock){
  const list=[],toxic=s.job.effect==='toxic',out=s.job.direction==='out';
  for(let i=0;i<s.clouds.length;i++){
   const c=s.clouds[i];let q,x,y,z,size,alpha;
   const rise=Math.max(.2,-c.vy)*.32;
   if(cover){
    q=sm((p-c.delay*.32)/.65);if(q<.015)continue;
    x=c.x+Math.sin(clock*.87+c.phase)*c.drift*.45*(1-q);
    y=c.y-rise*q*.27;
    z=120-c.depth*150;
    size=c.sz*(.58+q*.83);
    alpha=q*.84*c.opacity;
   }else if(out){
    q=clamp((p-c.delay*.13)/.80);const e=ease(q);
    x=c.x+c.vx*e*.79+Math.sin(clock*1.24+c.phase)*c.drift*q;
    y=c.y+c.vy*e-this.h*.11*q*q;
    z=120-c.depth*160-q*260;
    size=c.sz*(1+q*1.18);
    alpha=c.opacity*(1-sm((p-.69)/.29));
   }else{
    q=sm(p/.90);
    x=c.x+c.vx*.25*q;
    y=c.y+c.vy*q*.8;
    z=120-c.depth*170-q*95;
    size=c.sz*mix(1.18,1.72,q);
    alpha=c.opacity*(1-sm((p-.39)/.59));
   }
   if(alpha<.009)continue;
   list.push({x,y,z,size,alpha:alpha*(toxic?.88:.96),rot:c.spin*p*.35,tilt:c.phase*.12,seed:i%5});
  }
  this.cloudVols(list,clock,toxic);
 }
 renderPlay(t,s){
  if(!this.ready)return false;
  this.begin();
  const p=clamp(t/s.job.duration),clock=t,effect=s.job.effect,out=s.job.direction==='out';
  if(effect==='money'){
   const list=[];
   if(out){
    // Brief still silhouette, then a single progressive gravitational release.
    if(p<.095){this.quadTex(this.frames.get('matte'),(1-sm(p/.095))*.65);this.quadTex(this.frames.get('mosaic'),(1-sm(p/.095))*.44)}
    for(const n of s.billParts){
     const r=clamp((p-.065-n.release*.17)/(.72-n.release*.17));
     const drop=sm(r),sec=r*s.job.duration*.82;
     if(r<=0){list.push({x:n.x,y:n.y,z:0,w:n.w,alpha:1,rot:n.rot,yaw:0,pitch:0,bend:0,phase:n.phase});continue;}
     const x=n.x+n.vx*sec*.84+Math.sin(sec*4.2+n.phase)*n.wave*r;
     const y=n.y+n.vy*sec*.42+this.h*.65*n.gravity*sec*sec;
     const z=-(r*350)*n.depth;
     if(y>this.h+250||x<-240||x>this.w+240)continue;
     list.push({x,y,z,w:n.w,alpha:1-sm((p-.69)/.20),
      rot:n.rot+n.spin*sec*.78,yaw:Math.sin(sec*4+n.phase)*.85*r,
      pitch:Math.sin(sec*2.9+n.phase)*.65*r,phase:n.phase,bend:11*r,light:1.04});
    }
    this.drawMoney(list,clock);
    // Solo hero: distinct depth rush + a physical-looking slide down the lens.
    if(p>.70){
     const q=clamp((p-.70)/.30),approach=sm(q/.63),contact=sm((q-.64)/.12),slide=sm((q-.74)/.26);
     this.drawMoney([{x:mix(s.hero.x,this.w*.5,approach),
      y:mix(s.hero.y,this.h*.48,approach)+this.h*1.95*slide,
      z:mix(100,-720,approach),w:mix(s.hero.w,this.w*1.07,approach),
      alpha:1-sm((q-.975)/.025),rot:mix(-.20,.015,approach)+slide*.075,
      yaw:mix(.44,0,approach),pitch:slide*.12,phase:1.1,bend:15*(1-contact),light:1.21}],clock);
    }
   }else{
    const gather=sm(p/.83);
    for(const n of s.billParts){const spread=1-gather;
     list.push({x:n.x+n.fromX*spread*.6,y:n.y+this.h*.85*spread,
      z:mix(-360,0,gather),w:n.w,alpha:sm(p/.12)*(1-sm((p-.80)/.15)),
      rot:n.rot+n.spin*spread*.2,yaw:Math.sin(n.phase)*spread*.6,
      pitch:spread*.30,phase:n.phase,bend:spread*7});}
    this.drawMoney(list,clock);
    if(p>.80)this.quadTex(this.frames.get('mosaic'),sm((p-.80)/.13)*(1-sm((p-.96)/.04))*.80);
   }
  }else if(effect==='ice'){
   const list=[];
   // Pressurized ice stays solid for a beat, then shatters into thick 3D pieces.
   if(out&&p<.045)this.frostCover(1,1-sm(p/.045));
   for(const sh of s.shards){
    const d=sh.delay*.18;
    const q=out?clamp((p-.045-d)/(.82-d)):sm((p-d*.32)/(.87-d*.32));
    const r=out?sm(q):1-sm(q);
    list.push({edges:sh.edges,cx:sh.cx,cy:sh.cy,
     x:sh.cx+sh.vx*r*1.12,
     y:sh.cy+sh.vy*r*.83+this.h*.77*r*r,
     z:mix(0,-470*sh.depth,r),
     rx:Math.sin(sh.spark)*r*1.55,ry:sh.rot*r*.40,
     rz:sh.rot*r*1.05,thickness:Math.max(5,12*sh.depth),
     alpha:out?1-sm((p-.84)/.15):1-sm((p-.88)/.11)});
   }
   this.iceBatch(list);
   // The ice re-forms; the very last part dissolves into the live camera.
   if(!out&&p>.81)this.frostCover(1,sm((p-.81)/.08)*(1-sm((p-.90)/.10))*.77);
  }else{
   // No held webcam frame or frozen matte during either direction.
   this.smokeClouds(s,p,false,clock);
  }
  return true;
 }
 diagnostics(){const gl=this.gl;return {mode:this.kind+' Cinematic 3D',gpu:(gl.getParameter(gl.RENDERER)||'WebGL GPU').slice(0,95),maxTex:gl.getParameter(gl.MAX_TEXTURE_SIZE),instanced:true};}
}
try{window.SC3D=new SCWebGL();console.info('SC 3D cinematic pipeline ready',window.SC3D.diagnostics())}
catch(e){console.warn('SC 3D unavailable; using original 2D renderer:',e);const el=document.getElementById('sc3d-gpu');if(el)el.remove();window.SC3D=null;window.SC3DFailure=e.message||String(e)}
})();
