'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 let deferred=null;
 const header=$('ug-installbar'),modal=$('ug-installhelp'),help=$('ug-helptext');
 if(/iphone|ipad|ipod/i.test(navigator.userAgent))$('ug-installbtn').textContent='راهنمای نصب آیفون ↗';
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 function manualHelp(){
  let text;
  if(standalone())text='UGYM هم‌اکنون مثل یک اپ روی دستگاهت نصب یا باز شده است.';
  else if(/iphone|ipad|ipod/i.test(navigator.userAgent))text='۱. لینک همین پنل UGYM را در Safari باز کن (نه مرورگر داخلی ChatGPT یا تلگرام). ۲. از دکمه Share یا Page Menu ← Share استفاده کن. ۳. گزینه Add to Home Screen را بزن؛ اگر نبود در Edit Actions پیدایش کن. ۴. Open as Web App را فعال کن و Add را بزن. با این کار، پنل شخصی UGYM از آیکون صفحه اصلی اجرا می‌شود.';
  else if(/android/i.test(navigator.userAgent))text='در Chrome، منوی سه‌نقطه را باز کن و «Install app / نصب برنامه» یا «Add to Home screen» را انتخاب کن.';
  else text='در Chrome یا Edge، از منوی مرورگر گزینه «Install app» یا «نصب برنامه» را انتخاب کن. اگر گزینه در دسترس نیست می‌توانی UGYM را به نشانک‌ها اضافه کنی.';
  help.textContent=text;modal.hidden=false;
 }
 async function install(){if(standalone()){manualHelp();return;}if(deferred){const p=deferred;deferred=null;await p.prompt();try{const result=await p.userChoice;if(result.outcome==='accepted')header.hidden=true}catch{}}else manualHelp();}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event});
 window.addEventListener('appinstalled',()=>{header.hidden=true;deferred=null});
 $('ug-installbtn').addEventListener('click',install);
 $('ug-installhide').addEventListener('click',()=>{header.hidden=true;try{sessionStorage.setItem('ug_install_hidden','1')}catch{}});
 try{if(sessionStorage.getItem('ug_install_hidden')==='1')header.hidden=true}catch{}
 $('ug-helpclose').addEventListener('click',()=>{modal.hidden=true});
 $('ug-helpok').addEventListener('click',()=>{modal.hidden=true});
 modal.addEventListener('click',event=>{if(event.target===modal)modal.hidden=true});
 const coach=$('ug-coachbox'),fab=$('ug-coachfloat'),thread=$('ug-thread'),field=$('ug-coachinput');
 function show(){coach.hidden=false;fab.hidden=true;field.focus();}
 function hide(){coach.hidden=true;fab.hidden=false;}
 fab.addEventListener('click',show);
 $('ug-coachclose').addEventListener('click',hide);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){hide();modal.hidden=true}});
 function bubble(message,isUser=false){
  const el=document.createElement('div');el.className='ug-msg '+(isUser?'ug-user':'ug-bot');el.textContent=String(message||'').slice(0,1500);thread.appendChild(el);thread.scrollTop=thread.scrollHeight;
 }
 function action(text,link){
  const el=document.createElement('a');el.className='ug-a';el.textContent=text+' ←';el.href=link;thread.appendChild(el);thread.scrollTop=thread.scrollHeight;
 }
 const answerTable=[
  [/سلام|خوبی|آوا|اسم|کی هستی/, 'سلام قهرمان 💜 من آوا، راهنمای مجازی UGYM هستم. از من درباره کلاس‌ها، رشته‌ها، ثبت‌نام و پنل شخصی بپرس.'],
  [/پیلاتس|انعطاف|تعادل/, 'پیلاتس برای تقویت کنترل حرکت، انعطاف و عضلات مرکزی مناسبه. اگر تازه‌کاری، از کلاس مقدماتی و فرم صحیح حرکات شروع کن.'],
  [/ایروبیک|هوازی|استقامت/, 'ایروبیک یک گزینه پرانرژی برای فعالیت هوازی و استقامته؛ شدت کلاس باید متناسب با سطح آمادگی بدنی‌ات باشه.'],
  [/بدنسازی|قدرت|وزنه|فرم.?دهی/, 'بدنسازی به افزایش قدرت و فرم‌دهی کمک می‌کنه. تمرین اصولی و پیشرفت تدریجی رو با مربی باشگاه هماهنگ کن.'],
  [/TRX|trx|بند|معلق/, 'TRX با بندهای معلق و وزن بدن انجام می‌شه؛ برای شروع صحیح، زاویه بدن و اجرای امن حرکات اهمیت دارن.'],
  [/نمودار|پیشرفت|وزن|چربی|ارزیابی|اندازه/, 'در پنل ورزشکار به بخش «مسیر پیشرفت» برو. نمودارهای وزن، دور کمر، درصد چربی و امتیاز عملکرد بعد از ثبت اندازه‌گیری توسط مربی نمایش داده می‌شن.'],
  [/ثبت.?نام|عضویت|ساخت حساب|رمز/, 'برای ثبت‌نام روی «شروع عضویت» در صفحه اصلی باشگاه بزن، حساب خودت رو بساز و رشته اصلی رو انتخاب کن. رمزت رو با کسی به اشتراک نذار.'],
  [/تغذیه|رژیم|مکمل|کالری/, 'تغذیه متعادل، آب کافی و استراحت به عملکرد ورزشی کمک می‌کنن. برای رژیم شخصی یا مکمل بهتره متخصص تغذیه یا پزشک با اطلاعات کامل از شرایطت راهنمایی کنه.'],
  [/درد|سرگیجه|قلب|تنگی نفس|آسیب|بارداری|مصدوم/, 'اگر هنگام ورزش درد غیرعادی، سرگیجه یا تنگی نفس داری، تمرین رو متوقف کن. در علائم شدید کمک فوری پزشکی بگیر؛ من جایگزین پزشک یا مربی متخصص نیستم.']
 ];
 async function answer(question){
  const q=String(question||'').trim().slice(0,350);if(!q)return;
  bubble(q,true);
  const low=q.toLowerCase();
  if(/شهریه من|بدهی من|پرداخت من/.test(low)){
   try{
    const profile=await fetch('/api/me',{credentials:'same-origin'}).then(r=>r.json());
    if(profile.user?.role==='member'){
     const d=await fetch('/api/member/dashboard',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('خطا');return r.json()});
     const pending=d.payments.filter(p=>p.status==='pending').reduce((a,p)=>a+Number(p.amount_toman),0);
     bubble('در پرونده شخصی تو '+d.payments.length.toLocaleString('fa-IR')+' رکورد مالی ثبت شده و مجموع بدهی‌های باز '+pending.toLocaleString('fa-IR')+' تومان است. برای جزئیات، بخش «شهریه‌ها» را باز کن.');
     const tab=document.querySelector('[data-member-tab="payments"]');if(tab)tab.click();
     return;
    }else if(profile.user?.role==='admin'){bubble('شما با حساب مدیریت وارد شده‌ای. جزئیات مالی در بخش «شهریه‌ها و امور مالی» قابل مشاهده است.');return}
    else{bubble('برای دیدن شهریه شخصی ابتدا وارد حساب ورزشکار شو.');action('ورود', '/login');return}
   }catch{bubble('در حال حاضر امکان دریافت سوابق مالی وجود ندارد. کمی بعد دوباره امتحان کن.');return}
  }
  if(/ساعت|زمان|برنامه کلاس|کلاس.?ها|رزرو/.test(low)){
   try{
    const r=await fetch('/api/classes');if(!r.ok)throw Error('error');
    const data=await r.json();const days=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
    const classes=(data.classes||[]).slice(0,6).map(x=>x.title+' — '+days[x.weekday]+' ساعت '+x.start_time);
    bubble(classes.length?'برنامه ثبت‌شده در سامانه:\n'+classes.join('\n')+'\n\nبرای رزرو وارد پنل ورزشکار شو. ساعت‌ها را با مدیریت باشگاه نهایی کن.':'هنوز کلاسی در سامانه ثبت نشده.');action('رزرو کلاس', '/member');
   }catch{bubble('برنامه کلاس‌ها فعلاً در دسترس نیست؛ از پنل ورزشکار دوباره امتحان کن.');}
   return;
  }
  const found=answerTable.find(x=>x[0].test(low));
  bubble(found?found[1]:'می‌تونم در مورد رشته‌های UGYM، کلاس‌ها، شهریه، ثبت‌نام و بخش‌های پنل راهنماییت کنم. برای سؤال‌های تخصصی شخصی یا مسائل باشگاه از مربی یا مدیریت کمک بگیر.');
 }
 document.querySelectorAll('[data-ugask]').forEach(btn=>btn.addEventListener('click',()=>{show();answer(btn.dataset.ugask)}));
 $('ug-coachform').addEventListener('submit',e=>{e.preventDefault();const q=field.value;field.value='';answer(q);});
})();
