import {createHash,createHmac,randomUUID} from 'node:crypto';
import {Injectable,ServiceUnavailableException,UnprocessableEntityException} from '@nestjs/common';

const hex=(value:string)=>createHash('sha256').update(value).digest('hex');
const sign=(key:Buffer|string,message:string)=>createHmac('sha256',key).update(message).digest();
const types=new Set(['application/pdf','image/jpeg','image/png']);
const MAX_DOCUMENT_BYTES=10*1024*1024;

/** Server-owned, SigV4 authenticated HEAD on the configured private object store.
 * No arbitrary URL or user-provided endpoint is ever fetched.
 */
@Injectable()
export class RideDocumentStorage {
 /** Presigned private PUT; the browser sends exactly the returned Content-Type.
  * All uploads are independently verified by signed HEAD before document submission.
  */
 presignUpload(driverId:string,kind:'licence'|'identification'|'insurance'|'vehicle_registration',
     contentType:string):{key:string;uploadUrl:string;method:'PUT';headers:Record<string,string>;expiresInSeconds:number}{
  const endpoint=process.env.S3_ENDPOINT,bucket=process.env.S3_BUCKET,
   access=process.env.FAJI_S3_ACCESS_KEY_ID,secret=process.env.FAJI_S3_SECRET_ACCESS_KEY,
   region=process.env.FAJI_S3_REGION??'us-east-1';
  if(!endpoint||!bucket||!access||!secret||!region||
     !/^[A-Za-z0-9-]{3,63}$/.test(bucket)||! /^[A-Za-z0-9_-]{2,64}$/.test(access)||
     !/^[a-z0-9-]{2,30}$/.test(region))
   throw new ServiceUnavailableException('Private document storage not configured');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(driverId)||
     !types.has(contentType))throw new UnprocessableEntityException('Invalid private upload metadata');
  const ext=contentType==='application/pdf'?'pdf':contentType==='image/png'?'png':'jpg';
  const key='private/ride-drivers/'+driverId+'/'+kind+'/'+randomUUID()+'.'+ext;
  let url:URL;try{url=new URL(endpoint);}catch{throw new ServiceUnavailableException('Invalid object storage endpoint');}
  const loopback=['127.0.0.1','::1','localhost'].includes(url.hostname);
  if((url.protocol!=='https:'&&!loopback)||!['https:','http:'].includes(url.protocol)||
     url.username||url.password||url.hash||url.search||url.pathname!=='/')
   throw new ServiceUnavailableException('Invalid private document storage endpoint');
  const uri='/'+[bucket,...key.split('/')].map(encodeURIComponent).join('/');
  url.pathname=uri;
  const date=new Date().toISOString().replace(/[:-]|\\.\\d{3}/g,''),day=date.slice(0,8),
   scope=day+'/'+region+'/s3/aws4_request';
  const params:Record<string,string>={
   'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
   'X-Amz-Credential':access+'/'+scope,
   'X-Amz-Date':date,
   'X-Amz-Expires':'300',
   'X-Amz-SignedHeaders':'content-type;host'
  };
  if(process.env.FAJI_S3_SESSION_TOKEN)params['X-Amz-Security-Token']=process.env.FAJI_S3_SESSION_TOKEN;
  const query=Object.entries(params).sort(([a],[b])=>a.localeCompare(b))
   .map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
  const canonicalHeaders='content-type:'+contentType+'\\nhost:'+url.host+'\\n';
  const request=['PUT',uri,query,canonicalHeaders,'content-type;host','UNSIGNED-PAYLOAD'].join('\\n');
  const stringToSign=['AWS4-HMAC-SHA256',date,scope,hex(request)].join('\\n');
  const kDate=sign('AWS4'+secret,day),kRegion=sign(kDate,region),
   kService=sign(kRegion,'s3'),kSigning=sign(kService,'aws4_request');
  const signature=createHmac('sha256',kSigning).update(stringToSign).digest('hex');
  url.search=query+'&X-Amz-Signature='+signature;
  return {key,uploadUrl:url.toString(),method:'PUT',
   headers:{'Content-Type':contentType},expiresInSeconds:300};
 }
 async verify(key:string,transport:typeof fetch=fetch):Promise<{etag:string;bytes:number;contentType:string;versionId:string|null}>{
  const endpoint=process.env.S3_ENDPOINT,bucket=process.env.S3_BUCKET;
  const access=process.env.FAJI_S3_ACCESS_KEY_ID,secret=process.env.FAJI_S3_SECRET_ACCESS_KEY;
  const region=process.env.FAJI_S3_REGION??'us-east-1';
  if(!endpoint||!bucket||!access||!secret||!region||
     !/^[A-Za-z0-9-]{3,63}$/.test(bucket)||! /^[A-Za-z0-9_-]{2,64}$/.test(access)||
     !/^[a-z0-9-]{2,30}$/.test(region))
   throw new ServiceUnavailableException('Private document storage not configured');
  if(!/^private\/ride-drivers\/[0-9a-f-]{36}\/(licence|identification|insurance|vehicle_registration)\/[A-Za-z0-9_.-]{8,140}$/.test(key))
   throw new UnprocessableEntityException('Document object key is invalid');
  let url:URL;
  try{url=new URL(endpoint);}catch{throw new ServiceUnavailableException('Invalid document storage endpoint');}
  const isLoopback=['127.0.0.1','::1','localhost'].includes(url.hostname);
  if((url.protocol!=='https:'&&!isLoopback)||!['https:','http:'].includes(url.protocol)||
      url.username||url.password||url.hash||url.search||url.pathname!=='/'||
      (url.protocol==='http:'&&!isLoopback))
   throw new ServiceUnavailableException('Invalid private document storage endpoint');
  const encoded=[bucket,...key.split('/')].map(encodeURIComponent).join('/');
  const canonicalUri='/'+encoded;
  url.pathname=canonicalUri;
  const time=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
  const day=time.slice(0,8),scope=day+'/'+region+'/s3/aws4_request';
  const token=process.env.FAJI_S3_SESSION_TOKEN;
  const headers:Record<string,string>={
   'x-amz-date':time,'x-amz-content-sha256':'UNSIGNED-PAYLOAD'
  };
  if(token)headers['x-amz-security-token']=token;
  const signedHeaders=['host',...Object.keys(headers)].sort();
  const canonicalHeaders=signedHeaders.map(name=>name+':'+(name==='host'?url.host:headers[name]).trim()+'\n').join('');
  const canonical=['HEAD',canonicalUri,'',canonicalHeaders,signedHeaders.join(';'),'UNSIGNED-PAYLOAD'].join('\n');
  const toSign=['AWS4-HMAC-SHA256',time,scope,hex(canonical)].join('\n');
  const kDate=sign('AWS4'+secret,day),kRegion=sign(kDate,region),
    kService=sign(kRegion,'s3'),kSigning=sign(kService,'aws4_request');
  headers.authorization='AWS4-HMAC-SHA256 Credential='+access+'/'+scope+
   ', SignedHeaders='+signedHeaders.join(';')+
   ', Signature='+createHmac('sha256',kSigning).update(toSign).digest('hex');
  let response:Response;
  try{response=await transport(url.toString(),{method:'HEAD',headers,signal:AbortSignal.timeout(4000),redirect:'error'});}
  catch{throw new ServiceUnavailableException('Private document metadata check unavailable');}
  if(!response.ok)throw new UnprocessableEntityException('Private document object not found or not accessible');
  const rawLength=response.headers.get('content-length');
  const length=rawLength===null?NaN:Number(rawLength);
  const contentType=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
  const etag=response.headers.get('etag')??'';
  if(!Number.isSafeInteger(length)||length<1||length>MAX_DOCUMENT_BYTES||!types.has(contentType)||
     !/^"[^"]{1,128}"$/.test(etag))
   throw new UnprocessableEntityException('Private document metadata violates size/type/integrity policy');
  const versionId=response.headers.get('x-amz-version-id');
  if(versionId!==null&&(versionId.length>200||!/^[A-Za-z0-9._+=/-]{1,200}$/.test(versionId)))
   throw new UnprocessableEntityException('Unsupported object version identifier');
  return {etag,bytes:length,contentType,versionId};
 }
}
