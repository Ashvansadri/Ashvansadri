'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Pool}=require('pg');
// Dependency-free PNG fallback icons for Android/iOS installability.
const zlib=require('node:zlib');
const iconCache=new Map();
function iconPng(size){
 if(iconCache.has(size))return iconCache.get(size);
 const rowSize=size*4+1,raw=Buffer.alloc(rowSize*size);
 function rounded(x,y){let m=.02,r=.11;let dx=Math.max(m+r-x,0,x-(1-m-r)),dy=Math.max(m+r-y,0,y-(1-m-r));return dx*dx+dy*dy<=r*r;}
 for(let py=0;py<size;py++){
   const y=(py+.5)/size,base=py*rowSize;raw[base]=0;
   for(let px=0;px<size;px++){
     const x=(px+.5)/size,j=base+1+px*4;
     let color=[26,21,44];
     if(rounded(x,y))color=[31,24,55];
     const uLeft=Math.abs(x-.27)<.062&&y>=.20&&y<=.65;
     const uRight=Math.abs(x-.73)<.062&&y>=.20&&y<=.65;
     const ring=y>=.6&&Math.abs(Math.hypot(x-.5,y-.6)-.23)<.061;
     if(uLeft)color=[197,177,255];if(uRight)color=[143,222,211];if(ring)color=[179,166,255];
     if(x>.16&&x<.84&&Math.abs(y-.45)<.017)color=[230,224,255];
     if((Math.abs(x-.14)<.023||Math.abs(x-.86)<.023)&&Math.abs(y-.45)<.046)color=x<.5?[167,135,245]:[132,220,208];
     if((x<.02||x>.98||y<.02||y>.98))color=[26,21,44];
     raw[j]=color[0];raw[j+1]=color[1];raw[j+2]=color[2];raw[j+3]=255;
   }
 }
 function crc(buf){let v=0xffffffff;for(const byte of buf){v^=byte;for(let i=0;i<8;i++)v=(v&1)?(v>>>1)^0xedb88320:v>>>1;}return(v^0xffffffff)>>>0;}
 function chunk(t,b){const name=Buffer.from(t),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(b.length);sum.writeUInt32BE(crc(Buffer.concat([name,b])));return Buffer.concat([len,name,b,sum]);}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
 const result=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 iconCache.set(size,result);return result;
}

