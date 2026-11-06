import {BadRequestException,CanActivate,ExecutionContext,Injectable} from '@nestjs/common';
@Injectable()
export class AdminEmptyBodyGuard implements CanActivate{
 canActivate(ctx:ExecutionContext):boolean{
  const body=ctx.switchToHttp().getRequest<{body?:unknown}>().body;
  if(body!==undefined&&body!==null&&(typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==0))
   throw new BadRequestException('This administrative command accepts no body');
  return true;
 }
}
