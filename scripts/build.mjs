import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function runTypeScript() {
  const localTsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const command = existsSync(localTsc) ? process.execPath : (process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  const args = existsSync(localTsc) ? [localTsc, '-p', 'tsconfig.json'] : ['-p', 'tsconfig.json'];
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function copyData() {
  mkdirSync(join(dist, 'data', 'formats'), { recursive: true });
  mkdirSync(join(dist, 'data', 'ranked'), { recursive: true });
  copyFileSync(join(root, 'data', 'cards.json'), join(dist, 'data', 'cards.json'));
  copyFileSync(join(root, 'data', 'decks.json'), join(dist, 'data', 'decks.json'));
  copyFileSync(join(root, 'data', 'economy.json'), join(dist, 'data', 'economy.json'));
  copyFileSync(join(root, 'data', 'match-settings.json'), join(dist, 'data', 'match-settings.json'));
  copyFileSync(join(root, 'data', 'achievements.json'), join(dist, 'data', 'achievements.json'));
  copyFileSync(join(root, 'data', 'ranked', 'ranks.json'), join(dist, 'data', 'ranked', 'ranks.json'));
  copyFileSync(join(root, 'data', 'ranked', 'seasons.json'), join(dist, 'data', 'ranked', 'seasons.json'));
  copyFileSync(join(root, 'data', 'artwork.json'), join(dist, 'data', 'artwork.json'));
  for (const name of readdirSync(join(root, 'data', 'formats'))) {
    if (!name.endsWith('.json')) continue;
    copyFileSync(join(root, 'data', 'formats', name), join(dist, 'data', 'formats', name));
  }
}

rmSync(dist, { recursive: true, force: true });
runTypeScript();
copyData();
const maskAudit = spawnSync(process.execPath, ['scripts/avatar-frame-mask-audit.mjs'], { cwd: root, stdio: 'inherit' });
if (maskAudit.status !== 0) process.exit(maskAudit.status ?? 1);
console.log('Build complete: dist/');
