import {Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {RequireResource, ResourceGuard} from '../auth/resource.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerWriteGuard} from './customer-write.guard';
import {MarketplaceService} from './marketplace.service';
import {CategoriesView, ChangedView, MediaPage, MediaReplacement, PackagePublicInput, PlanPage, PlanQuery, PlanQuoteInput, PlanQuoteView, PublicProfileInput, VenueDetail, VenuePage, VenueQuery} from './marketplace.dto';
import {ReviewPage} from './account.dto';
import {PageQuery} from './customer.dto';
import {pagination, resourceId, validated, venueFilters} from './customer-http';
type AuthRequest={identity:VerifiedIdentity};

@ApiTags('customer-discovery') @Controller({path:'discovery',version:'1'})
export class MarketplaceController {
 constructor(@Inject(MarketplaceService) private readonly service:MarketplaceService){}
 @Get('categories') @ApiOkResponse({type:CategoriesView})
 categories(){return {items:[{id:'product',name:'Products'},{id:'service',name:'Services'},{id:'package',name:'Packages'},{id:'event',name:'Events'}]};}
 @Get('venues') @ApiOkResponse({type:VenuePage}) @pagination() @venueFilters()
 venues(@Query(validated(VenueQuery)) input:VenueQuery){return this.service.venues(input);}
 @Get('venues/:id') @ApiOkResponse({type:VenueDetail}) @resourceId()
 venue(@Param('id',new ParseUUIDPipe()) id:string){return this.service.venue(id);}
 @Get('venues/:id/reviews') @ApiOkResponse({type:ReviewPage}) @resourceId() @pagination()
 reviews(@Param('id',new ParseUUIDPipe()) id:string,@Query(validated(PageQuery)) input:PageQuery){return this.service.reviews(id,input);}
 @Get('plans') @ApiOkResponse({type:PlanPage}) @pagination() @venueFilters()
 @ApiQuery({name:'minBudgetMinor',required:false,schema:{type:'string',pattern:'^(0|[1-9][0-9]{0,18})$'}})
 @ApiQuery({name:'maxBudgetMinor',required:false,schema:{type:'string',pattern:'^(0|[1-9][0-9]{0,18})$'}})
 @ApiQuery({name:'currency',required:false,schema:{type:'string',pattern:'^[A-Z]{3}$',default:'NGN'}})
 @ApiQuery({name:'guests',required:false,schema:{type:'integer',minimum:1,maximum:10000,default:1}})
 @ApiQuery({name:'startsAt',required:false,schema:{type:'string',format:'date-time'}})
 plans(@Query(validated(PlanQuery)) input:PlanQuery){return this.service.plans(input);}
 @Post('plans/:id/quote') @HttpCode(200) @ApiOkResponse({type:PlanQuoteView}) @ApiBody({type:PlanQuoteInput}) @resourceId()
 quote(@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(PlanQuoteInput)) input:PlanQuoteInput){return this.service.quote(id,input);}
}

@ApiTags('merchant-public-content') @ApiBearerAuth('keycloak')
@Controller({path:'businesses/:businessId/branches/:branchId',version:'1'})
@UseGuards(IdentityGuard,AccountGuard,ResourceGuard,CustomerWriteGuard)
@RequireResource('business','businessId','owner','manager')
@resourceId('businessId') @resourceId('branchId')
export class MerchantPublicController {
 constructor(@Inject(MarketplaceService) private readonly service:MarketplaceService){}
 @Put('public-profile') @ApiBody({type:PublicProfileInput}) @ApiOkResponse({type:ChangedView})
 profile(@Req() r:AuthRequest,@Param('businessId',new ParseUUIDPipe()) business:string,@Param('branchId',new ParseUUIDPipe()) branch:string,@Body(validated(PublicProfileInput)) input:PublicProfileInput){return this.service.publicProfile(r.identity,business,branch,input);}
 @Put('public-media') @ApiBody({type:MediaReplacement}) @ApiOkResponse({type:MediaPage})
 media(@Req() r:AuthRequest,@Param('businessId',new ParseUUIDPipe()) business:string,@Param('branchId',new ParseUUIDPipe()) branch:string,@Body(validated(MediaReplacement)) input:MediaReplacement){return this.service.replaceMedia(r.identity,business,branch,input);}
 @Put('packages/:id/public-options') @ApiBody({type:PackagePublicInput}) @ApiOkResponse({type:ChangedView}) @resourceId()
 package(@Req() r:AuthRequest,@Param('businessId',new ParseUUIDPipe()) business:string,@Param('branchId',new ParseUUIDPipe()) branch:string,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(PackagePublicInput)) input:PackagePublicInput){return this.service.configurePackage(r.identity,business,branch,id,input);}
}
