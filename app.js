(() => {
'use strict';

const EVENTS='timeline.events.v2';
const LEGACY='timeline.events.v1';
const SNAPS='timeline.snapshots.v1';
const SETTINGS='timeline.settings.v1';
const PINS='timeline.pins.v1';
const COLLAPSED='timeline.collapsed.v1';
const NAMES='timeline.names.v1';
const FAVORITES='timeline.favorites.v1';
const SAVED_FILTERS='timeline.saved_filters.v1';
const MIGRATIONS='timeline.plugin_migrations.v1';
const NOTES='timeline.session_notes.v1';
const HEALTH='timeline.health.v1';

const $=id=>document.getElementById(id);
let events=[],snaps=[],searches=[],installed=[];
let settings={paused:false,maxEvents:5000,inAppNotifications:true,compactMode:false,timelineZoom:1,newTabIntegration:false,homepageIntegration:true,language:'auto'};
let pinned=new Set(),collapsed=new Set(),favorites=new Set(),names={},savedFilters=[],pluginMigrations={},sessionNotes={};
let viewMode='day',datePreset='all',selectedDayKey='',favoritesOnly=false;
let pluginMap=new Map(),health={},currentLang='he';

const call=async(m,p={})=>{try{return await Otzaria.call(m,p)}catch(_){return{success:false,data:null,error:_}}};
const get=async(k,f)=>{const r=await call('storage.get',{key:k});return r&&r.success&&r.data!=null?r.data:f};
const set=(k,v)=>call('storage.set',{key:k,value:v});
const I18N={
he:{
settings:'הגדרות',close:'סגור',save:'שמור',language:'שפה',language_auto:'אוטומטי לפי אוצריא',language_appearance:'שפה ומראה',
compact_mode:'מצב קומפקטי',timeline_actions:'פעולות ציר הזמן',save_snapshot:'שמור נקודת שחזור',all_snapshots:'כל נקודות השחזור',
activity_dashboard:'לוח פעילות',diagnostics:'אבחון',export:'ייצוא',import:'ייבוא',tracking_storage:'מעקב ואחסון',
max_events:'מספר אירועים מרבי',in_app_notifications:'התראות פנימיות של אוצריא',integrations:'אינטגרציות',
plus_target:'השתמש בציר הזמן כיעד של כפתור +',homepage_integration:'פרסם “המשך עבודה” לדף הבית',
danger_zone:'פעולות מתקדמות',clear_all:'נקה את כל ציר הזמן',tracking_status:'מצב מעקב',continue_title:'המשך מהמקום שבו הפסקת',
continue_work:'המשך עבודה',events:'אירועים',sessions:'הפעלות',books:'ספרים',plugins:'תוספים',estimated_book_time:'זמן ספרים משוער',
estimated_plugin_time:'זמן תוספים/כלים משוער',quick_navigation:'ניווט מהיר',save_filter:'שמור מסנן',saved_filters:'מסננים שמורים',
today:'היום',yesterday:'אתמול',this_week:'השבוע',all:'הכול',favorites:'מועדפים',last_35_days:'35 הימים האחרונים',
activity_intensity:'עוצמת פעילות',recent_snapshots:'נקודות שחזור אחרונות',recent_searches:'חיפושים אחרונים',timeline_view:'תצוגת ציר הזמן',
day:'יום',week:'שבוע',month:'חודש',search_placeholder:'חיפוש לפי ספר, תוסף, סביבת עבודה או אירוע…',all_types:'כל הסוגים',
book:'ספר',reading_position:'מיקום קריאה',workspace:'סביבת עבודה',plugin:'תוסף',built_in_tool:'כלי מובנה',navigation:'ניווט',
all_plugins:'כל התוספים',days_7:'7 ימים',days_30:'30 ימים',days_90:'90 ימים',newest_first:'חדש לישן',oldest_first:'ישן לחדש',
pause_tracking:'השהה תיעוד',resume_tracking:'המשך תיעוד',active:'פעיל',partial:'חלקי',limited:'מוגבל',
tracking_active:'מעקב רציף אחר ספרים, תוספים וכלים פתוחים',
tracking_partial:'הרשאת שמירה ברקע לא אושרה; מעקב התוספים עלול להיפסק לאחר חוסר פעילות',
tracking_limited:'הרשאת הפעלה עם אוצריא לא אושרה; מעקב הרקע אינו מלא',
no_activity:'אין פעילות שתואמת למסנן.',no_recent_searches:'אין חיפושים אחרונים',no_snapshots:'עדיין אין נקודות שחזור',
saved:'שמורים',minutes:'דקות',position_changes:'שינויי מקום',activity_in_otzaria:'פעילות באוצריא',no_identified_activity:'לא זוהתה פעילות בסוף ההפעלה',
reading_in:'קריאה ב',work_with:'עבודה עם',tool:'כלי',opened_during_session:'נפתח במהלך ההפעלה',pinned:'מוצמד',
name:'שם',note:'הערה',pin:'הצמד',unpin:'בטל הצמדה',collapse:'קפל',expand:'פתח',to_workspace:'לסביבת עבודה',
restore:'שחזר',delete:'מחק',session_note:'הערה להפעלה',session_name:'שם להפעלה',workspace_name:'שם סביבת העבודה',
delete_session_confirm:'למחוק את ההפעלה הזאת מציר הזמן?',session_deleted:'ההפעלה נמחקה',workspace_create_failed:'יצירת סביבת העבודה נכשלה',
session_saved_workspace:'ההפעלה נשמרה כסביבת עבודה',note_saved:'הערת ההפעלה נשמרה',snapshot_saved:'נקודת שחזור נשמרה',
snapshot_restored:'נקודת השחזור שוחזרה בהצלחה',snapshot_create_failed:'לא ניתן ליצור נקודת שחזור',restore_preview:'תצוגה מקדימה לפני שחזור',
select_books_restore:'בחר אילו ספרים לשחזר. טאבי תוספים וכלים לא ייסגרו.',select_all:'בחר הכל',clear_selection:'בטל הכל',
restore_selected:'שחזר נבחרים',all_restore_points:'כל נקודות השחזור',preview_restore:'תצוגה מקדימה / שחזור',
export_timeline:'ייצוא ציר הזמן',choose_export:'בחר מה לייצא לקובץ JSON.',filtered_view:'התצוגה המסוננת',
import_timeline:'ייבוא ציר הזמן',merge_import_confirm:'למזג את קובץ ציר הזמן עם הנתונים הקיימים?',import_done:'הייבוא הושלם',
invalid_timeline_file:'קובץ ציר זמן לא תקין',read_file_failed:'קריאת הקובץ נכשלה',export_saved:'הייצוא נשמר',export_failed:'הייצוא נכשל',
diagnostics_title:'אבחון',health:'בריאות',storage:'אחסון',last_snapshot:'נקודת שחזור אחרונה',internal_backups:'גיבויים פנימיים',
tracking:'מעקב',missing_plugins:'תוספים חסרים',versions:'גרסאות',last:'אחרון',no_data:'אין נתון',no_event:'אין אירוע',
permissions_ok:'ההרשאות המרכזיות תקינות',missing_permissions:'הרשאות חסרות',open_snapshot_browser:'פתח דפדפן נקודות שחזור',
restore_internal_backup:'שחזור גיבוי פנימי',restore_internal_confirm:'לשחזר את הגיבוי הפנימי הזה? הנתונים הנוכחיים יוחלפו.',
backup_restored:'הגיבוי שוחזר',backup_invalid:'קובץ הגיבוי אינו תקין',save_filter_name:'שם למסנן השמור',filter_saved:'המסנן נשמר',
plugin_missing:'התוסף אינו מותקן. ניתן למפות אותו באבחון.',plugin_disabled:'התוסף מושבת',plugin_open_failed:'לא ניתן לפתוח את התוסף',
builtin_open_unavailable:'אין ממשק כללי לפתיחה מחדש של כלי מובנה בגרסה זו של אוצריא',settings_saved:'הגדרות ציר הזמן נשמרו',
timeline_cleared:'ציר הזמן נוקה',clear_all_confirm:'למחוק את כל ציר הזמן ונקודות השחזור?',tracking_paused:'תיעוד ציר הזמן הושהה',
tracking_resumed:'תיעוד ציר הזמן חודש',day_activity:'30 ימים אחרונים',weeks_activity:'12 שבועות אחרונים',months_activity:'12 חודשים אחרונים',
year_heatmap:'מפת פעילות שנתית',top_books:'ספרים מובילים',top_plugins:'תוספים מובילים',recent_places:'מקומות אחרונים',
book_visits:'ביקורים בספר',plugin_timeline:'ציר זמן של תוסף',visits:'אירועים',days:'ימים',places:'מקומות',open:'פתח',
restore_backup:'שחזר',missing_plugin_mapping:'מיפוי תוספים חסרים',no_missing_plugins:'אין תוספים חסרים',choose_replacement:'בחר תוסף חלופי…',
save_mapping:'שמור מיפוי',mapping_saved:'מיפוי התוסף נשמר',approx:'משוער',hour:'שעה'
},
en:{
settings:'Settings',close:'Close',save:'Save',language:'Language',language_auto:'Automatic — follow Otzaria',language_appearance:'Language & appearance',
compact_mode:'Compact mode',timeline_actions:'Timeline actions',save_snapshot:'Save restore point',all_snapshots:'All restore points',
activity_dashboard:'Activity dashboard',diagnostics:'Diagnostics',export:'Export',import:'Import',tracking_storage:'Tracking & storage',
max_events:'Maximum events',in_app_notifications:'Otzaria in-app notifications',integrations:'Integrations',
plus_target:'Use Timeline as the + button destination',homepage_integration:'Publish “Continue working” to Home Page',
danger_zone:'Advanced actions',clear_all:'Clear the entire timeline',tracking_status:'Tracking status',continue_title:'Continue where you left off',
continue_work:'Continue working',events:'Events',sessions:'Sessions',books:'Books',plugins:'Plugins',estimated_book_time:'Estimated book time',
estimated_plugin_time:'Estimated plugin/tool time',quick_navigation:'Quick navigation',save_filter:'Save filter',saved_filters:'Saved filters',
today:'Today',yesterday:'Yesterday',this_week:'This week',all:'All',favorites:'Favorites',last_35_days:'Last 35 days',
activity_intensity:'Activity intensity',recent_snapshots:'Recent restore points',recent_searches:'Recent searches',timeline_view:'Timeline view',
day:'Day',week:'Week',month:'Month',search_placeholder:'Search by book, plugin, workspace, or event…',all_types:'All types',
book:'Book',reading_position:'Reading position',workspace:'Workspace',plugin:'Plugin',built_in_tool:'Built-in tool',navigation:'Navigation',
all_plugins:'All plugins',days_7:'7 days',days_30:'30 days',days_90:'90 days',newest_first:'Newest first',oldest_first:'Oldest first',
pause_tracking:'Pause tracking',resume_tracking:'Resume tracking',active:'Active',partial:'Partial',limited:'Limited',
tracking_active:'Continuous tracking of books, plugins, and open tools',
tracking_partial:'Background keep-alive permission is not granted; plugin tracking may stop after inactivity',
tracking_limited:'Run-on-startup permission is not granted; background tracking is limited',
no_activity:'No activity matches the current filters.',no_recent_searches:'No recent searches',no_snapshots:'No restore points yet',
saved:'saved',minutes:'minutes',position_changes:'position changes',activity_in_otzaria:'Activity in Otzaria',no_identified_activity:'No identified activity at the end of this session',
reading_in:'Reading',work_with:'Working with',tool:'Tool',opened_during_session:'Opened during the session',pinned:'Pinned',
name:'Name',note:'Note',pin:'Pin',unpin:'Unpin',collapse:'Collapse',expand:'Expand',to_workspace:'To workspace',
restore:'Restore',delete:'Delete',session_note:'Session note',session_name:'Session name',workspace_name:'Workspace name',
delete_session_confirm:'Delete this session from the timeline?',session_deleted:'Session deleted',workspace_create_failed:'Workspace creation failed',
session_saved_workspace:'Session saved as a workspace',note_saved:'Session note saved',snapshot_saved:'Restore point saved',
snapshot_restored:'Restore point restored successfully',snapshot_create_failed:'Could not create a restore point',restore_preview:'Restore preview',
select_books_restore:'Choose which books to restore. Existing plugin and tool tabs will not be closed.',select_all:'Select all',clear_selection:'Clear selection',
restore_selected:'Restore selected',all_restore_points:'All restore points',preview_restore:'Preview / restore',
export_timeline:'Export Timeline',choose_export:'Choose what to export to a JSON file.',filtered_view:'Filtered view',
import_timeline:'Import Timeline',merge_import_confirm:'Merge this Timeline file with the existing data?',import_done:'Import completed',
invalid_timeline_file:'Invalid Timeline file',read_file_failed:'Could not read the file',export_saved:'Export saved',export_failed:'Export failed',
diagnostics_title:'Diagnostics',health:'Health',storage:'Storage',last_snapshot:'Last restore point',internal_backups:'Internal backups',
tracking:'Tracking',missing_plugins:'Missing plugins',versions:'versions',last:'Last',no_data:'No data',no_event:'No event',
permissions_ok:'Core permissions are available',missing_permissions:'Missing permissions',open_snapshot_browser:'Open restore point browser',
restore_internal_backup:'Restore internal backup',restore_internal_confirm:'Restore this internal backup? Current data will be replaced.',
backup_restored:'Backup restored',backup_invalid:'The backup file is invalid',save_filter_name:'Saved filter name',filter_saved:'Filter saved',
plugin_missing:'The plugin is not installed. You can map it in Diagnostics.',plugin_disabled:'The plugin is disabled',plugin_open_failed:'Could not open the plugin',
builtin_open_unavailable:'There is no general API for reopening built-in tools in this Otzaria version',settings_saved:'Timeline settings saved',
timeline_cleared:'Timeline cleared',clear_all_confirm:'Clear the entire timeline and all restore points?',tracking_paused:'Timeline tracking paused',
tracking_resumed:'Timeline tracking resumed',day_activity:'Last 30 days',weeks_activity:'Last 12 weeks',months_activity:'Last 12 months',
year_heatmap:'Year activity heatmap',top_books:'Top books',top_plugins:'Top plugins',recent_places:'Recent places',
book_visits:'Book visits',plugin_timeline:'Plugin timeline',visits:'events',days:'days',places:'places',open:'Open',
restore_backup:'Restore',missing_plugin_mapping:'Map missing plugins',no_missing_plugins:'No missing plugins',choose_replacement:'Choose a replacement plugin…',
save_mapping:'Save mapping',mapping_saved:'Plugin mapping saved',approx:'estimated',hour:'hour'
}};
const t=(key,vars={})=>{
  let s=(I18N[currentLang]&&I18N[currentLang][key])||I18N.he[key]||key;
  for(const [k,v] of Object.entries(vars))s=s.replaceAll('{'+k+'}',String(v));
  return s;
};
const locale=()=>currentLang==='en'?'en-US':'he-IL';
async function resolveLanguage(){
  if(settings.language&&settings.language!=='auto')currentLang=settings.language;
  else{
    const r=await call('app.getLocale');
    const lang=r&&r.success&&r.data&&(r.data.language||r.data.locale)||'he';
    currentLang=String(lang).toLowerCase().startsWith('en')?'en':'he';
  }
  document.documentElement.lang=currentLang;
  document.documentElement.dir=currentLang==='he'?'rtl':'ltr';
}
function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(I18N[currentLang][key])el.textContent=t(key)});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const key=el.dataset.i18nPlaceholder;if(I18N[currentLang][key])el.placeholder=t(key)});
  document.title=currentLang==='he'?'ציר זמן':'Timeline';
  $('settingsFab').title=t('settings');$('settingsFab').setAttribute('aria-label',t('settings'));
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dk=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmt=v=>new Intl.DateTimeFormat(locale(),{hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const fmtDate=v=>new Intl.DateTimeFormat(locale(),{day:'numeric',month:'short',year:'numeric'}).format(new Date(v));

async function notify(message,type='info'){
  if(settings.inAppNotifications===false)return;
  await call('notifications.showInApp',{message,type});
}
async function persistMeta(){
  await Promise.all([
    set(PINS,[...pinned]),
    set(COLLAPSED,[...collapsed]),
    set(NAMES,names),
    set(FAVORITES,[...favorites])
  ]);
}
function resolvedPluginId(id){return pluginMigrations[id]||id}
function pluginInfo(id){return pluginMap.get(resolvedPluginId(id))||null}
function pluginName(id){const p=pluginInfo(id);return p&&p.name?p.name:(pluginMigrations[id]?pluginMigrations[id]:id)}
function pluginIconName(id){const p=pluginInfo(id);return p&&p.toolTabIconName?p.toolTabIconName:'puzzle_piece_24_regular'}
function pluginIconHtml(id){const name=pluginIconName(id);const map=window.OFFICIAL_FLUENT_ICONS||{};return map[name]||map.puzzle_piece_24_regular||'🧩'}
function showModal(title,bodyBuilder){
  const ov=document.createElement('div');ov.className='modalOverlay';
  const box=document.createElement('div');box.className='modalBox';
  const head=document.createElement('div');head.className='modalHead';
  const h=document.createElement('h2');h.textContent=title;
  const close=document.createElement('button');close.textContent=t('close');close.onclick=()=>ov.remove();
  head.appendChild(h);head.appendChild(close);box.appendChild(head);
  const body=document.createElement('div');box.appendChild(body);ov.appendChild(box);document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});
  if(bodyBuilder)bodyBuilder(body,()=>ov.remove());
  return ov;
}
function bookKeyFromEvent(e){
  const d=e.data||{};
  return d.bookUid||d.currentBookId||d.bookId||d.currentBook||d.book||'';
}
function bookTitleFromEvent(e){
  const d=e.data||{};
  return d.currentBook||d.book||d.currentBookId||d.bookId||e.label||t('book');
}
function eventsForBook(key){
  return events.filter(e=>['book','ref'].includes(e.type)&&String(bookKeyFromEvent(e))===String(key)).sort((a,b)=>b.time-a.time);
}
function eventsForPlugin(id){
  return events.filter(e=>e.type==='plugin'&&resolvedPluginId((e.data||{}).toolId)===resolvedPluginId(id)).sort((a,b)=>b.time-a.time);
}
function sessionSummary(s){
  const books=new Set(),plugins=new Set(),searchCount=0;
  let refs=0;
  for(const e of s.events){
    if(['book','ref'].includes(e.type)){const k=bookKeyFromEvent(e);if(k)books.add(k)}
    if(e.type==='plugin'&&(e.data||{}).toolId)plugins.add(resolvedPluginId(e.data.toolId));
    if(e.type==='ref')refs++;
  }
  const mins=Math.max(1,Math.round((s.end-s.start)/60000));
  const parts=[mins+' '+t('minutes'),books.size+' '+t('books')];
  if(plugins.size)parts.push(plugins.size+' '+t('plugins'));
  if(refs)parts.push(refs+' '+t('position_changes'));
  return parts.join(' · ');
}
function dominantType(s){
  const counts={book:0,plugin:0,tool:0,workspace:0,navigation:0};
  for(const e of s.events){if(e.type==='ref')counts.book++;else if(counts[e.type]!=null)counts[e.type]++}
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  if(!entries[0]||entries[0][1]===0)return'mixed';
  if(entries[1]&&entries[1][1]===entries[0][1])return'mixed';
  return entries[0][0];
}
function recentPlaces(limit=12){
  const out=[],seen=new Set();
  for(const e of events.slice().sort((a,b)=>b.time-a.time)){
    if(!['book','ref'].includes(e.type))continue;
    const d=e.data||{},k=bookKeyFromEvent(e),ref=d.currentRef||d.ref||'';
    const key=k+'|'+ref;
    if(!k||seen.has(key))continue;
    seen.add(key);out.push({bookKey:k,title:bookTitleFromEvent(e),ref,time:e.time,event:e});
    if(out.length>=limit)break;
  }
  return out;
}


