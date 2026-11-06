import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {HealthController} from './health.controller';
import {DatabaseModule} from './database.module';
import {IdentityModule} from './auth/identity.module';
import {BusinessModule} from './business/business.module';
import {PaymentsModule} from './payments/payments.module';
import {CustomerModule} from './customer/customer.module';
import {PlanningModule} from './planning/planning.module';
import {RideModule} from './rides/ride.module';
import {AdminOperationsModule} from './admin/admin.module';
import {validateEnvironment} from './config';
@Module({imports:[ConfigModule.forRoot({isGlobal:true,validate:validateEnvironment}),DatabaseModule,IdentityModule,BusinessModule,CustomerModule,PaymentsModule,PlanningModule,RideModule,AdminOperationsModule],controllers:[HealthController]})
export class AppModule {}
