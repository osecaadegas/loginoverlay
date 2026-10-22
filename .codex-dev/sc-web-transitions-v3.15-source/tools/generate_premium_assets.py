#!/usr/bin/env python3
"""Deterministic authored-look game-ready mesh & PBR asset generator.
The same meshes feed both the WebGL application and editable GLB source art.
Does NOT require Blender; Blender is recommended for later manual art direction.
"""
import base64, io, json, math, os, struct
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'vfx_assets'
OUT.mkdir(exist_ok=True)
rng=np.random.default_rng(20261019)

def face_normal(a,b,c):
    n=np.cross(np.array(b)-a,np.array(c)-a)
    return (n/(np.linalg.norm(n)+1e-9)).astype(float)

def add_tri(raw, a,b,c, uva,uvb,uvc):
    n=face_normal(a,b,c)
    for p,uv in ((a,uva),(b,uvb),(c,uvc)):
        raw.extend([*map(float,p), *map(float,n), *map(float,uv)])

def make_crystal(variant):
    seed=np.random.default_rng(9101+variant)
    n=6+(variant%3)
    tall=1.04+seed.uniform(-.10,.28)
    rings=[(-.52,.13),(-.38,.24),(-.09,.26),(.29,.21),(.61,.12)]
    phase=seed.uniform(-.15,.15)
    offsets=seed.uniform(-.06,.06,(len(rings),2))
    radii=np.clip(seed.normal(1,.11,n),.70,1.23)
    ringspts=[]
    for j,(y,r) in enumerate(rings):
        pts=[]
        for i in range(n):
            a=i*math.tau/n+phase
            angle_shift=seed.uniform(-.055,.055) if j==0 else 0
            pts.append([math.cos(a+angle_shift)*r*radii[i]+offsets[j,0],y,math.sin(a+angle_shift)*r*radii[i]+offsets[j,1]])
        ringspts.append(pts)
    peak=[float(seed.uniform(-.07,.07)),tall,float(seed.uniform(-.07,.07))]
    raw=[]
    for j in range(len(ringspts)-1):
        for i in range(n):
            k=(i+1)%n
            a,b=ringspts[j][i],ringspts[j][k]
            c,d=ringspts[j+1][k],ringspts[j+1][i]
            u0=i/n;u1=(i+1)/n;v0=j/(len(ringspts));v1=(j+1)/len(ringspts)
            # Facet split is intentional, gives mineral surfaces angular normals.
            add_tri(raw,a,b,d,[u0,v0],[u1,v0],[u0,v1]);add_tri(raw,b,c,d,[u1,v0],[u1,v1],[u0,v1])
    for i in range(n):
        k=(i+1)%n
        add_tri(raw,ringspts[-1][i],ringspts[-1][k],peak,[i/n,.8],[(i+1)/n,.8],[(i+.5)/n,1])
        add_tri(raw,[0,-.52,0],ringspts[0][k],ringspts[0][i],[.5,0],[(i+1)/n,.05],[i/n,.05])
    return np.array(raw,dtype=np.float32).reshape(-1,8)

def make_petal(variant, feather=False):
    # Genuine mesh curvature and finite thickness, with multiple tessellated spans.
    r=np.random.default_rng(4400+variant+(100 if feather else 0))
    rows=11;columns=7
    points=[]
    twist=.17*(variant-2)+r.uniform(-.12,.12)
    for iy in range(rows):
        t=iy/(rows-1)
        w=(math.sin(math.pi*(.06+.89*t))**(.8 if feather else .66))*(.46 if feather else .52)
        if feather:w*=1-.60*t
        pts=[]
        for ix in range(columns):
            s=ix/(columns-1)*2-1
            x=s*w + .06*math.sin(math.pi*t*1.7+variant)
            y=(t-.5)*1.12
            z=.16*(1-s*s)*math.sin(math.pi*t)+.11*s*s+.19*t*t+.055*s*math.sin(twist*3+t*2)
            pts.append([x,y,z])
        points.append(pts)
    raw=[]
    for j in range(rows-1):
        for i in range(columns-1):
            A=points[j][i];B=points[j][i+1];C=points[j+1][i+1];D=points[j+1][i]
            a=[i/(columns-1),j/(rows-1)];b=[(i+1)/(columns-1),j/(rows-1)]
            c=[(i+1)/(columns-1),(j+1)/(rows-1)];d=[i/(columns-1),(j+1)/(rows-1)]
            add_tri(raw,A,B,D,a,b,d);add_tri(raw,B,C,D,b,c,d)
            # Double-sided for swirling in 3D. Very slight separation avoids z fighting.
            A2=[A[0],A[1],A[2]-.012];B2=[B[0],B[1],B[2]-.012];C2=[C[0],C[1],C[2]-.012];D2=[D[0],D[1],D[2]-.012]
            add_tri(raw,D2,B2,A2,d,b,a);add_tri(raw,D2,C2,B2,d,c,b)
    return np.array(raw,dtype=np.float32).reshape(-1,8)

