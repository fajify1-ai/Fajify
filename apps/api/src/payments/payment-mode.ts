import {ServiceUnavailableException} from '@nestjs/common';

export const SIMULATED_PAYMENT_ENVIRONMENT='test';

export function requireSimulatedPayments(){
 if(process.env.FAJI_PAYMENT_MODE!=='simulated')
  throw new ServiceUnavailableException('Simulated payments are not enabled');
}
