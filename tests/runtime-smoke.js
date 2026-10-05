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
