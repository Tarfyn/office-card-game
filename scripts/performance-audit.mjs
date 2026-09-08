import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes:true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) files.push(path);
  }
}
walk(root);
const metrics = files.map(path => {
  const data = readFileSync(path);
  return { path: relative(root, path).replaceAll('\\','/'), bytes:data.length, gzipBytes:gzipSync(data).length, brotliBytes:brotliCompressSync(data).length };
}).sort((a,b) => b.bytes-a.bytes);
const js = metrics.filter(f => f.path.endsWith('.js'));
const css = metrics.filter(f => f.path.endsWith('.css'));
const shell = metrics.filter(f => /^(app\.js|styles\.css)$/.test(f.path));
const report = { generatedAt:new Date().toISOString(), assets:metrics, javascript:js.reduce((a,f)=>({bytes:a.bytes+f.bytes,gzipBytes:a.gzipBytes+f.gzipBytes,brotliBytes:a.brotliBytes+f.brotliBytes}),{bytes:0,gzipBytes:0,brotliBytes:0}), css:css.reduce((a,f)=>({bytes:a.bytes+f.bytes,gzipBytes:a.gzipBytes+f.gzipBytes,brotliBytes:a.brotliBytes+f.brotliBytes}),{bytes:0,gzipBytes:0,brotliBytes:0}), initialShell:shell, largestAssets:metrics.slice(0,10), browserTiming:'UNAVAILABLE_WITHOUT_BROWSER_RUN', domCounts:'UNAVAILABLE_WITHOUT_BROWSER_RUN' };
writeFileSync('performance-audit.json', JSON.stringify(report, null, 2));
console.log(`PERFORMANCE_AUDIT_OK JS=${report.javascript.bytes} CSS=${report.css.bytes} largest=${report.largestAssets[0]?.path ?? 'none'}`);
