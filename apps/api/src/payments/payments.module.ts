import {Module} from '@nestjs/common';
import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';
import {PaystackGateway} from './paystack.gateway';
import {IdentityModule} from '../auth/identity.module';
import {PaymentReadsService} from './payment-reads.service';
import {CustomerPaymentsController,FinancePaymentsController} from './payment-reads.controller';
import {PaymentRecoveryController} from './payment-recovery.controller';
import {CustomerModule} from '../customer/customer.module';
import {OrderIntentsController} from './order-intents.controller';
import {OrderIntentsService} from './order-intents.service';
@Module({imports:[IdentityModule,CustomerModule],controllers:[PaymentsController,CustomerPaymentsController,FinancePaymentsController,PaymentRecoveryController,OrderIntentsController],providers:[PaymentsService,PaystackGateway,PaymentReadsService,OrderIntentsService]})
export class PaymentsModule {}
