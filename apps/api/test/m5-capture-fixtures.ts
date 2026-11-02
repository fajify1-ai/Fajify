import type {CommerceLifecycle} from '../src/payments/commerce-lifecycle.service';
import type {FinancialOperations} from '../src/payments/financial-operations.service';
/** Old capture unit tests isolate the capture journal; lifecycle integration has its own PostgreSQL gate. */
export function captureDependencies():[CommerceLifecycle,FinancialOperations]{
 return [{ledger:{lock:async()=>{},environment:async()=>{},fee:async()=>{},enqueue:async()=>{}},captured:async()=>{}} as unknown as CommerceLifecycle,
  {providerEvent:async()=>{}} as unknown as FinancialOperations];
}
