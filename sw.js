/* DN Cargo - service worker (rad i sa slabom vezom) */
const CACHE = 'dncargo-v3';
const CORE = ['./', 'index.html', 'Onama.html', 'i18n.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))   // jedan fajl koji fali ne ruši instalaciju
      .then(() => self.skipWaiting())
  );
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
  if (url.origin !== location.origin) return;                                    // spoljni resursi idu normalno
  if (/\.(mp4|apk|zip|msix|msixbundle|appxbundle)$/i.test(url.pathname)) return; // veliki fajlovi se ne keširaju

  // Stranice, skripte i podaci: prvo mreža (uvek sveža verzija), bez veze keš
  const dynamic = req.mode === 'navigate' || /\.(html|js|json|css)$/i.test(url.pathname) || url.pathname.endsWith('/');
  if (dynamic) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
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