function dayTitle(t){
  const k=dk(t),now=Date.now();
  if(k===dk(now))return t('today');
  if(k===dk(now-86400000))return t('yesterday');
  return new Intl.DateTimeFormat(locale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(t));
}
function startOfDay(ts){const d=new Date(ts);d.setHours(0,0,0,0);return d.getTime()}
function startOfWeek(ts){const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return d.getTime()}
function bucketKey(ts){
  const d=new Date(ts);
  if(viewMode==='day')return dk(ts);
  if(viewMode==='week')return 'w:'+startOfWeek(ts);
  return 'm:'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function bucketTitle(key,ts){
  if(viewMode==='day')return dayTitle(ts);
  if(viewMode==='week'){const start=Number(key.slice(2));return t('week')+' '+fmtDate(start)+' – '+fmtDate(start+6*86400000)}
  return new Intl.DateTimeFormat(locale(),{month:'long',year:'numeric'}).format(new Date(ts));
}
function matchesPreset(e){
  if(selectedDayKey)return dk(e.time)===selectedDayKey;
  const now=Date.now(),today=startOfDay(now);
  if(datePreset==='today')return e.time>=today;
  if(datePreset==='yesterday')return e.time>=today-86400000&&e.time<today;
  if(datePreset==='week')return e.time>=startOfWeek(now);
  return true;
}
function parseQuery(raw){
  const filters={text:[],book:[],plugin:[],type:[],date:[],session:[]};
  const re=/(book|plugin|type|date|session):(?:"([^"]+)"|(\S+))|(?:"([^"]+)"|(\S+))/gi;
  let m;
  while((m=re.exec(raw))){
    if(m[1])filters[m[1].toLowerCase()].push((m[2]||m[3]||'').toLowerCase());
    else filters.text.push((m[4]||m[5]||'').toLowerCase());
  }
  return filters;
}
function eventSearchText(e){
  const d=e.data||{};
  return [
    e.label,e.type,e.sessionId,d.currentBook,d.book,d.currentBookId,d.bookId,d.currentRef,d.ref,d.screen,
    d.toolId,d.workspaceId,pluginName(d.toolId||''),names[e.sessionId],sessionNotes[e.sessionId]
  ].filter(Boolean).join(' ').toLowerCase();
}
function matchesAdvancedQuery(e,parsed){
  const text=eventSearchText(e),d=e.data||{};
  if(parsed.text.some(x=>!text.includes(x)))return false;
  if(parsed.book.length&&!parsed.book.some(x=>[d.currentBook,d.book,d.currentBookId,d.bookId,e.label].filter(Boolean).join(' ').toLowerCase().includes(x)))return false;
  if(parsed.plugin.length&&!parsed.plugin.some(x=>(pluginName(d.toolId||'')+' '+String(d.toolId||'')).toLowerCase().includes(x)))return false;
  if(parsed.type.length&&!parsed.type.includes(String(e.type||'').toLowerCase()))return false;
  if(parsed.date.length&&!parsed.date.includes(dk(e.time).toLowerCase()))return false;
  if(parsed.session.length&&!parsed.session.some(x=>(String(e.sessionId||'')+' '+String(names[e.sessionId]||'')).toLowerCase().includes(x)))return false;
  return true;
}
function filtered(){
  const parsed=parseQuery($('search').value.trim());
  const type=$('type').value;
  const pluginFilter=$('pluginFilter').value;
  const days=+$('range').value;
  const cut=days?Date.now()-days*86400000:0;
  let list=events.filter(e=>{
    if(type&&e.type!==type)return false;
    if(pluginFilter&&resolvedPluginId((e.data||{}).toolId)!==pluginFilter)return false;
    if(cut&&e.time<cut)return false;
    if(!matchesPreset(e))return false;
    if(favoritesOnly&&!favorites.has(e.id))return false;
    if(!matchesAdvancedQuery(e,parsed))return false;
    return true;
  });
  const sort=$('sort').value;
  list.sort((a,b)=>sort==='oldest'?a.time-b.time:b.time-a.time);
  return list;
}
function sessions(list){
  const m=new Map();
  for(const e of list){if(!m.has(e.sessionId))m.set(e.sessionId,[]);m.get(e.sessionId).push(e)}
  const ss=[...m.entries()].map(([id,a])=>{
    a.sort((x,y)=>x.time-y.time);
    return{id,events:a,start:a[0].time,end:Math.max(...a.map(x=>x.endTime||x.time))}
  });
  const sort=$('sort').value;
  ss.sort((a,b)=>{
    const pinDelta=Number(pinned.has(b.id))-Number(pinned.has(a.id));
    if(pinDelta)return pinDelta;
    return sort==='oldest'?a.start-b.start:b.start-a.start;
  });
  return ss;
}
function snapshotsForSession(s){
  const pad=10*60*1000;
  return snaps.filter(x=>x.time>=s.start-pad&&x.time<=s.end+pad).sort((a,b)=>a.time-b.time);
}
function nearestSnap(t){return snaps.slice().sort((a,b)=>Math.abs(a.time-t)-Math.abs(b.time-t))[0]||null}
function estimateTimes(list){
  const bySession=new Map();
  list.forEach(e=>{if(!bySession.has(e.sessionId))bySession.set(e.sessionId,[]);bySession.get(e.sessionId).push(e)});
  let books=0,tools=0;
  for(const arr of bySession.values()){
    arr.sort((a,b)=>a.time-b.time);
    for(let i=0;i<arr.length;i++){
      const e=arr[i],next=arr[i+1];
      const merged=Math.max(0,(e.endTime||e.time)-e.time);
      const untilNext=next?Math.max(0,next.time-e.time):0;
      const dur=Math.min(15*60000,Math.max(merged,untilNext));
      if(['book','ref'].includes(e.type))books+=dur;
      if(['plugin','tool'].includes(e.type))tools+=dur;
    }
  }
  return{books:Math.round(books/60000),tools:Math.round(tools/60000)};
}
function renderHeatmap(){
  const box=$('heatmap');box.innerHTML='';
  const counts={};events.forEach(e=>counts[dk(e.time)]=(counts[dk(e.time)]||0)+1);
  for(let i=34;i>=0;i--){
    const t=Date.now()-i*86400000,k=dk(t),n=counts[k]||0,b=document.createElement('button');
    b.className='heat '+(n>15?'h4':n>8?'h3':n>3?'h2':n?'h1':'');
    b.title=k+' · '+n+' '+t('events');
    b.onclick=()=>{selectedDayKey=selectedDayKey===k?'':k;datePreset='all';updateQuickButtons();render()};
    box.appendChild(b);
  }
}
function renderSearches(){
  const b=$('recentSearches');
  b.innerHTML=searches.length?searches.slice(0,10).map(x=>'<button class="searchChip" data-q="'+esc(x.query)+'">'+esc(x.query)+'</button>').join(''):'<span class="muted">'+esc(t('no_recent_searches'))+'</span>';
  b.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{
    await call('reader.openSearchTab',{query:btn.dataset.q,autoSearch:true});
    await call('navigation.goTo',{target:'reading'});
  });
}
function renderSnapshots(){
  $('snapshotCount').textContent=snaps.length?snaps.length+' '+t('saved'):'';
  const box=$('snapshotGallery');box.innerHTML='';
  const recent=snaps.slice(-12).reverse();
  if(!recent.length){box.innerHTML='<span class="muted">'+esc(t('no_snapshots'))+'</span>';return}
  for(const s of recent){
    const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId);
    const tools=(s.tabs||[]).filter(t=>t.toolId&&!t.isSelf);
    const el=document.createElement('button');el.className='snapshotCard';
    el.innerHTML='<b>'+fmtDate(s.time)+' · '+fmt(s.time)+'</b><small>'+books.length+' '+esc(t('books'))+' · '+tools.length+' '+esc(t('plugins'))+'/'+esc(t('built_in_tool'))+(s.workspace&&s.workspace.name?' · '+esc(s.workspace.name):'')+'</small>';
    el.onclick=()=>restoreSnapshot(s);box.appendChild(el);
  }
}
function renderPlugins(){
  const grid=$('pluginGrid');grid.innerHTML='';
  $('installedCount').textContent=installed.length+' מותקנים';
  const lastByPlugin=new Map();
  events.filter(e=>e.type==='plugin'&&(e.data||{}).toolId).sort((a,b)=>b.time-a.time).forEach(e=>{const id=resolvedPluginId(e.data.toolId);if(!lastByPlugin.has(id))lastByPlugin.set(id,e)});
  for(const p of installed){
    if(p.pluginId==='timeline-plugin')continue;
    const last=lastByPlugin.get(p.pluginId);
    const card=document.createElement('div');card.className='pluginCard';
    card.innerHTML='<div class="pluginHead"><span class="pluginIcon" title="'+esc(p.toolTabIconName||'puzzle_piece_24_regular')+'">'+pluginIconHtml(p.pluginId)+'</span><strong>'+esc(p.name||p.pluginId)+'</strong></div><small>גרסה '+esc(p.version||'')+' · '+(p.enabled?'פעיל':'מושבת')+'</small><small>'+(last?'שימוש אחרון: '+fmtDate(last.time)+' '+fmt(last.time):'טרם נרשם בציר')+'</small>';
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='8px';
    if(p.enabled){
      const btn=document.createElement('button');btn.textContent='פתח';btn.onclick=()=>openPlugin(p.pluginId);actions.appendChild(btn);
    }
    const hist=document.createElement('button');hist.textContent='Timeline';hist.onclick=()=>showPluginHistory(p.pluginId);actions.appendChild(hist);
    card.appendChild(actions);
    grid.appendChild(card);
  }
}
function smartTitle(s){
  if(names[s.id])return names[s.id];
  const books=[...new Set(s.events.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBook||(e.data||{}).book||(e.data||{}).currentBookId||(e.data||{}).bookId).filter(Boolean))];
  const plugins=[...new Set(s.events.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const tools=[...new Set(s.events.filter(e=>e.type==='tool').map(e=>(e.data||{}).toolId).filter(Boolean))];
  if(books.length===1&&!plugins.length&&!tools.length)return t('reading_in')+' '+books[0];
  if(plugins.length===1&&!books.length)return t('work_with')+' '+pluginName(plugins[0]);
  const parts=[];
  if(books.length)parts.push(books.length+' '+t('books'));
  if(plugins.length)parts.push(plugins.length+' '+t('plugins'));
  if(tools.length)parts.push(tools.length+' '+t('built_in_tool'));
  return parts.join(' · ')||t('activity_in_otzaria');
}
function previewForSession(s){
  const last=s.events.slice().reverse().find(e=>['book','ref','plugin','tool'].includes(e.type));
  if(!last)return{title:t('activity_in_otzaria'),ref:t('no_identified_activity')};
  const d=last.data||{};
  if(last.type==='plugin')return{title:t('plugin')+': '+pluginName(d.toolId||''),ref:t('opened_during_session')};
  if(last.type==='tool')return{title:t('tool')+': '+String(d.toolId||last.label).replace(/^builtin\./,''),ref:t('opened_during_session')};
  return{title:d.currentBook||d.book||d.currentBookId||d.bookId||last.label||t('book'),ref:d.currentRef||d.ref||''};
}
async function openPlugin(id){
  const target=resolvedPluginId(id);
  const p=pluginInfo(target);
  if(!p){await notify(t('plugin_missing'),'error');return}
  if(!p.enabled){await notify(t('plugin_disabled'),'error');return}
  const r=await call('plugin.openOther',{pluginId:target,param:{source:'timeline-plugin'}});
  if(!r.success)await notify(t('plugin_open_failed'),'error');
}
async function openEvent(e){
  const d=e.data||{};
  if(e.type==='plugin'&&d.toolId){await openPlugin(d.toolId);return}
  if(e.type==='tool'){await notify(t('builtin_open_unavailable'),'info');return}
  if(!['book','ref'].includes(e.type))return;
  const p={};const map={bookUid:d.bookUid,id:d.id,bookId:d.currentBookId||d.bookId||d.currentBook||d.book,type:d.type,source:d.source,index:d.currentIndex??d.index};
  for(const[k,v]of Object.entries(map))if(v!=null&&v!=='')p[k]=v;
  p.navigateToPositionIfReused=true;
  const r=await call('reader.openBook',p);
  if(r.success)await call('navigation.goTo',{target:'reading'});
}
async function renameSession(s){
  const next=prompt(t('session_name'),names[s.id]||smartTitle(s));
  if(next===null)return;
  if(next.trim())names[s.id]=next.trim();else delete names[s.id];
  await set(NAMES,names);render();
}
async function deleteSession(s){
  if(!confirm(t('delete_session_confirm')))return;
  events=events.filter(e=>e.sessionId!==s.id);
  s.events.forEach(e=>favorites.delete(e.id));
  pinned.delete(s.id);collapsed.delete(s.id);delete names[s.id];delete sessionNotes[s.id];
  await Promise.all([set(EVENTS,events),set(NOTES,sessionNotes),persistMeta()]);
  render();await notify(t('session_deleted'),'success');
}
async function saveSessionAsWorkspace(s){
  const name=prompt(t('workspace_name'),names[s.id]||smartTitle(s));
  if(!name||!name.trim())return;
  const cr=await call('workspace.create',{name:name.trim(),switchTo:true,reuseExisting:false});
  if(!cr.success){await notify(t('workspace_create_failed'),'error');return}
  const seen=new Set();
  for(const e of s.events){
    if(['book','ref'].includes(e.type)){
      const d=e.data||{};const key=d.bookUid||d.currentBookId||d.bookId||d.currentBook||d.book;
      if(!key||seen.has('b:'+key))continue;seen.add('b:'+key);
      const p={};for(const[k,v]of Object.entries({bookUid:d.bookUid,id:d.id,bookId:d.currentBookId||d.bookId||d.currentBook||d.book,type:d.type,source:d.source,index:d.currentIndex??d.index}))if(v!=null&&v!=='')p[k]=v;
      await call('reader.openBook',p);
    }
    if(e.type==='plugin'&&(e.data||{}).toolId){
      const id=resolvedPluginId(e.data.toolId);if(seen.has('p:'+id)||!pluginMap.has(id))continue;seen.add('p:'+id);await call('plugin.openOther',{pluginId:id,param:{source:'timeline-workspace'}});
    }
  }
  await call('navigation.goTo',{target:'reading'});
  await notify(t('session_saved_workspace'),'success');
}
function editSessionNote(s){
  showModal(t('session_note'),body=>{
    const ta=document.createElement('textarea');ta.className='noteBox';ta.value=sessionNotes[s.id]||'';body.appendChild(ta);
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='12px';
    const save=document.createElement('button');save.className='primary';save.textContent=t('save');
    save.onclick=async()=>{
      if(ta.value.trim())sessionNotes[s.id]=ta.value.trim();else delete sessionNotes[s.id];
      await set(NOTES,sessionNotes);document.querySelector('.modalOverlay')?.remove();render();await notify(t('note_saved'),'success');
    };
    actions.appendChild(save);body.appendChild(actions);
  });
}
async function exportPayload(payload,suggested){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const begin=await call('fs.beginBinaryWrite',{purpose:'user-file',expectedSize:blob.size});
  if(!begin.success){await notify(t('export_failed'),'error');return}
  try{
    const res=await fetch(begin.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/json'},body:blob});
    if(!res.ok)throw new Error('upload');
    const save=await call('fs.commitUserFileWrite',{writeToken:begin.data.writeToken,suggestedName:suggested,extension:'json',title:t('export_timeline')});
    if(save.success&&!save.data.cancelled)await notify(t('export_saved'),'success');
  }catch(_){await call('fs.abortBinaryWrite',{writeToken:begin.data.writeToken});await notify(t('export_failed'),'error')}
}
function exportSession(s){
  exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'session',exportedAt:new Date().toISOString(),events:s.events,snapshots:snapshotsForSession(s),name:names[s.id]||null,note:sessionNotes[s.id]||null},'timeline-session-'+dk(s.start));
}
function createSessionCard(s){
  const ssnaps=snapshotsForSession(s),nearest=nearestSnap(s.end);
  const books=[...new Set(s.events.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBook||(e.data||{}).book||(e.data||{}).currentBookId||(e.data||{}).bookId).filter(Boolean))];
  const plugins=[...new Set(s.events.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const tools=[...new Set(s.events.filter(e=>e.type==='tool').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const preview=previewForSession(s),isPinned=pinned.has(s.id),isCollapsed=collapsed.has(s.id),dom=dominantType(s);
  const card=document.createElement('section');card.className='session type-'+dom+(isPinned?' pinned':'')+(isCollapsed?' collapsed':'');
  const chooser=ssnaps.length?'<select class="snapshotSelect"><option value="">'+esc(t('recent_snapshots'))+' ('+ssnaps.length+')</option>'+ssnaps.map((x,i)=>'<option value="'+i+'">'+fmt(x.time)+' · '+((x.tabs||[]).filter(t=>t.bookId&&!t.toolId).length)+' '+esc(t('books'))+'</option>').join('')+'</select>':'';
  const note=sessionNotes[s.id]||'';
  const nearestInfo=nearest?' · '+t('recent_snapshots')+' '+fmt(nearest.time):'';
  card.innerHTML=
    '<div class="sessionHead"><div><div class="sessionTitleLine"><h3>'+esc(smartTitle(s))+'</h3>'+(isPinned?'<span class="pinBadge">'+esc(t('pinned'))+'</span>':'')+'</div><div class="muted">'+esc(sessionSummary(s))+nearestInfo+'</div></div>'+
    '<div class="sessionTools"><button class="renameBtn">'+esc(t('name'))+'</button><button class="noteBtn">'+esc(t('note'))+'</button><button class="pinBtn">'+esc(isPinned?t('unpin'):t('pin'))+'</button><button class="collapseBtn">'+esc(isCollapsed?t('expand'):t('collapse'))+'</button><button class="workspaceBtn">'+esc(t('to_workspace'))+'</button><button class="exportSessionBtn">'+esc(t('export'))+'</button>'+chooser+(nearest?'<button class="restoreNearest">'+esc(t('restore'))+'</button>':'')+'<button class="deleteBtn danger">'+esc(t('delete'))+'</button></div></div>'+
    '<div class="preview"><strong>'+esc(preview.title)+'</strong><div class="ref">'+esc(preview.ref)+'</div><div class="muted">'+books.length+' '+esc(t('books'))+' · '+plugins.length+' '+esc(t('plugins'))+' · '+tools.length+' '+esc(t('built_in_tool'))+(note?' · '+esc(t('note')):'')+'</div>'+(note?'<div style="margin-top:8px">'+esc(note)+'</div>':'')+'</div>'+
    '<div class="books">'+books.slice(0,8).map(x=>'<span>'+esc(x)+'</span>').join('')+plugins.slice(0,5).map(x=>'<span title="'+esc(pluginIconName(x))+'">'+pluginIconHtml(x)+' '+esc(pluginName(x))+'</span>').join('')+tools.slice(0,5).map(x=>'<span>🛠 '+esc(x.replace(/^builtin\./,''))+'</span>').join('')+'</div><div class="events"></div>';

  const eb=card.querySelector('.events');
  for(const e of s.events.slice().reverse()){
    const d=e.data||{},row=document.createElement('div');row.className='event';
    const main=document.createElement('div');main.style.flex='1';main.innerHTML='<b>'+esc(e.type==='plugin'?pluginName(d.toolId):e.label)+'</b><small>'+esc(d.currentRef||d.ref||d.screen||d.toolId||'')+(e.count>1?' · '+e.count:'')+'</small>';
    main.onclick=()=>openEvent(e);
    const fav=document.createElement('button');fav.className='eventFav';fav.textContent=favorites.has(e.id)?'★':'☆';fav.title=t('favorites');
    fav.onclick=async ev=>{ev.stopPropagation();favorites.has(e.id)?favorites.delete(e.id):favorites.add(e.id);await set(FAVORITES,[...favorites]);render()};
    const time=document.createElement('time');time.textContent=fmt(e.time);
    row.appendChild(main);row.appendChild(fav);row.appendChild(time);eb.appendChild(row);
  }
  card.querySelector('.renameBtn').onclick=()=>renameSession(s);
  card.querySelector('.noteBtn').onclick=()=>editSessionNote(s);
  card.querySelector('.pinBtn').onclick=async()=>{pinned.has(s.id)?pinned.delete(s.id):pinned.add(s.id);await set(PINS,[...pinned]);render()};
  card.querySelector('.collapseBtn').onclick=async()=>{collapsed.has(s.id)?collapsed.delete(s.id):collapsed.add(s.id);await set(COLLAPSED,[...collapsed]);render()};
  card.querySelector('.workspaceBtn').onclick=()=>saveSessionAsWorkspace(s);
  card.querySelector('.exportSessionBtn').onclick=()=>exportSession(s);
  card.querySelector('.deleteBtn').onclick=()=>deleteSession(s);
  const select=card.querySelector('.snapshotSelect');if(select)select.onchange=()=>{const i=Number(select.value);if(Number.isInteger(i)&&ssnaps[i])restoreSnapshot(ssnaps[i]);select.value=''};
  const restore=card.querySelector('.restoreNearest');if(restore)restore.onclick=()=>restoreSnapshot(nearest);
  return card;
}
function renderStats(list,ss){
  const times=estimateTimes(list);
  $('count').textContent=list.length;$('sessionCount').textContent=ss.length;
  $('bookCount').textContent=new Set(list.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBookId||(e.data||{}).bookId||(e.data||{}).book).filter(Boolean)).size;
  $('pluginCount').textContent=new Set(list.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean)).size;
  $('bookTime').textContent=times.books+'ד׳';$('toolTime').textContent=times.tools+'ד׳';
}
function showBookHistory(bookKey){
  const visits=eventsForBook(bookKey);
  const title=visits.length?bookTitleFromEvent(visits[0]):String(bookKey);
  showModal(t('book_visits')+' — '+title,body=>{
    if(!visits.length){body.innerHTML='<div class="empty">'+esc(t('no_activity'))+'</div>';return}
    const places=[];const seen=new Set();
    for(const e of visits){const d=e.data||{},ref=d.currentRef||d.ref||'',key=ref+'|'+(d.currentIndex??d.index??'');if(!seen.has(key)){seen.add(key);places.push(e)}}
    const summary=document.createElement('p');summary.className='muted';
    summary.textContent=visits.length+' '+t('visits')+' · '+new Set(visits.map(e=>dk(e.time))).size+' '+t('days')+' · '+places.length+' '+t('places');body.appendChild(summary);
    const grid=document.createElement('div');grid.className='modalGrid';
    visits.slice(0,80).forEach(e=>{
      const d=e.data||{},card=document.createElement('div');card.className='miniCard';
      card.innerHTML='<h3>'+esc(fmtDate(e.time)+' · '+fmt(e.time))+'</h3><div>'+esc(d.currentRef||d.ref||'')+'</div><div class="muted">'+esc(String(d.currentIndex??d.index??''))+'</div>';
      const b=document.createElement('button');b.textContent=t('open');b.onclick=()=>openEvent(e);card.appendChild(b);grid.appendChild(card);
    });
    body.appendChild(grid);
  });
}
function showPluginHistory(pluginId){
  const list=eventsForPlugin(pluginId),name=pluginName(pluginId);
  showModal(t('plugin_timeline')+' — '+name,body=>{
    const p=document.createElement('p');p.className='muted';p.textContent=list.length+' '+t('visits');body.appendChild(p);
    const open=document.createElement('button');open.textContent=t('open')+' '+t('plugin');open.onclick=()=>openPlugin(pluginId);body.appendChild(open);
    const grid=document.createElement('div');grid.className='modalGrid';grid.style.marginTop='12px';
    list.slice(0,100).forEach(e=>{const card=document.createElement('div');card.className='miniCard';card.innerHTML='<h3>'+esc(fmtDate(e.time)+' · '+fmt(e.time))+'</h3><div class="muted">'+esc((e.data||{}).toolId||'')+'</div>';grid.appendChild(card)});
    body.appendChild(grid);
  });
}
function aggregateDaily(days=30){
  const start=startOfDay(Date.now())-(days-1)*86400000,arr=[];
  for(let i=0;i<days;i++){const t=start+i*86400000,key=dk(t);arr.push({key,time:t,count:events.filter(e=>dk(e.time)===key).length})}
  return arr;
}
function topBooks(limit=10){
  const m=new Map();
  for(const e of events){if(!['book','ref'].includes(e.type))continue;const k=String(bookKeyFromEvent(e));if(!k)continue;const x=m.get(k)||{key:k,title:bookTitleFromEvent(e),count:0,last:0};x.count++;x.last=Math.max(x.last,e.time);m.set(k,x)}
  return [...m.values()].sort((a,b)=>b.count-a.count).slice(0,limit);
}
function topPlugins(limit=10){
  const m=new Map();
  for(const e of events){if(e.type!=='plugin'||!(e.data||{}).toolId)continue;const original=e.data.toolId,k=resolvedPluginId(original);const x=m.get(k)||{key:k,title:pluginName(k),count:0,last:0,missing:!pluginMap.has(k)};x.count++;x.last=Math.max(x.last,e.time);m.set(k,x)}
  return [...m.values()].sort((a,b)=>b.count-a.count).slice(0,limit);
}
function buildBarChart(data,labelFn){
  const chart=document.createElement('div');chart.className='chart';
  const max=Math.max(1,...data.map(x=>x.count));
  data.forEach((x,i)=>{
    const bar=document.createElement('div');bar.className='bar';
    bar.style.height=Math.max(2,Math.round(x.count/max*100))+'%';
    bar.title=(labelFn?labelFn(x,i):x.label||x.key)+' · '+x.count;
    if(i%Math.max(1,Math.floor(data.length/8))===0){const l=document.createElement('span');l.textContent=labelFn?labelFn(x,i):x.label||'';bar.appendChild(l)}
    chart.appendChild(bar);
  });
  return chart;
}
function aggregateWeeks(count=12){
  const out=[];const now=Date.now(),current=startOfWeek(now);
  for(let i=count-1;i>=0;i--){const start=current-i*7*86400000,end=start+7*86400000;out.push({time:start,label:fmtDate(start),count:events.filter(e=>e.time>=start&&e.time<end).length})}
  return out;
}
function aggregateMonths(count=12){
  const out=[],now=new Date();
  for(let i=count-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1),next=new Date(d.getFullYear(),d.getMonth()+1,1);
    out.push({time:d.getTime(),label:new Intl.DateTimeFormat(locale(),{month:'short'}).format(d),count:events.filter(e=>e.time>=d.getTime()&&e.time<next.getTime()).length});
  }
  return out;
}
function showDashboard(){
  showModal(t('activity_dashboard'),body=>{
    const daily=aggregateDaily(30);
    body.innerHTML='<h3>'+esc(t('day_activity'))+'</h3>';body.appendChild(buildBarChart(daily,x=>String(new Date(x.time).getDate())));
    const weeklyTitle=document.createElement('h3');weeklyTitle.textContent=t('weeks_activity');body.appendChild(weeklyTitle);body.appendChild(buildBarChart(aggregateWeeks(12),x=>new Intl.DateTimeFormat(locale(),{day:'numeric',month:'numeric'}).format(new Date(x.time))));
    const monthlyTitle=document.createElement('h3');monthlyTitle.textContent=t('months_activity');body.appendChild(monthlyTitle);body.appendChild(buildBarChart(aggregateMonths(12),x=>x.label));
    const yearTitle=document.createElement('h3');yearTitle.textContent=t('year_heatmap');body.appendChild(yearTitle);
    const year=document.createElement('div');year.className='yearHeat';const counts={};events.forEach(e=>counts[dk(e.time)]=(counts[dk(e.time)]||0)+1);
    for(let i=364;i>=0;i--){const tm=Date.now()-i*86400000,n=counts[dk(tm)]||0,cell=document.createElement('button');cell.className='heat '+(n>15?'h4':n>8?'h3':n>3?'h2':n?'h1':'');cell.title=dk(tm)+' · '+n;cell.onclick=()=>{selectedDayKey=dk(tm);datePreset='all';document.querySelector('.modalOverlay')?.remove();render()};year.appendChild(cell)}
    body.appendChild(year);
    const grid=document.createElement('div');grid.className='modalGrid';grid.style.marginTop='18px';
    const bcard=document.createElement('div');bcard.className='miniCard';bcard.innerHTML='<h3>'+esc(t('top_books'))+'</h3>';
    topBooks().forEach(x=>{const b=document.createElement('button');b.style.display='block';b.style.margin='5px 0';b.textContent=x.title+' ('+x.count+')';b.onclick=()=>showBookHistory(x.key);bcard.appendChild(b)});grid.appendChild(bcard);
    const pcard=document.createElement('div');pcard.className='miniCard';pcard.innerHTML='<h3>'+esc(t('top_plugins'))+'</h3>';
    topPlugins().forEach(x=>{const b=document.createElement('button');b.style.display='block';b.style.margin='5px 0';b.textContent=x.title+' ('+x.count+')'+(x.missing?' — '+t('missing_plugins'):'');b.onclick=()=>showPluginHistory(x.key);pcard.appendChild(b)});grid.appendChild(pcard);
    const rcard=document.createElement('div');rcard.className='miniCard';rcard.innerHTML='<h3>'+esc(t('recent_places'))+'</h3>';
    recentPlaces().forEach(x=>{const b=document.createElement('button');b.style.display='block';b.style.margin='5px 0';b.textContent=x.title+(x.ref?' — '+x.ref:'');b.onclick=()=>openEvent(x.event);rcard.appendChild(b)});grid.appendChild(rcard);
    body.appendChild(grid);
  });
}

