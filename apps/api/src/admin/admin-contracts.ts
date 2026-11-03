/** M8-P1 additive API inventory. Reject missing bearer auth, bodies,
 * pagination, declared path params or documented JSON responses.
 */
export interface AdminOperation {
 path:string;method:'get'|'post'|'put';body:boolean;status:200|201;paginated:boolean;
}
const entry=(path:string,method:'get'|'post',body=false,status:200|201=200,paginated=false):AdminOperation=>
 ({path:'/api/v1/admin/'+path,method,body,status,paginated});
export const M8_OPERATIONS:ReadonlyArray<AdminOperation>=[
 entry('operations/overview','get'),entry('operations/audit','get',false,200,true),
 entry('operations/command-audit','get',false,200,true),
 entry('governance/approvals','get',false,200,true),
 entry('governance/reviews','get',false,200,true),
 entry('governance/restrictions','get',false,200,true),
 entry('governance/reviews/{id}/moderation','post',true),
 entry('governance/branches/{id}/restriction','post',true),
 entry('governance/catalogue/{id}/restriction','post',true),
 entry('support/cases','get',false,200,true),
 entry('support/cases/{id}','get',false,200,true),
 entry('support/cases/{id}/assignment','post',true),
 entry('support/cases/{id}/messages','post',true),
 entry('support/cases/{id}/status','post',true),
 entry('incidents','get',false,200,true),
 entry('incidents','post',true,201),
 entry('incidents/{id}/status','post',true),
 entry('finance/summary','get'),entry('reports/overview','get'),
 entry('reports/businesses/{id}','get'),entry('integrations/consistency','get'),
 entry('monitoring/status','get'),entry('monitoring/check','post',false),
 entry('monitoring/alerts','get',false,200,true),
 entry('monitoring/alerts/{id}/acknowledgement','post',true),
 entry('integrations/customers/{subject}/activity','get',false,200,true)
];

/** M8-owned customer support notification contracts consumed by M8-P2. */
export const M8_CUSTOMER_OPERATIONS:ReadonlyArray<AdminOperation>=[
 {path:'/api/v1/customer/support-notifications',method:'get',body:false,status:200,paginated:true},
 {path:'/api/v1/customer/support-notifications/{id}/read',method:'put',body:false,status:200,paginated:false},
 {path:'/api/v1/customer/integrations/booking-rides',method:'get',body:false,status:200,paginated:true},
 {path:'/api/v1/customer/integrations/booking-rides',method:'post',body:true,status:200,paginated:false},
 {path:'/api/v1/customer/integrations/booking-rides/{id}/unlink',method:'put',body:false,status:200,paginated:false}
];
