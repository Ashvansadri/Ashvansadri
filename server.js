import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 10000);
const SECRET = process.env.JWT_SECRET || 'change-me';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'true' ? {rejectUnauthorized:false} : false });
const q = (sql, params=[]) => pool.query(sql, params);
const money = v => Number(v || 0);
const clean = v => typeof v === 'string' ? v.trim() : v;

app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'2mb'}));
app.use(cookieParser());

async function initDb(){
  await q(
    'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT \\'owner\\',created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL);' +
    'CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY,sku TEXT UNIQUE NOT NULL,name TEXT NOT NULL,category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,buy_price NUMERIC(14,0) NOT NULL DEFAULT 0,sell_price NUMERIC(14,0) NOT NULL DEFAULT 0,image_url TEXT,active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS product_variants (id SERIAL PRIMARY KEY,product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,color TEXT NOT NULL DEFAULT \\'عمومی\\',size TEXT NOT NULL DEFAULT \\'عمومی\\',barcode TEXT UNIQUE,stock INTEGER NOT NULL DEFAULT 0,min_stock INTEGER NOT NULL DEFAULT 2,UNIQUE(product_id,color,size));' +
    'CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE,notes TEXT,vip BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY,name TEXT NOT NULL,phone TEXT,notes TEXT,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS supplier_transactions (id SERIAL PRIMARY KEY,supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,kind TEXT NOT NULL,amount NUMERIC(14,0) NOT NULL,note TEXT,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL DEFAULT \\'سایر\\',amount NUMERIC(14,0) NOT NULL,note TEXT,expense_date DATE NOT NULL DEFAULT CURRENT_DATE,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY,invoice_no TEXT UNIQUE NOT NULL,customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,subtotal NUMERIC(14,0) NOT NULL,discount NUMERIC(14,0) NOT NULL DEFAULT 0,net_total NUMERIC(14,0) NOT NULL,paid_amount NUMERIC(14,0) NOT NULL DEFAULT 0,payment_method TEXT NOT NULL DEFAULT \\'card\\',status TEXT NOT NULL DEFAULT \\'paid\\',note TEXT,created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS invoice_items (id SERIAL PRIMARY KEY,invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,variant_id INTEGER NOT NULL REFERENCES product_variants(id),qty INTEGER NOT NULL,unit_price NUMERIC(14,0) NOT NULL,buy_price_snapshot NUMERIC(14,0) NOT NULL DEFAULT 0,line_total NUMERIC(14,0) NOT NULL);' +
    'CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY,invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,amount NUMERIC(14,0) NOT NULL,method TEXT NOT NULL,note TEXT,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS stock_movements (id SERIAL PRIMARY KEY,variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,delta INTEGER NOT NULL,reason TEXT NOT NULL,reference_type TEXT,reference_id INTEGER,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS content_tasks (id SERIAL PRIMARY KEY,product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,title TEXT NOT NULL,channel TEXT NOT NULL DEFAULT \\'instagram\\',status TEXT NOT NULL DEFAULT \\'idea\\',caption TEXT,publish_date DATE,created_at TIMESTAMPTZ DEFAULT NOW());' +
    'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);' +
    'CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(created_at);'
  );
  const email=process.env.ADMIN_EMAIL || 'admin@salehi.local';
  const pass=process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const found=await q('SELECT id FROM users WHERE email=$1',[email]);
  if(!found.rowCount){
    const hash=await bcrypt.hash(pass,12);
    await q('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4)',['مدیر فروشگاه',email,hash,'owner']);
  }
  await q("INSERT INTO settings(key,value) VALUES ('store_name',$1),('brand_name','Retail OS'),('currency','تومان'),('theme','luxury') ON CONFLICT(key) DO NOTHING",[process.env.STORE_NAME||'فروشگاه صالحی']);
  for(const name of ['مانتو','شومیز','شلوار','ست','اکسسوری']) await q('INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[name]);
}
function auth(req,res,next){
  try{
    const token=req.cookies.auth;
    if(!token) return res.status(401).json({error:'نیاز به ورود دارید'});
    req.user=jwt.verify(token,SECRET); next();
  }catch{ return res.status(401).json({error:'نشست منقضی شده است'}); }
}
const invoiceNo=()=> 'S-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String(Date.now()).slice(-6);

app.get('/api/health',async(_req,res)=>{try{await q('SELECT 1');res.json({ok:true,service:'salehi-retail-os'})}catch(e){res.status(500).json({ok:false,error:e.message})}});
app.post('/api/login',async(req,res)=>{
  const r=await q('SELECT * FROM users WHERE email=$1',[clean(req.body.email||'')]);
  if(!r.rowCount || !(await bcrypt.compare(req.body.password||'',r.rows[0].password_hash))) return res.status(401).json({error:'ایمیل یا رمز عبور اشتباه است'});
  const u=r.rows[0], token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},SECRET,{expiresIn:'12h'});
  res.cookie('auth',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:43200000});
  res.json({user:{id:u.id,name:u.name,email:u.email,role:u.role}});
});
app.post('/api/logout',(_req,res)=>{res.clearCookie('auth');res.json({ok:true})});
app.get('/api/me',auth,(req,res)=>res.json({user:req.user}));

