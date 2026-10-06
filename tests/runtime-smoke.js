const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');

const ids=[...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const missing=[...new Set(ids)].filter(id=>!html.includes('id="'+id+'"'));
if(missing.length) throw new Error('Missing DOM ids: '+missing.join(', '));

const required=[
  'function render()','function createSessionCard','function updateTrackingStatus',
  'function dayTitle(ts)','function theme(payload)','function showSummaryArchive',
  'async function sendFeedback'
];
for(const token of required){
  if(!app.includes(token)) throw new Error('Missing runtime function: '+token);
}

if(!app.includes('const tr=(key,vars={})=>')) throw new Error('Translator tr() is missing');
if(/\bt\(/.test(app)) throw new Error('Legacy t() translation call remains and may collide with local time variables');
if(app.includes("$('settingsBtn')")) throw new Error('Legacy settingsBtn reference remains');
if(app.includes("$('pluginGrid')")||app.includes("$('installedCount')")) throw new Error('Removed last-per-plugin panel is still referenced');

console.log('runtime smoke OK: '+ids.length+' DOM references checked');

if(/\b(?:alert|prompt|confirm)\s*\(/.test(app)) throw new Error('Browser-native dialogs are forbidden; use Otzaria-style internal dialogs');
console.log('Browser-native dialogs: none');

const iconsSource=fs.readFileSync('official-fluent-icons.js','utf8');
const iconKeys=new Set([...iconsSource.matchAll(/"([a-z0-9_]+_(?:regular|filled))":/g)].map(m=>m[1]));
const usedIcons=new Set([
  ...[...html.matchAll(/data-icon(?:-active)?="([a-z0-9_]+_(?:regular|filled))"/g)].map(m=>m[1]),
  ...[...app.matchAll(/['"]([a-z0-9_]+_(?:regular|filled))['"]/g)].map(m=>m[1])
]);
const missingIcons=[...usedIcons].filter(x=>!iconKeys.has(x));
if(missingIcons.length) throw new Error('Missing bundled Fluent icons: '+missingIcons.join(', '));
if(/\b(?:miniCard|modalGrid)\b/.test(app)) throw new Error('Legacy web-card UI class remains in app.js');
console.log('Fluent icons verified: '+usedIcons.size);

for(const legacy of ['dashboardBtn','diagnosticsBtn','settingsFab','closeSettings']){
  if(app.includes("$('"+legacy+"')")||html.includes('id="'+legacy+'"')) throw new Error('Legacy UI control remains: '+legacy);
}
for(const legacyClass of ['miniCard','modalGrid']){
  if(app.includes(legacyClass)||html.includes(legacyClass)) throw new Error('Legacy web UI class remains: '+legacyClass);
}
for(const requiredClass of ['native-list','native-row','settingsTabBtn','timelineRail','contextMenu','searchBox']){
  if(!html.includes(requiredClass)) throw new Error('Required native Otzaria UI class missing: '+requiredClass);
}
console.log('Native Otzaria UI audit OK');

for(const required of [
  'function renderTrueDayRail',
  'function rebuildEventIndex',
  'function appendBatchedRows',
  'retentionDays',
  'eventIndex.byBook',
  'eventIndex.byPlugin',
  'eventIndex.bySession'
]){
  if(!app.includes(required)) throw new Error('Missing Timeline 0.15 capability: '+required);
}
const bg=fs.readFileSync('background.js','utf8');
for(const required of ['function applyRetention','function archiveExpired','RETENTION_CHECK_GAP','50000']){
  if(!bg.includes(required)) throw new Error('Missing retention/performance capability: '+required);
}
console.log('Timeline 0.15 feature guards OK');

for(const required of [
  'function createTimelineEventNode',
  'timelineEventAnchor',
  'timelineEventConnectorV',
  'timelineEventConnectorH',
  'timelineEventCard'
]){
  if(!app.includes(required)&&!html.includes(required)) throw new Error('Missing exact event timeline capability: '+required);
}
if(app.includes('function createTimelineNode(')) throw new Error('Legacy session-only Timeline node renderer still present');
console.log('Exact per-event Timeline audit OK');

for(const required of ['function adaptiveGapPx','function buildAdaptiveTimelinePositions','adaptiveTimelineRail','adaptiveGapMarker']){
  if(!app.includes(required)&&!html.includes(required)) throw new Error('Missing adaptive Timeline capability: '+required);
}
if(app.includes('1440*pxPerMinute')) throw new Error('Fixed 24-hour Timeline height returned');
console.log('Adaptive content-driven Timeline audit OK');

for(const required of ['idleBreak','idleBreakLabel','35*60000','const base=34*zoom']){
  if(!app.includes(required)&&!html.includes(required)) throw new Error('Missing compact/idle-break Timeline capability: '+required);
}
console.log('Compact Timeline spacing and idle-break audit OK');

for(const required of ['const base=34*zoom','idleBreakGlyph','min-height:32px','z-index:8']){
  if(!app.includes(required)&&!html.includes(required)) throw new Error('Missing 0.15.5 compact/pause-label polish: '+required);
}
console.log('Timeline 0.15.5 compact spacing + pause label audit OK');


// Comprehensive UX structure audit
const htmlIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const duplicateIds=Object.entries(htmlIds.reduce((acc,id)=>(acc[id]=(acc[id]||0)+1,acc),{})).filter(([,n])=>n>1);
if(duplicateIds.length) throw new Error('Duplicate DOM ids: '+duplicateIds.map(([id])=>id).join(', '));

const screenNames=[...html.matchAll(/data-screen="([^"]+)"/g)].map(m=>m[1]);
const panelNames=[...html.matchAll(/data-screen-panel="([^"]+)"/g)].map(m=>m[1]);
for(const name of new Set(screenNames)) if(!panelNames.includes(name)) throw new Error('Navigation item without screen panel: '+name);
for(const name of new Set(panelNames)) if(!screenNames.includes(name)) throw new Error('Screen panel without navigation item: '+name);

const settingsTabs=[...html.matchAll(/data-settings-tab="([^"]+)"/g)].map(m=>m[1]);
const settingsPanes=[...html.matchAll(/data-settings-pane="([^"]+)"/g)].map(m=>m[1]);
for(const name of new Set(settingsTabs)) if(!settingsPanes.includes(name)) throw new Error('Settings tab without pane: '+name);
for(const name of new Set(settingsPanes)) if(!settingsTabs.includes(name)) throw new Error('Settings pane without tab: '+name);

if(html.includes('id="dialog"')) throw new Error('Legacy settings id="dialog" remains');
if(!html.includes('id="settingsScreen"')) throw new Error('Settings screen semantic id missing');
if(!html.includes('class="settingsSaveBar"')) throw new Error('Persistent settings save bar missing');
if(!app.includes("querySelectorAll('.timelineEventNode,[data-session-id].session')")) throw new Error('J/K keyboard navigation is not wired to per-event Timeline nodes');
if(!app.includes("box.setAttribute('role','dialog')")||!app.includes('ov.__requestClose')) throw new Error('Modal accessibility/close routing is incomplete');
if(!app.includes("menu.setAttribute('role','menu')")||!app.includes("setAttribute('role','menuitem')")) throw new Error('Context menu accessibility roles missing');
if(!html.includes('aria-controls="filtersPopover"')||!html.includes('aria-expanded="false"')) throw new Error('Filter popover accessibility state missing');
console.log('Comprehensive UX structure audit OK');


// Dead controls / obsolete CSS audit
const buttonIds=[...html.matchAll(/<button\b([^>]*)>/g)].map(m=>(m[1].match(/\bid="([^"]+)"/)||[])[1]).filter(Boolean);
const deadButtons=buttonIds.filter(id=>!app.includes("$('"+id+"')")&&!app.includes('"'+id+'"')&&!app.includes("'"+id+"'"));
if(deadButtons.length) throw new Error('Button ids with no runtime wiring: '+deadButtons.join(', '));

for(const obsolete of ['trueTimeNode','timelineAnchor','timelineConnector','timelineDuration','timelineNode','timelineDot','timelineStamp','timelineCard','snapshotMarks','snapshotMark','hourMarker','dayHourLine']){
  if(html.includes(obsolete)) throw new Error('Obsolete pre-event Timeline CSS remains: '+obsolete);
}
console.log('Dead-control and obsolete-CSS audit OK');


// Simplified settings UX audit
const simplifiedTabs=[...html.matchAll(/data-settings-tab="([^"]+)"/g)].map(m=>m[1]);
const simplifiedPanes=[...html.matchAll(/data-settings-pane="([^"]+)"/g)].map(m=>m[1]);
const expectedSettings=['general','tracking','advanced'];
if(JSON.stringify(simplifiedTabs)!==JSON.stringify(expectedSettings)) throw new Error('Settings must stay simplified to general/tracking/advanced');
if(JSON.stringify(simplifiedPanes)!==JSON.stringify(expectedSettings)) throw new Error('Settings panes must stay simplified to general/tracking/advanced');
for(const legacy of ['data-settings-tab="backup"','data-settings-tab="integrations"','data-settings-tab="maintenance"']){
  if(html.includes(legacy)) throw new Error('Legacy sparse settings tab returned: '+legacy);
}
if(html.includes('id="trackingStatus"')||html.includes('id="trackingDetail"')) throw new Error('Duplicated diagnostics tracking summary returned');
if(!html.includes('feedbackCompact')||!html.includes('height:84px')) throw new Error('Compact feedback layout missing');
console.log('Simplified settings and secondary-screen UX audit OK');


// 0.15.8 settings navigation/polish audit
const settingsNavCount=(html.match(/data-screen="settings"/g)||[]).length;
if(settingsNavCount!==1) throw new Error('Settings navigation must exist exactly once');
if(!html.includes('class="nav-bottom"')) throw new Error('Settings must live in the bottom navigation area');
const mainNavStart=html.indexOf('<nav class="nav-group">');
const mainNavEnd=html.indexOf('</nav>',mainNavStart);
if(mainNavStart>=0&&mainNavEnd>mainNavStart&&html.slice(mainNavStart,mainNavEnd).includes('data-screen="settings"')) throw new Error('Settings returned to the primary nav group');
for(const required of ['#settingsScreen .dangerGroup .danger{','#settingsScreen .settingsSaveBar .btn{','border-radius:var(--radius-pill)']){
  if(!html.includes(required)) throw new Error('Settings polish missing: '+required);
}
if(!html.includes('0.16.0 canonical Otzaria UI')) throw new Error('Canonical settings/UI stylesheet missing');
for(const legacyCss of ['0.15.9 comprehensive UX pass','0.15.10 settings overlap hardening','0.15.18 compact inline toggle rows']){
  if(html.includes(legacyCss)) throw new Error('Legacy settings CSS returned: '+legacyCss);
}
console.log('Bottom settings navigation and settings polish audit OK');


// UX audit 2 guards
if(/document\.querySelector\('\.modalOverlay'\)\?\.remove\(\)/.test(app)) throw new Error('Direct modal removal bypasses lifecycle cleanup');
if(html.includes('data-i18n="quick_navigation"')) throw new Error('Duplicated overview quick-navigation panel returned');
if(/<button id="pauseBtn"[^>]*><\/button>/.test(html)) throw new Error('Tracking pause button must not start empty');
const bodyHtml=html.slice(html.indexOf('</style>')+8);
if(/\sstyle="[^"]+"/.test(bodyHtml)) throw new Error('Inline layout styles returned to HTML body');
if(!app.includes("document.querySelectorAll('.settingsGroup .checkRow')")) throw new Error('Simplified settings are not receiving native enhancement');
if(!app.includes('function closeFilterPopover')) throw new Error('Filter popover close helper missing');
if(!app.includes("switchScreen('timeline');render()")) throw new Error('Overview day selection must navigate to visible Timeline result');
for(const required of [
  'button:disabled',
  '@media(prefers-reduced-motion:reduce)',
  '.side-nav>.nav-bottom',
  '.filterQuickRow',
  '.empty.nativeEmpty'
]){
  if(!html.includes(required)) throw new Error('UX audit 2 capability missing: '+required);
}
console.log('UX audit 2 interaction/layout guards OK');


/* 0.16.0 chronological direction guard */
if(!app.includes("const eventsForDay=[...unique.values()].sort((a,b)=>b.time-a.time)")) throw new Error('Day timeline must render newest events first, matching day bucket order');
if(!app.includes("Math.abs(cur.time-prev.time)")) throw new Error('Adaptive timeline gaps must support descending chronological order');
console.log('Newest-first day timeline ordering audit OK');






/* 0.16.2 canonical timeline-axis guard */
for(const required of [
  '0.16.2 canonical timeline axis geometry',
  '--timeline-axis-x:50%',
  '.timelineEventNode.right .timelineEventCard{',
  'left:calc(var(--timeline-axis-x) + 38px)',
  'right:calc(100% - var(--timeline-axis-x) + 38px)',
  '.trueDayRail{--timeline-axis-x:20px}'
]){
  if(!html.includes(required)) throw new Error('Canonical timeline geometry missing: '+required);
}
console.log('Canonical centered timeline axis audit OK');




/* 0.16.4 fixed physical-center timeline guard */
if(!app.includes("rail.style.removeProperty('--timeline-axis-x')")) throw new Error('Timeline runtime must not inject a drifting axis coordinate');
for(const required of [
  '0.16.4 fixed center-axis geometry',
  '--timeline-axis-x:50%!important',
  'left:calc(50% + 38px)!important',
  'right:calc(50% + 38px)!important',
  'width:calc(50% - 54px)!important'
]){
  if(!html.includes(required)) throw new Error('Fixed centered timeline geometry missing: '+required);
}
console.log('Fixed physical-center timeline audit OK');
