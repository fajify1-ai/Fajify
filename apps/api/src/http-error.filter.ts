import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request,Response } from 'express';
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
 private readonly logger=new Logger(HttpErrorFilter.name);
 catch(error: unknown,host: ArgumentsHost){
  const http=host.switchToHttp(),req=http.getRequest<Request & {correlationId?:string}>(),res=http.getResponse<Response>();
  const status=error instanceof HttpException?error.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
  const response=error instanceof HttpException?error.getResponse():undefined;
  const detail=typeof response==='string'?response:typeof response==='object'&&response!==null&&'message'in response?(response as {message:unknown}).message:undefined;
  if(status>=500)this.logger.error(JSON.stringify({event:'request_failed',requestId:req.correlationId,status,method:req.method,path:req.originalUrl}));
  res.status(status).json({error:{code:status>=500?'INTERNAL_ERROR':status===400?'VALIDATION_ERROR':status===401?'UNAUTHORIZED':status===403?'FORBIDDEN':'HTTP_ERROR',message:status>=500?'Internal server error':detail??'Request failed',requestId:req.correlationId??'unknown'}});
 }
}
