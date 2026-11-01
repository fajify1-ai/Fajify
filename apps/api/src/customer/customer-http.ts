import {applyDecorators, ValidationPipe} from '@nestjs/common';
import {ApiParam, ApiQuery} from '@nestjs/swagger';

export const validated=<T extends object>(type:new()=>T)=>new ValidationPipe({expectedType:type,whitelist:true,forbidNonWhitelisted:true,transform:true});
export const pagination=()=>applyDecorators(
 ApiQuery({name:'limit',required:false,schema:{type:'integer',minimum:1,maximum:50,default:20}}),
 ApiQuery({name:'offset',required:false,schema:{type:'integer',minimum:0,maximum:10000,default:0}}),
);
export const resourceId=(name='id')=>ApiParam({name,schema:{type:'string',format:'uuid'}});
export const venueFilters=()=>applyDecorators(
 ApiQuery({name:'q',required:false,schema:{type:'string',minLength:1,maxLength:120}}),
 ApiQuery({name:'location',required:false,schema:{type:'string',minLength:1,maxLength:120}}),
 ApiQuery({name:'category',required:false,enum:['product','service','package','event']}),
 ApiQuery({name:'branchId',required:false,schema:{type:'string',format:'uuid'}}),
 ApiQuery({name:'latitude',required:false,schema:{type:'number',minimum:-90,maximum:90}}),
 ApiQuery({name:'longitude',required:false,schema:{type:'number',minimum:-180,maximum:180}}),
 ApiQuery({name:'radiusKm',required:false,schema:{type:'integer',minimum:1,maximum:100,default:10}}),
);
