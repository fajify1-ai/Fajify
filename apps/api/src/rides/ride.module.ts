import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {RideController} from './ride.controller';
import {RideService} from './ride.service';
@Module({imports:[IdentityModule],controllers:[RideController],providers:[RideService]})
export class RideModule {}