function render(){
  const list=filtered(),ss=sessions(list);
  renderStats(list,ss);renderHeatmap();renderSearches();renderSnapshots();
  const cont=$('content');cont.innerHTML='';
  if(!ss.length){cont.innerHTML='<div class="empty">'+esc(t('no_activity'))+'</div>';updateContinue();return}
  const buckets=new Map();
  for(const s of ss){const key=bucketKey(s.start);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s)}
  for(const[key,items]of buckets){
    const wrap=document.createElement('section');wrap.className='bucket';
    if(viewMode==='day'){
      wrap.innerHTML='<div class="bucketTitle"><h2>'+esc(bucketTitle(key,items[0].start))+'</h2><span class="muted">'+items.length+' '+esc(t('sessions'))+'</span></div><div class="timelineRail"></div>';
      const rail=wrap.querySelector('.timelineRail');
      items.forEach((s,i)=>{
        const node=document.createElement('div');node.className='timelineNode '+(i%2===0?'right':'left');
        if(i>0){
          const prev=items[i-1],gapMin=Math.max(0,Math.abs(prev.start-s.start)/60000);
          node.style.marginTop=Math.round(Math.max(14,Math.min(220,gapMin*1.25*Number(settings.timelineZoom||1))))+'px';
        }
        const cw=document.createElement('div');cw.className='timelineCard';cw.appendChild(createSessionCard(s));
        const dot=document.createElement('div');dot.className='timelineDot';
        const stamp=document.createElement('div');stamp.className='timelineStamp';stamp.textContent=fmt(s.start);
        const marks=document.createElement('div');marks.className='snapshotMarks';
        snapshotsForSession(s).slice(0,8).forEach(sn=>{const m=document.createElement('button');m.className='snapshotMark';m.title=t('recent_snapshots')+' '+fmt(sn.time);m.onclick=()=>restoreSnapshot(sn);marks.appendChild(m)});
        node.appendChild(cw);node.appendChild(dot);node.appendChild(stamp);node.appendChild(marks);rail.appendChild(node);
      });
    }else{
      wrap.innerHTML='<div class="bucketTitle"><h2>'+esc(bucketTitle(key,items[0].start))+'</h2><span class="muted">'+items.length+' '+esc(t('sessions'))+'</span></div><div class="sessionGrid"></div>';
      const grid=wrap.querySelector('.sessionGrid');items.forEach(s=>grid.appendChild(createSessionCard(s)));
    }
    cont.appendChild(wrap);
  }
  updateContinue();
}
function updateContinue(){
  const latest=snaps[snaps.length-1];$('continueBtn').disabled=!latest;
  $('continueInfo').textContent=latest?((latest.tabs||[]).filter(t=>t.bookId&&!t.toolId).length+' '+t('books')+' · '+fmtDate(latest.time)+' · '+fmt(latest.time)):t('no_snapshots');
}
async function createSnapshot(renderAfter=true,showNotice=true){
  const[rs,ws]=await Promise.all([call('reader.getCurrentState'),call('workspace.getActive')]);
  if(!rs.success||!rs.data){if(showNotice)await notify(t('snapshot_create_failed'),'error');return null}
  const snap={id:'snap-'+Date.now().toString(36),time:Date.now(),workspace:ws.success?ws.data:null,active:{bookUid:rs.data.bookUid,bookId:rs.data.currentBookId,index:rs.data.currentIndex},tabs:rs.data.openTabs||[]};
  snaps.push(snap);if(snaps.length>300)snaps.splice(0,snaps.length-300);
  await set(SNAPS,snaps);if(renderAfter)render();if(showNotice)await notify(t('snapshot_saved'),'success');await publishHomepageState();return snap;
}
async function performRestoreSnapshot(s,selectedBookKeys=null){
  const keys=selectedBookKeys?new Set(selectedBookKeys.map(String)):null;
  if(s.workspace&&s.workspace.id){
    const wl=await call('workspace.list');
    if(wl.success&&(wl.data||[]).some(w=>w.id===s.workspace.id))await call('workspace.switch',{id:s.workspace.id});
  }
  const undo=await createSnapshot(false,false);
  const st=await call('reader.getCurrentState');
  if(st.success&&st.data&&(!keys||keys.size)){
    const tabs=st.data.openTabs||[];
    for(let i=tabs.length-1;i>=0;i--){
      const tb=tabs[i],identity=String(tb.bookUid||tb.bookId||'');
      if(!tb.isSelf&&tb.bookId&&!tb.toolId&&(!keys||keys.has(identity)))await call('reader.closeTab',{index:i});
    }
  }
  for(const tb of (s.tabs||[]).filter(t=>t.bookId&&!t.toolId)){
    const identity=String(tb.bookUid||tb.bookId);
    if(keys&&!keys.has(identity))continue;
    const p={};for(const k of ['bookUid','id','bookId','type','source'])if(tb[k]!=null)p[k]=tb[k];
    if(tb.index!=null)p.index=tb.index;p.navigateToPositionIfReused=true;await call('reader.openBook',p);
  }
  await call('navigation.goTo',{target:'reading'});
  settings.lastUndoSnapshotId=undo&&undo.id?undo.id:null;await set(SETTINGS,settings);
  await notify(t('snapshot_restored'),'success');
}
function restoreSnapshot(s){
  if(!s)return;
  const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId),plugins=(s.tabs||[]).filter(t=>t.toolId&&!t.isSelf);
  showModal(t('restore_preview'),body=>{
    body.innerHTML='<p><b>'+esc(fmtDate(s.time)+' · '+fmt(s.time))+'</b></p><p class="muted">'+esc(t('select_books_restore'))+'</p>';
    const grid=document.createElement('div');grid.className='modalGrid',checks=[];
    for(const tb of books){
      const id=String(tb.bookUid||tb.bookId),card=document.createElement('label');card.className='miniCard';
      card.innerHTML='<input type="checkbox" checked> <b>'+esc(tb.book||tb.bookId||id)+'</b><div class="muted">'+esc(tb.currentRef||String(tb.index??''))+'</div>';
      checks.push({id,input:card.querySelector('input')});grid.appendChild(card);
    }
    body.appendChild(grid);
    if(plugins.length){const p=document.createElement('p');p.className='muted';p.textContent=plugins.length+' '+t('plugins')+'/'+t('built_in_tool');body.appendChild(p)}
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='14px';
    const all=document.createElement('button');all.textContent=t('select_all');all.onclick=()=>checks.forEach(x=>x.input.checked=true);
    const none=document.createElement('button');none.textContent=t('clear_selection');none.onclick=()=>checks.forEach(x=>x.input.checked=false);
    const go=document.createElement('button');go.className='primary';go.textContent=t('restore_selected');go.onclick=async()=>{const sel=checks.filter(x=>x.input.checked).map(x=>x.id);document.querySelector('.modalOverlay')?.remove();await performRestoreSnapshot(s,sel)};
    actions.appendChild(all);actions.appendChild(none);actions.appendChild(go);body.appendChild(actions);
  });
}
function showSnapshotBrowser(){
  showModal(t('all_restore_points'),body=>{
    if(!snaps.length){body.innerHTML='<div class="empty">'+esc(t('no_snapshots'))+'</div>';return}
    const grid=document.createElement('div');grid.className='modalGrid';
    snaps.slice().reverse().forEach(s=>{
      const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId),plugins=(s.tabs||[]).filter(t=>t.toolId&&!t.isSelf);
      const card=document.createElement('div');card.className='miniCard';
      card.innerHTML='<h3>'+esc(fmtDate(s.time)+' · '+fmt(s.time))+'</h3><div class="muted">'+books.length+' '+esc(t('books'))+' · '+plugins.length+' '+esc(t('plugins'))+'</div><div class="muted">'+esc(s.workspace&&s.workspace.name?s.workspace.name:'')+'</div>';
      const btn=document.createElement('button');btn.textContent=t('preview_restore');btn.onclick=()=>restoreSnapshot(s);card.appendChild(btn);grid.appendChild(card);
    });body.appendChild(grid);
  });
}
function showExportDialog(){
  showModal(t('export_timeline'),body=>{
    const p=document.createElement('p');p.className='muted';p.textContent=t('choose_export');body.appendChild(p);
    const actions=document.createElement('div');actions.className='actions';
    const all=document.createElement('button');all.textContent=t('all');all.onclick=()=>exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'all',exportedAt:new Date().toISOString(),events,snaps,settings,pins:[...pinned],collapsed:[...collapsed],favorites:[...favorites],names,sessionNotes,savedFilters,pluginMigrations},'otzaria-timeline-'+dk(Date.now()));
    const filteredBtn=document.createElement('button');filteredBtn.textContent=t('filtered_view');filteredBtn.onclick=()=>{const ev=filtered(),times=ev.map(e=>e.time),min=times.length?Math.min(...times):0,max=times.length?Math.max(...times):0;exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'filtered',exportedAt:new Date().toISOString(),events:ev,snaps:snaps.filter(s=>s.time>=min-20*60000&&s.time<=max+20*60000)},'otzaria-timeline-filtered-'+dk(Date.now()))};
    const day=document.createElement('button');day.textContent=t('today');day.onclick=()=>{const today=dk(Date.now()),ev=events.filter(e=>dk(e.time)===today);exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'day',date:today,events:ev,snaps:snaps.filter(s=>dk(s.time)===today)},'otzaria-timeline-'+today)};
    actions.appendChild(all);actions.appendChild(filteredBtn);actions.appendChild(day);body.appendChild(actions);
  });
}
function mergeById(a,b){
  const m=new Map();
  [...(a||[]),...(b||[])].forEach(x=>{if(!x)return;const k=x.id||JSON.stringify([x.time,x.type,x.sessionId,x.label]);m.set(k,x)});
  return[...m.values()].sort((x,y)=>(x.time||0)-(y.time||0));
}
async function importData(){
  const pick=await call('fs.pickUserFile',{title:t('import_timeline'),extensions:['json'],access:'read'});
  if(!pick.success||pick.data.cancelled)return;
  const read=await call('fs.readTextFile',{token:pick.data.token});await call('fs.revokeFile',{token:pick.data.token});
  if(!read.success){await notify(t('read_file_failed'),'error');return}
  try{
    const data=JSON.parse(read.data);
    if(!data||data.plugin!=='timeline-plugin'||!Array.isArray(data.events))throw new Error('bad');
    if(!confirm(t('merge_import_confirm')))return;
    events=mergeById(events,data.events);snaps=mergeById(snaps,data.snaps||data.snapshots||[]);
    if(data.settings)settings=Object.assign(settings,data.settings);
    pinned=new Set([...pinned,...(data.pins||[])]);collapsed=new Set([...collapsed,...(data.collapsed||[])]);favorites=new Set([...favorites,...(data.favorites||[])]);
    names=Object.assign({},names,data.names||{});sessionNotes=Object.assign({},sessionNotes,data.sessionNotes||{});pluginMigrations=Object.assign({},pluginMigrations,data.pluginMigrations||{});
    if(Array.isArray(data.savedFilters))savedFilters=[...savedFilters,...data.savedFilters].slice(-30);
    await Promise.all([set(EVENTS,events),set(SNAPS,snaps),set(SETTINGS,settings),set(NOTES,sessionNotes),set(MIGRATIONS,pluginMigrations),set(SAVED_FILTERS,savedFilters),persistMeta()]);
    await resolveLanguage();applyTranslations();sync();render();await publishHomepageState();await notify(t('import_done'),'success');
  }catch(_){await notify(t('invalid_timeline_file'),'error')}
}
async function restoreInternalBackup(path){
  if(!confirm(t('restore_internal_confirm')))return;
  const read=await call('fs.readFile',{path});
  if(!read.success||!read.data||typeof read.data.content!=='string'){await notify(t('read_file_failed'),'error');return}
  try{
    const data=JSON.parse(read.data.content);
    if(!Array.isArray(data.events)||!Array.isArray(data.snaps))throw new Error('bad');
    events=data.events;snaps=data.snaps;if(data.settings)settings=Object.assign(settings,data.settings);
    await Promise.all([set(EVENTS,events),set(SNAPS,snaps),set(SETTINGS,settings)]);
    await resolveLanguage();applyTranslations();sync();render();await publishHomepageState();await notify(t('backup_restored'),'success');
  }catch(_){await notify(t('backup_invalid'),'error')}
}
async function showDiagnostics(){
  const perms=await call('app.getGrantedPermissions'),backups=await call('fs.listDir',{path:'backups'});
  const ps=perms.success&&perms.data&&Array.isArray(perms.data.permissions)?perms.data.permissions:[];
  const required=['app.run_on_startup','app.background_keep_alive','reader.open','workspace.manage','notifications.send'];
  const missing=required.filter(x=>!ps.includes(x));
  const bytes=new Blob([JSON.stringify({events,snaps,names,sessionNotes,savedFilters})]).size;
  const backupEntries=backups.success&&backups.data&&Array.isArray(backups.data.entries)?backups.data.entries.filter(x=>x.type==='file').sort((a,b)=>String(b.name).localeCompare(String(a.name))):[];
  showModal(t('diagnostics_title'),body=>{
    const now=Date.now(),lastSnap=snaps.length?snaps[snaps.length-1].time:0;
    body.innerHTML='<div class="modalGrid">'+
      '<div class="miniCard"><h3>'+esc(t('health'))+'</h3><div class="'+(missing.length?'diagBad':'diagGood')+'">'+esc(missing.length?t('missing_permissions')+': '+missing.length:t('permissions_ok'))+'</div><div class="muted">'+esc(missing.join(', '))+'</div></div>'+
      '<div class="miniCard"><h3>'+esc(t('storage'))+'</h3><div>'+events.length+' '+esc(t('events'))+' · '+snaps.length+' '+esc(t('recent_snapshots'))+'</div><div class="muted">~'+Math.round(bytes/1024)+' KB</div></div>'+
      '<div class="miniCard"><h3>'+esc(t('last_snapshot'))+'</h3><div class="'+(lastSnap&&now-lastSnap<35*60000?'diagGood':'diagWarn')+'">'+(lastSnap?fmtDate(lastSnap)+' '+fmt(lastSnap):esc(t('no_data')))+'</div></div>'+
      '<div class="miniCard"><h3>'+esc(t('internal_backups'))+'</h3><div>'+backupEntries.length+' '+esc(t('versions'))+'</div><div class="muted">'+(health.lastBackupAt?esc(t('last'))+' '+fmtDate(health.lastBackupAt)+' '+fmt(health.lastBackupAt):esc(t('no_data')))+'</div></div>'+
      '<div class="miniCard"><h3>'+esc(t('tracking'))+'</h3><div>'+esc(health.lastEventType||'—')+'</div><div class="muted">'+(health.lastEventAt?esc(t('last'))+' '+fmt(health.lastEventAt):esc(t('no_event')))+'</div></div>'+
      '<div class="miniCard"><h3>'+esc(t('missing_plugins'))+'</h3><div>'+missingPluginIds().length+'</div></div>'+
      '</div>';
    const actions=document.createElement('div');actions.className='actions';actions.style.margin='16px 0';
    const mig=document.createElement('button');mig.textContent=t('missing_plugin_mapping');mig.disabled=!missingPluginIds().length;mig.onclick=showMigrationManager;actions.appendChild(mig);
    const snapBtn=document.createElement('button');snapBtn.textContent=t('open_snapshot_browser');snapBtn.onclick=showSnapshotBrowser;actions.appendChild(snapBtn);body.appendChild(actions);
    if(backupEntries.length){
      const h=document.createElement('h3');h.textContent=t('restore_internal_backup');body.appendChild(h);
      const grid=document.createElement('div');grid.className='modalGrid';
      backupEntries.slice(0,5).forEach(x=>{
        const m=String(x.name).match(/backup-(\d+)\.json/),ts=m?Number(m[1]):0,card=document.createElement('div');card.className='miniCard';
        card.innerHTML='<b>'+(ts?esc(fmtDate(ts)+' · '+fmt(ts)):esc(x.name))+'</b><div class="muted">'+Math.round(Number(x.size||0)/1024)+' KB</div>';
        const b=document.createElement('button');b.textContent=t('restore_backup');b.onclick=()=>restoreInternalBackup(x.path);card.appendChild(b);grid.appendChild(card);
      });
      body.appendChild(grid);
    }
  });
}
function updateSavedFilterSelect(){
  const el=$('savedFilterSelect');
  el.innerHTML='<option value="">'+esc(t('saved_filters'))+'</option>'+savedFilters.map((x,i)=>'<option value="'+i+'">'+esc(x.name)+'</option>').join('');
}
async function saveCurrentFilter(){
  const name=prompt(t('save_filter_name'));if(!name||!name.trim())return;
  savedFilters.push({name:name.trim(),search:$('search').value,type:$('type').value,plugin:$('pluginFilter').value,range:$('range').value,sort:$('sort').value,datePreset,selectedDayKey,favoritesOnly});
  if(savedFilters.length>30)savedFilters.shift();
  await set(SAVED_FILTERS,savedFilters);updateSavedFilterSelect();await notify(t('filter_saved'),'success');
}
function applySavedFilter(i){
  const x=savedFilters[Number(i)];if(!x)return;
  $('search').value=x.search||'';$('type').value=x.type||'';$('pluginFilter').value=x.plugin||'';$('range').value=x.range??'30';$('sort').value=x.sort||'newest';
  datePreset=x.datePreset||'all';selectedDayKey=x.selectedDayKey||'';favoritesOnly=!!x.favoritesOnly;updateQuickButtons();render();
}
function setTimelineZoom(v){
  settings.timelineZoom=Math.max(.4,Math.min(3,Math.round(v*10)/10));
  $('zoomLabel').textContent=Math.round(settings.timelineZoom*100)+'%';
  set(SETTINGS,settings);render();
}
async function applyNewTabIntegration(){
  const r=await call('plugin.setNewTabPage',{enabled:!!settings.newTabIntegration});
  if(!r.success&&settings.newTabIntegration)await notify(t('plugin_open_failed'),'error');
}
async function publishHomepageState(){
  if(!settings.homepageIntegration){
    await call('publishedData.remove',{type:'tool.badge',scope:'global',key:'timeline-plugin:continue'});return;
  }
  const latest=snaps[snaps.length-1],recent=events.slice(-1)[0];
  await call('publishedData.upsert',{type:'tool.badge',scope:'global',key:'timeline-plugin:continue',payload:{
    title:t('continue_work'),count:latest?((latest.tabs||[]).filter(tb=>tb.bookId&&!tb.toolId).length):0,
    label:latest?'Timeline · '+fmtDate(latest.time)+' '+fmt(latest.time):'Timeline',source:'timeline-plugin',updatedAt:new Date().toISOString(),lastEvent:recent?recent.label:null
  }});
}
function missingPluginIds(){
  const ids=new Set(events.filter(e=>e.type==='plugin'&&(e.data||{}).toolId).map(e=>(e.data||{}).toolId));
  return [...ids].filter(id=>!pluginMap.has(resolvedPluginId(id)));
}
function showMigrationManager(){
  const missing=missingPluginIds();
  showModal(t('missing_plugin_mapping'),body=>{
    if(!missing.length){body.innerHTML='<div class="empty">'+esc(t('no_missing_plugins'))+'</div>';return}
    for(const oldId of missing){
      const row=document.createElement('div');row.className='miniCard';row.style.margin='8px 0';
      const sel=document.createElement('select');sel.style.width='100%';sel.innerHTML='<option value="">'+esc(t('choose_replacement'))+'</option>'+installed.filter(p=>p.pluginId!=='timeline-plugin').map(p=>'<option value="'+esc(p.pluginId)+'">'+esc(p.name)+' ('+esc(p.pluginId)+')</option>').join('');
      const title=document.createElement('b');title.textContent=oldId;
      const btn=document.createElement('button');btn.textContent=t('save_mapping');btn.onclick=async()=>{if(!sel.value)return;pluginMigrations[oldId]=sel.value;await set(MIGRATIONS,pluginMigrations);document.querySelector('.modalOverlay')?.remove();render();await notify(t('mapping_saved'),'success')};
      row.appendChild(title);row.appendChild(document.createElement('br'));row.appendChild(sel);row.appendChild(btn);body.appendChild(row);
    }
  });
}
function updateQuickButtons(){
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===datePreset&&!selectedDayKey));
  $('favoritesOnly').classList.toggle('active',favoritesOnly);
}
function sync(){
  $('pauseBtn').textContent=settings.paused?'המשך תיעוד':'השהה תיעוד';
  $('maxEvents').value=String(settings.maxEvents||5000);
  $('notificationsEnabled').checked=settings.inAppNotifications!==false;
  $('compactMode').checked=!!settings.compactMode;
  $('newTabIntegration').checked=!!settings.newTabIntegration;
  $('homepageIntegration').checked=settings.homepageIntegration!==false;
  $('zoomLabel').textContent=Math.round(Number(settings.timelineZoom||1)*100)+'%';
  document.body.classList.toggle('compact',!!settings.compactMode);
  updateSavedFilterSelect();
  updateQuickButtons();
}
async function load(){
  events=await get(EVENTS,[]);
  if(!events.length){const old=await get(LEGACY,[]);if(Array.isArray(old)&&old.length)events=old}
  const values=await Promise.all([
    get(SNAPS,[]),get(SETTINGS,{}),get(PINS,[]),get(COLLAPSED,[]),get(FAVORITES,[]),get(NAMES,{}),
    get(SAVED_FILTERS,[]),get(MIGRATIONS,{}),get(NOTES,{}),get(HEALTH,{})
  ]);
  snaps=values[0];settings=Object.assign(settings,values[1]);pinned=new Set(values[2]||[]);collapsed=new Set(values[3]||[]);favorites=new Set(values[4]||[]);names=values[5]||{};
  savedFilters=Array.isArray(values[6])?values[6]:[];pluginMigrations=values[7]||{};sessionNotes=values[8]||{};health=values[9]||{};
  const[sr,pr]=await Promise.all([call('history.listSearches',{limit:20}),call('plugin.listInstalled')]);
  searches=sr.success&&Array.isArray(sr.data)?sr.data:[];installed=pr.success&&Array.isArray(pr.data)?pr.data:[];pluginMap=new Map(installed.map(p=>[p.pluginId,p]));
  const pf=$('pluginFilter');pf.innerHTML='<option value="">כל התוספים</option>'+installed.filter(p=>p.pluginId!=='timeline-plugin').map(p=>'<option value="'+esc(p.pluginId)+'">'+esc(p.name||p.pluginId)+'</option>').join('');
  sync();render();await updateTrackingStatus();await applyNewTabIntegration();await publishHomepageState();
}
function theme(t){
  const c=t&&t.colorScheme||{},r=document.documentElement.style;r.setProperty('--bg',c.surfaceContainerLowest||c.surface||'#fffbfe');r.setProperty('--surface',c.surface||'#fff');r.setProperty('--soft',c.surfaceContainer||'#f7f2fa');r.setProperty('--top',c.surfaceContainerHigh||c.surfaceContainer||'#f3edf7');r.setProperty('--text',c.onSurface||'#1d1b20');r.setProperty('--muted',c.onSurfaceVariant||c.outline||'#666');r.setProperty('--primary',c.primary||'#6750a4');r.setProperty('--outline',c.outlineVariant||c.outline||'#cac4d0');
}

