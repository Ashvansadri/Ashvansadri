'use strict';
const ready=()=>Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
async function sendPush(pool,userId,notice){
 if(!ready())return {configured:false,sent:0};
 let wp;
 try{wp=require('web-push');wp.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);}
 catch(e){console.error('UGYM push initialization failed',e.message);return {configured:false,sent:0};}
 const r=await pool.query('SELECT id,endpoint,p256dh,auth FROM ug_push_subscriptions WHERE ($1::BIGINT IS NULL OR user_id=$1) LIMIT 300',[userId||null]);
 let sent=0;
 for(const sub of r.rows){
  try{
   await wp.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:String(notice.title||'UGYM').slice(0,90),body:String(notice.body||'یک پیام جدید در باشگاه داری.').slice(0,200),url:'/member'}),{TTL:3600});
   await pool.query('UPDATE ug_push_subscriptions SET last_success_at=NOW() WHERE id=$1',[sub.id]);sent++;
  }catch(e){if([404,410].includes(e.statusCode))await pool.query('DELETE FROM ug_push_subscriptions WHERE id=$1',[sub.id]);else console.error('UGYM push not delivered',e.statusCode||e.message);}
 }
 return {configured:true,sent};
}
async function candidates(pool){
 const r=await pool.query("WITH today AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date d),due AS (SELECT p.user_id,COUNT(*)::int n FROM ug_payments p,today WHERE p.status='pending' AND (p.due_date IS NULL OR p.due_date<=today.d) GROUP BY p.user_id),attendance AS (SELECT u.id user_id,MAX(b.class_date) FILTER (WHERE b.status='attended') last_visit,COUNT(*) FILTER (WHERE b.status='absent' AND b.class_date>=(SELECT d FROM today)-14)::int absent_count FROM ug_users u LEFT JOIN ug_bookings b ON b.user_id=u.id WHERE u.role='member' GROUP BY u.id) SELECT u.id,u.full_name,COALESCE(due.n,0) overdue_count,attendance.last_visit,attendance.absent_count,to_char((SELECT d FROM today),'YYYY-MM-DD') today FROM ug_users u LEFT JOIN due ON due.user_id=u.id LEFT JOIN attendance ON attendance.user_id=u.id WHERE u.role='member' AND (due.n>0 OR attendance.absent_count>0 OR (attendance.last_visit IS NOT NULL AND attendance.last_visit<(SELECT d FROM today)-7)) ORDER BY u.id LIMIT 500");
 const list=[];
 for(const a of r.rows){
  if(Number(a.overdue_count)>0)list.push({user_id:a.id,full_name:a.full_name,kind:'payment',title:'یادآوری شهریه UGYM',body:'شهریه باز در پرونده شما ثبت شده است. لطفاً از پنل شخصی وضعیت شهریه را بررسی کنید.',key:'tuition:'+a.today});
  if(Number(a.absent_count)>0||(a.last_visit&&new Date(a.last_visit).getTime()<=new Date(a.today).getTime()-7*86400000))list.push({user_id:a.id,full_name:a.full_name,kind:'attendance',title:'منتظر دیدارت هستیم 💜',body:'مدتی از آخرین حضور ثبت‌شده یا چند جلسه غیبت شما گذشته است. برای برنامه بعدی با مربی هماهنگ کنید.',key:'absence:'+a.today});
 }
 return list;
}
async function handle({req,res,path:p,body:b,pool,auth,send,fail,audit}){
 if(!p.startsWith('/api/v3/')||(!p.includes('push')&&!p.includes('reminders')&&!p.includes('integration-status')))return false;
 const no=(n,m)=>{fail(res,n,m);return true};
 if(p==='/api/v3/integration-status'&&req.method==='GET'){
  const r=await pool.query('SELECT code,status,public_note FROM ug_integrations ORDER BY code');
  send(res,200,{integrations:r.rows,push_enabled:ready(),push_public_key:ready()?process.env.VAPID_PUBLIC_KEY:null,physical_locker_connected:false});return true;
 }
 const u=await auth(req);if(!u)return no(401,'ابتدا وارد حساب شوید');
 if(p==='/api/v3/member/push/subscribe'&&req.method==='POST'){
  if(u.role!=='member')return no(403,'فقط ورزشکار');
  if(!ready())return no(503,'سرویس پوش هنوز متصل نیست');
  const sub=b.subscription;
  if(!sub||typeof sub!=='object'||!/^https:\/\//.test(String(sub.endpoint||''))||String(sub.endpoint).length>1200||!sub.keys?.p256dh||!sub.keys?.auth||String(sub.keys.p256dh).length>180||String(sub.keys.auth).length>100)return no(400,'اشتراک پوش معتبر نیست');
  await pool.query('INSERT INTO ug_push_subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth',[u.id,sub.endpoint,sub.keys.p256dh,sub.keys.auth]);
  send(res,201,{ok:true});return true;
 }
 if(p==='/api/v3/member/push/unsubscribe'&&req.method==='POST'){
  if(u.role!=='member')return no(403,'فقط ورزشکار');
  const endpoint=String(b.endpoint||'').slice(0,1200);if(!endpoint)return no(400,'اشتراک معتبر نیست');
  await pool.query('DELETE FROM ug_push_subscriptions WHERE user_id=$1 AND endpoint=$2',[u.id,endpoint]);send(res,200,{ok:true});return true;
 }
 if(u.role!=='admin')return no(403,'فقط مدیریت');
 if(p==='/api/v3/admin/reminders'&&req.method==='GET'){
  const list=await candidates(pool);send(res,200,{candidates:list,total:list.length,push_configured:ready()});return true;
 }
 if(p==='/api/v3/admin/reminders/dispatch'&&req.method==='POST'){
  if(b.confirm!==true)return no(400,'تأیید مدیر برای ارسال اعلان‌ها ضروری است');
  const list=(await candidates(pool)).slice(0,50);
  let created=0;
  for(const x of list){
   const client=await pool.connect();let did=false;
   try{
    await client.query('BEGIN');
    const lock=await client.query('INSERT INTO ug_reminder_dispatch_log(user_id,reminder_key,kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',[x.user_id,x.key,x.kind]);
    if(lock.rowCount){await client.query('INSERT INTO ug_notices(user_id,title,body,kind,created_by) VALUES($1,$2,$3,$4,$5)',[x.user_id,x.title,x.body,x.kind,u.id]);did=true;}
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('UGYM reminder failed',e.message);}
   finally{client.release();}
   if(did){created++;await sendPush(pool,x.user_id,{title:x.title,body:x.body}).catch(()=>{});}
  }
  await audit(u.id,'manual_reminders_dispatched',null,{created});send(res,200,{ok:true,created,total:list.length,push_configured:ready()});return true;
 }
 return no(404,'مسیر اعلان یافت نشد');
}
module.exports={handle,sendPush,ready};
