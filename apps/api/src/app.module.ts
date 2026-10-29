import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {HealthController} from './health.controller';
import {DatabaseModule} from './database.module';
import {IdentityModule} from './auth/identity.module';
import {BusinessModule} from './business/business.module';
import {validateEnvironment} from './config';
@Module({imports:[ConfigModule.forRoot({isGlobal:true,validate:validateEnvironment}),DatabaseModule,IdentityModule,BusinessModule],controllers:[HealthController]})
export class AppModule {}
