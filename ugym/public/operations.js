'use strict';
(()=>{
 const B=()=>window.UGYMBridge;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=x=>new Intl.NumberFormat('fa-IR').format(Number(x)||0);
 const toast=(msg,err=false)=>B().toast(msg,err);
 const api=(url,data)=>B().api(url,data);
 const local={tab:'coaches',link:null};
 const wrap=(headline,desc,content)=>'<div class="ug-ops-head"><span>UGYM · CLUB OPERATIONS</span><h2>'+esc(headline)+'</h2><p>'+esc(desc)+'</p></div>'+content;
 const empty=s=>'<div class="ug-studio-empty"><p>'+esc(s)+'</p></div>';
 const members=()=>B().state()?.admin?.members||[];
 const options=(chosen)=>members().map(m=>'<option value="'+m.id+'" '+(String(m.id)===String(chosen)?'selected':'')+'>'+esc(m.full_name)+' · '+esc(m.discipline)+'</option>').join('');
 const badge=(s)=>'<span class="ug-ops-badge">'+esc(s)+'</span>';
 const tiny=(k,v)=>'<div class="ug-ops-row"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>';
 function listBox(items){return items.length?items.join(''):empty('هنوز موردی ثبت نشده است.')}
 async function render(tab){
  local.tab=tab;
  const output=document.getElementById('admin-view');if(!output)return;
  output.innerHTML='<div class="ug-studio-loading">در حال دریافت اطلاعات UGYM...</div>';
  try{
   if(tab==='coaches')return await coaches(output);
   if(tab==='lockers')return await lockers(output);
   if(tab==='integrations')return await integrations(output);
   if(tab==='reminders')return await reminders(output);
  }catch(e){output.innerHTML=empty(e.message);toast(e.message,true)}
 }
 async function coaches(out){
  const x=await api('/api/v3/admin/coaches');const active=x.coaches||[];
  const inviteRows=(x.invites||[]).slice(0,8).map(i=>'<div class="ug-ops-row"><div><b>'+esc(i.full_name)+'</b><small>'+esc(i.email)+'</small></div>'+badge(i.revoked_at?'باطل':i.used_at?'استفاده شده':new Date(i.expires_at)<new Date()?'منقضی':'در انتظار ثبت‌نام')+'</div>');
  const coachRows=active.map(c=>{
   const linked=(x.assignments||[]).filter(a=>String(a.coach_id)===String(c.id)).map(a=>String(a.user_id));
   return '<div class="ug-ops-coach"><div class="ug-ops-coach-head"><div class="ug-coach-avatar">✦</div><div><h3>'+esc(c.full_name)+'</h3><span>'+esc(c.username)+' · '+esc(c.email)+'</span></div>'+badge(fmt(linked.length)+' ورزشکار')+'</div><form data-op-form="assign"><input type="hidden" name="coach_id" value="'+c.id+'"><label>انتخاب ورزشکار تحت نظر</label><select name="user_id" required>'+options()+'</select><div class="ug-ops-actions"><button type="submit" class="btn btn-primary" name="assign" value="true">افزودن به فهرست مربی</button><button type="submit" class="mini-btn" name="assign" value="false">برداشتن دسترسی</button></div></form>'+(linked.length?'<p class="tiny-muted">افراد تحت نظر: '+linked.map(id=>{const a=members().find(z=>String(z.id)===id);return a?esc(a.full_name):'#'+id}).join('، ')+'</p>':'<p class="tiny-muted">هنوز ورزشکاری برای این مربی اختصاص داده نشده است.</p>')+'</div>';
  });
  out.innerHTML=wrap('حساب‌های مربیان','برای هر مربی، حساب دعوت‌نامه‌ای و فهرست ورزشکاران مستقل ایجاد کن. مربی به مالی و اطلاعات ورزشکاران دیگر دسترسی ندارد.',
   '<div class="ug-ops-grid"><div class="dash-card"><h3>دعوت مربی جدید</h3><form data-op-form="invite"><label>نام مربی</label><input name="full_name" required maxlength="120" placeholder="نام و نام خانوادگی"><label>ایمیل متعلق به مربی</label><input name="email" type="email" required maxlength="180" placeholder="coach@example.com"><button class="btn btn-primary" type="submit">ساخت لینک دعوت خصوصی ←</button></form><p class="footnote">لینک فقط ۴۸ ساعت اعتبار دارد. مربی خودش نام کاربری و رمز اختصاصی می‌سازد. لینک را در کانال عمومی منتشر نکن.</p><div id="ug-invite-result"></div></div>'+
   '<div class="dash-card"><h3>دعوت‌نامه‌های اخیر</h3>'+listBox(inviteRows)+'</div></div>'+
   '<div class="dash-card section-gap"><h3>مربیان فعال و تعیین ورزشکار</h3><div class="ug-ops-coach-grid">'+listBox(coachRows)+'</div></div>');
 }
 function policyText(code){
  const map={unassigned:'بدون ورزشکار',inactive:'غیرفعال',manual_override:'مجوز موقت مدیریتی',payment_review:'بدهی سررسیدشده · بررسی لازم',payment_unknown:'وضعیت مالی نامشخص',eligible:'شهریه سررسیدشده ندارد'};
  return map[code]||code;
 }
 async function lockers(out){
  const {lockers:list}=await api('/api/v3/admin/lockers');
  const rows=list.map(x=>'<div class="ug-ops-locker"><div class="ug-ops-locker-top"><div class="ug-lock-icon">▣</div><div><h3>'+esc(x.label)+'</h3><span>'+esc(x.full_name||'واگذار نشده')+'</span></div>'+badge(policyText(x.policy))+'</div><small>قفل واقعی: اتصال‌نشده · هیچ فرمان فیزیکی صادر نمی‌شود.</small><form data-op-form="locker-assign"><input type="hidden" name="locker_id" value="'+x.id+'"><label>اختصاص به ورزشکار</label><select name="user_id"><option value="">آزاد کردن کمد در سامانه</option>'+options(x.user_id)+'</select><button class="mini-btn" type="submit">ذخیره تخصیص</button></form>'+(x.user_id?'<form data-op-form="locker-override"><input type="hidden" name="locker_id" value="'+x.id+'"><label>مجوز موقت مدیریتی (صرفاً پیش‌نمایش)</label><div class="ug-ops-actions"><select name="hours"><option value="1">۱ ساعت</option><option value="4">۴ ساعت</option><option value="24">۲۴ ساعت</option></select><input name="reason" minlength="8" maxlength="200" required placeholder="دلیل مجوز موقت"><button type="submit" class="mini-btn">ثبت مجوز</button></div></form>':'')+'</div>').join('');
  out.innerHTML=wrap('مدیریت کمدهای هوشمند','تخصیص کمد و بررسی وضعیت شهریه آماده است. تا تهیه کنترلر دارای API و روش بازکردن اضطراری، خروجی فقط شبیه‌سازی خواهد بود.',
   '<div class="ug-ops-grid"><div class="dash-card"><h3>تعریف کمد جدید</h3><form data-op-form="locker-create"><label>نام یا شماره کمد</label><input name="label" required minlength="2" maxlength="40" placeholder="مثلاً کمد A-01"><label>توضیح اختیاری</label><input name="notes" maxlength="160" placeholder="رختکن شماره ۱"><button class="btn btn-primary" type="submit">ثبت کمد +</button></form></div>'+
   '<div class="dash-card"><h3>امنیت تجهیزات و شرایط فعال‌سازی</h3><p class="ug-ops-description">کمد هیچ‌وقت نباید مانع خروج یا دسترسی اضطراری شود. مدیریت باید امکان بازکردن دستی مستقل از اینترنت و وضعیت شهریه داشته باشد.</p>'+tiny('اتصال کنترلر','انجام نشده')+tiny('قطع دسترسی سخت‌افزاری','فعال نیست')+tiny('وضعیت مجوز','فقط پیش‌نمایش')+'<button class="mini-btn" type="button" data-tab="integrations">تنظیم اتصال سرویس‌ها ←</button></div></div>'+
   '<div class="ug-ops-locker-grid section-gap">'+listBox(rows)+'</div>');
 }
 async function integrations(out){
  const d=await api('/api/v3/admin/integrations');
  const names={locker:'کمد هوشمند',push:'اعلان گوشی (Web Push)',sms:'ارسال پیامک',whatsapp:'واتساپ خودکار'};
  const cards=(d.integrations||[]).map(x=>'<article class="ug-integration-card"><span>◈ UGYM INTEGRATIONS</span><h3>'+esc(names[x.code]||x.code)+'</h3>'+badge(x.ready?'آماده اتصال':'اتصال‌نشده')+'<p>'+esc(x.public_note)+'</p></article>').join('');
  out.innerHTML=wrap('مرکز اتصال سرویس‌ها','بخش‌های لازم از هم جدا هستند؛ کلیدهای محرمانه باید بعداً فقط در محیط امن میزبان تنظیم شوند، نه داخل این صفحه یا چت.',
   '<div class="ug-integration-grid">'+cards+'</div><div class="dash-card section-gap"><h3>چه سرویس‌هایی برای فعال‌سازی لازم‌اند؟</h3>'+
   tiny('پوش گوشی','کلیدهای VAPID_PUBLIC_KEY، VAPID_PRIVATE_KEY و VAPID_SUBJECT در Render')+
   tiny('اعلان زمان‌بندی‌شده','Cron یا Worker همیشه‌فعال؛ فعلاً ارسال دستی داخل اپ آماده است')+
   tiny('کمدها','کنترلر سازگار با API، قرارداد، مسیر اضطراری و آزمون ایمنی')+
   tiny('پیامک','پنل پیامکی معتبر و توکن دسترسی')+
   tiny('واتساپ خودکار','WhatsApp Business API و مجوز دریافت پیام')+
   '<p class="footnote">اطلاعات مالی و بدنی هیچ‌وقت بدون رضایت و ضرورت به سرویس ثالث ارسال نمی‌شود. در حال حاضر هیچ سرویس خارجی جدیدی فعال نشده است.</p></div>');
 }
 async function reminders(out){
  const d=await api('/api/v3/admin/reminders');
  const rows=d.candidates.map(x=>'<div class="ug-ops-row"><div><b>'+esc(x.full_name)+'</b><small>'+esc(x.title)+' · '+esc(x.kind==='payment'?'شهریه':'غیبت')+'</small></div>'+badge('داخل اپ')+'</div>');
  out.innerHTML=wrap('یادآوری‌های هوشمند','سامانه بدهی‌های سررسیدشده و غیبت‌های ثبت‌شده را شناسایی می‌کند. ارسال یادآوری گروهی، با تأیید مدیر انجام می‌شود.',
   '<div class="ug-ops-grid"><div class="dash-card"><h3>بررسی امروز</h3><div class="ug-reminder-number">'+fmt(d.total)+'</div><p class="tiny-muted">یادآوری بالقوه ثبت شده است. هر نوع یادآوری برای هر ورزشکار در هر روز حداکثر یک بار ثبت می‌شود.</p><button class="btn btn-primary" id="ug-send-reminders" type="button" '+(!d.total?'disabled':'')+'>ارسال اعلان‌های امروز ←</button><p class="footnote">اعلان‌ها در صندوق اپ ثبت می‌شوند. پوش گوشی فقط با اتصال کلیدهای VAPID و رضایت ورزشکار فعال خواهد شد.</p></div>'+
   '<div class="dash-card"><h3>فهرست بررسی‌شده</h3>'+listBox(rows)+'</div></div>');
 }
 document.addEventListener('submit',async e=>{
  const form=e.target;if(!form.dataset.opForm)return;e.preventDefault();
  const kind=form.dataset.opForm,raw=Object.fromEntries(new FormData(form).entries());
  if(kind==='assign'){const btn=e.submitter;raw.assigned=btn?.value==='true';}
  const map={invite:'/api/v3/admin/coach-invite',assign:'/api/v3/admin/coach/assign','locker-create':'/api/v3/admin/locker/create','locker-assign':'/api/v3/admin/locker/assign','locker-override':'/api/v3/admin/locker/override'};
  const button=e.submitter||form.querySelector('[type=submit]');if(button)button.disabled=true;
  try{
   const result=await api(map[kind],raw);
   if(kind==='invite'){
    const link='https://ugym-official-app-2026.onrender.com/coach-join/#invite='+result.invite;
    local.link=link;
    const dest=document.getElementById('ug-invite-result');
    if(dest)dest.innerHTML='<div class="ug-invite-result"><b>لینک دعوت اختصاصی آماده شد</b><p>تا ۴۸ ساعت معتبر است و فقط یک بار استفاده می‌شود.</p><button type="button" id="ug-copy-invite" class="btn btn-primary">کپی لینک خصوصی مربی</button></div>';
    toast('دعوت مربی ایجاد شد. لینک را خصوصی به خود مربی بده.');
   }else{toast('تغییرات ذخیره شد');render(local.tab);}
  }catch(err){toast(err.message,true);}
  finally{if(button)button.disabled=false;}
 });
 document.addEventListener('click',async e=>{
  if(e.target.closest('#ug-copy-invite')){
   if(!local.link)return;
   try{await navigator.clipboard.writeText(local.link);toast('لینک دعوت کپی شد');}
   catch{window.prompt('لینک خصوصی مربی را کپی کن',local.link);}
  }
  if(e.target.closest('#ug-send-reminders')){
   if(!confirm('یادآوری‌های امروز به صندوق اعلان ورزشکاران واجد شرایط ارسال شود؟'))return;
   const btn=e.target.closest('button');btn.disabled=true;
   try{const r=await api('/api/v3/admin/reminders/dispatch',{confirm:true});toast(fmt(r.created)+' اعلان جدید ثبت شد');render('reminders');}
   catch(err){toast(err.message,true);}finally{btn.disabled=false}
  }
 });
 window.UGYMOperations={render};
})();