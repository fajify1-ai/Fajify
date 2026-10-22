import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { DATABASE_POOL } from './tokens';
class LiveStatus { status!: string; service!: string; }
class ReadyStatus { status!: string; database!: string; }
@ApiTags('health')
@Controller({path:'health',version:'1'})
export class HealthController {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 @Get() @ApiOperation({summary:'Liveness - no dependencies'}) @ApiResponse({status:200,type:LiveStatus})
 check():LiveStatus {return {status:'ok',service:'faji-api'};}
 @Get('ready') @ApiOperation({summary:'Readiness - application database'}) @ApiResponse({status:200,type:ReadyStatus}) @ApiResponse({status:503,description:'Application database unavailable'})
 async ready():Promise<ReadyStatus>{
  try { await this.pool.query('SELECT 1'); return {status:'ready',database:'ok'}; }
  catch { throw new ServiceUnavailableException('Database unavailable'); }
 }
}
