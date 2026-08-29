import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cards=JSON.parse(readFileSync(join(root,'data','cards.json'),'utf8'));
const artworkConfig=JSON.parse(readFileSync(join(root,'data','artwork.json'),'utf8'));
const focusByCard=artworkConfig.focusByCard??{};
const artRoot=join(root,'public','art');
const write=process.argv.includes('--write');
const strictMissing=process.argv.includes('--strict-missing');
const supported=new Set(['.png','.webp','.jpg','.jpeg']);
const targetRatio=16/9;
const ratioTolerance=0.012;

function pngSize(buffer){ if(buffer.length<24 || buffer.toString('ascii',1,4)!=='PNG') return null; return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}; }
function jpegSize(buffer){ let i=2; while(i+9<buffer.length){ if(buffer[i]!==0xff){i++;continue;} const marker=buffer[i+1]; const len=buffer.readUInt16BE(i+2); if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return {height:buffer.readUInt16BE(i+5),width:buffer.readUInt16BE(i+7)}; i+=2+Math.max(2,len); } return null; }
function webpSize(buffer){
  if(buffer.length<30 || buffer.toString('ascii',0,4)!=='RIFF' || buffer.toString('ascii',8,12)!=='WEBP') return null;
  const kind=buffer.toString('ascii',12,16);
  if(kind==='VP8X') return {width:1+buffer.readUIntLE(24,3),height:1+buffer.readUIntLE(27,3)};
  if(kind==='VP8L' && buffer[20]===0x2f){ const b1=buffer[21],b2=buffer[22],b3=buffer[23],b4=buffer[24]; return {width:1+(((b2&0x3f)<<8)|b1),height:1+(((b4&0x0f)<<10)|(b3<<2)|((b2&0xc0)>>6))}; }
  if(kind==='VP8 '){ for(let i=20;i+9<Math.min(buffer.length,80);i++){ if(buffer[i]===0x9d&&buffer[i+1]===0x01&&buffer[i+2]===0x2a) return {width:buffer.readUInt16LE(i+3)&0x3fff,height:buffer.readUInt16LE(i+5)&0x3fff}; } }
  return null;
}
function imageSize(path){ const ext=extname(path).toLowerCase(),buf=readFileSync(path); if(ext==='.png') return pngSize(buf); if(ext==='.webp') return webpSize(buf); if(ext==='.jpg'||ext==='.jpeg') return jpegSize(buf); return null; }
function walk(dir){ if(!existsSync(dir)) return []; return readdirSync(dir).flatMap(name=>{ const full=join(dir,name); return statSync(full).isDirectory()?walk(full):[full]; }); }
function safeArtId(value){ return typeof value==='string' && value.length>0 && !value.startsWith('/') && !value.includes('..') && value===value.replaceAll('\\','/'); }

const cardIds=new Set(cards.map(card=>card.id));
const focusProblems=[];
for(const [id,focus] of Object.entries(focusByCard)){
  const x=Number(focus?.x), y=Number(focus?.y);
  if(!cardIds.has(id)) focusProblems.push(`${id}: unknown card id`);
  else if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>100||y<0||y>100) focusProblems.push(`${id}: focus must be x/y 0-100`);
}
const rows=[]; const referenced=new Set();
for(const card of cards){
  const focus=focusByCard[card.id]??{x:50,y:50};
  const artId=card.artId??null;
  if(!artId){ rows.push({id:card.id,name:card.name,status:'MISSING',artId:null,focus}); continue; }
  if(!safeArtId(artId)){ rows.push({id:card.id,name:card.name,status:'INVALID_ID',artId,focus}); continue; }
  referenced.add(artId);
  const path=join(artRoot,artId),ext=extname(artId).toLowerCase();
  if(!supported.has(ext)){ rows.push({id:card.id,name:card.name,status:'UNSUPPORTED_FORMAT',artId,format:ext||null,focus}); continue; }
  if(!existsSync(path)){ rows.push({id:card.id,name:card.name,status:'BROKEN_REFERENCE',artId,focus}); continue; }
  const size=imageSize(path); const ratio=size?.height ? size.width/size.height : null; const ratioOk=ratio!=null && Math.abs(ratio-targetRatio)<=ratioTolerance;
  rows.push({id:card.id,name:card.name,status:ratioOk?'READY':'BAD_RATIO',artId,format:ext.slice(1).toUpperCase(),width:size?.width??null,height:size?.height??null,ratio:ratio?Number(ratio.toFixed(4)):null,ratioOk,canonicalCanvas:Boolean(size&&size.width===1600&&size.height===900),focus});
}
const productionFiles=walk(join(artRoot,'alpha')).filter(path=>supported.has(extname(path).toLowerCase())).map(path=>relative(artRoot,path).replaceAll('\\','/'));
const orphanFiles=productionFiles.filter(id=>!referenced.has(id));
const counts=rows.reduce((acc,row)=>(acc[row.status]=(acc[row.status]??0)+1,acc),{});
const report={generatedAt:new Date().toISOString(),cardCount:cards.length,contract:{preferredCanvas:'1600x900',aspectRatio:'16:9',supportedFormats:[...supported]},counts,ready:rows.filter(row=>row.status==='READY').length,missing:rows.filter(row=>row.status==='MISSING').length,problemCount:rows.filter(row=>!['READY','MISSING'].includes(row.status)).length+focusProblems.length,focusProblems,orphanFiles,rows};
const md=[`# Artwork Status`, '', `Generated: ${report.generatedAt}`, '', `- Cards: **${report.cardCount}**`, `- Ready artwork: **${report.ready}**`, `- Missing artwork: **${report.missing}**`, `- Broken / invalid / ratio issues: **${report.problemCount}**`, `- Orphan production files: **${report.orphanFiles.length}**`, `- Focus metadata issues: **${focusProblems.length}**`, '', '## Focus metadata', '', ...(focusProblems.length?focusProblems.map(item=>`- ${item}`):['- Valid']), '', '## Missing artwork', '', ...rows.filter(r=>r.status==='MISSING').map(r=>`- ${r.id} — ${r.name}`), '', '## Problems', '', ...(rows.filter(r=>!['READY','MISSING'].includes(r.status)).map(r=>`- ${r.id} — ${r.name}: ${r.status}${r.artId?` (${r.artId})`:''}`)||[]), '', '## Ready', '', ...rows.filter(r=>r.status==='READY').map(r=>`- ${r.id} — ${r.artId} · ${r.width}×${r.height}${r.canonicalCanvas?' · canonical canvas':''}`), '', '## Orphan production files', '', ...(orphanFiles.length?orphanFiles.map(id=>`- ${id}`):['- None'])].join('\n');
if(write){ mkdirSync(join(root,'reports'),{recursive:true}); writeFileSync(join(root,'reports','artwork-status.json'),JSON.stringify(report,null,2)+'\n'); writeFileSync(join(root,'reports','artwork-status.md'),md+'\n'); }
console.log(`ARTWORK_AUDIT · ${report.ready}/${report.cardCount} ready · ${report.missing} missing · ${report.problemCount} problems · ${report.orphanFiles.length} orphans`);
if(report.problemCount || report.orphanFiles.length || (strictMissing && report.missing)) process.exitCode=1;
