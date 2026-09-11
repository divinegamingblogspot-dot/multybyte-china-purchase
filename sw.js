const CACHE='multybyte-china-purchase-v4';
const APP_FILES=['./','./index.html','./style.css','./app.js','./manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_FILES)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.pathname.endsWith('/data.json')){event.respondWith(fetch(event.request,{cache:'no-store'}));return}if(url.origin===self.location.origin){event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{})}return response}).catch(()=>caches.match(event.request)))}});
