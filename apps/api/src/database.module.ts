import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from './tokens';
@Global()
@Module({providers:[{provide:DATABASE_POOL,useFactory:()=>new Pool({connectionString:process.env.FAJI_DATABASE_URL,max:10,connectionTimeoutMillis:3000,idleTimeoutMillis:30000})}],exports:[DATABASE_POOL]})
export class DatabaseModule {}
