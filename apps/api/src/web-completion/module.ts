import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerModule} from '../customer/customer.module';
import {WebCompletionService} from './service';
import {WebCustomerController,WebMerchantController,WebOnboardingController,WebEventDiscoveryController} from './controller';
@Module({imports:[IdentityModule,CustomerModule],controllers:[WebCustomerController,WebMerchantController,WebOnboardingController,WebEventDiscoveryController],providers:[WebCompletionService],exports:[WebCompletionService]})
export class WebCompletionModule {}
