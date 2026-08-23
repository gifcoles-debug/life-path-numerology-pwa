const CACHE_NAME='life-path-local-pwa-v3';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const requestUrl=new URL(event.request.url);
  if(requestUrl.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(event.request.mode==='navigate'){
      try{const fresh=await fetch(event.request);cache.put('./index.html',fresh.clone());return fresh}catch{return(await cache.match('./index.html'))||(await cache.match('./'))}
    }
    const cached=await cache.match(event.request);
    if(cached)return cached;
    try{const fresh=await fetch(event.request);if(fresh.ok)cache.put(event.request,fresh.clone());return fresh}catch{return cache.match('./index.html')}
  })());
});
