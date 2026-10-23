import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {INestApplication} from '@nestjs/common';
import {HealthController} from '../src/health.controller';
import {DATABASE_POOL} from '../src/tokens';
import {setupApi} from '../src/main';
async function fixture(databaseAvailable:boolean):Promise<INestApplication>{
 const module=await Test.createTestingModule({controllers:[HealthController],providers:[{provide:DATABASE_POOL,useValue:{query:async()=>{if(!databaseAvailable)throw new Error('offline');return {rows:[]};}}}]}).compile();
 const app=module.createNestApplication();setupApi(app);await app.init();return app;
}
test('versioned liveness and request ID',async()=>{const app=await fixture(true);try{const r=await request(app.getHttpServer()).get('/api/v1/health').set('x-request-id','test_123');assert.equal(r.status,200);assert.equal(r.headers['x-request-id'],'test_123');assert.equal(r.body.status,'ok');}finally{await app.close();}});
test('readiness 503 hides internal database errors',async()=>{const app=await fixture(false);try{const r=await request(app.getHttpServer()).get('/api/v1/health/ready');assert.equal(r.status,503);assert.equal(r.body.error.code,'SERVICE_UNAVAILABLE');assert.ok(!JSON.stringify(r.body).includes('offline'));}finally{await app.close();}});
test('readiness succeeds with healthy database',async()=>{const app=await fixture(true);try{const r=await request(app.getHttpServer()).get('/api/v1/health/ready');assert.equal(r.status,200);assert.equal(r.body.database,'ok');}finally{await app.close();}});
test('unknown route returns versioned error envelope',async()=>{const app=await fixture(true);try{const r=await request(app.getHttpServer()).get('/api/v1/unknown');assert.equal(r.status,404);assert.equal(r.body.error.code,'NOT_FOUND');}finally{await app.close();}});
