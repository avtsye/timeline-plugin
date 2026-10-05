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
let settings={paused:false,maxEvents:5000,retentionDays:180,inAppNotifications:true,compactMode:false,timelineZoom:1,newTabIntegration:false,homepageIntegration:true,language:'auto',focusMode:false,trackBooks:true,trackRefs:true,trackPlugins:true,trackTools:true,trackWorkspaces:true,trackNavigation:true,pauseUntil:0,pauseUntilRestart:false,summaryArchiveEnabled:true};
let pinned=new Set(),collapsed=new Set(),favorites=new Set(),names={},savedFilters=[],pluginMigrations={},sessionNotes={};
let viewMode='day',datePreset='all',selectedDayKey='',favoritesOnly=false;
let pluginMap=new Map(),health={},currentLang='he';
let virtualLimit=80,virtualObserver=null,lastRenderSignature='',searchTimer=null,liveRefreshTimer=null;
let eventIndex={byBook:new Map(),byPlugin:new Map(),byDay:new Map(),bySession:new Map(),search:new Map(),sortedDesc:[]};

const call=async(m,p={})=>{try{return await Otzaria.call(m,p)}catch(_){return{success:false,data:null,error:_}}};
const get=async(k,f)=>{const r=await call('storage.get',{key:k});return r&&r.success&&r.data!=null?r.data:f};
const set=(k,v)=>call('storage.set',{key:k,value:v});
const I18N={
he:{
settings:'הגדרות',settings_advanced:'מתקדם',data_storage:'שמירת נתונים',backup_archive:'גיבוי וארכיון',clear_all_hint:'מחיקת כל היסטוריית ציר הזמן מהמכשיר.',close:'סגור',save:'שמור',language:'שפה',language_auto:'אוטומטי לפי אוצריא',language_appearance:'שפה ומראה',
compact_mode:'מצב קומפקטי',timeline_actions:'פעולות ציר הזמן',save_snapshot:'שמור נקודת שחזור',all_snapshots:'כל נקודות השחזור',
activity_dashboard:'לוח פעילות',diagnostics:'אבחון',export:'ייצוא',import:'ייבוא',tracking_storage:'מעקב ואחסון',
max_events:'מספר אירועים מרבי',retention_period:'שמירת היסטוריה',retention_30:'30 ימים',retention_90:'90 ימים',retention_180:'180 ימים',retention_365:'שנה',retention_forever:'ללא הגבלה',in_app_notifications:'התראות פנימיות של אוצריא',integrations:'אינטגרציות',
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
book_visits:'ביקורים בספר',plugin_timeline:'ציר זמן של תוסף',visits:'אירועים',days:'ימים',places:'מקומות',open:'פתח',estimated_time:'זמן משוער',unique_locations:'מקומות ייחודיים',visit_sessions:'ביקורים',most_visited_places:'המקומות הנפוצים',activity_days:'ימי פעילות',first_visit:'ביקור ראשון',last_visit:'ביקור אחרון',load_more:'טען עוד',
restore_backup:'שחזר',missing_plugin_mapping:'מיפוי תוספים חסרים',no_missing_plugins:'אין תוספים חסרים',choose_replacement:'בחר תוסף חלופי…',
save_mapping:'שמור מיפוי',mapping_saved:'מיפוי התוסף נשמר',approx:'משוער',hour:'שעה',app_title:'ציר זמן',screen_timeline:'ציר הזמן',screen_overview:'סקירה',screen_restore:'שחזור',screen_analytics:'פעילות',screen_diagnostics:'אבחון',overview_subtitle:'סיכום הפעילות האחרונה',restore_subtitle:'נקודות שחזור וגיבויים',analytics_subtitle:'גרפים, מפות פעילות וסיכומים',diagnostics_subtitle:'מצב מעקב, הרשאות ובריאות הנתונים',settings_subtitle:'העדפות בסיסיות, מעקב ותחזוקה',statistics:'סטטיסטיקות',focus_mode:'מצב פוקוס',exit_focus:'צא ממצב פוקוס',settings_general:'כללי',settings_tracking:'מעקב',settings_backup:'גיבוי ושחזור',settings_integrations:'אינטגרציות',settings_maintenance:'תחזוקה ומשוב',tracking_types:'מה לתעד',track_books:'פתיחת ספרים',track_positions:'מיקומי קריאה',track_plugins:'תוספים',track_tools:'כלים מובנים',track_workspaces:'סביבות עבודה',track_navigation:'ניווט',privacy_mode:'מצב פרטיות',pause_one_hour:'השהה לשעה',pause_until_restart:'השהה עד הפעלה מחדש',resume_now:'חדש עכשיו',privacy_active_until:'המעקב מושהה עד',privacy_active_restart:'המעקב מושהה עד ההפעלה מחדש',privacy_inactive:'מצב פרטיות כבוי',backup_restore_actions:'גיבוי ושחזור',open_archive:'פתח ארכיון מתומצת',summary_archive_auto:'צור ארכיון מתומצת בגיבוי האוטומטי',feedback:'שליחת משוב',feedback_bug:'דיווח על תקלה',feedback_other:'משוב / הצעה',feedback_placeholder:'כתוב כאן את המשוב…',send_feedback:'שלח משוב',feedback_empty:'יש לכתוב תוכן לפני השליחה',feedback_sent:'המשוב נשלח',feedback_queued:'המשוב נשמר לשליחה מאוחרת',feedback_cancelled:'שליחת המשוב בוטלה',archive_title:'ארכיון מתומצת',archive_empty:'עדיין לא נוצר ארכיון מתומצת',archive_days:'ימים בארכיון',archive_events:'אירועים שסוכמו',session_actions:'פעולות',more:'עוד',cancel:'ביטול',confirm:'אישור',copy_details:'העתק פרטים',copied:'הפרטים הועתקו',open_history:'פתח היסטוריה',remove_favorite:'הסר ממועדפים',add_favorite:'הוסף למועדפים',filters:'מסננים',sort:'מיון',now:'עכשיו'
},
en:{
settings:'Settings',settings_advanced:'Advanced',data_storage:'Data storage',backup_archive:'Backup & archive',clear_all_hint:'Delete all Timeline history stored on this device.',close:'Close',save:'Save',language:'Language',language_auto:'Automatic — follow Otzaria',language_appearance:'Language & appearance',
compact_mode:'Compact mode',timeline_actions:'Timeline actions',save_snapshot:'Save restore point',all_snapshots:'All restore points',
activity_dashboard:'Activity dashboard',diagnostics:'Diagnostics',export:'Export',import:'Import',tracking_storage:'Tracking & storage',
max_events:'Maximum events',retention_period:'History retention',retention_30:'30 days',retention_90:'90 days',retention_180:'180 days',retention_365:'1 year',retention_forever:'Forever',in_app_notifications:'Otzaria in-app notifications',integrations:'Integrations',
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
book_visits:'Book visits',plugin_timeline:'Plugin timeline',visits:'events',days:'days',places:'places',open:'Open',estimated_time:'Estimated time',unique_locations:'Unique locations',visit_sessions:'Visits',most_visited_places:'Most visited places',activity_days:'Activity days',first_visit:'First visit',last_visit:'Last visit',load_more:'Load more',
restore_backup:'Restore',missing_plugin_mapping:'Map missing plugins',no_missing_plugins:'No missing plugins',choose_replacement:'Choose a replacement plugin…',
save_mapping:'Save mapping',mapping_saved:'Plugin mapping saved',approx:'estimated',hour:'hour',app_title:'Timeline',screen_timeline:'Timeline',screen_overview:'Overview',screen_restore:'Restore',screen_analytics:'Activity',screen_diagnostics:'Diagnostics',overview_subtitle:'Summary of recent activity',restore_subtitle:'Restore points and backups',analytics_subtitle:'Charts, activity maps, and summaries',diagnostics_subtitle:'Tracking, permissions, and data health',settings_subtitle:'Timeline, tracking, and integration preferences',statistics:'Statistics',focus_mode:'Focus mode',exit_focus:'Exit focus mode',settings_general:'General',settings_tracking:'Tracking',settings_backup:'Backup & restore',settings_integrations:'Integrations',settings_maintenance:'Maintenance & feedback',tracking_types:'What to track',track_books:'Book opens',track_positions:'Reading positions',track_plugins:'Plugins',track_tools:'Built-in tools',track_workspaces:'Workspaces',track_navigation:'Navigation',privacy_mode:'Privacy mode',pause_one_hour:'Pause for one hour',pause_until_restart:'Pause until restart',resume_now:'Resume now',privacy_active_until:'Tracking paused until',privacy_active_restart:'Tracking paused until restart',privacy_inactive:'Privacy mode is off',backup_restore_actions:'Backup & restore',open_archive:'Open compact archive',summary_archive_auto:'Create a compact archive during automatic backup',feedback:'Send feedback',feedback_bug:'Report a bug',feedback_other:'Feedback / suggestion',feedback_placeholder:'Write your feedback here…',send_feedback:'Send feedback',feedback_empty:'Write some feedback before sending',feedback_sent:'Feedback sent',feedback_queued:'Feedback queued for later delivery',feedback_cancelled:'Feedback sending cancelled',archive_title:'Compact archive',archive_empty:'No compact archive has been created yet',archive_days:'Archived days',archive_events:'Summarized events',session_actions:'Actions',more:'More',cancel:'Cancel',confirm:'Confirm',copy_details:'Copy details',copied:'Details copied',open_history:'Open history',remove_favorite:'Remove from favorites',add_favorite:'Add to favorites',filters:'Filters',sort:'Sort',now:'Now'
}};
const tr=(key,vars={})=>{
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
  document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(I18N[currentLang][key])el.textContent=tr(key)});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const key=el.dataset.i18nPlaceholder;if(I18N[currentLang][key])el.placeholder=tr(key)});
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{const key=el.dataset.i18nTitle;if(I18N[currentLang][key]){el.title=tr(key);el.setAttribute('aria-label',tr(key))}});
  document.title=currentLang==='he'?'ציר זמן':'Timeline';
}
async function registerLocalizedShortcuts(){
  await call('app.registerShortcut',{id:'open-timeline',label:currentLang==='he'?'פתח ציר זמן':'Open Timeline',key:'ctrl+alt+t',command:'openTimeline'});
  await call('app.registerShortcut',{id:'save-timeline-snapshot',label:currentLang==='he'?'שמור נקודת שחזור בציר הזמן':'Save a Timeline restore point',key:'ctrl+alt+s',command:'saveTimelineSnapshot'});
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
  closeContextMenu();
  const previousFocus=document.activeElement;
  const ov=document.createElement('div');ov.className='modalOverlay';
  const box=document.createElement('div');box.className='modalBox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const head=document.createElement('div');head.className='modalHead';
  const h=document.createElement('h2');h.textContent=title||'';const titleId='modal-title-'+Date.now().toString(36);h.id=titleId;box.setAttribute('aria-labelledby',titleId);
  const close=document.createElement('button');close.className='modalClose icon-btn';close.setAttribute('aria-label',tr('close'));close.innerHTML='<span data-icon="dismiss_24_regular">×</span>';
  let closed=false;
  const dispose=()=>{
    if(closed)return;closed=true;
    document.removeEventListener('keydown',onKey,true);
    ov.remove();
    if(previousFocus&&typeof previousFocus.focus==='function'&&document.contains(previousFocus))setTimeout(()=>previousFocus.focus(),0);
  };
  const requestClose=()=>{if(typeof ov.__requestClose==='function')ov.__requestClose();else dispose()};
  const onKey=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();requestClose();return}
    if(e.key==='Tab'){
      const focusable=[...box.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  };
  close.onclick=requestClose;
  head.appendChild(h);head.appendChild(close);box.appendChild(head);
  const body=document.createElement('div');box.appendChild(body);ov.appendChild(box);document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)requestClose()});
  document.addEventListener('keydown',onKey,true);
  if(bodyBuilder)bodyBuilder(body,dispose);
  applyShellIcons();
  setTimeout(()=>{const target=box.querySelector('input,select,textarea,button:not(.modalClose)')||close;target.focus()},0);
  ov.__closeModal=dispose;
  return ov;
}
function askText(title,initial=''){
  return new Promise(resolve=>{
    let settled=false,ov=null;
    const finish=value=>{if(settled)return;settled=true;if(ov){if(ov.__closeModal)ov.__closeModal();else ov.remove()}resolve(value)};
    ov=showModal(title,body=>{
      const input=document.createElement('input');input.className='nativeDialogInput';input.value=initial||'';input.autocomplete='off';
      const actions=document.createElement('div');actions.className='dialogActions';
      const cancel=document.createElement('button');cancel.className='actionGhost';cancel.textContent=tr('cancel');
      const ok=document.createElement('button');ok.className='actionRecommended';ok.textContent=tr('confirm');
      cancel.onclick=()=>finish(null);ok.onclick=()=>finish(input.value);
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finish(input.value)}};
      actions.append(cancel,ok);body.append(input,actions);setTimeout(()=>{input.focus();input.select()},0);
    });
    ov.__requestClose=()=>finish(null);
  });
}
function askConfirm(message,{danger=false}={}){
  return new Promise(resolve=>{
    let settled=false,ov=null;
    const finish=value=>{if(settled)return;settled=true;if(ov){if(ov.__closeModal)ov.__closeModal();else ov.remove()}resolve(value)};
    ov=showModal('',body=>{
      const text=document.createElement('div');text.className='dialogMessage';text.textContent=message;
      const actions=document.createElement('div');actions.className='dialogActions';
      const cancel=document.createElement('button');cancel.className='actionGhost';cancel.textContent=tr('cancel');
      const ok=document.createElement('button');ok.className=danger?'actionWarning':'actionRecommended';ok.textContent=tr('confirm');
      cancel.onclick=()=>finish(false);ok.onclick=()=>finish(true);
      actions.append(cancel,ok);body.append(text,actions);setTimeout(()=>ok.focus(),0);
    });
    ov.__requestClose=()=>finish(false);
  });
}
function bookKeyFromEvent(e){
  const d=e.data||{};
  return d.bookUid||d.currentBookId||d.bookId||d.currentBook||d.book||'';
}
function bookTitleFromEvent(e){
  const d=e.data||{};
  return d.currentBook||d.book||d.currentBookId||d.bookId||e.label||tr('book');
}
function eventsForBook(key){
  const k=String(key||'');
  return (eventIndex.byBook.get(k)||[]).slice();
}
function eventsForPlugin(id){
  const k=resolvedPluginId(id);
  return (eventIndex.byPlugin.get(k)||[]).slice();
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
  const parts=[mins+' '+tr('minutes'),books.size+' '+tr('books')];
  if(plugins.size)parts.push(plugins.size+' '+tr('plugins'));
  if(refs)parts.push(refs+' '+tr('position_changes'));
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
  for(const e of eventIndex.sortedDesc){
    if(!['book','ref'].includes(e.type))continue;
    const d=e.data||{},k=bookKeyFromEvent(e),ref=d.currentRef||d.ref||'';
    const key=k+'|'+ref;
    if(!k||seen.has(key))continue;
    seen.add(key);out.push({bookKey:k,title:bookTitleFromEvent(e),ref,time:e.time,event:e});
    if(out.length>=limit)break;
  }
  return out;
}


