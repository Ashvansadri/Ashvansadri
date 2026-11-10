'use strict';
(function(){
const $=(id)=>document.getElementById(id);
const S={user:null,classes:[],admin:null,member:null,person:null,selected:null,tab:'overview',memberTab:'progress',metric:'weight_kg'};
const DISC=['بدنسازی','پیلاتس','ایروبیک','TRX'];
const DAYS=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
const METRICS=[['weight_kg','وزن','کیلوگرم'],['body_fat_pct','چربی بدن','٪'],['waist_cm','دور کمر','سانتی‌متر'],['performance_score','شاخص عملکرد','امتیاز']];
const h=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v)=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(Number(v)||0);
const money=(v)=>n(v)+' تومان';
const when=(v)=>v?new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium'}).format(new Date(v)):'—';
const dt=(v)=>v?new Date(v).toLocaleDateString('fa-IR'):'—';
const blank=(msg)=>'<div class="no-data"><div class="empty-icon">◇</div>'+h(msg)+'</div>';
const chip=(s)=>'<span class="pill '+(s==='paid'||s==='attended'?'mint':s==='pending'?'amber':s==='cancelled'?'rose':'')+'">'+h(({paid:'پرداخت‌شده',pending:'در انتظار پرداخت',booked:'رزرو شده',cancelled:'لغو شده',attended:'حاضر'})[s]||s)+'</span>';
const fmt=(d)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const nextDay=(day)=>{let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+((day-d.getDay()+7)%7));return fmt(d);};
const label=(k)=>METRICS.find(a=>a[0]===k)||METRICS[0];
async function api(url,body){
 const opts={credentials:'same-origin',headers:{'Accept':'application/json'}};
 if(body!==undefined){opts.method='POST';opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
 const r=await fetch(url,opts);let j={};try{j=await r.json();}catch{}
 if(!r.ok)throw Error(j.error||'ارتباط با سرور برقرار نشد');return j;
}
function flash(msg,error){const t=$('toast');t.textContent=msg;t.hidden=false;t.style.borderColor=error?'#e97692':'#ab92eb';clearTimeout(flash.timer);flash.timer=setTimeout(()=>t.hidden=true,4300);}
function show(page){['page-home','page-auth','page-admin','page-member'].forEach(id=>$(id).hidden=id!==page);document.body.classList.toggle('on-dashboard',page==='page-admin'||page==='page-member');}
function header(){if(S.user){$('header-user').textContent='سلام، '+S.user.full_name;$('primary-action').href=S.user.role==='admin'?'/admin':'/member';$('primary-action').innerHTML='داشبورد من ←';}else{$('header-user').textContent='';$('primary-action').href='/login';$('primary-action').innerHTML='ورود به حساب ↗';}}
function setActive(selector,attr,v){document.querySelectorAll(selector).forEach(b=>b.classList.toggle('active',b.dataset[attr]===v));}
function table(head,rows){return '<div class="table-scroll"><table class="data-table"><thead><tr>'+head.map(x=>'<th>'+h(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';}
function stats(arr){return '<div class="dash-grid">'+arr.map(a=>'<div class="stat-card"><div class="stat-label">'+h(a[0])+'</div><div class="stat-value">'+h(a[1])+'</div><div class="stat-hint">'+h(a[2])+'</div></div>').join('')+'</div>';}
function moneySum(arr,status){return arr.filter(x=>!status||x.status===status).reduce((v,x)=>v+Number(x.amount_toman),0);}
function sportSelect(v){return '<select name="discipline">'+DISC.map(x=>'<option '+(v===x?'selected':'')+'>'+h(x)+'</option>').join('')+'</select>';}
function shortTableMembers(arr){return table(['ورزشکار','رشته','سابقه','پرونده'],arr.map(x=>'<tr><td>'+h(x.full_name)+'</td><td>'+h(x.discipline)+'</td><td>'+n(x.measurement_count)+' ثبت</td><td><button class="action-link" data-person="'+x.id+'">مشاهده ←</button></td></tr>'));}
function shortTablePayments(arr){return table(['ورزشکار','مبلغ','وضعیت','تاریخ'],arr.map(x=>'<tr><td>'+h(x.full_name||'شما')+'</td><td>'+money(x.amount_toman)+'</td><td>'+chip(x.status)+'</td><td>'+when(x.created_at)+'</td></tr>'));}
function authPage(mode){
 show('page-auth');
 const setup=mode==='setup',reg=mode==='register';
 $('auth-kicker').textContent=setup?'UGYM / OWNER SETUP':'UGYM / ACCOUNT';
 $('auth-title').textContent=setup?'راه‌اندازی مدیریت':reg?'به UGYM خوش آمدی!':'خوش برگشتی!';
 $('auth-subtitle').textContent=setup?'با کلید اولیه، حساب اختصاصی مدیر باشگاه را بساز.':reg?'اطلاعاتت را وارد کن و مسیرت را شروع کن.':'برای ادامه مسیر وارد حساب خودت شو.';
 $('auth-name-box').hidden=!(reg||setup);$('auth-sport-box').hidden=!reg;$('setup-key-box').hidden=!setup;
 $('auth-submit').textContent=setup?'ایجاد حساب مدیر ←':reg?'ثبت‌نام ورزشکار ←':'ورود به حساب ←';
 $('auth-switch').href=reg||setup?'/login':'/register';$('auth-switch').textContent=reg||setup?'قبلاً حساب ساخته‌ای؟ ورود':'حساب نداری؟ ثبت‌نام کن';
 $('auth-form').reset();$('auth-form').querySelector('input[name=password]').setAttribute('autocomplete',reg||setup?'new-password':'current-password');$('auth-error').hidden=true;
 if(setup)api('/api/bootstrap-status').then(x=>{if(!x.needs_setup){$('auth-error').textContent='حساب مدیریت قبلاً فعال شده است. از صفحه ورود استفاده کنید.';$('auth-error').hidden=false;$('auth-submit').disabled=true;}else $('auth-submit').disabled=false;}).catch(e=>flash(e.message,true));else $('auth-submit').disabled=false;
}
function renderAdminOverview(){
 const a=S.admin;let paid=Number(a.financial?.paid_total||0),pending=Number(a.financial?.pending_total||0);
 $('admin-view').innerHTML='<div class="welcome-banner"><span>CLUB INTELLIGENCE / LIVE</span><h2>کنترل کامل باشگاه، یک‌جا.</h2><p>ورزشکاران، کلاس‌ها، ثبت تغییرات بدن و شهریه‌ها را از یک مرکز مدیریت کن. همه تغییرات اینجا روی پایگاه داده باشگاه ثبت می‌شوند.</p></div>'+
 stats([['تعداد ورزشکاران',n(a.members.length),'حساب‌های ثبت‌شده'],['کلاس‌های فعال',n(a.classes.filter(x=>x.active).length),'چهار رشته تخصصی'],['دریافت‌های ثبت‌شده',money(paid),'جمع تراکنش‌های پرداخت‌شده'],['در انتظار وصول',money(pending),'بدهی‌های ثبت‌شده']])+
 '<div class="layout-two"><div class="dash-card"><div class="card-head"><h3>آخرین ورزشکاران</h3><button data-tab="members" class="action-link">مشاهده همه ←</button></div>'+(a.members.length?shortTableMembers(a.members.slice(0,6)):blank('هنوز ورزشکاری ثبت نشده است'))+'</div><div class="dash-card"><div class="card-head"><h3>آخرین شهریه‌ها</h3><button data-tab="payments" class="action-link">مشاهده مالی ←</button></div>'+(a.payments.length?'<div>'+a.payments.slice(0,6).map(x=>'<div class="selection-row"><div class="list-copy"><strong>'+h(x.full_name)+'</strong><small>'+when(x.created_at)+'</small></div><div class="list-copy"><strong>'+money(x.amount_toman)+'</strong>'+chip(x.status)+'</div></div>').join('')+'</div>':blank('شهریه‌ای ثبت نشده است'))+'</div></div>';
}
function chart(records,metric){
 const meta=label(metric),vals=records.filter(x=>x[metric]!==null&&x[metric]!==undefined).map(x=>({date:x.measured_at,val:Number(x[metric])}));
 if(!vals.length)return blank('برای نمایش نمودار، مدیر باید اولین اندازه‌گیری را ثبت کند.');
 const values=vals.map(a=>a.val),min=Math.min(...values),max=Math.max(...values),margin=Math.max((max-min)*.25,max===min?1:.5),low=min-margin,high=max+margin;
 const point=vals.map((v,i)=>({x:vals.length===1?260:35+i*455/(vals.length-1),y:189-(v.val-low)/(high-low)*150,...v}));
 const coords=point.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
 const grid=[40,90,140,190].map(y=>'<line x1="35" y1="'+y+'" x2="490" y2="'+y+'" stroke="#41435a" stroke-dasharray="5 6" opacity=".6"/>').join('');
 const circles=point.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="5" fill="#b9a4ff" stroke="#232036" stroke-width="2"/>').join('');
 const start=point[0],end=point[point.length-1],diff=end.val-start.val;
 return '<div class="chart-status">'+h(meta[1])+' — '+n(end.val)+' '+h(meta[2])+(point.length>1?' | تغییر نسبت به اولین ثبت: '+(diff>0?'+':'')+n(diff):' | اولین ثبت')+'</div>'+
 '<div class="chart-wrap"><svg viewBox="0 0 525 225" role="img" aria-label="نمودار روند '+h(meta[1])+'"><defs><linearGradient id="ug-chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9f7fff" stop-opacity=".3"/><stop offset="1" stop-color="#9f7fff" stop-opacity="0"/></linearGradient></defs>'+grid+'<polygon points="'+coords+' 490,204 35,204" fill="url(#ug-chart-area)" opacity=".65"/><polyline points="'+coords+'" fill="none" stroke="#ae92fa" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+circles+'<text x="'+end.x+'" y="'+(end.y-12)+'" fill="#f5eaff" font-size="12" text-anchor="middle">'+h(n(end.val))+'</text></svg></div><div class="chart-labels"><span>'+dt(vals[0].date)+'</span><span>'+dt(vals[vals.length-1].date)+'</span></div>';
}
function metricButtons(){return '<div class="metric-switch">'+METRICS.map(a=>'<button data-metric="'+a[0]+'" class="'+(S.metric===a[0]?'active':'')+'">'+h(a[1])+'</button>').join('')+'</div>';}
function progressHighlights(measurements){
 const pairs=[['weight_kg','وزن فعلی','kg'],['body_fat_pct','درصد چربی','%'],['performance_score','امتیاز عملکرد','/100']];
 return '<div class="progress-highlights">'+pairs.map(m=>{const records=measurements.filter(x=>x[m[0]]!==null&&x[m[0]]!==undefined);const last=records[records.length-1];return '<div class="highlight"><span>'+m[1]+'</span><strong>'+ (last?n(last[m[0]]):'—')+' <small>'+m[2]+'</small></strong><small>'+(records.length?'براساس آخرین ثبت':'هنوز ثبت نشده')+'</small></div>';}).join('')+'</div>';
}
function timeline(measurements){return measurements.length?'<div class="timeline">'+measurements.slice().reverse().slice(0,12).map((m,i)=>'<div class="timeline-item"><strong>'+(i===0?'آخرین ارزیابی · ':'ارزیابی · ')+dt(m.measured_at)+'</strong><p>'+METRICS.filter(k=>m[k[0]]!==null).map(k=>k[1]+': '+n(m[k[0]])+' '+k[2]).join(' | ')+'</p>'+(m.note?'<div class="note-card">'+h(m.note)+'</div>':'')+'</div>').join('')+'</div>':blank('برای شما هنوز اندازه‌گیری ثبت نشده است');}
function renderAdminMembers(){
 const a=S.admin;let form='<div class="dash-card"><h3>ثبت ورزشکار جدید</h3><form data-form="member-create"><div class="field-grid"><div><label>نام کامل</label><input name="full_name" required placeholder="نام ورزشکار"></div><div><label>ایمیل ورود</label><input name="email" type="email" required placeholder="member@example.com"></div><div><label>رمز اولیه (حداقل ۱۰ کاراکتر)</label><input type="password" name="password" minlength="10" required autocomplete="new-password"></div><div><label>رشته اصلی</label>'+sportSelect('بدنسازی')+'</div></div><div class="form-row"><button class="btn btn-primary" type="submit">ثبت ورزشکار ←</button></div></form><p class="footnote">رمز را به‌صورت خصوصی به ورزشکار بدهید. ثبت‌نام شخصی از صفحه اصلی نیز فعال است.</p></div>';
 $('admin-view').innerHTML='<div class="layout-two"><div class="dash-card"><div class="card-head"><h3>فهرست ورزشکاران · '+n(a.members.length)+'</h3><span class="live-badge">MEMBER RECORDS</span></div>'+(a.members.length?shortTableMembers(a.members):blank('فهرست ورزشکاران خالی است'))+'</div>'+form+'</div><div id="person-detail" class="admin-detail"></div>';
 if(S.person)renderPersonDetail();
}
function renderPersonDetail(){
 const p=S.person;if(!p)return;
 const u=p.user;
 const records=p.measurements;
 const c='<div class="admin-detail-head"><div><span class="kicker">INDIVIDUAL PERFORMANCE FILE</span><h2>پرونده '+h(u.full_name)+'</h2><span class="caption">'+h(u.email)+' · '+h(u.discipline)+'</span></div><button class="mini-btn" data-action="close-person">بستن پرونده ×</button></div>';
 $('person-detail').innerHTML=c+'<div class="layout-equal section-gap"><div class="dash-card"><h3>اطلاعات و هدف ورزشکار</h3><form data-form="person-update"><input type="hidden" name="user_id" value="'+u.id+'"><div class="field-grid"><div><label>رشته</label>'+sportSelect(u.discipline)+'</div><div><label>قد (سانتی‌متر)</label><input type="number" step=".1" min="0" max="260" name="height_cm" value="'+h(u.height_cm??'')+'"></div></div><label>هدف و یادداشت مربی</label><textarea name="goal" rows="2" placeholder="هدف اصلی و نکات تمرینی">'+h(u.goal)+'</textarea><div class="form-row"><button class="mini-btn" type="submit">ذخیره هدف و اطلاعات</button></div></form></div><div class="dash-card"><h3>ثبت ارزیابی بدنی</h3><form data-form="measurement"><input type="hidden" name="user_id" value="'+u.id+'"><div class="field-grid cols3"><div><label>تاریخ</label><input type="date" name="measured_at" value="'+fmt(new Date())+'" required></div><div><label>وزن kg</label><input type="number" name="weight_kg" min="0" max="500" step=".01"></div><div><label>چربی ٪</label><input type="number" name="body_fat_pct" min="0" max="100" step=".01"></div><div><label>دور کمر cm</label><input type="number" name="waist_cm" min="0" max="400" step=".01"></div><div><label>عملکرد /100</label><input type="number" name="performance_score" min="0" max="100" step=".01"></div></div><label>یادداشت مربی</label><input name="note" placeholder="مثلاً بهبود تعادل و فرم حرکت"><div class="form-row"><button class="btn btn-primary" type="submit">ثبت ارزیابی جدید ←</button></div></form></div></div>'+
 '<div class="layout-equal section-gap"><div class="dash-card"><h3>نمودار رشد اختصاصی</h3>'+metricButtons()+chart(records,S.metric)+'</div><div class="dash-card"><h3>تاریخچه ارزیابی‌ها</h3>'+timeline(records)+'</div></div>'+
 '<div class="dash-card section-gap"><h3>ثبت شهریه یا بدهی</h3><form data-form="payment"><input name="user_id" type="hidden" value="'+u.id+'"><div class="field-grid cols4"><div><label>مبلغ (تومان)</label><input type="number" min="1" step="1" max="1000000000000" name="amount_toman" required placeholder="مثلاً 1500000"></div><div><label>وضعیت</label><select name="status"><option value="pending">در انتظار پرداخت</option><option value="paid">پرداخت‌شده</option></select></div><div><label>روش</label><select name="method"><option>کارت‌به‌کارت</option><option>نقدی</option><option>انتقال بانکی</option><option>کارتخوان</option></select></div><div><label>موعد پرداخت (اختیاری)</label><input type="date" name="due_date"></div></div><label>شرح</label><input name="note" placeholder="مثلاً شهریه دوره آبان"><div class="form-row"><button class="btn btn-primary" type="submit">ثبت در دفتر مالی ←</button></div></form></div>';
}
function renderAdminClasses(){
 let a=S.admin;
 let rows=a.classes.map(c=>'<tr><td>'+h(c.title)+'</td><td>'+h(c.discipline)+'</td><td>'+h(DAYS[c.weekday])+' '+h(c.start_time)+'</td><td>'+h(c.coach)+'</td><td>'+n(c.capacity)+'</td></tr>');
 $('admin-view').innerHTML='<div class="layout-two"><div class="dash-card"><h3>برنامه کلاس‌های باشگاه</h3>'+table(['کلاس','رشته','روز و ساعت','مربی','ظرفیت'],rows)+'</div><div class="dash-card"><h3>تعریف کلاس جدید</h3><form data-form="class"><div class="field-grid"><div><label>رشته</label>'+sportSelect('پیلاتس')+'</div><div><label>عنوان کلاس</label><input name="title" required placeholder="عنوان کلاس"></div><div><label>نام مربی</label><input name="coach" required placeholder="نام مربی"></div><div><label>روز هفته</label><select name="weekday">'+DAYS.map((d,i)=>'<option value="'+i+'">'+h(d)+'</option>').join('')+'</select></div><div><label>ساعت</label><input name="start_time" type="time" value="18:00" required></div><div><label>مدت (دقیقه)</label><input type="number" name="duration_min" min="15" max="180" value="60" required></div><div><label>ظرفیت</label><input name="capacity" type="number" min="1" max="100" value="14" required></div></div><div class="form-row"><button type="submit" class="btn btn-primary">افزودن کلاس ←</button></div></form></div></div>';
}
function renderAdminPayments(){
 const a=S.admin,rows=a.payments.map(x=>'<tr><td>'+h(x.full_name)+'</td><td>'+money(x.amount_toman)+'</td><td>'+chip(x.status)+'</td><td>'+when(x.created_at)+'</td><td>'+h(x.method)+'</td><td>'+(x.status==='pending'?'<button class="mini-btn" data-pay="'+x.id+'">ثبت وصول</button>':'—')+'</td></tr>');
 $('admin-view').innerHTML=stats([['پرداخت‌شده',money(a.financial?.paid_total),'مجموع دریافتی ثبت‌شده'],['در انتظار وصول',money(a.financial?.pending_total),'مجموع بدهی ثبت‌شده'],['تراکنش‌ها',n(a.financial?.payment_count),'تعداد کل تراکنش‌ها'],['ورزشکاران',n(a.members.length),'حساب فعال']])+'<div class="dash-card"><div class="card-head"><h3>دفتر شهریه باشگاه</h3><span class="pill">ثبت دستی / بدون درگاه آنلاین</span></div>'+(rows.length?table(['ورزشکار','مبلغ','وضعیت','تاریخ ثبت','روش','عملیات'],rows):blank('هیچ رکورد مالی ثبت نشده است'))+'<p class="footnote">برای ایجاد رکورد جدید، از فهرست ورزشکاران پرونده شخص را باز کنید. این بخش به بانک یا درگاه پرداخت متصل نیست.</p></div>';
}
function renderAdminAttendance(){
 const rows=S.admin.bookings.map(x=>'<tr><td>'+h(x.full_name)+'</td><td>'+h(x.title)+'</td><td>'+dt(x.class_date)+'</td><td>'+chip(x.status)+'</td><td><select class="booking-status" data-booking="'+x.id+'"><option value="booked" '+(x.status==='booked'?'selected':'')+'>رزرو شده</option><option value="attended" '+(x.status==='attended'?'selected':'')+'>حاضر</option><option value="cancelled" '+(x.status==='cancelled'?'selected':'')+'>لغو</option></select></td></tr>');
 $('admin-view').innerHTML='<div class="dash-card"><div class="card-head"><h3>رزروها و حضور و غیاب</h3><span class="live-badge">LIVE BOOKING RECORDS</span></div>'+(rows.length?table(['ورزشکار','کلاس','تاریخ','وضعیت','تغییر وضعیت'],rows):blank('هنوز رزروی ثبت نشده است'))+'</div>';
}
function renderAdmin(){
 const heads={overview:'نمای کلی باشگاه',members:'مدیریت ورزشکاران',classes:'برنامه و کلاس‌ها',payments:'شهریه‌ها و امور مالی',attendance:'حضور و غیاب'};
 $('admin-heading').textContent=heads[S.tab];setActive('#admin-nav [data-tab]','tab',S.tab);
 if(S.tab==='overview')renderAdminOverview();
 else if(S.tab==='members')renderAdminMembers();
 else if(S.tab==='classes')renderAdminClasses();
 else if(S.tab==='payments')renderAdminPayments();
 else renderAdminAttendance();
}
async function loadAdmin(){S.admin=await api('/api/admin/overview');if(S.selected){try{S.person=await api('/api/admin/member?id='+S.selected);}catch{S.selected=null;S.person=null;}}renderAdmin();}
function renderMemberProgress(){
 const m=S.member,records=m.measurements;
 const due=moneySum(m.payments,'pending'),att=m.bookings.filter(x=>x.status==='attended').length;
 $('member-view').innerHTML='<div class="welcome-banner"><span>YOUR FITNESS JOURNEY</span><h2>سلام '+h(m.user.full_name)+'، آماده حرکت بعدی؟</h2><p>رشته اصلی: '+h(m.user.discipline)+(m.user.goal?' · هدف: '+h(m.user.goal):' · هدف تمرینی خود را با مربی تعیین کن.')+'</p></div>'+
 stats([['رشته اصلی',h(m.user.discipline),'مسیر تمرینی شما'],['جلسات حضور',n(att),'جلسات ثبت‌شده'],['ارزیابی‌های بدن',n(records.length),'مراحل رشد ثبت‌شده'],['بدهی ثبت‌شده',money(due),'براساس دفتر مالی']])+
 progressHighlights(records)+
 '<div class="layout-two"><div class="dash-card"><div class="card-head"><h3>نمودار اختصاصی رشد</h3><span class="live-badge">PERSONAL DATA</span></div>'+metricButtons()+chart(records,S.metric)+'</div><div class="dash-card"><h3>خط زمانی تغییرات من</h3>'+timeline(records)+'</div></div>'+
 '<div class="install-hint">برای نصب روی گوشی: در Chrome گزینه «نصب برنامه / Add to Home screen» و در Safari آیفون «Share → Add to Home Screen» را انتخاب کنید.</div>';
}
function renderMemberClasses(){
 const mine=S.member.bookings.filter(x=>x.status==='booked'||x.status==='attended');
 $('member-view').innerHTML='<div class="welcome-banner"><span>BOOK YOUR SESSION</span><h2>انرژی‌ات را برنامه‌ریزی کن.</h2><p>از بین کلاس‌های باشگاه، نوبت نزدیک‌ترین جلسه را انتخاب کن. ظرفیت و روز برگزاری در زمان رزرو بررسی می‌شود.</p></div>'+
 '<div class="dash-card"><div class="card-head"><h3>برنامه رشته‌ها</h3><span class="pill">رزرو تا ۹۰ روز آینده</span></div><div class="booking-list">'+S.classes.map(c=>'<div class="booking-card"><div class="booking-head"><div><span class="kicker">'+h(c.discipline)+'</span><h3>'+h(c.title)+'</h3></div><span class="pill">'+n(c.duration_min)+' دقیقه</span></div><p>مربی: '+h(c.coach)+'</p><p>'+h(DAYS[c.weekday])+' · ساعت '+h(c.start_time)+' · ظرفیت '+n(c.capacity)+'</p><footer><span class="tiny-muted">جلسه بعدی: '+dt(nextDay(c.weekday))+'</span><button class="btn btn-primary" data-book="'+c.id+'" data-date="'+nextDay(c.weekday)+'">رزرو کلاس ←</button></footer></div>').join('')+'</div></div>'+
 '<div class="dash-card section-gap"><h3>نوبت‌های من</h3>'+(mine.length?table(['کلاس','تاریخ','وضعیت','عملیات'],mine.map(x=>'<tr><td>'+h(x.title)+'</td><td>'+dt(x.class_date)+'</td><td>'+chip(x.status)+'</td><td>'+(x.status==='booked'?'<button class="mini-btn" data-cancel="'+x.id+'">لغو رزرو</button>':'—')+'</td></tr>')):blank('هنوز نوبتی رزرو نکرده‌اید'))+'</div>';
}
function renderMemberPayments(){
 const m=S.member;const settled=moneySum(m.payments,'paid'),due=moneySum(m.payments,'pending');
 $('member-view').innerHTML='<div class="welcome-banner"><span>MEMBERSHIP ACCOUNTING</span><h2>همه شهریه‌ها، شفاف و یک‌جا.</h2><p>تراکنش‌ها و مبالغ در انتظار پرداخت شما مستقیماً از ثبت‌های مدیر باشگاه نمایش داده می‌شوند.</p></div>'+
 stats([['مبالغ پرداخت‌شده',money(settled),'ثبت مدیر باشگاه'],['بدهی ثبت‌شده',money(due),'در انتظار تسویه'],['رکوردهای مالی',n(m.payments.length),'تاریخچه کامل']])+
 '<div class="dash-card"><h3>سوابق پرداخت من</h3>'+(m.payments.length?table(['مبلغ','وضعیت','روش','موعد','توضیح'],m.payments.map(x=>'<tr><td>'+money(x.amount_toman)+'</td><td>'+chip(x.status)+'</td><td>'+h(x.method)+'</td><td>'+dt(x.due_date)+'</td><td>'+h(x.note)+'</td></tr>')):blank('شهریه‌ای برای شما ثبت نشده است'))+'<p class="footnote">پرداخت اینترنتی در این نسخه فعال نیست. برای تسویه و دریافت رسید از باشگاه هماهنگ کنید.</p></div>';
}
function renderMember(){
 const heads={progress:'مسیر پیشرفت من',classes:'رزرو و برنامه کلاس‌ها',payments:'شهریه‌ها و پرداخت‌ها'};
 $('member-heading').textContent=heads[S.memberTab];setActive('#member-nav [data-member-tab]','memberTab',S.memberTab);
 if(S.memberTab==='progress')renderMemberProgress();
 else if(S.memberTab==='classes')renderMemberClasses();
 else renderMemberPayments();
}
async function loadMember(){S.member=await api('/api/member/dashboard');renderMember();}
async function boot(){
 try{
  const result=await api('/api/me');S.user=result.user;header();
  const pathname=location.pathname;
  if(pathname==='/login'||pathname==='/register'||pathname==='/setup'){authPage(pathname.slice(1));return;}
  if(pathname==='/admin'){if(!S.user){location.replace('/login');return;}if(S.user.role!=='admin'){location.replace('/member');return;}show('page-admin');$('admin-person').textContent=S.user.full_name;await loadAdmin();return;}
  if(pathname==='/member'){if(!S.user){location.replace('/login');return;}if(S.user.role!=='member'){location.replace('/admin');return;}show('page-member');$('member-person').textContent=S.user.full_name;S.classes=(await api('/api/classes')).classes;await loadMember();return;}
  show('page-home');
 }catch(e){flash('خطا در دریافت داده‌ها: '+e.message,true);}
}
document.addEventListener('submit',async function(ev){
 const form=ev.target;if(form.id!=='auth-form'&&!form.dataset.form)return;ev.preventDefault();
 const d=Object.fromEntries(new FormData(form).entries()),kind=form.id==='auth-form'?location.pathname.slice(1):form.dataset.form;
 const routes={login:'/api/auth/login',register:'/api/auth/register',setup:'/api/bootstrap','member-create':'/api/admin/member/create','person-update':'/api/admin/member/update',measurement:'/api/admin/measurement',payment:'/api/admin/payment',class:'/api/admin/class'};
 let b=form.querySelector('[type=submit]');if(b)b.disabled=true;
 try{await api(routes[kind],d);if(['login','register','setup'].includes(kind)){if(kind==='login'){const x=await api('/api/me');location.assign(x.user?.role==='admin'?'/admin':'/member');}else{location.assign(kind==='setup'?'/admin':'/member');}return;}
 flash('اطلاعات با موفقیت ذخیره شد');if(kind==='member-create'||kind==='measurement'||kind==='payment'||kind==='class')form.reset();await loadAdmin();
 }catch(e){if(form.id==='auth-form'){$('auth-error').textContent=e.message;$('auth-error').hidden=false;}else flash(e.message,true);}finally{if(b)b.disabled=false;}
});
document.addEventListener('click',async function(ev){
 const t=ev.target.closest('[data-tab],[data-member-tab],[data-person],[data-metric],[data-action],[data-book],[data-cancel],[data-pay]');
 if(!t)return;
 try{
  if(t.dataset.tab){S.tab=t.dataset.tab;S.selected=null;S.person=null;renderAdmin();return;}
  if(t.dataset.memberTab){S.memberTab=t.dataset.memberTab;renderMember();return;}
  if(t.dataset.metric){S.metric=t.dataset.metric;if(!$('page-member').hidden)renderMember();else renderPersonDetail();return;}
  if(t.dataset.person){S.tab='members';S.selected=t.dataset.person;S.person=await api('/api/admin/member?id='+S.selected);renderAdmin();$('person-detail').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(t.dataset.action==='close-person'){S.person=null;S.selected=null;renderAdmin();return;}
  if(t.dataset.action==='logout'){await api('/api/auth/logout',{});location.assign('/');return;}
  if(t.dataset.book){await api('/api/member/book',{class_id:Number(t.dataset.book),date:t.dataset.date});flash('کلاس با موفقیت رزرو شد');await loadMember();return;}
  if(t.dataset.cancel){if(!confirm('رزرو این جلسه لغو شود؟'))return;await api('/api/member/cancel',{booking_id:Number(t.dataset.cancel)});flash('رزرو لغو شد');await loadMember();return;}
  if(t.dataset.pay){if(!confirm('آیا وصول کامل این مبلغ را تأیید می‌کنید؟'))return;await api('/api/admin/payment/status',{payment_id:Number(t.dataset.pay),status:'paid'});flash('پرداخت تسویه شد');await loadAdmin();}
 }catch(e){flash(e.message,true);}
});
document.addEventListener('change',async function(ev){
 const t=ev.target.closest('[data-booking]');if(!t)return;
 try{await api('/api/admin/booking/status',{booking_id:Number(t.dataset.booking),status:t.value});flash('وضعیت حضور ذخیره شد');await loadAdmin();}catch(e){flash(e.message,true);}
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
boot();
})();