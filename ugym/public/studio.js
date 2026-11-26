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
 async function adminPrograms(serial){/* ADMIN_PROGRAMS */ }
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