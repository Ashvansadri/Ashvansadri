'use strict';
(()=>{
const $=id=>document.getElementById(id);
let installPrompt=null;
const registerUrl='https://ugym-fitness-club-2026.onrender.com/register';
const memberUrl='https://ugym-fitness-club-2026.onrender.com/member';
const answers=[
 {re:/ثبت.?نام|عضو|اکانت|حساب|شروع کنم/,text:'برای عضویت در UGYM، روی «شروع عضویت» بزن، نام، ایمیل، رمز دلخواه و رشته اصلی‌ات رو وارد کن. بعد از ساخت حساب می‌تونی وارد پنل ورزشکار بشی.',link:registerUrl,title:'شروع ثبت‌نام'},
 {re:/شهریه|قیمت|هزینه|پول|پرداخت|اقساط|کارت/,text:'مبلغ شهریه هر رشته هنوز به‌صورت رسمی در سایت ثبت نشده. وقتی مدیر باشگاه شهریه‌ات رو ثبت کنه، وضعیتش در قسمت «شهریه‌ها»ی پنل شخصی نمایش داده می‌شه. درگاه پرداخت آنلاین فعلاً فعال نیست.',link:memberUrl,title:'پنل من'},
 {re:/زمان|ساعت|روز|تقویم|نوبت|برنامه کلاس|رزرو|کلاس/,text:'برای دیدن روز و ساعت کلاس‌ها و رزرو نوبت، وارد پنل ورزشکار شو و بخش «رزرو کلاس» رو انتخاب کن. ساعت‌های داخل سامانه باید توسط مدیریت باشگاه نهایی بشن.',link:memberUrl,title:'مشاهده کلاس‌ها'},
 {re:/بدنسازی|وزنه|قدرت|عضله|فرم.?دهی|حجم/,text:'بدنسازی برای تقویت عضلات، افزایش قدرت و فرم‌دهی مناسبه. شروع با وزنه و شدت مناسب، یادگیری تکنیک صحیح و پیشرفت تدریجی مهم‌تر از سنگین‌زدن زودهنگامه.'},
 {re:/پیلاتس|تعادل|انعطاف|خشکی|کشش/,text:'پیلاتس روی کنترل حرکت، قدرت عضلات مرکزی، هماهنگی و انعطاف تمرکز داره. برای شروع، کلاس مقدماتی و آموزش فرم درست انتخاب خوبیه.'},
 {re:/ایروبیک|هوازی|ریتم|استقامت|انرژی/,text:'ایروبیک تمرین هوازی و ریتمیکه که می‌تونه به استقامت و افزایش فعالیت روزانه کمک کنه. شدت رو متناسب با آمادگی بدنی خودت تنظیم کن.'},
 {re:/TRX|trx|بند|معلق/,text:'TRX تمرین مقاومتی با بندهای معلقه. شدت حرکت با زاویه بدن تغییر می‌کنه؛ بهتره جلسه اول زیر نظر مربی انجام بشه.'},
 {re:/وزن|چربی|دور کمر|نمودار|اندازه|پیشرفت|گزارش/,text:'در پنل ورزشکار، قسمت «مسیر پیشرفت» نمودار وزن، درصد چربی، دور کمر و شاخص عملکرد رو نشون می‌ده؛ البته بعد از این‌که مربی اندازه‌گیری‌های واقعی رو ثبت کنه.',link:memberUrl,title:'دیدن پیشرفت'},
 {re:/ورزش مناسب|چه رشته|کدوم رشته|انتخاب رشته|مناسب من|هدف/,text:'اگر هدف اصلی‌ات قدرت و فرم‌دهیه، بدنسازی؛ برای تعادل و انعطاف، پیلاتس؛ برای هوازی و ریتم، ایروبیک؛ و برای قدرت عملکردی با وزن بدن، TRX رو بررسی کن. در بخش «از کجا شروع کنم؟» هم می‌تونی هدفت رو انتخاب کنی.'},
 {re:/تغذیه|رژیم|غذا|پروتئین|کالری/,text:'برای تمرین بهتر، وعده‌های متعادل، آب کافی و استراحت مناسب اهمیت دارن. برنامه تغذیه فردی یا مکمل رو بدون شناخت شرایط پزشکی و نظر متخصص پیشنهاد نمی‌کنم.'},
 {re:/درد|آسیب|مصدوم|بیمار|باردار|سرگیجه|قلب|نفس/,text:'اگر هنگام تمرین درد غیرعادی، سرگیجه، تنگی نفس یا علائم نگران‌کننده داری، تمرین رو متوقف کن و در صورت شدیدبودن علائم فوراً کمک پزشکی بگیر. برای برنامه ورزشی با شرایط خاص باید از پزشک و مربی متخصص راهنمایی بگیری.'},
 {re:/سلام|درود|خوبی|کی هستی|اسم/,text:'سلام قهرمان 💜 من آوا، راهنمای مجازی UGYM هستم. می‌تونم درباره رشته‌ها، رزرو کلاس، ثبت‌نام، شهریه و پنل شخصی راهنماییت کنم.'}
];
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const inSafari=()=>/safari/i.test(navigator.userAgent)&&!/crios|fxios|edgios|optios|duckduckgo|gsa|instagram|telegram|fbav|fban|chatgpt/i.test(navigator.userAgent);
const installButton=$('install-shortcut');
if(isIOS())installButton.innerHTML='راهنمای نصب آیفون <span>↗</span>';
function stepLine(n,text){const row=document.createElement('div');row.className='ios-install-step';const num=document.createElement('b');num.textContent=n;const content=document.createElement('span');content.textContent=text;row.append(num,content);return row;}
function installHelp(){
 const box=$('install-steps');box.replaceChildren();
 if(isStandalone()){box.append(stepLine('✓','UGYM هم‌اکنون مانند یک برنامه از صفحه اصلی گوشی باز شده است.'));}
 else if(isIOS()){
  if(!inSafari()){box.append(stepLine('۱','الان داخل مرورگر داخلی یک برنامه هستی. گزینه Open in Safari را از منوی مرورگر انتخاب کن؛ یا آدرس سایت را کپی و داخل Safari باز کن.'));}
  else{box.append(stepLine('۱','خود Safari باز است؛ روی دکمه اشتراک‌گذاری (مربع با فلش رو به بالا) یا Page Menu ← Share بزن.'));}
  box.append(stepLine('۲','در Safari، داخل منوی Share روی Add to Home Screen / افزودن به صفحه اصلی بزن. اگر آن را نمی‌بینی، آخر فهرست گزینه Edit Actions را باز کن.'));
  box.append(stepLine('۳','گزینه Open as Web App را روشن کن و Add را بزن. آیکون UGYM روی صفحه اصلی آیفون اضافه می‌شود.'));
  const copy=document.createElement('button');copy.type='button';copy.className='install-copy-url';copy.textContent='کپی آدرس برای بازکردن در Safari';
  copy.addEventListener('click',async()=>{
   const url='https://ugym-official-app-2026.onrender.com/';
   let success=false;try{await navigator.clipboard.writeText(url);success=true;}catch{}
   if(!success){const field=document.createElement('textarea');field.value=url;field.style.cssText='position:fixed;left:-9999px;opacity:0';document.body.append(field);field.select();try{success=document.execCommand('copy')}catch{}field.remove();}
   copy.textContent=success?'آدرس کپی شد؛ Safari را باز کن ✓':'کپی نشد؛ آدرس سایت را از نوار بالای صفحه کپی کن';
  });
  box.append(copy);
  const portalNote=document.createElement('p');portalNote.className='install-portal-note';portalNote.textContent='برای نصب پنل کامل ورزشکار یا مدیریت، لازم است صفحه ورود همان پنل را هم در Safari باز کنی و آن را به صفحه اصلی اضافه کنی. چون سایت معرفی و پنل روی دو آدرس جدا هستند.';
  const portalLink=document.createElement('a');portalLink.className='install-copy-url';portalLink.href='https://ugym-fitness-club-2026.onrender.com/login';portalLink.textContent='باز کردن پنل UGYM برای نصب ↗';portalLink.style.display='block';portalLink.style.textAlign='center';portalLink.style.textDecoration='none';
  box.append(portalNote,portalLink);
 }else if(/android/i.test(navigator.userAgent)){
  box.append(stepLine('۱','این آدرس را در Chrome باز کن.'));
  box.append(stepLine('۲','از منوی سه‌نقطه مرورگر، Install app یا Add to Home screen را انتخاب کن.'));
  box.append(stepLine('۳','روی Install یا Add بزن تا آیکون UGYM اضافه شود.'));
 }else{
  box.append(stepLine('۱','سایت را در Chrome یا Edge باز کن.'));
  box.append(stepLine('۲','از منوی مرورگر Install app یا نصب برنامه را انتخاب کن.'));
 }
 $('install-modal').hidden=false;
}
async function install(){
 if(isIOS()||isStandalone()){installHelp();return;}
 if(installPrompt){
  const p=installPrompt;installPrompt=null;await p.prompt();
  try{const x=await p.userChoice;if(x.outcome==='accepted')$('install-strip').hidden=true;}catch{}
 }else installHelp();
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('appinstalled',()=>{$('install-strip').hidden=true;installPrompt=null;});
installButton.addEventListener('click',install);
$('install-modal-close').addEventListener('click',()=>{$('install-modal').hidden=true});
$('install-understood').addEventListener('click',()=>{$('install-modal').hidden=true});
$('install-modal').addEventListener('click',e=>{if(e.target===$('install-modal'))$('install-modal').hidden=true});
$('install-dismiss').addEventListener('click',()=>{$('install-strip').hidden=true;try{sessionStorage.setItem('ugym_install_dismiss','1')}catch{}});
try{if(sessionStorage.getItem('ugym_install_dismiss')==='1')$('install-strip').hidden=true;}catch{}
const head=$('site-header');
const headScroll=()=>head.classList.toggle('is-sticky',window.scrollY>75);
window.addEventListener('scroll',headScroll,{passive:true});headScroll();
if(!reduce&&'IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}},{threshold:.10,rootMargin:'0px 0px 60px 0px'});
 document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
if(!reduce&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){
 document.querySelectorAll('.sport-tile').forEach(el=>{
  let raf=0;el.addEventListener('mousemove',ev=>{cancelAnimationFrame(raf);const r=el.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;raf=requestAnimationFrame(()=>{el.style.transform='rotateY('+(-x*7)+'deg) rotateX('+(y*7)+'deg) translateY(-6px)'})});
  el.addEventListener('mouseleave',()=>{cancelAnimationFrame(raf);el.style.transform='';});
 });
}
const goals={
 shape:['بدنسازی','برای تمرکز روی قدرت و فرم‌دهی عضلات.'],
 flex:['پیلاتس','برای تعادل، کنترل حرکت و انعطاف.'],
 cardio:['ایروبیک','برای فعالیت هوازی، ریتم و استقامت.'],
 functional:['TRX','برای کنترل بدن و تقویت قدرت عملکردی.']
};
document.querySelectorAll('[data-goal]').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('[data-goal]').forEach(x=>x.classList.toggle('active',x===btn));
 const [name,desc]=goals[btn.dataset.goal]||goals.shape;
 $('goal-name').textContent=name;$('goal-copy').textContent=desc;
 $('goal-link').setAttribute('href',registerUrl);
}));
function addBubble(text,who){
 const node=document.createElement('div');node.className='bubble '+(who==='user'?'from-user':'from-guide');node.textContent=text;
 $('widget-thread').append(node);$('widget-thread').scrollTop=$('widget-thread').scrollHeight;
}
function addActionLink(url,title){
 const a=document.createElement('a');a.href=url;a.textContent=title+' ←';a.className='coach-action';
 a.style.cssText='align-self:flex-start;font-size:11px;font-weight:700;color:#d8aaf9;padding:7px 13px;border:1px solid #806193;border-radius:9px;background:#2b2139;';
 $('widget-thread').append(a);$('widget-thread').scrollTop=$('widget-thread').scrollHeight;
}
function answer(raw){
 const q=String(raw||'').trim().slice(0,400);
 if(!q)return;
 addBubble(q,'user');
 const item=answers.find(x=>x.re.test(q))||{text:'سؤال خوبی پرسیدی 💜 من فعلاً می‌تونم در موضوع رشته‌ها، عضویت، کلاس‌ها، شهریه و نمودار پیشرفت راهنمایی عمومی بدم. برای پاسخ دقیق به سؤال‌های شخصی یا شرایط باشگاه، لطفاً با مدیریت هماهنگ کن.'};
 setTimeout(()=>{addBubble(item.text,'guide');if(item.link)addActionLink(item.link,item.title)},200);
}
const coach=$('coach-widget');
function openCoach(){coach.hidden=false;$('coach-fab').hidden=true;$('coach-question').focus();}
function closeCoach(){coach.hidden=true;$('coach-fab').hidden=false;}
document.querySelectorAll('[data-open-coach]').forEach(el=>el.addEventListener('click',openCoach));
$('open-guide').addEventListener('click',openCoach);
$('coach-close').addEventListener('click',closeCoach);
$('coach-form').addEventListener('submit',e=>{e.preventDefault();const input=$('coach-question');answer(input.value);input.value='';});
document.querySelectorAll('[data-faq]').forEach(btn=>btn.addEventListener('click',()=>{openCoach();answer(btn.dataset.faq);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCoach();$('install-modal').hidden=true}});
if('serviceWorker' in navigator){
 let alreadyNotified=false;
 function notifyUpgrade(){
  if(alreadyNotified)return;alreadyNotified=true;
  const bar=document.createElement('div');bar.className='ug-update-banner';
  const title=document.createElement('span');title.textContent='✦ نسخه تازه UGYM آماده است';
  const button=document.createElement('button');button.type='button';button.textContent='به‌روزرسانی ↻';button.addEventListener('click',()=>location.reload());
  bar.append(title,button);document.body.append(bar);
 }
 navigator.serviceWorker.addEventListener('controllerchange',notifyUpgrade);
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').then(reg=>reg.update()).catch(()=>{}));
}

const dailyTips=['کیفیت حرکت از تعداد تکرارها مهم‌تره.','آب کافی و ریکاوری مناسب بخش مهمی از تمرین هستند.','پیشرفت رو در طول چند هفته مقایسه کن، نه یک روز.','حرکات رو با تمرکز روی فرم درست انجام بده.','به بدن خودت گوش بده و شدت رو تدریجی بالا ببر.','پیش از تمرین بدن رو آماده کن؛ بعدش به ریکاوری اهمیت بده.','ثبات در تمرین از عجله برای نتیجه بهتره.'];
const tip=$('ug-daily-tip');if(tip)tip.textContent=dailyTips[Math.floor((Date.now()+12600000)/86400000)%dailyTips.length];
const publicCard=$('public-card'),publicHolder=$('public-cardholder'),copyCard=$('public-card-copy'),publicWa=$('public-whatsapp');
let cardNumber='5894631136176906',whatsapp='09171508927';
function renderPublicPay(){
 if(publicCard)publicCard.textContent=cardNumber.replace(/(.{4})/g,'$1 ').trim();
 if(publicWa&&/^09\d{9}$/.test(whatsapp))publicWa.href='https://wa.me/98'+whatsapp.slice(1)+'?text='+encodeURIComponent('سلام، می‌خواهم رسید پرداخت شهریه UGYM را جهت بررسی برای شما بفرستم.');
}
renderPublicPay();
copyCard?.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(cardNumber);copyCard.textContent='شماره کارت کپی شد ✓';}
 catch{window.prompt('شماره کارت را از این کادر کپی کن',cardNumber);}
});
(async()=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const res=await fetch('https://ugym-fitness-club-2026.onrender.com/api/public/payment-info',{credentials:'omit',cache:'no-store',signal:controller.signal});
  if(!res.ok)return;
  const data=await res.json(),p=data.payment;if(!p)return;
  if(/^\d{16}$/.test(p.card_number))cardNumber=p.card_number;
  if(/^09\d{9}$/.test(p.whatsapp))whatsapp=p.whatsapp;
  if(publicHolder&&p.card_holder)publicHolder.textContent=String(p.card_holder).slice(0,100);
  renderPublicPay();
 }catch{}finally{clearTimeout(timer)}
})();


