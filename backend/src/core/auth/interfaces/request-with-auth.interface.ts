import type { Request } from 'express';
import type { AuthContext } from './auth-context.interface';

export interface RequestWithAuth extends Request {
  authContext?: AuthContext;
}
