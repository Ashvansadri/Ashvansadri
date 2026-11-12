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
function installHelp(){
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 const android=/android/i.test(navigator.userAgent);
 const text=isStandalone()?'UGYM هم‌اکنون مثل یک اپ روی دستگاه شما باز شده است.':ios
 ?'در Safari صفحه UGYM را باز کن؛ دکمه Share (اشتراک‌گذاری) را بزن و سپس «Add to Home Screen / افزودن به صفحه اصلی» را انتخاب کن. بعضی مرورگرهای داخلی اینستاگرام و تلگرام گزینه نصب ندارند.'
 :android?'در Chrome، منوی سه‌نقطه را بزن و «Install app / نصب برنامه» یا «Add to Home screen» را انتخاب کن. اگر گزینه نمایش داده نشد، صفحه را در Chrome باز کن.'
 :'در Chrome یا Edge، از منوی مرورگر «Install UGYM» یا «Install app» را انتخاب کن. اگر نصب در دسترس نبود، می‌توانی سایت را به نشانک‌های مرورگر اضافه کنی.';
 $('install-steps').textContent=text;$('install-modal').hidden=false;
}
async function install(){
 if(isStandalone()){installHelp();return}
 if(installPrompt){
  const p=installPrompt;installPrompt=null;await p.prompt();
  try{const x=await p.userChoice;if(x.outcome==='accepted')$('install-strip').hidden=true;}catch{}
 }else installHelp();
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('appinstalled',()=>{$('install-strip').hidden=true;installPrompt=null;});
$('install-shortcut').addEventListener('click',install);
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
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();