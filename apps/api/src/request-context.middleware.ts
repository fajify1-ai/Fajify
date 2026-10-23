import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
 use(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && /^[a-zA-Z0-9_-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  (req as Request & { correlationId: string }).correlationId=id;
  res.setHeader('x-request-id',id);
  next();
 }
}
