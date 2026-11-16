"""Loopback TLS acceptance proxy; no public listener or production credentials."""
import http.client,ssl,threading,argparse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
parser=argparse.ArgumentParser();parser.add_argument('--cert',required=True);parser.add_argument('--key',required=True);args=parser.parse_args()
class Proxy(BaseHTTPRequestHandler):
 def do_GET(self):self.proxy()
 def do_POST(self):self.proxy()
 def proxy(self):
  target={3443:3101,4440:3000,4441:3002,4442:3003,4443:3004}[self.server.server_port]
  headers={k:v for k,v in self.headers.items() if k.lower() not in ['connection','x-forwarded-for','x-forwarded-proto','x-faji-client-ip']};headers['X-Forwarded-Proto']='https';headers['X-Faji-Client-Ip']='127.0.0.1'
  body=self.rfile.read(int(self.headers.get('Content-Length',0)))
  try:
   conn=http.client.HTTPConnection('127.0.0.1',target,timeout=45);conn.request(self.command,self.path,body,headers);response=conn.getresponse();data=response.read();self.send_response(response.status)
   for k,v in response.getheaders():
    if k.lower() not in ['transfer-encoding','connection','content-length']:self.send_header(k,v)
   self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);conn.close()
  except (ConnectionError,TimeoutError):self.send_error(502)
 def log_message(self,*args):pass
context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);context.load_cert_chain(args.cert,args.key)
for port in [3443,4440,4441,4442,4443]:
 server=ThreadingHTTPServer(('127.0.0.1',port),Proxy);server.socket=context.wrap_socket(server.socket,server_side=True);threading.Thread(target=server.serve_forever,daemon=True).start()
print('Loopback TLS proxy ready',flush=True);threading.Event().wait()
