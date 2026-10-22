import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {DocumentBuilder,SwaggerModule} from '@nestjs/swagger';
import {ValidationPipe,VersioningType} from '@nestjs/common';
import {AppModule} from './app.module';
import {HttpErrorFilter} from './http-error.filter';
export function setupApi(app:import('@nestjs/common').INestApplication){
 app.setGlobalPrefix('api');
 app.enableVersioning({type:VersioningType.URI,defaultVersion:'1'});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:false}}));
 app.useGlobalFilters(new HttpErrorFilter());
}
export function apiDocument(app:import('@nestjs/common').INestApplication){
 return SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Faji API').setDescription('Faji server-authoritative API v1').setVersion('1.0.0').addBearerAuth({type:'http',scheme:'bearer',bearerFormat:'JWT'},'keycloak').build());
}
async function bootstrap(){
 const app=await NestFactory.create(AppModule,{bufferLogs:true});
 setupApi(app);
 if(process.env.NODE_ENV!=='production') SwaggerModule.setup('api/docs',app,apiDocument(app));
 app.enableShutdownHooks();
 await app.listen(Number(process.env.PORT??3001),'0.0.0.0');
}
if(require.main===module)bootstrap().catch(e=>{console.error('API bootstrap failed',e instanceof Error?e.message:'unknown');process.exitCode=1;});
