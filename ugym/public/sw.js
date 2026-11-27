'use strict';const VERSION='ugym-account-v5-staff-lockers';const FILES=['/','/style.css','/app.js','/extras.js','/extras.css','/studio.js','/studio.css','/operations.js','/operations.css','/logo.svg','/manifest.webmanifest'];self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting();});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))));self.clients.claim();});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok&&FILES.includes(u.pathname))caches.open(VERSION).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r;}).catch(()=>caches.match(e.request)));});
self.addEventListener('push',event=>{
 let msg={};try{msg=event.data?.json()||{}}catch{}
 const title=String(msg.title||'UGYM · اعلان جدید').slice(0,90);
 const options={body:String(msg.body||'برای دیدن پیام به پنل خود وارد شو.').slice(0,180),icon:'/icon-192.png',badge:'/icon-192.png',tag:'ugym-notice',data:{url:'/member'}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const existing=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const found=existing.find(c=>new URL(c.url).origin===self.location.origin&&new URL(c.url).pathname==='/member');
  if(found){await found.focus();return;}
  if(self.clients.openWindow)await self.clients.openWindow('/member');
 })());
});
