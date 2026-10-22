import { Controller,Get,Inject,ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation,ApiTags } from '@nestjs/swagger';
import { Pool } from 'pg';
import { DATABASE_POOL } from './tokens';
@ApiTags('health')
@Controller('health')
export class HealthController {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 @Get() @ApiOperation({summary:'Liveness - no dependencies'}) check(){return {status:'ok',service:'faji-api'};}
 @Get('ready') @ApiOperation({summary:'Readiness - application database'}) async ready(){
  try { await this.pool.query('SELECT 1');return {status:'ready',database:'ok'}; }
  catch {throw new ServiceUnavailableException('Database unavailable');}
 }
}
