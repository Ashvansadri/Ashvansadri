'use strict';
(()=>{
 const type=document.body.dataset.destination==='admin'?'admin':'member';
 const target='https://ugym-fitness-club-2026.onrender.com/'+type;
 const health='https://ugym-fitness-club-2026.onrender.com/api/health';
 const status=document.getElementById('status'),detail=document.getElementById('detail');
 const progress=document.getElementById('progress');
 const retry=document.getElementById('retry'),direct=document.getElementById('direct');
 direct.href=target;
 let round=0,running=false,stop=false;
 async function probe(){
  const controller=new AbortController();
  const tm=setTimeout(()=>controller.abort(),9000);
  try{
   const r=await fetch(health,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
   if(!r.ok)return false;
   const content=await r.json();return content.ok===true;
  }catch{return false}finally{clearTimeout(tm)}
 }
 async function start(){
  if(running)return;
  running=true;stop=false;round=0;retry.hidden=true;direct.hidden=true;
  const limit=25;
  while(round<limit&&!stop){
   round++;
   status.textContent=round===1?'در حال بررسی سامانه...':'در حال آماده‌کردن پنل باشگاه...';
   detail.textContent='ارتباط با سرور برقرار می‌شود؛ اطلاعات حساب شما امن باقی می‌ماند.';
   progress.style.width=Math.min(94,8+round*3.4)+'%';
   const ok=await probe();
   if(stop)return;
   if(ok){
    status.textContent='سامانه آماده است؛ در حال ورود...';
    progress.style.width='100%';
    location.replace(target);
    return;
   }
   await new Promise(resolve=>setTimeout(resolve,2400));
  }
  running=false;
  status.textContent='سامانه هنوز آماده پاسخ‌گویی نیست';
  detail.textContent='ممکن است سرور رایگان موقتاً غیرفعال یا با مشکل شبکه مواجه شده باشد. می‌توانی مجدد امتحان کنی.';
  retry.hidden=false;direct.hidden=false;
 }
 retry.addEventListener('click',start);
 window.addEventListener('pagehide',()=>{stop=true});
 start();
})();