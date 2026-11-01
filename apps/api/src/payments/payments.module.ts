import {Module} from '@nestjs/common';
import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';
import {PaystackGateway} from './paystack.gateway';
@Module({controllers:[PaymentsController],providers:[PaymentsService,PaystackGateway]})
export class PaymentsModule {}
