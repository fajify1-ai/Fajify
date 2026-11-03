import {Body,Controller,Get,Param,ParseUUIDPipe,Post,Query,Req,UseGuards,ValidationPipe} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiCreatedResponse,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {PlanInput,PlanListQuery,PlanPage,PlanView,RecommendationPage} from './planning.dto';
import {PlanningService} from './planning.service';
type Request={identity:VerifiedIdentity};
const strict=<T extends object>(expectedType:new()=>T)=>new ValidationPipe({expectedType,whitelist:true,forbidNonWhitelisted:true,transform:true});
@ApiTags('experience-planning') @ApiBearerAuth('keycloak')
@Controller({path:'plans',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class PlanningController {
 constructor(private readonly planning:PlanningService){}
 @Post() @ApiBody({type:PlanInput}) @ApiCreatedResponse({type:PlanView})
 create(@Req() r:Request,@Body(strict(PlanInput)) input:PlanInput){return this.planning.create(r.identity,input);}
 @Get() @ApiOkResponse({type:PlanPage})
 list(@Req() r:Request,@Query(strict(PlanListQuery)) query:PlanListQuery){return this.planning.list(r.identity.subject,query);}
 @Get(':id') @ApiOkResponse({type:PlanView})
 get(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.get(r.identity.subject,id);}
 @Get(':id/recommendations') @ApiOkResponse({type:RecommendationPage})
 recommendations(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.recommend(r.identity.subject,id);}
 @Post(':id/archive') @ApiCreatedResponse({type:PlanView})
 archive(@Req() r:Request,@Param('id',ParseUUIDPipe) id:string){return this.planning.archive(r.identity,id);}
}