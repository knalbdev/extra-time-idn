// Test-only Supabase protocol adapter backed by real PostgreSQL RLS in PGlite.
// Contains only fixture users/passwords; never connects to the user's project.
import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for (const name of ['202610170001_initial_portal.sql','202610170002_seed_students.sql','202610170003_portal_runtime.sql','202610180004_extracurricular_visibility.sql','202610190005_companion_reports.sql','202610190006_companion_reminders.sql','202610190007_web_push.sql']) await db.exec(await fs.readFile(new URL(`../../supabase/migrations/${name}`,import.meta.url),'utf8'));
const accounts = [
  {id:'00000000-0000-4000-8000-000000000004',username:'pendamping.eskul',email:'pendamping@example.test',role:'pendamping'},
  {id:'00000000-0000-4000-8000-000000000001',username:'admin',email:'admin@example.test',role:'admin'},
  {id:'00000000-0000-4000-8000-000000000002',username:'coach.renang',email:'renang@example.test',role:'coach'},
  {id:'00000000-0000-4000-8000-000000000003',username:'coach.panahan',email:'panahan@example.test',role:'coach'},
];
for (const a of accounts) {
 await db.query('insert into auth.users values ($1,now())',[a.id]);
 await db.query('insert into public.profiles(id,username,role,display_name) values ($1,$2,$3,$4)',[a.id,a.username,a.role,a.username]);
 if(a.role==='coach')await db.query('insert into public.assignments select $1,$2,id from public.classes',[a.id,a.username.split('.')[1]]);
}
if(process.env.COMPANION_REMINDER_FIXTURE==='1')await db.exec("update app_private.companion_reminder_settings set starts_on=(now() at time zone 'Asia/Jakarta')::date-1");
const tokens=new Map();
const user=a=>({id:a.id,email:a.email,aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]});
function token(a){const part=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const raw=part({alg:'HS256',typ:'JWT'})+'.'+part({sub:a.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),email:a.email});const t=raw+'.'+createHmac('sha256','fixture-signing-key').update(raw).digest('base64url');tokens.set(t,a);return t;}
const tables=new Set(['profiles','assignments','classes','extracurriculars','students','meetings','meeting_records','companion_reports']);
const ident=x=>{if(!/^[a-z_]+$/.test(x))throw Error('invalid identifier');return '"'+x+'"';};
let tail=Promise.resolve();
const server=http.createServer((req,res)=>{
 const run=async()=>{
  const url=new URL(req.url,'http://fixture');let raw='';for await(const c of req)raw+=c;
  const body=raw?JSON.parse(raw):null;const bearer=(req.headers.authorization||'').replace(/^Bearer /,'');const a=tokens.get(bearer);const service=bearer==='sb_secret_fixture';
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(data===null?'':JSON.stringify(data));};
  if(url.pathname==='/auth/v1/token'){
   const found=accounts.find(x=>x.email===body?.email);if(!found||body.password!=='Fixture-Password-123!')return reply(400,{error:'invalid_grant',error_code:'invalid_credentials',msg:'Invalid login credentials'});
   return reply(200,{access_token:token(found),refresh_token:randomUUID(),token_type:'bearer',expires_in:3600,user:user(found)});
  }
  if(url.pathname==='/auth/v1/user')return a?reply(200,user(a)):reply(401,{msg:'Invalid token'});
  if(url.pathname==='/auth/v1/logout'){tokens.delete(bearer);return reply(204,null);}
  if(url.pathname.startsWith('/auth/v1/admin/users/')){const found=accounts.find(x=>x.id===url.pathname.split('/').at(-1));return service&&found?reply(200,user(found)):reply(403,{msg:'Denied'});}
  if(url.pathname.endsWith('/.well-known/jwks.json'))return reply(200,{keys:[]});
  if(!url.pathname.startsWith('/rest/v1/'))return reply(404,{message:'Unknown fixture path'});
  await db.exec(`reset role;set role ${service?'service_role':a?'authenticated':'anon'};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a?.id||'']);
  try {
   const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);
   if(rpc){const name=rpc[1];if(name==='get_enabled_extracurriculars'){const r=await db.query('select public.get_enabled_extracurriculars() as value');return reply(200,r.rows.map(row=>row.value));}if(!['consume_portal_login','update_coach_assignment','submit_companion_report','get_companion_reporting_state','manage_push_subscription','claim_daily_push','finish_daily_push'].includes(name))throw Error('Unknown RPC');const keys=Object.keys(body??{});const args=keys.map((k,i)=>`${ident(k)}=>$${i+1}`);const r=await db.query(name==='claim_daily_push'?`select * from public.${ident(name)}(${args.join(',')})`:`select public.${ident(name)}(${args.join(',')}) as value`,Object.values(body??{}));if(name==='claim_daily_push')return reply(200,r.rows);const value=r.rows[0]?.value??null;if(name==='get_companion_reporting_state'&&value&&process.env.COMPANION_REMINDER_FIXTURE==='1'){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());value.checkedAt=today+'T09:59:50+07:00';}return reply(200,value);}
   const table=url.pathname.split('/').at(-1);if(!tables.has(table))throw Error('Unknown table');
   const select=(url.searchParams.get('select')||'*').split(',').map(x=>x==='*'?'*':ident(x)).join(',');
   const params=[];const filters=[];
   for(const [k,v]of url.searchParams){if(['select','order','offset','limit','on_conflict'].includes(k))continue;const i=v.indexOf('.');const op=v.slice(0,i);if(op!=='eq')throw Error('Unknown filter');params.push(v.slice(i+1));filters.push(`${ident(k)}=$${params.length}`);}
   let sql;
   if(req.method==='POST'){
    const keys=Object.keys(body);params.length=0;params.push(...Object.values(body));sql=`insert into public.${ident(table)}(${keys.map(ident).join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`;
    if(req.headers.prefer?.includes('resolution=merge-duplicates'))sql+=` on conflict (${url.searchParams.get('on_conflict').split(',').map(ident).join(',')}) do update set ${keys.map(k=>`${ident(k)}=excluded.${ident(k)}`).join(',')}`;
    sql+=` returning ${select}`;
   }else if(req.method==='DELETE'){
    sql=`delete from public.${ident(table)}${filters.length?' where '+filters.join(' and '):''} returning ${select}`;
   }else if(req.method==='PATCH'){
    const keys=Object.keys(body);const original=params.length;params.push(...Object.values(body));sql=`update public.${ident(table)} set ${keys.map((k,i)=>`${ident(k)}=$${original+i+1}`).join(',')}${filters.length?' where '+filters.join(' and '):''} returning ${select}`;
   }else{
    sql=`select ${select} from public.${ident(table)}${filters.length?' where '+filters.join(' and '):''}`;
    if(url.searchParams.has('order'))sql+=' order by '+url.searchParams.get('order').split(',').map(v=>{const[k,dir]=v.split('.');return ident(k)+(dir==='desc'?' desc':' asc');}).join(',');
    sql+=` limit ${Math.min(Number(url.searchParams.get('limit')||1000),1000)} offset ${Number(url.searchParams.get('offset')||0)}`;
   }
   const result=await db.query(sql,params);
   // Match PostgREST's date-only JSON instead of PGlite's JavaScript Date.
   for (const row of result.rows) for (const key of ['meeting_date','activity_date']) if (row[key] instanceof Date) row[key]=row[key].toISOString().slice(0,10);
   if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return result.rows.length===1?reply(200,result.rows[0]):reply(406,{code:'PGRST116',message:'Expected one row',details:`${result.rows.length} rows`});
   return reply(200,result.rows);
  }catch(e){console.log('Fixture SQL rejection:',e.code,e.message);return reply(403,{code:e.code||'42501',message:'Fixture database rejected request',details:e.message});}
 };
 tail=tail.then(run,run).catch(()=>{res.writeHead(500);res.end('{"message":"Fixture failure"}');});
});
server.listen(3088,'127.0.0.1',()=>console.log('Supabase fixture ready on 3088 (no real credentials used)'));
