import {Module} from '@nestjs/common';
import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';
import {PaystackGateway} from './paystack.gateway';
import {IdentityModule} from '../auth/identity.module';
import {PaymentReadsService} from './payment-reads.service';
import {CustomerPaymentsController,FinancePaymentsController} from './payment-reads.controller';
import {PaymentRecoveryController} from './payment-recovery.controller';
@Module({imports:[IdentityModule],controllers:[PaymentsController,CustomerPaymentsController,FinancePaymentsController,PaymentRecoveryController],providers:[PaymentsService,PaystackGateway,PaymentReadsService]})
export class PaymentsModule {}
