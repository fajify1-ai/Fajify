import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {BusinessController} from './business.controller';
import {BusinessService} from './business.service';
import {ManagementController} from './management.controller';
import {ManagementService} from './management.service';
@Module({imports:[IdentityModule],controllers:[BusinessController,ManagementController],providers:[BusinessService,ManagementService]})
export class BusinessModule {}