def material(kind, variant):
    sz=256
    y,x=np.mgrid[0:sz,0:sz].astype(np.float32);x/=sz;y/=sz
    noise=rng.normal(0,.03,(sz,sz))
    if kind=='crystal':
        bands=np.power(np.clip(.5+.5*np.sin((x*7+y*15)*math.tau+.65*np.cos(y*math.tau*5)),0,1),12)
        grit=np.clip(.5+.5*np.sin((x*44-y*53)*math.tau),0,1)
        base=np.array([48,32,103.],np.float32)+np.array([86,86,146.])*bands[:,:,None]+np.array([15,23,32.])*grit[:,:,None]+noise[:,:,None]*45
        metal=.09;rough=.26
    elif kind=='petal':
        vein=np.exp(-((x-.5)/.024)**2)
        grad=(.35+.65*(1-y))[:,:,None]
        base=np.array([161.,42.,96.])*grad+np.array([77,60,37.])*vein[:,:,None]+noise[:,:,None]*17
        metal=0.;rough=.72
    else:
        v=np.clip(.5+.5*np.sin((x-.5)*32*math.pi),0,1)
        base=np.array([12.,9.,22.])+v[:,:,None]*np.array([30.,23.,44.])+noise[:,:,None]*9
        metal=0.;rough=.9
    base=np.uint8(np.clip(base,0,255));rgb=Image.fromarray(base,'RGB')
    path=OUT/f'{kind}_albedo.png';rgb.save(path,optimize=True)
    # Procedural height-like normal texture, tangent-space baseline.
    height=np.mean(base.astype(float),axis=2)/255
    dy,dx=np.gradient(height)
    bump=np.stack([-dx*3,-dy*3,np.ones_like(dx)],axis=-1);bump/=np.linalg.norm(bump,axis=-1,keepdims=True)
    normals=Image.fromarray(np.uint8(np.clip((bump*.5+.5)*255,0,255)),'RGB')
    normals.save(OUT/f'{kind}_normal.png',optimize=True)
    return rgb,metal,rough

all_js={};scene=trimesh.Scene();report={}
for kind,count in [('crystal',8),('petal',4),('feather',3)]:
    tex,metal,rough=material(kind,0)
    for i in range(count):
        verts=make_crystal(i) if kind=='crystal' else make_petal(i,kind=='feather')
        name=f'{kind}_{i:02d}'
        # unindexed triangles deliberately preserve hard normals per facet.
        geom=trimesh.Trimesh(vertices=verts[:,:3].astype(float), faces=np.arange(len(verts)).reshape(-1,3),process=False,validate=False)
        geom.vertex_normals=verts[:,3:6].astype(float)
        from trimesh.visual.material import PBRMaterial
        geom.visual=trimesh.visual.TextureVisuals(uv=verts[:,6:8],material=PBRMaterial(name=kind,baseColorTexture=tex,metallicFactor=metal,roughnessFactor=rough,doubleSided=True))
        scene.add_geometry(geom, node_name=name)
        if i==0: geom.export(OUT/f'{kind}_hero.glb')
        all_js[name]=base64.b64encode(verts.tobytes()).decode('ascii')
        report[name]={'vertices':len(verts),'triangles':len(verts)//3,'bounds':np.round(geom.bounds,3).tolist()}
scene.export(OUT/'SC_Premium_VFX_Asset_Collection.glb')
# Embed playable geometry without runtime GLB parser. Same Float32 triangles as GLB exports.
js='''/* SC Premium VFX Asset Library v3.8. Geometry and GLB share the same offline source. */\n(function(root){"use strict";\nconst PACK=__PACK__;\nconst cache=new Map();\nroot.SCPremiumMeshes={ names:Object.freeze(Object.keys(PACK)),get(name){if(!Object.prototype.hasOwnProperty.call(PACK,name))return null;if(cache.has(name))return cache.get(name);const text=atob(PACK[name]);const bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);const mesh=new Float32Array(bytes.buffer);if(mesh.length%8!==0||mesh.length<24)throw Error("Invalid premium VFX mesh "+name);cache.set(name,mesh);return mesh},clear(){cache.clear()}};\n})(window);\n'''.replace('__PACK__',json.dumps(all_js,separators=(',',':')))
(ROOT/'premium-vfx-meshes.js').write_text(js)
(OUT/'ASSET_MANIFEST.json').write_text(json.dumps({'generator':'tools/generate_premium_assets.py','mesh_count':len(report),'meshes':report,'license':'Original procedural assets generated for SC Web Transitions'},indent=2))
print('exported',len(report),'meshes; JS bytes',len(js),'GLB bytes',(OUT/'SC_Premium_VFX_Asset_Collection.glb').stat().st_size)
