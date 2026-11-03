type Method='get'|'post'|'put'|'patch'|'delete';
type Operation={path:string;method:Method;status:number;protected:boolean;body?:boolean;paginated?:boolean};
const publicRoute=(path:string,method:Method='get',options:Partial<Operation>={}):Operation=>({path:'/api/v1/discovery/'+path,method,status:200,protected:false,...options});
const customer=(path:string,method:Method='get',options:Partial<Operation>={}):Operation=>({path:'/api/v1/customer/'+path,method,status:method==='post'?201:200,protected:true,...options});
/** Local contract generation fails if any owned operation or DTO is missing. */
export const M4_OPERATIONS:readonly Operation[]=[
 publicRoute('categories'),publicRoute('offerings','get',{paginated:true}),publicRoute('offerings/{id}'),publicRoute('offerings/{id}/availability','get',{paginated:true}),
 publicRoute('venues','get',{paginated:true}),publicRoute('venues/{id}'),publicRoute('venues/{id}/reviews','get',{paginated:true}),
 publicRoute('plans','get',{paginated:true}),publicRoute('plans/{id}/quote','post',{body:true}),
 ...['reservations','orders'].flatMap(resource=>[
  customer(resource,'get',{paginated:true}),customer(resource,'post',{body:true}),customer(resource+'/{id}'),
  customer(resource+'/{id}/cancellation','post'),customer(resource+'/{id}/review','put',{body:true}),
 ]),
 customer('profile'),customer('profile','patch',{body:true}),
 customer('wishlist','get',{paginated:true}),customer('wishlist/{id}','put'),customer('wishlist/{id}','delete'),
 customer('reviews','get',{paginated:true}),customer('reviews/{id}','delete'),
 customer('notifications','get',{paginated:true}),customer('notifications/unread-count'),customer('notifications/{id}/read','put'),
 customer('support','get',{paginated:true}),customer('support','post',{body:true}),customer('support/{id}'),
 customer('support/{id}/messages','get',{paginated:true}),customer('support/{id}/messages','post',{body:true}),customer('support/{id}/closure','put'),
 ...['public-profile','public-media','packages/{id}/public-options'].map(suffix=>({path:'/api/v1/businesses/{businessId}/branches/{branchId}/'+suffix,method:'put' as const,status:200,protected:true,body:true})),
];
