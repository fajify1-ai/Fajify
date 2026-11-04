import subprocess,json,os
from pathlib import Path
import argparse,re
parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--state',required=True);parser.add_argument('--initramfs',required=True);args=parser.parse_args()
s=Path(args.state).resolve();c=json.loads((s/'state.json').read_text());r=str(Path(args.root).resolve())
assert c['marker']=='fajify-device-acceptance-v1' and c['transport']=='loopback-vm'
assert re.fullmatch('fajify_m2_test_device_[a-f0-9]{12}',c['database'])
assert s.stat().st_mode&0o077==0
assert all(isinstance(p,int) and 0<p<65536 for p in c['ports'].values())
args=[r+'/usr/bin/qemu-system-x86_64','-L',r+'/usr/share/qemu','-accel','tcg,thread=multi','-cpu','max','-smp','2','-m','4096','-nodefaults','-nographic','-no-reboot','-monitor','none','-serial','file:'+str(s/'console.log'),'-bios',r+'/usr/share/seabios/bios-256k.bin','-kernel',r+'/boot/vmlinuz-6.8.0-138-generic','-initrd',args.initramfs,'-append','console=ttyS0 rdinit=/init panic=1','-device','e1000,netdev=net0,romfile=','-netdev',f"user,id=net0,restrict=on,hostfwd=tcp:127.0.0.1:{c['ports']['appdb']}-:5432,hostfwd=tcp:127.0.0.1:{c['ports']['identitydb']}-:5433"]
env={**os.environ,'QEMU_MODULE_DIR':r+'/usr/lib/x86_64-linux-gnu/qemu','LD_LIBRARY_PATH':r+'/usr/lib/x86_64-linux-gnu'}
with (s/'qemu.log').open('w') as log:
 result=subprocess.run(args,env=env,stdout=log,stderr=log)
print('VM stopped with status',result.returncode)
