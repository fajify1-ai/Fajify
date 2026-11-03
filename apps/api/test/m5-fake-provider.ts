/** Deterministic provider boundary. No request can escape to the network. */
export class FakePaystack {
 transactions=new Map<string,any>();refunds=new Map<string,any>();transfers=new Map<string,any>();disputes=new Map<string,any>();
 calls:Array<{method:string;path:string;body:any}>=[];serial=1000n;loseRefundResponse=false;loseInitializationResponse=false;transferState='success';loseTransferResponse=false;
 charge(reference:string,amount:number,status='success',fees=15){const d={id:String(++this.serial),reference,amount,currency:'NGN',domain:'test',status,fees};this.transactions.set(reference,d);return d;}
 fetch:typeof fetch=async(input,init)=>{
  const u=new URL(String(input));if(u.origin!=='https://api.paystack.co')throw Error('Unexpected provider origin');
  if(new Headers(init?.headers).get('Authorization')!=='Bearer sk_test_disposablefixture')throw Error('Only synthetic test credentials permitted');
  const method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):undefined,path=u.pathname;this.calls.push({method,path,body});
  let d:any;
  if(path==='/transaction/initialize'&&method==='POST'){
   if(this.transactions.has(body.reference))return this.response(null,400);
   this.charge(body.reference,Number(body.amount),'pending');d={reference:body.reference,access_code:'fixture-code',authorization_url:'https://checkout.paystack.com/fixture-code'};
   if(this.loseInitializationResponse){this.loseInitializationResponse=false;throw Error('Simulated lost initialization response');}
  }else if(path.startsWith('/transaction/verify/'))d=this.transactions.get(decodeURIComponent(path.split('/').at(-1)!));
  else if(path==='/refund'&&method==='POST'){
   const t=this.transactions.get(body.transaction);if(!t)return this.response(null,404);
   d={id:String(++this.serial),transaction:t.id,amount:body.amount,currency:'NGN',domain:'test',status:'pending',merchant_note:body.merchant_note};this.refunds.set(d.id,d);
   if(this.loseRefundResponse){this.loseRefundResponse=false;throw Error('Simulated lost refund response');}
  }else if(path==='/refund')d=[...this.refunds.values()].filter(r=>r.transaction===u.searchParams.get('transaction')).slice((Number(u.searchParams.get('page')??1)-1)*100,Number(u.searchParams.get('page')??1)*100);
  else if(path.startsWith('/refund/'))d=this.refunds.get(path.split('/').at(-1)!);
  else if(path.startsWith('/transferrecipient/'))d={recipient_code:path.split('/').at(-1),active:true,currency:'NGN',domain:'test'};
  else if(path==='/transfer'&&method==='POST'){
   d=this.transfers.get(body.reference);if(!d){d={reference:body.reference,transfer_code:'TRF_'+(++this.serial),amount:body.amount,currency:'NGN',domain:'test',recipient:{recipient_code:body.recipient},status:this.transferState,fee_charged:10};this.transfers.set(body.reference,d);}
   if(this.loseTransferResponse){this.loseTransferResponse=false;throw Error('Simulated lost transfer response');}
  }else if(path==='/transfer/finalize_transfer'){d=[...this.transfers.values()].find(t=>t.transfer_code===body.transfer_code);if(d)d.status='success';}
  else if(path.startsWith('/transfer/verify/'))d=this.transfers.get(path.split('/').at(-1)!);
  else if(path.startsWith('/transfer/'))d=[...this.transfers.values()].find(t=>t.transfer_code===path.split('/').at(-1));
  else if(path.startsWith('/dispute/transaction/'))d=[...this.disputes.values()].filter(v=>v.transaction.id===path.split('/').at(-1));
  else if(path.endsWith('/resolve')&&method==='PUT'){d=this.disputes.get(path.split('/')[2]);if(d){d.status='resolved';d.resolution=body.resolution;d.refund_amount=body.refund_amount;}}
  else if(path.startsWith('/dispute/'))d=this.disputes.get(path.split('/').at(-1)!);
  else throw Error('Unhandled fake provider operation: '+method+' '+path);
  return this.response(d,d===undefined?404:200);
 };
 response(data:any,status=200){return new Response(JSON.stringify({status:status===200,data}),{status});}
 count(method:string,path:string){return this.calls.filter(c=>c.method===method&&c.path===path).length;}
}