function dayTitle(ts){
  const k=dk(ts),now=Date.now();
  if(k===dk(now))return tr('today');
  if(k===dk(now-86400000))return tr('yesterday');
  return new Intl.DateTimeFormat(locale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(ts));
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
  if(viewMode==='week'){const start=Number(key.slice(2));return tr('week')+' '+fmtDate(start)+' – '+fmtDate(start+6*86400000)}
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
function rebuildEventIndex(){
  const byBook=new Map(),byPlugin=new Map(),byDay=new Map(),bySession=new Map(),search=new Map();
  const sortedDesc=events.slice().sort((a,b)=>b.time-a.time);
  for(const e of sortedDesc){
    const day=dk(e.time);if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(e);
    const sid=e.sessionId||'unknown';if(!bySession.has(sid))bySession.set(sid,[]);bySession.get(sid).push(e);
    if(['book','ref'].includes(e.type)){
      const key=String(bookKeyFromEvent(e)||'');
      if(key){if(!byBook.has(key))byBook.set(key,[]);byBook.get(key).push(e)}
    }
    if(e.type==='plugin'&&(e.data||{}).toolId){
      const id=resolvedPluginId(e.data.toolId);
      if(!byPlugin.has(id))byPlugin.set(id,[]);byPlugin.get(id).push(e);
    }
    search.set(e.id,eventSearchText(e));
  }
  eventIndex={byBook,byPlugin,byDay,bySession,search,sortedDesc};
}
function indexedSearchText(e){return eventIndex.search.get(e.id)||eventSearchText(e)}
function matchesAdvancedQuery(e,parsed){
  const text=indexedSearchText(e),d=e.data||{};
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
  const type=$('type').value,pluginFilter=$('pluginFilter').value,days=+$('range').value;
  const cut=days?Date.now()-days*86400000:0;
  let source=pluginFilter?(eventIndex.byPlugin.get(pluginFilter)||[]):eventIndex.sortedDesc;
  const out=[];
  for(const ev of source){
    if(cut&&ev.time<cut){
      if(!pluginFilter)break;
      continue;
    }
    if(type&&ev.type!==type)continue;
    if(pluginFilter&&resolvedPluginId((ev.data||{}).toolId)!==pluginFilter)continue;
    if(!matchesPreset(ev))continue;
    if(favoritesOnly&&!favorites.has(ev.id))continue;
    if(!matchesAdvancedQuery(ev,parsed))continue;
    out.push(ev);
  }
  if($('sort').value==='oldest')out.reverse();
  return out;
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
  for(let i=34;i>=0;i--){
    const t=Date.now()-i*86400000,k=dk(t),n=(eventIndex.byDay.get(k)||[]).length,b=document.createElement('button');
    b.className='heat '+(n>15?'h4':n>8?'h3':n>3?'h2':n?'h1':'');
    b.title=k+' · '+n+' '+tr('events');
    b.onclick=()=>{selectedDayKey=selectedDayKey===k?'':k;datePreset='all';updateQuickButtons();render()};
    box.appendChild(b);
  }
}
function renderSearches(){
  const b=$('recentSearches');
  b.innerHTML=searches.length?searches.slice(0,10).map(x=>'<button class="searchChip" data-q="'+esc(x.query)+'">'+esc(x.query)+'</button>').join(''):'<span class="muted">'+esc(tr('no_recent_searches'))+'</span>';
  b.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{
    await call('reader.openSearchTab',{query:btn.dataset.q,autoSearch:true});
    await call('navigation.goTo',{target:'reading'});
  });
}
function renderSnapshots(){
  $('snapshotCount').textContent=snaps.length?snaps.length+' '+tr('saved'):'';
  const box=$('snapshotGallery');box.innerHTML='';
  const recent=snaps.slice(-12).reverse();
  if(!recent.length){box.innerHTML='<span class="muted">'+esc(tr('no_snapshots'))+'</span>';return}
  for(const s of recent){
    const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId);
    const tools=(s.tabs||[]).filter(t=>t.toolId&&!t.isSelf);
    const el=document.createElement('button');el.className='snapshotCard';
    el.innerHTML='<span class="snapshotLeading" data-icon="history_24_regular"></span><span class="snapshotText"><b>'+fmtDate(s.time)+' · '+fmt(s.time)+'</b><small>'+books.length+' '+esc(tr('books'))+' · '+tools.length+' '+esc(tr('plugins'))+'/'+esc(tr('built_in_tool'))+(s.workspace&&s.workspace.name?' · '+esc(s.workspace.name):'')+'</small></span>';
    el.onclick=()=>restoreSnapshot(s);box.appendChild(el);
  }
  applyShellIcons();
}
function smartTitle(s){
  if(names[s.id])return names[s.id];
  const books=[...new Set(s.events.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBook||(e.data||{}).book||(e.data||{}).currentBookId||(e.data||{}).bookId).filter(Boolean))];
  const plugins=[...new Set(s.events.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const tools=[...new Set(s.events.filter(e=>e.type==='tool').map(e=>(e.data||{}).toolId).filter(Boolean))];
  if(books.length===1&&!plugins.length&&!tools.length)return tr('reading_in')+' '+books[0];
  if(plugins.length===1&&!books.length)return tr('work_with')+' '+pluginName(plugins[0]);
  const parts=[];
  if(books.length)parts.push(books.length+' '+tr('books'));
  if(plugins.length)parts.push(plugins.length+' '+tr('plugins'));
  if(tools.length)parts.push(tools.length+' '+tr('built_in_tool'));
  return parts.join(' · ')||tr('activity_in_otzaria');
}
function previewForSession(s){
  const last=s.events.slice().reverse().find(e=>['book','ref','plugin','tool'].includes(e.type));
  if(!last)return{title:tr('activity_in_otzaria'),ref:tr('no_identified_activity')};
  const d=last.data||{};
  if(last.type==='plugin')return{title:tr('plugin')+': '+pluginName(d.toolId||''),ref:tr('opened_during_session')};
  if(last.type==='tool')return{title:tr('tool')+': '+String(d.toolId||last.label).replace(/^builtin\./,''),ref:tr('opened_during_session')};
  return{title:d.currentBook||d.book||d.currentBookId||d.bookId||last.label||tr('book'),ref:d.currentRef||d.ref||''};
}
async function openPlugin(id){
  const target=resolvedPluginId(id);
  const p=pluginInfo(target);
  if(!p){await notify(tr('plugin_missing'),'error');return}
  if(!p.enabled){await notify(tr('plugin_disabled'),'error');return}
  const r=await call('plugin.openOther',{pluginId:target,param:{source:'timeline-plugin'}});
  if(!r.success)await notify(tr('plugin_open_failed'),'error');
}
async function openEvent(e){
  const d=e.data||{};
  if(e.type==='plugin'&&d.toolId){await openPlugin(d.toolId);return}
  if(e.type==='tool'){await notify(tr('builtin_open_unavailable'),'info');return}
  if(!['book','ref'].includes(e.type))return;
  const p={};const map={bookUid:d.bookUid,id:d.id,bookId:d.currentBookId||d.bookId||d.currentBook||d.book,type:d.type,source:d.source,index:d.currentIndex??d.index};
  for(const[k,v]of Object.entries(map))if(v!=null&&v!=='')p[k]=v;
  p.navigateToPositionIfReused=true;
  const r=await call('reader.openBook',p);
  if(r.success)await call('navigation.goTo',{target:'reading'});
}
async function renameSession(s){
  const next=await askText(tr('session_name'),names[s.id]||smartTitle(s));
  if(next===null)return;
  if(next.trim())names[s.id]=next.trim();else delete names[s.id];
  await set(NAMES,names);render();
}
async function deleteSession(s){
  if(!await askConfirm(tr('delete_session_confirm'),{danger:true}))return;
  events=events.filter(e=>e.sessionId!==s.id);
  s.events.forEach(e=>favorites.delete(e.id));
  pinned.delete(s.id);collapsed.delete(s.id);delete names[s.id];delete sessionNotes[s.id];
  await Promise.all([set(EVENTS,events),set(NOTES,sessionNotes),persistMeta()]);
  render();await notify(tr('session_deleted'),'success');
}
async function saveSessionAsWorkspace(s){
  const name=await askText(tr('workspace_name'),names[s.id]||smartTitle(s));
  if(!name||!name.trim())return;
  const cr=await call('workspace.create',{name:name.trim(),switchTo:true,reuseExisting:false});
  if(!cr.success){await notify(tr('workspace_create_failed'),'error');return}
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
  await notify(tr('session_saved_workspace'),'success');
}
function editSessionNote(s){
  showModal(tr('session_note'),body=>{
    const ta=document.createElement('textarea');ta.className='noteBox';ta.value=sessionNotes[s.id]||'';body.appendChild(ta);
    const actions=document.createElement('div');actions.className='actions';actions.style.marginTop='12px';
    const save=document.createElement('button');save.className='primary';save.textContent=tr('save');
    save.onclick=async()=>{
      if(ta.value.trim())sessionNotes[s.id]=ta.value.trim();else delete sessionNotes[s.id];
      await set(NOTES,sessionNotes);document.querySelector('.modalOverlay')?.remove();render();await notify(tr('note_saved'),'success');
    };
    actions.appendChild(save);body.appendChild(actions);
  });
}
async function exportPayload(payload,suggested){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const begin=await call('fs.beginBinaryWrite',{purpose:'user-file',expectedSize:blob.size});
  if(!begin.success){await notify(tr('export_failed'),'error');return}
  try{
    const res=await fetch(begin.data.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/json'},body:blob});
    if(!res.ok)throw new Error('upload');
    const save=await call('fs.commitUserFileWrite',{writeToken:begin.data.writeToken,suggestedName:suggested,extension:'json',title:tr('export_timeline')});
    if(save.success&&!save.data.cancelled)await notify(tr('export_saved'),'success');
  }catch(_){await call('fs.abortBinaryWrite',{writeToken:begin.data.writeToken});await notify(tr('export_failed'),'error')}
}
function exportSession(s){
  exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'session',exportedAt:new Date().toISOString(),events:s.events,snapshots:snapshotsForSession(s),name:names[s.id]||null,note:sessionNotes[s.id]||null},'timeline-session-'+dk(s.start));
}
function eventIconName(type){
  return {
    book:'book_open_24_regular',
    ref:'location_24_regular',
    plugin:'puzzle_piece_24_regular',
    tool:'wrench_24_regular',
    workspace:'window_multiple_24_regular',
    navigation:'arrow_routing_24_regular'
  }[type]||'history_24_regular';
}
function createMenuButton(className,iconName,label){
  const b=document.createElement('button');b.className=className;
  const ic=document.createElement('span');ic.className='menuButtonIcon';ic.dataset.icon=iconName;
  const tx=document.createElement('span');tx.textContent=label;b.append(ic,tx);return b;
}
function createSessionCard(s){
  const ssnaps=snapshotsForSession(s),nearest=nearestSnap(s.end);
  const books=[...new Set(s.events.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBook||(e.data||{}).book||(e.data||{}).currentBookId||(e.data||{}).bookId).filter(Boolean))];
  const plugins=[...new Set(s.events.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const tools=[...new Set(s.events.filter(e=>e.type==='tool').map(e=>(e.data||{}).toolId).filter(Boolean))];
  const preview=previewForSession(s),isPinned=pinned.has(s.id),isCollapsed=collapsed.has(s.id),dom=dominantType(s),note=sessionNotes[s.id]||'';

  const card=document.createElement('section');card.className='session type-'+dom+(isPinned?' pinned':'')+(isCollapsed?' collapsed':'');
  const head=document.createElement('div');head.className='sessionHead';
  const heading=document.createElement('div');heading.className='sessionHeading';
  const titleLine=document.createElement('div');titleLine.className='sessionTitleLine';
  const title=document.createElement('h3');title.textContent=smartTitle(s);titleLine.appendChild(title);
  if(isPinned){const pin=document.createElement('span');pin.className='sessionStatusIcon';pin.dataset.icon='pin_16_filled';pin.title=tr('pinned');titleLine.appendChild(pin)}
  const summary=document.createElement('div');summary.className='sessionSummary';summary.textContent=sessionSummary(s)+(nearest?' · '+tr('recent_snapshots')+' '+fmt(nearest.time):'');
  heading.append(titleLine,summary);

  const toolsBox=document.createElement('div');toolsBox.className='sessionTools';
  if(nearest){
    const restore=document.createElement('button');restore.className='restoreNearest sessionQuickAction';restore.title=tr('restore');restore.setAttribute('aria-label',tr('restore'));
    const ri=document.createElement('span');ri.dataset.icon='arrow_counterclockwise_24_regular';restore.appendChild(ri);restore.onclick=()=>restoreSnapshot(nearest);toolsBox.appendChild(restore);
  }
  const menu=document.createElement('details');menu.className='sessionMenu';
  const menuSummary=document.createElement('summary');menuSummary.title=tr('session_actions');menuSummary.setAttribute('aria-label',tr('session_actions'));
  const moreIcon=document.createElement('span');moreIcon.dataset.icon='more_horizontal_24_regular';moreIcon.textContent='⋯';menuSummary.appendChild(moreIcon);
  const panel=document.createElement('div');panel.className='sessionMenuPanel';
  const rename=createMenuButton('renameBtn','edit_24_regular',tr('name'));
  const noteBtn=createMenuButton('noteBtn','note_24_regular',tr('note'));
  const pinBtn=createMenuButton('pinBtn',isPinned?'pin_off_24_regular':'pin_24_regular',isPinned?tr('unpin'):tr('pin'));
  const collapseBtn=createMenuButton('collapseBtn',isCollapsed?'chevron_down_24_regular':'chevron_up_24_regular',isCollapsed?tr('expand'):tr('collapse'));
  const workspaceBtn=createMenuButton('workspaceBtn','window_multiple_24_regular',tr('to_workspace'));
  const exportBtn=createMenuButton('exportSessionBtn','arrow_export_24_regular',tr('export'));
  panel.append(rename,noteBtn,pinBtn,collapseBtn,workspaceBtn,exportBtn);
  if(ssnaps.length){
    const wrap=document.createElement('div');wrap.className='sessionSnapshotChoice';
    const ic=document.createElement('span');ic.dataset.icon='history_24_regular';
    const sel=document.createElement('select');sel.className='snapshotSelect';
    sel.innerHTML='<option value="">'+esc(tr('recent_snapshots'))+' ('+ssnaps.length+')</option>'+ssnaps.map((x,i)=>'<option value="'+i+'">'+fmt(x.time)+'</option>').join('');
    wrap.append(ic,sel);panel.appendChild(wrap);
  }
  const del=createMenuButton('deleteBtn danger','delete_24_regular',tr('delete'));panel.appendChild(del);
  menu.append(menuSummary,panel);toolsBox.appendChild(menu);
  head.append(heading,toolsBox);card.appendChild(head);

  const previewBox=document.createElement('div');previewBox.className='preview';
  const previewIcon=document.createElement('span');previewIcon.className='previewIcon';previewIcon.dataset.icon=dom==='plugin'?'puzzle_piece_24_regular':dom==='tool'?'wrench_24_regular':'book_open_24_regular';
  const previewContent=document.createElement('div');previewContent.className='previewContent';
  const previewTitle=document.createElement('strong');previewTitle.textContent=preview.title;
  const previewRef=document.createElement('div');previewRef.className='ref';previewRef.textContent=preview.ref||'';
  const meta=document.createElement('div');meta.className='sessionMeta';
  const metaParts=[];
  if(books.length)metaParts.push(books.length+' '+tr('books'));
  if(plugins.length)metaParts.push(plugins.length+' '+tr('plugins'));
  if(tools.length)metaParts.push(tools.length+' '+tr('built_in_tool'));
  meta.textContent=metaParts.join(' · ');
  previewContent.append(previewTitle,previewRef,meta);
  if(note){const nt=document.createElement('div');nt.className='sessionNote';nt.textContent=note;previewContent.appendChild(nt)}
  previewBox.append(previewIcon,previewContent);card.appendChild(previewBox);

  const eb=document.createElement('div');eb.className='events';
  for(const ev of s.events.slice().reverse()){
    const d=ev.data||{},row=document.createElement('div');row.className='event';row.tabIndex=0;
    const lead=document.createElement('span');lead.className='eventLeading';lead.dataset.icon=eventIconName(ev.type);
    const main=document.createElement('div');main.className='eventMain';
    const evTitle=document.createElement('b');evTitle.textContent=ev.type==='plugin'?pluginName(d.toolId):ev.label;
    const sub=document.createElement('small');sub.textContent=(d.currentRef||d.ref||d.screen||d.toolId||'')+(ev.count>1?' · '+ev.count:'');
    main.append(evTitle,sub);main.onclick=()=>openEvent(ev);
    const fav=document.createElement('button');fav.className='eventFav icon-btn';fav.title=tr('favorites');fav.setAttribute('aria-label',tr('favorites'));
    const fi=document.createElement('span');fi.dataset.icon=favorites.has(ev.id)?'star_24_filled':'star_24_regular';fav.appendChild(fi);
    fav.onclick=async e=>{e.stopPropagation();favorites.has(ev.id)?favorites.delete(ev.id):favorites.add(ev.id);await set(FAVORITES,[...favorites]);render()};
    const time=document.createElement('time');time.textContent=fmt(ev.time);
    row.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();showContextMenu(e.clientX,e.clientY,eventContextItems(ev))};
    row.append(lead,main,fav,time);eb.appendChild(row);
  }
  card.appendChild(eb);

  rename.onclick=()=>renameSession(s);noteBtn.onclick=()=>editSessionNote(s);
  pinBtn.onclick=async()=>{pinned.has(s.id)?pinned.delete(s.id):pinned.add(s.id);await set(PINS,[...pinned]);render()};
  collapseBtn.onclick=async()=>{collapsed.has(s.id)?collapsed.delete(s.id):collapsed.add(s.id);await set(COLLAPSED,[...collapsed]);render()};
  workspaceBtn.onclick=()=>saveSessionAsWorkspace(s);exportBtn.onclick=()=>exportSession(s);del.onclick=()=>deleteSession(s);
  const sel=card.querySelector('.snapshotSelect');if(sel)sel.onchange=()=>{const i=Number(sel.value);if(Number.isInteger(i)&&ssnaps[i])restoreSnapshot(ssnaps[i]);sel.value=''};
  return card;
}
function renderStats(list,ss){
  const times=estimateTimes(list);
  $('count').textContent=list.length;$('sessionCount').textContent=ss.length;
  $('bookCount').textContent=new Set(list.filter(e=>['book','ref'].includes(e.type)).map(e=>(e.data||{}).currentBookId||(e.data||{}).bookId||(e.data||{}).book).filter(Boolean)).size;
  $('pluginCount').textContent=new Set(list.filter(e=>e.type==='plugin').map(e=>(e.data||{}).toolId).filter(Boolean)).size;
  $('bookTime').textContent=times.books+' '+(currentLang==='he'?'דק׳':'min');$('toolTime').textContent=times.tools+' '+(currentLang==='he'?'דק׳':'min');
}
function estimateListMinutes(list){
  if(!list.length)return 0;
  const groups=new Map();
  for(const e of list){const k=e.sessionId||'__';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e)}
  let ms=0;
  for(const arr of groups.values()){
    arr.sort((a,b)=>a.time-b.time);
    for(let i=0;i<arr.length;i++){
      const e=arr[i],next=arr[i+1];
      const own=Math.max(0,Number(e.endTime||e.time)-Number(e.time||0));
      const gap=next?Math.max(0,next.time-e.time):0;
      ms+=Math.min(15*60000,Math.max(own,gap,60000));
    }
  }
  return Math.round(ms/60000);
}
function entityStats(list){
  if(!list.length)return{events:0,sessions:0,days:0,minutes:0,first:0,last:0};
  const times=list.map(e=>Number(e.time||0)).filter(Boolean);
  return{
    events:list.length,
    sessions:new Set(list.map(e=>e.sessionId).filter(Boolean)).size,
    days:new Set(list.map(e=>dk(e.time))).size,
    minutes:estimateListMinutes(list),
    first:Math.min(...times),
    last:Math.max(...times)
  };
}
function appendStatsRows(body,stats){
  const sec=makeNativeSection('');
  sec.section.classList.add('entityStatsSection');
  sec.list.appendChild(makeNativeRow({icon:'window_multiple_24_regular',title:tr('visit_sessions'),trailing:String(stats.sessions)}));
  sec.list.appendChild(makeNativeRow({icon:'calendar_24_regular',title:tr('activity_days'),trailing:String(stats.days)}));
  sec.list.appendChild(makeNativeRow({icon:'timer_24_regular',title:tr('estimated_time'),trailing:stats.minutes+' '+tr('minutes')}));
  sec.list.appendChild(makeNativeRow({icon:'history_24_regular',title:tr('first_visit'),trailing:stats.first?fmtDate(stats.first):'—'}));
  sec.list.appendChild(makeNativeRow({icon:'history_24_regular',title:tr('last_visit'),trailing:stats.last?fmtDate(stats.last)+' '+fmt(stats.last):'—'}));
  body.appendChild(sec.list);
}
function sessionGroupsForEvents(list){
  const m=new Map();
  for(const e of list){const k=e.sessionId||'unknown';if(!m.has(k))m.set(k,[]);m.get(k).push(e)}
  return[...m.entries()].map(([id,arr])=>{arr.sort((a,b)=>a.time-b.time);return{id,events:arr,start:arr[0].time,end:Math.max(...arr.map(e=>e.endTime||e.time))}}).sort((a,b)=>b.start-a.start);
}
function appendBatchedRows(target,items,rowFactory,batchSize=100){
  let shown=0,more=null;
  const append=()=>{
    const end=Math.min(items.length,shown+batchSize);
    for(;shown<end;shown++)target.appendChild(rowFactory(items[shown],shown));
    if(more)more.remove();
    if(shown<items.length){
      more=document.createElement('button');more.className='loadMoreRows';more.textContent=tr('load_more')+' ('+(items.length-shown)+')';
      more.onclick=append;target.parentNode.appendChild(more);
    }
    applyShellIcons();
  };
  append();
}
function showBookHistory(bookKey){
  const visits=eventsForBook(bookKey),title=visits.length?bookTitleFromEvent(visits[0]):String(bookKey);
  showModal(tr('book_visits')+' — '+title,body=>{
    if(!visits.length){body.innerHTML='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="book_open_24_regular"></div><div class="emptyTitle">'+esc(tr('no_activity'))+'</div></div>';applyShellIcons();return}
    const stats=entityStats(visits);appendStatsRows(body,stats);

    const placeCounts=new Map();
    for(const ev of visits){
      const d=ev.data||{},ref=d.currentRef||d.ref||'',index=d.currentIndex??d.index??'';
      const key=ref||String(index||'');if(!key)continue;
      const x=placeCounts.get(key)||{ref,index,count:0,last:0,event:ev};x.count++;x.last=Math.max(x.last,ev.time);if(ev.time>=x.event.time)x.event=ev;placeCounts.set(key,x);
    }
    const places=makeNativeSection(tr('most_visited_places'));
    [...placeCounts.values()].sort((a,b)=>b.count-a.count||b.last-a.last).slice(0,20).forEach(x=>{
      places.list.appendChild(makeNativeRow({icon:'location_24_regular',title:x.ref||String(x.index),subtitle:fmtDate(x.last)+' · '+fmt(x.last),trailing:String(x.count),action:()=>openEvent(x.event)}));
    });
    if(placeCounts.size)body.appendChild(places.section);

    const visitsSec=makeNativeSection(tr('visit_sessions')),groups=sessionGroupsForEvents(visits);
    body.appendChild(visitsSec.section);
    appendBatchedRows(visitsSec.list,groups,group=>{
      const last=group.events[group.events.length-1],d=last.data||{};
      return makeNativeRow({
        icon:'book_open_24_regular',
        title:d.currentRef||d.ref||title,
        subtitle:fmtDate(group.start)+' · '+fmt(group.start)+'–'+fmt(group.end),
        trailing:Math.max(1,Math.round((group.end-group.start)/60000))+' '+tr('minutes'),
        action:()=>openEvent(last)
      });
    });
  });
}
function showPluginHistory(pluginId){
  const list=eventsForPlugin(pluginId),name=pluginName(pluginId);
  showModal(tr('plugin_timeline')+' — '+name,body=>{
    const toolbar=document.createElement('div');toolbar.className='dialogToolbar';
    const open=document.createElement('button');open.className='actionRecommended';open.textContent=tr('open')+' '+tr('plugin');open.onclick=()=>openPlugin(pluginId);toolbar.appendChild(open);body.appendChild(toolbar);
    if(!list.length){body.innerHTML+='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="puzzle_piece_24_regular"></div><div class="emptyTitle">'+esc(tr('no_activity'))+'</div></div>';applyShellIcons();return}
    const stats=entityStats(list);appendStatsRows(body,stats);

    const groups=makeNativeSection(tr('visit_sessions')),allGroups=sessionGroupsForEvents(list);
    body.appendChild(groups.section);
    appendBatchedRows(groups.list,allGroups,group=>{
      const sessionAll=eventIndex.bySession.get(group.id)||[];
      const books=[...new Set(sessionAll.filter(e=>['book','ref'].includes(e.type)).map(e=>bookTitleFromEvent(e)).filter(Boolean))];
      return makeNativeRow({
        icon:'puzzle_piece_24_regular',
        title:fmtDate(group.start)+' · '+fmt(group.start)+'–'+fmt(group.end),
        subtitle:books.slice(0,3).join(' · ')||name,
        trailing:Math.max(1,Math.round((group.end-group.start)/60000))+' '+tr('minutes'),
        action:()=>openPlugin(pluginId)
      });
    });
  });
}
function aggregateDaily(days=30){
  const start=startOfDay(Date.now())-(days-1)*86400000,arr=[];
  for(let i=0;i<days;i++){const t=start+i*86400000,key=dk(t);arr.push({key,time:t,count:(eventIndex.byDay.get(key)||[]).length})}
  return arr;
}
function topBooks(limit=10){
  const out=[];
  for(const [k,list] of eventIndex.byBook.entries()){
    const last=list[0];if(!last)continue;
    out.push({key:k,title:bookTitleFromEvent(last),count:list.length,last:last.time});
  }
  return out.sort((a,b)=>b.count-a.count).slice(0,limit);
}
function topPlugins(limit=10){
  const out=[];
  for(const [k,list] of eventIndex.byPlugin.entries()){
    const last=list[0];if(!last)continue;
    out.push({key:k,title:pluginName(k),count:list.length,last:last.time,missing:!pluginMap.has(k)});
  }
  return out.sort((a,b)=>b.count-a.count).slice(0,limit);
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
  const out=[],now=Date.now(),current=startOfWeek(now);
  for(let i=count-1;i>=0;i--){
    const start=current-i*7*86400000,end=start+7*86400000;
    let total=0;for(let d=0;d<7;d++)total+=(eventIndex.byDay.get(dk(start+d*86400000))||[]).length;
    out.push({time:start,label:fmtDate(start),count:total});
  }
  return out;
}
function aggregateMonths(count=12){
  const out=[],now=new Date();
  for(let i=count-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1),next=new Date(d.getFullYear(),d.getMonth()+1,1);
    let total=0;
    for(const [day,list] of eventIndex.byDay.entries()){const ts=new Date(day+'T00:00:00').getTime();if(ts>=d.getTime()&&ts<next.getTime())total+=list.length}
    out.push({time:d.getTime(),label:new Intl.DateTimeFormat(locale(),{month:'short'}).format(d),count:total});
  }
  return out;
}
function makeNativeRow({icon='history_24_regular',title='',subtitle='',trailing='',action=null,buttonLabel=''}) {
  const row=document.createElement('div');row.className='native-row';
  const lead=document.createElement('span');lead.className='native-row-icon';lead.dataset.icon=icon;
  const main=document.createElement('div');main.className='native-row-main';
  const b=document.createElement('b');b.textContent=title;const s=document.createElement('small');s.textContent=subtitle||'';
  main.append(b,s);row.append(lead,main);
  if(trailing){const t=document.createElement('span');t.className='native-row-trailing';t.textContent=trailing;row.appendChild(t)}
  if(action){const btn=document.createElement('button');btn.textContent=buttonLabel||tr('open');btn.onclick=action;row.appendChild(btn)}
  return row;
}
function makeNativeSection(title){
  const section=document.createElement('section');section.className='native-section';
  const h=document.createElement('div');h.className='native-section-title';h.textContent=title;
  const list=document.createElement('div');list.className='native-list';
  section.append(h,list);return{section,list};
}
function renderAnalyticsScreen(){
  const host=$('analyticsContent');if(!host)return;host.innerHTML='';
  const charts=document.createElement('div');charts.className='analyticsCharts';
  const chartDefs=[
    [tr('day_activity'),aggregateDaily(30),x=>String(new Date(x.time).getDate())],
    [tr('weeks_activity'),aggregateWeeks(12),x=>new Intl.DateTimeFormat(locale(),{day:'numeric',month:'numeric'}).format(new Date(x.time))],
    [tr('months_activity'),aggregateMonths(12),x=>x.label]
  ];
  for(const [title,data,labelFn] of chartDefs){
    const block=document.createElement('section');block.className='native-chart-block';const h=document.createElement('h3');h.textContent=title;
    block.append(h,buildBarChart(data,labelFn));charts.appendChild(block);
  }
  host.appendChild(charts);

  const heatSection=document.createElement('section');heatSection.className='native-section';
  const hh=document.createElement('div');hh.className='native-section-title';hh.textContent=tr('year_heatmap');
  const year=document.createElement('div');year.className='yearHeat';const counts={};events.forEach(e=>counts[dk(e.time)]=(counts[dk(e.time)]||0)+1);
  for(let i=364;i>=0;i--){const tm=Date.now()-i*86400000,n=counts[dk(tm)]||0,cell=document.createElement('button');cell.className='heat '+(n>15?'h4':n>8?'h3':n>3?'h2':n?'h1':'');cell.title=dk(tm)+' · '+n;cell.onclick=()=>{selectedDayKey=dk(tm);datePreset='all';switchScreen('timeline');render()};year.appendChild(cell)}
  heatSection.append(hh,year);host.appendChild(heatSection);

  const tops=document.createElement('div');tops.className='topLists';
  const books=makeNativeSection(tr('top_books'));topBooks(12).forEach(x=>books.list.appendChild(makeNativeRow({icon:'book_open_24_regular',title:x.title,subtitle:fmtDate(x.last),trailing:String(x.count),action:()=>showBookHistory(x.key)})));tops.appendChild(books.section);
  const plugins=makeNativeSection(tr('top_plugins'));topPlugins(12).forEach(x=>plugins.list.appendChild(makeNativeRow({icon:'puzzle_piece_24_regular',title:x.title,subtitle:x.missing?tr('missing_plugins'):fmtDate(x.last),trailing:String(x.count),action:()=>showPluginHistory(x.key)})));tops.appendChild(plugins.section);
  const places=makeNativeSection(tr('recent_places'));recentPlaces(12).forEach(x=>places.list.appendChild(makeNativeRow({icon:'location_24_regular',title:x.title,subtitle:x.ref||'',trailing:fmt(x.time),action:()=>openEvent(x.event)})));tops.appendChild(places.section);
  host.appendChild(tops);applyShellIcons();
}
async function renderDiagnosticsScreen(){
  const host=$('diagnosticsContent');if(!host)return;host.innerHTML='';
  const perms=await call('app.getGrantedPermissions'),backups=await call('fs.listDir',{path:'backups'});
  const ps=perms.success&&perms.data&&Array.isArray(perms.data.permissions)?perms.data.permissions:[];
  const required=['app.run_on_startup','app.background_keep_alive','reader.open','workspace.manage','notifications.send'];
  const missing=required.filter(x=>!ps.includes(x));
  const bytes=new Blob([JSON.stringify({events,snaps,names,sessionNotes,savedFilters})]).size;
  const backupEntries=backups.success&&backups.data&&Array.isArray(backups.data.entries)?backups.data.entries.filter(x=>x.type==='file').sort((a,b)=>String(b.name).localeCompare(String(a.name))):[];
  const now=Date.now(),lastSnap=snaps.length?snaps[snaps.length-1].time:0;

  const healthSec=makeNativeSection(tr('health'));
  healthSec.list.appendChild(makeNativeRow({icon:missing.length?'warning_24_regular':'checkmark_circle_24_regular',title:missing.length?tr('missing_permissions')+': '+missing.length:tr('permissions_ok'),subtitle:missing.join(', '),trailing:missing.length?'!':'✓'}));
  healthSec.list.appendChild(makeNativeRow({icon:'database_24_regular',title:tr('storage'),subtitle:events.length+' '+tr('events')+' · '+snaps.length+' '+tr('recent_snapshots'),trailing:'~'+Math.round(bytes/1024)+' KB'}));
  healthSec.list.appendChild(makeNativeRow({icon:'history_24_regular',title:tr('last_snapshot'),subtitle:lastSnap?fmtDate(lastSnap)+' '+fmt(lastSnap):tr('no_data'),trailing:lastSnap&&now-lastSnap<35*60000?'✓':'!'}));
  healthSec.list.appendChild(makeNativeRow({icon:'archive_24_regular',title:tr('internal_backups'),subtitle:backupEntries.length+' '+tr('versions'),trailing:health.lastBackupAt?fmt(health.lastBackupAt):''}));
  healthSec.list.appendChild(makeNativeRow({icon:'pulse_24_regular',title:tr('tracking'),subtitle:health.lastEventAt?tr('last')+' '+fmt(health.lastEventAt):tr('no_event'),trailing:health.lastEventType||'—'}));
  healthSec.list.appendChild(makeNativeRow({icon:'puzzle_piece_24_regular',title:tr('missing_plugins'),subtitle:missingPluginIds().join(', '),trailing:String(missingPluginIds().length),action:missingPluginIds().length?showMigrationManager:null,buttonLabel:tr('missing_plugin_mapping')}));
  host.appendChild(healthSec.section);

  if(backupEntries.length){
    const backSec=makeNativeSection(tr('restore_internal_backup'));
    backupEntries.slice(0,5).forEach(x=>{const m=String(x.name).match(/backup-(\d+)\.json/),ts=m?Number(m[1]):0;backSec.list.appendChild(makeNativeRow({icon:'archive_24_regular',title:ts?fmtDate(ts)+' · '+fmt(ts):x.name,subtitle:Math.round(Number(x.size||0)/1024)+' KB',action:()=>restoreInternalBackup(x.path),buttonLabel:tr('restore_backup')}))});
    host.appendChild(backSec.section);
  }
  applyShellIcons();
}
function showDashboard(){switchScreen('analytics');renderAnalyticsScreen()}