app.get('/api/settings',auth,async(_req,res)=>{const r=await q('SELECT key,value FROM settings');res.json(Object.fromEntries(r.rows.map(x=>[x.key,x.value])))});
app.put('/api/settings',auth,async(req,res)=>{for(const [k,v] of Object.entries(req.body||{})){if(['store_name','brand_name','currency','theme'].includes(k))await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[k,String(v)])}res.json({ok:true})});

app.get('/api/dashboard',auth,async(_req,res)=>{
  const today=(await q("SELECT COALESCE(SUM(net_total),0) sales,COUNT(*) orders FROM invoices WHERE created_at::date=CURRENT_DATE")).rows[0];
  const month=(await q("SELECT COALESCE(SUM(net_total),0) sales,COUNT(*) orders FROM invoices WHERE date_trunc('month',created_at)=date_trunc('month',CURRENT_DATE)")).rows[0];
  const inv=(await q('SELECT COALESCE(SUM(stock),0) units,COUNT(*) FILTER(WHERE stock<=min_stock) low_count FROM product_variants')).rows[0];
  const exp=(await q("SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE date_trunc('month',expense_date)=date_trunc('month',CURRENT_DATE)")).rows[0];
  const rec=(await q('SELECT COALESCE(SUM(net_total-paid_amount),0) total FROM invoices WHERE net_total>paid_amount')).rows[0];
  const profit=(await q("SELECT COALESCE(SUM((ii.unit_price-ii.buy_price_snapshot)*ii.qty),0) total FROM invoice_items ii JOIN invoices i ON i.id=ii.invoice_id WHERE i.created_at::date=CURRENT_DATE")).rows[0];
  const top=(await q("SELECT p.name,SUM(ii.qty)::int qty FROM invoice_items ii JOIN product_variants pv ON pv.id=ii.variant_id JOIN products p ON p.id=pv.product_id JOIN invoices i ON i.id=ii.invoice_id WHERE i.created_at>=NOW()-INTERVAL '30 days' GROUP BY p.id,p.name ORDER BY qty DESC LIMIT 5")).rows;
  const low=(await q('SELECT pv.id,p.name,pv.color,pv.size,pv.stock,pv.min_stock FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.active AND pv.stock<=pv.min_stock ORDER BY pv.stock LIMIT 8')).rows;
  res.json({today:{...today,gross_profit:profit.total},month,inventory:inv,expenses:exp,receivables:rec,top,low});
});