$('search').oninput=render;$('type').onchange=render;$('pluginFilter').onchange=render;$('sort').onchange=render;
$('range').onchange=()=>{datePreset='all';selectedDayKey='';updateQuickButtons();render()};
document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>{viewMode=btn.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));render()});
document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{datePreset=btn.dataset.preset;selectedDayKey='';updateQuickButtons();render()});
$('favoritesOnly').onclick=()=>{favoritesOnly=!favoritesOnly;updateQuickButtons();render()};
$('saveFilterBtn').onclick=saveCurrentFilter;
$('savedFilterSelect').onchange=e=>{if(e.target.value!=='')applySavedFilter(e.target.value)};
$('zoomIn').onclick=()=>setTimelineZoom(Number(settings.timelineZoom||1)+.2);
$('zoomOut').onclick=()=>setTimelineZoom(Number(settings.timelineZoom||1)-.2);
$('snapshotBrowserBtn').onclick=showSnapshotBrowser;
$('dashboardBtn').onclick=showDashboard;
$('diagnosticsBtn').onclick=showDiagnostics;
$('pauseBtn').onclick=async()=>{settings.paused=!settings.paused;await set(SETTINGS,settings);sync();await notify(settings.paused?'תיעוד ציר הזמן הושהה':'תיעוד ציר הזמן חודש',settings.paused?'info':'success')};
$('continueBtn').onclick=()=>restoreSnapshot(snaps[snaps.length-1]);
$('snapshotBtn').onclick=()=>createSnapshot(true,true);
$('exportBtn').onclick=showExportDialog;
$('importBtn').onclick=importData;
$('clearBtn').onclick=async()=>{if(confirm('למחוק את כל ציר הזמן וה-Snapshots?')){events=[];snaps=[];pinned.clear();collapsed.clear();favorites.clear();names={};sessionNotes={};await Promise.all([set(EVENTS,[]),set(SNAPS,[]),set(NOTES,{}),persistMeta()]);render();await publishHomepageState();await notify('ציר הזמן נוקה','success')}};
$('settingsBtn').onclick=()=>$('dialog').classList.add('open');$('closeSettings').onclick=()=>$('dialog').classList.remove('open');
$('saveSettings').onclick=async()=>{
  settings.maxEvents=+$('maxEvents').value||5000;
  settings.inAppNotifications=$('notificationsEnabled').checked;
  settings.compactMode=$('compactMode').checked;
  settings.newTabIntegration=$('newTabIntegration').checked;
  settings.homepageIntegration=$('homepageIntegration').checked;
  await set(SETTINGS,settings);$('dialog').classList.remove('open');sync();await applyNewTabIntegration();await publishHomepageState();render();await notify('הגדרות ציר הזמן נשמרו','success');
};

Otzaria.on('plugin.boot',async p=>{theme(p.theme);await load()});
Otzaria.on('plugin.page_opened',async data=>{const param=data&&data.param;if(param&&param.action==='continueLatest'&&snaps.length)restoreSnapshot(snaps[snaps.length-1]);if(param&&param.view==='diagnostics')showDiagnostics();});
Otzaria.on('theme.changed',theme);
Otzaria.on('plugin.resumed',load);
})();