/* Keep visitors inside branded UGYM UI until the Free backend wakes up. */
const backendOrigin='https://ugym-fitness-club-2026.onrender.com';
let navigating=false;
function createOpenOverlay(target){
 const el=document.createElement('div');el.className='ug-ready-overlay';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const content=document.createElement('div');content.className='ug-ready-content';
 const mark=document.createElement('img');mark.src='/logo.svg';mark.alt='UGYM';mark.width=80;mark.height=80;
 const spin=document.createElement('span');spin.className='ug-ready-spinner';spin.setAttribute('aria-hidden','true');
 const title=document.createElement('h2');title.textContent='در حال آماده‌سازی پنل UGYM';
 const explain=document.createElement('p');explain.textContent='درخواست اتصال به اطلاعات باشگاه در حال بررسی است.';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='ug-ready-cancel';cancel.textContent='بازگشت به سایت';cancel.onclick=()=>{navigating=false;el.remove();};
 content.append(mark,spin,title,explain,cancel);el.append(content);document.body.append(el);
 return {el,explain,content};
}
async function checkBackend(){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
 try{const r=await fetch(backendOrigin+'/api/health',{mode:'cors',credentials:'omit',cache:'no-store',signal:ctrl.signal});if(!r.ok)return false;const j=await r.json();return j.ok===true;}
 catch{return false;}finally{clearTimeout(timer);}
}
document.querySelectorAll('a[href^="'+backendOrigin+'"]').forEach(a=>a.addEventListener('click',async e=>{
 if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0||navigating)return;
 e.preventDefault();navigating=true;
 const target=a.href,ui=createOpenOverlay(target);
 const deadline=Date.now()+96000;
 let live=false;
 while(navigating&&Date.now()<deadline){
  if(await checkBackend()){live=true;break;}
  if(Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,2400));
 }
 if(!navigating)return;
 if(live){ui.explain.textContent='اتصال برقرار شد. در حال ورود به پنل...';window.location.assign(target);return;}
 ui.explain.textContent='سرور رایگان هنوز آماده نشده است. می‌توانی مجدداً امتحان کنی یا مستقیم وارد شوی.';
 const direct=document.createElement('a');direct.href=target;direct.textContent='ورود مستقیم به پنل ↗';direct.className='ug-ready-direct';ui.content.append(direct);
 navigating=false;
}));

})();