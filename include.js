// include.js (v3) — injeta header, marca link ativo e NORMALIZA LINKS .html
(() => {
  // ====== CONFIG ======
  // Descobre basePath automaticamente (se o site estiver hospedado em /app/ por ex.)
  // ➜ define <script src="/app/assets/include.js" data-base="/app"></script> para forçar
  const currentScript = document.currentScript || [...document.scripts].pop();
  const FORCED_BASE = (currentScript?.dataset?.base || '').replace(/\/+$/,'');
  const basePath = FORCED_BASE || '';

  // Helper: junta caminho com base (evita // e respeita raiz)
  const withBase = (p) => (basePath + '/' + String(p||'').replace(/^\/+/,'')).replace(/\/{2,}/g,'/');

  // ====== NORMALIZADOR ======
  function normalizeLinks(root) {
    const scope = root || document;
    const anchors = scope.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      // Ignorar externos, âncoras, esquemas especiais, downloads
      if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;
      if (a.hasAttribute('download')) return;

      try {
        // Resolve relativo a partir do path atual (não só origin) p/ manter navegação previsível em subpastas
        const u = new URL(href, location.href);
        // Só normaliza se for mesmo host + dentro do basePath (quando configurado)
        if (u.origin !== location.origin) return;
        if (basePath && !u.pathname.startsWith(basePath+'/')) return;

        // Já é .html, termina com /, ou é raiz do basePath?
        const isHTML = /\.html?$/i.test(u.pathname);
        const isDir  = /\/$/.test(u.pathname);
        const isRoot = u.pathname === (basePath || '/') || u.pathname === (basePath + '/');

        if (!isHTML && !isDir && !isRoot) {
          u.pathname = u.pathname + '.html';
        }

        // Reaplica base (garantia extra)
        u.pathname = withBase(u.pathname);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch (e) { /* silencia URLs não resolvíveis */ }
    });
  }

  // Expor utilitário (útil p/ re-render SPA ou conteúdo dinâmico)
  window.TCloudNormalizeLinks = normalizeLinks;

  // ====== HEADER ======
  const host = document.getElementById('site-header');
  if (host) {
    const headerURL = host.getAttribute('data-header-url') || withBase('/header.html');
    // Use cache default do navegador; adicione versão se quiser bust:
    const v = currentScript?.dataset?.v ? `?v=${encodeURIComponent(currentScript.dataset.v)}` : '';
    fetch(headerURL + v)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        host.innerHTML = html;

        const nav = host.querySelector('[data-tcloud-nav]');
        const toggle = host.querySelector('.tc-toggle');

        // Toggle mobile com ARIA
        const setExpanded = (val) => {
          nav?.classList.toggle('open', val);
          toggle?.setAttribute('aria-expanded', String(val));
        };
        toggle?.setAttribute('aria-expanded', 'false');
        toggle?.addEventListener('click', () => {
          setExpanded(!nav?.classList.contains('open'));
        });
        // Fechar menu ao clicar num link (mobile)
        host.querySelectorAll('.tc-links a').forEach(a=>{
          a.addEventListener('click', ()=> setExpanded(false));
        });

        // Marcar link ativo (por arquivo, por data-route e por prefixo)
        const path = (location.pathname || '/');
        // Remove query/hash e normaliza trailing slash
        const cleanPath = path.replace(/\/{2,}/g,'/').replace(/\/+$/,'/');

        // Deriva "arquivo" (ex.: /features -> features.html ou /a/b/ -> b/index.html)
        const lastSeg = cleanPath.split('/').filter(Boolean).pop() || 'index';
        const file = /\.html?$/i.test(lastSeg) ? lastSeg : (lastSeg + '.html');

        const links = host.querySelectorAll('.tc-links a');
        // 1) Regra por data-route, se host tiver data-active
        const forced = (host.dataset?.active || '').trim();
        if (forced) {
          links.forEach(a => {
            if (a.dataset.route === forced) a.classList.add('active');
          });
        }

        // 2) Match por arquivo exato
        links.forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.toLowerCase().endsWith('/' + file.toLowerCase())) a.classList.add('active');
          if ((file === 'index.html') && /\/index\.html$/i.test(href)) a.classList.add('active');
        });

        // 3) Match por prefixo de caminho (ex.: /recursos/... marca “Recursos”)
        // Evita marcar múltiplos: pega o link com path mais longo que seja prefixo do atual.
        const candidates = [...links]
          .map(a => {
            try {
              const u = new URL(a.getAttribute('href') || '', location.origin);
              return {a, p: u.pathname.replace(/\/index\.html$/i,'/').toLowerCase()};
            } catch { return null; }
          })
          .filter(Boolean);

        const current = cleanPath.toLowerCase();
        let best = null;
        candidates.forEach(({a,p})=>{
          if (p !== '/' && current.startsWith(p)) {
            if (!best || p.length > best.p.length) best = {a,p};
          }
        });
        if (best) best.a.classList.add('active');

        // Normaliza links dentro do header injetado
        normalizeLinks(host);
      })
      .catch(() => {
        host.innerHTML =
          `<div style="padding:10px;background:#0b1220;border-bottom:1px solid #23304d;">
            <a href="${withBase('/index.html')}" style="color:#E6F0FF;font-weight:800;text-decoration:none">TCloud</a>
          </div>`;
      });
  }

  // ====== NORMALIZA LINKS DO DOCUMENTO ======
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => normalizeLinks(document));
  } else {
    normalizeLinks(document);
  }

  // “Rede de proteção”: normaliza o link no clique
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;
    if (a.hasAttribute('download')) return;
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (basePath && !u.pathname.startsWith(basePath+'/')) return;
      if (u.pathname !== withBase('/') && !/\.html?$/i.test(u.pathname) && !/\/$/.test(u.pathname)) {
        u.pathname = u.pathname + '.html';
        a.setAttribute('href', u.pathname + u.search + u.hash);
      }
    } catch(_) {}
  }, true);
})();
