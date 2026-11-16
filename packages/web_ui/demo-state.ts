/** Demo state is ephemeral and cannot call a provider or write domain records. */
export type DemoStatus='ready'|'pending'|'success'|'failure';
export type DemoRecord={mode:'demo';kind:'checkout'|'payout';status:DemoStatus;attempt:number;reference:string;amountMinor:string;currency:'NGN'};
export function demoStart(kind:DemoRecord['kind']):DemoRecord{return {mode:'demo',kind,status:'ready',attempt:0,reference:'DEMO-NOT-A-TRANSACTION',amountMinor:'250000',currency:'NGN'};}
export function demoTransition(record:DemoRecord,event:'start'|'success'|'failure'|'reset'):DemoRecord{
 if(event==='reset')return demoStart(record.kind);
 if(event==='start'&&['ready','failure'].includes(record.status))return {...record,status:'pending',attempt:record.attempt+1,reference:`DEMO-${record.kind.toUpperCase()}-${record.attempt+1}`};
 if(record.status==='pending'&&(event==='success'||event==='failure'))return {...record,status:event};
 return record;
}
export function demoReceipt(record:DemoRecord){return `FAJIFY DEMO ${record.kind==='payout'?'PAYOUT CONFIRMATION':'RECEIPT'}\nNOT A REAL TRANSACTION\nReference: ${record.reference}\nStatus: ${record.status}\nIllustrative amount: NGN 2,500.00\nNo funds moved. No booking, ticket, balance or settlement was created.\n`;}
