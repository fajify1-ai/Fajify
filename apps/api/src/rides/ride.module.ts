import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {RideController} from './ride.controller';
import {RideService} from './ride.service';
import {RideFareService} from './ride-fare.service';
import {RideRequestsService} from './ride-requests.service';
import {CustomerRidesController} from './customer-rides.controller';
@Module({imports:[IdentityModule],controllers:[RideController,CustomerRidesController],providers:[RideService,RideFareService,RideRequestsService]})
export class RideModule {}
