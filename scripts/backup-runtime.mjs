import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
const runtime=resolve(process.env.RUNTIME_DIR ?? new URL("../runtime/", import.meta.url).pathname);
const backupRoot=resolve(process.env.BACKUP_DIR ?? join(runtime,"backups"));
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const target=join(backupRoot,stamp);
mkdirSync(target,{recursive:true});
let copied=0;
if (existsSync(runtime)) for (const name of readdirSync(runtime)) {
  const source=join(runtime,name); if (source.startsWith(backupRoot) || name==="backups") continue;
  if (statSync(source).isFile() && name.endsWith(".json")) { cpSync(source,join(target,name)); copied++; }
}
writeFileSync(join(target,"backup.json"),JSON.stringify({createdAt:new Date().toISOString(),runtimeDir:runtime,files:copied},null,2));
console.log(`Runtime backup created: ${target} · ${copied} JSON files`);
