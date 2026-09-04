import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { Kysely } from 'kysely';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import AdmZip from 'adm-zip';

export interface UploadDiagnosticDto {
  clientName: string;
  clientIdentifier: string;
  appVersion?: string;
  logPeriod?: string;
}

@Injectable()
export class SaasDiagnosticsService {
  private readonly logger = new Logger(SaasDiagnosticsService.name);

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async saveUploadedDiagnosticBundle(file: Express.Multer.File, meta: UploadDiagnosticDto) {
    const clientName = (meta.clientName || 'عميل غير محدد').trim();
    const clientIdentifier = (meta.clientIdentifier || 'unknown-client').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const appVersion = (meta.appVersion || '1.0.0').trim();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const logPeriod = (meta.logPeriod || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`).trim();

    // 1. Prepare storage directory
    const baseStorageDir = path.join(process.cwd(), 'storage', 'diagnostics', clientIdentifier);
    await fs.mkdir(baseStorageDir, { recursive: true });

    const fileName = `${Date.now()}_${logPeriod}_diagnostics.zip`;
    const targetFilePath = path.join(baseStorageDir, fileName);

    // Write file to disk
    await fs.writeFile(targetFilePath, file.buffer);

    // 2. Analyze zip in memory to extract errors & 500 count
    let errorCount500 = 0;
    const errorSamples: string[] = [];

    try {
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (entry.entryName.includes('system-errors.log') || entry.entryName.includes('backend.log')) {
          const content = entry.getData().toString('utf8');
          const lines = content.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            if (line.includes('500') || line.includes('"level":50')) {
              errorCount500++;
              if (errorSamples.length < 5) {
                try {
                  const parsed = JSON.parse(line);
                  const msg = parsed.context ? JSON.stringify(parsed.context) : (parsed.msg || 'error');
                  errorSamples.push(`${parsed.time || ''} : ${msg}`);
                } catch {
                  errorSamples.push(line.slice(0, 150));
                }
              }
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to inspect zip contents: ${err}`);
    }

    // 3. Save to database
    const inserted = await this.db
      .insertInto('saas_client_diagnostics')
      .values({
        client_name: clientName,
        client_identifier: clientIdentifier,
        app_version: appVersion,
        log_period: logPeriod,
        error_count_500: errorCount500,
        error_summary: JSON.stringify({ samples: errorSamples, totalDetected: errorCount500 }),
        file_path: targetFilePath,
        file_size_bytes: file.size,
      })
      .returning(['id', 'client_name', 'log_period', 'error_count_500'])
      .executeTakeFirstOrThrow();

    // 4. Send webhook alert if errorCount500 > 0
    if (errorCount500 > 0) {
      this.dispatchWebhookAlert({
        clientName,
        clientIdentifier,
        appVersion,
        logPeriod,
        errorCount500,
        samples: errorSamples,
      });
    }