app.get('/api/categories',auth,async(_req,res)=>res.json((await q('SELECT * FROM categories ORDER BY name')).rows));
app.get('/api/products',auth,async(_req,res)=>{
  const r=await q("SELECT p.*,c.name category_name,COALESCE(json_agg(json_build_object('id',pv.id,'color',pv.color,'size',pv.size,'barcode',pv.barcode,'stock',pv.stock,'min_stock',pv.min_stock) ORDER BY pv.id) FILTER(WHERE pv.id IS NOT NULL),'[]') variants FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_variants pv ON pv.product_id=p.id GROUP BY p.id,c.name ORDER BY p.created_at DESC");
  res.json(r.rows);
});
app.post('/api/products',auth,async(req,res)=>{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const b=req.body, p=await client.query('INSERT INTO products(sku,name,category_id,buy_price,sell_price,image_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[clean(b.sku),clean(b.name),b.category_id||null,money(b.buy_price),money(b.sell_price),clean(b.image_url)||null]);
    const vars=Array.isArray(b.variants)&&b.variants.length?b.variants:[{color:'عمومی',size:'عمومی',stock:0,min_stock:2}];
    for(const v of vars){const x=await client.query('INSERT INTO product_variants(product_id,color,size,barcode,stock,min_stock) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[p.rows[0].id,clean(v.color)||'عمومی',clean(v.size)||'عمومی',clean(v.barcode)||null,Number(v.stock||0),Number(v.min_stock||2)]);if(Number(v.stock||0)!==0)await client.query('INSERT INTO stock_movements(variant_id,delta,reason,reference_type,reference_id) VALUES($1,$2,$3,$4,$5)',[x.rows[0].id,Number(v.stock||0),'موجودی اولیه','product',p.rows[0].id])}
    await client.query('COMMIT');res.status(201).json(p.rows[0]);
  }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.code==='23505'?'کد محصول یا بارکد تکراری است':e.message})}finally{client.release()}
});
app.post('/api/variants/:id/stock',auth,async(req,res)=>{
  const delta=Number(req.body.delta||0);if(!Number.isInteger(delta)||delta===0)return res.status(400).json({error:'تغییر موجودی نامعتبر است'});
  const client=await pool.connect();try{await client.query('BEGIN');const c=await client.query('SELECT stock FROM product_variants WHERE id=$1 FOR UPDATE',[req.params.id]);if(!c.rowCount)throw new Error('واریانت پیدا نشد');if(c.rows[0].stock+delta<0)throw new Error('موجودی نمی‌تواند منفی شود');const r=await client.query('UPDATE product_variants SET stock=stock+$1 WHERE id=$2 RETURNING *',[delta,req.params.id]);await client.query('INSERT INTO stock_movements(variant_id,delta,reason,reference_type) VALUES($1,$2,$3,$4)',[req.params.id,delta,clean(req.body.reason)||'اصلاح دستی','manual']);await client.query('COMMIT');res.json(r.rows[0])}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}
});

app.get('/api/customers',auth,async(_req,res)=>res.json((await q('SELECT c.*,COALESCE(SUM(i.net_total),0) total_buy,COUNT(i.id)::int orders FROM customers c LEFT JOIN invoices i ON i.customer_id=c.id GROUP BY c.id ORDER BY total_buy DESC,c.created_at DESC')).rows));
app.post('/api/customers',auth,async(req,res)=>{try{const r=await q('INSERT INTO customers(name,phone,notes,vip) VALUES($1,$2,$3,$4) RETURNING *',[clean(req.body.name),clean(req.body.phone)||null,clean(req.body.notes)||null,Boolean(req.body.vip)]);res.status(201).json(r.rows[0])}catch(e){res.status(400).json({error:e.code==='23505'?'این شماره قبلاً ثبت شده است':e.message})}});
app.get('/api/suppliers',auth,async(_req,res)=>res.json((await q("SELECT s.*,COALESCE(SUM(CASE WHEN st.kind='purchase' THEN st.amount WHEN st.kind='payment' THEN -st.amount ELSE st.amount END),0) balance FROM suppliers s LEFT JOIN supplier_transactions st ON st.supplier_id=s.id GROUP BY s.id ORDER BY s.created_at DESC")).rows));
app.post('/api/suppliers',auth,async(req,res)=>{const r=await q('INSERT INTO suppliers(name,phone,notes) VALUES($1,$2,$3) RETURNING *',[clean(req.body.name),clean(req.body.phone)||null,clean(req.body.notes)||null]);res.status(201).json(r.rows[0])});
app.post('/api/suppliers/:id/transactions',auth,async(req,res)=>{const r=await q('INSERT INTO supplier_transactions(supplier_id,kind,amount,note) VALUES($1,$2,$3,$4) RETURNING *',[req.params.id,req.body.kind,money(req.body.amount),clean(req.body.note)||null]);res.status(201).json(r.rows[0])});
app.get('/api/expenses',auth,async(_req,res)=>res.json((await q('SELECT * FROM expenses ORDER BY expense_date DESC,id DESC LIMIT 300')).rows));
app.post('/api/expenses',auth,async(req,res)=>{const r=await q('INSERT INTO expenses(title,category,amount,note,expense_date) VALUES($1,$2,$3,$4,COALESCE($5,CURRENT_DATE)) RETURNING *',[clean(req.body.title),clean(req.body.category)||'سایر',money(req.body.amount),clean(req.body.note)||null,req.body.expense_date||null]);res.status(201).json(r.rows[0])});

