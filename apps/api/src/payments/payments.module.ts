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
import {FinanceLedger} from './finance-ledger.service';
import {CommerceLifecycle} from './commerce-lifecycle.service';
import {FinancialOperations} from './financial-operations.service';
import {M5CustomerController,M5MerchantController,M5AdminController} from './m5-lifecycle.controller';
import {FinanceJobs} from './finance-jobs.service';
@Module({imports:[IdentityModule,CustomerModule],controllers:[PaymentsController,CustomerPaymentsController,FinancePaymentsController,PaymentRecoveryController,OrderIntentsController,M5CustomerController,M5MerchantController,M5AdminController],providers:[PaymentsService,PaystackGateway,PaymentReadsService,OrderIntentsService,FinanceLedger,CommerceLifecycle,FinancialOperations,FinanceJobs],exports:[CommerceLifecycle,PaystackGateway,FinanceLedger]})
export class PaymentsModule {}
