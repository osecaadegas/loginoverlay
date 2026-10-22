/* SC Web Transitions v3.11.0 — Ice Shatter Ultra.
 * The original keyed camera's frozen portrait is mapped to true 3D polygon
 * prisms: irregular front facets, bevel rings and extruded physical sides.
 * Geometry is seeded, generated once and uploaded once. One GL draw per frame.
 * No OBS calls: the separately measured, silhouette-safe Canvas2D frost cover
 * owns the camera visibility handoff. Fallback reuses the existing 2D shards.
 */
(function(root){'use strict';
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec3 aNormal;
layout(location=3) in vec4 aMotion; // center x/y + exit velocity x/y
layout(location=4) in vec4 aShape; // roll, delay, apparent depth, phase
layout(location=5) in float aLayer; // 0 face, 1 bevel, 2 cut edge
uniform vec2 uResolution;uniform float uProgress;uniform float uClock;uniform float uInbound;
out vec2 vUV;out vec3 vNormal;out float vLayer;out float vOpacity;out vec3 vPosition;out float vGrazing;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
float quint(float t){t=clamp(t,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
void main(){
 float local=clamp((uProgress-aShape.y)/max(.12,1.-aShape.y),0.,1.);
 float dispersion=fract(sin(aShape.w*3.47)*43758.54);
 float travel=uInbound>.5?pow(local,1.42):pow(local,1.58+2.28*dispersion);
 float arc=sin(min(1.,local)*3.14159265);
 float spinPulse=sin(uClock*3.2+aShape.w*2.1)*.22*local;
 float roll=(aShape.x*(1.12+.62*local)+spinPulse)*travel;
 float yaw=(.62+.92*sin(aShape.w*1.37))*travel;
 float pitch=(.54+.88*cos(aShape.w*.87))*travel;
 mat3 rotation=rz(roll)*ry(yaw)*rx(pitch);
 vec3 transformed=rotation*aPos;
 float projectedDepth=-travel*(75.+175.*abs(sin(aShape.w*.67)));
 float screenScale=mix(1.,aShape.z,travel);
 vec2 velocity=aMotion.zw*travel;
 velocity.x+=sin(uClock*2.8+aShape.w)*uResolution.x*.019*local*local + sin(aShape.w*2.7+local*9.)*uResolution.x*.010*arc;
 velocity.y+=uResolution.y*.048*local*local-uResolution.y*(.024+.020*abs(cos(aShape.w*1.43)))*arc;
 vec3 world=vec3(aMotion.xy+velocity,projectedDepth)+transformed*screenScale;
 float focal=max(uResolution.x*.95,uResolution.y*1.18);
 float factor=clamp(focal/(focal+world.z),.20,2.8);
 vec2 point=(world.xy-uResolution*.5)*factor+uResolution*.5;
 gl_Position=vec4(point.x/uResolution.x*2.-1.,1.-point.y/uResolution.y*2.,clamp((world.z+800.)/2000.,0.,1.),1.);
 vUV=aUV;vNormal=normalize(rotation*aNormal);vLayer=aLayer;vPosition=world;
 vOpacity=1.-quint((local-.91)/.09);
 vGrazing=clamp(travel,0.,1.);
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUV;in vec3 vNormal;in float vLayer;in float vOpacity;in vec3 vPosition;in float vGrazing;
uniform sampler2D uFrozen;uniform vec2 uResolution;uniform float uClock;uniform float uQuality;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 if(vOpacity<.005)discard;
 vec3 n=normalize(vNormal);
 vec3 key=normalize(vec3(-.43,-.72,1.15));
 vec3 rim=normalize(vec3(.80,.20,.75));
 vec3 viewDir=normalize(vec3((uResolution*.5-vPosition.xy)*.00030,1.));
 float nd=max(dot(n,key),0.),nd2=max(dot(n,rim),0.);
 float frost=noise(vUV*uResolution*.043)+.42*noise(vUV*uResolution*.17);
 float sparkleMask=pow(max(noise(vUV*uResolution*.24+uClock*.18)-.58,0.),3.2);
 float sparkle= sparkleMask * (.35 + .65*pow(max(dot(reflect(-rim,n),viewDir),0.),18.));
 vec4 img=texture(uFrozen,vUV);
 float layer=vLayer;
 vec3 color;float a;
 // Mask the prism material by the ORIGINAL keyed silhouette. Voronoi cells
 // near the portrait boundary contain empty regions; these must never become
 // floating blue rectangles or polygon outlines around the webcam.
 if(layer>=.5&&img.a<.78)discard;
 if(layer<.5){
  if(img.a<.018)discard;
  vec2 warp=(vec2(noise(vUV*uResolution*.076),noise(vUV*uResolution*.076+37.2))-.5)*(.0010+.0015*uQuality);
  vec3 lightRefract=texture(uFrozen,clamp(vUV+warp,vec2(0.),vec2(1.))).rgb;
  vec3 photo=mix(img.rgb,lightRefract,.27);
  // Preserve the recognizable webcam portrait under clear frozen aquamarine ice.
  color=photo*(.78+.23*nd+.045*nd2);
  color+=vec3(.14,.30,.48)*(.075+.10*frost);
  float spec=pow(max(dot(reflect(-key,n),viewDir),0.),mix(29.,80.,uQuality));
  color+=vec3(.72,.88,1.)*spec*.29;
  color+=vec3(.88,.96,1.)*sparkle*(.08+.20*uQuality);
  a=img.a;
 }else if(layer<1.5){
  // Irregular optical bevel: bright edge caustic, cool transmitted interior.
  if(img.a<.025)discard;
  float hot=pow(max(dot(reflect(-key,n),viewDir),0.),18.);
  color=mix(img.rgb*.66,vec3(.57,.89,1.),.48+.17*nd);
  color+=vec3(.42,.77,1.)*(.14+.47*hot+.19*nd2);
  color+=vec3(.92,.98,1.)*sparkle*(.18+.24*uQuality);
  a=img.a;
 }else{
  // Extruded walls: physical thickness with bluish absorption/side scattering.
  color=mix(vec3(.07,.27,.51),vec3(.52,.81,.96),.24+.55*nd+.16*nd2);
  color*=.81+.19*frost;
  float hot=pow(max(dot(reflect(-key,n),viewDir),0.),34.);
  color+=vec3(.58,.91,1.)*hot*.49;
  color+=vec3(.90,.98,1.)*sparkle*(.16+.20*uQuality);
  a=.94;
 }
 float fresnel=pow(1.-abs(dot(n,viewDir)),3.);
 color+=vec3(.28,.58,.77)*fresnel*(layer<.5?.08:.19);
 color+=vec3(.85,.95,1.)*sparkle*(layer<.5?.06:.12);
 outColor=vec4(clamp(color,0.,1.),clamp(a*vOpacity,0.,1.));
}`;
function shader(gl,kind,src){const o=gl.createShader(kind);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(o);gl.deleteShader(o);throw Error('Ice Shatter Ultra GLSL: '+msg);}return o;}
function program(gl){const v=shader(gl,gl.VERTEX_SHADER,VERT),f=shader(gl,gl.FRAGMENT_SHADER,FRAG),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error('Ice Shatter Ultra link: '+msg);}return p;}
const QUALITY={Performance:.33,Balanced:.55,Cinematic:.78,Ultra:1};
function buildMesh(shards,W,H,quality){
 // Each triangle carries its shard's transform parameters so all moving
 // prisms are drawn with ONE GPU call (no texture atlas / driver readbacks).
 const buffer=[],stats={shards:0,triangles:0,bevels:0};
 function vertex(point,uv,n,s,layer){buffer.push(point[0],point[1],point[2],uv[0]/W,uv[1]/H,n[0],n[1],n[2],s.cx,s.cy,s.vx,s.vy,s.rot,s.delay,s.depth,s.spark,layer)}
 function tri(a,b,c,an,bn,cn,s,layer){vertex(a.xyz,a.uv,an,s,layer);vertex(b.xyz,b.uv,bn,s,layer);vertex(c.xyz,c.uv,cn,s,layer);stats.triangles++}
 for(const s of shards){
  const points=s.poly;if(!points||points.length<3)continue;
  // Voronoi cells are convex, but their vertex average and edge lengths vary.
  const count=points.length, thickness=Math.max(4,Math.min(18,W*(quality==='Performance'?.006:.012)));
  const inner=points.map(([x,y])=>[x*.946,y*.946]);
  const outer=points.map(([x,y])=>[x,y]);
  const P=(pt,z)=>({xyz:[pt[0],pt[1],z],uv:[pt[0]+s.cx,pt[1]+s.cy]});
  const center=P([0,0],quality==='Ultra'?-5.8:-4.0),nz=[0,0,1];
  for(let j=0;j<count;j++){
   const k=(j+1)%count,a=P(inner[j],-3.2),b=P(inner[k],-3.2);
   // Inset center protrudes toward the lens, making unequal triangular
   // refraction facets rather than flat, texture-mapped cardboard.
   const tilt=[(a.xyz[1]-b.xyz[1])*.012,(b.xyz[0]-a.xyz[0])*.012,1];
   const nlen=Math.hypot(...tilt);const faceted=tilt.map(x=>x/nlen);
   tri(center,a,b,faceted,faceted,faceted,s,0);
   // Beveled ring slopes toward the rim. Highlight follows actual 3D normal.
   const p=outer[j],q=outer[k],d=[q[0]-p[0],q[1]-p[1]],len=Math.hypot(...d)||1;
   const out=[d[1]/len,-d[0]/len,.42],ln=Math.hypot(...out);
   const normal=out.map(v=>v/ln);
   const oa=P(p,1.6),ob=P(q,1.6);
   tri(a,oa,b,nz,normal,nz,s,1);tri(b,oa,ob,nz,normal,normal,s,1);stats.bevels+=2;
   const lowerA=P(p,thickness),lowerB=P(q,thickness);
   const wall=[d[1]/len,-d[0]/len,0];
   tri(oa,lowerA,ob,wall,wall,wall,s,2);tri(ob,lowerA,lowerB,wall,wall,wall,s,2);
  }
  stats.shards++;
 }
 stats.vertices=buffer.length/17;return {data:new Float32Array(buffer),stats};
}
class Renderer{
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.id='sc-ice-shatter-ultra';
  this.canvas.style.cssText='position:absolute;inset:0;z-index:4;width:100%;height:100%;display:none;background:transparent;pointer-events:none';
  document.body.appendChild(this.canvas);
  this.gl=this.canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true,depth:true,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!this.gl){this.canvas.remove();throw Error('WebGL2 not available for Ice Shatter Ultra');}
  this.isReady=false;this.contextLost=false;this.frames=0;this.uniforms={};
  this.lost=e=>{e.preventDefault();this.contextLost=true;this.isReady=false;this.canvas.style.display='none';};
  this.canvas.addEventListener('webglcontextlost',this.lost,false);
 }
 prepare(shards,photo,W,H,quality){
  if(this.contextLost)throw Error('Ice Shatter Ultra graphics context lost');
  const gl=this.gl,limit=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if(Math.max(W,H)>limit)throw Error('Ice Shatter Ultra frame exceeds maximum texture size');
  this.w=W;this.h=H;this.quality=QUALITY[quality]?quality:'Cinematic';
  this.canvas.width=W;this.canvas.height=H;gl.viewport(0,0,W,H);
  this.program=program(gl);for(const name of ['uResolution','uProgress','uClock','uInbound','uFrozen','uQuality'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  const mesh=buildMesh(shards,W,H,this.quality);if(!mesh.data.length)throw Error('Ice Shatter Ultra: empty mesh');
  this.stats=mesh.stats;this.vertices=mesh.data.length/17;
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);
  const locations=[[0,3,0],[1,2,3],[2,3,5],[3,4,8],[4,4,12],[5,1,16]];
  for(const [i,size,start] of locations){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,size,gl.FLOAT,false,17*4,start*4);}
  gl.bindVertexArray(null);
  this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);
  gl.generateMipmap(gl.TEXTURE_2D);
  const ext=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT),this.quality==='Ultra'?8:4));
  this.isReady=true;this.clear();return true;
 }
 clear(){if(!this.isReady)return;const g=this.gl;g.viewport(0,0,this.w,this.h);g.clearColor(0,0,0,0);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT)}
 draw(progress,inbound,clock){if(!this.isReady)throw Error('Ice Shatter Ultra renderer unavailable');
  this.canvas.style.display='block';this.clear();if(progress>=.9999)return true;
  const g=this.gl;g.useProgram(this.program);g.bindVertexArray(this.vao);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);
  g.uniform1i(this.uniforms.uFrozen,0);g.uniform2f(this.uniforms.uResolution,this.w,this.h);
  g.uniform1f(this.uniforms.uProgress,clamp(progress));g.uniform1f(this.uniforms.uInbound,inbound?1:0);
  g.uniform1f(this.uniforms.uClock,clock);g.uniform1f(this.uniforms.uQuality,QUALITY[this.quality]);
  g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);
  g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
  g.drawArrays(g.TRIANGLES,0,this.vertices);g.bindVertexArray(null);this.frames++;return true;
 }
 hide(){if(this.canvas.style.display==='none')return;this.canvas.style.display='none';this.clear()}
 dispose(){const g=this.gl;if(!g)return;
  if(!this.contextLost){this.hide();if(this.texture)g.deleteTexture(this.texture);if(this.buffer)g.deleteBuffer(this.buffer);if(this.vao)g.deleteVertexArray(this.vao);if(this.program)g.deleteProgram(this.program)}
  else this.canvas.style.display='none';
  this.canvas.removeEventListener('webglcontextlost',this.lost);this.isReady=false;
 }
 diagnostics(){return {mode:'Ice Shatter Ultra WebGL2 (spinning extruded crystal shards)',quality:this.quality,triangles:this.stats&&this.stats.triangles,shards:this.stats&&this.stats.shards,passes:this.frames,contextLost:this.contextLost};}
}
root.SCIceUltra={Renderer,shaders:{VERT,FRAG},buildMesh};
})(window);
