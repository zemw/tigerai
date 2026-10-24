import { ChatEngine, createRoom } from './core/engine.js';
import { CompatibleProvider } from './adapters/provider.js';
import { BrowserStorage } from './adapters/storage.js';
import { DebugLogStore } from './adapters/debug-log.js';
import { constants } from './core/constants.generated.js';
const $ = id => document.getElementById(id);
$('message').maxLength=constants.chat.maximumMessageCharacters;
$('debug-retention').textContent=`Kept for up to ${Math.round(constants.debug.maximumAgeMs / 86400000 * 100) / 100} days, ${constants.debug.maximumEntries} calls or ${Math.round(constants.debug.maximumBytes / 1048576 * 100) / 100} MB. Export logs you want to keep. Pending means no completion was recorded, for example after closing the page. Clearing a chat does not clear its debug logs.`;
const debugStore=new DebugLogStore();
let debugEntries=[];
const logging={store:debugStore, enabled:()=>$('debug-enabled').checked, warn:message=>{ $('debug-warning').textContent=message; $('debug-warning').hidden=false; }};
let storage, rooms = [], active = null, engine, controller, busy = false, pendingText = null, typing = false, renameEditor = null, draftRevision = 0;
try {
 storage = new BrowserStorage(); rooms = storage.rooms();
 $('api-key').value = storage.key(); $('remember').checked = !!$('api-key').value;
 const settings = storage.settings();
 if(settings) { $('endpoint').value = settings.endpoint; $('model').value = settings.model; }
} catch { $('gate-error').textContent = 'Local storage is unavailable or saved data is invalid. Enable browser storage or back up and repair saved data before continuing.'; $('connect-form').querySelector('button').disabled = true; }
function error(id,e) { $(id).textContent=e.message || String(e); }
function save() { storage.saveRooms(rooms); }
function render() {
 $('rooms').replaceChildren();
 for(const room of rooms) {
  const row=document.createElement('div'); row.className='room'+(room.id===active?.id?' selected':'');
  const open=document.createElement('button');const name=document.createElement('span');name.dataset.roomLabel=room.id;name.textContent=room.title;open.append(name);
  const date=document.createElement('small'); date.textContent=new Date(room.createdAt).toLocaleDateString(); open.append(date);
  open.disabled=busy;open.title=active?.id===room.id?'Click to rename this chat room':'Open this chat room';open.onclick=()=>{if(active?.id===room.id){renameRoom(room,open);return;}active=room;render();$('message').focus();};
  const del=document.createElement('button');del.className='delete';del.textContent='×';del.setAttribute('aria-label',`Delete ${room.title}`);del.disabled=busy;
  del.onclick=()=>{if(confirm('Delete this conversation and its character from this browser?')){const previous=rooms;rooms=rooms.filter(r=>r.id!==room.id);try{save();if(active?.id===room.id)active=null;render();}catch(e){rooms=previous;error('chat-error',e);}}};
  row.append(open,del);$('rooms').append(row);
 }
 $('empty').hidden=!!active;$('conversation').hidden=!active;
 $('room-title').textContent=active?active.title:'TigerAI — Chat rooms';
 $('room-title').disabled=busy||!active;
 $('messages').replaceChildren();
 if(active){
  $('character-label').textContent=active.character?'Your familiar acquaintance':'A new acquaintance';
  if(!active.messages.length && !busy){const note=document.createElement('p');note.className='message intro';note.textContent='Every friendship starts with hello. Your character is created when you send your first message.';$('messages').append(note);}
  for(const m of [...active.messages, ...(busy && pendingText ? [{role:'user',content:pendingText}] : [])]){const el=document.createElement('div');el.className=`message ${m.role}`;const label=document.createElement('b');label.textContent=m.role==='user'?'YOU':'YOUR COMPANION';el.append(label,document.createTextNode(m.content));$('messages').append(el);}
 }
 $('typing-indicator').hidden=!typing;
 $('messages').scrollTop=$('messages').scrollHeight;
}
function newRoom(){if(busy)return;const room=createRoom();rooms.unshift(room);try{save();active=room;$('message').value='';$('chat-error').textContent='';render();$('message').focus();}catch(e){rooms.shift();error('chat-error',e);}}
$('connect-form').onsubmit=e=>{
 e.preventDefault();$('gate-error').textContent='';
 try {
  const key=$('api-key').value.trim(),settings={endpoint:$('endpoint').value.trim(),model:$('model').value.trim()};
  if(!key||!settings.model)throw new Error('Enter your key and model.');
  const provider=new CompatibleProvider({key,...settings,logging});
  storage.connect(key,$('remember').checked,settings);
  engine=new ChatEngine(provider,async()=>save());
  $('api-key').value='';$('gate').hidden=true;$('desktop').hidden=false;render();
 }catch(e){error('gate-error',e);}
};
$('connection').onclick=()=>{if(busy)return;$('gate').hidden=false;$('desktop').hidden=true;$('api-key').value=storage?.key()||'';$('api-key').focus();};
$('remember').onchange=()=>{if(!$('remember').checked)try{storage.forget();}catch(e){error('gate-error',e);}};
$('new-room').onclick=newRoom;$('start').onclick=newRoom;
$('exit').onclick=()=>{if(!busy){active=null;$('message').value='';$('chat-error').textContent='';render();}};
$('stop').onclick=()=>controller?.abort();
$('message').addEventListener('input',()=>{draftRevision++;});
$('message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy)$('message-form').requestSubmit();}};
$('message-form').onsubmit=async e=>{
 e.preventDefault();if(busy||!active)return;
 const text=$('message').value;if(!text.trim())return;
 const sentRevision=draftRevision;
 $('message').value='';
 pendingText=text.trim();typing=false;busy=true;controller=new AbortController();$('chat-error').textContent='';$('send').disabled=true;$('new-room').disabled=true;$('exit').disabled=true;$('connection').disabled=true;$('stop').hidden=false;$('status').textContent='Message sent.';render();$('message').focus();
 try{await engine.send(active,text,controller.signal,{onTyping:()=>{typing=true;$('typing-indicator').hidden=false;$('status').textContent='Your companion is typing…';}});}
 catch(e){
  // Restore the failed message only if the user has not started another draft.
  if(draftRevision===sentRevision && !$('message').value)$('message').value=text;
  error('chat-error',e);
 }
 finally{busy=false;typing=false;pendingText=null;controller=null;$('send').disabled=false;$('new-room').disabled=false;$('exit').disabled=false;$('connection').disabled=false;$('stop').hidden=true;$('status').textContent='Ready.';render();$('message').focus();}
};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
// Avoid silently overwriting chats modified in another tab.
window.addEventListener('storage',e=>{if(e.key==='tigerai.rooms.v1'){controller?.abort();location.reload();}});

function selectedLogs() { return debugEntries.filter(e=>!$('debug-room').value || e.roomId===$('debug-room').value); }
function drawLogs() {
 $('debug-list').replaceChildren();
 const entries=selectedLogs();
 if(!entries.length){const p=document.createElement('p');p.textContent='No logs recorded for this selection.';$('debug-list').append(p);}
 for(const entry of entries){
  const row=document.createElement('div');row.className='debug-entry';
  const label=document.createElement('label');label.className='check';
  const check=document.createElement('input');check.type='checkbox';check.value=entry.id;check.checked=true;check.setAttribute('aria-label',`Select request ${entry.id}`);
  label.append(check,document.createTextNode(`${new Date(entry.startedAt).toLocaleString()} · ${entry.type} · ${entry.outcome}`));
  const detail=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
  summary.textContent=`${entry.request.model} · ${entry.status ?? '—'} · ${entry.durationMs ?? '—'} ms · ${entry.id.slice(0,8)}`;
  pre.textContent=JSON.stringify(entry,null,2);detail.append(summary,pre);row.append(label,detail);$('debug-list').append(row);
 }
 $('debug-export').disabled=!entries.length;
}
async function refreshLogs() {
 try {
  debugEntries=await debugStore.list();const selected=$('debug-room').value;
  $('debug-room').replaceChildren(new Option('All rooms',''));
  for(const id of new Set(debugEntries.map(e=>e.roomId).filter(Boolean))) $('debug-room').add(new Option(rooms.find(r=>r.id===id)?.title || `Room ${id}`,id));
  $('debug-room').value=[...$('debug-room').options].some(o=>o.value===selected)?selected:'';
  drawLogs();
 }catch{ $('debug-notice').textContent='Debug storage is unavailable. Check browser storage permissions.'; }
}
$('debug-open').onclick=()=>{ $('debug-dialog').showModal();refreshLogs(); };
$('debug-close').onclick=()=>$('debug-dialog').close();
$('debug-refresh').onclick=refreshLogs;
$('debug-room').onchange=drawLogs;
$('debug-enabled').onchange=async()=>{
 if($('debug-enabled').checked)try{await debugStore.open();$('debug-notice').textContent='Logging enabled for future API calls.';}catch{$('debug-enabled').checked=false;$('debug-notice').textContent='Cannot enable logging: browser storage is unavailable.';}
 else $('debug-notice').textContent='Logging disabled. Existing logs remain until cleared or expired.';
};
$('debug-export').onclick=()=>{
 const ids=new Set([...$('debug-list').querySelectorAll('input:checked')].map(e=>e.value));
 const selected=selectedLogs().filter(e=>ids.has(e.id));
 if(!selected.length){$('debug-notice').textContent='Select at least one request to export.';return;}
 const url=URL.createObjectURL(new Blob([JSON.stringify({format:'tigerai-debug-v1',exportedAt:new Date().toISOString(),requests:selected},null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`tigerai-debug-${Date.now()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),constants.debug.exportUrlLifetimeMs);
 $('debug-notice').textContent=`Exported ${selected.length} request(s). Exported files contain conversation text and prompts.`;
};
$('debug-clear').onclick=async()=>{
 if(!confirm('Permanently delete all debug logs from this browser? Chat history will remain.'))return;
 try{await debugStore.clear();await refreshLogs();$('debug-notice').textContent='All debug logs cleared.';}
 catch{$('debug-notice').textContent='Debug logs could not be cleared.';}
};
// Enforce retention on startup, including sessions where logging is disabled.
debugStore.list().catch(()=>{});

function renameRoom(room, label) {
 if(busy || renameEditor)return;
 const input=document.createElement('input');input.type='text';input.className='room-name-editor';
 input.value=room.title;input.maxLength=constants.chat.roomTitleCharacters;
 input.setAttribute('aria-label','Room name');input.title='Enter to save · Escape to cancel';
 input.autocomplete='off';label.hidden=true;label.before(input);
 let finished=false;
 const finish=(cancel=false,focusLabel=false)=>{
  if(finished)return;
  const name=input.value.trim();
  if(!cancel && name && name!==room.title){
   const previous={title:room.title,customTitle:room.customTitle};
   room.title=name;room.customTitle=true;
   try{save();}catch(e){Object.assign(room,previous);error('chat-error',e);}
  }
  finished=true;renameEditor=null;input.remove();label.hidden=false;
  for(const el of $('rooms').querySelectorAll('[data-room-label]'))if(el.dataset.roomLabel===room.id)el.textContent=room.title;
  if(active?.id===room.id)$('room-title').textContent=room.title;
  if(focusLabel)label.focus();
 };
 renameEditor={finish};
 input.onkeydown=e=>{
  if(e.isComposing)return;
  if(e.key==='Enter'){e.preventDefault();finish(false,true);}
  else if(e.key==='Escape'){e.preventDefault();finish(true,true);}
 };
 input.onblur=()=>finish();input.focus();input.select();
}
$('room-title').onclick=()=>{if(active)renameRoom(active,$('room-title'));};
