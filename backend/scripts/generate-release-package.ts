import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CommitCategory {
  features: string[];
  fixes: string[];
  database: string[];
  other: string[];
}

function generateReleasePasscode(version: string): string {
  const clean = version.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
  const h = crypto.createHash('sha256').update(`ZS_SECRET_KEY_${version}_2026_MASTER`).digest('hex').toUpperCase();
  return `ZS-UPD-${clean || '100'}-${h.substring(0, 4)}-${h.substring(4, 8)}`;
}

function extractGitChangelog(): { changelogMarkdown: string; commitCount: number } {
  try {
    const rawLogs = execSync('git log -n 40 --pretty=format:"%s"', { encoding: 'utf8', cwd: path.resolve(__dirname, '../..') });
    const lines = rawLogs.split('\n').map(l => l.trim()).filter(Boolean);

    const categories: CommitCategory = {
      features: [],
      fixes: [],
      database: [],
      other: [],
    };

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('feat') || lower.includes('feature') || lower.includes('add') || lower.includes('جديد')) {
        categories.features.push(line);
      } else if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('إصلاح') || lower.includes('حل مشكلة')) {
        categories.fixes.push(line);
      } else if (lower.includes('migration') || lower.includes('schema') || lower.includes('db') || lower.includes('قاعدة بيانات')) {
        categories.database.push(line);
      } else if (!lower.startsWith('merge') && !lower.startsWith('chore')) {
        categories.other.push(line);
      }
    }

    const sections: string[] = [];

    if (categories.features.length > 0) {
      sections.push('#### ✨ ميزات وتحسينات رئيسية:\n' + categories.features.slice(0, 8).map(f => `- ${f}`).join('\n'));
    }

    if (categories.fixes.length > 0) {
      sections.push('#### 🐛 إصلاحات واستقرار النظام:\n' + categories.fixes.slice(0, 8).map(f => `- ${f}`).join('\n'));
    }

    if (categories.database.length > 0) {
      sections.push('#### 🗄️ ترقيات قاعدة البيانات والأمان:\n' + categories.database.slice(0, 5).map(f => `- ${f}`).join('\n'));
    }

    if (sections.length === 0) {
      sections.push('#### 🚀 تحديثات عامة:\n- تحسينات عامة على أداء واستقرار النظام وترقية الواجهات.');
    }

    return {
      changelogMarkdown: sections.join('\n\n'),
      commitCount: lines.length,
    };
  } catch (err: any) {
    return {
      changelogMarkdown: '#### 🚀 تحديثات عامة:\n- تحسينات شاملة على تجربة المستخدم وسرعة استجابة النظام.',
      commitCount: 0,
    };
  }
}

async function main() {
  const targetVersion = process.argv[2] || '1.1.15';
  console.log('===================================================');
  console.log('🚀 Z-ERP Enterprise Release Generator');
  console.log(`📌 Target Version: ${targetVersion}`);
  console.log('===================================================');

  const { changelogMarkdown, commitCount } = extractGitChangelog();
  const passcode = generateReleasePasscode(targetVersion);

  console.log(`\n🔍 Parsed ${commitCount} recent commits from Git.`);
  console.log(`\n🔑 Generated Activation Passcode: \x1b[32m${passcode}\x1b[0m`);
  console.log(`\n📝 Auto-Generated Arabic Changelog:\n`);
  console.log(changelogMarkdown);
  console.log('\n===================================================');

  const manifest = {
    version: targetVersion,
    generatedAt: new Date().toISOString(),
    passcode: passcode,
    requiresPasscode: true,
    changelog: changelogMarkdown,
  };

  const outputDir = path.resolve(__dirname, '../runtime/releases');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, `manifest-${targetVersion}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ Release manifest saved to: ${manifestPath}`);
}

main().catch(console.error);
