import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {PaymentsModule} from '../payments/payments.module';
import {RideController} from './ride.controller';
import {CustomerRidesController} from './customer-rides.controller';
import {RideDispatchController} from './ride-dispatch.controller';
import {DriverOnboardingController} from './driver-onboarding.controller';
import {RideAreasController} from './ride-areas.controller';
import {RideAreasService} from './ride-areas.service';
import {RideService} from './ride.service';
import {RideFareService} from './ride-fare.service';
import {RideRequestsService} from './ride-requests.service';
import {DriverOnboardingService} from './driver-onboarding.service';
import {RideDriverOperations} from './ride-driver-operations.service';
import {RideDriverOperationsController} from './ride-driver-operations.controller';
import {RideLifecycleOperations} from './ride-lifecycle-operations.service';
import {RideLifecycleOperationsController} from './ride-lifecycle-operations.controller';
import {RideTrackingService} from './ride-tracking.service';
import {RideTrackingController} from './ride-tracking.controller';
import {RideSafetyService} from './ride-safety.service';
import {RideSafetyController} from './ride-safety.controller';
import {RideFinanceService} from './ride-finance.service';
import {RideTariffService} from './ride-tariff.service';
import {RideTariffController} from './ride-tariff.controller';
import {RideFinanceController} from './ride-finance.controller';

@Module({
 imports:[IdentityModule,PaymentsModule],
 controllers:[
  RideController,CustomerRidesController,RideDispatchController,DriverOnboardingController,
  RideAreasController,RideDriverOperationsController,RideLifecycleOperationsController,
  RideTrackingController,RideSafetyController,RideFinanceController,RideTariffController
 ],
 providers:[
  RideService,RideFareService,RideRequestsService,DriverOnboardingService,
  RideAreasService,RideDriverOperations,RideLifecycleOperations,
  RideTrackingService,RideSafetyService,RideFinanceService,RideTariffService
 ]
})
export class RideModule {}
