const ANALYTICS_BASE = '/api/ads/analytics';

const PLATFORM_LABELS = {
  google: 'Google 广告',
  meta: 'Meta 广告',
  tiktok: 'TikTok 广告',
  twitter: 'Twitter 广告',
  linkedin: 'LinkedIn 广告',
};

const PLATFORM_COLORS = {
  google: '#4285f4',
  meta: '#1877f2',
  tiktok: '#ff0050',
  twitter: '#1da1f2',
  linkedin: '#0a66c2',
};

let charts = {};

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  return num.toLocaleString('zh-CN');
}

function formatCurrency(num) {
  return '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getFilterParams() {
  const params = new URLSearchParams();
  const platform = document.getElementById('filterPlatform').value;
  if (platform) params.set('platform', platform);
  return params.toString();
}

async function fetchSummary() {
  const qs = getFilterParams();
  const url = qs ? `${ANALYTICS_BASE}/summary?${qs}` : `${ANALYTICS_BASE}/summary`;
  const response = await fetch(url);
  return response.json();
}

async function fetchByPlatform() {
  const qs = getFilterParams();
  const url = qs ? `${ANALYTICS_BASE}/by-platform?${qs}` : `${ANALYTICS_BASE}/by-platform`;
  const response = await fetch(url);
  return response.json();
}

async function fetchTopPerformers() {
  const response = await fetch(`${ANALYTICS_BASE}/top-performers?metric=roas&limit=10`);
  return response.json();
}

function renderKPICards(summary) {
  document.getElementById('kpiSpend').textContent = formatCurrency(summary.totalSpend);
  document.getElementById('kpiRevenue').textContent = formatCurrency(summary.totalRevenue);
  document.getElementById('kpiImpressions').textContent = formatNumber(summary.totalImpressions);
  document.getElementById('kpiClicks').textContent = formatNumber(summary.totalClicks);
  document.getElementById('kpiConversions').textContent = formatNumber(summary.totalConversions);
  document.getElementById('kpiCTR').textContent = summary.ctr + '%';
  document.getElementById('kpiCPC').textContent = formatCurrency(summary.cpc);
  document.getElementById('kpiROAS').textContent = summary.roas + 'x';
}

function renderSpendRevenueChart(platformData) {
  const ctx = document.getElementById('spendRevenueChart').getContext('2d');
  const labels = platformData.map(p => PLATFORM_LABELS[p.platform] || p.platform);
  const colors = platformData.map(p => PLATFORM_COLORS[p.platform] || '#999');

  if (charts.spendRevenue) charts.spendRevenue.destroy();

  charts.spendRevenue = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '花费',
          data: platformData.map(p => p.totalSpend),
          backgroundColor: 'rgba(255, 71, 87, 0.7)',
          borderColor: '#ff4757',
          borderWidth: 1,
        },
        {
          label: '收入',
          data: platformData.map(p => p.totalRevenue),
          backgroundColor: 'rgba(46, 213, 115, 0.7)',
          borderColor: '#2ed573',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderSpendPieChart(platformData) {
  const ctx = document.getElementById('spendPieChart').getContext('2d');
  const labels = platformData.map(p => PLATFORM_LABELS[p.platform] || p.platform);
  const colors = platformData.map(p => PLATFORM_COLORS[p.platform] || '#999');

  if (charts.spendPie) charts.spendPie.destroy();

  charts.spendPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: platformData.map(p => p.totalSpend),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

function renderCTRChart(platformData) {
  const ctx = document.getElementById('ctrChart').getContext('2d');
  const labels = platformData.map(p => PLATFORM_LABELS[p.platform] || p.platform);
  const colors = platformData.map(p => PLATFORM_COLORS[p.platform] || '#999');

  if (charts.ctr) charts.ctr.destroy();

  charts.ctr = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'CTR (%)',
        data: platformData.map(p => p.ctr),
        backgroundColor: colors.map(c => c + 'b3'),
        borderColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderROASChart(platformData) {
  const ctx = document.getElementById('roasChart').getContext('2d');
  const labels = platformData.map(p => PLATFORM_LABELS[p.platform] || p.platform);
  const colors = platformData.map(p => PLATFORM_COLORS[p.platform] || '#999');

  if (charts.roas) charts.roas.destroy();

  charts.roas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'ROAS',
        data: platformData.map(p => p.roas),
        backgroundColor: colors.map(c => c + 'b3'),
        borderColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderTopPerformers(performers) {
  const tbody = document.getElementById('topPerformersBody');
  tbody.innerHTML = performers.map((ad, i) => `
    <tr>
      <td><strong>${i + 1}</strong></td>
      <td><span class="platform-badge ${ad.platform}">${escapeHtml(PLATFORM_LABELS[ad.platform] || ad.platform)}</span></td>
      <td>${escapeHtml(ad.campaignName)}</td>
      <td>${escapeHtml(ad.adName || '-')}</td>
      <td>${formatCurrency(ad.spend)}</td>
      <td>${formatCurrency(ad.revenue)}</td>
      <td>${ad.ctr}%</td>
      <td><strong>${ad.roas}x</strong></td>
    </tr>
  `).join('');
}

async function refreshDashboard() {
  try {
    const [summary, platformData, topPerformers] = await Promise.all([
      fetchSummary(),
      fetchByPlatform(),
      fetchTopPerformers(),
    ]);

    renderKPICards(summary);
    renderSpendRevenueChart(platformData);
    renderSpendPieChart(platformData);
    renderCTRChart(platformData);
    renderROASChart(platformData);
    renderTopPerformers(topPerformers);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    alert('加载仪表盘数据失败');
  }
}

// Initialize
refreshDashboard();
