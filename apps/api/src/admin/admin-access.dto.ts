import {ApiProperty} from '@nestjs/swagger';
import {ArrayMaxSize,ArrayUnique,IsArray,IsBoolean,IsEmail,IsIn,IsString,Length,Matches} from 'class-validator';
import {ADMIN_SCOPES,type AdminScope} from './admin-scope.guard';

export class AdminAccessInput {
 @ApiProperty({type:String,format:'email',maxLength:254})
 @IsEmail() @Length(3,254) email!:string;
 @ApiProperty({type:Boolean}) @IsBoolean() platformAdmin!:boolean;
 @ApiProperty({type:[String],enum:ADMIN_SCOPES,maxItems:ADMIN_SCOPES.length})
 @IsArray() @ArrayMaxSize(ADMIN_SCOPES.length) @ArrayUnique() @IsIn([...ADMIN_SCOPES],{each:true})
 scopes!:AdminScope[];
 @ApiProperty({type:String,minLength:8,maxLength:500})
 @IsString() @Length(8,500) @Matches(/\S/) reason!:string;
 @ApiProperty({type:String,pattern:'^[A-Za-z0-9_-]{8,100}$'})
 @IsString() @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestKey!:string;
}

export type AdminAccessManagerView={canManageAdmins:boolean;managerSubject:string|null};
export type ManagedAdminView={
 subject:string;
 email:string;
 emailVerified:boolean;
 suspended:boolean;
 scopes:AdminScope[];
};
