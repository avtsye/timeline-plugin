(() => {
'use strict';

const EVENTS='timeline.events.v2';
const SNAPS='timeline.snapshots.v1';
const SETTINGS='timeline.settings.v1';
const TOOL_STATE='timeline.tool_state.v1';
const HEALTH='timeline.health.v1';
const LAST_BACKUP='timeline.last_backup.v1';
const SESSION_GAP=30*60*1000;
const MERGE_GAP=2*60*1000;
const SNAP_GAP=15*60*1000;
const TOOL_POLL_MS=5000;
const BACKUP_GAP=30*60*1000;
const STALE_SNAPSHOT=35*60*1000;
let q=Promise.resolve(),wired=false,pollTimer=null,knownToolTabs=new Set(),toolBaselineReady=false,lastHealthTick=0,bootPrivacyCleared=false;

const call=async(m,p={})=>{try{return await Otzaria.call(m,p)}catch(_){return{success:false,data:null}}};
const get=async(k,f)=>{const r=await call('storage.get',{key:k});return r&&r.success&&r.data!=null?r.data:f};
const set=(k,v)=>call('storage.set',{key:k,value:v});
async function bgLanguage(){
  const s=await get(SETTINGS,{});
  if(s.language&&s.language!=='auto')return s.language==='en'?'en':'he';
  const r=await call('app.getLocale');
  const lang=r&&r.success&&r.data&&(r.data.language||r.data.locale)||'he';
  return String(lang).toLowerCase().startsWith('en')?'en':'he';
}
async function bgText(key){
  const lang=await bgLanguage();
  const map={
    he:{
      trackingIncomplete:'מעקב ציר הזמן אינו מלא: חסרות הרשאות רקע',
      snapshotStale:'ציר הזמן פעיל אך לא נוצרה נקודת שחזור זמן רב',
      snapshotSaved:'נקודת שחזור נשמרה',
      openTimeline:'פתח ציר זמן',
      saveSnapshot:'שמור נקודת שחזור בציר הזמן'
    },
    en:{
      trackingIncomplete:'Timeline tracking is incomplete: background permissions are missing',
      snapshotStale:'Timeline is active, but no restore point has been created for a while',
      snapshotSaved:'Restore point saved',
      openTimeline:'Open Timeline',
      saveSnapshot:'Save a Timeline restore point'
    }
  };
  return map[lang][key]||map.he[key]||key;
}
async function registerLocalizedShortcuts(){
  await call('app.registerShortcut',{id:'open-timeline',label:await bgText('openTimeline'),key:'ctrl+alt+t',command:'openTimeline'});
  await call('app.registerShortcut',{id:'save-timeline-snapshot',label:await bgText('saveSnapshot'),key:'ctrl+alt+s',command:'saveTimelineSnapshot'});
}
const clean=o=>{const x={};for(const k of ['book','bookId','bookUid','id','type','source','index','currentBook','currentBookId','currentIndex','currentRef','screen','workspaceId','toolId','title'])if(o&&o[k]!=null)x[k]=o[k];return x};
const bookKey=d=>d.bookUid||d.currentBookId||d.bookId||d.currentBook||d.book||d.toolId||'';

function toolKind(id){return id&&id.startsWith('builtin.')?'tool':'plugin'}
function toolLabel(id){if(!id)return'כלי';return id.startsWith('builtin.')?'כלי: '+id.slice(8):'תוסף: '+id}
function label(type,d){
  if(type==='book'||type==='ref')return d.currentBook||d.book||d.currentBookId||d.bookId||'ספר';
  if(type==='workspace')return'שולחן עבודה';
  if(type==='navigation')return'מעבר '+(d.screen||'');
  if(type==='plugin'||type==='tool')return toolLabel(d.toolId);
  return'פעילות';
}
async function notify(message,type='info'){const s=await get(SETTINGS,{});if(s.inAppNotifications===false)return;await call('notifications.showInApp',{message,type})}
async function currentState(){const rs=await call('reader.getCurrentState');return rs.success&&rs.data?rs.data:null}

async function detectToolTabs(){
  const settings=Object.assign({trackPlugins:true,trackTools:true},await get(SETTINGS,{}));
  const state=await currentState();if(!state)return;
  const tabs=(state.openTabs||[]).filter(t=>t&&t.toolId&&!t.isSelf);
  const current=new Set();
  for(const t of tabs){
    const key=t.toolId+'|'+(t.book||t.bookId||'');
    current.add(key);
    const kind=toolKind(t.toolId);
    if(toolBaselineReady&&!knownToolTabs.has(key)&&((kind==='plugin'&&settings.trackPlugins!==false)||(kind==='tool'&&settings.trackTools!==false)))record(kind,{toolId:t.toolId,title:t.book||t.bookId||t.toolId});
  }
  knownToolTabs=current;toolBaselineReady=true;
  await set(TOOL_STATE,{open:[...current],updatedAt:Date.now()});
}

async function snapshot(force=false){
  const now=Date.now(),raw=await get(SNAPS,[]),list=Array.isArray(raw)?raw:[];
  if(!force&&list.length&&now-(list[list.length-1].time||0)<SNAP_GAP)return null;
  const[rs,ws]=await Promise.all([call('reader.getCurrentState'),call('workspace.getActive')]);
  if(!rs.success||!rs.data){
    await set(HEALTH,{...(await get(HEALTH,{})),lastSnapshotErrorAt:now,lastSnapshotError:'reader.getCurrentState unavailable'});
    return null;
  }
  const tabs=(rs.data.openTabs||[]).map(t=>({id:t.id,toolId:t.toolId,isSelf:t.isSelf,type:t.type,source:t.source,bookId:t.bookId,bookUid:t.bookUid,book:t.book,index:t.index,currentRef:t.currentRef}));
  const snap={id:'snap-'+now.toString(36),time:now,workspace:ws.success?ws.data:null,active:{bookUid:rs.data.bookUid,bookId:rs.data.currentBookId,index:rs.data.currentIndex},tabs};
  list.push(snap);if(list.length>300)list.splice(0,list.length-300);await set(SNAPS,list);
  await set(HEALTH,{...(await get(HEALTH,{})),lastSnapshotAt:now,lastSnapshotError:null});
  return snap;
}

function summarizeArchive(events,snaps){
  const days={};
  for(const e of Array.isArray(events)?events:[]){
    const d=new Date(e.time||0);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(!days[key])days[key]={events:0,sessions:{},types:{},books:{},plugins:{}};
    const x=days[key];x.events++;if(e.sessionId)x.sessions[e.sessionId]=1;x.types[e.type]=(x.types[e.type]||0)+1;
    const data=e.data||{},book=data.currentBook||data.book||data.currentBookId||data.bookId,plugin=data.toolId;
    if(book&&(e.type==='book'||e.type==='ref'))x.books[book]=(x.books[book]||0)+1;
    if(plugin&&e.type==='plugin')x.plugins[plugin]=(x.plugins[plugin]||0)+1;
  }
  return {
    schemaVersion:1,updatedAt:new Date().toISOString(),
    totals:{events:Array.isArray(events)?events.length:0,snapshots:Array.isArray(snaps)?snaps.length:0,days:Object.keys(days).length},
    days:Object.fromEntries(Object.entries(days).map(([k,v])=>[k,{
      events:v.events,sessions:Object.keys(v.sessions).length,types:v.types,
      topBooks:Object.entries(v.books).sort((a,b)=>b[1]-a[1]).slice(0,10),
      topPlugins:Object.entries(v.plugins).sort((a,b)=>b[1]-a[1]).slice(0,10)
    }]))
  };
}
async function writeSummaryArchive(events,snaps,settings){
  if(settings.summaryArchiveEnabled===false)return;
  const summary=summarizeArchive(events,snaps);
  await call('fs.writeFile',{path:'backups/archive-summary.json',content:JSON.stringify(summary)});
}

async function rotateBackups(force=false){
  const now=Date.now(),last=await get(LAST_BACKUP,0);
  if(!force&&now-Number(last||0)<BACKUP_GAP)return;
  const[events,snaps,settings]=await Promise.all([get(EVENTS,[]),get(SNAPS,[]),get(SETTINGS,{})]);
  const payload=JSON.stringify({schemaVersion:1,createdAt:new Date(now).toISOString(),events,snaps,settings});
  const name='backups/backup-'+now+'.json';
  const wr=await call('fs.writeFile',{path:name,content:payload});
  await writeSummaryArchive(events,snaps,settings);
  if(!wr.success)return;
  const list=await call('fs.listDir',{path:'backups'});
  if(list.success&&list.data&&Array.isArray(list.data.entries)){
    const files=list.data.entries.filter(x=>x.type==='file'&&/^backup-\d+\.json$/.test(x.name)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    while(files.length>5){const x=files.shift();await call('fs.deleteEntry',{path:x.path})}
  }
  await set(LAST_BACKUP,now);
  await set(HEALTH,{...(await get(HEALTH,{})),lastBackupAt:now});
}

async function checkHealth(force=false){
  const now=Date.now();
  if(!force&&now-lastHealthTick<60000)return;
  lastHealthTick=now;
  const[perms,snaps,health]=await Promise.all([call('app.getGrantedPermissions'),get(SNAPS,[]),get(HEALTH,{})]);
  const ps=perms.success&&perms.data&&Array.isArray(perms.data.permissions)?perms.data.permissions:[];
  const missing=['app.run_on_startup','app.background_keep_alive'].filter(x=>!ps.includes(x));
  const lastSnap=Array.isArray(snaps)&&snaps.length?Number(snaps[snaps.length-1].time||0):0;
  const h={...health,lastHealthCheckAt:now,missingPermissions:missing,lastSnapshotAt:lastSnap||health.lastSnapshotAt||0};
  await set(HEALTH,h);
  const lastWarn=Number(health.lastWarningAt||0);
  if(missing.length&&now-lastWarn>6*60*60*1000){
    await notify(await bgText('trackingIncomplete'),'error');
    h.lastWarningAt=now;await set(HEALTH,h);
  }else if(lastSnap&&Number(health.lastEventAt||0)>lastSnap&&now-lastSnap>STALE_SNAPSHOT&&now-lastWarn>60*60*1000){
    await notify(await bgText('snapshotStale'),'error');
    h.lastWarningAt=now;await set(HEALTH,h);
  }
}

function record(type,p){
  q=q.then(async()=>{
    const settings=Object.assign({
      paused:false,maxEvents:5000,trackBooks:true,trackRefs:true,trackPlugins:true,trackTools:true,trackWorkspaces:true,trackNavigation:true,
      pauseUntil:0,pauseUntilRestart:false
    },await get(SETTINGS,{}));
    const now=Date.now();
    if(settings.paused||settings.pauseUntilRestart||Number(settings.pauseUntil||0)>now)return;
    const enabled={book:settings.trackBooks!==false,ref:settings.trackRefs!==false,plugin:settings.trackPlugins!==false,tool:settings.trackTools!==false,workspace:settings.trackWorkspaces!==false,navigation:settings.trackNavigation!==false};
    if(enabled[type]===false)return;
    const d=clean(p),raw=await get(EVENTS,[]),list=Array.isArray(raw)?raw:[];
    const prev=list[list.length-1];
    const same=prev&&prev.type===type&&bookKey(prev.data||{})===bookKey(d)&&now-(prev.endTime||prev.time)<MERGE_GAP;
    if(same&&['book','ref','navigation'].includes(type)){
      prev.endTime=now;prev.count=(prev.count||1)+1;prev.data=Object.assign({},prev.data,d);prev.label=label(type,prev.data);
    }else{
      const sid=prev&&now-(prev.endTime||prev.time)<SESSION_GAP?prev.sessionId:'s-'+now.toString(36);
      list.push({id:'e-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,6),time:now,endTime:now,type,label:label(type,d),sessionId:sid,count:1,data:d});
    }
    const max=Math.max(500,Math.min(20000,Number(settings.maxEvents)||5000));if(list.length>max)list.splice(0,list.length-max);
    await set(EVENTS,list);
    await set(HEALTH,{...(await get(HEALTH,{})),lastEventAt:now,lastEventType:type});
    await snapshot(type==='workspace');
    await rotateBackups(false);
  });
  return q;
}

async function startPolling(){
  if(pollTimer)return;
  const saved=await get(TOOL_STATE,{open:[]});
  if(!toolBaselineReady&&saved&&Array.isArray(saved.open)){knownToolTabs=new Set(saved.open);toolBaselineReady=true}
  await detectToolTabs();
  pollTimer=setInterval(async()=>{await detectToolTabs();await checkHealth()},TOOL_POLL_MS);
}
function wire(){
  if(wired)return;wired=true;
  Otzaria.on('navigation.changed',p=>{record('navigation',p);detectToolTabs()});
  Otzaria.on('reader.current_book_changed',p=>{record('book',p);detectToolTabs()});
  Otzaria.on('reader.current_ref_changed',p=>record('ref',p));
  Otzaria.on('workspace.changed',p=>{record('workspace',p);detectToolTabs()});
  Otzaria.on('plugin.resumed',()=>detectToolTabs());
  Otzaria.on('app.command',async p=>{
    if(!p)return;
    if(p.command==='openTimeline')await call('plugin.openSelf',{param:{view:'timeline'}});
    if(p.command==='saveTimelineSnapshot'){const s=await snapshot(true);if(s)await notify(await bgText('snapshotSaved'),'success')}
  });
}
Otzaria.on('plugin.boot',async()=>{
  if(!bootPrivacyCleared){
    bootPrivacyCleared=true;
    const s=Object.assign({},await get(SETTINGS,{}));
    if(s.pauseUntilRestart){s.pauseUntilRestart=false;await set(SETTINGS,s)}
  }
  wire();
  await registerLocalizedShortcuts();
  await snapshot(false);
  await rotateBackups(false);
  await checkHealth(true);
  await startPolling();
});
})();