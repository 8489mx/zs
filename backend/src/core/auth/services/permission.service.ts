import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionService {
  hasAllPermissions(granted: string[], required: string[]): boolean {
    if (!required || required.length === 0) {
      return true;
    }

    const grantedSet = new Set(granted);
    return required.every((item) => grantedSet.has(item));
  }

  hasAnyPermission(granted: string[], required: string[]): boolean {
    if (!required || required.length === 0) {
      return true;
    }

    const grantedSet = new Set(granted);
    return required.some((item) => grantedSet.has(item));
  }
}
