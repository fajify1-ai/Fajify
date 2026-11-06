import {Inject,Injectable,NotFoundException} from '@nestjs/common';
import {Pool} from 'pg';
import {DATABASE_POOL} from '../tokens';
import {CustomerService} from '../customer/customer.service';
import type {PageQuery} from '../customer/customer.dto';
import type {VerifiedIdentity} from '../auth/identity.types';
import type {CustomerSupportNoticePage,CustomerSupportNoticeView} from './customer-support-notifications.dto';

const projection='id,case_id AS "caseId",title,read_at AS "readAt",created_at AS "createdAt"';
@Injectable()
export class CustomerSupportNotificationsService {
 constructor(@Inject(DATABASE_POOL)private readonly pool:Pool,@Inject(CustomerService)private readonly customer:CustomerService){}
 async list(subject:string,q:PageQuery):Promise<CustomerSupportNoticePage>{
  const r=await this.pool.query<CustomerSupportNoticeView>(
   `SELECT ${projection} FROM customer_support_notifications WHERE customer_subject=$1
     ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[subject,q.limit+1,q.offset]);
  return {items:r.rows.slice(0,q.limit),nextOffset:r.rows.length>q.limit?q.offset+q.limit:null};
 }
 async read(identity:VerifiedIdentity,id:string):Promise<CustomerSupportNoticeView>{
  return this.customer.withAccountTransaction(identity,async c=>{
   const result=await c.query<CustomerSupportNoticeView>(
    `UPDATE customer_support_notifications SET read_at=COALESCE(read_at,now())
    WHERE id=$1 AND customer_subject=$2 RETURNING ${projection}`,[id,identity.subject]);
   if(result.rowCount!==1)throw new NotFoundException('Support notification not found');
   return result.rows[0];
  });
 }
}
