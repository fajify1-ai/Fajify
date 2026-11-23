import {Transform} from 'class-transformer';
import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {Equals,IsEmail,IsOptional,IsString,Length,Matches} from 'class-validator';
import {PageQuery} from '../customer/customer.dto';

export class WaitlistSignupInput {
 @ApiProperty({type:String,maxLength:254}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsEmail() @Length(3,254) email!:string;
 @ApiProperty({type:String,minLength:7,maxLength:18,example:'801 234 5678'})
 @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @Length(7,18) @Matches(/^[0-9+()\s.-]+$/) whatsapp!:string;
 @ApiProperty({type:Boolean}) @Equals(true) consent!:true;
}

export class WaitlistAdminQuery extends PageQuery {
 @ApiPropertyOptional({type:String,minLength:1,maxLength:120})
 @IsOptional() @IsString() @Length(1,120) search?:string;
}

export class WaitlistSignupView {
 @ApiProperty({type:String,format:'uuid'}) id!:string;
 @ApiProperty({type:String,format:'email'}) email!:string;
 @ApiProperty({type:String}) whatsapp!:string;
 @ApiProperty({type:String}) consentVersion!:string;
 @ApiProperty({type:String,format:'date-time'}) consentedAt!:string;
 @ApiProperty({type:String,format:'date-time'}) createdAt!:string;
}

export class WaitlistPage {
 @ApiProperty({type:()=>[WaitlistSignupView]}) items!:WaitlistSignupView[];
 @ApiProperty({type:Number,nullable:true}) nextOffset!:number|null;
}
