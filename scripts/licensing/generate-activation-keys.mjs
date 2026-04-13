import { generateKeyPairSync } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const outDir = path.resolve(process.argv[2] || './keys');
mkdirSync(outDir, { recursive: true });
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
writeFileSync(path.join(outDir, 'activation-public.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
writeFileSync(path.join(outDir, 'activation-private.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
console.log(`Generated activation keys in ${outDir}`);
