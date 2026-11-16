import {BadRequestException} from '@nestjs/common';
export type ApplicationSnapshot={businessName:string;category:string;services:string[];scale:string;contact:{fullName:string;email:string;phone:string};business:{registrationNumber:string;address:string};location:{city:string;area:string;landmark:string};verificationStatus:'not_reviewed'};
/** Validate the complete application independently of the browser's current step. */
export function applicationSnapshot(data:{step:number;businessName:string;fields?:string}):ApplicationSnapshot{
 let fields:Record<string,unknown>;
 try{fields=JSON.parse(data.fields??'{}');}catch{throw new BadRequestException('Invalid application fields');}
 if(!fields||typeof fields!=='object'||Array.isArray(fields))throw new BadRequestException('Invalid application fields');
 const text=(key:string,min:number,max:number)=>{const value=fields[key];if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new BadRequestException(`Complete ${key} before submitting`);return value.trim();};
 const category=text('category',1,64),scale=text('scale',1,64),services=fields.services;
 if(data.step!==8||!['restaurant','hotel','venue','spa','cinema','retail','park','other'].includes(category)||!['solo','small','medium','enterprise'].includes(scale)||!Array.isArray(services)||!services.length||new Set(services).size!==services.length||services.some(value=>!['reservations','ordering','tickets','delivery','transport','loyalty','packages','gifting'].includes(value)))throw new BadRequestException('Complete the business type, services and scale');
 const businessName=data.businessName?.trim(),fullName=text('fullName',2,120),email=text('email',3,254),phone=text('phone',7,30);
 if(!businessName||businessName.length<2||businessName.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||! /^[+()\d\s-]{7,30}$/.test(phone))throw new BadRequestException('Invalid application contact details');
 return {businessName,category,services:[...services].sort(),scale,contact:{fullName,email,phone},business:{registrationNumber:text('regNum',0,120),address:text('bizAddr',1,1000)},location:{city:text('city',1,120),area:text('lga',1,120),landmark:text('landmark',0,300)},verificationStatus:'not_reviewed'};
}
