import {BadRequestException,Controller,Get,Inject,Param,ParseUUIDPipe,Query,Req,Sse,UseGuards,type MessageEvent} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiQuery,ApiOkResponse} from '@nestjs/swagger';
import {concatMap,interval,map,Observable,startWith} from 'rxjs';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {RideTrackingService} from './ride-tracking.service';
const isUuid=(x:string|undefined)=>!x||/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
@ApiTags('ride-tracking') @ApiBearerAuth('keycloak')
@Controller({path:'rides',version:'1'}) @UseGuards(IdentityGuard,AccountGuard)
export class RideTrackingController {
 constructor(@Inject(RideTrackingService)private readonly tracking:RideTrackingService){}
 @Get(':id/timeline')
 @ApiQuery({name:'after',required:false,schema:{type:'string',format:'uuid'}})
 @ApiQuery({name:'areaId',required:false,schema:{type:'string',format:'uuid'}})
 @ApiOkResponse({description:'Scoped trip state, transition history and fresh driver location'})
 timeline(@Req() request:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string,@Query('after') after?:string,@Query('areaId') areaId?:string){
  if(!isUuid(after)||!isUuid(areaId))throw new BadRequestException('Invalid cursor or area');
  return this.tracking.timeline(request.identity,id,after,areaId);
 }
 /** Authenticated SSE fallback. Rechecks revocation and membership each poll. */
 @Sse(':id/events')
 @ApiQuery({name:'areaId',required:false,schema:{type:'string',format:'uuid'}})
 events(@Req() request:{identity:VerifiedIdentity},@Param('id',ParseUUIDPipe) id:string,@Query('areaId') areaId?:string):Observable<MessageEvent>{
  if(!isUuid(areaId))throw new BadRequestException('Invalid area');
  let cursor:string|undefined;
  return interval(2000).pipe(startWith(0),
   concatMap(async()=>{
    const snap=await this.tracking.timeline(request.identity,id,cursor,areaId);
    cursor=snap.cursor??undefined;
    return snap;
   }),
   map(data=>({type:'ride-state',data,retry:2000} as MessageEvent))
  );
 }
}
