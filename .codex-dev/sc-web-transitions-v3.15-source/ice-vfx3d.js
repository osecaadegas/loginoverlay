/* SC Web Transitions v3.16.0 — Ice Shatter Ultra.
 * Generated ice material follows the camera silhouette on true 3D polygon
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
uniform vec2 uResolution;uniform float uProgress;uniform float uClock;uniform float uInbound;uniform float uGrowth;
out vec2 vUV;out vec3 vNormal;out float vLayer;out float vOpacity;out vec3 vPosition;out float vGrazing;
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
float quint(float t){t=clamp(t,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
void main(){
 float local=clamp((uProgress-aShape.y)/max(.12,1.-aShape.y),0.,1.);
 float nucleation=fract(sin(aShape.w*7.13+1.7)*14783.23)*.52;
 float growth=uGrowth<0.?1.:quint((uGrowth-nucleation)/.48);
 if(uGrowth>=0.)local=0.;
 float dispersion=fract(sin(aShape.w*3.47)*43758.54);
 float travel=uInbound>.5?pow(local,1.42):pow(local,1.58+2.28*dispersion);
 float arc=sin(min(1.,local)*3.14159265);
 // Seeded angular momentum is driven by normalized simulation time.
 // Clock-based sinusoidal torque previously changed poses during OBS waits.
 float released=quint(local/.12),time=local*2.4;
 float roll=aShape.x*time*released;
 float yaw=(.42+1.42*sin(aShape.w*1.37))*time*released;
 float pitch=(.32+1.18*cos(aShape.w*.87))*time*released;
 mat3 rotation=rz(roll)*ry(yaw)*rx(pitch);
 vec3 transformed=rotation*(aPos*vec3(growth,growth,.08+.92*growth));
 float projectedDepth=-travel*(75.+175.*abs(sin(aShape.w*.67)));
 float screenScale=mix(1.,aShape.z,travel);
 vec2 velocity=aMotion.zw*travel;
 velocity.x+=sin(time*2.8+aShape.w)*uResolution.x*.019*local*local + sin(aShape.w*2.7+local*9.)*uResolution.x*.010*arc;
 velocity.y+=uResolution.y*.048*local*local-uResolution.y*(.024+.020*abs(cos(aShape.w*1.43)))*arc;
 vec3 world=vec3(aMotion.xy+velocity,projectedDepth)+transformed*screenScale;
 float focal=max(uResolution.x*.95,uResolution.y*1.18);
 float factor=clamp(focal/(focal+world.z),.20,2.8);
 vec2 point=(world.xy-uResolution*.5)*factor+uResolution*.5;
 float clipW=max(.20,(focal+world.z)/focal);
 gl_Position=vec4((point.x/uResolution.x*2.-1.)*clipW,(1.-point.y/uResolution.y*2.)*clipW,clamp((world.z+800.)/2000.,0.,1.)*clipW,clipW);
 vUV=aUV;vNormal=normalize(rotation*aNormal);vLayer=aLayer;vPosition=world;
 vOpacity=(1.-quint((local-.91)/.09))*smoothstep(0.,.14,growth);
 vGrazing=clamp(travel,0.,1.);
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUV;in vec3 vNormal;in float vLayer;in float vOpacity;in vec3 vPosition;in float vGrazing;
uniform sampler2D uFrozen;uniform vec2 uResolution;uniform float uClock;uniform float uQuality;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fracture(vec2 p){
 vec2 cell=floor(p),f=fract(p);float first=10.,second=10.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 q=vec2(x,y),seed=vec2(hash(cell+q),hash(cell+q+vec2(57.1,91.7)));
  float d=dot(q+seed-f,q+seed-f);
  if(d<first){second=first;first=d;}else second=min(second,d);
 }
 return 1.-smoothstep(.012,.065,second-first);
}
void main(){
 if(vOpacity<.005)discard;
 vec3 n=normalize(vNormal);
 vec3 key=normalize(vec3(-.43,-.72,-1.15));
 vec3 rim=normalize(vec3(.80,.20,-.75));
 vec3 viewDir=normalize(vec3((uResolution*.5-vPosition.xy)*.00030,-1.));
 if(dot(n,viewDir)<0.)n=-n;
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
  // Snell refraction at the air/ice boundary (IOR 1.31), with bounded
  // distortion so keyed silhouette UVs cannot pull in an unmasked rectangle.
  vec3 refracted=refract(-viewDir,n,1./1.31);
  vec2 warp=refracted.xy*(.004+.004*uQuality)*vGrazing;
  warp+=(vec2(noise(vUV*uResolution*.076),noise(vUV*uResolution*.076+37.2))-.5)*.0012;
  vec4 transmitted=texture(uFrozen,clamp(vUV+warp,vec2(0.),vec2(1.)));
  vec3 photo=mix(img.rgb,transmitted.rgb,.58*transmitted.a);
  // Beer-Lambert absorption through a thicker optical path at grazing angles.
  float path=(.20+.70*vGrazing)/max(.25,abs(dot(n,viewDir)));
  photo*=exp(-vec3(.19,.065,.025)*path);
  // Preserve the recognizable webcam portrait under clear frozen aquamarine ice.
  color=photo*(.78+.23*nd+.045*nd2);
  color+=vec3(.14,.30,.48)*(.075+.10*frost);
  float roughness=.12+.32*clamp(frost*.65,0.,1.);
  vec3 halfVector=normalize(key+viewDir);
  float NoH=max(dot(n,halfVector),0.),a2=pow(roughness,4.);
  float denom=NoH*NoH*(a2-1.)+1.;
  float ggx=a2/(3.141593*denom*denom+.00001);
  // IOR 1.31 => dielectric F0 around 0.018; reflections increase at grazing.
  float opticalFresnel=.018+.982*pow(1.-abs(dot(n,viewDir)),5.);
  color+=vec3(.72,.88,1.)*min(1.8,ggx*opticalFresnel)*nd*.36;
  // A broad environment highlight gives the moving facets readable optical
  // depth even without a scene-color texture from OBS. It is a lighting rig,
  // not a reflection of the live camera.
  vec3 reflected=reflect(-viewDir,n);
  float softbox=exp(-pow((reflected.y+.35)*5.,2.))*smoothstep(-.4,.2,reflected.z);
  color+=vec3(.65,.86,1.)*(opticalFresnel*.52+softbox*.20);
  if(uQuality>.5){
   float cracks=fracture(vUV*uResolution*.032);
   color+=vec3(.55,.80,.94)*cracks*(.035+.08*vGrazing);
  }
  color+=vec3(.88,.96,1.)*sparkle*(.08+.20*uQuality);
  a=img.a*(1.-.48*smoothstep(0.,.85,vGrazing));
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
  a=img.a*(.96-.23*vGrazing);
 }
 float fresnel=pow(1.-abs(dot(n,viewDir)),3.);
 color+=vec3(.28,.58,.77)*fresnel*(layer<.5?.08:.19);
 color+=vec3(.85,.95,1.)*sparkle*(layer<.5?.06:.12);
 outColor=vec4(clamp(color,0.,1.),clamp(a*vOpacity,0.,1.));
}`;
function shader(gl,kind,src){const o=gl.createShader(kind);gl.shaderSource(o,src);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(o);gl.deleteShader(o);throw Error('Ice Shatter Ultra GLSL: '+msg);}return o;}
function program(gl){let v=null,f=null,p=null;
 try{v=shader(gl,gl.VERTEX_SHADER,VERT);f=shader(gl,gl.FRAGMENT_SHADER,FRAG);p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Ice Shatter Ultra link: '+gl.getProgramInfoLog(p));return p;}
 catch(error){if(p)gl.deleteProgram(p);throw error;}
 finally{if(v)gl.deleteShader(v);if(f)gl.deleteShader(f);}
}
const QUALITY={Performance:.33,Balanced:.55,Cinematic:.78,Ultra:1};
const FACET_RINGS={Performance:1,Balanced:2,Cinematic:3,Ultra:4};
function buildMesh(shards,W,H,quality){
 // Closed convex crystal prisms. Every normal is calculated from the actual
 // triangle, including the back cap exposed by independent angular momentum.
 const buffer=[],stats={shards:0,triangles:0,bevels:0,backCaps:0};
 const rings=FACET_RINGS[quality]||3;
 function vertex(point,n,s,layer){buffer.push(point.xyz[0],point.xyz[1],point.xyz[2],point.uv[0]/W,point.uv[1]/H,n[0],n[1],n[2],s.cx,s.cy,s.vx,s.vy,s.rot,s.delay,s.depth,s.spark,layer);}
 function tri(a,b,c,s,layer,reverse=false){
  if(reverse){const v=b;b=c;c=v;}
  const u=b.xyz.map((v,i)=>v-a.xyz[i]),v=c.xyz.map((p,i)=>p-a.xyz[i]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const length=Math.hypot(...normal);if(length<.000001)return;
  for(let i=0;i<3;i++)normal[i]/=length;
  vertex(a,normal,s,layer);vertex(b,normal,s,layer);vertex(c,normal,s,layer);stats.triangles++;
 }
 for(const s of shards){
  const points=s.poly;if(!points||points.length<3)continue;
  const radius=Math.max(4,...points.map(p=>Math.hypot(...p)));
  const thickness=Math.max(2.5,Math.min(W*.024,radius*(.13+.04*Math.sin(s.spark))));
  const P=(x,y,z)=>({xyz:[x,y,z],uv:[x+s.cx,y+s.cy]});
  const center=P(0,0,-thickness*.42),back=P(0,0,thickness);
  for(let j=0;j<points.length;j++){
   const k=(j+1)%points.length,p=points[j],q=points[k];
   let prevA=center,prevB=center;
   for(let r=1;r<=rings;r++){
    const t=r/rings*.946;
    // Facets follow a shallow convex profile, with seeded asymmetry in the
    // intermediate ring: finer profiles add real faces and changing reflections.
    const height=-thickness*(.42-.25*t*t);
    const jitter=(r===rings?0:Math.sin(s.spark+j*2.39)*.035*thickness);
    const a=P(p[0]*t,p[1]*t,height+jitter),b=P(q[0]*t,q[1]*t,height-jitter*.4);
    if(r===1)tri(center,a,b,s,0,true);
    else{tri(prevA,a,prevB,s,0,true);tri(prevB,a,b,s,0,true);}
    prevA=a;prevB=b;
   }
   const oa=P(p[0],p[1],thickness*.08),ob=P(q[0],q[1],thickness*.08);
   tri(prevA,oa,prevB,s,1,true);tri(prevB,oa,ob,s,1,true);stats.bevels+=2;
   const ba=P(p[0],p[1],thickness),bb=P(q[0],q[1],thickness);
   tri(oa,ba,ob,s,2,true);tri(ob,ba,bb,s,2,true);
   tri(back,ba,bb,s,0);stats.backCaps++;
  }
  stats.shards++;
 }
 stats.vertices=buffer.length/17;stats.facetRings=rings;return {data:new Float32Array(buffer),stats};
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
  this.releaseResources();
  this.w=W;this.h=H;this.quality=QUALITY[quality]?quality:'Cinematic';
  this.canvas.width=W;this.canvas.height=H;gl.viewport(0,0,W,H);
  this.program=program(gl);for(const name of ['uResolution','uProgress','uClock','uInbound','uFrozen','uQuality','uGrowth'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
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
  this.isReady=true;this.clear();
  // Warm actual growth, transparent dispersion and closed edge/back faces
  // while PREPARING, so driver compilation does not stall the camera handoff.
  this.drawGrowth(.6,0);this.draw(.38,false,.5);
  const probe=new Uint8Array(4);gl.readPixels(Math.floor(W*.5),Math.floor(H*.5),1,1,gl.RGBA,gl.UNSIGNED_BYTE,probe);
  this.hide();this.frames=0;return true;
 }
 clear(){if(!this.isReady)return;const g=this.gl;g.viewport(0,0,this.w,this.h);g.clearColor(0,0,0,0);g.clearDepth(1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT)}
 drawGrowth(progress,clock){return this.draw(0,true,clock,clamp(progress));}
 draw(progress,inbound,clock,growth=-1){if(!this.isReady)throw Error('Ice Shatter Ultra renderer unavailable');
  this.canvas.style.display='block';this.clear();if(progress>=.9999)return true;
  const g=this.gl;g.useProgram(this.program);g.bindVertexArray(this.vao);
  g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);
  g.uniform1i(this.uniforms.uFrozen,0);g.uniform2f(this.uniforms.uResolution,this.w,this.h);
  g.uniform1f(this.uniforms.uProgress,clamp(progress));g.uniform1f(this.uniforms.uInbound,inbound?1:0);
  g.uniform1f(this.uniforms.uGrowth,growth);g.uniform1f(this.uniforms.uClock,clock);g.uniform1f(this.uniforms.uQuality,QUALITY[this.quality]);
  g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);
  g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
  g.drawArrays(g.TRIANGLES,0,this.vertices);g.bindVertexArray(null);this.frames++;return true;
 }
 hide(){if(this.canvas.style.display==='none')return;this.canvas.style.display='none';this.clear()}
 releaseResources(){const g=this.gl;if(!g||this.contextLost)return;
  for(const [key,remove] of [['texture','deleteTexture'],['buffer','deleteBuffer'],['vao','deleteVertexArray'],['program','deleteProgram']])if(this[key]){g[remove](this[key]);this[key]=null;}
  this.isReady=false;
 }
 dispose(){if(!this.contextLost)this.hide();else this.canvas.style.display='none';this.releaseResources();
  this.canvas.removeEventListener('webglcontextlost',this.lost);this.isReady=false;
 }
 diagnostics(){return {mode:'Ice Shatter Ultra WebGL2 (spinning extruded crystal shards)',quality:this.quality,triangles:this.stats&&this.stats.triangles,shards:this.stats&&this.stats.shards,passes:this.frames,contextLost:this.contextLost,facetRings:this.stats&&this.stats.facetRings,material:'IOR 1.31 refraction, GGX highlights, Beer-Lambert absorption',closedGeometry:true};}
}
root.SCIceUltra={Renderer,shaders:{VERT,FRAG},buildMesh,FACET_RINGS};
})(window);
