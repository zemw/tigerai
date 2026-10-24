import { redact } from './debug-log.js';
export class CompatibleProvider {
  constructor({key, endpoint, model, logging}) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) throw new Error('Use an HTTPS API endpoint.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Use a plain API endpoint without credentials or query parameters.');
    this.key = key; this.endpoint = url.href; this.model = model; this.logging=logging;
  }
  async complete(messages, signal, context = {}) {
    const body=JSON.stringify({model:this.model,messages});
    const startedAt=Date.now(), started=performance.now();
    const logging=this.logging?.enabled() ? this.logging : null;
    let logId=null, status=null, requestId=null;
    const safe = value => redact(value,this.key);
    if(logging) {
      const id=crypto.randomUUID();
      try {
        await logging.store.start(safe({id,startedAt,roomId:context.roomId || null,type:context.type || 'reply',endpoint:this.endpoint,request:JSON.parse(body),outcome:'pending'}));
        logId=id;
      } catch { logging.warn('Request logging failed. The API call will continue without a saved log.'); }
    }
    const finish=async update=>{
      if(!logId)return;
      try { await logging.store.finish(logId,safe({...update,status,requestId,finishedAt:Date.now(),durationMs:Math.round(performance.now()-started)})); }
      catch { logging.warn('The debug log could not be updated. Your conversation can continue.'); }
    };
    try {
      let response;
      try {
        response = await fetch(this.endpoint, { method:'POST', signal,
          headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.key}`}, body });
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('Reply stopped. Your draft is still here.');
        throw new Error('Cannot reach the provider. Check your connection, endpoint, and browser CORS support.');
      }
      status=response.status;
      requestId=response.headers?.get('x-request-id') || response.headers?.get('request-id') || null;
      if (!response.ok) {
        const errors = {401:'API key rejected. Check your key in Connection settings.',403:'This key does not have access to the selected model.',429:'Provider limit reached. Check your quota or try again later.'};
        throw new Error(errors[response.status] || `Provider request failed (${response.status}). Please try again.`);
      }
      let data;
      try { data=await response.json(); }
      catch { throw new Error('The provider returned invalid JSON.'); }
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('The provider returned an unsupported response format.');
      await finish({outcome:'success',response:{id:typeof data.id==='string'?data.id:null,content,usage:data.usage?{promptTokens:data.usage.prompt_tokens ?? null,completionTokens:data.usage.completion_tokens ?? null,totalTokens:data.usage.total_tokens ?? null}:null}});
      return content;
    } catch(e) {
      await finish({outcome:signal?.aborted?'cancelled':'error',error:e.message});
      throw e;
    }
  }
}
