import { execFileSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';

// Alternative pour les dossiers synchronisés que BuildKit ne parvient pas à lire.
// Git fournit uniquement la liste des sources ; leur contenu courant est conservé.
const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = realpathSync(tmpdir());
const staging = mkdtempSync(join(temporaryRoot, 'virtualoffice-build-'));
const sources = join(staging, 'sources');
const docker = args => execFileSync('docker', ['compose', ...args], { cwd: root, stdio: 'inherit' });

try {
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    if (!/^(client\/|server\/|package\.json$|package-lock\.json$|\.dockerignore$)/.test(file)) continue;
    if (file.split('/').some(part => part.startsWith('.env') ||
      ['node_modules', 'dist', 'test-results', 'playwright-report', 'generated'].includes(part))) continue;
    const target = resolve(sources, file);
    if (!target.startsWith(sources + sep)) throw new Error('Chemin de source hors du dossier temporaire.');
    let bytes;
    try { bytes = readFileSync(join(root, file)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; } // Suppression locale non commitée.
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  const override = join(staging, 'build.json');
  writeFileSync(override, JSON.stringify({ services: {
    frontend: { build: { context: sources } }, backend: { build: { context: sources } },
  } }));
  console.log('Construction depuis une copie temporaire des sources, sans les fichiers .env.');
  docker(['-f', join(root, 'docker-compose.yml'), '-f', override, '--progress', 'plain', 'build']);
  docker(['up', '--no-build', '-d', '--wait', '--wait-timeout', '120']);
} finally {
  const checked = realpathSync(staging);
  if (dirname(checked) !== temporaryRoot || !checked.startsWith(join(temporaryRoot, 'virtualoffice-build-'))) {
    throw new Error('Nettoyage refusé : dossier temporaire inattendu.');
  }
  rmSync(checked, { recursive: true, force: true });
}
