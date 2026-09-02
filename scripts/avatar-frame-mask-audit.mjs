import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const frameRoot = join(root, 'public', 'cosmetics', 'avatar-frames');
const maskRoot = join(frameRoot, 'masks');
const frames = readdirSync(frameRoot).filter((name) => extname(name).toLowerCase() === '.webp').sort();
const errors = [];
const maskFiles = readdirSync(maskRoot).filter((name) => extname(name).toLowerCase() === '.png').sort();
for (const mask of maskFiles) {
  const data = readFileSync(join(maskRoot, mask));
  const size = data.length >= 26 && data.toString('ascii', 1, 4) === 'PNG'
    ? { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType:data[25] } : null;
  if (!size || size.width !== 512 || size.height !== 512) errors.push(`${mask}: mask must be 512x512`);
  if (size && size.colorType !== 6) errors.push(`${mask}: mask must carry an RGBA alpha channel`);
  if (data.length < 100) errors.push(`${mask}: mask is empty`);
}
for (const frame of frames) {
  const maskPath = join(maskRoot, frame.replace(/\.webp$/i, '.png'));
  if (!existsSync(maskPath)) { errors.push(`${frame}: missing derived portrait mask`); continue; }
  const data = readFileSync(maskPath);
  const size = data.length >= 26 && data.toString('ascii', 1, 4) === 'PNG'
    ? { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType:data[25] } : null;
  if (!size || size.width !== 512 || size.height !== 512) errors.push(`${frame}: derived mask must be 512x512`);
  if (size && size.colorType !== 6) errors.push(`${frame}: derived mask must carry an RGBA alpha channel`);
  if (data.length < 100) errors.push(`${frame}: derived mask is empty`);
}
if (!frames.length) errors.push('no Avatar Frame WebP assets found');
if (errors.length) { console.error(`AVATAR_FRAME_MASK_AUDIT FAILED\n${errors.map((e) => `- ${e}`).join('\n')}`); process.exitCode = 1; }
else console.log(`AVATAR_FRAME_MASK_AUDIT OK · ${frames.length} frames · ${maskFiles.length} RGBA masks present`);
