from pathlib import Path
import gzip,os,stat
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--root',required=True,type=Path);parser.add_argument('--output',required=True);args=parser.parse_args()
root=args.root.resolve()
excluded=('opt/','usr/lib/jvm/','boot/','lib/modules/','usr/share/doc/','usr/share/man/','usr/share/locale/','usr/share/qemu/','usr/share/seabios/','usr/include/')
os.umask(0o077)
count=0;total=0
with gzip.open(args.output,'wb',compresslevel=1) as out:
 def entry(name,mode,data=b'',major=0,minor=0):
  global count,total
  count+=1;n=(name+'\0').encode();size=len(data)
  fields=[count,mode,0,0,1,0,size,0,0,major,minor,len(n),0]
  h=b'070701'+b''.join(('%08x'%v).encode() for v in fields)
  out.write(h+n);out.write(b'\0'*((-len(h+n))%4));out.write(data);out.write(b'\0'*((-size)%4));total+=size
 for path in sorted(root.rglob('*')):
  rel=str(path.relative_to(root))
  if rel.startswith(excluded):continue
  info=path.lstat()
  if stat.S_ISDIR(info.st_mode):entry(rel,info.st_mode)
  elif stat.S_ISLNK(info.st_mode):entry(rel,info.st_mode,os.readlink(path).encode())
  elif stat.S_ISREG(info.st_mode):entry(rel,info.st_mode,path.read_bytes())
 entry('dev/console',stat.S_IFCHR|0o600,major=5,minor=1)
 entry('dev/null',stat.S_IFCHR|0o666,major=1,minor=3)
 entry('TRAILER!!!',0)
print('Built initramfs:',count,'entries,',total,'uncompressed bytes')
