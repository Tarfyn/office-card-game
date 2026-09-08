import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localJsonPersistence } from '../server/storage/local-json.mjs';

const root = mkdtempSync(join(tmpdir(), 'ocg-f08-'));
try {
  const validateRoom = (v) => v && v.version === 1 && Array.isArray(v.rooms);
  const missingPath = join(root, 'missing.json');
  const missing = localJsonPersistence(missingPath, 'ROOM_STORAGE', { validate: validateRoom });
  assert.equal(missing.load(), null); assert.equal(missing.getLoadState().status, 'MISSING');
  missing.save({ version:1, rooms:[] }); assert.equal(missing.getLoadState().status, 'OK');

  const corruptPath = join(root, 'corrupt.json');
  writeFileSync(corruptPath, '{"version":1', 'utf8');
  const corrupt = localJsonPersistence(corruptPath, 'ROOM_STORAGE', { validate: validateRoom });
  assert.equal(corrupt.load(), null); assert.deepEqual(corrupt.getLoadState(), { status:'CORRUPT', reason:'JSON_INVALID' });
  const before = readFileSync(corruptPath, 'utf8');
  assert.throws(() => corrupt.save({ version:1, rooms:[] }), /ROOM_STORAGE_UNAVAILABLE/);
  assert.equal(readFileSync(corruptPath, 'utf8'), before);
  const restarted = localJsonPersistence(corruptPath, 'ROOM_STORAGE', { validate: validateRoom }); restarted.load();
  assert.equal(restarted.getLoadState().status, 'CORRUPT');

  const invalidPath = join(root, 'invalid.json'); writeFileSync(invalidPath, '[]', 'utf8');
  const invalid = localJsonPersistence(invalidPath, 'MATCHMAKING_STORAGE', { validate:(v) => v && v.version === 1 && Array.isArray(v.tickets) });
  assert.equal(invalid.load(), null); assert.deepEqual(invalid.getLoadState(), { status:'CORRUPT', reason:'SNAPSHOT_STRUCTURE_INVALID' });

  const ioDir = join(root, 'io-dir'); mkdirSync(ioDir);
  const io = localJsonPersistence(ioDir, 'ROOM_STORAGE'); io.load();
  assert.equal(io.getLoadState().status, 'IO_ERROR');
  console.log('F08 storage corruption: PASS');
} finally { rmSync(root, { recursive:true, force:true }); }
