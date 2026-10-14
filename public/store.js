const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Number(n||0).toLocaleString('fa-IR');
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
let settings={store_name:'فروشگاه صالحی',currency:'تومان',shipping_fee:'0'},products=[],cart=JSON.parse(localStorage.getItem('salehi_cart')||'[]'),activeCat='',searchTerm='';

async function api(url,opt={}){
  const r=await fetch(url,{headers:{'Content-Type':'application/json'},...opt});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'خطا در ارتباط با فروشگاه');
  return d;
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function saveCart(){localStorage.setItem('salehi_cart',JSON.stringify(cart));drawCart()}
function kind(p){return p.category_name==='دخترانه'?'girl':p.category_name==='پسرانه'?'boy':'baby'}
function palette(p){
  const maps={
    girl:[['#e99aab','#b9677a'],['#c9a6d9','#8e70a3'],['#efc1c8','#d47d91']],
    boy:[['#89a890','#597260'],['#739fc6','#4f718e'],['#9aa4ad','#626d75']],
    baby:[['#a9cbd7','#789aa7'],['#c7d9c9','#829e86'],['#efc2ae','#c58c75']]
  };
  const a=maps[kind(p)],i=Number(p.id||0)%a.length;return a[i]
}
function art(p,large=false){
  const [c1,c2]=palette(p),cls=kind(p)==='girl'?'dress':kind(p)==='boy'?'set':'onesie';
  return '<div class="vector-outfit '+cls+'" style="--c1:'+c1+';--c2:'+c2+(large?';transform:scale(1.35)':'')+'"><span class="top"></span><span class="bottom"></span></div>';
}
function availableVariants(p){return (p.variants||[]).filter(v=>Number(v.stock)>0)}
function unique(arr){return [...new Set(arr)]}
function priceHtml(p){const sale=Number(p.compare_price||0)>Number(p.sell_price);return '<div class="price"><b>'+fmt(p.sell_price)+' '+esc(settings.currency||'تومان')+'</b>'+(sale?'<del>'+fmt(p.compare_price)+'</del>':'')+'</div>'}

function renderProducts(){
  const q=searchTerm.trim().toLowerCase();
  const filtered=products.filter(p=>(!activeCat||p.category_name===activeCat)&&(!q||p.name.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)));
  $('#productGrid').innerHTML=filtered.length?filtered.map(p=>{
    const vars=availableVariants(p),colors=unique(vars.map(v=>v.color)).slice(0,3);
    return '<article class="product-card '+kind(p)+'" data-id="'+p.id+'"><div class="product-media"><div class="badge-row">'+(p.is_new?'<span class="badge">جدید</span>':'')+(Number(p.compare_price||0)>Number(p.sell_price)?'<span class="badge sale">ویژه</span>':'')+'</div>'+art(p)+'</div><div class="product-info"><span class="cat">'+esc(p.category_name||'پوشاک')+'</span><h3>'+esc(p.name)+'</h3>'+priceHtml(p)+'<div class="swatches">'+colors.map(c=>'<span class="swatch">'+esc(c)+'</span>').join('')+'</div></div></article>'
  }).join(''):'<div class="empty">محصولی با این فیلتر پیدا نشد.</div>';
  $$('.product-card').forEach(el=>el.onclick=()=>openProduct(Number(el.dataset.id)))
}
function setFilter(cat){
  activeCat=cat;
  $$('.filter').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
  document.querySelector('#new').scrollIntoView({behavior:'smooth',block:'start'});
  renderProducts()
}
function openProduct(id){
  const p=products.find(x=>Number(x.id)===Number(id));if(!p)return;
  const vars=availableVariants(p),colors=unique(vars.map(v=>v.color)),sizes=unique(vars.map(v=>v.size));
  const defaultV=vars[0];
  $('#productModal').innerHTML='<div class="modal"><div class="modal-head"><div><span class="eyebrow">PRODUCT DETAIL</span><h3>جزئیات محصول</h3></div><button class="close" data-close>×</button></div><div class="product-detail"><div class="detail-art '+kind(p)+'">'+art(p,true)+'</div><div class="detail-copy"><span class="eyebrow">'+esc(p.category_name||'پوشاک')+'</span><h2>'+esc(p.name)+'</h2>'+priceHtml(p)+'<p>'+esc(p.description||'محصول منتخب فروشگاه با امکان انتخاب رنگ و سایز موجود.')+'</p><div class="option-title">رنگ</div><div id="colorOpts" class="option-grid">'+colors.map((c,i)=>'<button class="option '+(i===0?'active':'')+'" data-color="'+esc(c)+'">'+esc(c)+'</button>').join('')+'</div><div class="option-title">سایز</div><div id="sizeOpts" class="option-grid">'+sizes.map((s,i)=>'<button class="option '+(i===0?'active':'')+'" data-size="'+esc(s)+'">'+esc(s)+'</button>').join('')+'</div><div id="stockHint" class="status-line">موجودی این انتخاب: '+fmt(defaultV?.stock||0)+' عدد</div><div class="detail-buy"><input id="detailQty" type="number" min="1" value="1"><button id="addDetail" class="primary">افزودن به سبد</button></div></div></div></div>';
  $('#productModal').classList.remove('hidden');
  let color=colors[0],size=sizes[0];
  const sync=()=>{
    $('#colorOpts').querySelectorAll('.option').forEach(b=>b.classList.toggle('active',b.dataset.color===color));
    $('#sizeOpts').querySelectorAll('.option').forEach(b=>b.classList.toggle('active',b.dataset.size===size));
    let v=vars.find(x=>x.color===color&&x.size===size);
    if(!v){
      v=vars.find(x=>x.color===color)||vars.find(x=>x.size===size)||vars[0];
      if(v){color=v.color;size=v.size}
    }
    $('#stockHint').textContent=v?'موجودی این انتخاب: '+fmt(v.stock)+' عدد':'این ترکیب فعلاً موجود نیست';
    return v
  };
  $('#colorOpts').querySelectorAll('.option').forEach(b=>b.onclick=()=>{color=b.dataset.color;sync()});
  $('#sizeOpts').querySelectorAll('.option').forEach(b=>b.onclick=()=>{size=b.dataset.size;sync()});
  $('#addDetail').onclick=()=>{const v=sync();if(!v)return toast('این رنگ و سایز موجود نیست');addToCart(p,v,Math.max(1,Number($('#detailQty').value||1)));closeOverlay('#productModal')};
  $('#productModal [data-close]').onclick=()=>closeOverlay('#productModal')
}
function closeOverlay(sel){$(sel).classList.add('hidden');$(sel).innerHTML=''}

