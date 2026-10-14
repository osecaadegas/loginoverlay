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
  vec3 original = source.rgb/max(source.a,0.001);
  vec2 p = vLocal * vec2(1.7778,1.0);
  vec3 surface = texture(uSurfaceTexture,fract(p*1.15)).rgb;
  float surfaceFrost = dot(surface,vec3(0.2126,0.7152,0.0722));
  float n = noise(p*11.0) * 0.6 + noise(p*37.0)*0.3 + noise(p*117.0)*0.1;
  float edge = 0.0;
  vec2 stepSize = uInputSize.zw * 3.0;
  edge += 1.0-texture(uTexture,vTextureCoord+vec2(stepSize.x,0)).a;
  edge += 1.0-texture(uTexture,vTextureCoord-vec2(stepSize.x,0)).a;
  edge += 1.0-texture(uTexture,vTextureCoord+vec2(0,stepSize.y)).a;
  float growth = (1.0-vLocal.y)*0.64 + n*0.28 - edge*0.04;
  float ice = smoothstep(growth-0.12,growth+0.12,uProgress*1.22);
  if(uProgress <= 0.001) ice=0.0;
  vec3 crystal = voronoi(p*(15.0+uCrystals*30.0));
  float fine = pow(max(0.0,1.0-crystal.y*15.0),5.0)*uCrystals;
  float roughness = noise(p*280.0)*0.5+noise(p*550.0)*0.25;
  vec3 bigCrystal = voronoi(p*11.0);
  float crack = (1.0-smoothstep(0.004,0.026,bigCrystal.y))*uCracks*(0.48+uFracture*0.52);
  float crackRim = (smoothstep(0.008,0.016,bigCrystal.y)-smoothstep(0.016,0.045,bigCrystal.y))*uCracks;
  float branch = (1.0-smoothstep(0.0,0.016,crystal.y))*(0.12+uFracture*0.5)*uCracks;
  float luminance = dot(original,vec3(0.2126,0.7152,0.0722));
  vec3 base = mix(original,vec3(luminance),0.74);
  base = mix(base,uIceColor*(0.18+luminance*0.92),0.40+uFrost*0.29);
  base += uIceColor*(roughness*0.12+fine*0.33)*uFrost;
  float facetedLight = (bigCrystal.z-0.5)*0.23+(crystal.z-0.5)*0.09;
  base += vec3(0.35,0.75,0.92)*facetedLight*uCrystals;
  base += (surface-vec3(0.36,0.43,0.48))*uFrost*0.32;
  base = mix(base,uIceColor*(0.7+luminance*0.5),smoothstep(0.48,0.82,surfaceFrost)*uFrost*0.32);
  float reflection = pow(max(0.0,sin(p.x*13.0+p.y*5.0-uTime*0.36)),26.0);
  float glint = pow(max(0.0,1.0-bigCrystal.x),10.0)*0.5;
  base += vec3(0.65,0.88,1.0)*(reflection*0.25+glint)*uReflections;
  base = mix(base,vec3(0.015,0.10,0.16),crack*0.78);
  base += (crackRim*0.24+branch*0.26+edge*0.14)*uIceColor*(0.65+uGlow);
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
