import {Module} from '@nestjs/common';
import {IdentityModule} from '../auth/identity.module';
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

@Module({
 imports:[IdentityModule],
 controllers:[AdminOperationsController,AdminGovernanceController,AdminSupportController,AdminIncidentController,AdminInsightsController],
 providers:[AdminScopeGuard,AdminOperationsService,AdminCommandService,AdminGovernanceService,AdminSupportService,
  AdminIncidentService,AdminInsightsService,AdminMonitorService]
})
export class AdminOperationsModule {}
