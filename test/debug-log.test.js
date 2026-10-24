import test from 'node:test';
import assert from 'node:assert/strict';
import { retainedLogs, redact, MAX_LOG_AGE, MAX_LOG_BYTES } from '../src/adapters/debug-log.js';
import { CompatibleProvider } from '../src/adapters/provider.js';
test('retention removes expired entries and keeps newest within count and byte limits',()=>{
 const now=Date.now();const entries=Array.from({length:205},(_,i)=>({id:String(i),startedAt:now-i}));
 const kept=retainedLogs([...entries,{id:'expired',startedAt:now-MAX_LOG_AGE-1}],now);
 assert.equal(kept.length,200);assert.equal(kept[0].id,'0');assert.ok(!kept.some(e=>e.id==='expired'));
 assert.equal(retainedLogs([{id:'large',startedAt:now,text:'x'.repeat(MAX_LOG_BYTES)}],now).length,0);
});
test('redaction removes credential occurrences in nested values',()=>{
 assert.deepEqual(redact({text:'my secret-key',nested:['secret-key']},'secret-key'),{text:'my [REDACTED]',nested:['[REDACTED]']});
});
function harness(enabled=true){
 const entries=[], warnings=[];
 return {entries,warnings,logging:{enabled:()=>enabled,warn:m=>warnings.push(m),store:{start:async e=>entries.push(e),finish:async(id,u)=>Object.assign(entries.find(e=>e.id===id),u)}}};
}
test('logs exact body before fetch, allowlisted response and room context; excludes keys',async()=>{
 const original=globalThis.fetch;const h=harness();
 try {
  globalThis.fetch=async(_url,init)=>{
   assert.equal(h.entries.length,1);assert.equal(h.entries[0].outcome,'pending');assert.deepEqual(h.entries[0].request,JSON.parse(init.body));
   return {ok:true,status:200,headers:new Headers({'x-request-id':'provider-123'}),json:async()=>({id:'response-1',choices:[{message:{content:'hello secret-key'}}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12},authorization:'secret-key'})};
  };
  const p=new CompatibleProvider({key:'secret-key',endpoint:'https://example.com/api',model:'test',logging:h.logging});
  assert.equal(await p.complete([{role:'user',content:'Hi'}],undefined,{roomId:'room-1',type:'character'}),'hello secret-key');
  const log=h.entries[0];assert.equal(log.outcome,'success');assert.equal(log.roomId,'room-1');assert.equal(log.type,'character');assert.equal(log.response.usage.totalTokens,12);assert.equal(log.requestId,'provider-123');assert.ok(log.durationMs>=0);assert.ok(!JSON.stringify(log).includes('secret-key'));assert.ok(!JSON.stringify(log).includes('authorization'));
 }finally{globalThis.fetch=original;}
});
test('disabled logging stores nothing; storage failures do not fail chat',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({choices:[{message:{content:'ok'}}]})});
  const h=harness(false);const p=new CompatibleProvider({key:'key',endpoint:'https://example.com',model:'test',logging:h.logging});await p.complete([]);assert.equal(h.entries.length,0);
  const h2=harness();h2.logging.store.start=async()=>{throw Error('quota');};p.logging=h2.logging;assert.equal(await p.complete([]),'ok');assert.equal(h2.warnings.length,1);
  const h3=harness();h3.logging.store.finish=async()=>{throw Error('quota');};p.logging=h3.logging;assert.equal(await p.complete([]),'ok');assert.equal(h3.warnings.length,1);
 }finally{globalThis.fetch=original;}
});
test('errors and cancelled calls finalize their logs without raw provider errors',async()=>{
 const original=globalThis.fetch;
 try{
  const h=harness();const p=new CompatibleProvider({key:'secret',endpoint:'https://example.com',model:'test',logging:h.logging});
  globalThis.fetch=async()=>({ok:false,status:401});await assert.rejects(p.complete([]),/API key rejected/);assert.equal(h.entries[0].status,401);assert.equal(h.entries[0].outcome,'error');
  const controller=new AbortController();controller.abort();globalThis.fetch=async()=>{throw new DOMException('secret','AbortError');};await assert.rejects(p.complete([],controller.signal),/Reply stopped/);assert.equal(h.entries[1].outcome,'cancelled');assert.ok(!JSON.stringify(h.entries).includes('secret'));
 }finally{globalThis.fetch=original;}
});
