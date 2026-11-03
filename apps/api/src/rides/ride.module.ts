import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {RideController} from './ride.controller';
import {RideService} from './ride.service';
import {RideAreasService} from './ride-areas.service';
import {RideAreasController} from './ride-areas.controller';
import {RideFareService} from './ride-fare.service';
import {RideRequestsService} from './ride-requests.service';
import {CustomerRidesController} from './customer-rides.controller';
import {RideDispatchController} from './ride-dispatch.controller';
import {DriverOnboardingService} from './driver-onboarding.service';
import {DriverOnboardingController} from './driver-onboarding.controller';
@Module({imports:[IdentityModule],controllers:[RideController,CustomerRidesController,RideDispatchController,DriverOnboardingController,RideAreasController],providers:[RideService,RideFareService,RideRequestsService,DriverOnboardingService,RideAreasService]})
export class RideModule {}
