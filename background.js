(() => {
'use strict';
const EVENTS='timeline.events.v2', SNAPS='timeline.snapshots.v1', SETTINGS='timeline.settings.v1';
const SESSION_GAP=30*60*1000, MERGE_GAP=2*60*1000, SNAP_GAP=15*60*1000;
let q=Promise.resolve(), wired=false;
const call=async(m,p={})=>{try{return await Otzaria.call(m,p)}catch(_){return{success:false,data:null}}};
const get=async(k,f)=>{const r=await call('storage.get',{key:k});return r&&r.success&&r.data!=null?r.data:f};
const set=(k,v)=>call('storage.set',{key:k,value:v});
const clean=o=>{const x={}; for(const k of ['book','bookId','bookUid','id','type','source','index','currentBook','currentBookId','currentIndex','currentRef','screen','workspaceId']) if(o&&o[k]!=null)x[k]=o[k]; return x};
const bookKey=d=>d.bookUid||d.currentBookId||d.bookId||d.currentBook||d.book||'';
function label(type,d){
  if(type==='book'||type==='ref') return d.currentBook||d.book||d.currentBookId||d.bookId||'ספר';
  if(type==='workspace') return 'שולחן עבודה';
  if(type==='navigation') return 'מעבר '+(d.screen||'');
  return 'פעילות';
}
async function snapshot(force=false){
  const now=Date.now(), snaps=await get(SNAPS,[]);
  const list=Array.isArray(snaps)?snaps:[];
  if(!force && list.length && now-(list[list.length-1].time||0)<SNAP_GAP) return;
  const [rs,ws]=await Promise.all([call('reader.getCurrentState'),call('workspace.getActive')]);
  if(!rs.success||!rs.data) return;
  const tabs=(rs.data.openTabs||[]).map(t=>({
    id:t.id, toolId:t.toolId, isSelf:t.isSelf, type:t.type, source:t.source,
    bookId:t.bookId, bookUid:t.bookUid, book:t.book, index:t.index, currentRef:t.currentRef
  }));
  list.push({
    id:'snap-'+now.toString(36), time:now,
    workspace:ws.success?ws.data:null,
    active:{bookUid:rs.data.bookUid,bookId:rs.data.currentBookId,index:rs.data.currentIndex},
    tabs
  });
  if(list.length>300) list.splice(0,list.length-300);
  await set(SNAPS,list);
}
function record(type,p){
  q=q.then(async()=>{
    const settings=Object.assign({paused:false,maxEvents:5000},await get(SETTINGS,{}));
    if(settings.paused) return;
    const now=Date.now(), d=clean(p), arr=await get(EVENTS,[]);
    const list=Array.isArray(arr)?arr:[];
    const prev=list[list.length-1];
    const same=prev&&prev.type===type&&bookKey(prev.data||{})===bookKey(d)&&now-(prev.endTime||prev.time)<MERGE_GAP;
    if(same && (type==='book'||type==='ref'||type==='navigation')){
      prev.endTime=now;
      prev.count=(prev.count||1)+1;
      prev.data=Object.assign({},prev.data,d);
      prev.label=label(type,prev.data);
    }else{
      const sid=prev&&now-(prev.endTime||prev.time)<SESSION_GAP?prev.sessionId:'s-'+now.toString(36);
      list.push({
        id:'e-'+now.toString(36)+'-'+Math.random().toString(36).slice(2,6),
        time:now,endTime:now,type,label:label(type,d),sessionId:sid,count:1,data:d
      });
    }
    const max=Math.max(500,Math.min(20000,Number(settings.maxEvents)||5000));
    if(list.length>max) list.splice(0,list.length-max);
    await set(EVENTS,list);
    await snapshot(type==='workspace');
  });
  return q;
}
function wire(){
  if(wired) return;
  wired=true;
  Otzaria.on('navigation.changed',p=>record('navigation',p));
  Otzaria.on('reader.current_book_changed',p=>record('book',p));
  Otzaria.on('reader.current_ref_changed',p=>record('ref',p));
  Otzaria.on('workspace.changed',p=>record('workspace',p));
}
Otzaria.on('plugin.boot',async()=>{wire();await snapshot(false)});
})();