app.get('/api/invoices',auth,async(_req,res)=>res.json((await q("SELECT i.*,c.name customer_name FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id ORDER BY i.created_at DESC LIMIT 300")).rows));
app.post('/api/invoices',auth,async(req,res)=>{
  const items=Array.isArray(req.body.items)?req.body.items:[];if(!items.length)return res.status(400).json({error:'سبد خرید خالی است'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');let subtotal=0;const ready=[];
    for(const item of items){const r=await client.query('SELECT pv.*,p.name,p.sell_price,p.buy_price FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.id=$1 FOR UPDATE',[item.variant_id]);if(!r.rowCount)throw new Error('محصول پیدا نشد');const qty=Number(item.qty||1);if(r.rows[0].stock<qty)throw new Error('موجودی '+r.rows[0].name+' کافی نیست');const price=item.unit_price==null?money(r.rows[0].sell_price):money(item.unit_price);subtotal+=price*qty;ready.push({v:r.rows[0],qty,price})}
    const discount=Math.max(0,money(req.body.discount)), net=Math.max(0,subtotal-discount), paid=Math.min(net,Math.max(0,req.body.paid_amount==null?net:money(req.body.paid_amount))), status=paid>=net?'paid':paid>0?'partial':'unpaid';
    const inv=await client.query('INSERT INTO invoices(invoice_no,customer_id,subtotal,discount,net_total,paid_amount,payment_method,status,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[invoiceNo(),req.body.customer_id||null,subtotal,discount,net,paid,clean(req.body.payment_method)||'card',status,clean(req.body.note)||null,req.user.id]);
    for(const x of ready){await client.query('INSERT INTO invoice_items(invoice_id,variant_id,qty,unit_price,buy_price_snapshot,line_total) VALUES($1,$2,$3,$4,$5,$6)',[inv.rows[0].id,x.v.id,x.qty,x.price,money(x.v.buy_price),x.price*x.qty]);await client.query('UPDATE product_variants SET stock=stock-$1 WHERE id=$2',[x.qty,x.v.id]);await client.query('INSERT INTO stock_movements(variant_id,delta,reason,reference_type,reference_id) VALUES($1,$2,$3,$4,$5)',[x.v.id,-x.qty,'فروش','invoice',inv.rows[0].id])}
    if(paid>0)await client.query('INSERT INTO payments(invoice_id,amount,method,note) VALUES($1,$2,$3,$4)',[inv.rows[0].id,paid,clean(req.body.payment_method)||'card','پرداخت هنگام فروش']);
    await client.query('COMMIT');res.status(201).json(inv.rows[0]);
  }catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}
});
app.post('/api/invoices/:id/payment',auth,async(req,res)=>{
  const amount=money(req.body.amount),client=await pool.connect();if(amount<=0)return res.status(400).json({error:'مبلغ نامعتبر است'});
  try{await client.query('BEGIN');const r=await client.query('SELECT * FROM invoices WHERE id=$1 FOR UPDATE',[req.params.id]);if(!r.rowCount)throw new Error('فاکتور پیدا نشد');const remain=money(r.rows[0].net_total)-money(r.rows[0].paid_amount);if(amount>remain)throw new Error('مبلغ از مانده بیشتر است');const paid=money(r.rows[0].paid_amount)+amount,status=paid>=money(r.rows[0].net_total)?'paid':'partial';await client.query('UPDATE invoices SET paid_amount=$1,status=$2 WHERE id=$3',[paid,status,req.params.id]);await client.query('INSERT INTO payments(invoice_id,amount,method,note) VALUES($1,$2,$3,$4)',[req.params.id,amount,req.body.method||'card',clean(req.body.note)||null]);await client.query('COMMIT');res.json({ok:true})}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}
});

