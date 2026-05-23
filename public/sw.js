// Tiva Nutrition — Service Worker v2
const VERSION = "v2";
const CACHE   = `tiva-${VERSION}`;

// Static shell: always cached on install
const SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache API routes or auth endpoints
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Next.js static chunks — hashed filenames, safe to cache forever
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Next.js image optimisation — cache with revalidation
  if (url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Icons, manifest, favicon — cache first
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation — network first, cache visited pages, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNav(request));
    return;
  }
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fetchP = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached ?? fetchP;
}

async function networkFirstNav(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    // Offline: serve the cached page, fallback to shell, then offline page
    const cached = await caches.match(req);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return offlinePage();
  }
}

function offlinePage() {
  return new Response(
    `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#F97316">
  <title>Offline — Tiva</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0F0A06;color:#fff;
         display:flex;flex-direction:column;align-items:center;
         justify-content:center;min-height:100dvh;padding:2rem;text-align:center}
    .ring{width:80px;height:80px;border-radius:50%;border:3px solid rgba(249,115,22,.2);
          border-top-color:#F97316;animation:spin 1s linear infinite;margin-bottom:2rem}
    @keyframes spin{to{transform:rotate(360deg)}}
    h1{font-size:1.4rem;font-weight:800;margin-bottom:.5rem;color:#F97316}
    p{font-size:.9rem;color:rgba(255,255,255,.4);margin-bottom:2rem;max-width:280px}
    button{background:linear-gradient(135deg,#F97316,#EA6A0A);color:#fff;
           border:none;border-radius:1rem;padding:.875rem 2rem;
           font-size:.9rem;font-weight:700;cursor:pointer;
           box-shadow:0 4px 20px rgba(249,115,22,.3)}
    button:active{transform:scale(.97)}
    .meals{margin-top:2rem;width:100%;max-width:360px;text-align:left}
    .meal-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
               border-radius:1rem;padding:.875rem 1rem;margin-bottom:.5rem}
    .meal-name{font-weight:600;font-size:.9rem}
    .meal-time{font-size:.75rem;color:rgba(249,115,22,.8)}
    #status{font-size:.75rem;color:rgba(255,255,255,.25);margin-top:1rem}
  </style>
</head>
<body>
  <div class="ring"></div>
  <h1>Sem ligação</h1>
  <p>Verifica a tua ligação à internet e tenta novamente.</p>
  <button onclick="location.reload()">🔄 Tentar novamente</button>
  <div id="status"></div>
  <div class="meals" id="meals"></div>
  <script>
    // Show cached plan if available
    try {
      const raw = localStorage.getItem('tiva_cached_plan');
      if (raw) {
        const { plan } = JSON.parse(raw);
        const js = new Date().getDay();
        const days = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
        const meals = plan.weekly_menu[days[js]] || [];
        if (meals.length) {
          document.getElementById('status').textContent = 'A mostrar o teu plano guardado localmente';
          const el = document.getElementById('meals');
          el.innerHTML = '<p style="font-size:.7rem;color:rgba(255,255,255,.25);margin-bottom:.75rem;text-transform:uppercase;letter-spacing:.08em">Refeições de hoje</p>'
            + meals.map(m =>
                '<div class="meal-card">'
                + '<div class="meal-name">' + m.emoji + ' ' + m.name + '</div>'
                + '<div class="meal-time">' + m.time + '</div>'
                + '</div>'
              ).join('');
        }
      }
    } catch(e) {}
  </script>
</body>
</html>`,
    { status: 503, headers: { "Content-Type": "text/html;charset=utf-8" } }
  );
}
