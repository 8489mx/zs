import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  tenantId?: string;
  status: JobStatus;
  progress: number;
  result?: any;
  error?: string;
  attempts: number;
  maxRetries: number;
  runAt: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface EnqueueOptions {
  tenantId?: string;
  maxRetries?: number;
  delayMs?: number;
  priority?: number;
}

export type JobHandler<T = any, R = any> = (job: Job<T>) => Promise<R>;

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly jobs = new Map<string, Job>();
  private readonly handlers = new Map<string, JobHandler>();
  private processInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private readonly concurrencyLimit = 5;
  private activeWorkers = 0;

  onModuleInit() {
    // Process due jobs every 1000ms
    this.processInterval = setInterval(() => {
      void this.processNextBatch();
    }, 1000);
    this.logger.log('JobQueueService initialized with interval loop');
  }

  onModuleDestroy() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  /**
   * Register an asynchronous task processor
   */
  registerHandler<T = any, R = any>(type: string, handler: JobHandler<T, R>) {
    this.handlers.set(type, handler);
    this.logger.log(`Registered job handler for: ${type}`);
  }

  /**
   * Enqueue a new background task
   */
  async enqueue<T = any>(type: string, payload: T, options?: EnqueueOptions): Promise<Job<T>> {
    const id = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const delayMs = options?.delayMs || 0;

    const job: Job<T> = {
      id,
      type,
      payload,
      tenantId: options?.tenantId,
      status: 'queued',
      progress: 0,
      attempts: 0,
      maxRetries: options?.maxRetries ?? 3,
      runAt: Date.now() + delayMs,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.jobs.set(id, job);
    this.logger.log(`Enqueued job ${id} [${type}] scheduled in ${delayMs}ms`);

    // Kick processor immediately if not busy
    setImmediate(() => {
      void this.processNextBatch();
    });

    return job;
  }

  /**
   * Get job by ID
   */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /**
   * List recent jobs for a tenant
   */
  listJobs(tenantId?: string, limit = 50): Job[] {
    const list = Array.from(this.jobs.values());
    const filtered = tenantId ? list.filter(j => j.tenantId === tenantId) : list;
    return filtered
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Process due jobs up to concurrency limit
   */
  private async processNextBatch(): Promise<void> {
    if (this.isProcessing || this.activeWorkers >= this.concurrencyLimit) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const eligibleJobs = Array.from(this.jobs.values())
        .filter(j => j.status === 'queued' && j.runAt <= now)
        .slice(0, this.concurrencyLimit - this.activeWorkers);

      for (const job of eligibleJobs) {
        this.executeJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private executeJob(job: Job): void {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      job.updatedAt = Date.now();
      this.logger.error(`Cannot process job ${job.id}: ${job.error}`);
      return;
    }

    job.status = 'running';
    job.attempts++;
    job.updatedAt = Date.now();
    this.activeWorkers++;

    handler(job)
      .then((result) => {
        job.status = 'completed';
        job.progress = 100;
        job.result = result;
        job.completedAt = Date.now();
        job.updatedAt = Date.now();
        this.logger.log(`Job ${job.id} [${job.type}] completed successfully`);
      })
      .catch((err: any) => {
        const errorMsg = err?.message || String(err);
        this.logger.warn(`Job ${job.id} [${job.type}] attempt ${job.attempts} failed: ${errorMsg}`);

        if (job.attempts < job.maxRetries) {
          // Exponential backoff retry: 2s, 4s, 8s...
          const backoffDelay = Math.pow(2, job.attempts) * 1000;
          job.status = 'queued';
          job.runAt = Date.now() + backoffDelay;
          job.updatedAt = Date.now();
          this.logger.log(`Job ${job.id} will retry in ${backoffDelay}ms`);
        } else {
          job.status = 'failed';
          job.error = errorMsg;
          job.updatedAt = Date.now();
          this.logger.error(`Job ${job.id} permanently failed after ${job.attempts} attempts`);
        }
      })
      .finally(() => {
        this.activeWorkers--;
        // Check next job
        void this.processNextBatch();
      });
  }
}
