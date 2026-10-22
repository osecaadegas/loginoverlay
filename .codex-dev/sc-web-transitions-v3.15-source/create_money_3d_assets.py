"""Create genuine Blender-editable 3D sheets with original golden-sheep image.
Offline authoring files; the shipping app deforms equivalent WebGL2 paper meshes
in real time to preserve camera-triggered interactions.
"""
from pathlib import Path
import numpy as np,trimesh,json
from PIL import Image
ROOT=Path(__file__).parent; OUT=ROOT/'vfx_assets'
W=.156;H=W*546/1200;NX=32;NY=14
image=Image.open(ROOT/'bill.png').convert('RGBA')
mat=trimesh.visual.material.PBRMaterial(name='SC Golden Sheep Satin Paper',baseColorTexture=image,metallicFactor=0.02,roughnessFactor=.73,alphaMode='BLEND',doubleSided=True)
def make(variant,mode):
 coords=[];uv=[]
 for y in range(NY+1):
  for x in range(NX+1):
   a=x/NX;b=y/NY;u=a-.5;v=b-.5
   z=(.008*(u*u)*4+(.005 if mode>0 else .002)*np.sin(u*6.28+variant*.9)*np.sin(v*3.1+variant*.41))
   if mode==1:z+=.012*np.sin(u*3.2+variant*.71)
   if mode==2:z+=.011*np.sin(u*6.3+v*2.1+variant*.41)
   if mode==3:z+=.016*(u*u)+.003*np.cos(v*5.1+variant)
   coords.append([u*W,v*H,z]);uv.append([a,1-b]);
 vertices=np.array(coords,dtype=np.float64);uv=np.array(uv,dtype=np.float64)
 faces=[]
 for y in range(NY):
  for x in range(NX):
   a=y*(NX+1)+x;b=a+1;c=a+NX+1;d=c+1
   faces.extend([[a,c,b],[b,c,d]])
 mesh=trimesh.Trimesh(vertices=vertices,faces=np.array(faces),process=False)
 mesh.visual=trimesh.visual.texture.TextureVisuals(uv=uv,material=mat)
 return mesh
names=['hero_bill_softcurl','bill_falling_wave','bill_wind_twist','bill_camera_flyby']
scene=trimesh.Scene()
for i,name in enumerate(names):
 mesh=make(i,i)
 scene.add_geometry(mesh,node_name=name,geom_name=name,transform=trimesh.transformations.translation_matrix([i*.23,0,0]))
 asset=OUT/(name+'.glb');mesh.export(asset)
 assert trimesh.load(asset,force='mesh').vertices.shape[0]>400
scene.export(OUT/'SC_Golden_Sheep_Money_CGI_Collection.glb')
assert trimesh.load(OUT/'SC_Golden_Sheep_Money_CGI_Collection.glb').geometry
manifest={'version':'3.9.0','design':'Original SC Golden Sheep 100 banknote artwork','source_texture':'../bill.png','material':'Golden Sheep satin currency paper','normal_map':'golden_sheep_paper_normal.png','roughness_map':'golden_sheep_paper_roughness.png','asset_names':names,'3d_meshes':len(names),'pipeline':'Blender-editable GLB models, and separate real-time WebGL2 deformable paper renderer in money-vfx3d.js','notes':'No Blender installation required to use the Windows app; Blender can import the source GLBs.'}
(OUT/'SC_Money_CGI_ASSET_MANIFEST.json').write_text(json.dumps(manifest,indent=2))
print('Created GLB assets',[(x.name,x.stat().st_size) for x in OUT.glob('*bill*.glb')])
