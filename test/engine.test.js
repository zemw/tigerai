import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatEngine, createRoom } from '../src/core/engine.js';
import { BrowserStorage } from '../src/adapters/storage.js';
import { CompatibleProvider } from '../src/adapters/provider.js';
test('identity survives rehydration and ordered rules apply',async()=>{
 const calls=[];let saves=0;const p={complete:async m=>{calls.push(m);return calls.length===1?'Alex, 20, CS student':'Hello';}};
 const engine=new ChatEngine(p,async()=>saves++,[{enabled:true,text:'one'},{enabled:false,text:'disabled'},{enabled:true,text:'two'}]);
 const room=createRoom();await engine.send(room,' Hi ');const copy=JSON.parse(JSON.stringify(room));await engine.send(copy,'Again');
 assert.equal(calls.length,3);assert.equal(saves,3);assert.equal(copy.character,room.character);assert.equal(copy.messages.length,4);assert.match(calls[1][0].content,/one\n\ntwo/);assert.ok(!calls[1][0].content.includes('disabled'));assert.equal(calls[2].length,4);
});
test('failed reply retains profile for retry',async()=>{
 let n=0;const room=createRoom();const engine=new ChatEngine({complete:async()=>{if(++n===1)return 'profile';if(n===2)throw Error('offline');return 'reply';}},async()=>{});
 await assert.rejects(engine.send(room,'hello'),/offline/);assert.equal(room.character,'profile');assert.equal(room.messages.length,0);await engine.send(room,'hello');assert.equal(n,3);
});
test('storage failure stops reply generation',async()=>{
 let n=0;const engine=new ChatEngine({complete:async()=>{n++;return 'profile';}},async()=>{throw Error('quota');});await assert.rejects(engine.send(createRoom(),'Hi'),/quota/);assert.equal(n,1);
});
test('empty and overlapping sends are rejected',async()=>{
 let release;const room=createRoom();room.character='fixed';const engine=new ChatEngine({complete:()=>new Promise(r=>release=r)},async()=>{});await assert.rejects(engine.send(room,' '));const task=engine.send(room,'hi');await assert.rejects(engine.send(room,'again'),/in progress/);release('reply');await task;
});
test('forget key preserves history',()=>{
 const map=new Map();const s=new BrowserStorage({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});s.saveRooms([createRoom()]);s.connect('secret',true,{});assert.equal(s.key(),'secret');s.forget();assert.equal(s.key(),'');assert.equal(s.rooms().length,1);
});
test('provider sanitizes auth failures and aborts',async()=>{
 const original=globalThis.fetch;try{const p=new CompatibleProvider({key:'secret',endpoint:'https://example.com/v1/chat/completions',model:'test'});globalThis.fetch=async()=>({ok:false,status:401});await assert.rejects(p.complete([]),/API key rejected/);globalThis.fetch=async()=>{throw new DOMException('secret','AbortError');};await assert.rejects(p.complete([]),/Reply stopped/);assert.throws(()=>new CompatibleProvider({key:'x',endpoint:'http://example.com',model:'x'}),/HTTPS/);}finally{globalThis.fetch=original;}
});
