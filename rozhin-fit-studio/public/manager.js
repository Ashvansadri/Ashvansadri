'use strict';
import { createClient } from '@neondatabase/neon-js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={new:'ثبت‌شده',review:'در حال بررسی',measurement:'نیاز به اندازه‌گیری',pattern:'تهیه الگو',consultation:'هماهنگی',sewing:'در حال دوخت',complete:'تکمیل‌شده',cancelled:'لغوشده'};
function toast(s){let b=$('#toast');b.style.display='block';b.textContent=s;setTimeout(()=>b.style.display='none',4400)}
const rzDb=createClient({auth:{url:'https://ep-curly-pond-b4035gvb.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth',allowAnonymous:true},dataApi:{url:'https://ep-curly-pond-b4035gvb.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1'}});
async function api(path,body=null){
 if(path==='/api/admin/login'){
 const email=$('#email').value.trim(),password=body?.password||'';
 const a=await rzDb.auth.signIn.email({email,password});
 if(a.error)throw Error(a.error.message||'ورود ناموفق بود');
 const {data,error}=await rzDb.rpc('rz_fit_is_admin',{});
 if(error||!data){await rzDb.auth.signOut();throw Error('این حساب، دسترسی مدیریت مزون ندارد.')}
 return {ok:true};
 }
 if(path==='/api/admin/logout'){await rzDb.auth.signOut();return {ok:true}}
 const table={
 '/api/admin/requests':['rz_fit_admin_requests',{}],
 '/api/admin/garments':['rz_fit_admin_catalog',{}],
 '/api/admin/status':['rz_fit_admin_status',{p_id:body?.id,p_status:body?.status,p_note:body?.admin_note||''}],
 '/api/admin/toggle':['rz_fit_admin_toggle',{p_id:body?.id,p_active:body?.is_active===true}],
 '/api/admin/new_garment':['rz_fit_admin_add',{p_data:body}]
 };
 const entry=table[path];
 if(!entry)throw Error('مسیر مدیریت موجود نیست');
 const {data,error}=await rzDb.rpc(entry[0],entry[1]);
 if(error)throw Error(error.message||'دسترسی مدیریت لازم است');
 return data;
}
function showDashboard(){ $('#loginBox').classList.add('hidden');$('#dashboard').classList.remove('hidden')}
function showLogin(){ $('#loginBox').classList.remove('hidden');$('#dashboard').classList.add('hidden')}
function opt(st){return Object.entries(statuses).map(([k,v])=>'<option value="'+k+'" '+(k===st?'selected':'')+'>'+v+'</option>').join('')}
function showRequests(items){$('#stats').innerHTML='<span class="adminStat">کل درخواست‌ها <b>'+items.length+'</b></span><span class="adminStat">جدید <b>'+items.filter(x=>x.status==='new').length+'</b></span><span class="adminStat">در حال بررسی <b>'+items.filter(x=>['review','measurement','pattern'].includes(x.status)).length+'</b></span>';
$('#requestRows').innerHTML=items.length?items.map(x=>{const ms=Object.entries(x.measurements||{}).filter(([k,v])=>typeof v==='number'&&v>0).map(([k,v])=>e(k)+':'+e(v)).join('، ');const im=x.design_image&&/^data:image\//.test(x.design_image)?'<img class="previewthumb" src="'+x.design_image+'" alt="طرح مشتری">':'—';return '<tr data-id="'+e(x.id)+'"><td><b>'+e(x.reference)+'</b></td><td>'+e(x.customer_name)+'<br><span class="subtle">'+e(x.phone)+'</span></td><td><b>'+e(x.garment_title||'طرح اختصاصی')+'</b><div style="max-width:260px;color:#a99b8b">'+e(ms)+'</div><details><summary>توضیحات</summary><p>'+e(x.notes||'ندارد')+'</p></details></td><td>'+im+'</td><td>'+new Date(x.created_at).toLocaleDateString('fa-IR')+'</td><td><select class="st">'+opt(x.status)+'</select><input class="adminNote" placeholder="یادداشت داخلی" value="'+e(x.admin_note||'')+'" maxlength="500"><button class="saveSt" type="button">ذخیره</button></td></tr>'}).join(''):'<tr><td colspan="6">هنوز درخواستی ثبت نشده است.</td></tr>';
$$('.saveSt').forEach(b=>b.onclick=async()=>{let row=b.closest('tr');try{await api('/api/admin/status',{id:row.dataset.id,status:row.querySelector('.st').value,admin_note:row.querySelector('.adminNote').value});toast('وضعیت ذخیره شد');}catch(er){toast(er.message)}})
}
async function loadRequests(){try{let d=await api('/api/admin/requests');showDashboard();showRequests(d.requests)}catch(er){if(/وارد/.test(er.message))showLogin();else toast(er.message)}}
function showGarments(items){$('#garmentRows').innerHTML=items.length?items.map(x=>'<tr data-id="'+e(x.id)+'"><td>'+(x.image_data&&/^data:image\//.test(x.image_data)?'<img class="previewthumb" src="'+x.image_data+'">':'—')+'</td><td>'+e(x.title)+'</td><td>'+e(x.category)+'</td><td>'+new Date(x.created_at).toLocaleDateString('fa-IR')+'</td><td><button class="toggle" data-active="'+(x.is_active?'1':'0')+'">'+(x.is_active?'فعال':'غیرفعال')+'</button></td></tr>').join(''):'<tr><td colspan="5">هنوز مدلی ثبت نشده است.</td></tr>';$$('.toggle').forEach(b=>b.onclick=async()=>{let id=b.closest('tr').dataset.id;try{await api('/api/admin/toggle',{id,is_active:b.dataset.active!=='1'});toast('وضعیت نمایش به‌روزرسانی شد');await loadGarments()}catch(er){toast(er.message)}})}
async function loadGarments(){try{let d=await api('/api/admin/garments');showGarments(d.catalog)}catch(er){toast(er.message)}}
$('#loginForm').onsubmit=async ev=>{ev.preventDefault();let pwd=$('#password').value;try{await api('/api/admin/login',{password:pwd});$('#password').value='';showDashboard();await loadRequests()}catch(er){toast(er.message)}};
$('#logout').onclick=async()=>{await api('/api/admin/logout',{});showLogin()};
$('#refresh').onclick=loadRequests;
$$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-pane]').forEach(x=>x.classList.toggle('hidden',x.dataset.pane!==b.dataset.tab));if(b.dataset.tab==='garments')loadGarments();else loadRequests()});
async function compress(file){if(!file)throw Error('عکس لباس را انتخاب کنید.');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('عکس JPG/PNG/WEBP تا ۸ مگابایت قابل قبول است.');let url=URL.createObjectURL(file);try{let img=await new Promise((ok,fail)=>{let i=new Image();i.onload=()=>ok(i);i.onerror=()=>fail(Error('بارگذاری عکس ناموفق'));i.src=url});let c=document.createElement('canvas'),ratio=Math.min(1,1000/Math.max(img.width,img.height));c.width=Math.round(img.width*ratio);c.height=Math.round(img.height*ratio);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.73)}finally{URL.revokeObjectURL(url)}}
$('#garmentForm').onsubmit=async ev=>{ev.preventDefault();let btn=$('#gSubmit');btn.disabled=true;try{let pic=await compress($('#gImage').files[0]);await api('/api/admin/new_garment',{title:$('#gTitle').value,category:$('#gCategory').value,description:$('#gDescription').value,image_data:pic,is_featured:$('#gFeatured').checked});toast('لباس به گالری اضافه شد');ev.target.reset();await loadGarments()}catch(er){toast(er.message)}finally{btn.disabled=false}};
loadRequests();