(function () {
  function getCreds() {
    const user = sessionStorage.getItem('adminUser');
    const pass = sessionStorage.getItem('adminPass');
    return user && pass ? { user, pass } : null;
  }

  function setCreds(user, pass) {
    sessionStorage.setItem('adminUser', user);
    sessionStorage.setItem('adminPass', pass);
  }

  function clearCreds() {
    sessionStorage.removeItem('adminUser');
    sessionStorage.removeItem('adminPass');
  }

  function revealAdminLinks() {
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = '';
    });
  }

  async function validate(user, pass) {
    const response = await fetch('/api/server?admin=true', {
      method: 'GET',
      headers: { username: user, password: pass }
    });
    return response.ok;
  }

  window.SiteAuth = { getCreds, setCreds, clearCreds, revealAdminLinks, validate };

  document.addEventListener('DOMContentLoaded', () => {
    if (getCreds()) {
      revealAdminLinks();
    }

    const personBtn = document.getElementById('headerPersonBtn');
    const gate = document.getElementById('siteLoginGate');
    if (!personBtn || !gate) return;

    const closeBtn = document.getElementById('siteLoginClose');
    const form = document.getElementById('site-login-form');

    function openGate() {
      gate.style.display = 'flex';
    }

    function closeGate() {
      gate.style.display = 'none';
    }

    personBtn.addEventListener('click', () => {
      if (getCreds()) return;
      openGate();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeGate);
    gate.addEventListener('click', (e) => {
      if (e.target === gate) closeGate();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && gate.style.display === 'flex') closeGate();
    });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('site-admin-user').value;
        const pass = document.getElementById('site-admin-pass').value;
        try {
          const ok = await validate(user, pass);
          if (!ok) throw new Error('Usuário ou senha inválidos!');
          setCreds(user, pass);
          revealAdminLinks();
          closeGate();
          form.reset();
        } catch (error) {
          alert(error.message);
        }
      });
    }
  });
})();
