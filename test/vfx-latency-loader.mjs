// Local diagnostic server only: node --loader ./test/vfx-latency-loader.mjs
// server/server.mjs --port=8790 --runtime-dir=<disposable fixture directory>
// No changes to shipped server behavior, schemas, logs or response contracts.
export function replaceOnce(source,from,to) {
  if(source.split(from).length!==2) throw new Error(`Diagnostic anchor must occur once: ${from.slice(0,70)}`);
  return source.replace(from,to);
}
export async function load(url,context,nextLoad) {
  const result=await nextLoad(url,context);
  if(!url.endsWith('/server/server.mjs')&&!url.endsWith('/dist/src/room.js'))return result;
  let source=String(result.source);
  if(url.endsWith('/server/server.mjs')) {
    source=`globalThis.__vfxLatency={now:()=>performance.timeOrigin+performance.now(),current:null};\n`+source;
    source=replaceOnce(source,'const server = createServer(async (req, res) => {',`const server = createServer(async (req, res) => {
      const diagnosticReceived=__vfxLatency.now();
      if(req.url==='/__qa_clock') {res.setHeader('content-type','application/json');res.end(JSON.stringify({now:__vfxLatency.now()}));return;}`);
    source=replaceOnce(source,'const result = rooms.submitIntent(roomId, token, body);',`__vfxLatency.current={id:body.intentId,received:diagnosticReceived};
      const result = rooms.submitIntent(roomId, token, body);
      result.__latency={...__vfxLatency.current};__vfxLatency.current=null;`);
    source=replaceOnce(source,'function sseWrite(res, event, data) {',`function sseWrite(res, event, data) {
      if(event==='state'&&__vfxLatency.current) data={...data,__latency:{...__vfxLatency.current,emitted:__vfxLatency.now()}};`);
  } else {
    const start=source.indexOf('    submitIntent('),end=source.indexOf('    subscribe(',start);
    if(start<0||end<0)throw new Error('Diagnostic submitIntent boundaries unavailable');
    let block=source.slice(start,end);
    block=replaceOnce(block,'room.state = execution.state;',`room.state = execution.state;
      if(globalThis.__vfxLatency?.current) Object.assign(__vfxLatency.current,{accepted:__vfxLatency.now(),ok:execution.response.accepted});`);
    block=replaceOnce(block,'this.notify(room);',`if(globalThis.__vfxLatency?.current) __vfxLatency.current.emitted=__vfxLatency.now();
            this.notify(room);`);
    source=source.slice(0,start)+block+source.slice(end);
  }
  return {...result,source};
}
