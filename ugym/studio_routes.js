'use strict';
/* UGYM Coach Studio v2: single-tenant private workout, nutrition, progress and notices APIs. */
module.exports = async function handleStudio({req,res,path:route,body:b,pool,auth,send,fail,audit,sendPush}){
 if(!route.startsWith('/api/v2/'))return false;
 const clip=(v,max=200)=>String(v??'').trim().slice(0,max);
 const id=(v)=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
 const validDate=(v)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return false;const d=new Date(v+'T00:00:00Z');return !isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v;};
 const error=(n,msg)=>{fail(res,n,msg);return true;};
 const allowed=(r)=>['بدنسازی','پیلاتس','ایروبیک','TRX'].includes(r);
 const getMember=async(i)=>{if(!await assigned(i))return null;const r=await pool.query("SELECT id,full_name,email,discipline,goal,height_cm FROM ug_users WHERE id=$1 AND role='member'",[i]);return r.rows[0]||null;};
 const exercises=()=>pool.query("SELECT id,slug,name_fa,discipline,target,equipment,instructions,caution,image_start,image_end,media_license,media_source FROM ug_exercises WHERE is_active=true ORDER BY discipline,name_fa LIMIT 150");
 if(route==='/api/v2/exercises'&&req.method==='GET'){
  const r=await exercises();send(res,200,{exercises:r.rows});return true;
 }
 const u=await auth(req);if(!u)return error(401,'لطفاً ابتدا وارد حساب خود شوید');
 const member=u.role==='member',admin=u.role==='admin',coach=u.role==='coach';
 const assigned=async who=>{if(admin)return true;if(!coach)return false;const r=await pool.query('SELECT 1 FROM ug_coach_assignments WHERE coach_id=$1 AND user_id=$2',[u.id,who]);return r.rowCount>0;};
 const ownsPlan=async planId=>{const r=await pool.query('SELECT user_id FROM ug_training_plans WHERE id=$1',[planId]);return r.rowCount>0&&await assigned(r.rows[0].user_id);};
 const ownsItem=async itemId=>{const r=await pool.query('SELECT p.user_id FROM ug_training_plan_items i JOIN ug_training_plans p ON p.id=i.plan_id WHERE i.id=$1',[itemId]);return r.rowCount>0&&await assigned(r.rows[0].user_id);};
 const getProgram=async(userId,adminView=false)=>{
  const plans=await pool.query("SELECT id,user_id,title,goal,coach_note,start_date,end_date,status,created_at,updated_at FROM ug_training_plans WHERE user_id=$1 ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,updated_at DESC LIMIT 30",[userId]);
  let active=plans.rows.find(x=>x.status==='active')||null;
  if(adminView&&id(new URL(req.url,'http://x').searchParams.get('plan_id'))){
   const requested=id(new URL(req.url,'http://x').searchParams.get('plan_id'));active=plans.rows.find(x=>Number(x.id)===requested)||active;
  }
  const [items,nutrition,logs,measurements]=await Promise.all([
   active?pool.query("SELECT i.id,i.plan_id,i.exercise_id,i.day_label,i.sort_order,i.sets,i.reps,i.rest_seconds,i.coach_note,e.slug,e.name_fa,e.discipline,e.target,e.equipment,e.instructions,e.caution,e.image_start,e.image_end,e.media_license,e.media_source FROM ug_training_plan_items i JOIN ug_exercises e ON e.id=i.exercise_id WHERE i.plan_id=$1 ORDER BY i.day_label,i.sort_order,i.id",[active.id]):Promise.resolve({rows:[]}),
   pool.query("SELECT title,breakfast,lunch,dinner,snacks,guidance,updated_at FROM ug_nutrition_plans WHERE user_id=$1",[userId]),
   pool.query("SELECT l.id,l.plan_item_id,l.performed_on,l.completed_sets,l.actual_reps,l.weight_kg,l.difficulty,l.note,l.created_at,e.name_fa FROM ug_workout_logs l JOIN ug_training_plan_items i ON i.id=l.plan_item_id JOIN ug_exercises e ON e.id=i.exercise_id WHERE l.user_id=$1 ORDER BY l.performed_on DESC,l.id DESC LIMIT 180",[userId]),
   pool.query("SELECT id,measured_at,weight_kg,body_fat_pct,waist_cm,performance_score,note,source,verified,created_at FROM ug_measurements WHERE user_id=$1 ORDER BY measured_at DESC,id DESC LIMIT 180",[userId])
  ]);
  return {plans:adminView?plans.rows:plans.rows.filter(x=>x.status==='active'),plan:active,items:items.rows,nutrition:nutrition.rows[0]||null,logs:logs.rows,measurements:measurements.rows};
 };
 if(route==='/api/v2/member/studio'&&req.method==='GET'){
  if(!member)return error(403,'این بخش فقط برای ورزشکار است');
  const [program,notices,due,absence,attendance]=await Promise.all([
   getProgram(u.id,false),
   pool.query("SELECT n.id,n.title,n.body,n.kind,n.created_at,(r.read_at IS NOT NULL) AS is_read FROM ug_notices n LEFT JOIN ug_notice_reads r ON r.notice_id=n.id AND r.user_id=$1 WHERE (n.user_id IS NULL OR n.user_id=$1) AND (n.expires_at IS NULL OR n.expires_at>NOW()) ORDER BY n.created_at DESC LIMIT 65",[u.id]),
   pool.query("SELECT id,amount_toman,due_date FROM ug_payments WHERE user_id=$1 AND status='pending' AND due_date IS NOT NULL AND due_date<=(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date + 4 ORDER BY due_date ASC LIMIT 5",[u.id]),
   pool.query("SELECT COUNT(*)::int AS count,MAX(class_date) AS last_absent FROM ug_bookings WHERE user_id=$1 AND status='absent' AND class_date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date - 30",[u.id]),
   pool.query("SELECT MAX(class_date) AS last_attended,COUNT(*)::int AS total FROM ug_bookings WHERE user_id=$1 AND status='attended'",[u.id])
  ]);
  const reminders=[];
  if(due.rows.length)reminders.push({kind:'payment',title:'یادآوری شهریه',body:'شما '+due.rows.length+' شهریه باز با موعد نزدیک یا گذشته دارید. وضعیت پرداخت را در بخش شهریه‌ها بررسی کنید.'});
  if(absence.rows[0].count>0)reminders.push({kind:'attendance',title:'یادآوری حضور در باشگاه',body:'در ۳۰ روز گذشته '+absence.rows[0].count+' جلسه با وضعیت غیبت برای شما ثبت شده است. اگر مغایرتی وجود دارد، با مدیریت هماهنگ کنید.'});
  if(attendance.rows[0].total>0&&attendance.rows[0].last_attended){
   const days=Math.floor((Date.now()-new Date(attendance.rows[0].last_attended).getTime())/86400000);
   if(days>=7)reminders.push({kind:'attendance',title:'منتظر دیدارت هستیم',body:'از آخرین حضور ثبت‌شده شما بیش از یک هفته می‌گذرد. برای برنامه بعدی با مربی هماهنگ کنید.'});
  }
  send(res,200,{...program,notices:notices.rows,reminders});return true;
 }
 if(route==='/api/v2/member/measure'&&req.method==='POST'){
  if(!member)return error(403,'فقط ورزشکار');
  const date=clip(b.measured_at,10);
  if(!validDate(date))return error(400,'تاریخ معتبر نیست');
  const clock=await pool.query("SELECT to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date,'YYYY-MM-DD') AS today");
  const today=String(clock.rows[0].today).slice(0,10);
  if(new Date(date)>new Date(today)||new Date(date)<new Date(Date.now()-365*86400000))return error(400,'تاریخ باید از یک سال گذشته تا امروز باشد');
  const fields=['weight_kg','body_fat_pct','waist_cm','performance_score'],max=[400,100,300,100],values=[];
  for(let i=0;i<fields.length;i++){const raw=b[fields[i]];if(raw===''||raw===null||raw===undefined){values.push(null);continue;}const x=Number(raw);if(!Number.isFinite(x)||x<=0||x>max[i])return error(400,'مقدار '+fields[i]+' نامعتبر است');values.push(x);}
  if(values.every(x=>x===null))return error(400,'حداقل یک اندازه را ثبت کنید');
  const ins=await pool.query("INSERT INTO ug_measurements(user_id,measured_at,weight_kg,body_fat_pct,waist_cm,performance_score,note,source,verified,submitted_by) VALUES($1,$2,$3,$4,$5,$6,$7,'member',false,$1) RETURNING id",[u.id,date,...values,clip(b.note,400)]);
  await audit(u.id,'measurement_self_reported',Number(ins.rows[0].id));
  send(res,201,{ok:true,id:ins.rows[0].id,verified:false});return true;
 }
 if(route==='/api/v2/member/log'&&req.method==='POST'){
  if(!member)return error(403,'فقط ورزشکار');
  const itemId=id(b.plan_item_id),date=clip(b.performed_on,10),sets=Number(b.completed_sets),weight=b.weight_kg===''||b.weight_kg==null?null:Number(b.weight_kg),difficulty=b.difficulty===''||b.difficulty==null?null:Number(b.difficulty);
  if(!itemId||!validDate(date)||!Number.isInteger(sets)||sets<0||sets>20||weight!==null&&(!Number.isFinite(weight)||weight<0||weight>400)||difficulty!==null&&(!Number.isInteger(difficulty)||difficulty<1||difficulty>10))return error(400,'اطلاعات ثبت تمرین معتبر نیست');
  const clock=await pool.query("SELECT to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tehran')::date,'YYYY-MM-DD') AS today");
  const today=clock.rows[0].today;
  if(date>today||new Date(date).valueOf()<Date.now()-93*86400000)return error(400,'تمرین آینده یا بیش از سه ماه قبل قابل ثبت نیست');
  const p=await pool.query("SELECT i.id,i.sets FROM ug_training_plan_items i JOIN ug_training_plans p ON p.id=i.plan_id WHERE i.id=$1 AND p.user_id=$2 AND p.status='active'",[itemId,u.id]);
  if(!p.rows.length)return error(404,'این حرکت در برنامه فعال شما نیست');
  if(sets>p.rows[0].sets)return error(400,'تعداد ست نباید از برنامه مربی بیشتر باشد؛ برای اصلاح برنامه با مربی هماهنگ کنید');
  const saved=await pool.query("INSERT INTO ug_workout_logs(user_id,plan_item_id,performed_on,completed_sets,actual_reps,weight_kg,difficulty,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,plan_item_id,performed_on) DO UPDATE SET completed_sets=EXCLUDED.completed_sets,actual_reps=EXCLUDED.actual_reps,weight_kg=EXCLUDED.weight_kg,difficulty=EXCLUDED.difficulty,note=EXCLUDED.note,created_at=NOW() RETURNING id",[u.id,itemId,date,sets,clip(b.actual_reps,40),weight,difficulty,clip(b.note,250)]);
  send(res,200,{ok:true,id:saved.rows[0].id});return true;
 }
 if(route==='/api/v2/member/notice/read'&&req.method==='POST'){
  if(!member||!id(b.notice_id))return error(400,'اعلان نامعتبر');
  const ok=await pool.query("INSERT INTO ug_notice_reads(notice_id,user_id) SELECT id,$2 FROM ug_notices WHERE id=$1 AND (user_id IS NULL OR user_id=$2) ON CONFLICT DO NOTHING RETURNING notice_id",[b.notice_id,u.id]);
  send(res,200,{ok:ok.rowCount>0});return true;
 }
 if(!admin&&!coach)return error(403,'فقط مدیریت و مربی مجازند');
 const params=new URL(req.url,'http://x').searchParams;
 if(route==='/api/v2/admin/studio'&&req.method==='GET'){
  const who=id(params.get('user_id'));if(!who)return error(400,'شناسه ورزشکار معتبر نیست');
  const athlete=await getMember(who);if(!athlete)return error(404,'ورزشکار پیدا نشد');
  const data=await getProgram(who,true);send(res,200,{athlete,...data});return true;
 }
 if(route==='/api/v2/admin/plans'&&req.method==='POST'){
  const who=id(b.user_id),title=clip(b.title,100),start=clip(b.start_date,10),end=clip(b.end_date,10);
  if(!who||title.length<3||!validDate(start)||end&&(!validDate(end)||end<start))return error(400,'اطلاعات برنامه معتبر نیست');
  if(!await getMember(who))return error(404,'ورزشکار پیدا نشد');
  const result=await pool.query("INSERT INTO ug_training_plans(user_id,title,goal,coach_note,start_date,end_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[who,title,clip(b.goal,300),clip(b.coach_note,650),start,end||null,u.id]);
  await audit(u.id,'plan_created',Number(result.rows[0].id),{athlete:who});
  send(res,201,{ok:true,id:result.rows[0].id});return true;
 }
 if(route==='/api/v2/admin/plan/item'&&req.method==='POST'){
  const planId=id(b.plan_id),exId=id(b.exercise_id),sets=Number(b.sets),rest=Number(b.rest_seconds),sort=Number(b.sort_order??0),day=clip(b.day_label,22),reps=clip(b.reps,25);
  if(!planId||!exId||!/^روز [۱-۷1-7]$/.test(day)||!Number.isInteger(sets)||sets<1||sets>20||!Number.isInteger(rest)||rest<0||rest>900||!Number.isInteger(sort)||sort<0||sort>500||!reps)return error(400,'روز، ست، تکرار یا زمان استراحت معتبر نیست');
  if(!await ownsPlan(planId))return error(403,'این برنامه مربوط به ورزشکاران شما نیست');
  const plan=await pool.query("SELECT id FROM ug_training_plans WHERE id=$1 AND status IN('draft','active')",[planId]);
  if(!plan.rowCount)return error(404,'برنامه فعال یا پیش‌نویس پیدا نشد');
  const ex=await pool.query('SELECT id FROM ug_exercises WHERE id=$1 AND is_active=true',[exId]);if(!ex.rowCount)return error(404,'حرکت یافت نشد');
  const result=await pool.query("INSERT INTO ug_training_plan_items(plan_id,exercise_id,day_label,sort_order,sets,reps,rest_seconds,coach_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[planId,exId,day,sort,sets,reps,rest,clip(b.coach_note,300)]);
  await pool.query("UPDATE ug_training_plans SET updated_at=NOW() WHERE id=$1",[planId]);
  await audit(u.id,'exercise_assigned',Number(result.rows[0].id),{plan:planId});
  send(res,201,{ok:true,id:result.rows[0].id});return true;
 }
 if(route==='/api/v2/admin/plan/item/remove'&&req.method==='POST'){
  const item=id(b.item_id);if(!item)return error(400,'شناسه حرکت معتبر نیست');
  if(!await ownsItem(item))return error(403,'این حرکت مربوط به ورزشکاران شما نیست');
  const used=await pool.query('SELECT COUNT(*)::int AS n FROM ug_workout_logs WHERE plan_item_id=$1',[item]);
  if(used.rows[0].n>0)return error(409,'برای حفظ تاریخچه تمرین‌های ثبت‌شده، این حرکت قابل حذف نیست. برنامه جدید بساز.');
  const result=await pool.query("DELETE FROM ug_training_plan_items i USING ug_training_plans p WHERE i.id=$1 AND p.id=i.plan_id AND p.status IN('draft','active') RETURNING i.id,i.plan_id",[item]);
  if(!result.rowCount)return error(404,'حرکت قابل حذف پیدا نشد');
  await audit(u.id,'plan_item_removed',item,{plan:result.rows[0].plan_id});
  send(res,200,{ok:true});return true;
 }
 if(route==='/api/v2/admin/plan/activate'&&req.method==='POST'){
  const planId=id(b.plan_id);if(!planId)return error(400,'شناسه نامعتبر');
  if(!await ownsPlan(planId))return error(403,'این برنامه مربوط به ورزشکاران شما نیست');
  const client=await pool.connect();let who;
  try{
   await client.query('BEGIN');
   const p=await client.query("SELECT id,user_id,status FROM ug_training_plans WHERE id=$1 FOR UPDATE",[planId]);
   if(!p.rows.length||p.rows[0].status==='archived'){await client.query('ROLLBACK');return error(404,'برنامه موجود یا قابل فعال‌سازی نیست');}
   const itemCount=await client.query('SELECT count(*)::int as n FROM ug_training_plan_items WHERE plan_id=$1',[planId]);if(!itemCount.rows[0].n){await client.query('ROLLBACK');return error(400,'ابتدا حداقل یک حرکت به برنامه اضافه کن');}
   who=p.rows[0].user_id;
   await client.query("UPDATE ug_training_plans SET status='archived',updated_at=NOW() WHERE user_id=$1 AND status='active' AND id<>$2",[who,planId]);
   await client.query("UPDATE ug_training_plans SET status='active',updated_at=NOW() WHERE id=$1",[planId]);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
  await audit(u.id,'plan_activated',planId,{athlete:who});
  send(res,200,{ok:true});return true;
 }
 if(route==='/api/v2/admin/nutrition'&&req.method==='POST'){
  const who=id(b.user_id),title=clip(b.title,100);
  if(!who||title.length<3||!await getMember(who))return error(400,'ورزشکار و عنوان معتبر نیست');
  const result=await pool.query("INSERT INTO ug_nutrition_plans(user_id,title,breakfast,lunch,dinner,snacks,guidance,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id) DO UPDATE SET title=EXCLUDED.title,breakfast=EXCLUDED.breakfast,lunch=EXCLUDED.lunch,dinner=EXCLUDED.dinner,snacks=EXCLUDED.snacks,guidance=EXCLUDED.guidance,updated_at=NOW(),updated_by=EXCLUDED.updated_by RETURNING id",[who,title,clip(b.breakfast,600),clip(b.lunch,600),clip(b.dinner,600),clip(b.snacks,600),clip(b.guidance,950),u.id]);
  await audit(u.id,'nutrition_updated',Number(result.rows[0].id),{athlete:who});
  send(res,200,{ok:true});return true;
 }
 if(route==='/api/v2/admin/measure/verify'&&req.method==='POST'){
  const measureId=id(b.measurement_id);if(!measureId)return error(400,'شناسه اندازه‌گیری معتبر نیست');
  const m=await pool.query('SELECT user_id FROM ug_measurements WHERE id=$1',[measureId]);if(!m.rowCount||!await assigned(m.rows[0].user_id))return error(403,'این اندازه‌گیری به ورزشکاران شما تعلق ندارد');
  const r=await pool.query("UPDATE ug_measurements SET verified=true WHERE id=$1 AND source='member' AND verified=false RETURNING id,user_id",[measureId]);
  if(!r.rowCount)return error(404,'اندازه‌گیری تأییدنشده پیدا نشد');
  await audit(u.id,'measurement_verified',measureId,{athlete:r.rows[0].user_id});
  send(res,200,{ok:true});return true;
 }
 if(route==='/api/v2/admin/notices'&&req.method==='GET'){
  if(!admin)return error(403,'ارسال اعلان عمومی فقط برای مدیریت است');
  const r=await pool.query("SELECT n.id,n.user_id,n.title,n.body,n.kind,n.created_at,CASE WHEN n.user_id IS NULL THEN 'همه ورزشکاران' ELSE u.full_name END AS audience FROM ug_notices n LEFT JOIN ug_users u ON u.id=n.user_id ORDER BY n.created_at DESC LIMIT 65");
  send(res,200,{notices:r.rows});return true;
 }
 if(route==='/api/v2/admin/notices'&&req.method==='POST'){
  if(!admin)return error(403,'ارسال اعلان عمومی فقط برای مدیریت است');
  const who=b.user_id? id(b.user_id):null,title=clip(b.title,90),body=clip(b.body,750),kind=clip(b.kind,25);
  if(b.user_id&&!who||title.length<3||body.length<3||!['general','payment','attendance','training'].includes(kind))return error(400,'اطلاعات اعلان معتبر نیست');
  if(who&&!await getMember(who))return error(404,'ورزشکار پیدا نشد');
  const r=await pool.query("INSERT INTO ug_notices(user_id,title,body,kind,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id",[who,title,body,kind,u.id]);
  await audit(u.id,'notification_created',Number(r.rows[0].id),{audience:who||'all'});
  if(sendPush){try{await sendPush(pool,who,{title,body});}catch(e){console.error('UGYM push delivery error',e.message)}}
  send(res,201,{ok:true,id:r.rows[0].id,push_delivery_configured:!!process.env.VAPID_PUBLIC_KEY});return true;
 }
 return error(404,'مسیر موردنظر وجود ندارد');
};
