import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = new URL('../.env', import.meta.url);
const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
let content = existsSync(target) ? readFileSync(target, 'utf8') : example;

for (const key of ['JWT_SECRET', 'DEMO_PASSWORD', 'JWT_TTL_HOURS']) {
  const line = new RegExp(`^${key}=([^\\r\\n]*)`, 'm');
  const match = content.match(line);
  if (match && match[1].trim() && match[1].trim() !== '""' && match[1].trim() !== "''") continue;
  const value = key === 'JWT_SECRET'
    ? randomBytes(48).toString('hex')
    : example.match(new RegExp(`^${key}=(.+)$`, 'm'))[1].trim();
  content = match ? content.replace(line, `${key}=${value}`) : `${content.trimEnd()}\n${key}=${value}\n`;
}

writeFileSync(target, content, { mode: 0o600 });
console.log('.env prêt. Les valeurs existantes sont conservées et le secret JWT reste privé.');
