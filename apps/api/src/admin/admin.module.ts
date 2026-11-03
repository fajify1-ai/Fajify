import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
import {CustomerModule} from '../customer/customer.module';
import {CustomerSupportNotificationsController} from './customer-support-notifications.controller';
import {CustomerSupportNotificationsService} from './customer-support-notifications.service';
import {AdminOperationsController} from './admin.controller';
import {AdminGovernanceController,AdminSupportController,AdminIncidentController} from './admin-workflows.controller';
import {AdminInsightsController} from './admin-insights.controller';
import {AdminOperationsService} from './admin.service';
import {AdminCommandService} from './admin-command.service';
import {AdminScopeGuard} from './admin-scope.guard';
import {AdminGovernanceService} from './admin-governance.service';
import {AdminSupportService} from './admin-support.service';
import {AdminIncidentService} from './admin-incidents.service';
import {AdminInsightsService} from './admin-insights.service';
import {AdminMonitorService} from './admin-monitor.service';
import {AdminEmptyBodyGuard} from './admin-empty-body.guard';

@Module({
 imports:[IdentityModule,CustomerModule],
 controllers:[CustomerSupportNotificationsController,AdminOperationsController,AdminGovernanceController,AdminSupportController,AdminIncidentController,AdminInsightsController],
 providers:[CustomerSupportNotificationsService,AdminEmptyBodyGuard,AdminScopeGuard,AdminOperationsService,AdminCommandService,AdminGovernanceService,AdminSupportService,
  AdminIncidentService,AdminInsightsService,AdminMonitorService]
})
export class AdminOperationsModule {}
