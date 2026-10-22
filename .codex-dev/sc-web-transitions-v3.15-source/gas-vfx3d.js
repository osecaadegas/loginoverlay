/* SC Web Transitions v3.14.0: genuine 3D texture raymarched smoke.
 * Not a fluid solver. 3D trilinear FBM sampled along view rays with multiple
 * vertically advected, wind-warped emitters, extinction, and directional scatter.
 * A separate OBS compositor handoff continues to verify coverage.
 */
(function(root){'use strict';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const qualityMap={Performance:{scale:.39,steps:20},Balanced:{scale:.52,steps:26},Cinematic:{scale:.70,steps:32},Ultra:{scale:1.0,steps:40}};
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
uniform vec4 uBounds; // webcam target rectangle normalized
uniform float uTime;
uniform float uProgress;
uniform float uCover;
uniform float uToxic;
uniform float uDensity;
uniform float uSteps;
out vec4 outColor;
float sat(float x){return clamp(x,0.,1.);}
float sm(float a,float b,float x){return smoothstep(a,b,x);}
float noise3(vec3 p){return texture(uNoise,fract(p)).r;}
float fbm(vec3 p){
 float a=noise3(p*.85);
 a+=noise3(p*1.85+vec3(.19,.37,.06))*.50;
 a+=noise3(p*4.0+vec3(.47,.13,.20))*.24;
 return a/1.74;
}
// World units: x,y in screen-normalized coordinates, z 0..1 across ray.
// Multiple rising emission columns have different widths and turbulent wind.
float densityAt(vec3 p,float age,float riseFront,float leave){
 float y=p.y,t=age,x=p.x,z=p.z;
 // Advect a three-dimensional turbulent field upward with height-dependent shear.
 // Independent frequency bands prevent the plume from resolving into repeated lobes.
 vec3 q=vec3(x*1.45,y*1.78,z*1.12);
 vec3 drift=vec3(t*.034,-t*.155,t*.026);
 float broad=fbm(q*.82+drift);
 float mid=fbm(q*1.72+drift*1.31+vec3(broad*.42,-broad*.27,broad*.19));
 float fine=fbm(q*3.65+drift*1.8+vec3(mid*.21,-broad*.14,mid*.18));
 float micro=fbm(q*7.4+drift*2.3);
 float warp=(broad-.5)*.19+(mid-.5)*.075;
 // A broken, breathing emitter creates several separated tongues. Toxic gas
 // is heavier and more coherent near its source; smoke develops finer curls.
 float curl=sin(y*8.2+t*.24+z*5.1+warp*8.)*.040+
            sin(y*17.3-t*.39+z*9.4+mid*5.)*.020+
            sin(y*31.0+t*.51+z*13.2+fine*7.)*.009;
 float center=.50+warp+curl;
 float sourceNoise=fbm(vec3(x*4.8+t*.03,y*3.2-t*.10,z*2.1));
 float emitter=exp(-pow((x-center)/(.24+.07*broad),2.));
 float sideTongues=exp(-pow((x-center-.24-(mid-.5)*.12)/.105,2.))*.55+
                   exp(-pow((x-center+.27+(fine-.5)*.14)/.12,2.))*.49;
 float shape=max(emitter,sideTongues);
 // Remap density with fractal erosion: wispy gaps and shredded boundaries.
 float structure=.61*broad+.27*mid+.12*fine;
 float erosion=smoothstep(.28,.70,.48*broad+.30*mid+.16*fine+.06*micro);
 float filament=.72+.28*sin(y*43.+z*21.+fine*13.-t*.72);
 float density=shape*smoothstep(.29,.69,structure)*erosion*filament;
 // Different material and vertical profile for toxic vapor, rather than a tint.
 float toxic=clamp(uToxic,0.,1.);
 float heavyLayer=mix(1.,.62+.38*smoothstep(-.10,.42,y),toxic);
 float toxicSource=mix(1.,.72+.28*smoothstep(-.48,.16,y),toxic);
 density*=heavyLayer*toxicSource;
 // Rising irregular leading edge, with a turbulent source front.
 float lip=riseFront+.18*(mid-.5)+.095*sin(x*10.5+z*6.+t*.31)+warp*.40;
 float born=smoothstep(lip-.11,lip+.17,y);
 // Thin the top in-frame to wisps before the plume exits the camera region.
 float topFade=1.-smoothstep(.68+.08*(fine-.5),.99,y);
 float wisps=smoothstep(.22,.67,.55*mid+.3*fine+.15*micro);
 float topDetail=mix(.22+.78*wisps,.42+.58*wisps,toxic);
 // Release advection disperses the field; it never leaves a static matte wall.
 float decay=1.-smoothstep(.18,.96,leave)*.94;
 return max(0.,density*born*topFade*topDetail*decay);
}
void main(){
 vec2 uv=vUV;
 vec2 screen=vec2(uv.x,1.-uv.y);
 float progress=sat(uProgress);
 float release=1.-uCover;
 float t=uTime;
 // No rectangular boundaries: emissive columns are themselves the boundary.
 float front=mix(1.28,-.25,sm(.02,.95,progress));
 if(uCover<.5)front=-.32-progress*.29;
 float accum=0.;vec3 integrated=vec3(0.);
 vec3 colorDark=uToxic>.5?vec3(.018,.052,.018):vec3(.042,.049,.058);
 vec3 colorBright=uToxic>.5?vec3(.20,.62,.085):vec3(.43,.49,.56);
 vec3 lightDir=normalize(vec3(-.52,.72,1.0));
 // Orthographic 3D integration, with depth-varying turbulence / light scattering.
 // Early exit when opaque conserves cost at the handoff.
 for(int i=0;i<40;i++){
  if(float(i)>=uSteps)break;
  float z=(float(i)+.5)/uSteps;
  vec3 world=vec3(screen,z);
  float d=densityAt(world,t,front,release*progress);
  float extinction=d*(uDensity/uSteps)*(uToxic>.5?8.1:6.7);
  float trans=exp(-extinction);
  float contributing=(1.-trans)*(1.-accum);
  float lightNoise=noise3(world*vec3(2.6,3.3,1.8)+vec3(t*.02,-t*.15,t*.025));
  float rim=sm(.31,.77,lightNoise)*(.38+.62*z);
  float forwardScatter=pow(max(0.,dot(lightDir,normalize(vec3(world.x-.5,world.y-.43,z-.35)))),2.)*.12;
  vec3 col=mix(colorDark,colorBright,sat(.18+.56*lightNoise+.22*rim+forwardScatter));
  if(uToxic>.5){float emissive=pow(sm(.52,.80,lightNoise),2.0)*(.11+.27*z);col+=vec3(.07,.48,.025)*emissive;}
  else col*=.83+.23*dot(lightDir,normalize(vec3(world.x-.52,world.y-.48,z-.48)));
  integrated+=col*contributing;
  accum+=contributing;
  if(accum>.997)break;
 }
 // Conservative, measurable subject cover only at the very end of the COVER
 // stage, and only where the rendered gas is already dense. This ensures OBS
 // never hides the camera unless optical foreground coverage is verified.
 if(uCover>.5){
   float subj=texture(uSilhouette,screen).r;
   float guard=sm(.84,1.0,progress)*subj;
   float newA=max(accum,guard);
   vec3 average=accum>.002?integrated/accum:colorDark;
   float shade=noise3(vec3(screen*2.7,t*.018));
   vec3 coveredTone=mix(colorDark,colorBright,.38+.34*shade);
   average=mix(average,coveredTone,clamp((newA-accum)*1.16,0.,.86));
   integrated=average*newA;
   accum=newA;
 }
 // Entire release is clear by the end; no stationary wall or opacity rectangle.
 if(uCover<.5) {float f=1.-sm(.78,1.0,progress);accum*=f;integrated*=f;}
 outColor=vec4(clamp(integrated,vec3(0.),vec3(1.)),sat(accum));
}`;
function compile(gl,type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error('Smoke GPU shader: '+e)}return sh}
function createProgram(gl){const v=compile(gl,gl.VERTEX_SHADER,vert),f=compile(gl,gl.FRAGMENT_SHADER,frag),prog=gl.createProgram();gl.attachShader(prog,v);gl.attachShader(prog,f);gl.linkProgram(prog);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('Smoke GPU shader link: '+gl.getProgramInfoLog(prog));return prog}
// 3D noise volume seeded at preparation time, no per-frame CPU pixel synthesis.
function volumeBytes(n){const data=new Uint8Array(n*n*n),hash=(x,y,z)=>{let h=Math.imul(x+13,374761393)^Math.imul(y+23,668265263)^Math.imul(z+37,1442695041);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295};const smooth=t=>t*t*(3-2*t);const rand=(x,y,z)=>hash((x+n)%n,(y+n)%n,(z+n)%n);
 function sample(x,y,z,step){const a=Math.floor(x/step),b=Math.floor(y/step),c=Math.floor(z/step),u=smooth((x-a*step)/step),v=smooth((y-b*step)/step),w=smooth((z-c*step)/step);const H=(i,j,k)=>rand(((i%(n/step))+(n/step))%(n/step),((j%(n/step))+(n/step))%(n/step),((k%(n/step))+(n/step))%(n/step));const L=(a,b,t)=>a+(b-a)*t;return L(L(L(H(a,b,c),H(a+1,b,c),u),L(H(a,b+1,c),H(a+1,b+1,c),u),v),L(L(H(a,b,c+1),H(a+1,b,c+1),u),L(H(a,b+1,c+1),H(a+1,b+1,c+1),u),v),w)}
 let k=0;for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){const val=.52*sample(x,y,z,16)+.30*sample(x,y,z,8)+.18*sample(x,y,z,4);data[k++]=Math.round(Math.max(0,Math.min(1,val))*255)}return data;}
class Renderer{
 constructor(){this.canvas=document.createElement('canvas');this.canvas.id='sc-raymarched-gas';this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:5;background:transparent;display:none;pointer-events:none';document.body.appendChild(this.canvas);this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl){this.canvas.remove();throw Error('WebGL2 unavailable for gas volume')}this.isReady=false;this.contextLost=false;this.frames=0;this.lost=e=>{e.preventDefault();this.contextLost=true;this.isReady=false;this.canvas.style.display='none'};this.canvas.addEventListener('webglcontextlost',this.lost)}
 prepare(subject,W,H,quality,effect,intensity){const gl=this.gl;if(this.contextLost)throw Error('Smoke GPU context lost');this.W=W;this.H=H;this.quality=qualityMap[quality]?quality:'Cinematic';this.cfg=qualityMap[this.quality];this.effect=effect;this.intensity=clamp(intensity/100,.15,1);const actualScale=Math.min(this.cfg.scale,1920/W,1080/H);this.canvas.width=Math.max(1,Math.round(W*actualScale));this.canvas.height=Math.max(1,Math.round(H*actualScale));gl.viewport(0,0,this.canvas.width,this.canvas.height);this.program=createProgram(gl);
 const quad=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]);this.vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);gl.bufferData(gl.ARRAY_BUFFER,quad,gl.STATIC_DRAW);this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
 const n=64;this.noise=gl.createTexture();gl.bindTexture(gl.TEXTURE_3D,this.noise);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_WRAP_R,gl.REPEAT);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,n,n,n,0,gl.RED,gl.UNSIGNED_BYTE,volumeBytes(n));
 this.silhouette=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);const mw=192,mh=Math.max(60,Math.round(mw*H/W)),c=document.createElement('canvas');c.width=mw;c.height=mh;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(subject,0,0,mw,mh);const data=cx.getImageData(0,0,mw,mh).data;const mono=new Uint8Array(mw*mh*4);for(let i=0;i<mw*mh;i++){const px=i%mw,py=Math.floor(i/mw);let a=0;for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){const xx=px+ox,yy=py+oy;if(xx>=0&&xx<mw&&yy>=0&&yy<mh)a=Math.max(a,data[4*(yy*mw+xx)+3]);}a=a>100?255:0;mono[4*i]=mono[4*i+1]=mono[4*i+2]=mono[4*i+3]=a;}gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,mw,mh,0,gl.RGBA,gl.UNSIGNED_BYTE,mono);
 gl.useProgram(this.program);this.uniforms={};for(const name of ['uResolution','uNoise','uSilhouette','uBounds','uTime','uProgress','uCover','uToxic','uDensity','uSteps'])this.uniforms[name]=gl.getUniformLocation(this.program,name);this.isReady=true;this.clear();return true;
 }
 clear(){if(!this.isReady)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
 draw(progress,cover,age){if(!this.isReady)throw Error('Smoke raymarcher not ready');const gl=this.gl;this.canvas.style.display='block';this.clear();if(progress>=1&&!cover)return true;gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,this.noise);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.uniform1i(this.uniforms.uNoise,0);gl.uniform1i(this.uniforms.uSilhouette,1);gl.uniform2f(this.uniforms.uResolution,this.W,this.H);gl.uniform4f(this.uniforms.uBounds,0,0,1,1);gl.uniform1f(this.uniforms.uTime,age);gl.uniform1f(this.uniforms.uProgress,clamp(progress));gl.uniform1f(this.uniforms.uCover,cover?1:0);gl.uniform1f(this.uniforms.uToxic,this.effect==='toxic'?1:0);gl.uniform1f(this.uniforms.uDensity,.90+.45*this.intensity);gl.uniform1f(this.uniforms.uSteps,this.cfg.steps);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindVertexArray(null);this.frames++;return true;}
 measureCoverage(field){if(!this.isReady)return 0;const gl=this.gl,w=this.canvas.width,h=this.canvas.height;const d=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,d);let total=0,hit=0;const fw=field.mw,fh=field.mh,m=field.map;for(let y=1;y<fh-1;y+=2)for(let x=1;x<fw-1;x+=2){if(m[(y*fw+x)*4+3]<196)continue;total++;const sx=Math.min(w-1,Math.floor((x+.5)*w/fw)),sy=Math.min(h-1,Math.floor((y+.5)*h/fh));const i=(h-1-sy)*w*4+3;if(d[i]>=250)hit++;}return total?hit/total:0;}
 hide(){this.canvas.style.display='none';this.clear()}
 dispose(){const gl=this.gl;if(!gl)return;if(!this.contextLost){this.hide();if(this.noise)gl.deleteTexture(this.noise);if(this.silhouette)gl.deleteTexture(this.silhouette);if(this.vbo)gl.deleteBuffer(this.vbo);if(this.vao)gl.deleteVertexArray(this.vao);if(this.program)gl.deleteProgram(this.program)}this.canvas.removeEventListener('webglcontextlost',this.lost);this.isReady=false;}
 diagnostics(){return {mode:'WebGL2 advected 3D gas volume',quality:this.quality,steps:this.cfg&&this.cfg.steps,resolution:this.canvas.width+'×'+this.canvas.height,frames:this.frames,contextLost:this.contextLost,effect:this.effect,simulatedFluid:false,alpha:true,coverageVerifiedExternally:true}}
}
root.SCGasVolume={Renderer,shaders:{vert,frag}};
})(window);
