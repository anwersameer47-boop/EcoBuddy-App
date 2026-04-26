(async function () {
  const E = window.EcoBuddy;
  const badgeIcons = {
    leaf: '\u{1F33F}', sprout: '\u{1F331}', shield: '\u{1F6E1}',
    globe: '\u{1F30D}', trophy: '\u{1F3C6}',
  };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.querySelectorAll('input[name="langChoice"]').forEach(r =>
    r.addEventListener('change', async () => {
      const lang = r.value;
      try {
        await E.postJSON('/api/language', { lang });
        window.location.reload();
      } catch (e) {
        alert('Could not change language.');
      }
    })
  );

  try {
    const data = await E.getJSON('/api/dashboard-data');
    const el = document.getElementById('badges');
    if (!el) return;
    const earnedLabel = (E.lang === 'hi') ? 'अर्जित' : 'Earned';
    const ptsLabel = (E.lang === 'hi') ? '+ अंक' : '+ pts';
    el.innerHTML = data.badges.map(b => {
      const icon = badgeIcons[b.icon] || '\u{1F33F}';
      const sub = b.earned ? earnedLabel : (b.min + ptsLabel);
      return '<div class="badge ' + (b.earned ? 'earned' : '') + '">' +
        '<div class="b-icon">' + icon + '</div>' +
        '<h5>' + escapeHtml(b.name) + '</h5>' +
        '<span>' + sub + '</span></div>';
    }).join('');
  } catch (e) { /* ignore */ }
})();
