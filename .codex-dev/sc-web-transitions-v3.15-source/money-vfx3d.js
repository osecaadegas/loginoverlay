/* SC Web Transitions v3.16.0 — Money CGI Ultra: original golden-sheep $100 artwork.
 * Instanced, deformable front/back paper with sampled normal + roughness,
 * grazing-angle fibers, selective metallic ink and cinematic controlled glints.
 * The real OBS opacity gate stays on the separately measured 2D composition.
 * NO camera capture, OBS state changes or network calls occur in this module.
 */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const VERT=`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec2 aLocal;
layout(location=1) in vec2 aTexcoord;
layout(location=2) in vec4 iPose;   // center X/Y, physical width, opacity
layout(location=3) in vec4 iMotion; // age, Z rotation, depth, independent phase
layout(location=4) in vec4 iShape;  // aerodynamics, yaw, pitch, hero flag
uniform vec2 uResolution;
layout(location=5) in vec2 iVelocity; // measured screen motion in paper UV per shutter
uniform float uClock;uniform int uShadowPass;uniform float uInbound;
out vec2 vUV;out vec3 vNormal;out vec3 vWorld;out float vAlpha;
out float vHero;out float vPhase;out float vFold;out float vMotion;out vec3 vShadow;out vec2 vVelocity;out float vDepth;
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){
 float u=aLocal.x,v=aLocal.y,age=iMotion.x,phase=iMotion.w;
 float width=max(2.,iPose.z),wind=clamp(iShape.x,0.,2.);
 float airflow=uInbound*clamp((wind-.18)*1.4,0.,1.)*(1.-iShape.w*.55);
 float q1=u*6.283185+phase+age*(2.2+1.8*wind);
 float q2=u*12.1-v*5.8+phase*1.47+age*(3.6+wind);
 float bend=width*(.023+.023*wind);
 float edge=abs(u)*2.,corner=pow(edge,2.4);
 float cornerCurl=width*(.044+.017*sin(phase+age*1.7))*corner*(1.+v*.27);
 float wave=bend*(.77*sin(q1)+.23*sin(q2));
 float torsion=width*.105*wind*u*v*sin(phase*.63+age*2.3);
 float vertical=width*.009*wind*sin(v*8.+age*2.1+phase);
 // IN's moving sheets have distinct bending modes rather than one shared
 // sinusoidal flapping pose. The approved OUT receives exactly zero lift.
 float creasePhase=u*4.1+v*3.7+phase*1.63+uClock*(1.3+.35*sin(phase));
 float crease=width*.032*airflow*sin(creasePhase)*(1.-u*u*2.);
 float z=cornerCurl+wave+torsion+vertical+crease;
 // Analytic sheet tangent derivatives keep the light following real folds.
 float dzdu=width*(.044+.017*sin(phase+age*1.7))*2.4*pow(max(edge,.0001),1.4)*2.*sign(u)*(1.+v*.27)
           +bend*(.77*6.283185*cos(q1)+.23*12.1*cos(q2))
           +width*.105*wind*v*sin(phase*.63+age*2.3)
           +width*.032*airflow*(4.1*cos(creasePhase)*(1.-u*u*2.)-4.*u*sin(creasePhase));
 float dzdv=width*(.044+.017*sin(phase+age*1.7))*corner*.27
           -bend*.23*5.8*cos(q2)
           +width*.105*wind*u*sin(phase*.63+age*2.3)
           +width*.072*wind*cos(v*8.+age*2.1+phase)
           +width*.032*airflow*3.7*cos(creasePhase)*(1.-u*u*2.);
 vec3 normal=normalize(vec3(dzdu/width,dzdv/(width*.455),-1.));
 mat3 rotation=rotZ(iMotion.y)*rotY(iShape.y)*rotX(iShape.z);
 vec3 local=vec3(u*width,v*width*.455,z);
 vec3 world=vec3(iPose.xy,iMotion.z)+rotation*local;
 float focal=max(uResolution.x*.82,uResolution.y*1.02);
 float depth=max(-focal*.78,world.z);
 float perspective=clamp(focal/(focal+depth),.16,4.05);
 vec2 screen=(world.xy-uResolution*.5)*perspective+uResolution*.5;
 // Preserve perspective-correct interpolants; w=1 made folded print swim.
 float clipW=max(.22,(focal+depth)/focal);
 gl_Position=vec4((screen.x/uResolution.x*2.-1.)*clipW,(1.-screen.y/uResolution.y*2.)*clipW,clamp(world.z/6000.,-.96,.96)*clipW,clipW);
 vec3 light=normalize(vec3(-.43,-.56,-1.));
 vec3 right=normalize(cross(vec3(0.,-1.,0.),light)),up=cross(light,right);
 vec3 relative=world-vec3(uResolution*.5,0.);
 float span=max(uResolution.x,uResolution.y)*2.4;
 vShadow=vec3(dot(relative,right),dot(relative,up),-dot(relative,light))/vec3(span,span,span*2.)*.5+.5;
 if(uShadowPass==1)gl_Position=vec4(vShadow*2.-1.,1.);
 vVelocity=iVelocity;vDepth=world.z;
 vNormal=normalize(rotation*normal);vWorld=world;vUV=aTexcoord;vAlpha=iPose.w;
 vHero=iShape.w;vPhase=phase;vFold=clamp(abs(dzdu/width)*.75+abs(dzdv/width)*.42,0.,2.);
 vMotion=wind;
}`;
const FRAG=`#version 300 es
precision highp float;precision highp int;
in vec2 vUV;in vec3 vNormal;in vec3 vWorld;in float vAlpha;
in float vHero;in float vPhase;in float vFold;in float vMotion;in vec3 vShadow;in vec2 vVelocity;in float vDepth;
uniform sampler2D uBanknote;uniform sampler2D uPaperNormal;uniform sampler2D uPaperRoughness;uniform sampler2D uShadowMap;
uniform float uClock;uniform float uQuality;uniform vec2 uResolution;uniform float uShadowTexel;
uniform int uShadowPass;uniform int uPass;
out vec4 outColor;
float shadowVisibility(float NoL){
 if(uShadowTexel<=0.||any(lessThan(vShadow,vec3(0.)))||any(greaterThan(vShadow,vec3(1.))))return 1.;
 float sum=0.,bias=.0007+.0018*(1.-NoL);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)sum+=step(vShadow.z-bias,texture(uShadowMap,vShadow.xy+vec2(x,y)*uShadowTexel).r);
 return .25+.75*sum/9.;
}
vec4 printSample(vec2 uv){
 vec4 result=texture(uBanknote,uv);
 if(uQuality<.7)return result;
 // Bounded depth-of-field and 180-degree shutter blur, based on actual
 // previous-frame motion. This is local material filtering, not TAA history.
 float defocus=clamp(abs(vDepth+100.)/1800.,0.,1.)*.0015;
 vec2 delta=clamp(vVelocity,vec2(-.012),vec2(.012));
 result*=.4;
 result+=texture(uBanknote,uv+delta*.5+vec2(defocus,0.))*.15;
 result+=texture(uBanknote,uv-delta*.5-vec2(defocus,0.))*.15;
 result+=texture(uBanknote,uv+delta*.25+vec2(0.,defocus))*.15;
 result+=texture(uBanknote,uv-delta*.25-vec2(0.,defocus))*.15;
 return result;
}
void main(){
 vec2 uv=gl_FrontFacing?vUV:vec2(1.-vUV.x,vUV.y);
 vec4 art=uShadowPass==1?texture(uBanknote,uv):printSample(uv);
 float alpha=art.a*vAlpha;
 if(alpha<.004)discard;
 if(uShadowPass==1){if(alpha<.8)discard;outColor=vec4(1.);return;}
 // Opaque ink writes depth first; fading sheets retain sorted blending.
 if(uPass==0&&alpha<.995)discard;
 if(uPass==1&&alpha>=.995)discard;
 float roughness=clamp(texture(uPaperRoughness,uv).r*.67+.23,.26,.96);
 vec3 viewDir=normalize(vec3(uResolution*.5-vWorld.xy,-max(uResolution.x*.82,uResolution.y*1.02)-vWorld.z));
 vec3 n=normalize(vNormal);if(dot(n,viewDir)<0.)n=-n;
 // Build a tangent frame from the deformed surface, not fixed world axes.
 vec3 dx=dFdx(vWorld),dy=dFdy(vWorld);vec2 tx=dFdx(uv),ty=dFdy(uv);
 vec3 tangent=normalize(dx*ty.y-dy*tx.y);vec3 bitangent=normalize(cross(n,tangent));
 vec3 micro=texture(uPaperNormal,uv).xyz*2.-1.;
 n=normalize(n+(.035+.025*uQuality)*(tangent*micro.x+bitangent*micro.y));
 vec3 key=normalize(vec3(-.43,-.56,-1.)),fill=normalize(vec3(.76,.23,-.74)),halfV=normalize(viewDir+key);
 float NoL=max(dot(n,key),0.),NoV=max(dot(n,viewDir),.02),NoH=max(dot(n,halfV),0.),VoH=max(dot(viewDir,halfV),0.);
 float r2=roughness*roughness,a2=r2*r2,denom=NoH*NoH*(a2-1.)+1.;
 float D=a2/(3.141593*denom*denom+.00001),k=(roughness+1.)*(roughness+1.)*.125;
 float G=(NoV/(NoV*(1.-k)+k))*(NoL/(NoL*(1.-k)+k));
 float gold=clamp((art.r-art.b)*3.,0.,1.)*clamp((art.g-art.b)*4.,0.,1.);
 vec3 F0=mix(vec3(.035),vec3(.36,.20,.065),gold*.6);
 vec3 F=F0+(1.-F0)*pow(1.-VoH,5.);
 vec3 spec=D*G*F/max(.04,4.*NoV*NoL);
 float visible=shadowVisibility(NoL);
 vec3 color=art.rgb*(.54+.34*NoL*visible+.11*max(dot(n,fill),0.));
 color*=1.-.08*clamp(vFold,0.,1.);
 color+=min(spec,vec3(1.4))*NoL*visible*.65;
 // Thin paper transmits warm key light on folds and grazing edges.
 color+=vec3(.40,.29,.12)*pow(1.-NoV,3.)*.07;
 if(!gl_FrontFacing)color=mix(color,vec3(.68,.59,.36),.08);
 outColor=vec4(clamp(color,0.,1.),clamp(alpha,0.,1.));
}`;
function program(gl){
 let vertex=null,fragment=null,p=null;
 function compile(kind,source){const sh=gl.createShader(kind);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Money CGI Ultra shader: '+error);}return sh;}
 try{vertex=compile(gl.VERTEX_SHADER,VERT);fragment=compile(gl.FRAGMENT_SHADER,FRAG);p=gl.createProgram();gl.attachShader(p,vertex);gl.attachShader(p,fragment);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Money CGI Ultra link: '+gl.getProgramInfoLog(p));return p;}
 catch(error){if(p)gl.deleteProgram(p);throw error;}
 finally{if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);}
}
function gridMesh(cols=22,rows=9){const out=[];function point(x,y){out.push(x/cols-.5,y/rows-.5,x/cols,y/rows)}
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){point(x,y);point(x,y+1);point(x+1,y);point(x+1,y);point(x,y+1);point(x+1,y+1)}return new Float32Array(out)}
const GEOMETRY={Performance:[10,4],Balanced:[16,6],Cinematic:[24,10],Ultra:[32,14]};
const QUALITY={Performance:.23,Balanced:.48,Cinematic:.77,Ultra:1};
class Renderer{
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.id='sc-money-cgi';this.canvas.style.cssText='position:absolute;inset:0;z-index:5;width:100%;height:100%;display:none;background:transparent;pointer-events:none';document.body.appendChild(this.canvas);
  this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl){this.canvas.remove();throw Error('WebGL2 not available for Money CGI Ultra');}
  this.isReady=false;this.maxInstances=520;this.uniforms={};this.frameCount=0;this.passes=0;this.contextLost=false;
  this.lostHandler=e=>{e.preventDefault();this.contextLost=true;this.isReady=false;this.canvas.style.display='none';};
  this.canvas.addEventListener('webglcontextlost',this.lostHandler,false);
  this.payload=new Float32Array(this.maxInstances*14);this.sorted=[];this.previous=new Map();this.lastClock=null;
 }
 prepare(bill,normal,W,H,quality,roughness,direction='out'){
  const gl=this.gl;if(this.contextLost)throw Error('Money CGI Ultra graphics context lost');
  const size=gl.getParameter(gl.MAX_TEXTURE_SIZE);if(W>size||H>size)throw Error('Money CGI Ultra unsupported renderer texture size');
  this.inbound=direction==='in';
  const resolved=GEOMETRY[quality]?quality:'Cinematic';
  const inputs=this.preparedInputs;
  if(this.isReady&&inputs&&inputs.bill===bill&&inputs.normal===normal&&inputs.roughness===roughness&&this.w===W&&this.h===H&&this.quality===resolved){
   this.previous.clear();this.lastClock=null;this.frameCount=0;this.passes=0;this.hide();return true;
  }
  // Keep the driver program linked when only the viewport/geometry changes.
  // Assets and geometry are reused entirely for repeated matching jobs.
  this.releaseResources(true);this.previous.clear();this.lastClock=null;
  this.w=W;this.h=H;this.quality=GEOMETRY[quality]?quality:'Cinematic';
  this.canvas.width=W;this.canvas.height=H;gl.viewport(0,0,W,H);
  if(!this.shader)this.shader=program(gl);this.uniforms={};for(const n of ['uResolution','uClock','uQuality','uBanknote','uPaperNormal','uPaperRoughness','uShadowPass','uShadowMap','uShadowTexel','uPass','uInbound'])this.uniforms[n]=gl.getUniformLocation(this.shader,n);
  const [cols,rows]=GEOMETRY[this.quality],mesh=gridMesh(cols,rows);this.verts=mesh.length/4;
  this.meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
  this.instanceBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.payload.byteLength,gl.DYNAMIC_DRAW);
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.meshBuffer);
  for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,2,gl.FLOAT,false,16,i*8)}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i+2);gl.vertexAttribPointer(i+2,4,gl.FLOAT,false,56,i*16);gl.vertexAttribDivisor(i+2,1)}gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,2,gl.FLOAT,false,56,48);gl.vertexAttribDivisor(5,1);gl.bindVertexArray(null);
  this.tex=this.loadTexture(bill);this.normal=this.loadTexture(normal||bill);this.roughness=this.loadTexture(roughness||normal||bill);
  this.shadowSize=this.quality==='Ultra'?1024:this.quality==='Cinematic'?512:0;
  if(this.shadowSize){
   this.shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
   for(const [p,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);
   this.shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteFramebuffer(this.shadowFramebuffer);gl.deleteTexture(this.shadowTexture);this.shadowFramebuffer=null;this.shadowTexture=null;this.shadowSize=0;}
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  this.isReady=true;this.clear();
  // Exercise both fragment branches and the shadow pass before PREPARED. GLSL
  // link alone does not compile all ANGLE driver pipelines on Windows.
  const warm={x:W*.5,y:H*.5,w:W*.25,alpha:1,age:.2,rot:.12,depth:-40,phase:0,wave:.7,yaw:.32,pitch:.2,hero:0};
  this.draw([warm,{...warm,x:W*.52,alpha:.6,phase:1}],0);
  const probe=new Uint8Array(4);gl.readPixels(Math.floor(W*.5),Math.floor(H*.5),1,1,gl.RGBA,gl.UNSIGNED_BYTE,probe);
  this.hide();this.previous.clear();this.lastClock=null;this.frameCount=0;this.passes=0;this.preparedInputs={bill,normal,roughness};return true;
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
 clear(){if(!this.isReady)return;const gl=this.gl;gl.viewport(0,0,this.w,this.h);gl.clearColor(0,0,0,0);gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)}
 draw(records,clock){if(!this.isReady)throw Error('Money CGI Ultra renderer unavailable');
  this.canvas.style.display='block';this.clear();if(!records.length)return true;
  const gl=this.gl,count=Math.min(this.maxInstances,records.length);
  // Stable per-note history and a reusable sort array avoid changing caller data.
  this.sorted.length=records.length;for(let i=0;i<records.length;i++)this.sorted[i]=records[i];
  this.sorted.sort((a,b)=>b.depth-a.depth);
  if(records.length>count){const hero=this.sorted.findIndex(r=>r.hero);if(hero>=count)this.sorted[count-1]=this.sorted[hero];}
  const dt=this.lastClock===null?0:clock-this.lastClock,continuous=dt>0&&dt<.12;
  if(!continuous)this.previous.clear();
  for(let i=0;i<count;i++){
   const r=this.sorted[i],p=i*14,previous=this.previous.get(r.phase),velocity=continuous&&previous;
   const shutter=Math.min(dt,.5/60),width=Math.max(2,r.w);
   this.payload[p]=r.x;this.payload[p+1]=r.y;this.payload[p+2]=r.w;this.payload[p+3]=clamp(r.alpha);
   this.payload[p+4]=r.age;this.payload[p+5]=r.rot;this.payload[p+6]=r.depth;this.payload[p+7]=r.phase;
   this.payload[p+8]=r.wave;this.payload[p+9]=r.yaw;this.payload[p+10]=r.pitch;this.payload[p+11]=r.hero||0;
   this.payload[p+12]=velocity?(r.x-previous.x)/dt*shutter/width:0;this.payload[p+13]=velocity?(r.y-previous.y)/dt*shutter/(width*.455):0;
   if(previous){previous.x=r.x;previous.y=r.y;}else this.previous.set(r.phase,{x:r.x,y:r.y});
  }
  this.lastClock=clock;
  gl.useProgram(this.shader);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.instanceBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,this.payload.subarray(0,count*14));
  for(let i=0;i<3;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,[this.tex,this.normal,this.roughness][i]);}
  gl.uniform1i(this.uniforms.uBanknote,0);gl.uniform1i(this.uniforms.uPaperNormal,1);gl.uniform1i(this.uniforms.uPaperRoughness,2);
  gl.uniform2f(this.uniforms.uResolution,this.w,this.h);gl.uniform1f(this.uniforms.uClock,clock);gl.uniform1f(this.uniforms.uQuality,QUALITY[this.quality]);
  gl.uniform1f(this.uniforms.uInbound,this.inbound?1:0);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  gl.uniform1i(this.uniforms.uShadowMap,3);gl.uniform1f(this.uniforms.uShadowTexel,0);
  if(this.shadowFramebuffer){
   // Never sample an attached texture while writing the shadow framebuffer.
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.tex);
   gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFramebuffer);gl.viewport(0,0,this.shadowSize,this.shadowSize);
   gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);gl.uniform1i(this.uniforms.uShadowPass,1);
   gl.drawArraysInstanced(gl.TRIANGLES,0,this.verts,count);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.w,this.h);
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.shadowTexture);
   gl.uniform1f(this.uniforms.uShadowTexel,1/this.shadowSize);
  }
  gl.uniform1i(this.uniforms.uShadowPass,0);gl.uniform1i(this.uniforms.uPass,0);gl.depthMask(true);
  gl.disable(gl.BLEND);gl.drawArraysInstanced(gl.TRIANGLES,0,this.verts,count);
  gl.depthMask(false);gl.uniform1i(this.uniforms.uPass,1);
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArraysInstanced(gl.TRIANGLES,0,this.verts,count);
  gl.depthMask(true);gl.bindVertexArray(null);this.frameCount++;this.passes+=count;return true;
 }
 hide(){this.canvas.style.display='none';this.clear()}
 releaseResources(keepProgram=false){const gl=this.gl;if(!gl||this.contextLost)return;
  for(const k of ['meshBuffer','instanceBuffer'])if(this[k]){gl.deleteBuffer(this[k]);this[k]=null;}
  for(const k of ['tex','normal','roughness','shadowTexture'])if(this[k]){gl.deleteTexture(this[k]);this[k]=null;}
  if(this.shadowFramebuffer){gl.deleteFramebuffer(this.shadowFramebuffer);this.shadowFramebuffer=null;}
  if(this.shader&&!keepProgram){gl.deleteProgram(this.shader);this.shader=null;}if(this.vao){gl.deleteVertexArray(this.vao);this.vao=null;}
  this.isReady=false;
 }
 dispose(){if(!this.contextLost)this.hide();else this.canvas.style.display='none';this.releaseResources();
  this.canvas.removeEventListener('webglcontextlost',this.lostHandler,false);this.previous.clear();this.sorted.length=0;this.isReady=false;
 }
 diagnostics(){return {mode:'Money CGI Ultra WebGL2 (3D flexible paper)',meshTriangles:this.verts/3,maxNotes:this.maxInstances,frames:this.frameCount,averageNotes:this.frameCount?Math.round(this.passes/this.frameCount):0,texture:'Original golden-sheep bill.png',materials:'tangent-space normal, GGX paper and selective ink foil',shadowResolution:this.shadowSize,depthBuffer:true,localMotionFilter:QUALITY[this.quality]>=.7,quality:this.quality,contextLost:this.contextLost}}
}
root.SCMoneyCGI={Renderer,shaders:{VERT,FRAG},gridMesh,GEOMETRY};
})(window);