    return {
      success: true,
      id: Number(inserted.id),
      clientName: inserted.client_name,
      logPeriod: inserted.log_period,
      errorCount500: inserted.error_count_500,
    };
  }

  async listDiagnostics(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const offset = (page - 1) * limit;

    let baseQuery = this.db.selectFrom('saas_client_diagnostics');

    if (query.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      baseQuery = baseQuery.where((eb: any) =>
        eb.or([
          eb('client_name', 'ilike', s),
          eb('client_identifier', 'ilike', s),
          eb('log_period', 'ilike', s),
        ]),
      );
    }

    const totalRes = await baseQuery
      .select((eb: any) => eb.fn.count('id').as('total'))
      .executeTakeFirst();
    const total = Number((totalRes as any)?.total || 0);

    const rows = await baseQuery
      .selectAll()
      .orderBy('uploaded_at', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return {
      data: rows.map((r: any) => ({
        id: Number(r.id),
        clientName: r.client_name,
        clientIdentifier: r.client_identifier,
        appVersion: r.app_version,
        logPeriod: r.log_period,
        errorCount500: Number(r.error_count_500 || 0),
        errorSummary: typeof r.error_summary === 'string' ? JSON.parse(r.error_summary) : r.error_summary,
        fileSizeBytes: Number(r.file_size_bytes || 0),
        uploadedAt: r.uploaded_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDiagnosticFile(id: number) {
    const row = await this.db
      .selectFrom('saas_client_diagnostics')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException('السجل التشخيصي غير موجود');
    }

    if (!fsSync.existsSync(row.file_path)) {
      throw new NotFoundException('ملف السجل غير متوفر على السيرفر (قد يكون تم حذفه)');
    }

    const safeName = `${row.client_name.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_')}_${row.log_period}_diagnostics.zip`;
    return {
      filePath: row.file_path,
      fileName: safeName,
      fileSizeBytes: Number(row.file_size_bytes || 0),
    };
  }

  async deleteDiagnostic(id: number) {
    const row = await this.db
      .selectFrom('saas_client_diagnostics')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) {
      throw new NotFoundException('السجل غير موجود');
    }

    try {
      if (fsSync.existsSync(row.file_path)) {
        await fs.unlink(row.file_path);
      }
    } catch {
      // ignore
    }

    await this.db
      .deleteFrom('saas_client_diagnostics')
      .where('id', '=', id)
      .execute();

    return { success: true, message: 'تم حذف السجل بنجاح' };
  }

  private dispatchWebhookAlert(payload: {
    clientName: string;
    clientIdentifier: string;
    appVersion: string;
    logPeriod: string;
    errorCount500: number;
    samples: string[];
  }) {
    // 1. Direct Telegram Bot notification
    const telegramToken =
      process.env.TELEGRAM_BOT_TOKEN?.trim() || '8654604814:AAE4kT0_AlTsmVe_2mu17_-g_lpWy3nqtac';
    const telegramChatId =
      process.env.TELEGRAM_CHAT_ID?.trim() || '6553830927';

    if (telegramToken && telegramChatId) {
      try {
        const sampleText =
          payload.samples.length > 0
            ? `\n\n🔍 *أمثلة من الأخطاء:*\n\`\`\`\n${payload.samples.slice(0, 3).join('\n')}\n\`\`\``
            : '';

        const telegramText =
          `🚨 *تقرير تشخيصي يحتوي على أخطاء من عميل!*\n\n` +
          `🏢 *العميل:* ${payload.clientName}\n` +
          `🆔 *المعرف:* \`${payload.clientIdentifier}\`\n` +
          `📦 *الإصدار:* \`${payload.appVersion}\`\n` +
          `📅 *فترة التقرير:* \`${payload.logPeriod}\`\n` +
          `⚠️ *عدد أخطاء 500:* *${payload.errorCount500}*\n` +
          `⏰ *التوقيت:* ${new Date().toLocaleString('ar-EG')}${sampleText}\n\n` +
          `🔗 [فتح لوحة الساس للمعاينة](https://92-5-178-54.sslip.io/saas-admin/diagnostics)`;

        fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramText,
            parse_mode: 'Markdown',
          }),
        }).catch((err) => this.logger.warn(`Failed to send Telegram alert: ${err?.message}`));
      } catch {
        // non-blocking
      }
    }

    // 2. Generic Webhook (Discord / Slack / Custom)
    const webhookUrl = process.env.CRITICAL_ALERT_WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const sampleText =
          payload.samples.length > 0
            ? `\n**أمثلة من الأخطاء:**\n\`\`\`\n${payload.samples.slice(0, 3).join('\n')}\n\`\`\``
            : '';
        const content = `🚨 **تقرير تشخيصي يحتوي على أخطاء من عميل!**\n- **العميل:** ${payload.clientName}\n- **المعرف:** \`${payload.clientIdentifier}\`\n- **الإصدار:** \`${payload.appVersion}\`\n- **فترة التقرير:** \`${payload.logPeriod}\`\n- **عدد أخطاء 500:** **${payload.errorCount500}**${sampleText}\n- **التوقيت:** ${new Date().toISOString()}`;

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }).catch(() => undefined);
      } catch {
        // non-blocking
      }
    }
  }
}
