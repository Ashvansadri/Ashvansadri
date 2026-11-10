# UGYM Fitness Club
وب‌اپ فارسی باشگاه UGYM — پیلاتس، ایروبیک، بدنسازی و TRX

## معماری
- Node.js 20+ با HTTP Server داخلی و PostgreSQL روی Neon
- فرانت‌اند بدون فریم‌ورک، CSS سه‌بعدی و PWA
- احراز هویت با scrypt و کوکی HttpOnly, Secure, SameSite=Strict
- تفکیک سطح دسترسی مدیر و ورزشکار و کنترل دسترسی برای تمام APIها
- اطلاعات تستی کلاس‌ها؛ هیچ ورزشکار یا پرداخت واقعی از قبل ثبت نشده

## مسیرها
- عمومی: https://ugym-fitness-club-2026.onrender.com
- مدیریت: https://ugym-fitness-club-2026.onrender.com/admin
- ورزشکار: https://ugym-fitness-club-2026.onrender.com/member
- ساخت مدیر اولیه: https://ugym-fitness-club-2026.onrender.com/setup
- سلامتی سامانه: https://ugym-fitness-club-2026.onrender.com/api/health

## پیکربندی Render
Render Web Service: `ugym-fitness-club-2026`, branch: `ugym-fitness-v1-20261110`
Build: `cd ugym && npm install --omit=dev`
Start: `cd ugym && node server.js`
Region: Frankfurt
Environment variables:
- `DATABASE_URL`: PostgreSQL connection string retrieved privately from the Neon project `UGYM Fitness Club`. **Never commit or paste this secret into public code or a chat.**
- `SETUP_KEY`: randomly generated setup secret, already installed as an environment variable on Render; do not expose it publicly.
After setting DATABASE_URL in Render Dashboard → Service → Environment, save/deploy and verify `/api/health` returns `{"ok":true,...}`.

## Setup
1. Open /setup; enter the private SETUP_KEY and your own admin name, email and strong password.
2. Log in as admin and create a test athlete (fictional email and strong password).
3. In the athlete file, set the sport and goal, register two dated body assessments and create a sample pending tuition payment.
4. Log in as that athlete in /member to view the progress chart, timeline and tuition.
5. Book the next available class, return as admin and mark attendance. Check that status updates in the athlete panel.

## قابلیت‌های نسخه فعلی
- داشبورد مدیریتی، تعریف ورزشکار و کلاس و تغییر هدف
- رزرو جلسات با کنترل ظرفیت و روز برگزاری
- ثبت تاریخچه ارزیابی‌های بدن (وزن، چربی بدن، دور کمر، امتیاز عملکرد) و نمودار اختصاصی ورزشکار
- دفتر مالی شامل ثبت شهریه/بدهی و ثبت تسویه
- PWA؛ HTML راست‌به‌چپ و موبایل‌فرست؛ لوگوی برداری
- بدون درگاه پرداخت آنلاین؛ ثبت دستی پرداخت و وصول
- **ایمیل تأییدنشده است و امکانات پیامک/پرداخت آنلاین هنوز اضافه نشده‌اند**

## محدودیت‌های مهم
Render Free برای بار کاری کوچک و تست مناسب است؛ خواب خودکار و سهمیه مصرف دارد. برای داده‌های حساس و اطلاعات واقعی باشگاه، پیش از راه‌اندازی عمومی باید سیاست حریم خصوصی، نسخه پشتیبان، مشاهده/حذف داده، مدیریت کاربران، تنظیمات گذرواژه و امنیت عملیاتی تکمیل شوند.
