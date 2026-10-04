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

if(/function\s+dayTitle\s*\(t\)/.test(app)) throw new Error('i18n collision: dayTitle(t) shadows translator t()');
if(app.includes("$('settingsBtn')")) throw new Error('Legacy settingsBtn reference remains');
if(app.includes("$('pluginGrid')")||app.includes("$('installedCount')")) throw new Error('Removed last-per-plugin panel is still referenced');

console.log('runtime smoke OK: '+ids.length+' DOM references checked');
