import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const base='https://ic-ig-oauth.sila-santosh-kumar.workers.dev';
const key=process.env.IG_ADMIN_KEY;
const [file,dayArg]=process.argv.slice(2);
const day=Number(dayArg);
const cal=JSON.parse(fs.readFileSync('content/shorts.json','utf8'));
const content=cal.days.find(d=>d.day===day);
if(!key||!content?.reviewed?.source)throw Error('Missing IG credential or reviewed content; refusing publication');
const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const ledger='usage/publishing.json';
const records=fs.existsSync(ledger)?JSON.parse(fs.readFileSync(ledger,'utf8')):{};
const id=`${date}-short-instagram`;
const run=`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
function save(state,extra={}){
 records[id]={...(records[id]||{}),state,day,at:new Date().toISOString(),run,...extra};
 fs.writeFileSync(ledger,JSON.stringify(records,null,2)+'\n');
 execFileSync('git',['add',ledger]);execFileSync('git',['commit','-m',`publish ledger: ${id} ${state} [skip ci]`]);execFileSync('git',['push']);
}
async function api(path,options={}){
 const r=await fetch(base+path,{...options,headers:{'X-IG-Key':key,...options.headers}});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(`IG route ${path.split('?')[0]} HTTP ${r.status}`);return j;
}
if(records[id]?.state==='published'){console.log('Already published',records[id].media_id);process.exit(0);}
if(records[id]?.state==='publishing'||records[id]?.state==='uncertain')throw Error('Previous publish outcome uncertain. Reconcile before retry; no duplicate sent.');
const me=await api('/ig/me');if(me.username!=='impactconnect.india')throw Error('Wrong Instagram account');
const status=await api('/ig/status');if(!status.connected)throw Error('Instagram disconnected');
// Refresh only near expiry, never once per render.
if(status.last?.expires_at&&Date.parse(status.last.expires_at)-Date.now()<7*86400000)await api('/ig/refresh',{method:'POST'});
let staged;
try{
 const bytes=fs.readFileSync(file);
 staged=await api('/ig/upload?ttl=3600',{method:'PUT',headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length)},body:bytes});
 if(!staged.url?.startsWith(base+'/v/'))throw Error('Unexpected staging response');
 const caption=`${content.hook}\n\n${content.points.join('\n')}\n\nimpact-connect.in`;
 const container=await api('/ig/container',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({video_url:staged.url,caption})});
 if(!/^\d+$/.test(container.id||''))throw Error('No container id');
 let ready=false;
 for(let n=0;n<30;n++){
  const s=await api('/ig/container/status?id='+container.id);
  if(s.status_code==='FINISHED'){ready=true;break;}
  if(['ERROR','EXPIRED'].includes(s.status_code))throw Error('IG container '+s.status_code);
  await new Promise(r=>setTimeout(r,20000));
 }
 if(!ready)throw Error('Container not ready before timeout');
 // Commit a durable intent BEFORE the irreversible send. A lost response is never auto-retried.
 save('publishing',{container_id:container.id});
 const published=await api('/ig/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({container_id:container.id})});
 if(!/^\d+$/.test(published.id||''))throw Error('No publish receipt');
 save('published',{media_id:published.id});
 console.log(JSON.stringify({published:true,media_id:published.id,run}));
}catch(e){
 if(records[id]?.state==='publishing')save('uncertain',{error:String(e.message).slice(0,150)});
 throw e;
}finally{
 if(staged?.url){const token=new URL(staged.url).pathname.split('/').pop().replace('.mp4','');const d=await api('/ig/upload/'+token,{method:'DELETE'});if(!d.deleted)throw Error('Staged media cleanup not confirmed');}
}
