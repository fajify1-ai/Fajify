import {Body,Controller,Get,Header,HttpCode,Inject,Param,ParseUUIDPipe,Post,Put,Query,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiBody,ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import {ResourceGuard,RequireResource} from '../auth/resource.guard';
import {CustomerWriteGuard} from '../customer/customer-write.guard';
import {PageQuery} from '../customer/customer.dto';
import {pagination,validated} from '../customer/customer-http';
import {WebCompletionService} from './service';
import * as Views from './responses';
import {CartInput,DraftInput,HostedEventInput,InvitationAcceptance,MerchantMessageInput,MerchantSupportInput,PromotionInput,UploadInput} from './dto';
type AuthRequest={identity:{subject:string}};
@ApiTags('web-customer-journeys') @ApiBearerAuth('session') @Controller({path:'customer',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class WebCustomerController {
 constructor(@Inject(WebCompletionService)private readonly service:WebCompletionService){}
 @Header('Cache-Control','no-store') @Get('cart') @Views.journeyResponse(Views.WebCart) async cart(@Req()r:AuthRequest){return {data:await this.service.cart(r.identity.subject)};}
 @Put('cart') @ApiBody({type:CartInput}) @Views.journeyResponse(Views.WebCart) async setCart(@Req()r:AuthRequest,@Body(validated(CartInput))input:CartInput){return {data:await this.service.saveCart(r.identity.subject,input)};}
 @Header('Cache-Control','no-store') @Get('events') @pagination() @Views.journeyResponse(Views.WebHostedEvents) async events(@Req()r:AuthRequest,@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.events(r.identity.subject,page)};}
 @Header('Cache-Control','no-store') @Get('events/:id') @Views.journeyResponse(Views.WebHostedEvent) async eventDetail(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.event(r.identity.subject,id)};}
 @HttpCode(200) @Post('events') @ApiBody({type:HostedEventInput}) @Views.journeyResponse(Views.WebHostedEvent) async event(@Req()r:AuthRequest,@Body(validated(HostedEventInput))input:HostedEventInput){return {data:await this.service.createEvent(r.identity.subject,input)};}
 @HttpCode(200) @Post('events/:id/invitations') @Views.journeyResponse(Views.WebInvitation) async invite(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.invite(r.identity.subject,id)};}
 @HttpCode(200) @Post('invitations/preview') @ApiBody({type:InvitationAcceptance}) @Views.journeyResponse(Views.WebHostedEvent) async preview(@Req()r:AuthRequest,@Body(validated(InvitationAcceptance))input:InvitationAcceptance){return {data:await this.service.previewInvite(r.identity.subject,input.token)};}
 @HttpCode(200) @Post('invitations/acceptance') @ApiBody({type:InvitationAcceptance}) @Views.journeyResponse(Views.WebInvitationAccepted) async accept(@Req()r:AuthRequest,@Body(validated(InvitationAcceptance))input:InvitationAcceptance){return {data:await this.service.acceptInvite(r.identity.subject,input.token)};}
 @Header('Cache-Control','no-store') @Get('promotions') @pagination() @Views.journeyResponse(Views.WebPromotions) async promotions(@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.promotions(undefined,page)};}
 @Header('Cache-Control','no-store') @Get('payments/:id/receipt') @Views.journeyResponse(Views.WebReceipt) async receipt(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.receipt(r.identity.subject,id)};}
}
@ApiTags('web-onboarding') @ApiBearerAuth('session') @Controller({path:'business/onboarding',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class WebOnboardingController {
 constructor(@Inject(WebCompletionService)private readonly service:WebCompletionService){}
 @Header('Cache-Control','no-store') @Get('draft/current') @Views.journeyResponse(Views.WebDraftView) async draft(@Req()r:AuthRequest){return {data:await this.service.draft(r.identity.subject)};}
 @Put('draft/current') @ApiBody({type:DraftInput}) @Views.journeyResponse(Views.WebDraftView) async save(@Req()r:AuthRequest,@Body(validated(DraftInput))input:DraftInput){return {data:await this.service.saveDraft(r.identity.subject,input)};}
 @Header('Cache-Control','no-store') @Get('applications/mine') @pagination() @Views.journeyResponse(Views.WebApplications) async applications(@Req()r:AuthRequest,@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.applications(r.identity.subject,page)};}
 @Header('Cache-Control','no-store') @Get(':id/verification-documents') @Views.journeyResponse(Views.WebDocuments) async documents(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.documents(r.identity.subject,id)};}
 @HttpCode(200) @Post(':id/verification-documents') @ApiBody({type:UploadInput}) @Views.journeyResponse(Views.WebUploadResult) async upload(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Body(validated(UploadInput))input:UploadInput){return {data:await this.service.upload(r.identity.subject,id,input)};}
 @Header('Cache-Control','no-store') @Get(':id/verification-documents/:documentId') @Views.journeyResponse(Views.WebDocumentFile) async document(@Req()r:AuthRequest,@Param('id',ParseUUIDPipe)id:string,@Param('documentId',ParseUUIDPipe)document:string){return {data:await this.service.document(r.identity.subject,id,document)};}
}
@ApiTags('web-merchant-journeys') @ApiBearerAuth('session') @Controller({path:'businesses/:businessId',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,ResourceGuard,CustomerWriteGuard) @RequireResource('business','businessId','owner','manager')
export class WebMerchantController {
 constructor(@Inject(WebCompletionService)private readonly service:WebCompletionService){}
 @Header('Cache-Control','no-store') @Get('branches/:branchId/packages/:id/public-options') @Views.journeyResponse(Views.WebPackageOptions) async options(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('branchId',ParseUUIDPipe)branch:string,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.packageOptions(r.identity.subject,b,branch,id)};}
 @Header('Cache-Control','no-store') @Get('branches/:branchId/public-profile') @Views.journeyResponse(Views.WebPublicProfile) async publicProfile(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('branchId',ParseUUIDPipe)branch:string){return {data:await this.service.publicProfile(r.identity.subject,b,branch)};}
 @Header('Cache-Control','no-store') @Get('branches/:branchId/catalogue/:id/media') @Views.journeyResponse(Views.WebMedia) async media(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('branchId',ParseUUIDPipe)branch:string,@Param('id',ParseUUIDPipe)id:string){return {data:await this.service.catalogueMedia(r.identity.subject,b,branch,id)};}
 @Header('Cache-Control','no-store') @Get('reports') @Views.journeyResponse(Views.WebReport) async report(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string){return {data:await this.service.reporting(r.identity.subject,b)};}
 @Header('Cache-Control','no-store') @Get('health') @Views.journeyResponse(Views.WebReport) async health(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string){return {data:await this.service.reporting(r.identity.subject,b)};}
 @Header('Cache-Control','no-store') @Get('notifications') @pagination() @Views.journeyResponse(Views.WebMerchantNotifications) async notifications(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.notifications(r.identity.subject,b,page)};}
 @Put('notifications/:id/read') @Views.journeyResponse(Views.WebNotificationRead) async read(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('id')id:string){return {data:await this.service.readNotification(r.identity.subject,b,id)};}
 @Header('Cache-Control','no-store') @Get('support') @pagination() @Views.journeyResponse(Views.WebSupportCases) async support(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.support(r.identity.subject,b,page)};}
 @HttpCode(200) @Post('support') @ApiBody({type:MerchantSupportInput}) @Views.journeyResponse(Views.WebSupportCase) async createSupport(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Body(validated(MerchantSupportInput))input:MerchantSupportInput){return {data:await this.service.createSupport(r.identity.subject,b,input)};}
 @Header('Cache-Control','no-store') @Get('support/:id/messages') @Views.journeyResponse(Views.WebSupportMessages) async thread(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('id',ParseUUIDPipe)id:string,@Query(validated(PageQuery))page:PageQuery){return {data:await this.service.thread(r.identity.subject,b,id,undefined,page)};}
 @HttpCode(200) @Post('support/:id/messages') @ApiBody({type:MerchantMessageInput}) @Views.journeyResponse(Views.WebSupportMessages) async reply(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Param('id',ParseUUIDPipe)id:string,@Body(validated(MerchantMessageInput))input:MerchantMessageInput){return {data:await this.service.thread(r.identity.subject,b,id,input.message)};}
 @Header('Cache-Control','no-store') @Get('promotions') @pagination() @Views.journeyResponse(Views.WebPromotions) async promotions(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Query(validated(PageQuery))page:PageQuery){await this.service.scope(r.identity.subject,b);return {data:await this.service.promotions(b,page)};}
 @HttpCode(200) @Post('promotions') @ApiBody({type:PromotionInput}) @Views.journeyResponse(Views.WebPromotion) async promotion(@Req()r:AuthRequest,@Param('businessId',ParseUUIDPipe)b:string,@Body(validated(PromotionInput))input:PromotionInput){return {data:await this.service.createPromotion(r.identity.subject,b,input)};}
}

@ApiTags('web-discovery') @Controller({path:'discovery/events',version:'1'})
export class WebEventDiscoveryController {
 constructor(@Inject(WebCompletionService)private readonly service:WebCompletionService){}
 @Header('Cache-Control','no-store') @Get(':id/availability') @Views.journeyResponse(Views.WebEventAvailability) availability(@Param('id',ParseUUIDPipe)id:string){return this.service.eventAvailability(id).then(data=>({data}));}
}
