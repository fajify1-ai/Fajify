import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerController, DiscoveryController} from './customer.controller';
import {CustomerService} from './customer.service';
import {MarketplaceService} from './marketplace.service';
import {CustomerAccountService} from './account.service';
import {CustomerAccountController} from './account.controller';
import {MarketplaceController, MerchantPublicController} from './marketplace.controller';
import {CustomerWriteGuard} from './customer-write.guard';

@Module({imports:[IdentityModule],controllers:[DiscoveryController,CustomerController,MarketplaceController,MerchantPublicController,CustomerAccountController],providers:[CustomerService,MarketplaceService,CustomerAccountService,CustomerWriteGuard],exports:[CustomerService,CustomerWriteGuard]})
export class CustomerModule {}
