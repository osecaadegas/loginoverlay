/* No GPU pixels here. Validates real mesh layout, keyed UVs and shader API. */
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const document={body:{appendChild(){}},createElement(){return {style:{},getContext(){return gl},addEventListener(){},removeEventListener(){},remove(){}}}};
let drawCount=0,deleteCount=0;
const gl=new Proxy({
 VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
 MAX_TEXTURE_SIZE:3379,DEPTH_TEST:2929,LEQUAL:515,BLEND:3042,CULL_FACE:2884,
 ARRAY_BUFFER:34962,FLOAT:5126,STATIC_DRAW:35044,TEXTURE_2D:3553,
 TEXTURE_MIN_FILTER:10241,TEXTURE_MAG_FILTER:10240,TEXTURE_WRAP_S:10242,TEXTURE_WRAP_T:10243,
 UNPACK_FLIP_Y_WEBGL:37440,UNPACK_PREMULTIPLY_ALPHA_WEBGL:37441,
 RGBA:6408,UNSIGNED_BYTE:5121,LINEAR:9729,LINEAR_MIPMAP_LINEAR:9987,CLAMP_TO_EDGE:33071,
 TEXTURE0:33984,TRIANGLES:4,ONE:1,SRC_ALPHA:770,ONE_MINUS_SRC_ALPHA:771,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,
 createShader:()=>({}),getShaderParameter:()=>true,getShaderInfoLog:()=>'',createProgram:()=>({}),getProgramParameter:()=>true,
 getUniformLocation:(_,n)=>n,createVertexArray:()=>({}),createBuffer:()=>({}),createTexture:()=>({}),
 getParameter:k=>k===3379?8192:4,drawArrays:(_,__,n)=>{assert(n>100);drawCount++},
 deleteBuffer:()=>deleteCount++,deleteTexture:()=>deleteCount++,deleteProgram:()=>deleteCount++,
 getExtension:()=>null
},{get(t,p){return p in t?t[p]:()=>undefined}});
const context={window:{},document,Math,Float32Array,console};vm.createContext(context);
vm.runInContext(fs.readFileSync('ice-vfx3d.js','utf8'),context);
const shards=Array.from({length:65},(_,i)=>{const cx=80+(i%9)*58,cy=35+Math.floor(i/9)*41;return {cx,cy,vx:280*Math.sin(i*2.2),vy:170*Math.cos(i*1.3),rot:i*.04,delay:i%7*.018,depth:1.05,spark:i*2.27,poly:[[-22,-13],[9,-20],[25,4],[11,17],[-17,14]]}});
const {buildMesh,Renderer,shaders}=context.window.SCIceUltra;
for(const quality of ['Performance','Balanced','Cinematic','Ultra']){
 const m=buildMesh(shards,640,360,quality);
 assert.strictEqual(m.stats.shards,65);assert(m.stats.triangles>=65*20);
 assert.strictEqual(m.data.length%17,0);assert(m.data.every(Number.isFinite));
 assert(m.data[3]>=0&&m.data[3]<=1&&m.data[4]>=0&&m.data[4]<=1);
 console.log(quality,'triangles',m.stats.triangles,'vertices',m.stats.vertices);
}
assert(shaders.VERT.includes('uInbound')&&shaders.FRAG.includes('uFrozen'));
const r=new Renderer();r.prepare(shards,{width:640,height:360},640,360,'Ultra');
for(const inbound of [false,true])for(const p of [0,.1,.4,.68,.92,1])r.draw(p,inbound,p*3);
assert(drawCount>=10);r.hide();r.dispose();assert(deleteCount>=3);
console.log('PASS ice real mesh + mocked WebGL2 resources and IN/OUT draw timeline');
