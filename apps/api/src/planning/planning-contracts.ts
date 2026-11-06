export const M6_OPERATIONS=[
 {path:'/api/v1/plans',method:'post',body:true,status:201},
 {path:'/api/v1/plans',method:'get',body:false,status:200,paginated:true},
 {path:'/api/v1/plans/{id}',method:'get',body:false,status:200},
 {path:'/api/v1/plans/{id}',method:'put',body:true,status:200},
 {path:'/api/v1/plans/{id}/archive',method:'post',body:false,status:201},
 {path:'/api/v1/plans/{id}/recommendations',method:'get',body:false,status:200},
 {path:'/api/v1/plans/{id}/feedback',method:'post',body:true,status:201},
 {path:'/api/v1/plans/{id}/feedback',method:'get',body:false,status:200},
 {path:'/api/v1/plans/{id}/booking-holds',method:'post',body:true,status:201}
] as const;
