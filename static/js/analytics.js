(async function () {
  const E = window.EcoBuddy;
  let stackChart, totalChart, compareBar;

  const tipIcons = {
    bus: '\u{1F68C}', bulb: '\u{1F4A1}', salad: '\u{1F957}',
    recycle: '\u267B', tree: '\u{1F333}', spark: '\u2728',
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function load() {
    const data = await E.getJSON('/api/analytics');
    document.getElementById('aScore').textContent = data.score;
    document.getElementById('aMonth').textContent = data.month_total.toFixed(2);

    const labels = data.series.map(s => E.formatDate(s.date));
    const stacked = (key, color) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      data: data.series.map(s => s[key]),
      backgroundColor: color, stack: 'a', borderWidth: 0,
    });

    stackChart && stackChart.destroy();
    stackChart = new Chart(document.getElementById('stackChart'), {
      type: 'bar',
      data: { labels, datasets: [
        stacked('transport', E.palette.transport),
        stacked('energy', E.palette.energy),
        stacked('food', E.palette.food),
        stacked('waste', E.palette.waste),
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: E.chartTextColor(), boxWidth: 12 } } },
        scales: {
          x: { stacked: true, ticks: { color: E.chartTextColor(), maxTicksLimit: 12 }, grid: { display: false } },
          y: { stacked: true, ticks: { color: E.chartTextColor() }, grid: { color: E.chartGridColor() }, beginAtZero: true },
        },
      },
    });

    totalChart && totalChart.destroy();
    totalChart = new Chart(document.getElementById('totalChart'), {
      type: 'line',
      data: { labels, datasets: [{
        label: 'Total kg CO\u2082',
        data: data.series.map(s => s.total),
        borderColor: E.palette.line,
        backgroundColor: E.palette.lineBg,
        tension: .35, fill: true, borderWidth: 2, pointRadius: 0,
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: E.chartTextColor(), maxTicksLimit: 8 }, grid: { color: E.chartGridColor() } },
          y: { ticks: { color: E.chartTextColor() }, grid: { color: E.chartGridColor() }, beginAtZero: true },
        },
      },
    });

    compareBar && compareBar.destroy();
    compareBar = new Chart(document.getElementById('compareBar'), {
      type: 'bar',
      data: {
        labels: ['You', 'India avg', 'Global avg'],
        datasets: [{
          data: [data.compare.you, data.compare.india, data.compare.global],
          backgroundColor: ['#16a34a', '#06b6d4', '#a855f7'],
          borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: E.chartTextColor() }, grid: { display: false } },
          y: { ticks: { color: E.chartTextColor() }, grid: { color: E.chartGridColor() }, beginAtZero: true },
        },
      },
    });

    const tips = document.getElementById('aTips');
    tips.innerHTML = data.suggestions.map(t =>
      `<li><span class="tip-icon">${tipIcons[t.icon] || '\u2728'}</span><span>${escapeHtml(t.text)}</span></li>`
    ).join('');
  }

  if (typeof Chart === 'undefined') setTimeout(load, 200); else load();
})();
