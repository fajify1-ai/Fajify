import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerController, DiscoveryController} from './customer.controller';
import {CustomerService} from './customer.service';

@Module({imports:[IdentityModule],controllers:[DiscoveryController,CustomerController],providers:[CustomerService]})
export class CustomerModule {}
