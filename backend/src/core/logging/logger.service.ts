import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger, LoggerOptions } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    const options: LoggerOptions = {
      level: process.env.LOG_LEVEL ?? 'info',
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
    };

    this.logger = pino(options);
  }

  log(message: string, ...optionalParams: unknown[]): void {
    this.logger.info({ context: optionalParams }, message);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error({ context: optionalParams }, typeof message === 'string' ? message : 'error');
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    this.logger.warn({ context: optionalParams }, message);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    this.logger.debug({ context: optionalParams }, message);
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    this.logger.trace({ context: optionalParams }, message);
  }

  getPino(): Logger {
    return this.logger;
  }
}
