const CACHE='sadikh-poulailler-v2';

const CORE=[
 './',
 './index.html',
 './styles.css',
 './app.js',
 './manifest.webmanifest',
 './assets/logo.jpg'
];

self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE)
   .then(cache=>cache.addAll(CORE))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener('activate',event=>{
 event.waitUntil(
  caches.keys().then(keys=>
   Promise.all(
    keys.filter(key=>key!==CACHE)
     .map(key=>caches.delete(key))
   )
  ).then(()=>self.clients.claim())
 );
});

self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);

 if(event.request.method!=='GET'||url.origin!==location.origin)return;

 event.respondWith(
  caches.match(event.request).then(hit=>
   hit||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
   }).catch(()=>caches.match('./index.html'))
  )
 );
});

// Réception des notifications Push
self.addEventListener('push',event=>{
 let data={};

 try{
  data=event.data?event.data.json():{};
 }catch(error){
  data={title:'SADIKH SERVICES',body:event.data?.text()||'Nouvelle alerte du poulailler.'};
 }

 event.waitUntil(
  self.registration.showNotification(
   data.title||'SADIKH SERVICES',
   {
    body:data.body||'Consultez votre bulletin du poulailler.',
    icon:'./assets/launchericon-192x192.png',
    badge:'./assets/launchericon-192x192.png',
    tag:data.tag||'sadikh-poulailler',
    data:{url:'./'}
   }
  )
 );
});

// Ouverture de l'application au toucher
self.addEventListener('notificationclick',event=>{
 event.notification.close();

 event.waitUntil(
  clients.matchAll({type:'window',includeUncontrolled:true})
   .then(windowClients=>{
    for(const client of windowClients){
     if('focus' in client)return client.focus();
    }
    return clients.openWindow('./');
   })
 );
});
