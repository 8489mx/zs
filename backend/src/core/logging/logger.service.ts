import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger, LoggerOptions } from 'pino';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    const options: LoggerOptions = {
      level: process.env.LOG_LEVEL ?? 'info',
      base: undefined,
      timestamp: pino.stdTimeFunctions.isoTime,
    };
    const isElectron = process.env.APP_MODE === 'SELF_CONTAINED';
    let baseDir = process.cwd();
    // If running in development inside the backend folder, point to the parent root 'errors' folder
    if (baseDir.endsWith('backend') && !isElectron) {
      baseDir = path.join(baseDir, '..');
    }
    const logFilePath = path.join(baseDir, 'errors', 'system-errors.log');
    const transport = pino.transport({
      targets: [
        {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
          level: process.env.LOG_LEVEL || 'info',
        },
        {
          target: 'pino/file',
          options: { destination: logFilePath, mkdir: true },
          level: 'warn', // Only log warnings and errors to the file
        },
      ],
    });

    this.logger = pino(options, transport);
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
