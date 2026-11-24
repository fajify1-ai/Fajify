/** Public delivery workflows are deferred; TOTP and recovery codes remain active. */
export function requiresDeferredDelivery(pathname:string){
 let path:string;try{path=decodeURIComponent(pathname).replace(/\/+$/,'');}catch{return true;}
 return /\/api\/auth\/(?:phone-number\/|two-factor\/(?:send-otp|verify-otp)$|(?:request-password-reset|reset-password|change-email)$)/.test(path);
}
