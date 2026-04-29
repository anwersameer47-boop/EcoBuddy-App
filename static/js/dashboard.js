(async function () {
  let E;
  let pieChart, lineChart, compareChart;

  const badgeIcons = {
    leaf: '\u{1F33F}',
    sprout: '\u{1F331}',
    shield: '\u{1F6E1}',
    globe: '\u{1F30D}',
    trophy: '\u{1F3C6}',
  };
  const tipIcons = {
    bus: '\u{1F68C}', bulb: '\u{1F4A1}', salad: '\u{1F957}',
    recycle: '\u267B', tree: '\u{1F333}', spark: '\u2728',
  };

  async function load() {
    E = window.EcoBuddy;
    const data = await E.getJSON('/api/dashboard-data');

    document.getElementById('hello').innerHTML =
      `Welcome, ${escapeHtml(data.name)} <span class="leaf">\u{1F331}</span>`;
    document.getElementById('todayTotal').textContent = data.today_total.toFixed(2);
    document.getElementById('weekTotal').textContent = data.week_total.toFixed(2);
    document.getElementById('monthTotal').textContent = data.month_total.toFixed(2);
    document.getElementById('goalTarget').textContent = data.goal_target.toFixed(0);
    document.getElementById('goalBar').style.width = data.goal_progress_pct + '%';
    document.getElementById('score').textContent = data.score;
    document.getElementById('points').textContent = data.points;

    const tipsEl = document.getElementById('tips');
    tipsEl.innerHTML = data.suggestions.map(t =>
      `<li><span class="tip-icon">${tipIcons[t.icon] || '\u2728'}</span><span>${escapeHtml(t.text)}</span></li>`
    ).join('');

    const badgesEl = document.getElementById('badges');
    badgesEl.innerHTML = data.badges.map(b =>
      `<div class="badge ${b.earned ? 'earned' : ''}">
        <div class="b-icon">${badgeIcons[b.icon] || '\u{1F33F}'}</div>
        <h5>${escapeHtml(b.name)}</h5>
        <span>${b.earned ? 'Earned' : b.min + '+ pts'}</span>
      </div>`
    ).join('');

    drawPie(data.categories);
    drawLine(data.series);
    drawCompare(data.compare);
  }

  function drawPie(cats) {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;
    pieChart && pieChart.destroy();
    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Transport', 'Energy', 'Food', 'Waste'],
        datasets: [{
          data: [cats.transport, cats.energy, cats.food, cats.waste],
          backgroundColor: [E.palette.transport, E.palette.energy, E.palette.food, E.palette.waste],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: E.chartTextColor(), boxWidth: 12, padding: 14 } },
        },
      },
    });
  }

  function drawLine(series) {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;
    lineChart && lineChart.destroy();
    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map(s => E.formatDate(s.date)),
        datasets: [{
          label: 'kg CO\u2082',
          data: series.map(s => s.total),
          borderColor: E.palette.line,
          backgroundColor: E.palette.lineBg,
          tension: .35, fill: true, borderWidth: 2, pointRadius: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: E.chartTextColor(), maxTicksLimit: 8 }, grid: { color: E.chartGridColor() } },
          y: { ticks: { color: E.chartTextColor() }, grid: { color: E.chartGridColor() }, beginAtZero: true },
        },
      },
    });
  }

  function drawCompare(c) {
    const ctx = document.getElementById('compareChart');
    if (!ctx) return;
    compareChart && compareChart.destroy();
    compareChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['You', 'India avg', 'Global avg'],
        datasets: [{
          data: [c.you, c.india, c.global],
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
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

 async function safeLoad() {
  try {
    if (!window.EcoBuddy) {
      setTimeout(safeLoad, 500);
      return;
    }

    if (typeof Chart === "undefined") {
      setTimeout(safeLoad, 1000);
      return;
    }

    await load();
  } catch (err) {
    console.error("Dashboard load error:", err);
    alert("Unable to load dashboard data. Please refresh the page or log in again.");
  }
}

safeLoad();
