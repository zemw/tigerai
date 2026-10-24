export const MAX_LOG_BYTES = 10 * 1024 * 1024;
export const MAX_LOG_ENTRIES = 200;
export const MAX_LOG_AGE = 7 * 86400000;
export function retainedLogs(entries, now = Date.now()) {
  let bytes = 0;
  return entries.filter(e => e.startedAt >= now - MAX_LOG_AGE)
    .sort((a,b) => b.startedAt-a.startedAt).filter(e => {
      const size = new TextEncoder().encode(JSON.stringify(e)).byteLength;
      if (bytes + size > MAX_LOG_BYTES) return false;
      bytes += size; return true;
    }).slice(0,MAX_LOG_ENTRIES);
}
// The active credential is also removed if a provider echoes it in a response.
export function redact(value, secret) {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === 'string' && secret ? item.split(secret).join('[REDACTED]') : item));
}
export class DebugLogStore {
  constructor() { this.database = null; this.opening = null; }
  open() {
    if (this.database) return Promise.resolve(this.database);
    if (this.opening) return this.opening;
    this.opening = new Promise((resolve,reject) => {
      const request = indexedDB.open('tigerai.debug.v1',1);
      request.onupgradeneeded = () => request.result.createObjectStore('requests',{keyPath:'id'});
      request.onerror = () => { this.opening=null; reject(new Error('Debug log storage is unavailable.')); };
      request.onblocked = () => { this.opening=null; reject(new Error('Close other TigerAI tabs to open debug storage.')); };
      request.onsuccess = () => {
        this.database=request.result;
        this.database.onversionchange=()=>{this.database.close();this.database=null;this.opening=null;};
        resolve(this.database);
      };
    });
    return this.opening;
  }
  async transact(change) {
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('requests','readwrite'), store=tx.objectStore('requests');
      let result;
      tx.oncomplete=()=>resolve(result);
      tx.onerror=tx.onabort=()=>reject(new Error('Debug logs could not be saved. Browser storage may be full.'));
      const request=store.getAll();
      request.onsuccess=()=>{
        const entries=change(request.result);
        result=retainedLogs(entries);
        store.clear(); for(const entry of result)store.put(entry);
      };
    });
  }
  list() { return this.transact(entries=>entries); }
  async start(entry) {
    if(new TextEncoder().encode(JSON.stringify(entry)).byteLength>MAX_LOG_BYTES)throw new Error('Request exceeds the debug log size limit and was not recorded.');
    await this.transact(entries=>[...entries,entry]);
  }
  async finish(id, update) {
    // Keep a bounded diagnostic entry when a response is too large to retain.
    let oversized=false;
    await this.transact(entries=>entries.map(e=>{
      if(e.id!==id)return e;
      const next={...e,...update};
      if(new TextEncoder().encode(JSON.stringify(next)).byteLength<=MAX_LOG_BYTES)return next;
      oversized=true;
      return {...e,finishedAt:update.finishedAt,durationMs:update.durationMs,status:update.status,outcome:'log-limit',error:'Response exceeded the debug log size limit and was not retained.'};
    }));
    if(oversized)throw new Error('Response exceeded the debug log size limit.');
  }
  clear() { return this.transact(()=>[]); }
}
