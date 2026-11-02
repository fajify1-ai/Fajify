import {Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards} from '@nestjs/common';
import {ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger';
import {IdentityGuard} from '../auth/identity.guard';
import {AccountGuard} from '../auth/account.guard';
import type {VerifiedIdentity} from '../auth/identity.types';
import {CustomerAccountService} from './account.service';
import {CustomerWriteGuard} from './customer-write.guard';
import {PageQuery} from './customer.dto';
import {ChangedView} from './marketplace.dto';
import {NotificationPage, NotificationView, PrivateReviewPage, PrivateReviewView, ProfileInput, ProfileView, ReviewInput, SupportCasePage, SupportCaseView, SupportInput, SupportMessageInput, SupportMessagePage, SupportMessageView, UnreadView, WishlistPage} from './account.dto';
import {pagination, resourceId, validated} from './customer-http';
type AuthRequest={identity:VerifiedIdentity};

@ApiTags('customer-account') @ApiBearerAuth('keycloak')
@Controller({path:'customer',version:'1'}) @UseGuards(IdentityGuard,AccountGuard,CustomerWriteGuard)
export class CustomerAccountController {
 constructor(@Inject(CustomerAccountService) private readonly service:CustomerAccountService){}
 @Get('profile') @ApiOkResponse({type:ProfileView})
 profile(@Req() r:AuthRequest){return this.service.profile(r.identity.subject);}
 @Patch('profile') @ApiBody({type:ProfileInput}) @ApiOkResponse({type:ProfileView})
 updateProfile(@Req() r:AuthRequest,@Body(validated(ProfileInput)) input:ProfileInput){return this.service.updateProfile(r.identity,input);}
 @Get('wishlist') @ApiOkResponse({type:WishlistPage}) @pagination()
 wishlist(@Req() r:AuthRequest,@Query(validated(PageQuery)) input:PageQuery){return this.service.wishlist(r.identity.subject,input);}
 @Put('wishlist/:id') @ApiOkResponse({type:ChangedView}) @resourceId()
 save(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.save(r.identity,id);}
 @Delete('wishlist/:id') @ApiOkResponse({type:ChangedView}) @resourceId()
 unsave(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.unsave(r.identity,id);}
 @Put('orders/:id/review') @ApiBody({type:ReviewInput}) @ApiOkResponse({type:PrivateReviewView}) @resourceId()
 orderReview(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(ReviewInput)) input:ReviewInput){return this.service.review(r.identity,'order',id,input);}
 @Put('reservations/:id/review') @ApiBody({type:ReviewInput}) @ApiOkResponse({type:PrivateReviewView}) @resourceId()
 reservationReview(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(ReviewInput)) input:ReviewInput){return this.service.review(r.identity,'reservation',id,input);}
 @Get('reviews') @ApiOkResponse({type:PrivateReviewPage}) @pagination()
 reviews(@Req() r:AuthRequest,@Query(validated(PageQuery)) input:PageQuery){return this.service.reviews(r.identity.subject,input);}
 @Delete('reviews/:id') @ApiOkResponse({type:ChangedView}) @resourceId()
 withdrawReview(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.withdrawReview(r.identity,id);}
 @Get('notifications') @ApiOkResponse({type:NotificationPage}) @pagination()
 notifications(@Req() r:AuthRequest,@Query(validated(PageQuery)) input:PageQuery){return this.service.notifications(r.identity.subject,input);}
 @Get('notifications/unread-count') @ApiOkResponse({type:UnreadView})
 unread(@Req() r:AuthRequest){return this.service.unread(r.identity.subject);}
 @Put('notifications/:id/read') @ApiOkResponse({type:NotificationView}) @resourceId()
 read(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.readNotification(r.identity,id);}
 @Get('support') @ApiOkResponse({type:SupportCasePage}) @pagination()
 support(@Req() r:AuthRequest,@Query(validated(PageQuery)) input:PageQuery){return this.service.support(r.identity.subject,input);}
 @Post('support') @ApiBody({type:SupportInput}) @ApiCreatedResponse({type:SupportCaseView})
 createSupport(@Req() r:AuthRequest,@Body(validated(SupportInput)) input:SupportInput){return this.service.createSupport(r.identity,input);}
 @Get('support/:id') @ApiOkResponse({type:SupportCaseView}) @resourceId()
 supportDetail(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.supportDetail(r.identity.subject,id);}
 @Get('support/:id/messages') @ApiOkResponse({type:SupportMessagePage}) @resourceId() @pagination()
 messages(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string,@Query(validated(PageQuery)) input:PageQuery){return this.service.messages(r.identity.subject,id,input);}
 @Post('support/:id/messages') @ApiBody({type:SupportMessageInput}) @ApiCreatedResponse({type:SupportMessageView}) @resourceId()
 reply(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string,@Body(validated(SupportMessageInput)) input:SupportMessageInput){return this.service.reply(r.identity,id,input);}
 @Put('support/:id/closure') @ApiOkResponse({type:SupportCaseView}) @resourceId()
 close(@Req() r:AuthRequest,@Param('id',new ParseUUIDPipe()) id:string){return this.service.closeSupport(r.identity,id);}
}
