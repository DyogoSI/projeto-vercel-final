(function () {
  const DISPLAY_NAMES = {
    dyogo: 'Dyogo',
    steffany: 'Steffany'
  };

  function getCreds() {
    const user = sessionStorage.getItem('adminUser');
    const pass = sessionStorage.getItem('adminPass');
    return user && pass ? { user, pass } : null;
  }

  function getDisplayName() {
    const creds = getCreds();
    if (!creds) return '';
    return DISPLAY_NAMES[creds.user.toLowerCase()] || creds.user;
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
    document.querySelectorAll('.greeting-name').forEach((el) => {
      el.textContent = getDisplayName();
    });
  }

  function hideAdminLinks() {
    document.querySelectorAll('.admin-only').forEach((el) => {
      el.style.display = 'none';
    });
  }

  async function validate(user, pass) {
    const response = await fetch('/api/server?admin=true', {
      method: 'GET',
      headers: { username: user, password: pass }
    });
    return response.ok;
  }

  window.SiteAuth = { getCreds, getDisplayName, setCreds, clearCreds, revealAdminLinks, hideAdminLinks, validate };

  document.addEventListener('DOMContentLoaded', () => {
    if (getCreds()) {
      revealAdminLinks();
    }

    const personBtn = document.getElementById('headerPersonBtn');
    if (!personBtn) return;

    const gate = document.getElementById('siteLoginGate');
    const loggedInGate = document.getElementById('loggedInGate');

    function openGate() {
      if (gate) gate.style.display = 'flex';
    }

    function closeGate() {
      if (gate) gate.style.display = 'none';
    }

    function openLoggedInGate() {
      if (!loggedInGate) return;
      const nameEl = document.getElementById('loggedInName');
      if (nameEl) nameEl.textContent = getDisplayName();
      loggedInGate.style.display = 'flex';
    }

    function closeLoggedInGate() {
      if (loggedInGate) loggedInGate.style.display = 'none';
    }

    personBtn.addEventListener('click', () => {
      if (getCreds()) {
        openLoggedInGate();
      } else {
        openGate();
      }
    });

    if (gate) {
      const closeBtn = document.getElementById('siteLoginClose');
      if (closeBtn) closeBtn.addEventListener('click', closeGate);
      gate.addEventListener('click', (e) => {
        if (e.target === gate) closeGate();
      });

      const form = document.getElementById('site-login-form');
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
    }

    if (loggedInGate) {
      const loggedInCloseBtn = document.getElementById('loggedInClose');
      if (loggedInCloseBtn) loggedInCloseBtn.addEventListener('click', closeLoggedInGate);
      loggedInGate.addEventListener('click', (e) => {
        if (e.target === loggedInGate) closeLoggedInGate();
      });

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          clearCreds();
          hideAdminLinks();
          closeLoggedInGate();
          if (document.getElementById('data-section') || document.getElementById('cadastro-section')) {
            window.location.href = 'index.html';
          }
        });
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (gate && gate.style.display === 'flex') closeGate();
      if (loggedInGate && loggedInGate.style.display === 'flex') closeLoggedInGate();
    });
  });
})();
