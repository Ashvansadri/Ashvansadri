'use strict';
(()=>{
 const $=x=>document.getElementById(x);
 const B=()=>window.UGYMBridge;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fa=x=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(Number(x)||0);
 const iso=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const f=k=>p.find(x=>x.type===k).value;return f('year')+'-'+f('month')+'-'+f('day')};
 const date=x=>x?new Date(x).toLocaleDateString('fa-IR'):'—';
 const empty=s=>'<div class="ug-studio-empty">◇<p>'+esc(s)+'</p></div>';
 const dayLabels=['روز ۱','روز ۲','روز ۳','روز ۴','روز ۵','روز ۶','روز ۷'];
 const disciplines=['بدنسازی','پیلاتس','ایروبیک','TRX'];
 const state={athlete:null,plan:null,day:'روز ۱',mode:'studio',serial:0,exercises:null};
 const api=(url,data)=>B().api(url,data);
 const toast=(msg,err=false)=>B().toast(msg,err);
 const field=(name,value='',type='text',extra='')=>'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>';
 const source='https://github.com/MarvinNazari/exercise-images';
 function movement(ex){
  if(!ex.image_start)return '<div class="ug-exercise-picture">تصویر این حرکت موجود نیست</div>';
  const double=ex.image_end&&ex.image_end!==ex.image_start;
  return '<figure class="ug-exercise-picture '+(double?'is-motion':'')+'"><img class="ug-start-frame" alt="شروع '+esc(ex.name_fa)+'" src="'+esc(ex.image_start)+'" loading="lazy">'+(double?'<img class="ug-end-frame" alt="پایان '+esc(ex.name_fa)+'" src="'+esc(ex.image_end)+'" loading="lazy">':'')+'<figcaption>'+(double?'نمای شروع و پایان حرکت':'نمای آموزشی ثابت')+' · CC0</figcaption></figure>';
 }
 function instruction(ex){
  return '<div class="ug-instruction"><p><b>نحوه اجرا:</b> '+esc(ex.instructions)+'</p><p><b>عضلات:</b> '+esc(ex.target)+' · <b>تجهیزات:</b> '+esc(ex.equipment)+'</p>'+(ex.caution?'<small>⚠ '+esc(ex.caution)+'</small>':'')+'<a href="'+source+'" target="_blank" rel="noopener noreferrer">منبع تصویر CC0 ↗</a></div>';
 }
 function selectUser(list,chosen){return '<select data-studio-athlete>'+list.map(x=>'<option value="'+x.id+'" '+(String(x.id)===String(chosen)?'selected':'')+'>'+esc(x.full_name)+' · '+esc(x.discipline)+'</option>').join('')+'</select>'}
 async function exercises(){if(!state.exercises)state.exercises=(await api('/api/v2/exercises')).exercises;return state.exercises}
 async function exerciseSelect(){const list=await exercises();return '<select name="exercise_id" data-exercise-select>'+disciplines.map(d=>'<optgroup label="'+d+'">'+list.filter(x=>x.discipline===d).map(x=>'<option value="'+x.id+'">'+esc(x.name_fa)+'</option>').join('')+'</optgroup>').join('')+'</select>'}
 function daySelect(){return '<select name="day_label">'+dayLabels.map(d=>'<option>'+d+'</option>').join('')+'</select>'}
 function preview(){const x=document.querySelector('[data-exercise-select]');const ex=state.exercises?.find(a=>String(a.id)===String(x?.value));const output=$('ug-ex-preview');if(output)output.innerHTML=ex?'<div class="ug-preview">'+movement(ex)+instruction(ex)+'</div>':''}
 function label(text){return '<span class="ug-studio-eyebrow">'+esc(text)+'</span>'}
 function header(title,desc){return '<div class="ug-studio-banner">'+label('UGYM · PERSONAL COACH')+'<h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p></div>'}
 function status(p){return p.status==='active'?'فعال':p.status==='draft'?'پیش‌نویس':'بایگانی'}
 async function renderAdmin(which='studio'){state.mode=which;const serial=++state.serial;const out=$('admin-view');if(!out)return;out.innerHTML=empty('در حال دریافت اطلاعات...');try{if(which==='notices')await adminNotices(serial);else await adminPrograms(serial)}catch(e){if(serial===state.serial)out.innerHTML=empty(e.message);toast(e.message,true)}}
 async function renderMember(which='training'){state.mode=which;const serial=++state.serial;const out=$('member-view');if(!out)return;out.innerHTML=empty('در حال دریافت برنامه اختصاصی...');try{const data=await api('/api/v2/member/studio');if(serial!==state.serial)return;if(which==='nutrition')memberNutrition(data);else if(which==='notices')memberNotices(data);else memberTraining(data)}catch(e){if(serial===state.serial)out.innerHTML=empty(e.message);toast(e.message,true)}}
 async function adminPrograms(serial){
  const members=B().state().admin?.members||[],out=$('admin-view');
  if(!members.length){out.innerHTML=header('استودیو مربی','ابتدا از بخش «ورزشکاران» اولین عضو را ثبت کن.')+'<button type="button" class="btn btn-primary" data-tab="members">ثبت ورزشکار ←</button>';return;}
  const who=members.find(x=>String(x.id)===String(state.athlete))?.id||members[0].id;
  state.athlete=who;
  const [detail,choices]=await Promise.all([
   api('/api/v2/admin/studio?user_id='+who+(state.plan?'&plan_id='+state.plan:'')),
   exerciseSelect()
  ]);
  if(serial!==state.serial)return;
  state.plan=detail.plan?.id||null;
  const current=detail.plan,nut=detail.nutrition||{};
  const plans='<div class="ug-plan-tabs">'+detail.plans.map(p=>'<button type="button" class="'+(current&&String(current.id)===String(p.id)?'selected':'')+'" data-plan-select="'+p.id+'"><b>'+esc(p.title)+'</b><small>'+status(p)+'</small></button>').join('')+'</div>';
  const items=detail.items.map((it,i)=>'<div class="ug-prescription-item">'+movement(it)+'<div class="ug-prescription-body"><small>'+esc(it.day_label)+' · '+esc(it.discipline)+'</small><h4>'+esc(it.name_fa)+'</h4><div class="ug-rx"><span>'+fa(it.sets)+' ست</span><span>'+esc(it.reps)+' تکرار/زمان</span><span>'+fa(it.rest_seconds)+' ثانیه استراحت</span></div>'+(it.coach_note?'<div class="ug-coach-memo">'+esc(it.coach_note)+'</div>':'')+'<details><summary>آموزش حرکت و نکات ایمنی</summary>'+instruction(it)+'</details><button type="button" class="ug-danger" data-item-remove="'+it.id+'">حذف حرکت</button></div></div>').join('');
  const pending=detail.measurements.filter(x=>x.source==='member'&&!x.verified).map(m=>'<div class="ug-review"><div><b>'+date(m.measured_at)+'</b><small>وزن: '+fa(m.weight_kg)+' · چربی: '+fa(m.body_fat_pct)+' · دور کمر: '+fa(m.waist_cm)+'</small><p>'+esc(m.note)+'</p></div><button type="button" class="mini-btn" data-verify="'+m.id+'">تأیید مربی ✓</button></div>').join('');
  const logs=detail.logs.slice(0,22).map(log=>'<div class="ug-review"><div><b>'+esc(log.name_fa)+'</b><small>'+date(log.performed_on)+' · '+fa(log.completed_sets)+' ست'+(log.weight_kg?' · '+fa(log.weight_kg)+' کیلوگرم':'')+'</small></div></div>').join('');
  const planForm='<form data-studio-form="plan" class="ug-coach-form"><h4>ساخت برنامه جدید</h4><div class="field-grid"><div><label>عنوان برنامه</label>'+field('title','','text','maxlength="100" required placeholder="مثلاً ماه اول – قدرت و تعادل"')+'</div><div><label>تاریخ شروع</label>'+field('start_date',iso(),'date','required')+'</div><div><label>تاریخ پایان (اختیاری)</label>'+field('end_date','','date')+'</div></div><label>هدف</label>'+field('goal','','text','maxlength="300" placeholder="هدف برنامه"')+'<label>یادداشت مربی</label><textarea rows="2" name="coach_note" maxlength="650" placeholder="نکته‌های شخصی مربی"></textarea><button type="submit" class="btn btn-primary">ساخت پیش‌نویس برنامه ←</button></form>';
  let planDetail=empty('برای نوشتن برنامه، یک پیش‌نویس جدید بساز.');
  if(current){
   const menu='<div class="ug-plan-header"><h3>'+esc(current.title)+'</h3><span class="pill">'+status(current)+'</span></div><div class="ug-plan-points">'+esc(current.goal||'')+' · شروع: '+date(current.start_date)+'</div>';
   let add='';
   if(current.status!=='archived'){
    add='<form data-studio-form="item" class="ug-coach-form"><h4>افزودن حرکت</h4><div class="field-grid"><div><label>حرکت تمرینی</label>'+choices+'</div><div><label>روز برنامه</label>'+daySelect()+'</div><div><label>ست</label>'+field('sets','3','number','required min="1" max="20"')+'</div><div><label>تکرار / زمان</label>'+field('reps','۱۲','text','required maxlength="25"')+'</div><div><label>استراحت (ثانیه)</label>'+field('rest_seconds','60','number','required min="0" max="900"')+'</div></div><label>توضیح مخصوص این ورزشکار</label>'+field('coach_note','','text','maxlength="300"')+'<div id="ug-ex-preview"></div><div class="form-row"><button type="submit" class="btn btn-primary">افزودن حرکت +</button>'+(current.status==='draft'&&detail.items.length?'<button type="button" class="mini-btn" data-plan-publish="'+current.id+'">انتشار برای ورزشکار ✓</button>':'')+'</div></form>';
   }
   planDetail=menu+'<div class="ug-prescriptions">'+(items||empty('هنوز حرکتی ثبت نشده است.'))+'</div>'+add;
  }
  const nutrition='<form data-studio-form="nutrition" class="ug-coach-form"><label>عنوان راهنمای تغذیه</label>'+field('title',nut.title||'راهنمای تغذیه','text','required maxlength="100"')+
   '<label>صبحانه</label><textarea name="breakfast" rows="2" maxlength="600">'+esc(nut.breakfast)+'</textarea><label>ناهار</label><textarea name="lunch" rows="2" maxlength="600">'+esc(nut.lunch)+'</textarea><label>شام</label><textarea name="dinner" rows="2" maxlength="600">'+esc(nut.dinner)+'</textarea><label>میان‌وعده</label><textarea name="snacks" rows="2" maxlength="600">'+esc(nut.snacks)+'</textarea><label>توصیه عمومی مربی</label><textarea name="guidance" rows="3" maxlength="950">'+esc(nut.guidance)+'</textarea><button type="submit" class="btn btn-primary">ذخیره راهنمای تغذیه ←</button></form>';
  out.innerHTML=header('استودیو مربی','برنامه تمرین، نمایش حرکات، راهنمای غذایی و سابقه واقعی اجرای ورزشکار را از همین‌جا مدیریت کن.')+
  '<div class="dash-card"><label>انتخاب ورزشکار</label>'+selectUser(members,who)+'<p class="tiny-muted">'+esc(detail.athlete.discipline)+' · '+esc(detail.athlete.goal||'هدف هنوز ثبت نشده')+'</p></div>'+
  '<div class="ug-coach-columns"><div><section class="dash-card"><h3>برنامه‌های این ورزشکار</h3>'+plans+planForm+'</section>'+
  '<section class="dash-card section-gap">'+planDetail+'</section></div>'+
  '<div><section class="dash-card"><h3>توصیه غذایی اختصاصی</h3><p class="tiny-muted">برنامه غذایی با نظر مربی و متخصص واجدصلاحیت تنظیم شود.</p>'+nutrition+'</section>'+
  '<section class="dash-card section-gap"><h3>اندازه‌گیری‌های منتظر تأیید</h3>'+(pending||empty('اندازه‌گیری منتظر بررسی وجود ندارد.'))+'</section>'+
  '<section class="dash-card section-gap"><h3>عملکرد ثبت‌شده ورزشکار</h3>'+(logs||empty('هنوز اجرای تمرینی ثبت نشده است.'))+'</section></div></div>';
  preview();
 }
 async function adminNotices(serial){
  const out=$('admin-view'),members=B().state().admin?.members||[];
  const result=await api('/api/v2/admin/notices');if(serial!==state.serial)return;
  const list=result.notices.map(n=>'<div class="ug-notice"><b>'+esc(n.title)+'</b><small>'+esc(n.audience)+' · '+date(n.created_at)+'</small><p>'+esc(n.body)+'</p></div>').join('');
  out.innerHTML=header('اعلان‌های UGYM','برای همه اعضا یا ورزشکار مشخص پیام بفرست؛ پیام در صندوق اعلان‌های اپ نمایش داده می‌شود.')+
   '<div class="ug-coach-columns"><div class="dash-card"><h3>پیام جدید</h3><form data-studio-form="notice" class="ug-coach-form"><label>گیرنده</label><select name="user_id"><option value="">همه ورزشکاران</option>'+members.map(m=>'<option value="'+m.id+'">'+esc(m.full_name)+'</option>').join('')+'</select><label>نوع اعلان</label><select name="kind"><option value="general">اطلاعیه عمومی</option><option value="payment">یادآوری شهریه</option><option value="attendance">یادآوری حضور</option><option value="training">برنامه تمرین</option></select><label>عنوان</label>'+field('title','','text','required maxlength="90" placeholder="مثلاً تغییر ساعت کلاس"')+'<label>متن پیام</label><textarea rows="4" name="body" required maxlength="750" placeholder="پیام برای ورزشکاران"></textarea><button type="submit" class="btn btn-primary">ارسال به صندوق اعضا ←</button></form><p class="footnote">این اعلان‌ها داخل اپ هستند و فعلاً پیامک، پوش بیرون از اپ یا واتساپ خودکار ارسال نمی‌کنند.</p></div>'+
   '<div class="dash-card"><h3>اعلان‌های اخیر</h3>'+(list||empty('هنوز اعلانی منتشر نشده است.'))+'</div></div>';
 }
 function memberTraining(data){
  const out=$('member-view'),plan=data.plan;
  if(!plan){out.innerHTML=header('برنامه تمرین من','پس از تنظیم و انتشار برنامه توسط مربی، حرکت‌ها و راهنمای تصویری اینجا نمایش داده می‌شوند.')+empty('هنوز برنامه تمرینی فعالی برای شما منتشر نشده است.');return;}
  const today=iso(),days=[...new Set(data.items.map(x=>x.day_label))],active=days.includes(state.day)?state.day:days[0];state.day=active;
  const dayTabs=days.map(x=>'<button type="button" class="'+(x===active?'active':'')+'" data-studio-day="'+esc(x)+'">'+esc(x)+'</button>').join('');
  const items=data.items.filter(x=>x.day_label===active).map((ex,i)=>{
   const log=data.logs.find(x=>String(x.plan_item_id)===String(ex.id)&&String(x.performed_on).slice(0,10)===today);
   return '<article class="ug-movement-card">'+movement(ex)+'<div class="ug-movement-body"><span class="ug-move-tag">'+esc(ex.discipline)+' · '+esc(active)+'</span><h3>'+esc(ex.name_fa)+'</h3>'+
    '<div class="ug-rx"><span>'+fa(ex.sets)+' ست</span><span>'+esc(ex.reps)+' تکرار / زمان</span><span>'+fa(ex.rest_seconds)+' ثانیه استراحت</span></div>'+
    instruction(ex)+(ex.coach_note?'<div class="ug-coach-memo">✦ نکته مربی: '+esc(ex.coach_note)+'</div>':'')+
    '<form data-studio-form="log" class="ug-coach-form"><h4>ثبت عملکرد من</h4>'+field('plan_item_id',ex.id,'hidden')+
    '<div class="field-grid"><div><label>تاریخ تمرین</label>'+field('performed_on',today,'date','required')+'</div><div><label>ست انجام‌شده</label>'+field('completed_sets',log?.completed_sets??ex.sets,'number','required min="0" max="'+ex.sets+'"')+'</div><div><label>تکرار واقعی</label>'+field('actual_reps',log?.actual_reps||ex.reps,'text','maxlength="40"')+'</div><div><label>وزنه (کیلوگرم)</label>'+field('weight_kg',log?.weight_kg??'','number','min="0" max="400" step=".25"')+'</div><div><label>درجه سختی /۱۰</label>'+field('difficulty',log?.difficulty??'','number','min="1" max="10"')+'</div></div>'+
    '<label>یادداشت اجرا</label>'+field('note',log?.note??'','text','maxlength="250" placeholder="مثلاً ست آخر سخت بود"')+
    '<button type="submit" class="btn btn-primary">'+(log?'به‌روزرسانی اجرای امروز ✓':'ثبت تمرین انجام‌شده ✓')+'</button></form></div></article>';
  }).join('');
  const uniqueDays=new Set(data.logs.map(x=>String(x.performed_on).slice(0,10))).size;
  out.innerHTML=header(plan.title,plan.goal||'برنامه اختصاصی تو آماده است.')+
   (plan.coach_note?'<div class="ug-coach-memo ug-full-note">✦ پیام مربی: '+esc(plan.coach_note)+'</div>':'')+
   '<div class="ug-studio-kpis"><div><span>حرکت برنامه</span><strong>'+fa(data.items.length)+'</strong></div><div><span>روزهای تمرین ثبت‌شده</span><strong>'+fa(uniqueDays)+'</strong></div><div><span>جلسه‌های برنامه</span><strong>'+fa(days.length)+'</strong></div></div>'+
   '<div class="ug-day-tabs">'+dayTabs+'</div><div class="ug-member-movements">'+items+'</div>'+
   '<p class="ug-source-note">تصاویر صرفاً شروع و پایان حرکت را نشان می‌دهند و جایگزین آموزش حضوری مربی نیستند. تصاویر آموزشی CC0 از <a target="_blank" rel="noopener noreferrer" href="'+source+'">کتابخانه حرکات</a> هستند.</p>';
 }
 function memberNutrition(data){
  const a=data.nutrition,out=$('member-view');
  if(!a){out.innerHTML=header('راهنمای تغذیه من','بعد از اینکه مربی برنامه را برایت ثبت کند، در این بخش نمایش داده می‌شود.')+empty('هنوز راهنمای تغذیه اختصاصی ثبت نشده است.');return;}
  const meals=[['صبحانه',a.breakfast],['ناهار',a.lunch],['شام',a.dinner],['میان‌وعده',a.snacks]];
  out.innerHTML=header(a.title,'آخرین ویرایش مربی: '+date(a.updated_at))+
   '<div class="ug-meal-grid">'+meals.filter(x=>x[1]).map((m,i)=>'<div class="ug-meal"><span>0'+(i+1)+' ✦</span><h3>'+esc(m[0])+'</h3><p>'+esc(m[1])+'</p></div>').join('')+'</div>'+
   (a.guidance?'<section class="dash-card section-gap"><h3>توصیه‌های مربی</h3><p class="ug-nutrition-text">'+esc(a.guidance)+'</p></section>':'')+
   '<p class="ug-source-note">رژیم درمانی، تغذیه در بیماری، بارداری و مصرف مکمل به نظر متخصص واجدصلاحیت نیاز دارد.</p>';
 }
 function memberNotices(data){
  const msgs=[...data.reminders.map((x,i)=>({...x,auto:true,id:'auto-'+i})),...data.notices];
  const cards=msgs.map(x=>'<article class="ug-inbox-card '+(!x.auto&&!x.is_read?'unread':'')+'"><div class="ug-inbox-icon">'+(x.kind==='payment'?'◈':x.kind==='attendance'?'♙':'✦')+'</div><div><small>'+(x.auto?'یادآوری سامانه':date(x.created_at))+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p>'+(!x.auto&&!x.is_read?'<button type="button" class="mini-btn" data-notice-read="'+x.id+'">خواندم ✓</button>':'')+'</div></article>').join('');
  $('member-view').innerHTML=header('صندوق اعلان‌های من','یادآوری شهریه، حضور و پیام‌های باشگاه را در یک جا ببین.')+
   (cards?'<div class="ug-inbox-grid">'+cards+'</div>':empty('اعلان تازه‌ای وجود ندارد'))+
   '<section class="ug-push-preferences" id="ug-push-preferences"><h3>اعلان روی گوشی</h3><p>در حال بررسی سرویس اعلان گوشی...</p></section><p class="ug-source-note">پیام‌های داخل اپ فعال هستند. اعلان گوشی پس از اتصال سرویس، نصب اپ و رضایت ورزشکار فعال خواهد شد.</p>';
  updatePushPanel();
 }
 async function updatePushPanel(){
  const place=document.getElementById('ug-push-preferences');if(!place)return;
  try{
   const status=await api('/api/v3/integration-status');if(!place.isConnected)return;
   if(!status.push_enabled){place.innerHTML='<h3>اعلان روی گوشی</h3><p>سرویس پوش هنوز متصل نیست. پیام‌های داخل اپ قابل مشاهده هستند و این گزینه بعد از تنظیم کلیدهای VAPID توسط مدیریت فعال می‌شود.</p>';return;}
   if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window)){
    place.innerHTML='<h3>اعلان روی گوشی</h3><p>این مرورگر از اعلان پوش پشتیبانی نمی‌کند؛ در آیفون ابتدا UGYM را از Safari روی صفحه اصلی نصب و از آیکون آن باز کن.</p>';return;
   }
   const r=await navigator.serviceWorker.ready;const subscription=await r.pushManager.getSubscription();
   place.innerHTML='<h3>اعلان روی گوشی</h3><p>برای دریافت پیام‌های باشگاه در زمان بسته‌بودن صفحه، باید خودت اجازه اعلان را صادر کنی. با لغو مجوز، اشتراک حذف می‌شود.</p>'+
    '<button type="button" class="mini-btn" data-push-'+(subscription?'disable':'enable')+'="1">'+(subscription?'غیرفعال‌کردن اعلان گوشی':'فعال‌کردن اعلان گوشی')+'</button>';
   state.pushKey=status.push_public_key;
  }catch(e){if(place.isConnected)place.innerHTML='<h3>اعلان روی گوشی</h3><p>در حال حاضر وضعیت سرویس اعلان قابل دریافت نیست.</p>';}
 }
 function urlKey(s){
  const padding='='.repeat((4-s.length%4)%4);const base64=(s+padding).replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
 }
 async function pushToggle(enable){
  if(!('serviceWorker'in navigator)||!('Notification'in window))throw Error('این مرورگر از اعلان گوشی پشتیبانی نمی‌کند');
  const reg=await navigator.serviceWorker.ready;
  if(!enable){
   const current=await reg.pushManager.getSubscription();if(current){await api('/api/v3/member/push/unsubscribe',{endpoint:current.endpoint});await current.unsubscribe();}
   toast('اعلان گوشی غیرفعال شد');await updatePushPanel();return;
  }
  if(!state.pushKey)throw Error('کلید اعلان گوشی هنوز در سامانه تنظیم نشده است');
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('مجوز اعلان گوشی داده نشد');
  const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlKey(state.pushKey)});
  await api('/api/v3/member/push/subscribe',{subscription:subscription.toJSON()});
  toast('اعلان گوشی فعال شد');await updatePushPanel();
 }
 function mountSelfMeasure(){
  const out=$('member-view');if(!out)return;
  const wrapper=document.createElement('section');wrapper.className='dash-card section-gap ug-self-measure';
  wrapper.innerHTML='<h3>اندازه‌گیری جدید من</h3><p class="tiny-muted">اطلاعاتی که خودت ثبت می‌کنی با برچسب «خوداظهاری» ذخیره می‌شوند تا مربی آن‌ها را بررسی کند.</p>'+
   '<form data-studio-form="measure" class="ug-coach-form"><div class="field-grid cols3"><div><label>تاریخ</label>'+field('measured_at',iso(),'date','required')+'</div><div><label>وزن (کیلوگرم)</label>'+field('weight_kg','','number','min="0.1" max="400" step=".01"')+'</div><div><label>چربی بدن (درصد)</label>'+field('body_fat_pct','','number','min="0.1" max="100" step=".1"')+'</div><div><label>دور کمر (سانتی‌متر)</label>'+field('waist_cm','','number','min="0.1" max="300" step=".1"')+'</div><div><label>امتیاز عملکرد /۱۰۰</label>'+field('performance_score','','number','min="0.1" max="100" step=".1"')+'</div></div><label>توضیح (اختیاری)</label>'+field('note','','text','maxlength="400" placeholder="مثلاً اندازه‌گیری صبح"')+'<button type="submit" class="btn btn-primary">ذخیره برای بررسی مربی ←</button></form>';
  out.append(wrapper);
  const items=B().state().member?.measurements||[],pending=items.filter(x=>x.source==='member'&&!x.verified);
  if(pending.length){const p=document.createElement('p');p.className='ug-unverified-tag';p.textContent=fa(pending.length)+' مورد خوداظهاری در انتظار تأیید مربی است.';wrapper.append(p)}
 }
 async function refresh(){if(B().state().user?.role==='admin')await renderAdmin(state.mode);else await renderMember(state.mode)}
 document.addEventListener('change',ev=>{
  if(ev.target.matches('[data-studio-athlete]')){state.athlete=ev.target.value;state.plan=null;renderAdmin('studio');}
  if(ev.target.matches('[data-exercise-select]'))preview();
 });
 document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-plan-select],[data-plan-publish],[data-item-remove],[data-verify],[data-notice-read],[data-studio-day],[data-push-enable],[data-push-disable]');
  if(!t)return;
  try{
   if(t.dataset.pushEnable){await pushToggle(true);return;}
   if(t.dataset.pushDisable){await pushToggle(false);return;}
   if(t.dataset.studioDay){state.day=t.dataset.studioDay;renderMember('training');return;}
   if(t.dataset.planSelect){state.plan=t.dataset.planSelect;renderAdmin('studio');return;}
   if(t.dataset.planPublish){if(!confirm('برنامه برای ورزشکار منتشر شود؟ برنامه قبلی بایگانی خواهد شد.'))return;await api('/api/v2/admin/plan/activate',{plan_id:Number(t.dataset.planPublish)});toast('برنامه منتشر شد');renderAdmin('studio');return;}
   if(t.dataset.itemRemove){if(!confirm('این حرکت حذف شود؟'))return;await api('/api/v2/admin/plan/item/remove',{item_id:Number(t.dataset.itemRemove)});toast('حرکت حذف شد');renderAdmin('studio');return;}
   if(t.dataset.verify){if(!confirm('این اندازه‌گیری خوداظهاری را بررسی و تأیید می‌کنی؟'))return;await api('/api/v2/admin/measure/verify',{measurement_id:Number(t.dataset.verify)});toast('اندازه‌گیری تأیید شد');renderAdmin('studio');return;}
   if(t.dataset.noticeRead){await api('/api/v2/member/notice/read',{notice_id:Number(t.dataset.noticeRead)});renderMember('notices');return;}
  }catch(e){toast(e.message,true)}
 });
 document.addEventListener('submit',async ev=>{
  const form=ev.target,what=form.dataset.studioForm;if(!what)return;ev.preventDefault();
  const b=Object.fromEntries(new FormData(form).entries()),paths={'plan':'/api/v2/admin/plans','item':'/api/v2/admin/plan/item','nutrition':'/api/v2/admin/nutrition','notice':'/api/v2/admin/notices','log':'/api/v2/member/log','measure':'/api/v2/member/measure'};
  if(what==='plan'||what==='nutrition')b.user_id=Number(state.athlete);
  if(what==='item'){b.plan_id=Number(state.plan);b.sort_order=99;}
  const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{const saved=await api(paths[what],b);toast('اطلاعات با موفقیت ذخیره شد');if(what==='plan')state.plan=saved.id;if(what==='measure'){await B().reloadMember();return;}await refresh();}
  catch(e){toast(e.message,true)}finally{if(button)button.disabled=false}
 });
 window.UGYMStudio={renderAdmin,renderMember,mountSelfMeasure,setAthlete(x){state.athlete=x;state.plan=null}};
})();