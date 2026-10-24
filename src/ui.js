import { ChatEngine, createRoom } from './core/engine.js';
import { CompatibleProvider } from './adapters/provider.js';
import { BrowserStorage } from './adapters/storage.js';
const $ = id => document.getElementById(id);
let storage, rooms = [], active = null, engine, controller, busy = false;
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
  const open=document.createElement('button'); open.textContent=room.title;
  const date=document.createElement('small'); date.textContent=new Date(room.createdAt).toLocaleDateString(); open.append(date);
  open.disabled=busy; open.onclick=()=>{active=room;render();$('message').focus();};
  const del=document.createElement('button');del.className='delete';del.textContent='×';del.setAttribute('aria-label',`Delete ${room.title}`);del.disabled=busy;
  del.onclick=()=>{if(confirm('Delete this conversation and its character from this browser?')){const previous=rooms;rooms=rooms.filter(r=>r.id!==room.id);try{save();if(active?.id===room.id)active=null;render();}catch(e){rooms=previous;error('chat-error',e);}}};
  row.append(open,del);$('rooms').append(row);
 }
 $('empty').hidden=!!active;$('conversation').hidden=!active;
 $('room-title').textContent=active?active.title:'TigerAI — Chat rooms';
 $('messages').replaceChildren();
 if(active){
  $('character-label').textContent=active.character?'Your familiar acquaintance':'A new acquaintance';
  if(!active.messages.length){const note=document.createElement('p');note.className='message intro';note.textContent='Every friendship starts with hello. Your character is created when you send your first message.';$('messages').append(note);}
  for(const m of active.messages){const el=document.createElement('div');el.className=`message ${m.role}`;const label=document.createElement('b');label.textContent=m.role==='user'?'YOU':'YOUR COMPANION';el.append(label,document.createTextNode(m.content));$('messages').append(el);}
 }
 $('messages').scrollTop=$('messages').scrollHeight;
}
function newRoom(){if(busy)return;const room=createRoom();rooms.unshift(room);try{save();active=room;$('message').value='';$('chat-error').textContent='';render();$('message').focus();}catch(e){rooms.shift();error('chat-error',e);}}
$('connect-form').onsubmit=e=>{
 e.preventDefault();$('gate-error').textContent='';
 try {
  const key=$('api-key').value.trim(),settings={endpoint:$('endpoint').value.trim(),model:$('model').value.trim()};
  if(!key||!settings.model)throw new Error('Enter your key and model.');
  const provider=new CompatibleProvider({key,...settings});
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
$('message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!busy)$('message-form').requestSubmit();}};
$('message-form').onsubmit=async e=>{
 e.preventDefault();if(busy||!active)return;
 const text=$('message').value;if(!text.trim())return;
 busy=true;controller=new AbortController();$('chat-error').textContent='';$('send').disabled=true;$('new-room').disabled=true;$('exit').disabled=true;$('connection').disabled=true;$('stop').hidden=false;$('message').readOnly=true;$('status').textContent=active.character?'Your companion is typing…':'Meeting your character…';render();
 try{await engine.send(active,text,controller.signal);$('message').value='';}
 catch(e){error('chat-error',e);}
 finally{busy=false;controller=null;$('send').disabled=false;$('new-room').disabled=false;$('exit').disabled=false;$('connection').disabled=false;$('stop').hidden=true;$('message').readOnly=false;$('status').textContent='Ready.';render();$('message').focus();}
};
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
// Avoid silently overwriting chats modified in another tab.
window.addEventListener('storage',e=>{if(e.key==='tigerai.rooms.v1'){controller?.abort();location.reload();}});
