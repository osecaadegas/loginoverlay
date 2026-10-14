import { Filter, GlProgram, Texture } from 'pixi.js';
import type { WidgetConfig } from './config';

type ChromaKeyConfig = Pick<WidgetConfig, 'chromaColor' | 'tolerance' | 'softness' | 'spill'>;

const vertex = `
precision highp float;
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vLocal;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(position, 0.0, 1.0);
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
  vLocal = aPosition;
}`;

const keyFragment = `
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform vec3 uKeyColor;
uniform float uTolerance;
uniform float uSoftness;
uniform float uSpill;
out vec4 finalColor;
vec2 chroma(vec3 c) {
  return vec2(-0.168736*c.r-0.331264*c.g+0.5*c.b, 0.5*c.r-0.418688*c.g-0.081312*c.b);
}
void main() {
  vec4 source = texture(uTexture, vTextureCoord);
  vec3 rgb = source.rgb / max(source.a, 0.0001);
  float difference = distance(chroma(rgb), chroma(uKeyColor));
  float alpha = smoothstep(uTolerance, uTolerance + uSoftness, difference) * source.a;
  vec3 excess = max(rgb - max(rgb.gbr, rgb.brg), 0.0);
  vec3 keyDominance = step(uKeyColor.gbr, uKeyColor) * step(uKeyColor.brg, uKeyColor);
  rgb -= excess * keyDominance * uSpill * (1.0 - smoothstep(uTolerance, uTolerance + 0.35, difference));
  finalColor = vec4(max(rgb, 0.0) * alpha, alpha);
}`;

