(async function () {
  const E = window.EcoBuddy;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadAll() {
    const [dash, board, ch] = await Promise.all([
      E.getJSON('/api/dashboard-data'),
      E.getJSON('/api/leaderboard'),
      E.getJSON('/api/challenges'),
    ]);

    const pct = Math.min(100, Math.round((dash.month_total / Math.max(1, dash.goal_target)) * 100));
    document.getElementById('gPct').textContent = pct;
    document.getElementById('gActual').textContent = dash.month_total.toFixed(1);
    document.getElementById('gTarget').textContent = dash.goal_target.toFixed(0);
    document.getElementById('goalInput').value = Math.round(dash.goal_target);

    const ring = document.getElementById('goalRing');
    const circumference = 2 * Math.PI * 50;
    ring.setAttribute('stroke-dasharray', circumference.toFixed(2));
    const offset = circumference * (1 - Math.min(1, pct / 100));
    ring.setAttribute('stroke-dashoffset', offset.toFixed(2));
    ring.style.stroke = pct < 80 ? '#22c55e' : pct < 100 ? '#f59e0b' : '#ef4444';

    document.getElementById('offsetTrees').textContent = Math.max(1, Math.ceil(dash.month_total / 21));

    const lb = document.getElementById('leaderboard');
    lb.innerHTML = board.map(p =>
      `<li class="${p.is_you ? 'you' : ''}">
        <span class="lb-name">${escapeHtml(p.name)}${p.is_you ? ' (you)' : ''}</span>
        <span class="lb-points">${p.points} pts</span>
      </li>`
    ).join('') || '<li class="muted small">No champions yet \u2014 be the first!</li>';

    const wrap = document.getElementById('challenges');
    wrap.innerHTML = ch.map(c =>
      `<div class="challenge ${c.completed ? 'done' : ''}" data-id="${c.id}">
        <h4>${escapeHtml(c.title)}</h4>
        <p>${escapeHtml(c.desc)}</p>
        <span class="pts">+${c.points} pts</span>
        ${c.completed ? '' : `<button type="button" class="btn btn-primary" data-id="${c.id}">Mark complete</button>`}
      </div>`
    ).join('');

    wrap.querySelectorAll('button[data-id]').forEach(b => {
      b.addEventListener('click', async () => {
        b.disabled = true;
        const r = await E.postJSON('/api/challenge', { challenge_id: Number(b.dataset.id) });
        if (r.error) { alert(r.error); b.disabled = false; return; }
        await loadAll();
      });
    });
  }

  document.getElementById('goalForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const target = Number(document.getElementById('goalInput').value || 0);
    if (target <= 0) { alert('Enter a positive number.'); return; }
    await E.postJSON('/api/goal', { target });
    await loadAll();
  });

  loadAll();
})();
