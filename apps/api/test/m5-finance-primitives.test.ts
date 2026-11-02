import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {minor,MAX_MONEY,splitCommission,refundCommission,splitFunding} from '../src/payments/finance-ledger.service';
import {parseProviderJson,providerId,checkoutUrl,providerRequest} from '../src/payments/finance-provider';
import {ticketToken,ticketNonce,parseTicketToken} from '../src/payments/ticket-token';
import {PaystackGateway} from '../src/payments/paystack.gateway';
import {FakePaystack} from './m5-fake-provider';
test('M5 integer accounting conserves every minor unit at bounded extremes and during partial refunds',()=>{
 for(const amount of [1n,3n,101n,99999999n,MAX_MONEY])for(const bps of [0,1,137,3333,9999,10000]){
  const s=splitCommission(amount,bps);assert.equal(s.commission+s.merchant,amount);
  const first=amount/3n,second=amount-first;
  assert.equal(refundCommission(s.commission,amount,0n,first)+refundCommission(s.commission,amount,first,second),s.commission);
  const parts=[{account:'merchant',amount:s.merchant.toString()},{account:'platform',amount:s.commission.toString()}];
  assert.equal(splitFunding(parts,first).reduce((sum,p)=>sum+BigInt(p.amount),0n),first);
 }
 for(const value of ['0','-1','1.1','1e3','01','9007199254740992'])assert.throws(()=>minor(value));
 assert.equal(refundCommission(2n,3n,1n,2n,1n),1n); // A prior failed refund changes the actual remaining commission.
 assert.equal(refundCommission(1n,3n,1n,1n,1n),0n);
 assert.equal(minor(MAX_MONEY.toString()),MAX_MONEY);assert.throws(()=>splitCommission(1n,0.5));
 assert.throws(()=>splitFunding([{account:'a',amount:'1'}],2n));
});
test('M5 provider uint64 identifiers survive raw JSON; unsafe numbers and overflow are rejected',()=>{
 const p=parseProviderJson('{"data":{"id":18446744073709551615,"transaction":9007199254740993,"amount":12500}}');
 assert.equal(providerId(p.data.id),'18446744073709551615');assert.equal(p.data.transaction,'9007199254740993');assert.equal(p.data.amount,12500);
 for(const id of [0,Number.MAX_SAFE_INTEGER+1,'18446744073709551616','001','-1'])assert.throws(()=>providerId(id));
 assert.throws(()=>parseProviderJson(' '.repeat(524289)));
});
test('M5 checkout URLs and fixed provider transport fail closed without disclosing credentials',async()=>{
 assert.equal(checkoutUrl('https://checkout.paystack.com/abc'),'https://checkout.paystack.com/abc');
 for(const url of ['http://checkout.paystack.com/x','https://checkout.paystack.com.evil/x','https://user@checkout.paystack.com/x','https://checkout.paystack.com:8443/x','https://checkout.paystack.com/x#unsafe'])assert.throws(()=>checkoutUrl(url));
 let called=false;
 await assert.rejects(()=>providerRequest('secret','//evil','GET',undefined,async()=>{called=true;throw Error();}),e=>{assert.ok(!String(e).includes('secret'));return true;});assert.equal(called,false);
});
test('M5 opaque tickets authenticate identity, nonce and signing-key version and tolerate key rotation',()=>{
 process.env.TICKET_SIGNING_KEYS=JSON.stringify({old:'1'.repeat(64),current:'2'.repeat(64)});process.env.TICKET_ACTIVE_KEY_ID='current';
 const id=randomUUID(),nonce=ticketNonce(),token=ticketToken(id,nonce,'old');assert.deepEqual(parseTicketToken(token),{id,nonce,keyId:'old'});
 for(const bad of [token.replace(id,randomUUID()),token.replace('.old.','.current.'),token+'x'])assert.throws(()=>parseTicketToken(bad));
 delete process.env.TICKET_SIGNING_KEYS;assert.throws(()=>parseTicketToken(token));
});
test('M5 adapter exercises initialization, ambiguous refund discovery, OTP, fees and reversal on isolated transport',async()=>{
 process.env.PAYSTACK_SECRET_KEY='sk_test_disposablefixture';const fake=new FakePaystack(),gateway=new PaystackGateway(),previous=globalThis.fetch;globalThis.fetch=fake.fetch;
 try{
  const reference='faji-'+randomUUID();const init=await gateway.initialize({reference,amount:'12500',email:'fixture@example.invalid',callbackUrl:'https://example.invalid/callback'});assert.equal(init.reference,reference);
  await assert.rejects(()=>gateway.initialize({reference,amount:'12500',email:'fixture@example.invalid',callbackUrl:'https://example.invalid/callback'}));
  fake.transactions.get(reference).status='success';assert.equal((await gateway.verify(reference)).amountMinor,12500);
  const local=randomUUID();fake.loseRefundResponse=true;await assert.rejects(()=>gateway.refund(reference,'100',local));
  const refund=await gateway.findRefund(fake.transactions.get(reference).id,local);assert.ok(refund);assert.equal((await gateway.refundStatus(refund)).status,'pending');assert.equal(fake.count('POST','/refund'),1);
  fake.transferState='otp';await gateway.recipient('RCP_fixture');const transfer=await gateway.transfer('payout-fixture','100','RCP_fixture');assert.equal(transfer.status,'otp');await gateway.finalizeTransfer(transfer.transfer_code,'123456');assert.equal((await gateway.transferStatus('payout-fixture')).status,'success');
  fake.transfers.get('payout-fixture').status='reversed';assert.equal((await gateway.transferStatus('payout-fixture')).fee_charged,10);
  assert.ok(fake.calls.every(c=>!c.path.includes('secret')));
 }finally{globalThis.fetch=previous;delete process.env.PAYSTACK_SECRET_KEY;}
});
