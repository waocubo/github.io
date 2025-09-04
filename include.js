// include.js — injeta o header e marca link ativo
(function () {
  const host = document.getElementById('site-header');
  if (!host) return;

  fetch('/header.html', { cache: 'no-store' })
    .then(r => r.ok ? r.text() : Promise.reject(r.status))
    .then(html => {
      host.innerHTML = html;

      // mobile toggle
      const nav = host.querySelector('[data-tcloud-nav]');
      host.querySelector('.tc-toggle')?.addEventListener('click', () => {
        nav?.classList.toggle('open');
      });

      // ativo pelo arquivo
      const path = (location.pathname || '/').toLowerCase();
      const file = path.split('/').pop() || 'index.html';
      host.querySelectorAll('.tc-links a').forEach(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        if (href.endsWith(file)) a.classList.add('active');
        if ((file === 'index.html' || file === '') && href.endsWith('index.html')) a.classList.add('active');
      });

      // se a página definir data-active, força o ativo
      const forced = (host.dataset?.active || '').trim();
      if (forced) {
        host.querySelectorAll(`.tc-links a[data-route="${forced}"]`).forEach(a => a.classList.add('active'));
      }
    })
    .catch(() => {
      host.innerHTML = '<div style="padding:10px;background:#0b1220;border-bottom:1px solid #23304d;"><a href="/" style="color:#E6F0FF;font-weight:800;text-decoration:none">TCloud</a></div>';
    });
})();
