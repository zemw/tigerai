const ROOMS = 'tigerai.rooms.v1', KEY = 'tigerai.key.v1', SETTINGS = 'tigerai.settings.v1';
export class BrowserStorage {
  constructor(storage = localStorage) { this.storage = storage; }
  rooms() {
    const raw = this.storage.getItem(ROOMS);
    if (!raw) return [];
    const rooms = JSON.parse(raw);
    if (!Array.isArray(rooms) || rooms.some(r => !r || typeof r.id !== 'string' || typeof r.title !== 'string' || !Array.isArray(r.messages) || !(r.character === null || typeof r.character === 'string') || r.messages.some(m => !['user','assistant'].includes(m.role) || typeof m.content !== 'string'))) throw new Error('Saved chat data could not be read. Back up your browser storage before clearing it.');
    return rooms;
  }
  saveRooms(rooms) { this.storage.setItem(ROOMS, JSON.stringify(rooms)); }
  key() { return this.storage.getItem(KEY) || ''; }
  settings() { return JSON.parse(this.storage.getItem(SETTINGS) || 'null'); }
  connect(key, remember, settings) {
    if (remember) this.storage.setItem(KEY,key); else this.storage.removeItem(KEY);
    this.storage.setItem(SETTINGS,JSON.stringify(settings));
  }
  forget() { this.storage.removeItem(KEY); }
}
