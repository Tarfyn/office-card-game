const base=String(process.env.ALPHA_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8787}`).replace(/\/$/,"");
async function request(path,{method="GET",body,headers={}}={}){const r=await fetch(base+path,{method,headers:{...(body?{"content-type":"application/json"}:{}),...headers},body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${method} ${path} -> ${r.status} ${data?.error?.message??""}`);return data;}
const a=await request('/api/profiles/guest',{method:'POST',body:{displayName:'External Alpha A'}});
const b=await request('/api/profiles/guest',{method:'POST',body:{displayName:'External Alpha B'}});
const room=await request('/api/rooms',{method:'POST',body:{deckId:'customer-service-starter',profileToken:a.profileToken,mode:'FRIENDLY'}});
const joined=await request(`/api/rooms/${room.roomId}/join`,{method:'POST',body:{deckId:'it-starter',profileToken:b.profileToken}});
const aState=await request(`/api/rooms/${room.roomId}/state?after=0`,{headers:{'x-room-token':room.token}});
const bState=await request(`/api/rooms/${room.roomId}/state?after=0`,{headers:{'x-room-token':joined.token}});
const aStream=await request(`/api/rooms/${room.roomId}/stream-ticket`,{method:'POST',headers:{'x-room-token':room.token},body:{clientId:'external-smoke-a'}});
const bStream=await request(`/api/rooms/${room.roomId}/stream-ticket`,{method:'POST',headers:{'x-room-token':joined.token},body:{clientId:'external-smoke-b'}});
if(aState.playerId!=='P1'||bState.playerId!=='P2'||!aStream.ticket||!bStream.ticket)throw new Error('External alpha smoke did not establish both seats.');
console.log(`EXTERNAL_ALPHA_OK room=${room.roomId} P1=${aState.hostDeckId} P2=${bState.guestDeckId} streamTickets=2`);
