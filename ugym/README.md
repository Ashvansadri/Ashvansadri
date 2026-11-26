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


## Coach Studio v2 — 2026-11-26

### Features deployed
- Unique athlete usernames during registration, password login, and independent personal accounts.
- 22 exercise descriptions covering strength, Pilates, aerobics and TRX. Visuals are 2-frame start/end demonstrations with CSS alternation. Source: MarvinNazari/exercise-images, CC0-1.0; forms must be verified by a qualified coach.
- Manager creates per-member draft programs, adds exercises with day, sets, reps, rest, coach notes, and publishes the selected plan. Previous active plans are archived. Members view only their active plan.
- Members log completed sets, reps, optional weights, effort and date. The trainer sees logs per member.
- Member self-report measurements are marked unverified, and manager can approve them. Coaches should validate source and method before using numbers to alter programming.
- Manager-only structured nutritional guidance; member-specific display. Not a medical diet generator.
- Manager sends in-app announcements globally or to one member. Member sees a personal inbox and can mark notices read. Pending tuition and marked absences lead to in-app reminder cards when the member opens the app; no native iOS push, SMS, or WhatsApp automation has been set up.
- Security: role checks and member-scoped SQL, external demonstration source whitelisted in CSP, private API not cached by service worker. Partial unique index ensures one active training plan per athlete.
- Smart locker hardware is **not connected**. Future integrations must support independent emergency/manual unlocking, explicit device compatibility and safe failure behavior; payment status alone must not endanger access or physical safety.

### Live URLs
- Website: https://ugym-official-app-2026.onrender.com
- Manager: https://ugym-fitness-club-2026.onrender.com/admin
- Athlete: https://ugym-fitness-club-2026.onrender.com/member

### Acceptance test evidence and limits
- An isolated fictional athlete account was registered through the live web UI and redirected to /member.
- A test plan with two exercise visualizations, nutrition guidance and a targeted announcement loaded and rendered in that test athlete account.
- On Neon, a test workout log and unverified measurement inserted and queried successfully, then all QA DEMO athlete data was removed. These SQL records validate the storage schema but not the complete browser submission path.
- Public /api/v2/exercises responded HTTP 200; unauthenticated /api/v2/admin/studio and /api/v2/member/studio responded HTTP 401. Live deployment was confirmed.
- Manager-side program creation, approval and broadcast UI requires a complete authenticated acceptance test with a legitimate manager account; do not mark as end-to-end certified until performed.
- No real push notification, direct locker control, automatic clinical nutrition recommendation, or live motion-capture form assessment is present.
