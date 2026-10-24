export class CompatibleProvider {
  constructor({key, endpoint, model}) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:')) throw new Error('Use an HTTPS API endpoint.');
    if (url.username || url.password || url.search || url.hash) throw new Error('Use a plain API endpoint without credentials or query parameters.');
    this.key = key; this.endpoint = url.href; this.model = model;
  }
  async complete(messages, signal) {
    let response;
    try {
      response = await fetch(this.endpoint, { method:'POST', signal,
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.key}`},
        body:JSON.stringify({model:this.model, messages}) });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Reply stopped. Your draft is still here.');
      throw new Error('Cannot reach the provider. Check your connection, endpoint, and browser CORS support.');
    }
    if (!response.ok) {
      const errors = {401:'API key rejected. Check your key in Connection settings.',403:'This key does not have access to the selected model.',429:'Provider limit reached. Check your quota or try again later.'};
      throw new Error(errors[response.status] || `Provider request failed (${response.status}). Please try again.`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('The provider returned an unsupported response format.');
    return content;
  }
}
