// include.js (v3.1) — injeta header, marca link ativo e NORMALIZA LINKS .html + mapeia slugs PT->EN
(() => {
  // ====== CONFIG ======
  const currentScript = document.currentScript || [...document.scripts].pop();
  const FORCED_BASE = (currentScript?.dataset?.base || '').replace(/\/+$/,'');
  const basePath = FORCED_BASE || '';

  // Helper: junta caminho com base (evita // e respeita raiz)
  const withBase = (p) => (basePath + '/' + String(p||'').replace(/^\/+/,'')).replace(/\/{2,}/g,'/');

  // ====== MAPA DE ROTAS (PT -> EN/.html reais) ======
  // Obs.: mantenha apenas os slugs que existem no site. Ajuste conforme seus arquivos reais.
  const PT2EN = {
    '/': '/index',
    '/inicio': '/index',
    '/sobre': '/about',
    '/recursos': '/features',
    '/regioes': '/regions',
    '/precos': '/pricing',
    '/planos': '/pricing',
    '/afiliados': '/affiliates',
    '/revenda': '/reseller',
    '/download': '/download',
    '/empresarial': '/business',
    '/pass': '/pass',
    '/transferir': '/transfer',
    '/compartilhar': '/share',
    '/seguranca': '/security',
    '/backup': '/backup',
    '/dam': '/dam',
    '/zero-knowledge': '/zero-knowledge'
  };

  // Normaliza barras e remove trailing slash (exceto raiz)
  const cleanPathname = (p) => {
    if (!p) return '/';
    let out = p.replace(/\/{2,}/g,'/');
    if (out.length > 1) out = out.replace(/\/+$/,'');
    return out || '/';
  };

  // Traduz slug PT para caminho-alvo (sem .html); mantém se já for EN
  const translatePath = (pathname) => {
    const p = cleanPathname(pathname);
    // tenta match exato
    if (PT2EN[p]) return PT2EN[p];
    // tenta sem trailing slash
    const noSlash = p.replace(/\/+$/,'');
    if (PT2EN[noSlash]) return PT2EN[noSlash];
    return p; // já está em EN ou não mapeado
  };

  // Aplica base e garante extensão .html quando apropriado
  const finalizeLocalHref = (pathname, search='', hash='') => {
    let p = translatePath(pathname);
    // raiz deve virar /index.html
    if (p === '/') p = '/index';
    // se não termina com .html nem com /, adiciona .html
    const isHTML = /\.html?$/i.test(p);
    const isDir  = /\/$/.test(p);
    if (!isHTML && !isDir) p = p + '.html';
    // aplica base
    const finalPath = withBase(p);
    return finalPath + (search || '') + (hash || '');
  };

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
        const u = new URL(href, location.href);
        // Só normaliza se for mesmo host + dentro do basePath (quando configurado)
        if (u.origin !== location.origin) return;
        if (basePath && !u.pathname.startsWith(basePath+'/') && u.pathname !== basePath) return;

        // Reescreve usando tradutor + .html + base
        const finalHref = finalizeLocalHref(u.pathname, u.search, u.hash);
        a.setAttribute('href', finalHref);
      } catch (e) { /* silencia URLs não resolvíveis */ }
    });
  }

  // Expor utilitário (útil p/ re-render SPA ou conteúdo dinâmico)
  window.TCloudNormalizeLinks = normalizeLinks;

  // ====== HEADER ======
  const host = document.getElementById('site-header');
  if (host) {
    const headerURL = host.getAttribute('data-header-url') || withBase('/header.html');
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

        // --- Marcar link ativo (considera tradução e .html) ---
        const rawPath = location.pathname || '/';
        const cleanPath = cleanPathname(rawPath);
        // Normaliza o "caminho atual" do browser como se fosse um link local nosso
        const currentNormalized = (() => {
          try {
            const u = new URL(location.href);
            return finalizeLocalHref(u.pathname, '', ''); // sem query/hash p/ match de href
          } catch { return finalizeLocalHref(cleanPath, '', ''); }
        })().toLowerCase();

        const links = host.querySelectorAll('.tc-links a');

        // 1) Regra por data-route, se host tiver data-active
        const forced = (host.dataset?.active || '').trim();
        if (forced) {
          links.forEach(a => {
            if (a.dataset.route === forced) a.classList.add('active');
          });
        }

        // 2) Match exato por href normalizado
        links.forEach(a => {
          const href = (a.getAttribute('href') || '').toLowerCase();
          try {
            const u = new URL(href, location.origin);
            const normalized = finalizeLocalHref(u.pathname, '', '').toLowerCase();
            if (normalized === currentNormalized) a.classList.add('active');
            // Tratar index.html como raiz
            if (currentNormalized.endsWith('/index.html') && normalized.endsWith('/index.html')) {
              a.classList.add('active');
            }
          } catch { /* ignore */ }
        });

        // 3) Match por prefixo (ex.: /recursos/... marca “Recursos”)
        const candidates = [...links]
          .map(a => {
            try {
              const u = new URL(a.getAttribute('href') || '', location.origin);
              const normalized = finalizeLocalHref(u.pathname, '', '');
              // Remover /index.html para não “achatar” home versus subpaths
              const p = normalized.replace(/\/index\.html$/i,'/').toLowerCase();
              return {a, p};
            } catch { return null; }
          })
          .filter(Boolean);

        let best = null;
        candidates.forEach(({a,p})=>{
          if (p !== '/' && currentNormalized.startsWith(p)) {
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

  // “Rede de proteção”: normaliza o link no clique (antes da navegação)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;
    if (a.hasAttribute('download')) return;
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (basePath && !u.pathname.startsWith(basePath+'/') && u.pathname !== basePath) return;

      const finalHref = finalizeLocalHref(u.pathname, u.search, u.hash);
      if (finalHref !== href) {
        e.preventDefault();
        a.setAttribute('href', finalHref);
        // força navegação já corrigida
        location.href = finalHref;
      }
    } catch(_) {}
  }, true);
})();
