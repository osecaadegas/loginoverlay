import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
const source=await readFile(new URL('./gas-vfx3d.js',import.meta.url),'utf8');
const browser=await puppeteer.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage();
 await page.setContent('<canvas id="c"></canvas>');
 const result=await page.evaluate(source=>{
  const c=document.querySelector('#c'),gl=c.getContext('webgl2',{alpha:true});
  if(!gl)return {available:false};
  new Function(source)();
  const {vert,frag}=window.SCGasVolume.shaders;
  const compile=(type,text)=>{const sh=gl.createShader(type);gl.shaderSource(sh,text);gl.compileShader(sh);return {ok:gl.getShaderParameter(sh,gl.COMPILE_STATUS),log:gl.getShaderInfoLog(sh)}};
  const vs=compile(gl.VERTEX_SHADER,vert),fs=compile(gl.FRAGMENT_SHADER,frag);
  if(!vs.ok||!fs.ok)return {available:true,vs,fs};
  const v=gl.createShader(gl.VERTEX_SHADER),f=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(v,vert);gl.compileShader(v);gl.shaderSource(f,frag);gl.compileShader(f);
  const pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
  return {available:true,linked:gl.getProgramParameter(pr,gl.LINK_STATUS),log:gl.getProgramInfoLog(pr)};
 },source);
 assert.equal(result.available,true,'WebGL2 required for shader validation');assert.equal(result.linked,true,result.log);console.log('Smoke/Toxic WebGL2 shader compile and link PASS');
} finally {await browser.close()}
