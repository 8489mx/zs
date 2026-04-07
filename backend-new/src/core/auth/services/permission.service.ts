import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionService {
  hasAllPermissions(granted: string[], required: string[]): boolean {
    if (required.length === 0) {
      return true;
    }

    const grantedSet = new Set(granted);
    return required.every((item) => grantedSet.has(item));
  }
}