app.get('/api/reports/summary',auth,async(req,res)=>{
  const from=req.query.from||new Date(Date.now()-30*86400000).toISOString().slice(0,10),to=req.query.to||new Date().toISOString().slice(0,10);
  const s=(await q("SELECT COALESCE(SUM(i.net_total),0) sales,COUNT(*)::int orders,COALESCE(SUM((SELECT SUM((ii.unit_price-ii.buy_price_snapshot)*ii.qty) FROM invoice_items ii WHERE ii.invoice_id=i.id)),0) gross_profit,(SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date BETWEEN $1 AND $2) expenses FROM invoices i WHERE i.created_at::date BETWEEN $1 AND $2",[from,to])).rows[0];
  s.net_profit=money(s.gross_profit)-money(s.expenses);
  const daily=(await q('SELECT created_at::date day,SUM(net_total) sales,COUNT(*)::int orders FROM invoices WHERE created_at::date BETWEEN $1 AND $2 GROUP BY 1 ORDER BY 1',[from,to])).rows;
  res.json({from,to,summary:s,daily});
});

app.get('/api/content',auth,async(_req,res)=>res.json((await q('SELECT ct.*,p.name product_name FROM content_tasks ct LEFT JOIN products p ON p.id=ct.product_id ORDER BY COALESCE(publish_date,CURRENT_DATE+365),ct.id DESC')).rows));
app.post('/api/content',auth,async(req,res)=>{const r=await q('INSERT INTO content_tasks(product_id,title,channel,status,caption,publish_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[req.body.product_id||null,clean(req.body.title),req.body.channel||'instagram',req.body.status||'idea',clean(req.body.caption)||null,req.body.publish_date||null]);res.status(201).json(r.rows[0])});
app.get('/api/insights',auth,async(_req,res)=>{
  const low=(await q('SELECT p.name,pv.color,pv.size,pv.stock FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.active AND pv.stock<=pv.min_stock ORDER BY pv.stock LIMIT 5')).rows;
  const slow=(await q("SELECT p.name,SUM(pv.stock)::int stock,COALESCE(SUM(CASE WHEN i.created_at>=NOW()-INTERVAL '45 days' THEN ii.qty ELSE 0 END),0)::int sold45 FROM products p JOIN product_variants pv ON pv.product_id=p.id LEFT JOIN invoice_items ii ON ii.variant_id=pv.id LEFT JOIN invoices i ON i.id=ii.invoice_id GROUP BY p.id,p.name HAVING SUM(pv.stock)>0 ORDER BY sold45 ASC,stock DESC LIMIT 5")).rows;
  const out=[];if(low.length)out.push({type:'warning',title:'موجودی رو به اتمام',text:low.length+' واریانت نیاز به بررسی سفارش دارند.'});const sleepers=slow.filter(x=>Number(x.sold45)===0);if(sleepers.length)out.push({type:'campaign',title:'فرصت کمپین',text:sleepers.length+' محصول موجود در ۴۵ روز اخیر فروش ثبت‌شده ندارند.'});if(!out.length)out.push({type:'ok',title:'وضعیت پایدار',text:'با ثبت فروش بیشتر، پیشنهادهای دقیق‌تری نمایش داده می‌شود.'});res.json(out)
});
app.post('/api/content/generate',auth,async(req,res)=>{
  const r=await q("SELECT p.*,c.name category_name,(SELECT string_agg(DISTINCT pv.color,'، ') FROM product_variants pv WHERE pv.product_id=p.id) colors FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=$1",[req.body.product_id]);
  if(!r.rowCount)return res.status(404).json({error:'محصول پیدا نشد'});const x=r.rows[0],price=Number(x.sell_price).toLocaleString('fa-IR');
  res.json({caption:'✨ '+x.name+'\\n'+(x.category_name||'پوشاک')+(x.colors?' | رنگ‌ها: '+x.colors:'')+'\\nقیمت: '+price+' تومان\\nبرای موجودی سایز و ثبت سفارش پیام بدهید.\\n\\n#استایل #پوشاک #فروشگاه',story:x.name+'\\nانتخاب امروز ✨\\n'+price+' تومان\\nبرای سایز و رنگ موجود، دایرکت.',reel:'نمای نزدیک از بافت و جزئیات '+x.name+' → کات سریع به نمای کامل → نمایش رنگ‌های موجود → پایان با قیمت و دعوت به دایرکت.'});
});

app.use(express.static(path.join(__dirname,'public')));
app.use((req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(path.join(__dirname,'public','index.html'))});
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'خطای داخلی سیستم'})});
initDb().then(()=>app.listen(PORT,'0.0.0.0',()=>console.log('Retail OS on '+PORT))).catch(e=>{console.error(e);process.exit(1)});
