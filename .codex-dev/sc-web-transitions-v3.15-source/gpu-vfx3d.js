/* SC Web Transitions 3.6 - genuine WebGL2 GPU 3D foundation.
 * All dimensions are keyed-camera source local. Geometry is generated once per
 * transition, uploaded as instanced attributes and animated in vertex shaders.
 * This does NOT provide true live alpha tracking; OBS still owns camera state.
 */
(function(root){'use strict';
const TWO=Math.PI*2, clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const TYPES=['glitch','lightning','shadow','holy','sand','crystal','petal','plasma','inferno','neon'];
const NAMES={glitch:0,lightning:1,shadow:2,holy:3,sand:4,crystal:5,petal:6,plasma:7,inferno:8,neon:9};
// Source RGB never enters this shader: an opaque recoloured camera snapshot
// is not concealment. Integrate extinction and emitted/scattered radiance.
const fsVolume=`#version 300 es
precision highp float;
in vec2 vUV;out vec4 outColor;
uniform sampler2D uSeal;uniform float uProgress,uClock,uKind,uSteps,uRelease,uDirection;
uniform vec3 uAccent;uniform vec4 uBounds;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.57+noise(p*2.03+7.1)*.28+noise(p*4.13+13.7)*.15;}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 float p=clamp(uProgress,0.,1.);if(p<.001){outColor=vec4(0);return;}
 vec2 uv=(vUV-uBounds.xy)/max(uBounds.zw,vec2(.01));
 vec2 center=uv-.5;float t=uClock;float T=1.;vec3 L=vec3(0);
 float mask=texture(uSeal,vUV).a;
 // Empty pixels must not execute dozens of 3D noise evaluations.
 if(max(abs(center.x),abs(center.y))>1.04 && mask<.04)discard;
 for(int i=0;i<56;i++){
  if(float(i)>=uSteps)break;
  float z=(float(i)+.5)/uSteps;
  vec3 q=vec3(center*(.85+z*.3),z-.5);
  q.xy-=uRelease*vec2((uDirection>.5?1.:-1.)*(.20+z*.36),-.32*z);
  vec3 flow=q*4.+vec3(sin(t*.31+q.y*4.)*.45,t*.38,cos(t*.23)*.3);
  float n=fbm(flow+vec3(noise(flow+3.),noise(flow+9.),noise(flow+17.))*.65);
  float radius=length(q.xy);float density=0.;vec3 color=vec3(0);
  if(uKind>8.5){
   // Separate Neon identity: precision energy lattice with a curved shield.
   vec2 lattice=q.xy*(7.+z*4.);
   float row=floor(lattice.y);lattice.x+=mod(row,2.)*.5;
   vec2 cell=fract(lattice)-.5;
   float hex=max(abs(cell.x)*.866+abs(cell.y)*.5,abs(cell.y));
   float circuit=exp(-abs(hex-.39)*80.);
   float shield=exp(-abs(q.z+.17-dot(q.xy,q.xy)*.48)*24.);
   float flowPulse=.45+.55*pow(.5+.5*sin(q.x*16.-q.y*9.-t*4.+z*5.),4.);
   density=(circuit*.5+shield*.75)*p+p*p*p*p*.75;
   color=mix(vec3(.012,.13,.24),uAccent*3.4,circuit*flowPulse+shield*.45);
  }else if(uKind>7.5){
   // Buoyant combustion: folded tongues, soot and temperature-dependent light.
   float fire=fbm(vec3(q.x*6.,q.y*3.+t*1.1,q.z*5.)+n*1.7);
   float front=1.-p*1.75+(.5-fire)*.32;
   density=smoothstep(front-.2,front+.15,uv.y)*( .24+fire*1.7);
   float heat=clamp((fire-.29)*2.6+(1.-uv.y)*.16,0.,1.);
   color=mix(vec3(.025,.018,.016),mix(vec3(1.6,.12,.008),vec3(4.5,3.1,1.2),heat*heat),smoothstep(.16,.68,heat));
  }else if(uKind<2.5&&uKind>1.5){
   // Six helical inflows occupy different depths. Extinction, rather than a
   // black screen fade, hides the source as the inward curls interlock.
   float angle=atan(q.y,q.x),tendrils=0.;
   for(int arm=0;arm<6;arm++){
    float a=float(arm)*1.0472+z*2.3+t*.24;
    vec2 axis=vec2(cos(a),sin(a));
    float along=dot(q.xy,axis),across=dot(q.xy,vec2(-axis.y,axis.x));
    float curl=sin(along*13.-t*.9+float(arm)*1.7+z*5.)*.05;
    float thickness=.025+p*.10+n*.025;
    tendrils+=exp(-pow((across+curl)/thickness,2.))*smoothstep(.68-p*.90,.90-p*.90,along+n*.13);
   }
   float cloud=smoothstep(1.05-p*1.5,1.30-p*1.5,radius+n*.36)*(.18+n*.9);
   density=cloud+tendrils*.55+p*p*p*.28;
   float rim=pow(clamp(n-noise(flow+vec3(.18,-.12,.2)),0.,1.),.7);
   color=vec3(.012,.018,.030)+vec3(.13,.17,.24)*rim+vec3(.027,.018,.042)*n;
  }else if(uKind>2.5&&uKind<3.5){
   // Finite shafts converge from a source behind the volume; their perspective
   // diverges with depth instead of using a radial screen-space flare.
   vec3 light=vec3(.08,-.70,-.85),ray=normalize(q-light);
   float theta=atan(ray.x,ray.z),phi=ray.y;
   float shafts=pow(smoothstep(.34,.82,noise(vec3(theta*21.,phi*3.5,t*.06))),3.);
   shafts*=.55+.45*noise(vec3(theta*57.,phi*7.,3.));
   float halo=exp(-abs(length(vec2(q.x,q.y*1.2))-(.31+.025*sin(t*.42)))*70.);
   float dust=.10+.20*n;
   density=(shafts*.48+halo*.32+dust)*p+p*p*p*.9;
   float forward=.30+.7*pow(max(0.,dot(ray,vec3(0,0,1))),3.);
   color=mix(vec3(1.15,.70,.27),vec3(3.8,3.65,3.1),shafts)*(.40+forward+halo*.8);
  }else if(uKind>3.5&&uKind<4.5){
   vec3 wind=q*vec3(3.,8.,4.)+vec3(t*1.1,sin(t*.31+q.x*2.)*.27,0);
   float gust=fbm(wind+vec3(n*.6,noise(wind+9.)*.3,0));
   float roll=sin(q.y*13.+q.x*5.-t*.85+z*4.);
   float front=smoothstep(1.-p*1.6,1.28-p*1.6,uv.x+gust*.42+roll*.06);
   density=front*(.23+gust*1.15)*( .72+.28*roll*roll);
   float sun=exp(-(.4+gust)*(.9-z)*1.8);
   color=mix(vec3(.16,.085,.028),vec3(.95,.69,.38),sun)*(.72+n*.45);
  }else if(uKind>4.5&&uKind<5.5){
   vec3 anchors=q*vec3(4.7,2.6,4.3)+vec3(n,noise(q*3.+5.),noise(q*3.+11.))*.45;
   vec3 cell=fract(anchors+.5)-.5;float identity=hash(floor(anchors+.5));
   float angle=identity*6.2831,cs=cos(angle),sn=sin(angle);
   cell.xz=mat2(cs,-sn,sn,cs)*cell.xz;
   float hex=max(abs(cell.x)*.866+abs(cell.z)*.5,abs(cell.z));
   float tip=max(0.,abs(cell.y)-.25)*.65;
   float radius=.06+p*.29+identity*.04;
   float sdf=max(hex+tip-radius,abs(cell.y)-(.20+p*.35));
   density=(1.-smoothstep(-.015,.025,sdf))*(.42+p*.7);
   vec3 normal=normalize(vec3(sign(cell.x)*.866,sign(cell.y)*step(.25,abs(cell.y))*.65,sign(cell.z)*.5));
   float reflection=pow(max(0.,dot(normal,normalize(vec3(-.4,-.6,.8)))),18.);
   float thickness=max(0.,radius-hex);
   vec3 transmission=exp(-(1.-uAccent)*(.8+thickness*4.));
   color=transmission*(.24+n*.35)+vec3(.82,.91,1.)*reflection*1.8+uAccent*.10;
  }else if(uKind>5.5&&uKind<6.5){
   float angle=atan(q.y,q.x)+t*.5+z*6.;
   float curl=sin(angle*9.+radius*22.+n*3.);
   density=smoothstep(.8-p*1.3,1.-p*1.3,curl*.25+n*.45)*( .3+p);
   color=mix(uAccent*.22,vec3(1.,.48,.61),n)*(.6+.5*z);
  }else if(uKind>6.5){
   float torus=length(vec2(length(q.xy)-(.35+.08*sin(z*12.+t)),q.z*.3));
   float ribbon=exp(-torus*25.)*(.5+.5*sin(atan(q.y,q.x)*12.-t*3.+z*8.));
   density=ribbon*p*2.+pow(p,4.)*(.5+n);
   color=mix(vec3(.05,.3,.6),uAccent*3.,ribbon)+ribbon*1.4;
  }else{
   float plasma=pow(max(0.,1.-length(q)*1.3),3.);
   float breakdown=pow(1.-abs(noise(q*9.+vec3(t*.1,0,t*.9))*2.-1.),18.);
   float ionization=clamp(plasma+breakdown*.7+pow(p,7.)*.55,0.,1.);
   density=plasma*p*2.+pow(p,5.)*(.5+n);
   color=mix(vec3(.10,.21,.48),vec3(3.,4.,5.),ionization)*(.78+.22*sin(t*19.+z*13.));
  }
  // Pressure/energy saturation is part of each material's optical event.
  // A source-alpha mask bounds the opaque event, never source RGB.
  float pressureEnvelope=1.-smoothstep(.73,1.12,length(center)+(.5-n)*.20);
  density+=smoothstep(.78,1.,p)*max(step(.045,mask),pressureEnvelope)*1.5;
  density*=1.-smoothstep(.72,1.02,length(vec3(center,q.z*.35))+(.5-n)*.25);
  density*=smoothstep(0.,.09,z)*(1.-smoothstep(.88,1.,z));
  float segment=1.-exp(-max(0.,density)*22./uSteps);
  L+=color*segment*T;T*=1.-segment;if(T<.0001)break;
 }
 float a=1.-T;outColor=vec4(film(L/max(a,.00001)),a);
}`;
// Dedicated combustion integrator. This is an emissive/absorbing 3D volume,
// not a stack of fire sprites or a recoloured camera image. Camera RGB is never
// sampled; distortion warps the hot gas itself, not a frozen webcam snapshot.
const fsInferno=`#version 300 es
precision highp float;
in vec2 vUV;out vec4 outColor;
uniform sampler2D uSeal;
uniform vec4 uBounds;
uniform float uProgress,uClock,uSteps,uRelease,uDirection;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
float turbulence(vec3 q){return noise(q)*.55+noise(q*2.07+4.8)*.29+noise(q*4.19-7.2)*.16;}
vec3 temperature(float h){
 // Smooth blackbody-inspired radiance: soot -> dull red -> orange -> warm white.
 vec3 cold=vec3(.014,.012,.010),red=vec3(.45,.018,.002),orange=vec3(2.3,.34,.012),white=vec3(4.8,2.8,.78);
 return mix(mix(cold,red,smoothstep(.05,.32,h)),mix(orange,white,smoothstep(.65,1.,h)),smoothstep(.29,.68,h));
}
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 float p=clamp(uProgress,0.,1.);if(p<.001){outColor=vec4(0);return;}
 vec2 uv=(vUV-uBounds.xy)/max(uBounds.zw,vec2(.01));vec2 c=uv-.5;
 if(max(abs(c.x),abs(c.y))>1.10)discard;
 float mask=texture(uSeal,vUV).a;
 float t=uClock,transmittance=1.;vec3 radiance=vec3(0);
 // A lensed, finite combustion volume extends around the source footprint.
 for(int i=0;i<56;i++){
  if(float(i)>=uSteps)break;
  float depth=(float(i)+.5)/uSteps;
  vec3 q=vec3(c*(.82+depth*.35),depth-.5);
  q.x+=(uDirection>.5?1.:-1.)*uRelease*uRelease*(.42+depth*.6);
  q.y+=uRelease*.65;
  float rise=t*(.78+.23*depth);
  vec3 flow=q*vec3(5.4,3.1,5.8)+vec3(.28*sin(t*.7+q.y*5.),rise,.27*cos(t*.43));
  vec3 curl=vec3(noise(flow+11.)-noise(flow-11.),noise(flow+23.)-noise(flow-23.),noise(flow+37.)-noise(flow-37.));
  float fuel=turbulence(flow+curl*1.5);
  float fine=noise(flow*7.1+curl*2.4);
  float billow=turbulence(q*3.2+vec3(t*.11,t*.47,0));
  float front=1.16-p*1.85+(.5-billow)*.30;
  float envelope=1.-smoothstep(.59,.99,length(vec2(c.x,c.y*.84))+(.5-billow)*.32);
  float ignition=smoothstep(front-.20,front+.11,uv.y+fuel*.18);
  float tongue=smoothstep(.25,.67,fuel+curl.x*.16);
  float soot=smoothstep(.22,.55,billow)*(1.-tongue*.55);
  float heat=clamp((fuel-.27)*1.8+fine*.07+q.y*.10-uRelease*.16,0.,1.);
  float density=ignition*(.35+soot*.75+tongue*1.5)*envelope;
  // Designed dense combustion climax: optically saturated gas over every source
  // pixel, including partially keyed edges. Independent OBS verification remains.
  density+=smoothstep(.78,1.,p)*max(step(.045,mask),envelope)*1.9;
  density*=smoothstep(0.,.08,depth)*(1.-smoothstep(.90,1.,depth));
  float extinction=1.-exp(-max(density,0.)*24./uSteps);
  float shadow=exp(-soot*(1.-depth)*1.8);
  vec3 emission=temperature(heat)*(.65+.35*shadow);
  radiance+=emission*extinction*transmittance;transmittance*=1.-extinction;
  if(transmittance<.0001)break;
 }
 float alpha=1.-transmittance;
 outColor=vec4(film(radiance/max(alpha,.00001)),alpha);
}`;
// Each reduction texel represents ALL input pixels, never a sparse alpha probe.
// R=min optical alpha under the camera mask; G=any camera pixel in this tile.
// Out-of-bounds taps contribute identity (1,0), including odd-sized canvases.
const fsCoverage=`#version 300 es
precision highp float;
precision highp int;
in vec2 vUV;out vec4 outColor;
uniform sampler2D uImage,uMask;
uniform ivec2 uSize;
uniform bool uFirst;
void main(){
 ivec2 origin=ivec2(gl_FragCoord.xy)*2;
 float minimum=1.,present=0.;
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  ivec2 at=origin+ivec2(x,y);if(any(greaterThanEqual(at,uSize)))continue;
  vec4 value=texelFetch(uImage,at,0);
  if(uFirst){
   vec2 maskUV=(vec2(at)+.5)/vec2(uSize);maskUV.y=1.-maskUV.y;
   float required=step(16./255.,texture(uMask,maskUV).a);
   minimum=min(minimum,mix(1.,value.a,required));present=max(present,required);
  }else{minimum=min(minimum,value.r);present=max(present,value.g);}
 }
 outColor=vec4(minimum,present,0,1);
}`;
const vsSeal=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPosition;
out vec2 vUV;
void main(){vUV=aPosition;gl_Position=vec4(aPosition*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`;
const fsSeal=`#version 300 es
precision highp float;
in vec2 vUV;out vec4 outColor;
uniform sampler2D uSeal;uniform float uProgress;uniform float uClock;uniform float uKind;
uniform vec3 uAccent;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
void main(){
 vec4 a=texture(uSeal,vUV); if(a.a<.04)discard;
 vec2 xy=vUV*vec2(16.,11.);
 // Animate the material field independently from the growth matte: the keyed
 // silhouette remains stable while the surface keeps moving during the hold.
 vec2 flow=vec2(uClock*.037,-uClock*.029);
 float n=noise(xy*1.5+flow*.32)+.5*noise(xy*4.+flow)+.25*noise(xy*9.-flow*1.7);
 float threshold=clamp(.11+.51*noise(xy*.63)+.21*noise(xy*2.6)+.08*noise(xy*10.),.02,.90);
 float p=clamp(uProgress,0.,1.);
 float coverage=p>.999?1.:smoothstep(threshold-.055,threshold+.065,p);
 if(coverage<.002)discard;
 vec3 col=uAccent*.28; float k=uKind;
 vec2 d=vec2(noise(xy*4.2)-noise(xy*4.2+vec2(.012,0.)),noise(xy*4.2)-noise(xy*4.2+vec2(0.,.012)));
 float nd=clamp(dot(normalize(vec3(d*13.,1.)),normalize(vec3(-.34,-.45,1.))),0.,1.);
 float fres=pow(1.-nd,2.);
 if(k<.5){
  // Synthetic corrupted signal, never a held/recoloured live-camera snapshot.
  float epoch=floor(uClock*18.),row=floor(vUV.y*96.);
  float tear=step(.78,hash(vec2(row,epoch)));
  vec2 block=floor(vec2(vUV.x+tear*(hash(vec2(row,7.))-.5)*.22,vUV.y)*vec2(42.,96.));
  float code=hash(block+vec2(epoch,0));
  float scan=.78+.22*sin(vUV.y*1100.);
  vec3 channels=vec3(hash(block+vec2(1.,epoch)),hash(block+vec2(2.,epoch)),hash(block+vec2(3.,epoch)));
  col=mix(uAccent*(.08+code*.6),channels,tear*.8)*scan;
  col+=vec3(.06,.13,.20)*step(.94,code);
 }else if(k<1.5){
  float leader=pow(max(0.,sin((vUV.x*19.+vUV.y*13.+n*4.)*3.14159-uClock*2.4)),18.);
  col=col*(.66+.35*nd)+uAccent*(.13+.24*pow(nd,10.));
  col+=vec3(.56,.79,1.)*leader*(.18+.24*n);
 }else if(k<2.5){
  float eddy=noise(xy*2.2+vec2(flow.y,-flow.x))+noise(xy*5.1-flow)*.35;
  float rimShade=pow(1.-abs(nd),2.);
  col=mix(col,uAccent*.25,col.r*.17);col*=.66+.42*eddy;
  col+=uAccent*(.035+.09*rimShade)*n;
 }else if(k<3.5){
  float shaft=pow(max(0.,sin(vUV.x*8.+n*2.)),8.)*(.5+.5*sin(uClock*.65+vUV.y*2.));
  col=col*.70+uAccent*(.27+.10*nd)+vec3(.17,.11,.05)*pow(nd,15.);
  col+=vec3(1.,.72,.34)*shaft*.16;
 }else if(k<4.5){
  float grains=noise(xy*48.+flow*3.);
  float erosion=smoothstep(.20,.82,n*.72+grains*.28);
  col=mix(col,uAccent*.53,n*.36)*(.69+.40*nd);
  col*=.88+.12*erosion;
  col+=vec3(.24,.14,.06)*pow(grains,7.)*.18;
 }else if(k<5.5){
  float facets=pow(abs(sin(xy.x*4.1+xy.y*3.2+n*2.)),18.);
  float caustic=pow(max(0.,sin(xy.x*7.2-xy.y*5.4+uClock*.32+n*3.)),24.);
  col=col*.38+uAccent*(.25+.27*nd)+facets*vec3(.34,.44,.55)+fres*vec3(.17,.20,.27);
  col+=vec3(.53,.73,1.)*caustic*.20;
 }else if(k<6.5){
  float vein=exp(-abs(fract(vUV.x*5.+sin(vUV.y*4.+uClock*.35)*.08)-.5)*32.);
  col=mix(col,uAccent,.31);col*=.76+.34*nd;
  col+=vec3(1.,.68,.77)*vein*(.08+.12*n);
 }else{
  float filament=pow(max(0.,sin(xy.x*9.+sin(xy.y*4.+uClock*.44)*2.+uClock*.7+n*4.)),16.);
  col=col*.64+uAccent*(.25+.16*pow(nd,8.));
  col+=vec3(.42,.88,1.)*filament*.30;
 }
 outColor=vec4(clamp(col,0.,1.),coverage);
}`;
const vsMesh=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
layout(location=3) in vec4 iOrigin; // xy + depth + size
layout(location=4) in vec4 iMotion; // displacement xy + angular velocity + seed
layout(location=5) in vec4 iTiming; // delay + spin + depth + shape variance
uniform vec2 uResolution; uniform float uTime;uniform float uProgress;uniform float uStage;
uniform float uMotion;uniform float uKind;
out vec2 vUV;out vec3 vNormal;out float vOpacity;out float vDepth;out float vSeed;
float eased(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
void main(){
 float delay=iTiming.x; float phase=iMotion.w;
 float p=clamp(uProgress,0.,1.);
 float move=0.,alpha=1.;
 if(uStage<.5){alpha=eased((p-delay*.22)/.56);move=0.;}
 else if(uStage<1.5){move=eased((p-delay*.33)/max(.28,.85-delay*.33));alpha=1.-eased((p-.86)/.14);}
 else if(uStage<2.5){move=1.-eased((p-delay*.33)/max(.28,.86-delay*.33));alpha=eased(p/.24);}
 else if(uStage<3.5){move=eased((p-delay*.25)/max(.28,.83-delay*.25));alpha=1.-eased((p-.85)/.15);}
 else {alpha=1.;move=0.;}
 vec2 pos=iOrigin.xy+uMotion*iMotion.xy*move;
 float flutter=sin(uTime*(.9+iTiming.w)+phase)*.075;
 if(uKind<.5){
  float tear=step(.82,fract(uTime*1.7+phase));
  pos.x+=tear*sin(phase*17.+uTime*39.)*iOrigin.w*.22*move;
  pos.y+=floor(sin(uTime*16.+phase)*3.)*move*1.6;
 }
 if(uKind>1.5&&uKind<2.5){
  float orbit=uTime*(.75+iTiming.w*.35)+phase;
  pos+=vec2(cos(orbit),sin(orbit*1.27))*iOrigin.w*.16*move;
 }
 if(uKind>2.5&&uKind<3.5)pos.y-=uResolution.y*.13*move*move;
 if(uKind>3.5&&uKind<4.5){
  float wind=sin(uTime*1.6+phase+pos.y*.017);
  pos.y+=uResolution.y*(.17+.08*iTiming.z)*move*move;
  pos.x+=wind*iOrigin.w*(.5+1.8*move);
  pos.y+=cos(uTime*2.1+phase*1.37)*iOrigin.w*.35;
 }
 if(uKind>5.5&&uKind<6.5){
  float vortex=uTime*(.42+iTiming.w*.2)+phase+move*5.;
  float radius=iOrigin.w*(.25+move*1.7);
  pos+=vec2(sin(vortex),cos(vortex*.83))*radius;
  pos.y+=uResolution.y*.12*move*move;
 }
 if(uKind>6.5){
  float orbit=uTime*(1.4+iTiming.w*.25)+phase+move*9.;
  pos+=vec2(sin(orbit),cos(orbit*1.31))*iOrigin.w*.24;
 }
 float yaw=(sin(phase+uTime*.9)*.19+move*1.75*sin(phase))*1.;
 float pitch=(flutter+move*.92*cos(phase));
 float roll=iTiming.y+move*iMotion.z*.34 + sin(uTime*.95+phase)*.08;
 mat3 rotation=rotZ(roll)*rotY(yaw)*rotX(pitch);
 vec3 local=aPosition,localNormal=aNormal;
 if(uKind>5.5&&uKind<6.5){
  float phaseBend=(aUV.y+.1)*3.14159+uTime*(1.35+iTiming.w)+phase;
  float amplitude=.055+.065*move;
  local.z+=amplitude*sin(phaseBend)*sin(aUV.x*3.14159);
  localNormal=normalize(aNormal+vec3(-amplitude*3.14159*sin(phaseBend)*cos(aUV.x*3.14159),-amplitude*3.14159*cos(phaseBend)*sin(aUV.x*3.14159),0));
  local.x*=.72+.28*fract(phase*.371);
 }
 if(uKind>1.5&&uKind<2.5){local.z+=.10*sin(aUV.y*5.4+uTime*1.2+phase);}
 local.xy*=iOrigin.w;
 local.z*=iOrigin.w;
 vec3 world=vec3(pos,iOrigin.z+move*(105.+iTiming.z*230.))+rotation*local;
 float focal=max(uResolution.x*.7,720.);
 float inv=clamp(focal/(focal+world.z),.19,5.);
 vec2 coord=(world.xy-uResolution*.5)*inv+uResolution*.5;
 float clipW=max(.2,(focal+world.z)/focal);
 gl_Position=vec4(vec2(coord.x/uResolution.x*2.-1.,1.-coord.y/uResolution.y*2.)*clipW,clamp(world.z/4000.,-.9,.9)*clipW,clipW);
 vUV=aUV;vNormal=normalize(rotation*localNormal);vOpacity=alpha;vDepth=world.z;vSeed=phase;
}`;
const fsMesh=`#version 300 es
precision highp float;
in vec2 vUV;in vec3 vNormal;in float vOpacity;in float vDepth;in float vSeed;
out vec4 outColor;uniform vec3 uAccent;uniform float uKind;uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
void main(){
 vec2 c=vUV-.5;float k=uKind;
 vec3 normal=normalize(vNormal);
 if(!gl_FrontFacing)normal=-normal;
 float light=.40+.60*max(0.,dot(normal,normalize(vec3(-.45,-.68,1.0))));
 float edge=pow(1.-abs(normal.z),2.2);
 float a=1.; vec3 color=uAccent;
 if(k<.5){
  // glitch: hard-edged volumetric cyber-cubes
  float pulse=step(.83,fract(vUV.y*23.+uTime*.17+vSeed));
  color=mix(uAccent*.42,vec3(.9,.22,.67),step(.73,hash(vec2(vSeed,17.))));
  color+=vec3(.25,.30,.55)*edge+uAccent*pulse*.18;
 }else if(k<1.5){
  float beam=pow(clamp(1.-abs(c.x)*2.,0.,1.),2.5);
  float flicker=.76+.24*sin(uTime*31.+vSeed*19.);
  a=beam*flicker; color=mix(uAccent,vec3(.85,.97,1.),beam*.85);
 }else if(k<2.5){
  float spine=abs(c.x)+.30*c.y;
  a=1.;
  float flow=.5+.5*sin(vUV.y*10.-uTime*.7+vSeed*13.);
  color=mix(vec3(.025,.015,.065),uAccent*.75,light*.35+edge*.25+flow*.12);
 }else if(k<3.5){
  float ray=pow(clamp(1.-abs(c.x)*2.,0.,1.),4.);
  a=ray*clamp(1.-abs(c.y)*1.6,0.,1.);
  float pulse=.82+.18*sin(uTime*2.1+vSeed*11.);
  color=mix(uAccent*.8,vec3(1.,.95,.69),ray*.8)*pulse;
 }else if(k<4.5){
  float grain=.82+.18*sin(vUV.x*91.+vUV.y*67.+vSeed*21.);
  color=(uAccent*(.45+.57*hash(vec2(vSeed,7.)))+vec3(.18,.12,.06)*light)*grain;
 }else if(k<5.5){
  // Faceted dielectric response with Beer-Lambert colour absorption and
  // internal spectral highlights; independent from the live camera texture.
  vec3 view=vec3(0,0,1),lamp=normalize(vec3(-.45,-.68,1.));
  vec3 halfVector=normalize(view+lamp);
  float roughness=.12+.11*hash(vec2(vSeed,3.)),r2=roughness*roughness;
  float nh=max(dot(normal,halfVector),0.);
  float distribution=r2/(3.14159*pow(nh*nh*(r2-1.)+1.,2.)+.0001);
  float fresnel=.055+.945*pow(1.-abs(normal.z),5.);
  float thickness=.35+.65*hash(vec2(vSeed,7.));
  vec3 absorption=exp(-(1.-uAccent)*thickness*2.1);
  vec3 reflected=reflect(-view,normal);
  vec3 environment=mix(vec3(.045,.10,.20),vec3(.71,.87,1.),smoothstep(-.45,.8,reflected.y));
  float internal=pow(.5+.5*sin(vUV.y*11.+normal.x*8.+normal.z*5.),14.);
  color=absorption*(.25+light*.45)*(1.-fresnel)+environment*fresnel+vec3(.7,.85,1.)*min(distribution*.12,2.);
  color+=vec3(.24,.08,.36)*internal*thickness;
 }else if(k<6.5){
  // Curved, pointed petal with luminous vein.
  float tip=1.-pow(clamp(abs(c.y)*2.,0.,1.),2.3);
  float side=abs(c.x)*2.;
  a=1.;
  float backlight=pow(max(0.,dot(-normal,normalize(vec3(-.45,-.68,1.)))),2.);
  float fiber=.94+.06*sin(vUV.y*142.+sin(vUV.x*35.)*2.);
  color=mix(uAccent*.68,vec3(1.,.78,.81),clamp(1.-side,0.,1.)*.47+abs(normal.z)*.15)*fiber;
  float vein=exp(-abs(c.x)*35.)*.09;
  float branches=pow(.5+.5*cos((abs(c.x)+vUV.y*.45)*92.),12.)*.025;
  color+=vec3(vein+branches)+uAccent*backlight*.48;
 }else if(k>8.5){
  color=mix(uAccent,vec3(.88,1.,1.),.35+.35*sin(vSeed*7.+uTime*4.));a=1.;
 }else if(k>7.5){
  color=mix(vec3(1.,.18,.015),vec3(1.,.85,.35),.5+.5*sin(vSeed*17.+uTime*2.));
  a=1.;
 }else{
  float filament=pow(clamp(1.-abs(c.x)*2.,0.,1.),3.2);
  filament*=.82+.18*sin(uTime*5.+vSeed*23.);
  a=filament;
  color=mix(uAccent*.32,vec3(.88,1.,1.),filament*.75);
 }
 color*=k>5.5&&k<6.5?(.65+.35*abs(dot(normal,normalize(vec3(-.45,-.68,1.))))):light;
 float fog=clamp(1.-max(vDepth,0.)/1800.,.56,1.);
 outColor=vec4(clamp(color*fog+edge*uAccent*.13,0.,1.),clamp(a*vOpacity,0.,1.));
 if(outColor.a<.008)discard;
}`;
const vsArc=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;layout(location=1) in vec2 aUV;
uniform vec2 uResolution;uniform float uTime;uniform float uKind;
out vec2 vUV;out float vDepth;
void main(){vec3 p=aPos;
 float k=(uKind<1.5?1.:.36);
 p.x+=sin(aUV.y*21.+uTime*(uKind<1.5?14.:2.2)+aPos.z*.02)*k*(uKind<1.5?3.0:12.);
 p.y+=cos(aUV.y*16.+uTime*1.9+aPos.z*.01)*k*2.0;
 float f=max(uResolution.x*.7,720.);float fac=clamp(f/(f+p.z),.4,2.7);
 vec2 xy=(p.xy-uResolution*.5)*fac+uResolution*.5;
 float clipW=max(.2,(f+p.z)/f);
 gl_Position=vec4((xy.x/uResolution.x*2.-1.)*clipW,(1.-xy.y/uResolution.y*2.)*clipW,clamp(p.z/4000.,-.9,.9)*clipW,clipW);vUV=aUV;vDepth=p.z;}`;
const fsArc=`#version 300 es
precision highp float;in vec2 vUV;in float vDepth;out vec4 outColor;
uniform vec3 uAccent;uniform float uAlpha;uniform float uKind;uniform float uTime;
void main(){float r=abs(vUV.x-.5)*2.;float core=pow(max(0.,1.-r),uKind<1.5?2.3:1.3);
 float f=.82+.18*sin(vUV.y*41.+uTime*11.);
 float propagation=1.;
 if(uKind<1.5){
  float strike=floor(uTime*9.);
  float leader=fract(uTime*9.);
  propagation=smoothstep(vUV.y-.10,vUV.y+.04,leader*3.);
  f=.45+.55*pow(max(0.,1.-leader),.32);
 }else if(uKind>8.5){
  f=.24+.76*pow(.5+.5*sin(vUV.y*18.-uTime*5.),7.);
 }else{f=.45+.55*pow(.5+.5*sin(vUV.y*23.-uTime*3.8+vDepth*.006),3.);}
 vec3 c=mix(uAccent,vec3(.93,.98,1.),core*.70)*(.65+.35*clamp(1.-vDepth/1600.,.3,1.));
 outColor=vec4(c*f,core*uAlpha*propagation);
 if(outColor.a<.007)discard;}`;
function program(gl,vsrc,fsrc){
 const shaders=[];let linked=null;
 try{
  for(const [type,source]of [[gl.VERTEX_SHADER,vsrc],[gl.FRAGMENT_SHADER,fsrc]]){
   const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
   if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('3D shader: '+gl.getShaderInfoLog(shader));
  }
  linked=gl.createProgram();for(const shader of shaders)gl.attachShader(linked,shader);gl.linkProgram(linked);
  if(!gl.getProgramParameter(linked,gl.LINK_STATUS))throw Error('3D shader link: '+gl.getProgramInfoLog(linked));
  return linked;
 }catch(error){if(linked)gl.deleteProgram(linked);throw error;}
 finally{for(const shader of shaders)gl.deleteShader(shader);}
}
function grid(){const v=[];for(let y=0;y<5;y++)for(let x=0;x<8;x++){const uvx=x/7,uvy=y/4,xx=uvx-.5,yy=uvy-.5;v.push(xx,yy,0,0,0,1,uvx,uvy)}
 const ix=[];for(let y=0;y<4;y++)for(let x=0;x<7;x++){const a=y*8+x;ix.push(a,a+1,a+8,a+1,a+9,a+8)}return expand(v,ix);}
function expand(v,inds){const f=[];for(const i of inds)f.push(...v.slice(i*8,i*8+8));return new Float32Array(f)}
function petalMesh(){
 const v=[],ix=[],nx=16,ny=20;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
  const u=x/nx,t=y/ny,s=u*2-1,width=Math.pow(Math.sin(Math.PI*t),.7)*.43;
  v.push(s*width,t-.5,.18*s*s+.12*Math.sin(t*Math.PI)-.09*t*t,-.36*s,0,1,u,t);
 }
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x;ix.push(a,a+1,a+nx+1,a+1,a+nx+2,a+nx+1)}
 return expand(v,ix);
}
function crystalMesh(){
 const v=[];const ring=(i,y,r)=>[Math.cos(i*Math.PI/3)*r,y,Math.sin(i*Math.PI/3)*r];
 function tri(a,b,c){const u=b.map((x,i)=>x-a[i]),w=c.map((x,i)=>x-a[i]);let n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n);n=n.map(x=>x/l);for(const [p,uv]of [[a,[0,0]],[b,[1,0]],[c,[.5,1]]])v.push(...p,...n,...uv)}
 for(let i=0;i<6;i++){const a=ring(i,-.32,.23),b=ring(i+1,-.32,.23),c=ring(i,.29,.28),d=ring(i+1,.29,.28);tri(a,b,c);tri(b,d,c);tri(c,d,[.06,.7,.03]);tri(b,a,[0,-.5,0]);}
 return new Float32Array(v);
}
function cube(){const v=[];function face(a,b,c,d,n){for(const [pt,uv] of [[a,[0,0]],[b,[1,0]],[c,[1,1]],[a,[0,0]],[c,[1,1]],[d,[0,1]]])v.push(...pt,...n,...uv)}
 const k=.43;face([-k,-k,k],[k,-k,k],[k,k,k],[-k,k,k],[0,0,1]);face([k,-k,-k],[-k,-k,-k],[-k,k,-k],[k,k,-k],[0,0,-1]);
 face([-k,-k,-k],[-k,-k,k],[-k,k,k],[-k,k,-k],[-1,0,0]);face([k,-k,k],[k,-k,-k],[k,k,-k],[k,k,k],[1,0,0]);
 face([-k,k,k],[k,k,k],[k,k,-k],[-k,k,-k],[0,1,0]);face([-k,-k,-k],[k,-k,-k],[k,-k,k],[-k,-k,k],[0,-1,0]);return new Float32Array(v);}
function octa(){const a=[0,-.5,0],b=[.50,0,0],c=[0,0,.40],d=[-.5,0,0],e=[0,0,-.40],f=[0,.5,0];const v=[];
 const tri=(p,q,r)=>{let A=[q[0]-p[0],q[1]-p[1],q[2]-p[2]],B=[r[0]-p[0],r[1]-p[1],r[2]-p[2]];let n=[A[1]*B[2]-A[2]*B[1],A[2]*B[0]-A[0]*B[2],A[0]*B[1]-A[1]*B[0]],m=Math.hypot(...n)||1;n=n.map(t=>t/m);for(const [x,uv] of [[p,[0,0]],[q,[1,0]],[r,[.5,1]]])v.push(...x,...n,...uv)};
 for(const [p,q] of [[b,c],[c,d],[d,e],[e,b]]){tri(f,p,q);tri(a,q,p)}return new Float32Array(v)}
function rgb(h){if(!/^#[0-9a-f]{6}$/i.test(h||''))h='#6f94ff';return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)}
function tex(gl,img){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return t;}
// Shared conservative optical gate; all work stays on the GPU until the final 4 bytes.
class CoverageProbe{
 constructor(gl){this.gl=gl;this.coverageProgram=program(gl,vsSeal,fsCoverage);this.uniformLocations=new Map();
  this.coverageTargets=[];this.coveragePixels=new Uint8Array(4);this.coverageField=null;this.sampleSequence=0;this.pending=null;
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,0,1,1,0,1]),gl.STATIC_DRAW);
 }
 uniform(p,name,type,...values){const gl=this.gl;let locations=this.uniformLocations.get(p);if(!locations){locations=new Map();this.uniformLocations.set(p,locations)}if(!locations.has(name))locations.set(name,gl.getUniformLocation(p,name));const l=locations.get(name);if(l===null)return;if(type==='1i')gl.uniform1i(l,values[0]);else if(type==='2i')gl.uniform2i(l,...values);}
 coverageTexture(w,h,data=null){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);return t;
 }
 releaseCoverage(){const gl=this.gl;this.cancelPending();
  for(const target of this.coverageTargets){gl.deleteFramebuffer(target.fbo);gl.deleteTexture(target.texture);}
  this.coverageTargets=[];
  if(this.coverageSource)gl.deleteTexture(this.coverageSource);
  if(this.coverageMask)gl.deleteTexture(this.coverageMask);
  this.coverageSource=null;this.coverageMask=null;this.coverageField=null;this.coverageSize='';
 }
 prepareCoverage(field){const gl=this.gl,w=this.current.W,h=this.current.H,key=w+'x'+h;
  if(this.coverageSize!==key){
   this.releaseCoverage();this.coverageSource=this.coverageTexture(w,h);this.coverageSize=key;
   let width=w,height=h;
   do{
    width=Math.max(1,Math.ceil(width/2));height=Math.max(1,Math.ceil(height/2));
    const texture=this.coverageTexture(width,height),fbo=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    this.coverageTargets.push({texture,fbo,width,height});
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){this.releaseCoverage();throw Error('Optical coverage framebuffer incomplete');}
   }while(width>1||height>1);
  }
  if(this.coverageField!==field){
   if(this.coverageMask)gl.deleteTexture(this.coverageMask);
   this.coverageMask=this.coverageTexture(field.mw,field.mh,field.map);this.coverageField=field;
  }
 }
 measure(field,width,height,asynchronous=false){if(!field?.map||width<1||height<1)return 0;this.current={W:width,H:height};
  if(!asynchronous)this.cancelPending();
  const gl=this.gl,w=this.current.W,h=this.current.H,pr=this.coverageProgram;
  const start=performance.now();
  try{
   this.prepareCoverage(field);
   // GPU copy of the final rendered composite: no 8 MB CPU image allocation.
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.coverageSource);
   gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,w,h);
   gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.useProgram(pr);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.vertexAttribDivisor(0,0);
   this.uniform(pr,'uImage','1i',0);this.uniform(pr,'uMask','1i',1);
   gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.coverageMask);
   let source=this.coverageSource,width=w,height=h;
   for(let index=0;index<this.coverageTargets.length;index++){
    const target=this.coverageTargets[index];gl.bindFramebuffer(gl.FRAMEBUFFER,target.fbo);gl.viewport(0,0,target.width,target.height);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,source);
    this.uniform(pr,'uSize','2i',width,height);this.uniform(pr,'uFirst','1i',index===0?1:0);
    gl.drawArrays(gl.TRIANGLES,0,6);source=target.texture;width=target.width;height=target.height;
   }
   if(asynchronous){
    if(!this.readbackBuffer){this.readbackBuffer=gl.createBuffer();gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.readbackBuffer);gl.bufferData(gl.PIXEL_PACK_BUFFER,4,gl.STREAM_READ);}
    else gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.readbackBuffer);
    gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,0);
    const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
    this.pending={fence,field,width:w,height:h,sequence:++this.sampleSequence,requestedAt:performance.now()};
    return null;
   }
   gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,this.coveragePixels);
   this.coverageMinimum=this.coveragePixels[0]/255;this.coverageReadbackBytes=4;
   // Binary conservative gate: even one sub-threshold source pixel refuses ACK.
   return this.coveragePixels[1]>0&&this.coveragePixels[0]>=254?1:0;
  }finally{
   gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.activeTexture(gl.TEXTURE0);
   gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   this.coverageMilliseconds=performance.now()-start;
  }
 }
 cancelPending(){if(this.pending?.fence)this.gl.deleteSync(this.pending.fence);this.pending=null;}
 sampleAsync(field,width,height){const gl=this.gl;
  if(this.pending&&(this.pending.field!==field||this.pending.width!==width||this.pending.height!==height))this.cancelPending();
  if(this.pending){
   const sample=this.pending,status=gl.clientWaitSync(sample.fence,0,0);
   if(status===gl.TIMEOUT_EXPIRED)return {ready:false,ratio:null,sequence:sample.sequence};
   if(status===gl.WAIT_FAILED){this.cancelPending();throw Error('GPU optical coverage fence failed');}
   gl.bindBuffer(gl.PIXEL_PACK_BUFFER,this.readbackBuffer);gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,this.coveragePixels);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
   this.coverageMinimum=this.coveragePixels[0]/255;this.coverageReadbackBytes=4;this.coverageLatency=performance.now()-sample.requestedAt;
   this.cancelPending();return {ready:true,ratio:this.coveragePixels[1]>0&&this.coveragePixels[0]>=254?1:0,sequence:sample.sequence};
  }
  this.measure(field,width,height,true);
  return {ready:false,ratio:null,sequence:this.pending?.sequence??this.sampleSequence};
 }
 invalidate(){this.cancelPending();this.coverageField=null;}
 diagnostics(){return {method:'Conservative all-pixel GPU minimum reduction',readbackBytes:this.coverageReadbackBytes||0,minimum:this.coverageMinimum??null,milliseconds:this.coverageMilliseconds??null,asyncLatencyMilliseconds:this.coverageLatency??null,pending:!!this.pending,targets:this.coverageTargets.length};}
 dispose(){this.releaseCoverage();if(this.readbackBuffer)this.gl.deleteBuffer(this.readbackBuffer);this.readbackBuffer=null;this.gl.deleteProgram(this.coverageProgram);this.gl.deleteBuffer(this.quad);this.uniformLocations.clear();}
}
class Renderer{
 constructor(){
  const c=document.createElement('canvas');c.id='sc-gpu-3d';c.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;background:transparent;display:none';document.body.appendChild(c);
  const gl=c.getContext('webgl2',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl){c.remove();throw Error('WebGL2 unavailable; Canvas2D volumetric compatibility path retained')}
  this.canvas=c;this.gl=gl;this.ready=true;this.current=null;this.resources=[];this.crystalHero=null;
  // WebGL uniform locations are constant for a linked program. Cache them once
  // instead of synchronously querying the driver on every animation frame.
  this.uniformLocations=new Map();
  try{
   this.seal=program(gl,vsSeal,fsVolume);this.fire=program(gl,vsSeal,fsInferno);this.coverageProbe=new CoverageProbe(gl);
   this.legacySeal=program(gl,vsSeal,fsSeal);this.mesh=program(gl,vsMesh,fsMesh);this.arcs=program(gl,vsArc,fsArc);
  }catch(error){
   if(this.coverageProbe)this.coverageProbe.dispose();
   for(const p of [this.seal,this.fire,this.legacySeal,this.mesh,this.arcs])if(p)gl.deleteProgram(p);
   this.ready=false;c.remove();throw error;
  }
  this.geo={grid:grid(),cube:cube(),octa:octa(),
   petal:petalMesh(),crystal:crystalMesh(),
   feather:root.SCPremiumMeshes?root.SCPremiumMeshes.get('feather_00'):grid()};
  this.vbo={};for(const [name,points] of Object.entries(this.geo)){const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);this.vbo[name]=buf}
  this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,0,1,1,0,1]),gl.STATIC_DRAW);
  this.inst=gl.createBuffer();this.arcBuffer=gl.createBuffer();this.buffers=[this.quad,...Object.values(this.vbo),this.inst,this.arcBuffer];
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  // Camera-local coordinates have downward Y; projection reverses winding.
  gl.frontFace(gl.CW);
  gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);
  c.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.hide();console.warn('SC 3D context lost; using Canvas2D fallback')});
  c.addEventListener('webglcontextrestored',()=>{console.info('SC 3D context restored; recreating shader and buffer resources');location.reload()});
 }
 uniform(p,name,type,...val){const gl=this.gl;
  let locations=this.uniformLocations.get(p);
  if(!locations){locations=new Map();this.uniformLocations.set(p,locations)}
  if(!locations.has(name))locations.set(name,gl.getUniformLocation(p,name));
  const l=locations.get(name);if(l===null)return;
  if(type==='1f')gl.uniform1f(l,val[0]);else if(type==='2f')gl.uniform2f(l,...val);
  else if(type==='3f')gl.uniform3f(l,...val);else if(type==='4f')gl.uniform4f(l,...val);else if(type==='1i')gl.uniform1i(l,val[0]);else if(type==='2i')gl.uniform2i(l,...val);
 }
 size(w,h){const c=this.canvas,gl=this.gl;if(c.width!==w||c.height!==h){c.width=w;c.height=h}gl.viewport(0,0,w,h)}
 prepare(fx){if(!this.ready)throw Error('3D GPU context is not ready');this.dispose();const gl=this.gl;
  const maxTex=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if(fx.W>maxTex||fx.H>maxTex)throw Error('Camera frame exceeds WebGL2 texture size; select Canvas2D volumetric compatibility');
  this.current=fx;this.kind=NAMES[fx.type];this.accent=rgb(fx.tuning.accent||fx.config.color);this.motion=fx.motion;
  this.steps=({Performance:16,Balanced:24,Cinematic:36,Ultra:56})[fx.quality]||36;
  // The digital seal must use the same conservative camera footprint as the
  // optical gate. Sampling the old full-size silhouette left tiny edge gaps
  // where one downsampled camera-mask texel spans several output pixels.
  if(fx.type==='glitch'&&fx.field?.map){
   const {mw,mh,map}=fx.field,margin=new Uint8Array(mw*mh*4);
   // One mask texel of overscan protects fractional scaling and MSAA sample
   // positions along keyed edges; the gate still tests the original mask.
   for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
    let alpha=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<mw&&yy<mh)alpha=Math.max(alpha,map[(yy*mw+xx)*4+3]);
    }
    margin[(y*mw+x)*4+3]=alpha;
   }
   this.texture=this.coverageProbe.coverageTexture(mw,mh,margin);
  }else this.texture=tex(gl,fx.subject||fx.seal);
  this.coverageProbe.invalidate();
  const rows=[];
  const mult=fx.type==='inferno'?.004:fx.type==='sand'?.012:fx.type==='petal'?.082:fx.type==='shadow'?.072:fx.type==='crystal'?.095:fx.type==='glitch'?.095:fx.type==='holy'?.005:fx.type==='lightning'?.008:.022;
  for(const a of fx.particles){const size=clamp(fx.b.w*mult*a.size,fx.type==='sand'?1.1:5,fx.type==='crystal'?135:fx.type==='sand'?12:95);
   rows.push(a.x,a.y,(a.depth-1)*180,size,a.tx,a.ty,a.spin,a.phase,a.delay,a.spin*.18,a.depth,.7+a.size*.2);}
  this.instances=rows.length/12;
  this.instanceData=new Float32Array(rows);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.inst);gl.bufferData(gl.ARRAY_BUFFER,this.instanceData,gl.STATIC_DRAW);
  this.arcData=this.createArcs(fx);gl.bindBuffer(gl.ARRAY_BUFFER,this.arcBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.arcData,gl.STATIC_DRAW);
  this.canvas.style.display='block';this.size(fx.W,fx.H);
 }
 createArcs(fx){if(!['lightning','plasma','holy','neon'].includes(fx.type))return new Float32Array(0);
  const verts=[],b=fx.b,paths=fx.type==='neon'?Array.from({length:7},(_,i)=>Array.from({length:81},(_,j)=>{
   const theta=j/80*TWO,angle=i/7*Math.PI,rad=.23+i*.022;
   return [b.x+b.w*(.5+Math.cos(theta)*rad*Math.cos(angle)),b.y+b.h*(.5+Math.sin(theta)*rad*1.08)];
  })):fx.type==='lightning'?fx.arcs.map(a=>a.pts):fx.type==='plasma'?Array.from({length:9},(_,i)=>Array.from({length:60},(_,j)=>{
   const y=j/59,cx=b.x+b.w*.5,cy=b.y+b.h*.53,k=i/9*6.28318+y*12;return [cx+Math.cos(k)*b.w*(.26+.09*Math.sin(y*8+i)),b.y+b.h*(1.15-y*1.30)]})):Array.from({length:18},(_,i)=>Array.from({length:12},(_,j)=>[b.x+b.w*(i+.5)/18,b.y+b.h*(1.12-j/11*1.45)]));
  if(fx.type==='lightning'){
   const leaders=paths.slice();
   for(let i=0;i<leaders.length;i++){const path=leaders[i];for(let j=2;j<path.length-2;j+=3){
    const root=path[j],side=((j+i)%2?1:-1);
    paths.push(Array.from({length:7},(_,k)=>[root[0]+side*k*b.w*.027+Math.sin(k*2.7+i)*k*2,root[1]-k*b.h*.025+Math.cos(k*1.9)*k]));
   }}
  }
  let pathID=0;
  for(const path of paths){pathID++;if(path.length<2)continue;for(let j=1;j<path.length;j++){
   const p=path[j-1],q=path[j],dx=q[0]-p[0],dy=q[1]-p[1],l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l;
   const wide=(fx.type==='neon'?3.2:fx.type==='plasma'?5:fx.type==='holy'?3.4:2.5)*(fx.type==='neon'?1:1-.65*j/path.length);
   const uv0=(j-1)/(path.length-1),uv1=j/(path.length-1);
   const z0=Math.sin(uv0*5+pathID*2.4)*b.w*.25,z1=Math.sin(uv1*5+pathID*2.4)*b.w*.25;
   const sides=fx.quality==='Performance'?4:8;
   for(let s=0;s<sides;s++){
    const a=s/sides*TWO,c=(s+1)/sides*TWO;
    const point=(r,z,angle)=>[r[0]+nx*Math.cos(angle)*wide,r[1]+ny*Math.cos(angle)*wide,z+Math.sin(angle)*wide];
    const P=point(p,z0,a),Q=point(p,z0,c),R=point(q,z1,a),S=point(q,z1,c);
    for(const [pt,u,v] of [[P,.25,uv0],[Q,.75,uv0],[R,.25,uv1],[R,.25,uv1],[Q,.75,uv0],[S,.75,uv1]])verts.push(...pt,u,v);
   }
  }}return new Float32Array(verts)}
 hide(){this.canvas.style.display='none';this.coverageProbe.cancelPending();this.clear()}
 dispose(){this.coverageProbe.cancelPending();if(this.crystalHero){this.crystalHero.dispose();this.crystalHero=null}if(this.texture){this.gl.deleteTexture(this.texture);this.texture=null}this.current=null;this.instances=0;this.arcData=null;this.clear()}
 // dispose resets one job; destroy releases the renderer-owned resource pool.
 destroy(){if(this.destroyed)return;this.dispose();this.coverageProbe.dispose();for(const buffer of this.buffers)this.gl.deleteBuffer(buffer);for(const p of [this.seal,this.fire,this.legacySeal,this.mesh,this.arcs])this.gl.deleteProgram(p);this.uniformLocations.clear();this.ready=false;this.destroyed=true;this.canvas.remove();}
 clear(){if(!this.ready)return;const gl=this.gl;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)}
 render(stage,p,age){if(!this.current||!this.ready)return false;const gl=this.gl,fx=this.current;
  this.size(fx.W,fx.H);this.canvas.style.display='block';gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(this.crystalHero){return this.crystalHero.render(stage,p,age,fx.config.inBuild)}
  let plate=0,moveStage=0,moveP=0,energy=0,release=0;
  if(stage==='cover'){plate=p;moveStage=0;moveP=p;energy=p;}
  else if(stage==='out'){plate=1-(p<.12?0:(p-.12)/.65);moveStage=1;moveP=p;energy=1-p;release=p;}
  else if(stage==='in'){let build=fx.config.inBuild;
   if(p<build){let q=p/build;plate=clamp((q-.2)/.80);moveStage=2;moveP=q;energy=q;}
   else if(p<build+.095){plate=1;moveStage=4;moveP=0;energy=1;}
   else{let q=clamp((p-build-.095)/(1-build-.095));plate=1-q;moveStage=3;moveP=q;energy=1-q;release=q;}
  }
  plate=clamp(plate);
  if(plate>.003)this.drawSeal(plate,age,release,stage==='in');
  if(this.instances&&this.kind!==2)this.drawInstances(moveStage,moveP,age);
  if(this.arcData&&this.arcData.length>0&&energy>.008&&this.kind!==3)this.drawArcs(energy,age);
  return true;
 }
 drawSeal(p,age,release=0,inbound=false){const gl=this.gl,pr=this.kind===0?this.legacySeal:this.kind===8?this.fire:this.seal;gl.useProgram(pr);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,8,0);gl.vertexAttribDivisor(0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);
  this.uniform(pr,'uSeal','1i',0);this.uniform(pr,'uProgress','1f',p);this.uniform(pr,'uClock','1f',age);this.uniform(pr,'uKind','1f',this.kind);this.uniform(pr,'uAccent','3f',...this.accent);
  this.uniform(pr,'uSteps','1f',this.steps);
  this.uniform(pr,'uRelease','1f',release);this.uniform(pr,'uDirection','1f',inbound?1:0);
  const b=this.current.b;this.uniform(pr,'uBounds','4f',b.x/this.current.W,b.y/this.current.H,b.w/this.current.W,b.h/this.current.H);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 drawInstances(stage,p,age){const gl=this.gl,pr=this.mesh,kind=this.kind;
  gl.useProgram(pr);const name=kind===6?'petal':kind===5?'crystal':kind===2?'feather':kind===0?'cube':[1,3,4,8,9].includes(kind)?'octa':'grid';const geo=this.geo[name];gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo[name]);
  for(const [idx,size,off] of [[0,3,0],[1,3,3],[2,2,6]]){gl.enableVertexAttribArray(idx);gl.vertexAttribPointer(idx,size,gl.FLOAT,false,32,off*4);gl.vertexAttribDivisor(idx,0)}
  gl.bindBuffer(gl.ARRAY_BUFFER,this.inst);
  for(const [idx,offset] of [[3,0],[4,4],[5,8]]){gl.enableVertexAttribArray(idx);gl.vertexAttribPointer(idx,4,gl.FLOAT,false,48,offset*4);gl.vertexAttribDivisor(idx,1)}
  this.uniform(pr,'uResolution','2f',this.current.W,this.current.H);this.uniform(pr,'uTime','1f',age);this.uniform(pr,'uProgress','1f',p);this.uniform(pr,'uStage','1f',stage);
  this.uniform(pr,'uMotion','1f',this.motion);this.uniform(pr,'uKind','1f',kind);this.uniform(pr,'uAccent','3f',...this.accent);
  if([1,3,7,9].includes(kind)){gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA)}
  if([0,4,5,6].includes(kind)){gl.enable(gl.DEPTH_TEST);gl.depthMask(true)}
  gl.drawArraysInstanced(gl.TRIANGLES,0,geo.length/8,this.instances);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  for(let i=3;i<=5;i++)gl.vertexAttribDivisor(i,0);
 }
 drawArcs(alpha,age){const gl=this.gl,pr=this.arcs;gl.useProgram(pr);gl.bindBuffer(gl.ARRAY_BUFFER,this.arcBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,20,12);
  this.uniform(pr,'uResolution','2f',this.current.W,this.current.H);this.uniform(pr,'uTime','1f',age);this.uniform(pr,'uKind','1f',this.kind);
  this.uniform(pr,'uAccent','3f',...this.accent);this.uniform(pr,'uAlpha','1f',clamp(alpha)*.64);
  gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,this.arcData.length/5);
  gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
 }
 measureCoverage(field){if(!this.ready||!this.current)return 0;return this.coverageProbe.measure(field,this.current.W,this.current.H);}
 measureCoverageAsync(field){if(!this.ready||!this.current)return {ready:false,ratio:null};return this.coverageProbe.sampleAsync(field,this.current.W,this.current.H);}
 diagnostics(){const gl=this.gl;if(this.crystalHero)return {...this.crystalHero.diagnostics(),renderer:String(gl.getParameter(gl.RENDERER)||'')};return {mode:this.ready?'WebGL2 instanced 3D':'WebGL2 context lost',material:this.kind===8?'Volumetric combustion':'GPU family '+this.kind,instances:this.instances||0,triangles:(this.instances||0)*16,volumeSteps:this.steps,coverage:this.coverageProbe.diagnostics(),renderer:String(gl.getParameter(gl.RENDERER)||''),maxTexture:gl.getParameter(gl.MAX_TEXTURE_SIZE)};}
}
root.SCGPU3D={Renderer,CoverageProbe,TYPES,shaders:{vsSeal,fsSeal,fsVolume,fsInferno,fsCoverage,vsMesh,fsMesh,vsArc,fsArc}};
})(window);
