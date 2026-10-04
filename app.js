(() => {
'use strict';
const EVENTS='timeline.events.v2', LEGACY='timeline.events.v1', SNAPS='timeline.snapshots.v1', SETTINGS='timeline.settings.v1';
const $=id=>document.getElementById(id);
let events=[],snaps=[],settings={paused:false,maxEvents:5000},searches=[],viewMode='day';

const call=async(m,p={})=>{try{return await Otzaria.call(m,p)}catch(_){return{success:false,data:null}}};
const get=async(k,f)=>{const r=await call('storage.get',{key:k});return r&&r.success&&r.data!=null?r.data:f};
const set=(k,v)=>call('storage.set',{key:k,value:v});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dk=t=>new Date(t).toISOString().slice(0,10);
const fmt=t=>new Intl.DateTimeFormat('he-IL',{hour:'2-digit',minute:'2-digit'}).format(new Date(t));
const fmtDate=t=>new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(t));

function dayTitle(t){
  const k=dk(t),n=Date.now();
  if(k===dk(n))return'היום';
  if(k===dk(n-86400000))return'אתמול';
  return new Intl.DateTimeFormat('he-IL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(t));
}
function startOfWeek(ts){
  const d=new Date(ts);const day=d.getDay();d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return d.getTime();
}
function bucketKey(ts){
  const d=new Date(ts);
  if(viewMode==='day')return dk(ts);
  if(viewMode==='week')return 'w:'+startOfWeek(ts);
  return 'm:'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function bucketTitle(key,ts){
  if(viewMode==='day')return dayTitle(ts);
  if(viewMode==='week'){
    const start=Number(key.slice(2)),end=start+6*86400000;
    return 'שבוע '+fmtDate(start)+' – '+fmtDate(end);
  }
  return new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(new Date(ts));
}
function filtered(){
  const q=$('search').value.trim().toLowerCase(),type=$('type').value,days=+$('range').value,cut=days?Date.now()-days*86400000:0;
  return events.filter(e=>(!type||e.type===type)&&(!cut||e.time>=cut)&&(!q||JSON.stringify(e).toLowerCase().includes(q))).sort((a,b)=>b.time-a.time);
}
function sessions(list){
  const m=new Map();
  for(const e of list){if(!m.has(e.sessionId))m.set(e.sessionId,[]);m.get(e.sessionId).push(e)}
  return [...m.entries()].map(([id,a])=>{
    a.sort((x,y)=>x.time-y.time);
    return{id,events:a,start:a[0].time,end:Math.max(...a.map(x=>x.endTime||x.time))}
  }).sort((a,b)=>b.start-a.start);
}
function snapshotsForSession(s){
  const pad=10*60*1000;
  return snaps.filter(x=>x.time>=s.start-pad&&x.time<=s.end+pad).sort((a,b)=>a.time-b.time);
}
function nearestSnap(t){
  return snaps.slice().sort((a,b)=>Math.abs(a.time-t)-Math.abs(b.time-t))[0]||null;
}
function renderHeatmap(){
  const box=$('heatmap');box.innerHTML='';
  const counts={};events.forEach(e=>counts[dk(e.time)]=(counts[dk(e.time)]||0)+1);
  for(let i=34;i>=0;i--){
    const t=Date.now()-i*86400000,k=dk(t),n=counts[k]||0,d=document.createElement('div');
    d.className='heat '+(n>15?'h4':n>8?'h3':n>3?'h2':n?'h1':'');
    d.title=k+' · '+n+' אירועים';
    box.appendChild(d);
  }
}
function renderSearches(){
  const b=$('recentSearches');
  b.innerHTML=searches.length?searches.slice(0,10).map(x=>'<button class="searchChip" data-q="'+esc(x.query)+'">'+esc(x.query)+'</button>').join(''):'<span class="muted">אין חיפושים אחרונים</span>';
  b.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{
    await call('reader.openSearchTab',{query:btn.dataset.q,autoSearch:true});
    await call('navigation.goTo',{target:'reading'});
  });
}
function renderSnapshots(){
  $('snapshotCount').textContent=snaps.length?snaps.length+' שמורים':'';
  const box=$('snapshotGallery');box.innerHTML='';
  const recent=snaps.slice(-12).reverse();
  if(!recent.length){box.innerHTML='<span class="muted">עדיין אין Snapshots</span>';return}
  for(const s of recent){
    const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId);
    const el=document.createElement('button');
    el.className='snapshotCard';
    el.innerHTML='<b>'+fmtDate(s.time)+' · '+fmt(s.time)+'</b><small>'+books.length+' ספרים'+(s.workspace&&s.workspace.name?' · '+esc(s.workspace.name):'')+'</small>';
    el.onclick=()=>restoreSnapshot(s);
    box.appendChild(el);
  }
}
function previewForSession(s){
  const last=s.events.slice().reverse().find(e=>['book','ref'].includes(e.type));
  if(!last)return{title:'פעילות באוצריא',ref:'ללא ספר פעיל בסוף הסשן'};
  const d=last.data||{};
  return{title:d.currentBook||d.book||d.currentBookId||d.bookId||last.label||'ספר',ref:d.currentRef||d.ref||''};
}
function createSessionCard(s){
  const ssnaps=snapshotsForSession(s),nearest=nearestSnap(s.end);
  const books=[...new Set(s.events.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBook||(e.data||{}).book||(e.data||{}).currentBookId||(e.data||{}).bookId).filter(Boolean))];
  const preview=previewForSession(s),mins=Math.max(1,Math.round((s.end-s.start)/60000));
  const card=document.createElement('section');card.className='session';

  let chooser='';
  if(ssnaps.length){
    chooser='<select class="snapshotSelect"><option value="">בחר Snapshot ('+ssnaps.length+')</option>'+ssnaps.map((x,i)=>'<option value="'+i+'">'+fmt(x.time)+' · '+((x.tabs||[]).filter(t=>t.bookId&&!t.toolId).length)+' ספרים</option>').join('')+'</select>';
  }

  card.innerHTML=
    '<div class="sessionHead"><div><h3>'+fmt(s.start)+'–'+fmt(s.end)+'</h3><div class="muted">'+mins+' דקות · '+s.events.length+' פעילויות · '+books.length+' ספרים</div></div>'+
    '<div class="sessionTools">'+chooser+(nearest?'<button class="restoreNearest">שחזר קרוב</button>':'')+'</div></div>'+
    '<div class="preview"><strong>'+esc(preview.title)+'</strong><div class="ref">'+esc(preview.ref)+'</div></div>'+
    '<div class="books">'+books.slice(0,8).map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>'+
    '<div class="events"></div>';

  const eb=card.querySelector('.events');
  for(const e of s.events.slice().reverse()){
    const d=e.data||{},x=document.createElement('div');x.className='event';
    x.innerHTML='<div><b>'+esc(e.label)+'</b><small>'+esc(d.currentRef||d.ref||d.screen||'')+(e.count>1?' · '+e.count+' עדכונים':'')+'</small></div><time>'+fmt(e.time)+'</time>';
    if(['book','ref'].includes(e.type))x.onclick=()=>openEvent(e);
    eb.appendChild(x);
  }
  const select=card.querySelector('.snapshotSelect');
  if(select)select.onchange=()=>{const i=Number(select.value);if(Number.isInteger(i)&&ssnaps[i])restoreSnapshot(ssnaps[i]);select.value=''};
  const restore=card.querySelector('.restoreNearest');
  if(restore)restore.onclick=()=>restoreSnapshot(nearest);
  return card;
}
function render(){
  const list=filtered(),ss=sessions(list);
  $('count').textContent=list.length;
  $('sessionCount').textContent=ss.length;
  $('bookCount').textContent=new Set(list.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBookId||(e.data||{}).bookId||(e.data||{}).book).filter(Boolean)).size;
  $('dayCount').textContent=new Set(list.map(e=>dk(e.time))).size;

  renderHeatmap();renderSearches();renderSnapshots();

  const cont=$('content');cont.innerHTML='';
  if(!ss.length){cont.innerHTML='<div class="empty">אין עדיין פעילות להצגה.</div>';updateContinue();return}

  const buckets=new Map();
  for(const s of ss){
    const key=bucketKey(s.start);
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(s);
  }
  for(const [key,items] of buckets){
    const wrap=document.createElement('section');wrap.className='bucket';
    wrap.innerHTML='<div class="bucketTitle"><h2>'+esc(bucketTitle(key,items[0].start))+'</h2><span class="muted">'+items.length+' סשנים</span></div><div class="sessionGrid"></div>';
    const grid=wrap.querySelector('.sessionGrid');
    items.forEach(s=>grid.appendChild(createSessionCard(s)));
    cont.appendChild(wrap);
  }
  updateContinue();
}
function updateContinue(){
  const latest=snaps[snaps.length-1];
  $('continueBtn').disabled=!latest;
  $('continueInfo').textContent=latest?((latest.tabs||[]).filter(t=>t.bookId&&!t.toolId).length+' ספרים · '+fmtDate(latest.time)+' · '+fmt(latest.time)):'אין Snapshot זמין';
}
async function openEvent(e){
  const d=e.data||{},p={};
  const map={bookUid:d.bookUid,id:d.id,bookId:d.currentBookId||d.bookId||d.currentBook||d.book,type:d.type,source:d.source,index:d.currentIndex??d.index};
  for(const[k,v]of Object.entries(map))if(v!=null&&v!=='')p[k]=v;
  p.navigateToPositionIfReused=true;
  await call('reader.openBook',p);
  await call('navigation.goTo',{target:'reading'});
}
async function restoreSnapshot(s){
  if(!s||!confirm('לשחזר את מצב הספרים מה-Snapshot הזה? טאבי ספרים קיימים ייסגרו; טאבי כלים ותוספים יישארו.'))return;
  if(s.workspace&&s.workspace.id){
    const wl=await call('workspace.list');
    if(wl.success&&(wl.data||[]).some(w=>w.id===s.workspace.id))await call('workspace.switch',{id:s.workspace.id});
  }
  const st=await call('reader.getCurrentState');
  if(st.success&&st.data){
    const tabs=st.data.openTabs||[];
    for(let i=tabs.length-1;i>=0;i--){
      const t=tabs[i];
      if(!t.isSelf&&t.bookId&&!t.toolId)await call('reader.closeTab',{index:i});
    }
  }
  for(const t of (s.tabs||[]).filter(t=>t.bookId&&!t.toolId)){
    const p={};
    for(const k of ['bookUid','id','bookId','type','source'])if(t[k]!=null)p[k]=t[k];
    if(t.index!=null)p.index=t.index;
    p.navigateToPositionIfReused=true;
    await call('reader.openBook',p);
  }
  await call('navigation.goTo',{target:'reading'});
}
async function createSnapshot(){
  const [rs,ws]=await Promise.all([call('reader.getCurrentState'),call('workspace.getActive')]);
  if(!rs.success||!rs.data)return;
  snaps.push({
    id:'snap-'+Date.now().toString(36),time:Date.now(),
    workspace:ws.success?ws.data:null,
    active:{bookUid:rs.data.bookUid,bookId:rs.data.currentBookId,index:rs.data.currentIndex},
    tabs:rs.data.openTabs||[]
  });
  if(snaps.length>300)snaps.splice(0,snaps.length-300);
  await set(SNAPS,snaps);render();
}
async function load(){
  events=await get(EVENTS,[]);
  if(!events.length){
    const old=await get(LEGACY,[]);
    if(Array.isArray(old)&&old.length)events=old;
  }
  snaps=await get(SNAPS,[]);
  settings=Object.assign(settings,await get(SETTINGS,{}));
  const sr=await call('history.listSearches',{limit:20});
  searches=sr.success&&Array.isArray(sr.data)?sr.data:[];
  sync();render();
}
function sync(){
  $('pauseBtn').textContent=settings.paused?'המשך תיעוד':'השהה תיעוד';
  $('maxEvents').value=String(settings.maxEvents||5000);
}
function theme(t){
  const c=t&&t.colorScheme||{},r=document.documentElement.style;
  r.setProperty('--bg',c.surfaceContainerLowest||c.surface||'#fffbfe');
  r.setProperty('--surface',c.surface||'#fff');
  r.setProperty('--soft',c.surfaceContainer||'#f7f2fa');
  r.setProperty('--top',c.surfaceContainerHigh||c.surfaceContainer||'#f3edf7');
  r.setProperty('--text',c.onSurface||'#1d1b20');
  r.setProperty('--muted',c.onSurfaceVariant||c.outline||'#666');
  r.setProperty('--primary',c.primary||'#6750a4');
  r.setProperty('--outline',c.outlineVariant||c.outline||'#cac4d0');
}

$('search').oninput=render;
$('type').onchange=render;
$('range').onchange=render;
document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>{
  viewMode=btn.dataset.view;
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));
  render();
});
$('pauseBtn').onclick=async()=>{settings.paused=!settings.paused;await set(SETTINGS,settings);sync()};
$('continueBtn').onclick=()=>restoreSnapshot(snaps[snaps.length-1]);
$('snapshotBtn').onclick=createSnapshot;
$('clearBtn').onclick=async()=>{
  if(confirm('למחוק את כל ציר הזמן וה-Snapshots?')){
    events=[];snaps=[];await set(EVENTS,[]);await set(SNAPS,[]);render();
  }
};
$('settingsBtn').onclick=()=>$('dialog').classList.add('open');
$('closeSettings').onclick=()=>$('dialog').classList.remove('open');
$('saveSettings').onclick=async()=>{settings.maxEvents=+$('maxEvents').value||5000;await set(SETTINGS,settings);$('dialog').classList.remove('open')};

Otzaria.on('plugin.boot',async p=>{theme(p.theme);await load()});
Otzaria.on('theme.changed',theme);
Otzaria.on('plugin.resumed',load);
})();