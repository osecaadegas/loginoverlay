"""Create a COFF .syso containing the application icon for Go's Windows linker.

No external dependencies. Resource types RT_ICON (3) and RT_GROUP_ICON (14).
"""
from pathlib import Path
from struct import pack, unpack_from

root=Path(__file__).resolve().parent
src=(root/'sc.ico').read_bytes()
reserved,icon_type,count=unpack_from('<HHH',src,0)
assert (reserved,icon_type)==(0,1)
icons=[]
for i in range(count):
    width,height,colors,_,planes,bits,size,start=unpack_from('<BBBBHHII',src,6+i*16)
    icons.append((width,height,colors,planes,bits,src[start:start+size]))
assert len(icons)==count

group=bytearray(pack('<HHH',0,1,count))
for i,(w,h,col,planes,bits,data) in enumerate(icons,1):
    group += pack('<BBBBHHIH',w,h,col,0,planes,bits,len(data),i)

blob=bytearray()
def alloc(size,align=4):
    while len(blob)%align: blob.append(0)
    offset=len(blob);blob.extend(b'\0'*size)
    return offset

def setbytes(at,data):blob[at:at+len(data)]=data

resources={3:{i:data for i,(*_,data) in enumerate(icons,1)},14:{1:bytes(group)}}
relocations=[]

def make_dir(items):
    # item tuple is (resource numeric ID, target directory offset / payload offset, is_dir)
    offset=alloc(16+8*len(items))
    setbytes(offset,pack('<IIHHHH',0,0,0,0,0,len(items)))
    for ix,(rid,target,isdir) in enumerate(items):
        setbytes(offset+16+8*ix,pack('<II',rid,target|(0x80000000 if isdir else 0)))
    return offset

# Keep directory data at the beginning, then resource data entries and raw bytes.
# Layout: root -> type -> name -> language -> data entry -> bytes.
# Precalculate sizes for all entries by allocating directories recursively.
rootdir=alloc(16+8*len(resources))
setbytes(rootdir,pack('<IIHHHH',0,0,0,0,0,len(resources)))
for type_index,(rtype,instances) in enumerate(sorted(resources.items())):
    typed=alloc(16+8*len(instances))
    setbytes(rootdir+16+type_index*8,pack('<II',rtype,0x80000000|typed))
    setbytes(typed,pack('<IIHHHH',0,0,0,0,0,len(instances)))
    for idx,(rid,data) in enumerate(sorted(instances.items())):
        langdir=alloc(16+8)
        setbytes(typed+16+8*idx,pack('<II',rid,0x80000000|langdir))
        setbytes(langdir,pack('<IIHHHH',0,0,0,0,0,1))
        entry=alloc(16)
        setbytes(langdir+16,pack('<II',1033,entry))
        raw=alloc(len(data))
        setbytes(raw,data)
        setbytes(entry,pack('<IIII',raw,len(data),0,0))
        relocations.append(entry)

# Every IMAGE_RESOURCE_DATA_ENTRY.OffsetToData references an RVA in the .rsrc
# section, so the linker adds the .rsrc section base using ADDR32NB relocation.
raw=bytes(blob)
section_start=60
reloc_at=section_start+len(raw)
symbol_at=reloc_at+10*len(relocations)
header=pack('<HHIIIHH',0x8664,1,0,symbol_at,1,0,0)
sec=pack('<8sIIIIIIHHI',b'.rsrc\0\0\0',0,0,len(raw),section_start,reloc_at,0,len(relocations),0,0x40000040)
relocs=b''.join(pack('<IIH',pos,0,0x0003) for pos in relocations)
symbol=pack('<8sIhHBB',b'.rsrc\0\0\0',0,1,0,3,0)
string_table=pack('<I',4)
obj=header+sec+raw+relocs+symbol+string_table
(root/'rsrc_windows_amd64.syso').write_bytes(obj)
print('created COFF Windows icon:',len(obj),'bytes and',len(relocations),'relocations')
