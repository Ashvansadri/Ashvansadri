'use strict';
(function(){
const $=(id)=>document.getElementById(id);
const S={user:null,classes:[],admin:null,member:null,person:null,selected:null,tab:'overview',memberTab:'progress',metric:'weight_kg',payConfig:{card_number:'5894631136176906',card_holder:'زهره صابری',whatsapp:'09171508927'}};
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
function captureOwnerInvite(){
 try{
  const hsh=new URLSearchParams(location.hash.replace(/^#/,'')),incoming=hsh.get('invite');
  if(incoming&&/^[a-f0-9]{64}$/.test(incoming)){sessionStorage.setItem('ugym_owner_invite',incoming);history.replaceState(null,'',location.pathname);}
  return sessionStorage.getItem('ugym_owner_invite')||'';
 }catch{return'';}
}
function authPage(mode){
 show('page-auth');
 const setup=mode==='setup',reg=mode==='register',ownerInvite=setup?captureOwnerInvite():'';
 $('auth-kicker').textContent=setup?'UGYM / PRIVATE OWNER INVITE':'UGYM / ACCOUNT';
 $('auth-title').textContent=setup?'ساخت حساب مدیریت':reg?'به UGYM خوش آمدی!':'خوش برگشتی!';
 $('auth-subtitle').textContent=setup?'نام کاربری و رمز دلخواه خودت را انتخاب کن؛ این دعوت‌نامه فقط یک بار معتبر است.':reg?'اطلاعاتت را وارد کن و مسیرت را شروع کن.':'با نام کاربری یا ایمیل و رمز عبور وارد شو.';
 $('auth-name-box').hidden=!(reg||setup);$('auth-sport-box').hidden=!reg;
 $('setup-username-box').hidden=!setup;
 $('auth-identifier-box').hidden=reg||setup;
 $('auth-email-box').hidden=!(reg||setup);
 $('auth-form').reset();
 $('auth-form').querySelector('input[name=identifier]').required=!(reg||setup);
 $('auth-form').querySelector('input[name=email]').required=reg||setup;
 $('auth-form').querySelector('input[name=username]').required=setup;
 $('auth-form').querySelector('input[name=full_name]').required=reg||setup;
 $('auth-form').querySelector('input[name=password]').setAttribute('autocomplete',reg||setup?'new-password':'current-password');
 $('auth-submit').textContent=setup?'ایجاد حساب مدیریت ←':reg?'ثبت‌نام ورزشکار ←':'ورود به حساب ←';
 $('auth-switch').href=reg||setup?'/login':'/register';
 $('auth-switch').textContent=reg||setup?'قبلاً حساب ساخته‌ای؟ ورود':'حساب نداری؟ ثبت‌نام کن';
 $('auth-error').hidden=true;
 $('auth-submit').disabled=false;
 if(setup){
  if(!ownerInvite){$('auth-error').textContent='این بخش فقط با لینک دعوت اختصاصی صاحب باشگاه فعال می‌شود.';$('auth-error').hidden=false;$('auth-submit').disabled=true;}
  api('/api/bootstrap-status').then(x=>{if(!x.needs_setup){$('auth-error').textContent='حساب مدیریت قبلاً ساخته شده است. از صفحه ورود استفاده کن.';$('auth-error').hidden=false;$('auth-submit').disabled=true;}}).catch(e=>flash(e.message,true));
 }
}

function waHref(x){
 const phone=String(S.payConfig.whatsapp||'').replace(/\D/g,'');
 if(!/^09\d{9}$/.test(phone))return '';
 const msg=x?'سلام، رسید پرداخت شهریه UGYM به مبلغ '+money(x.amount_toman)+' را ارسال می‌کنم. شناسه شهریه: '+x.id+'. نام ورزشکار: '+String(S.member?.user?.full_name||'')+'. لطفاً پس از بررسی واریز تأیید کنید.':'سلام، برای دریافت راهنمای پرداخت شهریه UGYM پیام می‌دهم.';
 return 'https://wa.me/98'+phone.slice(1)+'?text='+encodeURIComponent(msg);
}
function cardBlock(){
 const p=S.payConfig,number=String(p.card_number||'').replace(/\D/g,'');
 const numberFormatted=number.replace(/(.{4})/g,'$1 ').trim();
 return '<div class="bank-card"><div class="bank-card-kicker"><span>✦ UGYM</span><span>کارت مقصد شهریه</span></div><div class="bank-digits" dir="ltr">'+h(numberFormatted)+'</div><div class="bank-owner">'+h(p.card_holder||'')+'</div><div class="bank-actions"><button type="button" data-copy-card class="mini-btn">کپی شماره کارت</button>'+(waHref(null)?'<a class="mini-btn" href="'+h(waHref(null))+'" target="_blank" rel="noopener noreferrer">واتساپ باشگاه ↗</a>':'')+'</div></div>';
}
function tehranDay(){
 const d=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Asia/Tehran'}).format(new Date());
 return ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[d]??0;
}
function dailyTip(){
 const tips=['امروز روی اجرای درست حرکات تمرکز کن؛ کیفیت مهم‌تر از سرعت است.','آب کافی و استراحت مناسب بخشی از برنامه تمرین هستند.','پیشرفت را با روند چند هفته‌ای بسنج، نه یک عدد در یک روز.','قبل از شروع تمرین، چند دقیقه بدن را آماده حرکت کن.','شدت تمرین را متناسب با آمادگی و نظر مربی تنظیم کن.','حرکت درست و قابل‌کنترل بهتر از فشار ناگهانی است.','ثبت ارزیابی منظم دید دقیق‌تری از مسیر پیشرفت می‌دهد.'];
 return tips[Math.floor((Date.now()+12600000)/86400000)%tips.length];
}

function renderAdminOverview(){
 const a=S.admin,paid=Number(a.financial?.paid_total||0),pending=Number(a.financial?.pending_total||0);
 const today=a.classes.filter(x=>x.active&&x.weekday===tehranDay()),notices=a.payments.filter(x=>x.status==='pending'&&x.receipt_declared_at);
 $('admin-view').innerHTML='<div class="welcome-banner premium-welcome"><span>UGYM · CONTROL CENTER</span><h2>باشگاه، زیر نظر تو.</h2><p>امروز '+h(new Intl.DateTimeFormat('fa-IR',{dateStyle:'full',timeZone:'Asia/Tehran'}).format(new Date()))+' · اطلاعات این صفحه از سوابق ثبت‌شده باشگاه است.</p></div>'+
 '<div class="admin-quickline"><button data-tab="members" class="quick-action"><b>＋</b><span>ثبت ورزشکار</span></button><button data-tab="payments" class="quick-action"><b>◈</b><span>ثبت شهریه</span></button><button data-tab="classes" class="quick-action"><b>▦</b><span>برنامه کلاس‌ها</span></button><button data-tab="settings" class="quick-action"><b>⚙</b><span>تنظیمات باشگاه</span></button></div>'+
 stats([['ورزشکاران',n(a.members.length),'ثبت‌شده در سیستم'],['کلاس‌های فعال',n(a.classes.filter(x=>x.active).length),'برنامه ثبت‌شده'],['وصول شهریه',money(paid),'جمع تأییدشده'],['بدهی‌ها',money(pending),'در انتظار بررسی']])+
 '<div class="layout-two"><div class="dash-card"><div class="card-head"><h3>کارهای امروز</h3><span class="pill">'+n(notices.length)+' اعلام رسید جدید</span></div>'+
 (notices.length?notices.slice(0,6).map(x=>'<div class="selection-row"><span>'+h(x.full_name)+' · '+money(x.amount_toman)+'</span><button class="mini-btn" data-tab="payments">بررسی</button></div>').join(''):'<p class="tiny-muted">در حال حاضر رسید جدیدی برای بررسی اعلام نشده است.</p>')+
 '<h4 class="subheading">برنامه ثبت‌شده امروز</h4>'+(today.length?today.map(x=>'<div class="selection-row"><span>'+h(x.title)+'</span><span>'+h(x.start_time)+'</span></div>').join(''):blank('امروز کلاسی ثبت نشده است'))+
 '<p class="tiny-muted">زمان‌بندی کلاس‌ها باید توسط مدیریت تأیید شود.</p></div>'+
 '<div class="dash-card"><h3>پیشنهاد امروز UGYM</h3><div class="today-tip">✧ '+h(dailyTip())+'</div><div class="manager-hint"><b>شروع سریع مدیریت</b><p>ورزشکار جدید را ثبت کن، سپس برای او شهریه و ارزیابی بدنی وارد کن.</p><button data-tab="members" class="btn btn-primary">ثبت ورزشکار ←</button></div></div></div>'+
 '<div class="layout-two section-gap"><div class="dash-card"><div class="card-head"><h3>آخرین ورزشکاران</h3><button data-tab="members" class="action-link">همه ورزشکاران ←</button></div>'+(a.members.length?shortTableMembers(a.members.slice(0,5)):blank('هنوز ورزشکاری ثبت نشده'))+'</div>'+
 '<div class="dash-card"><div class="card-head"><h3>آخرین شهریه‌ها</h3><button data-tab="payments" class="action-link">دفتر مالی ←</button></div>'+(a.payments.length?shortTablePayments(a.payments.slice(0,5)):blank('هنوز شهریه‌ای ثبت نشده'))+'</div></div>';
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
 const a=S.admin,choices=a.classes.map(x=>'<option value="'+x.id+'">'+h(x.title)+' · '+h(DAYS[x.weekday])+'</option>').join('');
 const rows=a.classes.map(x=>'<tr><td>'+h(x.title)+'</td><td>'+h(x.discipline)+'</td><td>'+h(DAYS[x.weekday])+' '+h(x.start_time)+'</td><td>'+h(x.coach)+'</td><td>'+n(x.capacity)+'</td><td>'+chip(x.active?'فعال':'غیرفعال')+'</td></tr>');
 const weekday=DAYS.map((x,i)=>'<option value="'+i+'">'+h(x)+'</option>').join('');
 $('admin-view').innerHTML='<div class="dash-card"><div class="card-head"><h3>کلاس‌های UGYM</h3><span class="pill">'+n(a.classes.length)+' کلاس ثبت‌شده</span></div>'+table(['کلاس','رشته','روز و ساعت','مربی','ظرفیت','وضعیت'],rows)+'<p class="footnote">برنامه‌های اولیه نمونه هستند؛ روز، ساعت و مربی واقعی را در فرم ویرایش تعیین کن.</p></div>'+
 '<div class="layout-equal section-gap"><div class="dash-card"><h3>کلاس جدید</h3><form data-form="class"><div class="field-grid"><div><label>رشته</label>'+sportSelect('پیلاتس')+'</div><div><label>عنوان کلاس</label><input name="title" required placeholder="نام کلاس"></div><div><label>مربی</label><input name="coach" required placeholder="نام مربی"></div><div><label>روز هفته</label><select name="weekday">'+weekday+'</select></div><div><label>ساعت</label><input name="start_time" type="time" value="18:00" required></div><div><label>مدت (دقیقه)</label><input type="number" name="duration_min" min="15" max="180" value="60" required></div><div><label>ظرفیت</label><input name="capacity" type="number" min="1" max="100" value="14" required></div></div><div class="form-row"><button type="submit" class="btn btn-primary">افزودن کلاس ←</button></div></form></div>'+
 '<div class="dash-card"><h3>ویرایش کلاس موجود</h3>'+(a.classes.length?'<form data-form="class-update"><label>انتخاب کلاس</label><select name="class_id" data-class-select>'+choices+'</select><div class="field-grid"><div><label>رشته</label>'+sportSelect(a.classes[0].discipline)+'</div><div><label>عنوان کلاس</label><input name="title" required></div><div><label>مربی</label><input name="coach" required></div><div><label>روز هفته</label><select name="weekday">'+weekday+'</select></div><div><label>ساعت</label><input name="start_time" type="time" required></div><div><label>مدت (دقیقه)</label><input type="number" name="duration_min" min="15" max="180" required></div><div><label>ظرفیت</label><input name="capacity" type="number" min="1" max="100" required></div><div><label>هزینه هر جلسه (تومان، اختیاری)</label><input name="price_toman" type="number" min="0" step="1"></div><div><label>وضعیت</label><select name="active"><option value="true">فعال</option><option value="false">غیرفعال</option></select></div></div><div class="form-row"><button type="submit" class="btn btn-primary">ذخیره ویرایش کلاس ←</button></div></form>':blank('هنوز کلاسی تعریف نشده'))+'</div></div>';
 fillClassForm();
}
function fillClassForm(){
 const select=document.querySelector('[data-class-select]');if(!select)return;
 const data=S.admin.classes.find(x=>String(x.id)===select.value);if(!data)return;
 const form=select.closest('form');
 for(const field of ['discipline','title','coach','weekday','start_time','duration_min','capacity','price_toman','active']){
  const input=form.elements.namedItem(field);if(input)input.value=field==='active'?String(Boolean(data.active)):String(data[field]??'');
 }
}
function renderAdminPayments(){
 const a=S.admin,options=a.members.map(u=>'<option value="'+u.id+'">'+h(u.full_name)+' · '+h(u.discipline)+'</option>').join('');
 const rows=a.payments.map(x=>'<tr><td>'+h(x.full_name)+'</td><td>'+money(x.amount_toman)+'</td><td>'+chip(x.status)+(x.receipt_declared_at&&x.status==='pending'?'<br><span class="pill amber">اعلام رسید</span>':'')+'</td><td>'+when(x.created_at)+'</td><td>'+h(x.method)+'</td><td>'+(x.status==='pending'?'<button class="mini-btn" data-pay="'+x.id+'">تأیید وصول</button>':'—')+'</td></tr>');
 const invoiceForm=a.members.length?
 '<form data-form="payment"><div class="field-grid"><div><label>ورزشکار</label><select name="user_id" required>'+options+'</select></div><div><label>مبلغ (تومان)</label><input name="amount_toman" type="number" inputmode="numeric" min="1" max="1000000000000" required placeholder="مثلاً 1500000"></div><div><label>وضعیت</label><select name="status"><option value="pending">در انتظار پرداخت</option><option value="paid">پرداخت‌شده (وصول قطعی)</option></select></div><div><label>روش</label><select name="method"><option>کارت‌به‌کارت</option><option>کارتخوان</option><option>نقدی</option><option>انتقال بانکی</option></select></div><div><label>سررسید (اختیاری)</label><input name="due_date" type="date"></div></div><label>شرح شهریه</label><input name="note" maxlength="250" placeholder="مثلاً شهریه آذر - پیلاتس"><div class="form-row"><button type="submit" class="btn btn-primary">ثبت شهریه ←</button></div></form>':
 blank('ابتدا از بخش ورزشکاران یک حساب بساز');
 $('admin-view').innerHTML=
 stats([['پرداخت‌شده',money(a.financial?.paid_total),'مجموع وصول‌شده'],['در انتظار وصول',money(a.financial?.pending_total),'در انتظار بررسی'],['تراکنش‌ها',n(a.financial?.payment_count),'کل ثبت‌ها'],['اعلام رسید',n(a.payments.filter(x=>x.receipt_declared_at&&x.status==='pending').length),'نیاز به بررسی مدیر']])+
 '<div class="layout-equal"><div class="dash-card"><h3>ثبت شهریه جدید</h3>'+invoiceForm+'<p class="footnote">برای پرداخت کارت‌به‌کارت، وضعیت «در انتظار پرداخت» را انتخاب کن.</p></div><div class="dash-card"><h3>حساب دریافت شهریه</h3>'+cardBlock()+'<p class="footnote">رسیدها در واتساپ ارسال می‌شوند و فقط پس از بررسی گردش حساب بانکی، باید وصول را تأیید کنی.</p><button class="mini-btn" data-tab="settings">ویرایش کارت و واتساپ ←</button></div></div>'+
 '<div class="dash-card section-gap"><div class="card-head"><h3>دفتر شهریه‌ها</h3><span class="pill">'+n(a.payments.length)+' ثبت اخیر</span></div>'+(rows.length?table(['ورزشکار','مبلغ','وضعیت','تاریخ','روش','بررسی'],rows):blank('هنوز شهریه‌ای ثبت نشده است'))+'</div>';
}
function renderAdminSettings(){
 const p=S.payConfig;
 $('admin-view').innerHTML='<div class="welcome-banner premium-welcome"><span>UGYM · SETTINGS</span><h2>تنظیمات باشگاه</h2><p>مشخصات پرداخت را بدون تغییر کد از این بخش مدیریت کن.</p></div>'+
 '<div class="layout-equal"><div class="dash-card"><h3>اطلاعات مالی و واتساپ</h3><form data-form="settings"><label>شماره کارت مقصد (۱۶ رقم)</label><input name="card_number" inputmode="numeric" maxlength="24" required value="'+h(p.card_number)+'"><label>نام صاحب کارت</label><input name="card_holder" maxlength="100" required value="'+h(p.card_holder)+'"><label>شماره واتساپ دریافت رسید</label><input name="whatsapp" inputmode="tel" maxlength="16" required value="'+h(p.whatsapp)+'"><div class="form-row"><button type="submit" class="btn btn-primary">ذخیره تغییرات ←</button></div></form></div>'+
 '<div class="dash-card"><h3>پیش‌نمایش کارت</h3>'+cardBlock()+'<div class="note-card"><strong>حفظ امنیت مالی</strong><p>رسید واتساپ فقط اعلام پرداخت است. تأیید وصول را پس از بررسی تراکنش واقعی بانک انجام بده.</p></div></div></div>'+
 '<div class="dash-card section-gap"><h3>فعالیت‌های اخیر مدیریت</h3><div id="ug-audit-list">'+blank('در حال دریافت سوابق...')+'</div></div>';
 api('/api/admin/audit').then(data=>{const box=$('ug-audit-list');if(!box)return;const titles={payment_created:'ثبت شهریه',payment_status_changed:'تأیید یا تغییر شهریه',receipt_notice:'اعلام ارسال رسید',member_created:'ثبت ورزشکار',member_updated:'ویرایش ورزشکار',assessment_added:'ثبت ارزیابی',class_created:'ثبت کلاس',settings_changed:'تغییر تنظیمات'};
 box.innerHTML=data.logs.length?table(['اقدام','شناسه ثبت','تاریخ'],data.logs.map(x=>'<tr><td>'+h(titles[x.action]||x.action)+'</td><td>'+n(x.record_id)+'</td><td>'+when(x.created_at)+'</td></tr>')):blank('سابقه‌ای ثبت نشده است');}).catch(()=>{const box=$('ug-audit-list');if(box)box.innerHTML=blank('دریافت گزارش ممکن نشد')});
}
function renderAdminAttendance(){
 const rows=S.admin.bookings.map(x=>'<tr><td>'+h(x.full_name)+'</td><td>'+h(x.title)+'</td><td>'+dt(x.class_date)+'</td><td>'+chip(x.status)+'</td><td><select class="booking-status" data-booking="'+x.id+'"><option value="booked" '+(x.status==='booked'?'selected':'')+'>رزرو شده</option><option value="attended" '+(x.status==='attended'?'selected':'')+'>حاضر</option><option value="cancelled" '+(x.status==='cancelled'?'selected':'')+'>لغو</option></select></td></tr>');
 $('admin-view').innerHTML='<div class="dash-card"><div class="card-head"><h3>رزروها و حضور و غیاب</h3><span class="live-badge">LIVE BOOKING RECORDS</span></div>'+(rows.length?table(['ورزشکار','کلاس','تاریخ','وضعیت','تغییر وضعیت'],rows):blank('هنوز رزروی ثبت نشده است'))+'</div>';
}
function renderAdmin(){
 const heads={overview:'نمای کلی باشگاه',members:'مدیریت ورزشکاران',classes:'برنامه و کلاس‌ها',payments:'شهریه‌ها و امور مالی',attendance:'حضور و غیاب',settings:'تنظیمات باشگاه'};
 $('admin-heading').textContent=heads[S.tab];setActive('#admin-nav [data-tab]','tab',S.tab);
 if(S.tab==='overview')renderAdminOverview();
 else if(S.tab==='members')renderAdminMembers();
 else if(S.tab==='classes')renderAdminClasses();
 else if(S.tab==='payments')renderAdminPayments();
 else if(S.tab==='settings')renderAdminSettings();
 else renderAdminAttendance();
}
async function loadAdmin(){const [overview,config]=await Promise.all([api('/api/admin/overview'),api('/api/public/payment-info')]);S.admin=overview;S.payConfig=config.payment;if(S.selected){try{S.person=await api('/api/admin/member?id='+S.selected);}catch{S.selected=null;S.person=null;}}renderAdmin();}
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
 const m=S.member,settled=moneySum(m.payments,'paid'),due=moneySum(m.payments,'pending');
 const unpaid=m.payments.filter(x=>x.status==='pending');
 const items=unpaid.map(x=>'<div class="invoice-item"><div class="invoice-heading"><small>شهریه شماره '+n(x.id)+'</small><b>'+money(x.amount_toman)+'</b><span>'+h(x.note||'شهریه باشگاه UGYM')+'</span></div><div class="invoice-actions"><a class="mini-btn" href="'+h(waHref(x))+'" target="_blank" rel="noopener noreferrer">ارسال رسید در واتساپ ↗</a><button type="button" class="mini-btn" data-receipt="'+x.id+'" '+(x.receipt_declared_at?'disabled':'')+'>'+(x.receipt_declared_at?'رسید اعلام شده':'رسید را ارسال کردم ✓')+'</button></div><p class="invoice-caption">'+(x.receipt_declared_at?'منتظر بررسی و تأیید مدیریت':'بعد از ارسال تصویر رسید در واتساپ، اعلام ارسال را ثبت کن')+'</p></div>').join('');
 const rows=m.payments.map(x=>'<tr><td>'+money(x.amount_toman)+'</td><td>'+chip(x.status)+(x.receipt_declared_at&&x.status==='pending'?'<br><span class="pill amber">در انتظار تأیید رسید</span>':'')+'</td><td>'+dt(x.due_date)+'</td><td>'+h(x.method)+'</td><td>'+h(x.note)+'</td></tr>');
 $('member-view').innerHTML='<div class="welcome-banner premium-welcome"><span>UGYM · PAYMENTS</span><h2>شهریه‌های من</h2><p>مبالغ، تاریخچه و وضعیت بررسی پرداخت‌ها را به‌صورت شفاف ببین.</p></div>'+
 stats([['پرداخت‌های تأییدشده',money(settled),'وصول‌شده توسط مدیریت'],['بدهی',money(due),'در انتظار پرداخت یا بررسی'],['تعداد سوابق',n(m.payments.length),'شهریه‌های ثبت‌شده']])+
 '<div class="layout-equal"><div class="dash-card"><h3>پرداخت کارت‌به‌کارت</h3>'+cardBlock()+'<p class="footnote">پس از واریز، تصویر رسید را به‌صورت دستی در واتساپ باشگاه پیوست و ارسال کن. بازکردن واتساپ به معنی پرداخت نیست.</p></div>'+
 '<div class="dash-card"><h3>شهریه‌های باز</h3>'+(unpaid.length?items:blank('در حال حاضر بدهی ثبت‌شده‌ای نداری'))+'</div></div>'+
 '<div class="dash-card section-gap"><h3>سوابق شهریه‌ها</h3>'+(rows.length?table(['مبلغ','وضعیت','سررسید','روش','شرح'],rows):blank('هنوز شهریه‌ای ثبت نشده است'))+'</div>';
}
function renderMember(){
 const heads={progress:'مسیر پیشرفت من',classes:'رزرو و برنامه کلاس‌ها',payments:'شهریه‌ها و پرداخت‌ها'};
 $('member-heading').textContent=heads[S.memberTab];setActive('#member-nav [data-member-tab]','memberTab',S.memberTab);
 if(S.memberTab==='progress')renderMemberProgress();
 else if(S.memberTab==='classes')renderMemberClasses();
 else renderMemberPayments();
}
async function loadMember(){const [member,config]=await Promise.all([api('/api/member/dashboard'),api('/api/public/payment-info')]);S.member=member;S.payConfig=config.payment;renderMember();}
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
 if(kind==='setup')d.invite=captureOwnerInvite();
 const routes={login:'/api/auth/login',register:'/api/auth/register',setup:'/api/bootstrap','member-create':'/api/admin/member/create','person-update':'/api/admin/member/update',measurement:'/api/admin/measurement',payment:'/api/admin/payment',settings:'/api/admin/settings',class:'/api/admin/class','class-update':'/api/admin/class/update',password:'/api/account/change-password'};
 let b=form.querySelector('[type=submit]');if(b)b.disabled=true;
 try{const saved=await api(routes[kind],d);if(['login','register','setup'].includes(kind)){if(kind==='login'){const x=await api('/api/me');location.assign(x.user?.role==='admin'?'/admin':'/member');}else{if(kind==='setup'){try{sessionStorage.removeItem('ugym_owner_invite');}catch{}}location.assign(kind==='setup'?'/admin':'/member');}return;}
 flash('اطلاعات با موفقیت ذخیره شد');if(kind==='member-create'||kind==='measurement'||kind==='payment'||kind==='class'||kind==='password')form.reset();if(kind==='member-create'){S.tab='members';S.selected=saved.id;}await loadAdmin();if(kind==='member-create'&&$('person-detail'))$('person-detail').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(form.id==='auth-form'){$('auth-error').textContent=e.message;$('auth-error').hidden=false;}else flash(e.message,true);}finally{if(b)b.disabled=false;}
});
document.addEventListener('click',async function(ev){
 const t=ev.target.closest('[data-tab],[data-member-tab],[data-person],[data-metric],[data-action],[data-book],[data-cancel],[data-pay],[data-receipt],[data-copy-card]');
 if(!t)return;
 try{
  if(t.hasAttribute('data-copy-card')){
   const number=String(S.payConfig.card_number||'').replace(/\D/g,'');
   try{await navigator.clipboard.writeText(number);flash('شماره کارت کپی شد');}catch{window.prompt('شماره کارت را کپی کن',number);}
   return;
  }
  if(t.dataset.receipt){
   if(!confirm('آیا تصویر رسید را واقعاً در واتساپ باشگاه ارسال کرده‌ای؟ اعلام ارسال، تأیید پرداخت نیست.'))return;
   await api('/api/member/payment/receipt-notice',{payment_id:Number(t.dataset.receipt)});
   flash('اعلام ارسال رسید ثبت شد. منتظر تأیید مدیر باش.');await loadMember();return;
  }
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
 if(ev.target.matches('[data-class-select]')){fillClassForm();return;}
 const t=ev.target.closest('[data-booking]');if(!t)return;
 try{await api('/api/admin/booking/status',{booking_id:Number(t.dataset.booking),status:t.value});flash('وضعیت حضور ذخیره شد');await loadAdmin();}catch(e){flash(e.message,true);}
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
boot();
})();