function addToCart(p,v,qty){
  const ex=cart.find(x=>x.variant_id===v.id);
  if(ex)ex.qty=Math.min(Number(v.stock),ex.qty+qty);
  else cart.push({variant_id:v.id,product_id:p.id,name:p.name,color:v.color,size:v.size,price:Number(p.sell_price),qty:Math.min(qty,Number(v.stock)),stock:Number(v.stock),kind:kind(p)});
  saveCart();toast('به سبد خرید اضافه شد')
}
function drawCart(){
  const count=cart.reduce((a,x)=>a+x.qty,0),sub=cart.reduce((a,x)=>a+x.price*x.qty,0),ship=Math.max(0,Number(settings.shipping_fee||0)),total=sub+(cart.length?ship:0);
  $('#cartCount').textContent=fmt(count);
  $('#cartSubtotal').textContent=fmt(sub)+' تومان';
  $('#shippingText').textContent=ship?fmt(ship)+' تومان':'رایگان';
  $('#cartTotal').textContent=fmt(total)+' تومان';
  $('#cartItems').innerHTML=cart.length?cart.map((x,i)=>'<div class="cart-item"><div class="cart-thumb">'+(x.kind==='girl'?'👗':x.kind==='boy'?'👕':'🧸')+'</div><div><h4>'+esc(x.name)+'</h4><p>'+esc(x.color)+' • '+esc(x.size)+'</p><div class="qty-row"><button data-minus="'+i+'">−</button><span>'+fmt(x.qty)+'</span><button data-plus="'+i+'">+</button><button data-remove="'+i+'" style="margin-right:6px;width:auto;padding:0 7px">حذف</button></div></div><div class="cart-line">'+fmt(x.price*x.qty)+'</div></div>').join(''):'<div class="empty">سبد خریدت هنوز خالیه.</div>';
  $$('[data-minus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.minus);cart[i].qty--;if(cart[i].qty<=0)cart.splice(i,1);saveCart()});
  $$('[data-plus]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.plus);if(cart[i].qty<cart[i].stock)cart[i].qty++;else toast('بیشتر از موجودی قابل سفارش نیست');saveCart()});
  $$('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);saveCart()})
}
function openCart(){drawCart();$('#cartDrawer').classList.add('open');$('#scrim').classList.add('show')}
function closeCart(){$('#cartDrawer').classList.remove('open');$('#scrim').classList.remove('show')}

function checkout(){
  if(!cart.length)return toast('سبد خرید خالی است');
  closeCart();
  $('#productModal').innerHTML='<div class="modal small"><div class="modal-head"><div><span class="eyebrow">CHECKOUT</span><h3>ثبت سفارش</h3></div><button class="close" data-close>×</button></div><div class="form-grid"><div class="field"><label>نام و نام خانوادگی *</label><input id="coName"></div><div class="field"><label>شماره موبایل *</label><input id="coPhone" inputmode="tel"></div><div class="field"><label>شهر</label><input id="coCity"></div><div class="field full-field"><label>آدرس کامل *</label><textarea id="coAddress"></textarea></div><div class="field full-field"><label>توضیحات سفارش</label><textarea id="coNote" placeholder="مثلاً زمان مناسب تماس یا توضیح درباره سفارش"></textarea></div></div><div class="status-line">مبلغ نهایی سفارش: <b>'+$('#cartTotal').textContent+'</b></div><button id="placeOrder" class="primary full" style="margin-top:14px">ثبت نهایی سفارش</button></div>';
  $('#productModal').classList.remove('hidden');$('#productModal [data-close]').onclick=()=>closeOverlay('#productModal');
  $('#placeOrder').onclick=async()=>{
    const btn=$('#placeOrder');btn.disabled=true;btn.textContent='در حال ثبت…';
    try{
      const out=await api('/api/store/orders',{method:'POST',body:JSON.stringify({customer_name:$('#coName').value,phone:$('#coPhone').value,city:$('#coCity').value,address:$('#coAddress').value,note:$('#coNote').value,items:cart.map(x=>({variant_id:x.variant_id,qty:x.qty}))})});
      cart=[];saveCart();
      $('#productModal').innerHTML='<div class="modal small"><div class="success-box"><div class="success-icon">✓</div><h3>سفارش با موفقیت ثبت شد</h3><p>کد سفارش را نگه دار؛ برای پیگیری لازم می‌شود.</p><div class="order-code">'+esc(out.order_no)+'</div><p>مبلغ سفارش: <b>'+fmt(out.total)+' تومان</b></p><button class="primary full" id="doneOrder">خیلی خوب</button></div></div>';
      $('#doneOrder').onclick=()=>{closeOverlay('#productModal');location.reload()}
    }catch(e){toast(e.message);btn.disabled=false;btn.textContent='ثبت نهایی سفارش'}
  }
}
function trackOrder(){
  $('#trackModal').innerHTML='<div class="modal small"><div class="modal-head"><div><span class="eyebrow">ORDER TRACKING</span><h3>پیگیری سفارش</h3></div><button class="close" data-close>×</button></div><div class="form-grid"><div class="field"><label>کد سفارش</label><input id="trCode" placeholder="مثلاً ON-..."></div><div class="field"><label>شماره موبایل</label><input id="trPhone"></div></div><button id="trGo" class="primary full" style="margin-top:12px">بررسی وضعیت</button><div id="trOut"></div></div>';
  $('#trackModal').classList.remove('hidden');$('#trackModal [data-close]').onclick=()=>closeOverlay('#trackModal');
  $('#trGo').onclick=async()=>{
    try{
      const o=await api('/api/store/track',{method:'POST',body:JSON.stringify({order_no:$('#trCode').value,phone:$('#trPhone').value})});
      const map={new:'ثبت شده و منتظر بررسی',confirmed:'تأیید شده',preparing:'در حال آماده‌سازی',shipped:'ارسال شده',delivered:'تحویل شده',canceled:'لغو شده'};
      $('#trOut').innerHTML='<div class="status-line"><b>'+esc(map[o.status]||o.status)+'</b><br>مبلغ: '+fmt(o.total)+' تومان<br>ثبت: '+new Date(o.created_at).toLocaleString('fa-IR')+'</div>'
    }catch(e){$('#trOut').innerHTML='<div class="status-line" style="color:#a94e5f">'+esc(e.message)+'</div>'}
  }
}

async function init(){
  try{
    settings=await api('/api/store/settings');
    $('#storeName').textContent=settings.store_name||'فروشگاه صالحی';$('#footerName').textContent=settings.store_name||'فروشگاه صالحی';
    if(settings.store_tagline)$('#tagline').textContent=settings.store_tagline;
    products=await api('/api/store/products');
    renderProducts();drawCart()
  }catch(e){$('#productGrid').innerHTML='<div class="empty">'+esc(e.message)+'</div>'}
}
$('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#scrim').onclick=closeCart;$('#checkoutBtn').onclick=checkout;$('#trackBtn').onclick=trackOrder;$('#heroTrack').onclick=trackOrder;
$('#search').oninput=e=>{searchTerm=e.target.value;renderProducts()};
$$('.filter').forEach(b=>b.onclick=()=>setFilter(b.dataset.cat));
$$('.collection-card').forEach(b=>b.onclick=()=>setFilter(b.dataset.category));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();['#productModal','#trackModal'].forEach(s=>{if(!$(s).classList.contains('hidden'))closeOverlay(s)})}});
init();