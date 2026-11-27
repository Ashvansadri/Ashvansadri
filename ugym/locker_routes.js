'use strict';
module.exports=async function lockerRoutes({req,res,path:p,body:b,pool,auth,send,fail,audit}){
 if(!p.startsWith('/api/v3/admin/locker')&&!p.startsWith('/api/v3/admin/integrations'))return false;
 const no=(n,m)=>{fail(res,n,m);return true},id=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
 const u=await auth(req);if(!u)return no(401,'ابتدا وارد حساب شوید');
 if(u.role!=='admin')return no(403,'فقط مدیریت اجازه دسترسی دارد');
 if(p==='/api/v3/admin/integrations'&&req.method==='GET'){
  const r=await pool.query('SELECT code,status,provider,public_note,updated_at FROM ug_integrations ORDER BY code');
  const pushReady=Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
  send(res,200,{integrations:r.rows.map(x=>({...x,ready:x.code==='push'?pushReady:false})),required:{push:['VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'],locker:['نوع کنترلر','API شرکت سازنده','کلید امن سرویس','بازکردن اضطراری مستقل'],sms:['سرویس پیامک','توکن دسترسی'],whatsapp:['WhatsApp Business API'],scheduler:['سرویس Cron یا Worker همیشه‌فعال','کلید امن اجرای زمان‌بندی']},physical_hardware_connected:false});return true;
 }
 if(p==='/api/v3/admin/lockers'&&req.method==='GET'){
  const q=await pool.query("SELECT l.id,l.label,l.device_ref,l.notes,l.active,a.user_id,a.override_until,a.override_reason,u.full_name,(SELECT COUNT(*)::int FROM ug_payments p WHERE p.user_id=a.user_id) AS invoices,(SELECT COUNT(*)::int FROM ug_payments p WHERE p.user_id=a.user_id AND p.status='pending' AND (p.due_date IS NULL OR p.due_date<=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date)) AS unpaid FROM ug_lockers l LEFT JOIN ug_locker_assignments a ON a.locker_id=l.id LEFT JOIN ug_users u ON u.id=a.user_id ORDER BY l.label LIMIT 500");
  const lockers=q.rows.map(x=>({...x,policy:!x.user_id?'unassigned':!x.active?'inactive':x.override_until&&new Date(x.override_until)>new Date()?'manual_override':Number(x.unpaid)>0?'payment_review':Number(x.invoices)===0?'payment_unknown':'eligible',physical_action_enabled:false}));
  send(res,200,{lockers,mode:'simulation_only',hardware_connected:false});return true;
 }
 if(p==='/api/v3/admin/locker/create'&&req.method==='POST'){
  const label=String(b.label||'').trim().slice(0,40),notes=String(b.notes||'').trim().slice(0,160);
  if(label.length<2)return no(400,'شماره یا نام کمد معتبر نیست');
  try{const x=await pool.query('INSERT INTO ug_lockers(label,notes) VALUES($1,$2) RETURNING id',[label,notes]);await audit(u.id,'locker_created',Number(x.rows[0].id));send(res,201,{ok:true,id:x.rows[0].id});return true;}
  catch(e){if(e.code==='23505')return no(409,'این کمد قبلاً ثبت شده');throw e;}
 }
 if(p==='/api/v3/admin/locker/assign'&&req.method==='POST'){
  const locker=id(b.locker_id),athlete=b.user_id?id(b.user_id):null;
  if(!locker||(b.user_id&&!athlete))return no(400,'کمد یا ورزشکار معتبر نیست');
  const found=await pool.query('SELECT id FROM ug_lockers WHERE id=$1',[locker]);if(!found.rowCount)return no(404,'کمد پیدا نشد');
  if(athlete){const who=await pool.query("SELECT id FROM ug_users WHERE id=$1 AND role='member'",[athlete]);if(!who.rowCount)return no(404,'ورزشکار پیدا نشد');}
  try{
   await pool.query('INSERT INTO ug_locker_assignments(locker_id,user_id,assigned_by,assigned_at,override_until,override_reason) VALUES($1,$2,$3,NOW(),NULL,NULL) ON CONFLICT(locker_id) DO UPDATE SET user_id=EXCLUDED.user_id,assigned_by=EXCLUDED.assigned_by,assigned_at=NOW(),override_until=NULL,override_reason=NULL',[locker,athlete,u.id]);
   await audit(u.id,'locker_assignment',locker,{athlete});send(res,200,{ok:true});return true;
  }catch(e){if(e.code==='23505')return no(409,'این ورزشکار از قبل کمد دیگری دارد');throw e;}
 }
 if(p==='/api/v3/admin/locker/override'&&req.method==='POST'){
  const locker=id(b.locker_id),hours=Number(b.hours),reason=String(b.reason||'').trim().slice(0,200);
  if(!locker||!Number.isInteger(hours)||hours<1||hours>72||reason.length<8)return no(400,'مدت یا دلیل مجوز موقت معتبر نیست');
  const x=await pool.query("UPDATE ug_locker_assignments SET override_until=NOW()+($2::int*INTERVAL '1 hour'),override_reason=$3 WHERE locker_id=$1 AND user_id IS NOT NULL RETURNING locker_id",[locker,hours,reason]);
  if(!x.rowCount)return no(404,'کمد به ورزشکاری واگذار نشده است');
  await audit(u.id,'locker_manual_override',locker,{hours,reason});send(res,200,{ok:true});return true;
 }
 return no(404,'مسیر کمد یافت نشد');
};