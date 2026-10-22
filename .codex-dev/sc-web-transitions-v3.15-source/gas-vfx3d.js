/* SC Web Transitions Smoke / Toxic renderer.
 * Buoyant, domain-warped gas volume ray-marched in WebGL2. Smoke and Toxic use
 * separate rise, spread, density and lighting profiles. This is procedural,
 * not a fluid solver. The OBS compositor still verifies visible coverage.
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
uniform vec4 uBounds;
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
float sealStrength(float progress){
 // Both directions begin from the verified covered image. Fade the seal only
 // after the incoming camera has been enabled or the outgoing cut is safe.
 return uCover>.5?smoothstep(.68,.96,progress):1.-smoothstep(.08,.78,progress);
}
float sealShape(vec2 p,float coarse){
 vec2 center=uBounds.xy+uBounds.zw*.5;
 vec2 radius=max(uBounds.zw*vec2(1.04,.78)+vec2(.024,.032),vec2(.03));
 vec2 q=(p-center)/radius;
 float edgeNoise=(coarse-.5)*.22;
 float scallop=sin(p.x*23.+p.y*13.+uTime*.24)*.018;
 return 1.-smoothstep(.96,1.38,length(q)+edgeNoise+scallop);
}
// A buoyant, noise-advected volume. Density is formed by the plume's expanding
// cross-section and turbulent folds, rather than stacked sprite clouds.
float plumeDensity(vec3 p,float age,float front,float seal){
 float toxic=step(.5,uToxic);
 float height=clamp(1.08-p.y,0.,1.2);
 float buoyancy=mix(.235,.105,toxic);
 vec3 flow=vec3(p.x*3.1+age*.018,
                p.y*mix(3.2,4.0,toxic)+age*buoyancy,
                p.z*2.3-age*.012);
 float coarse=noise3(flow*.72+vec3(.13,.07,.19));
 float fold=noise3(flow*1.53+vec3(.31,.11,.47));
 float wisps=noise3(flow*3.1+vec3(.07,.43,.23));
 float lateral=noise3(flow*1.12+vec3(.51,.28,.09));
 float wind=mix(.035,.012,toxic)*age;
 float center=uBounds.x+uBounds.z*.5+wind*height*height;
 float shear=(lateral-.5)*mix(.10,.055,toxic)*height;
 float curl=(coarse-.5)*.105+(fold-.5)*.040;
 float spread=smoothstep(.02,.78,height);
 float narrow=max(.024,uBounds.z*.16);
 float broad=max(.105,uBounds.z*.78);
 float width=mix(narrow,broad,spread)*mix(1.,.82,toxic);
 width*=1.+.22*(coarse-.5);
 float radial=abs(p.x-center-shear-curl)/max(width,.018);
 float raggedEdge=radial-(coarse-.5)*.64-(fold-.5)*.27;
 float envelope=1.-smoothstep(.78,1.22,raggedEdge);
 float foldField=.58*coarse+.30*fold+.12*wisps;
 float cavities=smoothstep(.20,.53,foldField);
 float risingFront=smoothstep(front-.14+(.5-coarse)*.045,
                              front+.16+(.5-coarse)*.045,p.y);
 float upperDissipation=1.-smoothstep(.70+.08*(wisps-.5),1.02,p.y);
 float sourcePulse=.78+.22*sin(age*mix(2.2,1.15,toxic)+p.z*5.+coarse*4.);
 float plume=envelope*cavities*risingFront*upperDissipation*sourcePulse;
 float heavyPool=1.-.46*smoothstep(.16,.78,height);
 plume*=mix(1.,heavyPool,toxic);

 // A separate lens-wide roll gives the transition a soft, billowing bridge
 // at handoff. Turbulent edge noise keeps it from reading as a flat wipe.
 float sealRoll=sealShape(p.xy,coarse)*seal*(.38+.36*fold+.26*wisps);
 return max(plume,sealRoll);
}
void main(){
 vec2 screen=vec2(vUV.x,1.-vUV.y);
 float progress=sat(uProgress);
 float toxic=step(.5,uToxic);
 float seal=sealStrength(progress);
 float front=uCover>.5?mix(1.18,-.14,smoothstep(0.,1.,progress)):-.20;
 float age=max(uTime,0.);
 float opticalDepth=0.;
 vec3 radiance=vec3(0.);
 vec3 smokeLow=vec3(.075,.086,.095),smokeHigh=vec3(.49,.53,.56);
 vec3 toxicLow=vec3(.035,.082,.025),toxicHigh=vec3(.39,.69,.11);
 vec3 keyLight=normalize(vec3(-.48,.72,.50));
 for(int i=0;i<40;i++){
  if(float(i)>=uSteps)break;
  float z=(float(i)+.5)/uSteps;
  vec3 world=vec3(screen,z);
  float density=plumeDensity(world,age,front,seal);
  float extinction=density*(uDensity/uSteps)*mix(8.0,9.0,toxic);
  float segment=1.-exp(-extinction);
  float transmittance=exp(-opticalDepth);
  float contribution=segment*transmittance;
  float stratification=.5+.5*sin(world.y*9.+world.z*4.+age*.28);
  float scatter=sm(.18,.82,density*.60+stratification*.24+z*.16);
  float phase=.76+.24*max(dot(keyLight,vec3(0.,0.,1.)),0.);
  vec3 base=mix(smokeLow,smokeHigh,scatter);
  vec3 toxicBase=mix(toxicLow,toxicHigh,scatter);
  vec3 color=mix(base,toxicBase,toxic);
  float sootShade=exp(-opticalDepth*.72);
  color*=mix(.68,1.,sootShade)*phase;
  float toxicGlow=toxic*(.035+.13*scatter)*(1.-smoothstep(.18,.88,1.-world.y));
  color+=vec3(.14,.62,.035)*toxicGlow;
  radiance+=color*contribution;
  opticalDepth+=extinction;
  if(opticalDepth>5.8)break;
 }
 float alpha=1.-exp(-opticalDepth);

 // The visual gas remains turbulent, while a low-cost keyed-matte guard
 // guarantees the exact optical cover required by the OBS handoff. The guard
 // fades with the same seal as the volume, so the release starts continuously.
 float subject=texture(uSilhouette,screen).r;
 float guard=seal*subject;
 float finalAlpha=max(alpha,guard);
 float colorNoise=noise3(vec3(screen*vec2(12.,8.)+vec2(age*.023,-age*.065),.37));
 vec3 fallbackColor=mix(mix(smokeLow,smokeHigh,colorNoise),
                        mix(toxicLow,toxicHigh,colorNoise),toxic);
 vec3 averageColor=alpha>.002?radiance/alpha:fallbackColor;
 float fill=mix(colorNoise,.5+.5*sin(screen.y*18.-age*.35+colorNoise*5.),.28);
 vec3 sealColor=mix(fallbackColor,toxic>.5?vec3(.25,.47,.075):vec3(.30,.34,.37),fill*.32);
 float sealRegion=sealShape(screen,colorNoise)*seal*.44;
 float sealBlend=max(sealRegion,clamp(finalAlpha-alpha,0.,1.));
 vec3 finalColor=mix(averageColor,sealColor,clamp(sealBlend,0.,.82));
 outColor=vec4(clamp(finalColor,vec3(0.),vec3(1.)),sat(finalAlpha));
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
 this.silhouette=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
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
 gl.useProgram(this.program);this.uniforms={};for(const name of ['uResolution','uNoise','uSilhouette','uBounds','uTime','uProgress','uCover','uToxic','uDensity','uSteps'])this.uniforms[name]=gl.getUniformLocation(this.program,name);this.isReady=true;this.clear();return true;
 }
 clear(){if(!this.isReady)return;const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)}
 draw(progress,cover,age){if(!this.isReady)throw Error('Smoke raymarcher not ready');const gl=this.gl;this.canvas.style.display='block';this.clear();if(progress>=1&&!cover)return true;gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_3D,this.noise);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.silhouette);gl.uniform1i(this.uniforms.uNoise,0);gl.uniform1i(this.uniforms.uSilhouette,1);gl.uniform2f(this.uniforms.uResolution,this.W,this.H);gl.uniform4f(this.uniforms.uBounds,...this.bounds);gl.uniform1f(this.uniforms.uTime,age);gl.uniform1f(this.uniforms.uProgress,clamp(progress));gl.uniform1f(this.uniforms.uCover,cover?1:0);gl.uniform1f(this.uniforms.uToxic,this.effect==='toxic'?1:0);gl.uniform1f(this.uniforms.uDensity,.90+.45*this.intensity);gl.uniform1f(this.uniforms.uSteps,this.cfg.steps);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,6);gl.bindVertexArray(null);this.frames++;return true;}
 measureCoverage(field){if(!this.isReady)return 0;const gl=this.gl,w=this.canvas.width,h=this.canvas.height;const d=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,d);let total=0,hit=0;const fw=field.mw,fh=field.mh,m=field.map;for(let y=1;y<fh-1;y+=2)for(let x=1;x<fw-1;x+=2){if(m[(y*fw+x)*4+3]<196)continue;total++;const sx=Math.min(w-1,Math.floor((x+.5)*w/fw)),sy=Math.min(h-1,Math.floor((y+.5)*h/fh));const i=(h-1-sy)*w*4+3;if(d[i]>=250)hit++;}return total?hit/total:0;}
 hide(){this.canvas.style.display='none';this.clear()}
 dispose(){const gl=this.gl;if(!gl)return;if(!this.contextLost){this.hide();if(this.noise)gl.deleteTexture(this.noise);if(this.silhouette)gl.deleteTexture(this.silhouette);if(this.vbo)gl.deleteBuffer(this.vbo);if(this.vao)gl.deleteVertexArray(this.vao);if(this.program)gl.deleteProgram(this.program)}this.canvas.removeEventListener('webglcontextlost',this.lost);this.isReady=false;}
 diagnostics(){return {mode:'WebGL2 buoyant turbulent-volume gas renderer',quality:this.quality,steps:this.cfg&&this.cfg.steps,resolution:this.canvas.width+'×'+this.canvas.height,frames:this.frames,contextLost:this.contextLost,effect:this.effect,maskBoundsFound:this.maskBoundsFound,maskBounds:this.bounds,simulatedFluid:false,alpha:true,coverageVerifiedExternally:true}}
}
root.SCGasVolume={Renderer,shaders:{vert,frag}};
})(window);
