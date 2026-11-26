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
 async function adminNotices(serial){/* ADMIN_NOTICES */ }
 function memberTraining(data){/* MEMBER_TRAINING */ }
 function memberNutrition(data){/* MEMBER_NUTRITION */ }
 function memberNotices(data){/* MEMBER_NOTICES */ }
 function mountSelfMeasure(){/* SELF_MEASURE */ }
 async function refresh(){if(B().state().user?.role==='admin')await renderAdmin(state.mode);else await renderMember(state.mode)}
 document.addEventListener('change',ev=>{
  if(ev.target.matches('[data-studio-athlete]')){state.athlete=ev.target.value;state.plan=null;renderAdmin('studio');}
  if(ev.target.matches('[data-exercise-select]'))preview();
 });
 document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-plan-select],[data-plan-publish],[data-item-remove],[data-verify],[data-notice-read],[data-studio-day]');
  if(!t)return;
  try{
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