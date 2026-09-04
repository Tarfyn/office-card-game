import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const errors = [];

function webpSize(data) {
  if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') return null;
  if (data.toString('ascii', 12, 16) !== 'VP8X') return null;
  return { width:1 + data.readUIntLE(24, 3), height:1 + data.readUIntLE(27, 3), alpha:Boolean(data[20] & 0x10) };
}

function checkSet(folder, files, expected, label) {
  for (const file of files) {
    const path = join(root, 'public', 'cosmetics', folder, file);
    if (!existsSync(path)) { errors.push(`${label}/${file}: missing`); continue; }
    const size = webpSize(readFileSync(path));
    if (!size) { errors.push(`${label}/${file}: invalid WebP`); continue; }
    if (size.width !== expected.width || size.height !== expected.height) errors.push(`${label}/${file}: expected ${expected.width}x${expected.height}, got ${size.width}x${size.height}`);
    if (expected.alpha && !size.alpha) errors.push(`${label}/${file}: transparent alpha channel required`);
  }
}

checkSet('card-backs', [
  'default-corporate.webp', 'alpha-back.webp', 'ranked-season-1.webp',
  'customer-service-department.webp', 'it-department.webp'
], { width:900, height:1260, alpha:true }, 'card-backs');
checkSet('badges', [
  'reply-all-survivor.webp', 'coffee-powered.webp', 'meeting-survivor.webp',
  'ticket-closer.webp', 'inbox-zero.webp', 'escalation-specialist.webp'
], { width:256, height:256, alpha:true }, 'badges');

const silverPath = join(root, 'public', 'cosmetics', 'avatar-frames', 'silver-ranked-s01.webp');
if (!existsSync(silverPath)) errors.push('avatar-frames/silver-ranked-s01.webp: missing replacement frame');
else {
  const size = webpSize(readFileSync(silverPath));
  if (!size || size.width !== size.height) errors.push('avatar-frames/silver-ranked-s01.webp: replacement frame must be square WebP');
  if (size && !size.alpha) errors.push('avatar-frames/silver-ranked-s01.webp: transparent alpha channel required');
}

if (errors.length) {
  console.error(`COSMETIC_ASSET_AUDIT FAILED\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}
console.log('COSMETIC_ASSET_AUDIT OK · 5 card backs · 6 badges · replacement Silver frame');