const iceFragment = `
precision highp float;
in vec2 vTextureCoord;
in vec2 vLocal;
uniform sampler2D uTexture;
uniform sampler2D uSurfaceTexture;
uniform float uProgress;
uniform float uTime;
uniform float uFrost;
uniform float uCrystals;
uniform float uCracks;
uniform float uFracture;
uniform float uReflections;
uniform float uGlow;
uniform vec3 uIceColor;
uniform vec4 uInputSize;
out vec4 finalColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  mat2 turn = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i=0; i<4; i++) {
    value += noise(p) * amplitude;
    p = turn * p * 2.03 + vec2(13.7, 9.2);
    amplitude *= 0.48;
  }
  return value;
}
vec3 voronoi(vec2 p) {
  vec2 cell = floor(p); vec2 f = fract(p); float a = 9.0; float b = 9.0; float facet = 0.0;
  for (int y=-1; y<=1; y++) { for (int x=-1; x<=1; x++) {
    vec2 o = vec2(float(x),float(y));
    float d = length(o + hash2(cell+o) - f);
    if(d<a) {b=a; a=d; facet=hash(cell+o);} else if(d<b) {b=d;}
  }}
  return vec3(a,b-a,facet);
}
void main() {
  vec4 source = texture(uTexture,vTextureCoord);
  if(source.a < 0.002) { finalColor=vec4(0); return; }
  vec2 texel = uInputSize.zw;
  vec2 p = vLocal * vec2(1.7778,1.0);
  float grain = fbm(p*7.0 + vec2(-uTime*0.018, uTime*0.011));
  vec2 refractionNormal = vec2(
    fbm(p*19.0+vec2(7.1,1.8))-fbm(p*19.0+vec2(7.17,1.8)),
    fbm(p*19.0+vec2(4.4,9.2))-fbm(p*19.0+vec2(4.4,9.27))
  );
  vec2 refractedUv = vTextureCoord + refractionNormal * texel * (24.0 + uFrost*18.0) * uProgress;
  vec4 refractedSource = texture(uTexture, refractedUv);
  vec3 original = source.rgb/max(source.a,0.001);
  vec3 refracted = refractedSource.rgb/max(refractedSource.a,0.001);
  original = mix(original,refracted,0.18*uProgress);
  vec3 surface = texture(uSurfaceTexture,fract(p*1.15)).rgb;
  float surfaceFrost = dot(surface,vec3(0.2126,0.7152,0.0722));
  float n = grain*0.58 + noise(p*39.0)*0.28 + noise(p*123.0)*0.14;
  float edgeNear = 0.0;
  float edgeWide = 0.0;
  vec2 nearStep = texel * 3.0;
  vec2 wideStep = texel * 9.0;
  edgeNear += 1.0-texture(uTexture,vTextureCoord+vec2(nearStep.x,0)).a;
  edgeNear += 1.0-texture(uTexture,vTextureCoord-vec2(nearStep.x,0)).a;
  edgeNear += 1.0-texture(uTexture,vTextureCoord+vec2(0,nearStep.y)).a;
  edgeNear += 1.0-texture(uTexture,vTextureCoord-vec2(0,nearStep.y)).a;
  edgeWide += 1.0-texture(uTexture,vTextureCoord+vec2(wideStep.x,wideStep.y)).a;
  edgeWide += 1.0-texture(uTexture,vTextureCoord+vec2(-wideStep.x,wideStep.y)).a;
  edgeWide += 1.0-texture(uTexture,vTextureCoord+vec2(wideStep.x,-wideStep.y)).a;
  edgeWide += 1.0-texture(uTexture,vTextureCoord-vec2(wideStep.x,wideStep.y)).a;
  edgeNear = clamp(edgeNear*0.38,0.0,1.0);
  edgeWide = clamp(edgeWide*0.24,0.0,1.0);
  float growth = (0.67-vLocal.y)*0.44 + n*0.33 - edgeNear*0.31 - edgeWide*0.16 + 0.22;
  float ice = smoothstep(growth-0.105,growth+0.105,uProgress*1.18);
  if(uProgress <= 0.001) ice=0.0;
  vec3 crystal = voronoi(p*(15.0+uCrystals*30.0));
  float fine = pow(max(0.0,1.0-crystal.y*14.0),4.0)*uCrystals;
  float roughness = noise(p*280.0)*0.48+noise(p*550.0)*0.27;
  vec3 bigCrystal = voronoi(p*10.0+vec2(1.7,-2.3));
  vec3 offsetCrystal = voronoi(mat2(0.82,-0.57,0.57,0.82)*p*17.0+vec2(4.8,2.1));
  float crackCore = 1.0-smoothstep(0.006,0.022,bigCrystal.y);
  float secondaryCore = 1.0-smoothstep(0.002,0.011,offsetCrystal.y);
  vec2 radial = p-vec2(0.89,0.47);
  float angle = atan(radial.y,radial.x)/6.2831853+0.5;
  float rayField = abs(fract(angle*13.0 + noise(vec2(length(radial)*5.0,angle*3.0))*0.42)-0.5);
  float radialCrack = (1.0-smoothstep(0.468,0.498,rayField))*smoothstep(0.035,0.16,length(radial))*smoothstep(0.9,0.16,length(radial));
  float fractureAmount = smoothstep(0.03,0.82,uFracture);
  float crack = max(crackCore,secondaryCore*0.46)*uCracks*(0.3+fractureAmount*0.7);
  crack = max(crack,radialCrack*fractureAmount*uCracks*0.76);
  float crackRim = (smoothstep(0.007,0.018,bigCrystal.y)-smoothstep(0.018,0.048,bigCrystal.y))*uCracks;
  float branch = secondaryCore*(0.11+fractureAmount*0.62)*uCracks;
  float luminance = dot(original,vec3(0.2126,0.7152,0.0722));
  vec3 base = mix(original,vec3(luminance),0.66);
  base = mix(base,uIceColor*(0.14+luminance*0.82),0.38+uFrost*0.32);
  float frozenBloom = smoothstep(0.5,0.96,grain+surfaceFrost*0.37);
  base += uIceColor*(roughness*0.13+fine*0.31+frozenBloom*0.13)*uFrost;
  float facetedLight = (bigCrystal.z-0.5)*0.27+(crystal.z-0.5)*0.12+(offsetCrystal.z-0.5)*0.08;
  base += vec3(0.34,0.73,0.91)*facetedLight*uCrystals;
  base += (surface-vec3(0.39,0.46,0.50))*uFrost*0.38;
  base = mix(base,uIceColor*(0.68+luminance*0.46),smoothstep(0.47,0.8,surfaceFrost)*uFrost*0.36);
  float reflection = pow(max(0.0,sin(p.x*11.0+p.y*4.0-uTime*0.29)),31.0);
  float glint = pow(max(0.0,1.0-bigCrystal.x),11.0)*0.46;
  float rimLight = clamp(edgeNear*0.74+edgeWide*0.26,0.0,1.0);
  base += vec3(0.68,0.90,1.0)*(reflection*0.24+glint+rimLight*0.31)*uReflections;
  base = mix(base,vec3(0.008,0.052,0.086),crack*0.86);
  base += (crackRim*0.36+branch*0.31+rimLight*0.3)*uIceColor*(0.63+uGlow);
  base += radialCrack*fractureAmount*vec3(0.55,0.88,1.0)*0.33;
  finalColor=vec4(mix(original,base,ice)*source.a,source.a);
}`;

export function hexRgb(hex: string): Float32Array {
  return new Float32Array([1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255));
}

export function createKeyFilter(config: ChromaKeyConfig) {
  return new Filter({
    glProgram: GlProgram.from({ vertex, fragment: keyFragment, name: 'silhouette-chroma-key' }),
    resources: { keyUniforms: {
      uKeyColor: { value: hexRgb(config.chromaColor), type: 'vec3<f32>' },
      uTolerance: { value: config.tolerance, type: 'f32' },
      uSoftness: { value: config.softness, type: 'f32' },
      uSpill: { value: config.spill, type: 'f32' },
    } },
  });
}

export function createIceFilter(config: WidgetConfig) {
  return new Filter({
    glProgram: GlProgram.from({ vertex, fragment: iceFragment, name: 'crystalline-silhouette-ice' }),
    resources: { uSurfaceTexture: Texture.WHITE.source, iceUniforms: {
      uProgress: { value: 0, type: 'f32' }, uTime: { value: 0, type: 'f32' },
      uFrost: { value: config.frost, type: 'f32' }, uCrystals: { value: config.crystals, type: 'f32' },
      uCracks: { value: config.cracks, type: 'f32' }, uFracture: { value: 0, type: 'f32' },
      uReflections: { value: config.reflections, type: 'f32' }, uGlow: { value: config.glow, type: 'f32' },
      uIceColor: { value: hexRgb(config.iceColor), type: 'vec3<f32>' },
    } },
  });
}
