'use strict';
const CACHE='ugym-landing-motion-v2';
const SHELL=['/','/index.html','/style.css','/landing.js','/logo.svg','/manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok&&SHELL.includes(u.pathname)){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});}return r;}).catch(()=>caches.match(e.request)));});
