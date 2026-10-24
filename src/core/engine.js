import { prompts } from './prompts.js';
import { ReplyTiming } from './timing.js';
export function createRoom(id = crypto.randomUUID()) {
  return { id, title: 'New conversation', createdAt: Date.now(), character: null, messages: [] };
}
export class ChatEngine {
  constructor(provider, persist, rules = prompts.rules, timing = new ReplyTiming()) {
    this.provider = provider; this.persist = persist; this.rules = rules; this.timing = timing; this.busy = new Set();
  }
  async send(room, text, signal) {
    text = text.trim();
    if (!text) throw new Error('Please enter a message.');
    if (text.length > 12000) throw new Error('Please keep each message under 12,000 characters.');
    if (this.busy.has(room.id)) throw new Error('A reply is already in progress.');
    this.busy.add(room.id);
    const startedAt = performance.now();
    try {
      if (!room.character) {
        const profile = await this.provider.complete([{role:'system',content:prompts.character}], signal, {roomId:room.id, type:'character'});
        if (!profile?.trim()) throw new Error('No character profile was returned. Please try again.');
        room.character = profile; // Persist before requesting a reply; future retries reuse this identity.
        await this.persist(room);
      }
      const message = {role:'user', content:text};
      const response = await this.provider.complete([
        {role:'system',content:[prompts.identity, room.character, ...this.rules.filter(r => r.enabled).map(r => r.text)].join('\n\n')},
        ...room.messages.map(({role,content})=>({role,content})), message
      ], signal, {roomId:room.id, type:'reply'});
      if (!response?.trim()) throw new Error('The provider returned an empty reply. Please try again.');
      await this.timing?.wait(response, startedAt, signal);
      if (signal?.aborted) throw new Error('Reply stopped. Your draft is still here.');
      room.messages.push(message, {role:'assistant',content:response});
      if (room.messages.length === 2) room.title = text.slice(0, 42);
      await this.persist(room);
      return response;
    } finally { this.busy.delete(room.id); }
  }
}
