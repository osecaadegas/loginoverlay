/* Deterministic WebGL2 API smoke test. GPU calls are mocked; this is NOT
 * pixel validation, a visual quality test, or proof of native OBS performance. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
let nextId = 1,uniformQueries=0,drawCalls=0,textureUploads=0;
const gl = new Proxy({
  VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
  ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,TRIANGLES:4,
  TEXTURE_2D:3553,TEXTURE0:33984,RGBA:6408,UNSIGNED_BYTE:5121,
  TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,
  LINEAR:9729,CLAMP_TO_EDGE:33071,UNPACK_FLIP_Y_WEBGL:37440,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,BLEND:3042,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,ONE:1,
  DEPTH_TEST:2929,CULL_FACE:2884,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
  MAX_TEXTURE_SIZE:3379,RENDERER:7937,
  createShader:()=>({id:nextId++}),getShaderParameter:()=>true,getShaderInfoLog:()=>'',
  createProgram:()=>({id:nextId++}),getProgramParameter:()=>true,getProgramInfoLog:()=>'',
  getUniformLocation:(p,n)=>{uniformQueries++;return `${p.id}:${n}`},
  createTexture:()=>({id:nextId++}),createBuffer:()=>({id:nextId++}),
  getParameter:k=>k===3379?4096:k===7937?'Mock GPU':'',
  drawArraysInstanced:()=>{drawCalls++},drawArrays:()=>{drawCalls++},
  texImage2D:()=>{textureUploads++},readPixels:(_,__,w,h,___,____,pixels)=>pixels.fill(255),
}, {get(o,p){return p in o?o[p]:()=>undefined}});
const canvas={id:'',style:{},getContext:()=>gl,addEventListener:()=>{},remove:()=>{}};
const context={window:{},document:{body:{appendChild:()=>{}},createElement:()=>canvas},
  console,location:{reload:()=>{}},Math,atob:(s)=>Buffer.from(s,'base64').toString('binary'),Uint8Array,Float32Array};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/premium-vfx-meshes.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/premium-crystal-accents.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/crystal-hero3d.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/gpu-vfx3d.js','utf8'),context);
const renderer=new context.window.SCGPU3D.Renderer();
const kinds=['glitch','lightning','shadow','holy','sand','crystal','petal','plasma'];
for(const type of kinds){
  const particles=Array.from({length:13},(_,i)=>({x:100+i*8,y:120+i*5,depth:1.2,size:1,tx:i*3,ty:i*6,spin:.3,phase:i*.3,delay:.1}));
  const fx={type,W:640,H:360,tuning:{accent:'#5577ff'},config:{color:'#5577ff',inBuild:.58},motion:1,
    seal:canvas,particles,b:{x:140,y:30,w:310,h:320},field:{contains:(x,y)=>((x-300)/100)**2+((y-180)/145)**2<1,points:Array.from({length:90},(_,i)=>[235+(i%9)*17,65+Math.floor(i/9)*23])},o:{seed:13579},arcs:[{pts:[[100,100],[150,170],[190,200]]}]};
  renderer.prepare(fx);
  for(const stage of ['cover','out','in'])for(const p of [0,.23,.56,1])assert(renderer.render(stage,p,p*3));
  const queryAfterFirst=uniformQueries;
  for(let i=0;i<30;i++)renderer.render('out',.4,i/30);
  assert.strictEqual(uniformQueries,queryAfterFirst,'GPU uniforms were looked up repeatedly');
  const diag=renderer.diagnostics();assert.equal(diag.mode,'WebGL2 instanced 3D');
  if(type==='crystal')assert(renderer.geo.crystal.length/8>=72,'Crystal must have closed hexagonal sides and termination facets');
  assert(diag.instances===particles.length);
  renderer.dispose();
  console.log('PASS',type,'render API / uniform cache');
}
const field={map:new Uint8ClampedArray(256*144*4).fill(255),mw:256,mh:144};
// This test exercises readback routing only: the mocked GPU returns opaque pixels.
const fx={type:'crystal',W:640,H:360,tuning:{},config:{color:'#77ffff',inBuild:.60},motion:1,
  seal:canvas,particles:[],b:{x:100,y:80,w:300,h:270},field:{contains:(x,y)=>((x-255)/105)**2+((y-206)/112)**2<1,points:Array.from({length:90},(_,i)=>[205+(i%9)*14,125+Math.floor(i/9)*17])},o:{seed:4221},arcs:[]};
renderer.prepare(fx);renderer.render('cover',1,2);
assert.strictEqual(renderer.measureCoverage(field),1);
assert(drawCalls>200&&textureUploads>=9);
console.log('PASS all eight families: WebGL2 API mocked, calls:',drawCalls, 'uniform lookups:',uniformQueries);
