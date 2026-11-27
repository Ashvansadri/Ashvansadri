'use strict';
const crypto=require('crypto');
module.exports=async function coachRoutes({req,res,path:p,body:b,pool,auth,send,fail,audit,pwHash,session}){
 if(!p.startsWith('/api/v3/coach')&&!p.startsWith('/api/v3/admin/coach'))return false;
 const no=(n,m)=>{fail(res,n,m);return true};
 const tidy=(v,n)=>String(v??'').trim().slice(0,n);
 const id=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
 if(p==='/api/v3/coach/join'&&req.method==='POST'){
  const token=tidy(b.invite,64),name=tidy(b.full_name,120),email=tidy(b.email,180).toLowerCase(),username=tidy(b.username,32).toLowerCase(),password=String(b.password||'');
  if(!/^[a-f0-9]{64}$/.test(token)||name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[a-z][a-z0-9_]{2,31}$/.test(username)||password.length<12||password.length>128)return no(400,'اطلاعات دعوت یا رمز نامعتبر است؛ رمز حداقل ۱۲ کاراکتر باشد');
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const client=await pool.connect();let coachId;
  try{
   await client.query('BEGIN');
   const invite=await client.query('SELECT email FROM ug_coach_invites WHERE token_hash=$1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at>NOW() FOR UPDATE',[hash]);
   if(!invite.rowCount||invite.rows[0].email.toLowerCase()!==email){await client.query('ROLLBACK');return no(403,'لینک دعوت منقضی یا نامعتبر است');}
   const r=await client.query("INSERT INTO ug_users(role,full_name,email,username,password_hash) VALUES('coach',$1,$2,$3,$4) RETURNING id",[name,email,username,pwHash(password)]);
   coachId=r.rows[0].id;
   await client.query('UPDATE ug_coach_invites SET used_at=NOW(),used_by=$2 WHERE token_hash=$1',[hash,coachId]);
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});if(e.code==='23505')return no(409,'ایمیل یا نام کاربری تکراری است');throw e;}
  finally{client.release();}
  await session(res,coachId);await audit(coachId,'coach_joined',coachId);
  send(res,201,{ok:true});return true;
 }
 const u=await auth(req);if(!u)return no(401,'ابتدا وارد حساب شوید');
 if(p==='/api/v3/coach/roster'&&req.method==='GET'){
  if(u.role!=='coach')return no(403,'فقط مربی');
  const r=await pool.query("SELECT u.id,u.full_name,u.discipline,u.goal,u.height_cm,ca.created_at FROM ug_coach_assignments ca JOIN ug_users u ON u.id=ca.user_id AND u.role='member' WHERE ca.coach_id=$1 ORDER BY u.full_name LIMIT 500",[u.id]);
  send(res,200,{members:r.rows,coach:{id:u.id,full_name:u.full_name}});return true;
 }
 if(u.role!=='admin')return no(403,'فقط مدیریت');
 if(p==='/api/v3/admin/coaches'&&req.method==='GET'){
  const [roster,assigned,invites]=await Promise.all([
   pool.query("SELECT c.id,c.full_name,c.email,c.username,c.created_at,COUNT(a.user_id)::int AS assigned_count FROM ug_users c LEFT JOIN ug_coach_assignments a ON a.coach_id=c.id WHERE c.role='coach' GROUP BY c.id ORDER BY c.id DESC"),
   pool.query('SELECT coach_id,user_id FROM ug_coach_assignments ORDER BY coach_id,user_id LIMIT 1000'),
   pool.query('SELECT email,full_name,created_at,expires_at,used_at,revoked_at FROM ug_coach_invites ORDER BY created_at DESC LIMIT 25')
  ]);
  send(res,200,{coaches:roster.rows,assignments:assigned.rows,invites:invites.rows});return true;
 }
 if(p==='/api/v3/admin/coach-invite'&&req.method==='POST'){
  const name=tidy(b.full_name,120),email=tidy(b.email,180).toLowerCase();
  if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return no(400,'نام و ایمیل معتبر وارد کنید');
  const r=await pool.query('SELECT id FROM ug_users WHERE lower(email)=$1',[email]);if(r.rowCount)return no(409,'این ایمیل از قبل حساب دارد');
  const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');
  await pool.query("INSERT INTO ug_coach_invites(token_hash,full_name,email,created_by,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '48 hours')",[hash,name,email,u.id]);
  await audit(u.id,'coach_invite_created',null,{email});
  send(res,201,{ok:true,invite:token,expires_in_hours:48});return true;
 }
 if(p==='/api/v3/admin/coach/assign'&&req.method==='POST'){
  const coachId=id(b.coach_id),athleteId=id(b.user_id),assigned=b.assigned===true;
  if(!coachId||!athleteId)return no(400,'مربی یا ورزشکار معتبر نیست');
  const check=await pool.query('SELECT id,role FROM ug_users WHERE id IN($1,$2)',[coachId,athleteId]);
  if(!check.rows.some(x=>Number(x.id)===coachId&&x.role==='coach')||!check.rows.some(x=>Number(x.id)===athleteId&&x.role==='member'))return no(404,'حساب مربی یا ورزشکار پیدا نشد');
  if(assigned)await pool.query('INSERT INTO ug_coach_assignments(coach_id,user_id,created_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[coachId,athleteId,u.id]);
  else await pool.query('DELETE FROM ug_coach_assignments WHERE coach_id=$1 AND user_id=$2',[coachId,athleteId]);
  await audit(u.id,'coach_assignment',athleteId,{coach_id:coachId,assigned});send(res,200,{ok:true});return true;
 }
 return no(404,'مسیر مربی یافت نشد');
};