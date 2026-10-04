(() => {
'use strict';
const EVENTS_KEY='timeline.events.v1', SETTINGS_KEY='timeline.settings.v1';
const $=id=>document.getElementById(id);
let events=[],settings={paused:false,maxEvents:5000},theme=null;

async function call(method,payload={}){try{return await Otzaria.call(method,payload)}catch(_){return{success:false,data:null}}}
async function get(key,fallback){const r=await call('storage.get',{key});return r&&r.success&&r.data!=null?r.data:fallback}
async function set(key,value){return call('storage.set',{key,value})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtTime(ts){return new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit'}).format(new Date(ts))}
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dayTitle(ts){const d=new Date(ts),now=new Date();const today=dayKey(now),y=dayKey(now.getTime()-86400000),k=dayKey(ts);if(k===today)return 'היום';if(k===y)return 'אתמול';return new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)}
function eventText(e){const d=e.data||{};if(e.type==='book')return d.title||d.book||d.bookId||e.label||'ספר';if(e.type==='workspace')return d.workspaceId?'סביבת עבודה '+d.workspaceId:'סביבת עבודה';return e.label||'פעילות'}
function eventMeta(e){const d=e.data||{};const parts=[];if(d.ref||d.reference)parts.push(d.ref||d.reference);if(d.index!=null)parts.push('מיקום '+d.index);if(d.screen)parts.push(d.screen);return parts.join(' · ')}
async function openEvent(e){if(e.type!=='book')return;const d=e.data||{};const p={};for(const k of ['bookUid','id','bookId','type','source'])if(d[k]!=null)p[k]=d[k];if(d.index!=null)p.index=d.index;p.navigateToPositionIfReused=true;await call('reader.openBook',p)}
function filtered(){const q=$('search').value.trim().toLowerCase(),type=$('type').value,days=Number($('range').value),cutoff=days?Date.now()-days*86400000:0;return events.filter(e=>(!type||e.type===type)&&(!cutoff||e.time>=cutoff)&&(!q||JSON.stringify(e).toLowerCase().includes(q))).sort((a,b)=>b.time-a.time)}
function render(){const list=filtered(),content=$('content');$('count').textContent=list.length;$('sessions').textContent=new Set(list.map(x=>x.sessionId).filter(Boolean)).size;$('books').textContent=list.filter(x=>x.type==='book').length;$('days').textContent=new Set(list.map(x=>dayKey(x.time))).size;
  if(!list.length){content.innerHTML='<div class="empty">אין עדיין פעילות להצגה.</div>';return}
  const groups=new Map();for(const e of list){const k=dayKey(e.time);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
  content.innerHTML='';for(const [,arr] of groups){const section=document.createElement('section');section.className='day';section.innerHTML='<div class="dayhead"><h2>'+esc(dayTitle(arr[0].time))+'</h2><small>'+arr.length+' אירועים</small></div><div class="timeline"></div>';const tl=section.querySelector('.timeline');
    for(const e of arr){const card=document.createElement('article');card.className='event';card.innerHTML='<div class="eventtop"><div><h3>'+esc(eventText(e))+'</h3><div class="meta">'+esc(eventMeta(e))+'</div></div><div class="meta">'+fmtTime(e.time)+'</div></div>'+(e.type==='book'?'<button class="open">פתח שוב</button>':'');if(e.type==='book')card.querySelector('.open').onclick=()=>openEvent(e);tl.appendChild(card)}
    content.appendChild(section)}
}
function applyTheme(t){if(!t)return;theme=t;const c=t.colorScheme||{},r=document.documentElement.style;r.setProperty('--bg',c.surfaceContainerLowest||c.surface||'#fffbfe');r.setProperty('--surface',c.surface||'#fff');r.setProperty('--surface2',c.surfaceContainer||'#f7f2fa');r.setProperty('--text',c.onSurface||'#1d1b20');r.setProperty('--muted',c.onSurfaceVariant||c.outline||'#625f66');r.setProperty('--primary',c.primary||'#6750a4');r.setProperty('--outline',c.outlineVariant||c.outline||'#cac4d0');r.setProperty('--danger',c.error||'#b3261e')}
function syncPause(){ $('pauseBtn').textContent=settings.paused?'המשך תיעוד':'השהה תיעוד' }
async function load(){events=await get(EVENTS_KEY,[]);if(!Array.isArray(events))events=[];settings=Object.assign({paused:false,maxEvents:5000},await get(SETTINGS_KEY,{}));$('maxEvents').value=String(settings.maxEvents||5000);syncPause();render()}
$('search').oninput=render;$('type').onchange=render;$('range').onchange=render;
$('pauseBtn').onclick=async()=>{settings.paused=!settings.paused;await set(SETTINGS_KEY,settings);syncPause()}
$('clearBtn').onclick=async()=>{if(!confirm('למחוק את כל ציר הזמן?'))return;events=[];await set(EVENTS_KEY,[]);render()}
$('settingsBtn').onclick=()=>$('settingsDialog').classList.add('open');$('closeSettings').onclick=()=>$('settingsDialog').classList.remove('open');
$('saveSettings').onclick=async()=>{settings.maxEvents=Number($('maxEvents').value)||5000;await set(SETTINGS_KEY,settings);$('settingsDialog').classList.remove('open')}
Otzaria.on('plugin.boot',async p=>{applyTheme(p.theme);await load()});Otzaria.on('theme.changed',applyTheme);Otzaria.on('plugin.resumed',load);
})();