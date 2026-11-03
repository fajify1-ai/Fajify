import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerModule} from '../customer/customer.module';
import {PlanningController} from './planning.controller';
import {PlanningService} from './planning.service';
@Module({imports:[IdentityModule,CustomerModule],controllers:[PlanningController],providers:[PlanningService]})
export class PlanningModule {}
