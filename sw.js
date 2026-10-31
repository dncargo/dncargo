/* DN Cargo - jednostavan service worker (rad i sa slabom vezom) */
const CACHE = 'dncargo-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // spoljni resursi idu normalno
  if (url.pathname.endsWith('.mp4')) return;            // video se ne kešira

  // Stranica: prvo mreža (uvek sveža verzija), a bez veze keš
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put('index.html', c)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  // Slike i ostalo: prvo keš, pa mreža
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return res;
    }))
  );
});
