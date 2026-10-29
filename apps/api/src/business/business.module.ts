import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {BusinessController} from './business.controller';
import {BusinessService} from './business.service';
@Module({imports:[IdentityModule],controllers:[BusinessController],providers:[BusinessService]})
export class BusinessModule {}
