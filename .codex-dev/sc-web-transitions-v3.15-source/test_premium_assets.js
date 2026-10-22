'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(__dirname+'/premium-vfx-meshes.js','utf8');
const context={window:{},atob:(str)=>Buffer.from(str,'base64').toString('binary'),Float32Array,Uint8Array,Map,Object};
vm.createContext(context);vm.runInContext(code,context);
const assets=context.window.SCPremiumMeshes;
assert.equal(assets.names.length,15,'incorrect authored asset count');
for(const name of assets.names){
 const data=assets.get(name);
 assert.equal(data.length%8,0,'wrong interleaved mesh format '+name);
 assert(data.length>=24,'empty geometry '+name);
 for(const value of data)assert(Number.isFinite(value),'NaN or Infinity in '+name);
 assert.equal(data,assets.get(name),'assets must be cached');
}
for(const n of ['crystal_00','petal_00','feather_00'])assert(assets.get(n).length>100);
assert.equal(assets.get('../../../../../secret'),null);
console.log('PASS 15 original GPU meshes decoded and validated, reusable geometry cache');
