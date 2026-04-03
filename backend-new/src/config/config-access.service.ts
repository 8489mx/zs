import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigAccessService {
  constructor(private readonly configService: ConfigService) {}

  getAppPort(): number {
    return this.configService.getOrThrow<number>('app.port');
  }

  getAppHost(): string {
    return this.configService.getOrThrow<string>('app.host');
  }
}