const ROOT=path.join(__dirname,'public');
const DB_READY=Boolean(process.env.DATABASE_URL); const pool=DB_READY?new Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:15000,ssl:{rejectUnauthorized:true}}):null;
const PORT=Number(process.env.PORT||10000);
const MAX=35000;
const bins=new Map();
const authAttempts=new Map();
const now=()=>new Date().toISOString();
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const fail=(res,status,message)=>send(res,status,{error:message});
const hash=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const pwHash=(p)=>{let salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex');};
const pwCheck=(p,v)=>{if(!v||!v.includes(':'))return false;let [s,h]=v.split(':');let a=Buffer.from(h,'hex');let b=crypto.scryptSync(p,s,64);return a.length===b.length&&crypto.timingSafeEqual(a,b);};
function limit(ip){const t=Date.now(), v=bins.get(ip)||{n:0,t};if(t-v.t>60000){v.n=0;v.t=t;}v.n++;bins.set(ip,v);if(bins.size>2000)for(const [k,x] of bins)if(t-x.t>120000)bins.delete(k);return v.n>100;}
function authGuard(ip,identifier,passed){
  const key=ip+':'+String(identifier).slice(0,180), t=Date.now(), x=authAttempts.get(key)||{n:0,until:t+600000};
  if(t>x.until){x.n=0;x.until=t+600000;}
  if(passed){authAttempts.delete(key);return true;}
  x.n++;authAttempts.set(key,x);
  if(authAttempts.size>2000)for(const [k,v] of authAttempts)if(v.until<t)authAttempts.delete(k);
  return x.n<=8;
}
function body(req){return new Promise((ok,no)=>{let s='';req.on('data',d=>{s+=d;if(s.length>MAX){no(new Error('درخواست بیش از حد بزرگ است'));req.destroy();}});req.on('end',()=>{try{ok(s?JSON.parse(s):{});}catch{no(new Error('داده نامعتبر است'));}});req.on('error',no);});}
const clean=(v,max=160)=>String(v??'').trim().slice(0,max);
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=180;}
function userOut(u){return {id:u.id,role:u.role,full_name:u.full_name,email:u.email,username:u.username||null,discipline:u.discipline,goal:u.goal,height_cm:u.height_cm,created_at:u.created_at};}
function cookie(req){let v=req.headers.cookie||'';let m=v.match(/(?:^|;\s*)ugym_session=([^;]+)/);return m?.[1]||'';}
async function auth(req){let tok=cookie(req);if(!/^[a-f0-9]{64}$/.test(tok))return null;const r=await pool.query('SELECT u.id,u.role,u.full_name,u.email,u.username,u.discipline,u.goal,u.height_cm,u.created_at FROM ug_sessions s JOIN ug_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',[hash(tok)]);return r.rows[0]||null;}
async function session(res,userId){let tok=crypto.randomBytes(32).toString('hex');await pool.query("INSERT INTO ug_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '14 days')",[hash(tok),userId]);res.setHeader('Set-Cookie', 'ugym_session='+tok+'; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Strict');}
const positive=(x,max)=>Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=max;
const value=(x,max)=>x===''||x==null?null:positive(x,max)?Number(x):undefined;
const idok=(x)=>Number.isSafeInteger(Number(x))&&Number(x)>0;
async function init(){
  if(!DB_READY){console.warn('UGYM: waiting for DATABASE_URL environment variable');return;}
  await pool.query("CREATE TABLE IF NOT EXISTS ug_users (id BIGSERIAL PRIMARY KEY, role TEXT NOT NULL CHECK(role IN('admin','member')), full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, discipline TEXT NOT NULL DEFAULT 'بدنسازی', goal TEXT NOT NULL DEFAULT '', height_cm NUMERIC(5,1), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("ALTER TABLE ug_users ADD COLUMN IF NOT EXISTS username TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS ug_users_username_unique_ci ON ug_users (lower(username)) WHERE username IS NOT NULL");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS ug_users_single_owner ON ug_users ((role)) WHERE role='admin'");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_owner_invites (token_hash TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_sessions (token_hash TEXT PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES ug_users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_classes (id BIGSERIAL PRIMARY KEY,discipline TEXT NOT NULL,title TEXT NOT NULL,coach TEXT NOT NULL,weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),start_time TEXT NOT NULL,duration_min INTEGER NOT NULL DEFAULT 60,capacity INTEGER NOT NULL DEFAULT 14,price_toman BIGINT NOT NULL DEFAULT 0,active BOOLEAN NOT NULL DEFAULT TRUE)");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_bookings (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES ug_users(id) ON DELETE CASCADE,class_id BIGINT NOT NULL REFERENCES ug_classes(id),class_date DATE NOT NULL,status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN('booked','cancelled','attended')),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,class_id,class_date))");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_measurements (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES ug_users(id) ON DELETE CASCADE,measured_at DATE NOT NULL DEFAULT CURRENT_DATE,weight_kg NUMERIC(6,2),body_fat_pct NUMERIC(5,2),waist_cm NUMERIC(6,2),performance_score NUMERIC(6,2),note TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_payments (id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES ug_users(id) ON DELETE CASCADE,amount_toman BIGINT NOT NULL CHECK(amount_toman>0),status TEXT NOT NULL CHECK(status IN('paid','pending')),method TEXT NOT NULL DEFAULT 'نقدی',due_date DATE,paid_at TIMESTAMPTZ, note TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("ALTER TABLE ug_payments ADD COLUMN IF NOT EXISTS receipt_declared_at TIMESTAMPTZ");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_club_settings (id INTEGER PRIMARY KEY CHECK(id=1),card_number TEXT NOT NULL,card_holder TEXT NOT NULL,whatsapp TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("INSERT INTO ug_club_settings(id,card_number,card_holder,whatsapp) VALUES(1,'5894631136176906','زهره صابری','09171508927') ON CONFLICT(id) DO NOTHING");
  await pool.query("CREATE TABLE IF NOT EXISTS ug_audit (id BIGSERIAL PRIMARY KEY,actor_id BIGINT REFERENCES ug_users(id) ON DELETE SET NULL,action TEXT NOT NULL,record_id BIGINT,details JSONB,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const r=await pool.query("SELECT COUNT(*)::int n FROM ug_classes");if(r.rows[0].n===0){
    const examples=[['پیلاتس','پیلاتس | کنترل مرکزی','مربی پیلاتس',1,'09:00',55,14],['پیلاتس','پیلاتس | کشش و تعادل','مربی پیلاتس',3,'09:00',55,14],['ایروبیک','ایروبیک | ریتم و انرژی','مربی ایروبیک',2,'18:30',60,20],['ایروبیک','ایروبیک | هوازی پیشرفته','مربی ایروبیک',4,'18:30',60,20],['بدنسازی','بدنسازی | قدرت و فرم','مربی بدنسازی',1,'17:00',75,18],['بدنسازی','بدنسازی | قدرت و فرم','مربی بدنسازی',4,'17:00',75,18],['TRX','TRX | ثبات و عملکرد','مربی TRX',0,'19:00',50,12],['TRX','TRX | استقامت معلق','مربی TRX',3,'19:00',50,12]];
    for(const a of examples)await pool.query("INSERT INTO ug_classes(discipline,title,coach,weekday,start_time,duration_min,capacity) VALUES($1,$2,$3,$4,$5,$6,$7)",a);
  }
}
const isRole=(u,role)=>u&&u.role===role;
async function audit(actor,action,record_id,details={}){try{await pool.query('INSERT INTO ug_audit(actor_id,action,record_id,details) VALUES($1,$2,$3,$4)',[actor,action,record_id,JSON.stringify(details)])}catch(e){console.error('UGYM audit failed',e.code||e.message);}}
const cardSafe=(x)=>/^[0-9]{16}$/.test(x);
const phoneSafe=(x)=>/^09\d{9}$/.test(x);
async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(),microphone=(),geolocation=()');
  res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://images.unsplash.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  const ip=req.socket.remoteAddress||'unknown';
  if(limit(ip))return fail(res,429,'درخواست بیش از حد؛ کمی بعد تلاش کنید');
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  const iconMatch=p.match(/^\/icon-(192|512)\.png$/);if(req.method==='GET'&&iconMatch){const bytes=iconPng(Number(iconMatch[1]));res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length,'Cache-Control':'public,max-age=86400'});res.end(bytes);return;}
  if(!DB_READY&&p==='/api/me'&&req.method==='GET')return send(res,200,{user:null});
  if(!DB_READY&&p.startsWith('/api/'))return fail(res,503,'پایگاه داده هنوز به Render متصل نشده است');
  if(req.method==='GET'&&p==='/api/health'){try{await pool.query('SELECT 1');return send(res,200,{ok:true,time:now()});}catch{return fail(res,503,'پایگاه داده در دسترس نیست');}}
  if(p.startsWith('/api/')){
    try{
      if(!['GET','POST'].includes(req.method))return fail(res,405,'روش درخواست مجاز نیست');
      if(req.method==='POST'){
        if(req.headers['sec-fetch-site']==='cross-site')return fail(res,403,'درخواست از دامنه نامعتبر');
        if(req.headers.origin){const host=req.headers['x-forwarded-host']||req.headers.host;if(new URL(req.headers.origin).host!==host)return fail(res,403,'مبدأ درخواست نامعتبر');}
        if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return fail(res,415,'فرمت درخواست پشتیبانی نمی‌شود');
      }
      const b=req.method==='POST'?await body(req):{};
      if(p==='/api/public/payment-info'&&req.method==='GET'){
        const r=await pool.query('SELECT card_number,card_holder,whatsapp,updated_at FROM ug_club_settings WHERE id=1');
        if(!r.rows.length)return fail(res,503,'تنظیمات پرداخت هنوز ثبت نشده');
        return send(res,200,{payment:r.rows[0]});
      }
      if(p==='/api/bootstrap-status'&&req.method==='GET'){const n=await pool.query("SELECT EXISTS(SELECT 1 FROM ug_users WHERE role='admin') AS exists");return send(res,200,{needs_setup:!n.rows[0].exists});}
      if(p==='/api/bootstrap'&&req.method==='POST'){
        const invite=String(b.invite||'').trim(),username=clean(b.username,32).toLowerCase();
        const email=clean(b.email,180).toLowerCase(),full_name=clean(b.full_name,120),pass=String(b.password||'');
        if(!/^[a-f0-9]{64}$/.test(invite))return fail(res,403,'لینک دعوت مدیر معتبر نیست');
        if(!/^[a-z][a-z0-9_]{2,31}$/.test(username))return fail(res,400,'نام کاربری باید ۳ تا ۳۲ حرف انگلیسی، عدد یا زیرخط باشد و با حرف شروع شود');
        if(!validEmail(email)||full_name.length<2||pass.length<10||pass.length>128)return fail(res,400,'نام، ایمیل یا رمز معتبر نیست؛ رمز باید حداقل ۱۰ نویسه باشد');
        const expected=String(process.env.OWNER_INVITE_HASH||'');
        if(!/^[a-f0-9]{64}$/.test(expected)||!crypto.timingSafeEqual(Buffer.from(hash(invite),'hex'),Buffer.from(expected,'hex')))return fail(res,403,'لینک خصوصی مدیریت معتبر نیست');
        const client=await pool.connect();let created=null;
        try{
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(865713270)');
          const exists=await client.query("SELECT EXISTS(SELECT 1 FROM ug_users WHERE role='admin') AS n");
          if(exists.rows[0].n){await client.query('ROLLBACK');return fail(res,409,'حساب مدیر قبلاً ساخته شده است');}
          const made=await client.query("INSERT INTO ug_users(role,full_name,email,username,password_hash) VALUES('admin',$1,$2,$3,$4) RETURNING id",[full_name,email,username,pwHash(pass)]);
          await client.query('COMMIT');created=made.rows[0].id;
        }catch(e){await client.query('ROLLBACK').catch(()=>{});if(e.code==='23505')return fail(res,409,'ایمیل یا نام کاربری تکراری است');throw e;}
        finally{client.release();}
        await session(res,created);return send(res,201,{ok:true});
      }
      if(p==='/api/auth/register'&&req.method==='POST'){
        let name=clean(b.full_name,120),email=clean(b.email,180).toLowerCase(),pass=String(b.password||''),discipline=clean(b.discipline,40);
        if(name.length<2||!validEmail(email)||pass.length<10||pass.length>128||!['پیلاتس','ایروبیک','بدنسازی','TRX'].includes(discipline))return fail(res,400,'اطلاعات ثبت‌نام معتبر نیست؛ رمز حداقل ۱۰ حرف باشد');
        let r;try{r=await pool.query("INSERT INTO ug_users(role,full_name,email,password_hash,discipline) VALUES('member',$1,$2,$3,$4) RETURNING id",[name,email,pwHash(pass),discipline]);}catch(e){if(e.code==='23505')return fail(res,409,'این ایمیل قبلاً ثبت شده است');throw e;}
        await session(res,r.rows[0].id);return send(res,201,{ok:true});
      }
      if(p==='/api/auth/login'&&req.method==='POST'){
        const identifier=clean(b.identifier||b.email,180).toLowerCase(),pass=String(b.password||'');
        if(identifier.length<3||pass.length>128)return fail(res,401,'نام کاربری یا رمز عبور نادرست است');
        const r=await pool.query("SELECT id,password_hash FROM ug_users WHERE lower(email)=$1 OR lower(username)=$1 LIMIT 1",[identifier]);
        if(!r.rows.length||!pwCheck(pass,r.rows[0].password_hash)){
          if(!authGuard(ip,identifier,false))return fail(res,429,'تلاش‌های ورود بیش از حد؛ ده دقیقه بعد امتحان کنید');
          return fail(res,401,'نام کاربری یا رمز عبور نادرست است');
        }
        authGuard(ip,identifier,true);await session(res,r.rows[0].id);return send(res,200,{ok:true});
      }
      if(p==='/api/auth/logout'&&req.method==='POST'){
        if(cookie(req))await pool.query('DELETE FROM ug_sessions WHERE token_hash=$1',[hash(cookie(req))]);
        res.setHeader('Set-Cookie','ugym_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');return send(res,200,{ok:true});
      }
      if(p==='/api/classes'&&req.method==='GET'){const r=await pool.query('SELECT * FROM ug_classes WHERE active=TRUE ORDER BY weekday,start_time');return send(res,200,{classes:r.rows});}
      if(p==='/api/me'&&req.method==='GET'){const u=await auth(req);return send(res,200,{user:u?userOut(u):null});}
      const u=await auth(req);if(!u)return fail(res,401,'ابتدا وارد حساب شوید');
      if(p==='/api/account/change-password'&&req.method==='POST'){
        const oldPassword=String(b.current_password||''),newPassword=String(b.new_password||'');
        if(newPassword.length<12||newPassword.length>128||oldPassword===newPassword)return fail(res,400,'رمز جدید باید حداقل ۱۲ کاراکتر و متفاوت با رمز قبلی باشد');
        const entry=await pool.query("SELECT password_hash FROM ug_users WHERE id=$1",[u.id]);
        if(!entry.rows.length||!pwCheck(oldPassword,entry.rows[0].password_hash))return fail(res,403,'رمز فعلی صحیح نیست');
        await pool.query("UPDATE ug_users SET password_hash=$2 WHERE id=$1",[u.id,pwHash(newPassword)]);
        await pool.query('DELETE FROM ug_sessions WHERE user_id=$1 AND token_hash<>$2',[u.id,hash(cookie(req))]);
        await audit(u.id,'password_changed',u.id);
        return send(res,200,{ok:true});
      }
            if(p==='/api/member/dashboard'&&req.method==='GET'){

        if(!isRole(u,'member'))return fail(res,403,'این بخش مخصوص ورزشکار است');
        const [measurements,payments,bookings]=await Promise.all([
          pool.query('SELECT * FROM ug_measurements WHERE user_id=$1 ORDER BY measured_at ASC,id ASC LIMIT 300',[u.id]),
          pool.query('SELECT * FROM ug_payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.id]),
          pool.query("SELECT b.*,c.title,c.discipline,c.start_time,c.coach FROM ug_bookings b JOIN ug_classes c ON c.id=b.class_id WHERE b.user_id=$1 ORDER BY b.class_date DESC LIMIT 100",[u.id])
        ]);return send(res,200,{user:userOut(u),measurements:measurements.rows,payments:payments.rows,bookings:bookings.rows});
      }
      if(p==='/api/member/book'&&req.method==='POST'){
        if(!isRole(u,'member'))return fail(res,403,'مجوز لازم را ندارید');
        if(!idok(b.class_id)||!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date||'')))return fail(res,400,'کلاس یا تاریخ معتبر نیست');
        const d=new Date(b.date+'T00:00:00Z'),today=new Date();today.setUTCHours(0,0,0,0);
        if(!Number.isFinite(d.valueOf())||d<today||d>new Date(today.valueOf()+90*86400000))return fail(res,400,'تاریخ خارج از بازه رزرو است');
        const client=await pool.connect();try{
          await client.query('BEGIN');
          const cl=await client.query('SELECT * FROM ug_classes WHERE id=$1 AND active=true FOR UPDATE',[b.class_id]);if(!cl.rows.length||cl.rows[0].weekday!==d.getUTCDay()){await client.query('ROLLBACK');return fail(res,400,'این کلاس در روز انتخاب‌شده برگزار نمی‌شود');}
          const full=await client.query("SELECT COUNT(*)::int n FROM ug_bookings WHERE class_id=$1 AND class_date=$2 AND status IN('booked','attended')",[b.class_id,b.date]);const previous=await client.query('SELECT status FROM ug_bookings WHERE user_id=$1 AND class_id=$2 AND class_date=$3',[u.id,b.class_id,b.date]);
          if(full.rows[0].n>=cl.rows[0].capacity&&previous.rows[0]?.status!=='booked'){await client.query('ROLLBACK');return fail(res,409,'ظرفیت کلاس تکمیل است');}
          await client.query("INSERT INTO ug_bookings(user_id,class_id,class_date,status) VALUES($1,$2,$3,'booked') ON CONFLICT(user_id,class_id,class_date) DO UPDATE SET status='booked'",[u.id,b.class_id,b.date]);await client.query('COMMIT');return send(res,200,{ok:true});
        }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
      }
      if(p==='/api/member/cancel'&&req.method==='POST'){
        if(!isRole(u,'member')||!idok(b.booking_id))return fail(res,400,'درخواست نامعتبر است');
        const r=await pool.query("UPDATE ug_bookings SET status='cancelled' WHERE id=$1 AND user_id=$2 AND status='booked' AND class_date>=CURRENT_DATE RETURNING id",[b.booking_id,u.id]);return send(res,200,{ok:r.rowCount>0});
      }
      if(p==='/api/member/payment/receipt-notice'&&req.method==='POST'){
        if(!isRole(u,'member')||!idok(b.payment_id))return fail(res,400,'درخواست معتبر نیست');
        const r=await pool.query("UPDATE ug_payments SET receipt_declared_at=COALESCE(receipt_declared_at,NOW()) WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING id",[b.payment_id,u.id]);
        if(r.rowCount===0)return fail(res,404,'شهریه باز مربوط به حساب شما پیدا نشد');
        await audit(u.id,'receipt_notice',Number(b.payment_id));
        return send(res,200,{ok:true,message:'اعلام ارسال رسید ثبت شد. تأیید پرداخت فقط با مدیریت است.'});
      }
            if(!isRole(u,'admin'))return fail(res,403,'این بخش فقط مخصوص مدیر است');
      if(p==='/api/admin/settings'&&req.method==='POST'){
        const card_number=clean(b.card_number,35).replace(/[-\s]/g,''),card_holder=clean(b.card_holder,100),whatsapp=clean(b.whatsapp,20).replace(/[\s-]/g,'');
        if(!cardSafe(card_number)||card_holder.length<3||!phoneSafe(whatsapp))return fail(res,400,'شماره کارت ۱۶ رقمی، نام صاحب کارت و شماره واتساپ ۱۱ رقمی معتبر وارد کنید');
        const r=await pool.query('UPDATE ug_club_settings SET card_number=$1,card_holder=$2,whatsapp=$3,updated_at=NOW() WHERE id=1 RETURNING card_number,card_holder,whatsapp,updated_at',[card_number,card_holder,whatsapp]);
        await audit(u.id,'settings_changed',1,{kind:'bank_and_whatsapp'});
        return send(res,200,{ok:true,payment:r.rows[0]});
      }
      if(p==='/api/admin/audit'&&req.method==='GET'){
        const r=await pool.query('SELECT action,record_id,created_at FROM ug_audit ORDER BY id DESC LIMIT 60');
        return send(res,200,{logs:r.rows});
      }
      if(p==='/api/admin/overview'&&req.method==='GET'){
        const [members,classes,payments,bookings,financial]=await Promise.all([
          pool.query("SELECT u.id,u.full_name,u.email,u.discipline,u.goal,u.height_cm,u.created_at,(SELECT COUNT(*)::int FROM ug_measurements m WHERE m.user_id=u.id) measurement_count FROM ug_users u WHERE u.role='member' ORDER BY u.id DESC LIMIT 1000"),
          pool.query("SELECT * FROM ug_classes ORDER BY id DESC LIMIT 200"),
          pool.query("SELECT p.*,u.full_name FROM ug_payments p JOIN ug_users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 300"),
          pool.query("SELECT b.*,u.full_name,c.title FROM ug_bookings b JOIN ug_users u ON u.id=b.user_id JOIN ug_classes c ON c.id=b.class_id ORDER BY b.class_date DESC,b.id DESC LIMIT 250"),
          pool.query("SELECT COALESCE(SUM(amount_toman) FILTER (WHERE status='paid'),0)::text AS paid_total, COALESCE(SUM(amount_toman) FILTER (WHERE status='pending'),0)::text AS pending_total,COUNT(*)::int AS payment_count FROM ug_payments")
        ]);return send(res,200,{members:members.rows,classes:classes.rows,payments:payments.rows,bookings:bookings.rows,financial:financial.rows[0]});
      }
      if(p==='/api/admin/member'&&req.method==='GET'){
        if(!idok(url.searchParams.get('id')))return fail(res,400,'شناسه نامعتبر');
        const id=url.searchParams.get('id');
        const [person,m,p,bk]=await Promise.all([pool.query("SELECT id,full_name,email,discipline,goal,height_cm,created_at FROM ug_users WHERE id=$1 AND role='member'",[id]),pool.query('SELECT * FROM ug_measurements WHERE user_id=$1 ORDER BY measured_at ASC,id ASC',[id]),pool.query('SELECT * FROM ug_payments WHERE user_id=$1 ORDER BY created_at DESC',[id]),pool.query('SELECT b.*,c.title FROM ug_bookings b JOIN ug_classes c ON c.id=b.class_id WHERE b.user_id=$1 ORDER BY b.class_date DESC',[id])]);
        if(!person.rows.length)return fail(res,404,'ورزشکار پیدا نشد');return send(res,200,{user:person.rows[0],measurements:m.rows,payments:p.rows,bookings:bk.rows});
      }
      if(p==='/api/admin/member/create'&&req.method==='POST'){
        const full_name=clean(b.full_name,120),email=clean(b.email,180).toLowerCase(),password=String(b.password||''),discipline=clean(b.discipline,40);
        if(full_name.length<2||!validEmail(email)||password.length<10||!['پیلاتس','ایروبیک','بدنسازی','TRX'].includes(discipline))return fail(res,400,'اطلاعات ورزشکار معتبر نیست');
        try{const r=await pool.query("INSERT INTO ug_users(role,full_name,email,password_hash,discipline) VALUES('member',$1,$2,$3,$4) RETURNING id",[full_name,email,pwHash(password),discipline]);await audit(u.id,'member_created',Number(r.rows[0].id),{discipline});return send(res,201,{ok:true,id:r.rows[0].id});}catch(e){if(e.code==='23505')return fail(res,409,'ایمیل تکراری است');throw e;}
      }
      if(p==='/api/admin/member/update'&&req.method==='POST'){
        if(!idok(b.user_id)||!['پیلاتس','ایروبیک','بدنسازی','TRX'].includes(b.discipline))return fail(res,400,'اطلاعات نامعتبر');
        const h=value(b.height_cm,260);if(h===undefined)return fail(res,400,'قد نامعتبر');
        const r=await pool.query("UPDATE ug_users SET discipline=$2,goal=$3,height_cm=$4 WHERE id=$1 AND role='member' RETURNING id",[b.user_id,b.discipline,clean(b.goal,300),h]);if(r.rowCount)await audit(u.id,'member_updated',Number(b.user_id));return send(res,200,{ok:r.rowCount>0});
      }
      if(p==='/api/admin/measurement'&&req.method==='POST'){
        if(!idok(b.user_id))return fail(res,400,'شناسه ورزشکار معتبر نیست');
        const fields=['weight_kg','body_fat_pct','waist_cm','performance_score'],maxes=[500,100,400,100];
        let vals=fields.map((k,i)=>value(b[k],maxes[i]));if(vals.some(x=>x===undefined)||vals.every(x=>x===null))return fail(res,400,'حداقل یک مقدار اندازه‌گیری معتبر وارد کنید');
        const date=String(b.measured_at||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T00:00:00Z').valueOf()))return fail(res,400,'تاریخ نامعتبر');
        const r=await pool.query('INSERT INTO ug_measurements(user_id,measured_at,weight_kg,body_fat_pct,waist_cm,performance_score,note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[b.user_id,date,...vals,clean(b.note,500)]);await audit(u.id,'assessment_added',Number(r.rows[0].id),{member:Number(b.user_id)});return send(res,201,{ok:true,id:r.rows[0].id});
      }
      if(p==='/api/admin/payment'&&req.method==='POST'){
        if(!idok(b.user_id)||!Number.isSafeInteger(Number(b.amount_toman))||Number(b.amount_toman)<=0||Number(b.amount_toman)>1e12||!['paid','pending'].includes(b.status))return fail(res,400,'اطلاعات پرداخت معتبر نیست');
        const status=b.status, due_date=b.due_date||null;if(due_date&&!/^\d{4}-\d{2}-\d{2}$/.test(due_date))return fail(res,400,'موعد نامعتبر');
        const exists=await pool.query("SELECT 1 FROM ug_users WHERE id=$1 AND role='member'",[b.user_id]);if(!exists.rowCount)return fail(res,404,'ورزشکار یافت نشد');
        const r=await pool.query("INSERT INTO ug_payments(user_id,amount_toman,status,method,due_date,paid_at,note) VALUES($1,$2,$3,$4,$5,CASE WHEN $3='paid' THEN NOW() ELSE NULL END,$6) RETURNING id",[b.user_id,Number(b.amount_toman),status,clean(b.method,40)||'کارت‌به‌کارت',due_date,clean(b.note,250)]);await audit(u.id,'payment_created',Number(r.rows[0].id),{member:Number(b.user_id),amount:Number(b.amount_toman),status});return send(res,201,{ok:true,id:r.rows[0].id});
      }
      if(p==='/api/admin/payment/status'&&req.method==='POST'){
        if(!idok(b.payment_id)||!['paid','pending'].includes(b.status))return fail(res,400,'درخواست نامعتبر');
        const r=await pool.query("UPDATE ug_payments SET status=$2,paid_at=CASE WHEN $2='paid' THEN COALESCE(paid_at,NOW()) ELSE NULL END WHERE id=$1 AND status<>$2 RETURNING id",[b.payment_id,b.status]);if(r.rowCount)await audit(u.id,'payment_status_changed',Number(b.payment_id),{to:b.status});return send(res,200,{ok:r.rowCount>0});
      }
      if(p==='/api/admin/class/update'&&req.method==='POST'){
        const id=Number(b.class_id),discipline=clean(b.discipline,40),title=clean(b.title,120),coach=clean(b.coach,120);
        const weekday=Number(b.weekday),start_time=clean(b.start_time,5),duration=Number(b.duration_min),capacity=Number(b.capacity),price=Number(b.price_toman||0);
        const active=String(b.active)==='true';
        if(!idok(id)||!['پیلاتس','ایروبیک','بدنسازی','TRX'].includes(discipline)||title.length<3||coach.length<2||!Number.isInteger(weekday)||weekday<0||weekday>6||!/^\d{2}:\d{2}$/.test(start_time)||Number(start_time.slice(0,2))>23||Number(start_time.slice(3))>59||!Number.isInteger(duration)||duration<15||duration>180||!Number.isInteger(capacity)||capacity<1||capacity>100||!Number.isSafeInteger(price)||price<0||price>1e12)return fail(res,400,'اطلاعات کلاس برای ویرایش معتبر نیست');
        const r=await pool.query('UPDATE ug_classes SET discipline=$2,title=$3,coach=$4,weekday=$5,start_time=$6,duration_min=$7,capacity=$8,price_toman=$9,active=$10 WHERE id=$1 RETURNING id',[id,discipline,title,coach,weekday,start_time,duration,capacity,price,active]);
        if(!r.rowCount)return fail(res,404,'کلاس پیدا نشد');
        await audit(u.id,'class_updated',id,{active,discipline});return send(res,200,{ok:true,id});
      }
            if(p==='/api/admin/class'&&req.method==='POST'){

        const discipline=clean(b.discipline,40),title=clean(b.title,120),coach=clean(b.coach,120),start_time=clean(b.start_time,5),weekday=Number(b.weekday),capacity=Number(b.capacity),duration=Number(b.duration_min);
        if(!['پیلاتس','ایروبیک','بدنسازی','TRX'].includes(discipline)||title.length<3||coach.length<2||!Number.isInteger(weekday)||weekday<0||weekday>6||!/^\d{2}:\d{2}$/.test(start_time)||Number(start_time.slice(0,2))>23||Number(start_time.slice(3))>59||!Number.isInteger(capacity)||capacity<1||capacity>100||!Number.isInteger(duration)||duration<15||duration>180)return fail(res,400,'اطلاعات کلاس معتبر نیست');
        const r=await pool.query('INSERT INTO ug_classes(discipline,title,coach,weekday,start_time,duration_min,capacity) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[discipline,title,coach,weekday,start_time,duration,capacity]);await audit(u.id,'class_created',Number(r.rows[0].id),{discipline});return send(res,201,{ok:true,id:r.rows[0].id});
      }
      if(p==='/api/admin/booking/status'&&req.method==='POST'){
        if(!idok(b.booking_id)||!['attended','booked','cancelled'].includes(b.status))return fail(res,400,'اطلاعات نامعتبر');
        const r=await pool.query('UPDATE ug_bookings SET status=$2 WHERE id=$1 RETURNING id',[b.booking_id,b.status]);return send(res,200,{ok:r.rowCount>0});
      }
      return fail(res,404,'مسیر یافت نشد');
    }catch(e){console.error('API',p,e.code||e.message);return fail(res,500,'خطای داخلی سرور؛ دوباره تلاش کنید');}
  }
  if(req.method!=='GET')return fail(res,405,'روش مجاز نیست');
  if(p==='/icon-192.png'||p==='/icon-512.png'||p==='/apple-touch-icon.png'){
    const icon=iconPng(p==='/icon-512.png'?512:p==='/icon-192.png'?192:180);
    res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public,max-age=604800','Content-Length':icon.length});res.end(icon);return;
  }
  const files={'/':'index.html','/admin':'index.html','/member':'index.html','/setup':'index.html','/login':'index.html','/register':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/extras.js':'extras.js','/extras.css':'extras.css','/manifest.webmanifest':'manifest.webmanifest','/sw.js':'sw.js','/logo.svg':'logo.svg'};
  let file=files[p];if(!file)return fail(res,404,'صفحه یافت نشد');
  const mime={'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml','webmanifest':'application/manifest+json'};
  const ext=file.split('.').pop();
  res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':file==='index.html'?'no-cache':'public, max-age=3600'});
  fs.createReadStream(path.join(ROOT,file)).pipe(res);
}
init().then(()=>http.createServer((req,res)=>{handler(req,res).catch(e=>{console.error(e);if(!res.headersSent)fail(res,500,'خطای غیرمنتظره');else res.end();});}).listen(PORT,'0.0.0.0',()=>console.log('UGYM listening on '+PORT))).catch(e=>{console.error('UGYM startup failed:',e.message);process.exit(1);});
