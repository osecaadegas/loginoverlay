/* SC Web Transitions v3.10 — Money CGI Ultra: original golden-sheep $100 artwork.
 * Instanced, deformable front/back paper with sampled normal + roughness,
 * grazing-angle fibers, selective metallic ink and cinematic controlled glints.
 * The real OBS opacity gate stays on the separately measured 2D composition.
 * NO camera capture, OBS state changes or network calls occur in this module.
 */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec2 aLocal;
layout(location=1) in vec2 aTexcoord;
layout(location=2) in vec4 iPose;   // center X/Y, physical width, opacity
layout(location=3) in vec4 iMotion; // age, Z rotation, depth, independent phase
layout(location=4) in vec4 iShape;  // aerodynamics, yaw, pitch, hero flag
uniform vec2 uResolution;
uniform float uClock;
out vec2 vUV;out vec3 vNormal;out vec3 vWorld;out float vAlpha;
out float vHero;out float vPhase;out float vFold;out float vMotion;
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){
 float u=aLocal.x,v=aLocal.y,age=iMotion.x,phase=iMotion.w;
 float width=max(2.,iPose.z),wind=clamp(iShape.x,0.,2.);
 float q1=u*6.283185+phase+age*(2.2+1.8*wind);
 float q2=u*12.1-v*5.8+phase*1.47+age*(3.6+wind);
 float bend=width*(.023+.023*wind);
 float edge=abs(u)*2.,corner=pow(edge,2.4);
 float cornerCurl=width*(.044+.017*sin(phase+age*1.7))*corner*(1.+v*.27);
 float wave=bend*(.77*sin(q1)+.23*sin(q2));
 float torsion=width*.105*wind*u*v*sin(phase*.63+age*2.3);
 float vertical=width*.009*wind*sin(v*8.+age*2.1+phase);
 float z=cornerCurl+wave+torsion+vertical;
 // Analytic sheet tangent derivatives keep the light following real folds.
 float dzdu=width*(.044+.017*sin(phase+age*1.7))*2.4*pow(max(edge,.0001),1.4)*2.*sign(u)*(1.+v*.27)
           +bend*(.77*6.283185*cos(q1)+.23*12.1*cos(q2))
           +width*.105*wind*v*sin(phase*.63+age*2.3);
 float dzdv=width*(.044+.017*sin(phase+age*1.7))*corner*.27
           -bend*.23*5.8*cos(q2)
           +width*.105*wind*u*sin(phase*.63+age*2.3)
           +width*.072*wind*cos(v*8.+age*2.1+phase);
 vec3 normal=normalize(vec3(-dzdu/width,-dzdv/(width*.455),1.));
 mat3 rotation=rotZ(iMotion.y)*rotY(iShape.y)*rotX(iShape.z);
 vec3 local=vec3(u*width,v*width*.455,z);
 vec3 world=vec3(iPose.xy,iMotion.z)+rotation*local;
 float focal=max(uResolution.x*.82,uResolution.y*1.02);
 float depth=max(-focal*.78,world.z);
 float perspective=clamp(focal/(focal+depth),.16,4.05);
 vec2 screen=(world.xy-uResolution*.5)*perspective+uResolution*.5;
 gl_Position=vec4(screen.x/uResolution.x*2.-1.,1.-screen.y/uResolution.y*2.,clamp(world.z/6000.,-.96,.96),1.);
 vNormal=normalize(rotation*normal);vWorld=world;vUV=aTexcoord;vAlpha=iPose.w;
 vHero=iShape.w;vPhase=phase;vFold=clamp(abs(dzdu/width)*.75+abs(dzdv/width)*.42,0.,2.);
 vMotion=wind;
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUV;in vec3 vNormal;in vec3 vWorld;in float vAlpha;
in float vHero;in float vPhase;in float vFold;in float vMotion;
uniform sampler2D uBanknote;uniform sampler2D uPaperNormal;uniform sampler2D uPaperRoughness;
uniform float uClock;uniform float uQuality;
out vec4 outColor;
float safePow(float v,float p){return pow(max(0.,v),p);}
void main(){
 // The exact original banknote, with no changed face, denomination or lettering.
 vec2 uv=vUV;
 bool back=!gl_FrontFacing;
 vec4 art=texture(uBanknote,back?vec2(1.-uv.x,uv.y):uv);
 if(art.a<.015||vAlpha<.003)discard;
 float roughness=clamp(texture(uPaperRoughness,uv).r*.75+.14,.20,.93);
 vec3 n=normalize(vNormal);
 if(back)n=-n;
 vec3 micro=texture(uPaperNormal,uv*vec2(2.5,1.6)).rgb*2.-1.;
 n=normalize(n+vec3(micro.xy*(.042+.025*uQuality),micro.z*.013));
 vec3 eye=normalize(vec3(-vWorld.xy*.00020,1.));
 vec3 key=normalize(vec3(-.43,-.56,1.));
 vec3 soft=normalize(vec3(.76,.23,.74));
 float kd=max(dot(n,key),0.),sf=max(dot(n,soft),0.);
 float diffuse=.72+.26*kd+.085*sf;
 // Realistic contrast on concave regions, without crushing printed details.
 diffuse*=1.-.060*clamp(vFold,0.,1.);
 vec3 ink=art.rgb*diffuse;
 vec3 halfVector=normalize(eye+key);
 float NoH=max(dot(n,halfVector),0.);
 // Broad paper sheen + tighter ink varnish, both controlled by the roughness map.
 float broad=safePow(NoH,mix(18.,57.,1.-roughness));
 float fine=safePow(NoH,mix(38.,115.,1.-roughness));
 float paperSpec=.025*broad*(1.-roughness*.38);
 ink+=vec3(.95,.92,.83)*paperSpec;
 // Foil is restricted to gold/yellow ink already printed in the source artwork.
 float goldness=clamp((art.r-art.b*.78)*2.0,0.,1.)*clamp((art.g-art.b*.80)*2.9,0.,1.);
 float chromaGate=smoothstep(.025,.13,art.r-art.b);
 goldness*=chromaGate;
 float scan=vUV.x*1.45+vUV.y*.24+vPhase*.025-uClock*(.11+.045*vHero);
 float iridescent=exp(-pow((fract(scan)-.50)*10.5,2.));
 float glint=(.10+.28*vHero)*fine*(.48+.52*iridescent)*goldness;
 ink+=vec3(1.00,.84,.43)*glint;
 // Soft golden grazing rim describes the edge of the folded paper.
 float grazing=safePow(1.-abs(dot(n,eye)),2.65);
 ink+=vec3(.61,.43,.17)*grazing*(.025+.032*vHero);
 // Paper fibers are almost imperceptible: visible in macro, never visual noise.
 float fibers=(sin(uv.y*1240.+uv.x*107.)*sin(uv.y*771.+uv.x*411.))*.5+.5;
 ink*=.990+.010*mix(.5,fibers,uQuality);
 if(back){
  // On the back face the print is seen through the thin sheet, not a mirror-bright front.
  float transmission=.045+.10*max(dot(-n,key),0.);
  ink=ink*(.77+.10*sf)+vec3(.78,.70,.48)*transmission;
 }
 outColor=vec4(clamp(ink,0.,1.),clamp(art.a*vAlpha,0.,1.));
}`;
function program(gl){function compile(kind,s){const sh=gl.createShader(kind);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Money CGI Ultra shader: '+e)}return sh;}
 const v=compile(gl.VERTEX_SHADER,VERT),f=compile(gl.FRAGMENT_SHADER,FRAG),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const e=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error('Money CGI Ultra link: '+e)}return p;}
function gridMesh(cols=22,rows=9){const out=[];function point(x,y){out.push(x/cols-.5,y/rows-.5,x/cols,y/rows)}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){point(x,y);point(x,y+1);point(x+1,y);point(x+1,y);point(x,y+1);point(x+1,y+1)}return new Float32Array(out)}
const GEOMETRY={Performance:[10,4],Balanced:[16,6],Cinematic:[24,10],Ultra:[32,14]};
const QUALITY={Performance:.23,Balanced:.48,Cinematic:.77,Ultra:1};
class Renderer{
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.id='sc-money-cgi';this.canvas.style.cssText='position:absolute;inset:0;z-index:5;width:100%;height:100%;display:none;background:transparent;pointer-events:none';document.body.appendChild(this.canvas);
  this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl)throw Error('WebGL2 not available for Money CGI Ultra');
  this.isReady=false;this.maxInstances=520;this.uniforms={};this.frameCount=0;this.passes=0;this.contextLost=false;
  this.lostHandler=e=>{e.preventDefault();this.contextLost=true;this.isReady=false;this.canvas.style.display='none';};
  this.canvas.addEventListener('webglcontextlost',this.lostHandler,false);
  this.payload=new Float32Array(this.maxInstances*12);
 }
 prepare(bill,normal,W,H,quality,roughness){
  const gl=this.gl;if(this.contextLost)throw Error('Money CGI Ultra graphics context lost');
  const size=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(W>size||H>size)throw Error('Money CGI Ultra unsupported renderer texture size');
  this.w=W;this.h=H;this.quality=GEOMETRY[quality]?quality:'Cinematic';
  this.canvas.width=W;this.canvas.height=H;gl.viewport(0,0,W,H);
  this.shader=program(gl);this.uniforms={};for(const n of ['uResolution','uClock','uQuality','uBanknote','uPaperNormal','uPaperRoughness'])this.uniforms[n]=gl.getUniformLocation(this.shader,n);
  const [cols,rows]=GEOMETRY[this.quality],mesh=gridMesh(cols,rows);this.verts=mesh.length/4;
  this.meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
  this.instanceBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.payload.byteLength,gl.DYNAMIC_DRAW);
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.meshBuffer);
  for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,2,gl.FLOAT,false,16,i*8)}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i+2);gl.vertexAttribPointer(i+2,4,gl.FLOAT,false,48,i*16);gl.vertexAttribDivisor(i+2,1)}gl.bindVertexArray(null);
  this.tex=this.loadTexture(bill);this.normal=this.loadTexture(normal||bill);this.roughness=this.loadTexture(roughness||normal||bill);
  this.isReady=true;this.clear();return true;
 }
 loadTexture(img){const gl=this.gl,tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);
  const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  if(anisotropy){const limit=gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(limit,this.quality==='Ultra'?8:4));}
  return tex;
 }
 clear(){if(!this.isReady)return;const gl=this.gl;gl.viewport(0,0,this.w,this.h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
 draw(records,clock){if(!this.isReady)throw Error('Money CGI Ultra renderer unavailable');
  this.canvas.style.display='block';this.clear();if(!records.length)return true;
  const gl=this.gl,count=Math.min(this.maxInstances,records.length);
  // Farther back surfaces first. Keep the hero bill when note count exceeds budget.
  records.sort((a,b)=>b.depth-a.depth);let chosen=records;
  if(records.length>count){const hero=records.findIndex(r=>r.hero);chosen=records.slice(0,count);if(hero>=count&&hero>=0)chosen[count-1]=records[hero]}
  for(let i=0;i<count;i++){const r=chosen[i],p=i*12;
   this.payload.set([r.x,r.y,r.w,clamp(r.alpha),r.age,r.rot,r.depth,r.phase,r.wave,r.yaw,r.pitch,r.hero||0],p)}
  gl.useProgram(this.shader);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,this.payload.subarray(0,count*12));
  for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,[this.tex,this.normal,this.roughness][i]);}
  gl.uniform1i(this.uniforms.uBanknote,0);gl.uniform1i(this.uniforms.uPaperNormal,1);gl.uniform1i(this.uniforms.uPaperRoughness,2);
  gl.uniform2f(this.uniforms.uResolution,this.w,this.h);gl.uniform1f(this.uniforms.uClock,clock);gl.uniform1f(this.uniforms.uQuality,QUALITY[this.quality]);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.drawArraysInstanced(gl.TRIANGLES,0,this.verts,count);
  gl.bindVertexArray(null);this.frameCount++;this.passes+=count;return true;
 }
 hide(){this.canvas.style.display='none';this.clear()}
 dispose(){const gl=this.gl;if(!gl)return;
  if(!this.contextLost)this.hide();else this.canvas.style.display='none';
  if(!this.contextLost){for(const k of ['meshBuffer','instanceBuffer'])if(this[k])gl.deleteBuffer(this[k]);for(const k of ['tex','normal','roughness'])if(this[k])gl.deleteTexture(this[k]);if(this.shader)gl.deleteProgram(this.shader);if(this.vao)gl.deleteVertexArray(this.vao)}
  this.canvas.removeEventListener('webglcontextlost',this.lostHandler,false);this.isReady=false;
 }
 diagnostics(){return {mode:'Money CGI Ultra WebGL2 (3D flexible paper)',meshTriangles:this.verts/3,maxNotes:this.maxInstances,frames:this.frameCount,averageNotes:this.frameCount?Math.round(this.passes/this.frameCount):0,texture:'Original golden-sheep bill.png',materials:'normal + roughness + selective ink foil',quality:this.quality,contextLost:this.contextLost}}
}
root.SCMoneyCGI={Renderer,shaders:{VERT,FRAG},gridMesh,GEOMETRY};
})(window);
