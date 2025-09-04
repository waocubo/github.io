// include.js (v2) — injeta header, marca link ativo e NORMALIZA LINKS .html
(function () {
  // --- Normalizador de links internos: /slug -> /slug.html (ou "slug" -> "slug.html")
  function normalizeLinks(root) {
    const scope = root || document;
    const anchors = scope.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      // Ignorar externos, âncoras e esquemas especiais
      if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;

      try {
        const u = new URL(href, location.origin); // resolve relativo e absoluto
        if (u.origin !== location.origin) return; // link externo

        // Já é .html ou termina com / ou é a raiz
        if (u.pathname === '/' || /\.html?$/i.test(u.pathname) || /\/$/.test(u.pathname)) return;

        // Ex.: /encrypted -> /encrypted.html
        u.pathname = u.pathname + '.html';
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch (e) { /* silencia erros com URLs estranhas */ }
    });
  }

  // --- Injeção do header
  const host = document.getElementById('site-header');
  if (host) {
    fetch('/header.html', { cache: 'no-store' })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        host.innerHTML = html;

        // Toggle mobile
        const nav = host.querySelector('[data-tcloud-nav]');
        host.querySelector('.tc-toggle')?.addEventListener('click', () => {
          nav?.classList.toggle('open');
        });

        // Marcar link ativo
        const path = (location.pathname || '/').toLowerCase();
        const file = path.split('/').pop() || 'index.html';
        host.querySelectorAll('.tc-links a').forEach(a => {
          const href = (a.getAttribute('href') || '').toLowerCase();
          if (href.endsWith(file)) a.classList.add('active');
          if ((file === 'index.html' || file === '') && href.endsWith('index.html')) a.classList.add('active');
        });

        // Se a página definiu data-active
        const forced = (host.dataset?.active || '').trim();
        if (forced) {
          host.querySelectorAll(`.tc-links a[data-route="${forced}"]`).forEach(a => a.classList.add('active'));
        }

        // **Normaliza links também dentro do header injetado**
        normalizeLinks(host);
      })
      .catch(() => {
        host.innerHTML = '<div style="padding:10px;background:#0b1220;border-bottom:1px solid #23304d;"><a href="/" style="color:#E6F0FF;font-weight:800;text-decoration:none">TCloud</a></div>';
      });
  }

  // **Normaliza links do resto da página**
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => normalizeLinks(document));
  } else {
    normalizeLinks(document);
  }

  // Extra: normaliza o link no momento do clique, como “rede de proteção”
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;

    try {
      const u = new URL(href, location.origin);
      if (u.origin !== location.origin) return;
      if (u.pathname !== '/' && !/\.html?$/i.test(u.pathname) && !/\/$/.test(u.pathname)) {
        u.pathname = u.pathname + '.html';
        a.setAttribute('href', u.pathname + u.search + u.hash);
      }
    } catch (_) {}
  }, true);
})();
