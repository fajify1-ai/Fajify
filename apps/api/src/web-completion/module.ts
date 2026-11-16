import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerModule} from '../customer/customer.module';
import {WebCompletionService} from './service';
import {WebCustomerController,WebMerchantController,WebOnboardingController} from './controller';
@Module({imports:[IdentityModule,CustomerModule],controllers:[WebCustomerController,WebMerchantController,WebOnboardingController],providers:[WebCompletionService]})
export class WebCompletionModule {}
