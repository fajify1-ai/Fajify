import { Global, Module, OnApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from './tokens';
@Injectable()
class DatabaseShutdown implements OnApplicationShutdown {
 constructor(@Inject(DATABASE_POOL) private readonly pool:Pool){}
 async onApplicationShutdown(){await this.pool.end();}
}
@Global()
@Module({providers:[
 {provide:DATABASE_POOL,useFactory:()=>new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:10,connectionTimeoutMillis:3000,idleTimeoutMillis:30000,statement_timeout:5000,query_timeout:6000})},
 DatabaseShutdown
],exports:[DATABASE_POOL]})
export class DatabaseModule {}
