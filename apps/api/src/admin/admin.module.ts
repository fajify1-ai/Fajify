import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {AdminOperationsController} from './admin.controller';
import {AdminOperationsService} from './admin.service';
@Module({imports:[IdentityModule],controllers:[AdminOperationsController],providers:[AdminOperationsService]})
export class AdminOperationsModule {}
