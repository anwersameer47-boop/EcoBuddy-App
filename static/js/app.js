(function () {

  const root = document.documentElement;
  const themeBtn = document.getElementById('darkToggle');

  if (themeBtn) {
    themeBtn.addEventListener('click', async () => {
      const isDark = root.getAttribute('data-theme') === 'dark';
      const next = !isDark;

      root.setAttribute('data-theme', next ? 'dark' : 'light');

      const icon = themeBtn.querySelector('.theme-icon');
      if (icon) icon.textContent = next ? '\u2600' : '\u263E';

      try {
        await fetch('/api/dark-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        });
      } catch (e) {}
    });
  }

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  window.EcoBuddy = {
    palette: {
      transport: '#22c55e',
      energy: '#f59e0b',
      food: '#06b6d4',
      waste: '#a855f7',
      line: '#16a34a',
      lineBg: 'rgba(34,197,94,.18)',
    },

    chartTextColor() {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--ink-2').trim() || '#3b554a';
    },

    chartGridColor() {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      return dark ? 'rgba(255,255,255,.08)' : 'rgba(15,31,23,.08)';
    },

    formatDate(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    },

    async getJSON(url) {
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Request failed: ' + url);
      return r.json();
    },

    async postJSON(url, data) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!r.ok) {
        throw new Error('Request failed: ' + url);
      }

      return r.json();
    },
  };

})();  // ✅ ye sabse important hai