function renderSignature(){
  return JSON.stringify([$('search').value,$('type').value,$('pluginFilter').value,$('range').value,$('sort').value,viewMode,datePreset,selectedDayKey,favoritesOnly,currentLang]);
}
function resetVirtualWindow(){
  virtualLimit=80;
  if(virtualObserver){virtualObserver.disconnect();virtualObserver=null}
}
function armVirtualSentinel(total){
  if(virtualLimit>=total)return;
  const cont=$('content');
  const sentinel=document.createElement('div');sentinel.className='virtualSentinel';sentinel.setAttribute('aria-hidden','true');
  const loading=document.createElement('div');loading.className='loadingMore';loading.textContent='…';
  cont.appendChild(loading);cont.appendChild(sentinel);
  virtualObserver=new IntersectionObserver(entries=>{
    if(entries.some(e=>e.isIntersecting)){
      virtualObserver.disconnect();virtualObserver=null;
      virtualLimit=Math.min(total,virtualLimit+80);
      render();
    }
  },{root:document.querySelector('.timeline-scroll'),rootMargin:'600px'});
  virtualObserver.observe(sentinel);
}
function closeContextMenu(){
  const host=$('contextMenuHost');if(host)host.innerHTML='';
}
function showContextMenu(x,y,items){
  closeContextMenu();
  const host=$('contextMenuHost'),menu=document.createElement('div');menu.className='contextMenu';menu.setAttribute('role','menu');
  for(const item of items){
    if(!item)continue;
    const b=document.createElement('button');b.setAttribute('role','menuitem');if(item.danger)b.classList.add('danger');
    if(item.icon){const ic=document.createElement('span');ic.className='contextMenuIcon';ic.dataset.icon=item.icon;b.appendChild(ic)}
    const tx=document.createElement('span');tx.textContent=item.label;b.appendChild(tx);
    b.onclick=async()=>{closeContextMenu();await item.action()};menu.appendChild(b);
  }
  menu.onkeydown=e=>{
    const buttons=[...menu.querySelectorAll('button')];const i=buttons.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){e.preventDefault();buttons[(i+1+buttons.length)%buttons.length]?.focus()}
    else if(e.key==='ArrowUp'){e.preventDefault();buttons[(i-1+buttons.length)%buttons.length]?.focus()}
    else if(e.key==='Home'){e.preventDefault();buttons[0]?.focus()}
    else if(e.key==='End'){e.preventDefault();buttons[buttons.length-1]?.focus()}
    else if(e.key==='Escape'){e.preventDefault();closeContextMenu()}
  };
  host.appendChild(menu);applyShellIcons();
  const rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(x,window.innerWidth-rect.width-8))+'px';
  menu.style.top=Math.max(8,Math.min(y,window.innerHeight-rect.height-8))+'px';
  setTimeout(()=>menu.querySelector('button')?.focus(),0);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);await notify(tr('copied'),'success')}catch(_){}
}
function eventContextItems(ev){
  const d=ev.data||{},items=[
    {icon:'open_24_regular',label:tr('open'),action:()=>openEvent(ev)},
    {icon:favorites.has(ev.id)?'star_off_24_regular':'star_24_regular',label:favorites.has(ev.id)?tr('remove_favorite'):tr('add_favorite'),action:async()=>{favorites.has(ev.id)?favorites.delete(ev.id):favorites.add(ev.id);await set(FAVORITES,[...favorites]);render()}},
    {icon:'copy_24_regular',label:tr('copy_details'),action:()=>copyText([ev.label,d.currentRef||d.ref||d.toolId||'',fmtDate(ev.time)+' '+fmt(ev.time)].filter(Boolean).join('\n'))}
  ];
  if(['book','ref'].includes(ev.type)&&bookKeyFromEvent(ev))items.splice(2,0,{icon:'history_24_regular',label:tr('open_history'),action:()=>showBookHistory(bookKeyFromEvent(ev))});
  if(ev.type==='plugin'&&d.toolId)items.splice(2,0,{icon:'history_24_regular',label:tr('open_history'),action:()=>showPluginHistory(d.toolId)});
  return items;
}
function sessionContextItems(s){
  return[
    {icon:'edit_24_regular',label:tr('name'),action:()=>renameSession(s)},
    {icon:'note_24_regular',label:tr('note'),action:()=>editSessionNote(s)},
    {icon:pinned.has(s.id)?'pin_off_24_regular':'pin_24_regular',label:pinned.has(s.id)?tr('unpin'):tr('pin'),action:async()=>{pinned.has(s.id)?pinned.delete(s.id):pinned.add(s.id);await set(PINS,[...pinned]);render()}},
    {icon:'arrow_download_24_regular',label:tr('export'),action:()=>exportSession(s)},
    {icon:'delete_24_regular',label:tr('delete'),danger:true,action:()=>deleteSession(s)}
  ];
}
async function refreshTimelineData(){
  const [ev,sn]=await Promise.all([get(EVENTS,[]),get(SNAPS,[])]);
  if(Array.isArray(ev))events=ev;if(Array.isArray(sn))snaps=sn;
  rebuildEventIndex();render();
}
function scheduleLiveRefresh(){
  clearTimeout(liveRefreshTimer);
  liveRefreshTimer=setTimeout(refreshTimelineData,250);
}
function minuteOfDay(ts){
  const d=new Date(ts);return d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
}
function timelineEventTitle(ev){
  const d=ev.data||{};
  if(ev.type==='plugin')return pluginName(d.toolId);
  if(ev.type==='book'||ev.type==='ref')return d.currentBook||d.book||d.currentBookId||d.bookId||ev.label;
  return ev.label||d.title||d.screen||d.toolId||ev.type;
}
function timelineEventSubtitle(ev){
  const d=ev.data||{};
  return d.currentRef||d.ref||d.screen||d.toolId||d.workspaceName||'';
}
function createTimelineEventNode(ev,index,pxPerMinute=1,cardShift=0){
  const side=index%2===0?'right':'left';
  const node=document.createElement('div');
  node.className='timelineEventNode '+side;
  node.tabIndex=0;
  node.dataset.eventId=ev.id||'';
  node.style.setProperty('--card-shift',cardShift+'px');

  const card=document.createElement('button');
  card.className='timelineEventCard';
  card.type='button';
  card.onclick=()=>openEvent(ev);

  const icon=document.createElement('span');
  icon.className='timelineEventIcon';
  icon.dataset.icon=eventIconName(ev.type);

  const content=document.createElement('span');
  content.className='timelineEventContent';
  const title=document.createElement('b');
  title.textContent=timelineEventTitle(ev);
  const sub=document.createElement('small');
  sub.textContent=timelineEventSubtitle(ev);
  content.append(title,sub);

  const time=document.createElement('time');
  time.textContent=fmt(ev.time);
  card.append(icon,content,time);

  const anchor=document.createElement('span');
  anchor.className='timelineEventAnchor';

  const connectorV=document.createElement('span');
  connectorV.className='timelineEventConnectorV';
  const elbowY=cardShift+20;
  connectorV.style.top=Math.min(0,elbowY)+'px';
  connectorV.style.height=Math.max(1,Math.abs(elbowY))+'px';

  const connectorH=document.createElement('span');
  connectorH.className='timelineEventConnectorH';
  connectorH.style.top=elbowY+'px';

  if(Number(ev.endTime||0)>Number(ev.time||0)){
    const duration=document.createElement('span');
    duration.className='timelineEventDuration';
    duration.style.height=Math.max(4,((ev.endTime-ev.time)/60000)*pxPerMinute)+'px';
    node.appendChild(duration);
  }

  const tip=document.createElement('div');
  tip.className='timelineTooltip';
  tip.innerHTML='<b>'+esc(timelineEventTitle(ev))+'</b><div>'+esc(timelineEventSubtitle(ev))+'</div><div>'+esc(fmt(ev.time))+'</div>';

  node.oncontextmenu=e=>{e.preventDefault();showContextMenu(e.clientX,e.clientY,eventContextItems(ev))};
  node.append(card,connectorV,connectorH,anchor,tip);
  return node;
}
function formatGap(ms){
  const mins=Math.max(1,Math.round(ms/60000));
  if(mins<60)return mins+' '+tr('minutes');
  const h=Math.floor(mins/60),m=mins%60;
  return h+' '+tr('hour')+(m?' '+m+' '+tr('minutes'):'');
}
function adaptiveGapPx(deltaMs,zoom){
  const mins=Math.max(0,deltaMs/60000);
  // Preserve chronology, but heavily compress long idle periods.
  // Dense events still receive a readable minimum separation.
  const base=34*zoom;
  if(mins<=5)return base;
  if(mins<=30)return base+Math.min(14,(mins-5)*0.55)*zoom;
  if(mins<=120)return base+(14+Math.log2(1+(mins-30)/15)*10)*zoom;
  return Math.min(96*zoom,base+36*zoom+Math.log2(1+(mins-120)/60)*12*zoom);
}
function buildAdaptiveTimelinePositions(events,zoom){
  const positions=new Map();
  if(!events.length)return{positions,height:180};
  let y=34;
  positions.set(events[0],y);
  for(let i=1;i<events.length;i++){
    const prev=events[i-1],cur=events[i];
    y+=adaptiveGapPx(Math.max(0,cur.time-prev.time),zoom);
    positions.set(cur,y);
  }
  return{positions,height:y+92*zoom};
}
function positionForTimeAdaptive(ts,events,positions,zoom){
  if(!events.length)return 34;
  if(ts<=events[0].time){
    const d=events[0].time-ts;
    return Math.max(18,positions.get(events[0])-Math.min(80*zoom,adaptiveGapPx(d,zoom)));
  }
  const last=events[events.length-1];
  if(ts>=last.time){
    const d=ts-last.time;
    return positions.get(last)+Math.min(120*zoom,adaptiveGapPx(d,zoom));
  }
  for(let i=1;i<events.length;i++){
    const a=events[i-1],b=events[i];
    if(ts<=b.time){
      const ya=positions.get(a),yb=positions.get(b);
      const ratio=(ts-a.time)/Math.max(1,b.time-a.time);
      return ya+(yb-ya)*ratio;
    }
  }
  return positions.get(last);
}
function renderTrueDayRail(rail,sessionItems,dayTs){
  rail.classList.add('trueDayRail','adaptiveTimelineRail');
  const zoom=Math.max(.5,Math.min(2.4,Number(settings.timelineZoom||1)));

  const unique=new Map();
  for(const session of sessionItems){
    for(const ev of session.events||[]){
      const key=ev.id||[ev.time,ev.type,timelineEventTitle(ev),timelineEventSubtitle(ev)].join('|');
      if(!unique.has(key))unique.set(key,ev);
    }
  }
  const eventsForDay=[...unique.values()].sort((a,b)=>a.time-b.time);
  const layout=buildAdaptiveTimelinePositions(eventsForDay,zoom);
  const positions=layout.positions;
  rail.style.height=Math.max(180,layout.height)+'px';

  // Context markers are based on actual content, not a fixed 24-hour ruler.
  let previous=null;
  eventsForDay.forEach((ev,index)=>{
    const y=positions.get(ev);
    if(previous){
      const gap=ev.time-previous.time;
      if(gap>=35*60000){
        const marker=document.createElement('div');
        marker.className='adaptiveGapMarker idleBreak';
        marker.style.top=((positions.get(previous)+y)/2)+'px';
        marker.dataset.gapMinutes=String(Math.round(gap/60000));
        const breakGlyph=document.createElement('span');
        breakGlyph.className='idleBreakGlyph';
        breakGlyph.setAttribute('aria-hidden','true');
        const label=document.createElement('span');
        label.className='idleBreakLabel';
        label.textContent=(currentLang==='he'?'הפסקה · ':'Pause · ')+formatGap(gap);
        marker.append(breakGlyph,label);
        rail.appendChild(marker);
      }
    }

    const side=index%2===0?'right':'left';
    const exactY=y;

    // Only cards move to avoid collisions. Points remain on the adaptive time axis.
    const node=createTimelineEventNode(ev,index,1,0);
    node.style.top=exactY+'px';
    node.dataset.side=side;
    rail.appendChild(node);
    previous=ev;
  });

  // Shift overlapping cards after they exist in the DOM, without changing their anchors.
  const lastBottom={left:-Infinity,right:-Infinity};
  [...rail.querySelectorAll('.timelineEventNode')].forEach(node=>{
    const side=node.dataset.side||'right';
    const card=node.querySelector('.timelineEventCard');
    if(!card)return;
    const anchorY=parseFloat(node.style.top)||0;
    const h=Math.max(40,card.offsetHeight||40);
    let desired=anchorY-h/2;
    if(desired<lastBottom[side]+2)desired=lastBottom[side]+2;
    const maxTop=Math.max(8,(parseFloat(rail.style.height)||180)-h-8);
    desired=Math.max(8,Math.min(maxTop,desired));
    const shift=desired-anchorY;
    node.style.setProperty('--card-shift',shift+'px');

    const v=node.querySelector('.timelineEventConnectorV');
    const hline=node.querySelector('.timelineEventConnectorH');
    const elbow=shift+h/2;
    if(v){v.style.top=Math.min(0,elbow)+'px';v.style.height=Math.max(1,Math.abs(elbow))+'px'}
    if(hline)hline.style.top=elbow+'px';
    lastBottom[side]=desired+h;
  });

  if(dk(dayTs)===dk(Date.now())&&eventsForDay.length){
    const nowY=positionForTimeAdaptive(Date.now(),eventsForDay,positions,zoom);
    const maxHeight=parseFloat(rail.style.height)||180;
    if(nowY>maxHeight-24)rail.style.height=(nowY+54)+'px';
    const nowLine=document.createElement('div');
    nowLine.className='dayNowLine adaptiveNowLine';
    nowLine.style.top=nowY+'px';
    const label=document.createElement('span');label.textContent=tr('now');
    nowLine.appendChild(label);rail.appendChild(nowLine);
  }

  rail.dataset.eventCount=String(eventsForDay.length);
}
function render(){
  const sig=renderSignature();
  if(sig!==lastRenderSignature){lastRenderSignature=sig;resetVirtualWindow()}
  const list=filtered(),allSessions=sessions(list),ss=allSessions.slice(0,virtualLimit);
  renderStats(list,allSessions);renderHeatmap();renderSearches();renderSnapshots();
  const cont=$('content');cont.innerHTML='';
  if(!allSessions.length){cont.innerHTML='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="history_24_regular"></div><div class="emptyTitle">'+esc(tr('no_activity'))+'</div></div>';applyShellIcons();updateContinue();return}
  const buckets=new Map();
  for(const s of ss){const key=bucketKey(s.start);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s)}
  for(const[key,items]of buckets){
    const wrap=document.createElement('section');wrap.className='bucket';
    if(viewMode==='day'){
      const dayEventCount=new Set(items.flatMap(s=>(s.events||[]).map(e=>e.id||[e.time,e.type,timelineEventTitle(e)].join('|')))).size;
      wrap.innerHTML='<div class="bucketTitle"><h2>'+esc(bucketTitle(key,items[0].start))+'</h2><span class="muted">'+dayEventCount+' '+esc(tr('events'))+'</span></div><div class="timelineRail"></div>';
      renderTrueDayRail(wrap.querySelector('.timelineRail'),items,items[0].start);
    }else{
      wrap.innerHTML='<div class="bucketTitle"><h2>'+esc(bucketTitle(key,items[0].start))+'</h2><span class="muted">'+items.length+' '+esc(tr('sessions'))+'</span></div><div class="sessionGrid"></div>';
      const grid=wrap.querySelector('.sessionGrid');items.forEach(s=>{const card=createSessionCard(s);card.tabIndex=0;card.dataset.sessionId=s.id;card.oncontextmenu=e=>{e.preventDefault();showContextMenu(e.clientX,e.clientY,sessionContextItems(s))};grid.appendChild(card)});
    }
    cont.appendChild(wrap);
  }
  armVirtualSentinel(allSessions.length);
  applyShellIcons();
  updateContinue();
}
function updateContinue(){
  const latest=snaps[snaps.length-1];$('continueBtn').disabled=!latest;
  $('continueInfo').textContent=latest?((latest.tabs||[]).filter(t=>t.bookId&&!t.toolId).length+' '+tr('books')+' · '+fmtDate(latest.time)+' · '+fmt(latest.time)):tr('no_snapshots');
}
async function createSnapshot(renderAfter=true,showNotice=true){
  const[rs,ws]=await Promise.all([call('reader.getCurrentState'),call('workspace.getActive')]);
  if(!rs.success||!rs.data){if(showNotice)await notify(tr('snapshot_create_failed'),'error');return null}
  const snap={id:'snap-'+Date.now().toString(36),time:Date.now(),workspace:ws.success?ws.data:null,active:{bookUid:rs.data.bookUid,bookId:rs.data.currentBookId,index:rs.data.currentIndex},tabs:rs.data.openTabs||[]};
  snaps.push(snap);if(snaps.length>300)snaps.splice(0,snaps.length-300);
  await set(SNAPS,snaps);if(renderAfter)render();if(showNotice)await notify(tr('snapshot_saved'),'success');await publishHomepageState();return snap;
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
  await notify(tr('snapshot_restored'),'success');
}
function restoreSnapshot(s){
  if(!s)return;
  const books=(s.tabs||[]).filter(t=>t.bookId&&!t.toolId),plugins=(s.tabs||[]).filter(t=>t.toolId&&!t.isSelf);
  showModal(tr('restore_preview'),body=>{
    const summary=document.createElement('div');summary.className='dialogSummary';
    summary.textContent=fmtDate(s.time)+' · '+fmt(s.time)+' — '+tr('select_books_restore');body.appendChild(summary);
    const list=document.createElement('div');list.className='native-list restoreSelectionList',checks=[];
    for(const tb of books){
      const id=String(tb.bookUid||tb.bookId),row=document.createElement('label');row.className='native-row restoreChoice';
      const icon=document.createElement('span');icon.className='native-row-icon';icon.dataset.icon='book_open_24_regular';
      const main=document.createElement('div');main.className='native-row-main';
      const b=document.createElement('b');b.textContent=tb.book||tb.bookId||id;
      const sub=document.createElement('small');sub.textContent=tb.currentRef||String(tb.index??'');
      main.append(b,sub);
      const input=document.createElement('input');input.type='checkbox';input.checked=true;input.className='restoreCheck';
      checks.push({id,input});row.append(icon,main,input);list.appendChild(row);
    }
    if(!books.length){list.innerHTML='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="book_open_24_regular"></div><div class="emptyTitle">'+esc(tr('no_activity'))+'</div></div>'}
    body.appendChild(list);
    if(plugins.length){const info=document.createElement('div');info.className='dialogSummary';info.textContent=plugins.length+' '+tr('plugins')+'/'+tr('built_in_tool');body.appendChild(info)}
    const actions=document.createElement('div');actions.className='dialogActions';
    const all=document.createElement('button');all.className='actionGhost';all.textContent=tr('select_all');all.onclick=()=>checks.forEach(x=>x.input.checked=true);
    const none=document.createElement('button');none.className='actionGhost';none.textContent=tr('clear_selection');none.onclick=()=>checks.forEach(x=>x.input.checked=false);
    const go=document.createElement('button');go.className='actionRecommended';go.textContent=tr('restore_selected');go.onclick=async()=>{const sel=checks.filter(x=>x.input.checked).map(x=>x.id);document.querySelector('.modalOverlay')?.remove();await performRestoreSnapshot(s,sel)};
    actions.append(all,none,go);body.appendChild(actions);applyShellIcons();
  });
}
function showSnapshotBrowser(){
  showModal(tr('all_restore_points'),body=>{
    if(!snaps.length){body.innerHTML='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="history_24_regular"></div><div class="emptyTitle">'+esc(tr('no_snapshots'))+'</div></div>';applyShellIcons();return}
    const list=document.createElement('div');list.className='native-list';
    snaps.slice().reverse().forEach(sn=>{
      const books=(sn.tabs||[]).filter(tb=>tb.bookId&&!tb.toolId),plugins=(sn.tabs||[]).filter(tb=>tb.toolId&&!tb.isSelf);
      list.appendChild(makeNativeRow({icon:'history_24_regular',title:fmtDate(sn.time)+' · '+fmt(sn.time),subtitle:books.length+' '+tr('books')+' · '+plugins.length+' '+tr('plugins')+(sn.workspace&&sn.workspace.name?' · '+sn.workspace.name:''),action:()=>restoreSnapshot(sn),buttonLabel:tr('preview_restore')}));
    });
    body.appendChild(list);applyShellIcons();
  });
}
function showExportDialog(){
  showModal(tr('export_timeline'),body=>{
    const p=document.createElement('p');p.className='muted';p.textContent=tr('choose_export');body.appendChild(p);
    const actions=document.createElement('div');actions.className='actions';
    const all=document.createElement('button');all.textContent=tr('all');all.onclick=()=>exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'all',exportedAt:new Date().toISOString(),events,snaps,settings,pins:[...pinned],collapsed:[...collapsed],favorites:[...favorites],names,sessionNotes,savedFilters,pluginMigrations},'otzaria-timeline-'+dk(Date.now()));
    const filteredBtn=document.createElement('button');filteredBtn.textContent=tr('filtered_view');filteredBtn.onclick=()=>{const ev=filtered(),times=ev.map(e=>e.time),min=times.length?Math.min(...times):0,max=times.length?Math.max(...times):0;exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'filtered',exportedAt:new Date().toISOString(),events:ev,snaps:snaps.filter(s=>s.time>=min-20*60000&&s.time<=max+20*60000)},'otzaria-timeline-filtered-'+dk(Date.now()))};
    const day=document.createElement('button');day.textContent=tr('today');day.onclick=()=>{const today=dk(Date.now()),ev=events.filter(e=>dk(e.time)===today);exportPayload({schemaVersion:1,plugin:'timeline-plugin',scope:'day',date:today,events:ev,snaps:snaps.filter(s=>dk(s.time)===today)},'otzaria-timeline-'+today)};
    actions.appendChild(all);actions.appendChild(filteredBtn);actions.appendChild(day);body.appendChild(actions);
  });
}
function mergeById(a,b){
  const m=new Map();
  [...(a||[]),...(b||[])].forEach(x=>{if(!x)return;const k=x.id||JSON.stringify([x.time,x.type,x.sessionId,x.label]);m.set(k,x)});
  return[...m.values()].sort((x,y)=>(x.time||0)-(y.time||0));
}
async function importData(){
  const pick=await call('fs.pickUserFile',{title:tr('import_timeline'),extensions:['json'],access:'read'});
  if(!pick.success||pick.data.cancelled)return;
  const read=await call('fs.readTextFile',{token:pick.data.token});await call('fs.revokeFile',{token:pick.data.token});
  if(!read.success){await notify(tr('read_file_failed'),'error');return}
  try{
    const data=JSON.parse(read.data);
    if(!data||data.plugin!=='timeline-plugin'||!Array.isArray(data.events))throw new Error('bad');
    if(!await askConfirm(tr('merge_import_confirm')))return;
    events=mergeById(events,data.events);snaps=mergeById(snaps,data.snaps||data.snapshots||[]);
    if(data.settings)settings=Object.assign(settings,data.settings);
    pinned=new Set([...pinned,...(data.pins||[])]);collapsed=new Set([...collapsed,...(data.collapsed||[])]);favorites=new Set([...favorites,...(data.favorites||[])]);
    names=Object.assign({},names,data.names||{});sessionNotes=Object.assign({},sessionNotes,data.sessionNotes||{});pluginMigrations=Object.assign({},pluginMigrations,data.pluginMigrations||{});
    if(Array.isArray(data.savedFilters))savedFilters=[...savedFilters,...data.savedFilters].slice(-30);
    await Promise.all([set(EVENTS,events),set(SNAPS,snaps),set(SETTINGS,settings),set(NOTES,sessionNotes),set(MIGRATIONS,pluginMigrations),set(SAVED_FILTERS,savedFilters),persistMeta()]);
    await resolveLanguage();await registerLocalizedShortcuts();applyTranslations();sync();render();await publishHomepageState();await notify(tr('import_done'),'success');
  }catch(_){await notify(tr('invalid_timeline_file'),'error')}
}
async function restoreInternalBackup(path){
  if(!await askConfirm(tr('restore_internal_confirm'),{danger:true}))return;
  const read=await call('fs.readFile',{path});
  if(!read.success||!read.data||typeof read.data.content!=='string'){await notify(tr('read_file_failed'),'error');return}
  try{
    const data=JSON.parse(read.data.content);
    if(!Array.isArray(data.events)||!Array.isArray(data.snaps))throw new Error('bad');
    events=data.events;snaps=data.snaps;if(data.settings)settings=Object.assign(settings,data.settings);
    await Promise.all([set(EVENTS,events),set(SNAPS,snaps),set(SETTINGS,settings)]);
    await resolveLanguage();applyTranslations();sync();render();await publishHomepageState();await notify(tr('backup_restored'),'success');
  }catch(_){await notify(tr('backup_invalid'),'error')}
}
async function showDiagnostics(){switchScreen('diagnostics');await renderDiagnosticsScreen()}
function updateSavedFilterSelect(){
  const el=$('savedFilterSelect');
  el.innerHTML='<option value="">'+esc(tr('saved_filters'))+'</option>'+savedFilters.map((x,i)=>'<option value="'+i+'">'+esc(x.name)+'</option>').join('');
}
async function saveCurrentFilter(){
  const name=await askText(tr('save_filter_name'));if(!name||!name.trim())return;
  savedFilters.push({name:name.trim(),search:$('search').value,type:$('type').value,plugin:$('pluginFilter').value,range:$('range').value,sort:$('sort').value,datePreset,selectedDayKey,favoritesOnly});
  if(savedFilters.length>30)savedFilters.shift();
  await set(SAVED_FILTERS,savedFilters);updateSavedFilterSelect();await notify(tr('filter_saved'),'success');
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
  if(!r.success&&settings.newTabIntegration)await notify(tr('plugin_open_failed'),'error');
}
async function publishHomepageState(){
  if(!settings.homepageIntegration){
    await call('publishedData.remove',{type:'tool.badge',scope:'global',key:'timeline-plugin:continue'});return;
  }
  const latest=snaps[snaps.length-1],recent=events.slice(-1)[0];
  await call('publishedData.upsert',{type:'tool.badge',scope:'global',key:'timeline-plugin:continue',payload:{
    title:tr('continue_work'),count:latest?((latest.tabs||[]).filter(tb=>tb.bookId&&!tb.toolId).length):0,
    label:latest?((currentLang==='he'?'ציר זמן':'Timeline')+' · '+fmtDate(latest.time)+' '+fmt(latest.time)):(currentLang==='he'?'ציר זמן':'Timeline'),source:'timeline-plugin',updatedAt:new Date().toISOString(),lastEvent:recent?recent.label:null
  }});
}
function missingPluginIds(){
  const ids=new Set(events.filter(e=>e.type==='plugin'&&(e.data||{}).toolId).map(e=>(e.data||{}).toolId));
  return [...ids].filter(id=>!pluginMap.has(resolvedPluginId(id)));
}
function showMigrationManager(){
  const missing=missingPluginIds();
  showModal(tr('missing_plugin_mapping'),body=>{
    if(!missing.length){body.innerHTML='<div class="empty nativeEmpty"><div class="emptyIcon" data-icon="puzzle_piece_24_regular"></div><div class="emptyTitle">'+esc(tr('no_missing_plugins'))+'</div></div>';applyShellIcons();return}
    const list=document.createElement('div');list.className='native-list';
    for(const oldId of missing){
      const row=document.createElement('div');row.className='native-row pluginMapRow';
      const icon=document.createElement('span');icon.className='native-row-icon';icon.dataset.icon='puzzle_piece_24_regular';
      const main=document.createElement('div');main.className='native-row-main';const b=document.createElement('b');b.textContent=oldId;const sub=document.createElement('small');sub.textContent=tr('choose_replacement');main.append(b,sub);
      const sel=document.createElement('select');sel.className='nativeInlineSelect';sel.innerHTML='<option value="">'+esc(tr('choose_replacement'))+'</option>'+installed.filter(p=>p.pluginId!=='timeline-plugin').map(p=>'<option value="'+esc(p.pluginId)+'">'+esc(p.name)+' ('+esc(p.pluginId)+')</option>').join('');
      const btn=document.createElement('button');btn.textContent=tr('save_mapping');btn.disabled=true;sel.onchange=()=>btn.disabled=!sel.value;
      btn.onclick=async()=>{if(!sel.value)return;pluginMigrations[oldId]=sel.value;await set(MIGRATIONS,pluginMigrations);document.querySelector('.modalOverlay')?.remove();render();await notify(tr('mapping_saved'),'success')};
      row.append(icon,main,sel,btn);list.appendChild(row);
    }
    body.appendChild(list);applyShellIcons();
  });
}
function updatePrivacyStatus(){
  const now=Date.now();
  if(settings.pauseUntilRestart){$('privacyStatus').textContent=tr('privacy_active_restart');return}
  if(Number(settings.pauseUntil||0)>now){$('privacyStatus').textContent=tr('privacy_active_until')+' '+fmt(settings.pauseUntil);return}
  $('privacyStatus').textContent=tr('privacy_inactive');
}
function setFocusMode(on){
  settings.focusMode=!!on;
  document.body.classList.toggle('focus-mode',settings.focusMode);
  const b=$('focusModeBtn');if(b){b.title=settings.focusMode?tr('exit_focus'):tr('focus_mode');b.setAttribute('aria-label',b.title)}
  set(SETTINGS,settings);
}
function activateSettingsTab(name){
  document.querySelectorAll('.settingsTabBtn').forEach(b=>{
    const active=b.dataset.settingsTab===name;
    b.classList.toggle('active',active);
    b.setAttribute('aria-selected',active?'true':'false');
    b.tabIndex=active?0:-1;
  });
  document.querySelectorAll('.settingsPane').forEach(p=>p.classList.toggle('active',p.dataset.settingsPane===name));
}
async function sendFeedback(){
  const details=$('feedbackText').value.trim();
  if(!details){await notify(tr('feedback_empty'),'error');return}
  const reportType=$('feedbackType').value||'other';
  const r=await call('feedback.report',{details,reportType});
  if(!r.success){await notify(tr('feedback_empty'),'error');return}
  if(r.data==='sent'){await notify(tr('feedback_sent'),'success');$('feedbackText').value=''}
  else if(r.data==='queued'){await notify(tr('feedback_queued'),'success');$('feedbackText').value=''}
  else if(r.data==='cancelled'){await notify(tr('feedback_cancelled'),'info')}
}
async function showSummaryArchive(){
  const r=await call('fs.readFile',{path:'backups/archive-summary.json'});
  if(!r.success||!r.data||typeof r.data.content!=='string'){await notify(tr('archive_empty'),'info');return}
  try{
    const data=JSON.parse(r.data.content),totals=data.totals||{};
    showModal(tr('archive_title'),body=>{
      const summary=document.createElement('div');summary.className='native-list archiveTotals';
      summary.appendChild(makeNativeRow({icon:'history_24_regular',title:tr('archive_events'),trailing:String(Number(totals.events||0))}));
      summary.appendChild(makeNativeRow({icon:'calendar_24_regular',title:tr('archive_days'),trailing:String(Number(totals.days||0))}));
      summary.appendChild(makeNativeRow({icon:'save_24_regular',title:tr('recent_snapshots'),trailing:String(Number(totals.snapshots||0))}));
      body.appendChild(summary);
      const sec=makeNativeSection(tr('archive_days')),days=Object.entries(data.days||{}).sort((a,b)=>b[0].localeCompare(a[0]));
      days.slice(0,120).forEach(([date,x])=>sec.list.appendChild(makeNativeRow({icon:'calendar_24_regular',title:date,subtitle:Number(x.events||0)+' '+tr('events'),trailing:Number(x.sessions||0)+' '+tr('sessions')})));
      body.appendChild(sec.section);applyShellIcons();
    });
  }catch(_){await notify(tr('archive_empty'),'error')}
}
function updateQuickButtons(){
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===datePreset&&!selectedDayKey));
  $('favoritesOnly').classList.toggle('active',favoritesOnly);
}
async function updateTrackingStatus(){
  const info=await call('app.getGrantedPermissions');
  const perms=info.success&&info.data&&Array.isArray(info.data.permissions)?info.data.permissions:[];
  return{
    runOnStartup:perms.includes('app.run_on_startup'),
    keepAlive:perms.includes('app.background_keep_alive')
  };
}
function sync(){
  $('pauseBtn').textContent=settings.paused?tr('resume_tracking'):tr('pause_tracking');
  $('maxEvents').value=String(settings.maxEvents||5000);
  $('retentionDays').value=String(settings.retentionDays??180);
  $('notificationsEnabled').checked=settings.inAppNotifications!==false;
  $('compactMode').checked=!!settings.compactMode;
  $('newTabIntegration').checked=!!settings.newTabIntegration;
  $('homepageIntegration').checked=settings.homepageIntegration!==false;
  $('languageSelect').value=settings.language||'auto';
  $('trackBooks').checked=settings.trackBooks!==false;
  $('trackRefs').checked=settings.trackRefs!==false;
  $('trackPlugins').checked=settings.trackPlugins!==false;
  $('trackTools').checked=settings.trackTools!==false;
  $('trackWorkspaces').checked=settings.trackWorkspaces!==false;
  $('trackNavigation').checked=settings.trackNavigation!==false;
  $('summaryArchiveEnabled').checked=settings.summaryArchiveEnabled!==false;
  document.body.classList.toggle('focus-mode',!!settings.focusMode);
  if($('focusModeBtn')){$('focusModeBtn').title=settings.focusMode?tr('exit_focus'):tr('focus_mode');$('focusModeBtn').setAttribute('aria-label',$('focusModeBtn').title)}
  updatePrivacyStatus();
  $('zoomLabel').textContent=Math.round(Number(settings.timelineZoom||1)*100)+'%';
  document.body.classList.toggle('compact',!!settings.compactMode);
  updateSavedFilterSelect();updateQuickButtons();applyTranslations();
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
  await resolveLanguage();
  await registerLocalizedShortcuts();
  const[sr,pr]=await Promise.all([call('history.listSearches',{limit:20}),call('plugin.listInstalled')]);
  searches=sr.success&&Array.isArray(sr.data)?sr.data:[];installed=pr.success&&Array.isArray(pr.data)?pr.data:[];pluginMap=new Map(installed.map(p=>[p.pluginId,p]));
  rebuildEventIndex();
  const pf=$('pluginFilter');
  pf.innerHTML='<option value="">'+esc(tr('all_plugins'))+'</option>'+installed.filter(p=>p.pluginId!=='timeline-plugin').map(p=>'<option value="'+esc(p.pluginId)+'">'+esc(p.name||p.pluginId)+'</option>').join('');
  enhanceSettingsRows();enhanceSelects();applyShellIcons();sync();render();switchScreen('timeline');await updateTrackingStatus();await applyNewTabIntegration();await publishHomepageState();
}
function theme(payload){
  if(!payload||!payload.colorScheme)return;
  const cs=payload.colorScheme,tg=payload.typography||{},r=document.documentElement.style;
  const roles={
    '--color-primary':cs.primary,'--color-on-primary':cs.onPrimary,
    '--color-primary-container':cs.primaryContainer,'--color-on-primary-container':cs.onPrimaryContainer,
    '--color-secondary':cs.secondary,'--color-on-secondary':cs.onSecondary,
    '--color-secondary-container':cs.secondaryContainer,'--color-on-secondary-container':cs.onSecondaryContainer,
    '--color-tertiary':cs.tertiary,'--color-on-tertiary':cs.onTertiary,
    '--color-tertiary-container':cs.tertiaryContainer,'--color-on-tertiary-container':cs.onTertiaryContainer,
    '--color-surface':cs.surface,'--color-on-surface':cs.onSurface,'--color-on-surface-variant':cs.onSurfaceVariant,
    '--color-surface-container-lowest':cs.surfaceContainerLowest,'--color-surface-container-low':cs.surfaceContainerLow,
    '--color-surface-container':cs.surfaceContainer,'--color-surface-container-high':cs.surfaceContainerHigh,
    '--color-surface-container-highest':cs.surfaceContainerHighest,
    '--color-error':cs.error,'--color-on-error':cs.onError,'--color-error-container':cs.errorContainer,'--color-on-error-container':cs.onErrorContainer,
    '--color-outline':cs.outline,'--color-outline-variant':cs.outlineVariant,
    '--color-inverse-surface':cs.inverseSurface,'--color-on-inverse-surface':cs.onInverseSurface,'--color-inverse-primary':cs.inversePrimary,
    '--color-shadow':cs.shadow,'--color-scrim':cs.scrim,'--color-surface-tint':cs.surfaceTint
  };
  for(const[k,v]of Object.entries(roles))if(v)r.setProperty(k,v);
  if(tg.uiFontFamily)r.setProperty('--font-ui',"'"+tg.uiFontFamily+"',system-ui,sans-serif");
  if(tg.fontFamily)r.setProperty('--font-main',"'"+tg.fontFamily+"','David',serif");
  if(tg.commentatorsFontFamily)r.setProperty('--font-commentators',"'"+tg.commentatorsFontFamily+"','David',serif");
  if(tg.fontSize)r.setProperty('--font-size-base',String(tg.fontSize)+'px');
  if(tg.commentatorsFontSize)r.setProperty('--font-size-commentators',String(tg.commentatorsFontSize)+'px');
  if(tg.lineHeight)r.setProperty('--line-height',String(tg.lineHeight));
  document.body.classList.toggle('dark-mode',payload.mode==='dark');
}
const SETTINGS_ICON_MAP={
  compactMode:'layout_column_two_24_regular',
  trackBooks:'book_open_24_regular',
  trackRefs:'location_24_regular',
  trackPlugins:'puzzle_piece_24_regular',
  trackTools:'wrench_24_regular',
  trackWorkspaces:'window_multiple_24_regular',
  trackNavigation:'arrow_routing_24_regular',
  notificationsEnabled:'alert_24_regular',
  summaryArchiveEnabled:'archive_24_regular',
  newTabIntegration:'add_square_24_regular',
  homepageIntegration:'home_24_regular'
};
function enhanceSettingsRows(){
  document.querySelectorAll('.settingsSection .checkRow').forEach(row=>{
    if(row.dataset.nativeEnhanced)return;row.dataset.nativeEnhanced='1';
    const input=row.querySelector('input'),label=row.querySelector('span');
    if(!input||!label)return;
    const content=document.createElement('span');content.className='settingTileContent';
    const icon=document.createElement('span');icon.className='settingTileIcon';icon.dataset.icon=SETTINGS_ICON_MAP[input.id]||'settings_24_regular';
    const text=document.createElement('span');text.className='settingTileText';text.textContent=label.textContent;
    content.append(icon,text);label.replaceWith(content);
  });
}
function enhanceSelects(){
  document.querySelectorAll('select').forEach(sel=>{
    if(sel.closest('.appDropdown')||sel.classList.contains('snapshotSelect'))return;
    const wrap=document.createElement('span');wrap.className='appDropdown';
    sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);
    const chev=document.createElement('span');chev.className='appDropdownChevron';chev.dataset.icon='chevron_down_20_regular';chev.textContent='⌄';wrap.appendChild(chev);
  });
}
function applyShellIcons(){
  const map=window.OFFICIAL_FLUENT_ICONS||{};
  document.querySelectorAll('[data-icon]').forEach(el=>{
    const nav=el.closest('.nav-item[data-screen]');
    const name=nav&&nav.classList.contains('active')&&el.dataset.iconActive?el.dataset.iconActive:el.dataset.icon;
    const svg=map[name]||map[el.dataset.icon];
    if(svg)el.innerHTML=svg;
  });
}
async function refreshThemeFromHost(){
  const r=await call('app.getTheme');
  if(r&&r.success&&r.data)theme(r.data);
}
function switchScreen(name){
  const valid=['timeline','overview','restore','analytics','diagnostics','settings'];
  if(!valid.includes(name))name='timeline';
  document.querySelectorAll('[data-screen-panel]').forEach(p=>{const active=p.dataset.screenPanel===name;p.classList.toggle('active',active);p.setAttribute('aria-hidden',active?'false':'true')});
  document.querySelectorAll('.nav-item[data-screen]').forEach(b=>{
    const active=b.dataset.screen===name;
    b.classList.toggle('active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
  applyShellIcons();
  const titleKeys={timeline:'screen_timeline',overview:'screen_overview',restore:'screen_restore',analytics:'screen_analytics',diagnostics:'screen_diagnostics',settings:'settings'};
  const title=$('currentScreenTitle');if(title)title.textContent=tr(titleKeys[name]||'screen_timeline');
  settings.lastScreen=name;set(SETTINGS,settings);
  if(name==='timeline')setTimeout(()=>{const q=$('search');if(q)q.focus()},0);
  if(name==='analytics')renderAnalyticsScreen();
  if(name==='diagnostics'){updateTrackingStatus();renderDiagnosticsScreen();}
}

document.querySelectorAll('.nav-item[data-screen]').forEach(btn=>btn.onclick=()=>switchScreen(btn.dataset.screen));
$('search').oninput=()=>{const box=$('searchBox');box.classList.toggle('has-text',!!$('search').value);clearTimeout(searchTimer);searchTimer=setTimeout(render,120)};
$('searchClear').onclick=()=>{$('search').value='';$('searchBox').classList.remove('has-text');$('search').focus();render()};$('type').onchange=render;$('pluginFilter').onchange=render;$('sort').onchange=render;
$('range').onchange=()=>{datePreset='all';selectedDayKey='';updateQuickButtons();render()};
document.querySelectorAll('[data-view]').forEach(btn=>btn.onclick=()=>{
  viewMode=btn.dataset.view;
  document.querySelectorAll('[data-view]').forEach(x=>{const active=x===btn;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active?'true':'false')});
  render()
});
document.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{datePreset=btn.dataset.preset;selectedDayKey='';updateQuickButtons();render()});
$('favoritesOnly').onclick=()=>{favoritesOnly=!favoritesOnly;updateQuickButtons();render()};
$('saveFilterBtn').onclick=saveCurrentFilter;
$('savedFilterSelect').onchange=e=>{if(e.target.value!=='')applySavedFilter(e.target.value)};
$('zoomIn').onclick=()=>setTimelineZoom(Number(settings.timelineZoom||1)+.2);
$('zoomOut').onclick=()=>setTimelineZoom(Number(settings.timelineZoom||1)-.2);
$('snapshotBrowserBtn').onclick=showSnapshotBrowser;
$('openArchiveBtn').onclick=showSummaryArchive;
$('sendFeedbackBtn').onclick=sendFeedback;
$('focusModeBtn').onclick=()=>setFocusMode(!settings.focusMode);
$('filterToggleBtn').onclick=e=>{e.stopPropagation();const p=$('filtersPopover');p.hidden=!p.hidden;$('filterToggleBtn').setAttribute('aria-expanded',p.hidden?'false':'true');if(!p.hidden){applyShellIcons();setTimeout(()=>p.querySelector('select')?.focus(),0)}};
$('focusExitBtn').onclick=()=>setFocusMode(false);
document.querySelectorAll('.settingsTabBtn').forEach(btn=>{
  btn.onclick=()=>activateSettingsTab(btn.dataset.settingsTab);
  btn.onkeydown=e=>{
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    const tabs=[...document.querySelectorAll('.settingsTabBtn')];
    const current=tabs.indexOf(btn);
    let next=current;
    if(e.key==='ArrowDown')next=(current+1)%tabs.length;
    if(e.key==='ArrowUp')next=(current-1+tabs.length)%tabs.length;
    if(e.key==='Home')next=0;
    if(e.key==='End')next=tabs.length-1;
    e.preventDefault();activateSettingsTab(tabs[next].dataset.settingsTab);tabs[next].focus();
  };
});
$('privacyHourBtn').onclick=async()=>{settings.pauseUntil=Date.now()+60*60*1000;settings.pauseUntilRestart=false;await set(SETTINGS,settings);updatePrivacyStatus();await notify(tr('tracking_paused'),'info')};
$('privacySessionBtn').onclick=async()=>{settings.pauseUntilRestart=true;settings.pauseUntil=0;await set(SETTINGS,settings);updatePrivacyStatus();await notify(tr('tracking_paused'),'info')};
$('privacyResumeBtn').onclick=async()=>{settings.pauseUntilRestart=false;settings.pauseUntil=0;settings.paused=false;await set(SETTINGS,settings);sync();await notify(tr('tracking_resumed'),'success')};
$('pauseBtn').onclick=async()=>{settings.paused=!settings.paused;await set(SETTINGS,settings);sync();await notify(settings.paused?tr('tracking_paused'):tr('tracking_resumed'),settings.paused?'info':'success')};
$('continueBtn').onclick=()=>restoreSnapshot(snaps[snaps.length-1]);
$('snapshotBtn').onclick=()=>createSnapshot(true,true);
$('exportBtn').onclick=showExportDialog;
$('importBtn').onclick=importData;
$('clearBtn').onclick=async()=>{if(await askConfirm(tr('clear_all_confirm'),{danger:true})){events=[];snaps=[];pinned.clear();collapsed.clear();favorites.clear();names={};sessionNotes={};await Promise.all([set(EVENTS,[]),set(SNAPS,[]),set(NOTES,{}),persistMeta()]);render();await publishHomepageState();await notify(tr('timeline_cleared'),'success')}};
$('saveSettings').onclick=async()=>{
  settings.maxEvents=+$('maxEvents').value||5000;
  settings.retentionDays=+$('retentionDays').value;
  settings.inAppNotifications=$('notificationsEnabled').checked;
  settings.compactMode=$('compactMode').checked;
  settings.newTabIntegration=$('newTabIntegration').checked;
  settings.homepageIntegration=$('homepageIntegration').checked;
  settings.language=$('languageSelect').value||'auto';
  settings.trackBooks=$('trackBooks').checked;
  settings.trackRefs=$('trackRefs').checked;
  settings.trackPlugins=$('trackPlugins').checked;
  settings.trackTools=$('trackTools').checked;
  settings.trackWorkspaces=$('trackWorkspaces').checked;
  settings.trackNavigation=$('trackNavigation').checked;
  settings.summaryArchiveEnabled=$('summaryArchiveEnabled').checked;
  await set(SETTINGS,settings);
  await resolveLanguage();applyTranslations();sync();
  await applyNewTabIntegration();await publishHomepageState();render();await updateTrackingStatus();await notify(tr('settings_saved'),'success');
};

document.addEventListener('click',e=>{if(!e.target.closest('.contextMenu'))closeContextMenu();const p=$('filtersPopover');if(p&&!p.hidden&&!e.target.closest('#filtersPopover')&&!e.target.closest('#filterToggleBtn')){p.hidden=true;$('filterToggleBtn')?.setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){e.preventDefault();switchScreen('timeline');$('search').focus();$('search').select();return}
  if(e.key==='Escape'){
    const fp=$('filtersPopover');if(fp&&!fp.hidden){fp.hidden=true;$('filterToggleBtn')?.setAttribute('aria-expanded','false');$('filterToggleBtn')?.focus();e.preventDefault();return}
    closeContextMenu();
    if(settings.focusMode){setFocusMode(false);return}
    if(document.activeElement===$('search')&&$('search').value){$('search').value='';$('searchBox').classList.remove('has-text');render();return}
  }
  if(e.altKey&&/^[1-6]$/.test(e.key)){
    e.preventDefault();const names=['timeline','overview','restore','analytics','diagnostics','settings'];switchScreen(names[Number(e.key)-1]);return
  }
  if((e.key==='j'||e.key==='k')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){
    const nodes=[...document.querySelectorAll('.timelineEventNode,[data-session-id].session')];if(!nodes.length)return;
    const cur=Math.max(0,nodes.indexOf(document.activeElement));const next=e.key==='j'?Math.min(nodes.length-1,cur+1):Math.max(0,cur-1);nodes[next].focus();nodes[next].scrollIntoView({block:'nearest'});e.preventDefault();
  }
});
Otzaria.on('plugin.boot',async p=>{theme(p.theme);await refreshThemeFromHost();await load()});
Otzaria.on('plugin.page_opened',async data=>{const param=data&&data.param;if(param&&param.action==='continueLatest'&&snaps.length)restoreSnapshot(snaps[snaps.length-1]);if(param&&param.view==='diagnostics')switchScreen('diagnostics');});
Otzaria.on('theme.changed',theme);
Otzaria.on('workspace.changed',scheduleLiveRefresh);
Otzaria.on('reader.current_book_changed',scheduleLiveRefresh);
Otzaria.on('reader.current_ref_changed',scheduleLiveRefresh);
Otzaria.on('navigation.changed',scheduleLiveRefresh);
Otzaria.on('plugin.resumed',async()=>{await refreshThemeFromHost();await load()});
})();