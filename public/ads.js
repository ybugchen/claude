const API_BASE = '/api/ads';

const PLATFORM_LABELS = {
  google: 'Google 广告',
  meta: 'Meta 广告',
  tiktok: 'TikTok 广告',
  twitter: 'Twitter 广告',
  linkedin: 'LinkedIn 广告',
};

const STATUS_LABELS = {
  active: '投放中',
  paused: '已暂停',
  completed: '已完成',
};

let ads = [];
let editingId = null;

// DOM Elements
const adTableBody = document.getElementById('adTableBody');
const emptyState = document.getElementById('emptyState');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

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

function computeCTR(ad) {
  return ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
}

function computeROAS(ad) {
  return ad.spend > 0 ? (ad.revenue / ad.spend).toFixed(2) : '0.00';
}

async function fetchAds() {
  try {
    const params = new URLSearchParams();
    const platform = document.getElementById('filterPlatform').value;
    const status = document.getElementById('filterStatus').value;
    if (platform) params.set('platform', platform);
    if (status) params.set('status', status);

    const url = params.toString() ? `${API_BASE}?${params}` : API_BASE;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch ads');
    ads = await response.json();
    renderAds();
  } catch (error) {
    console.error('Error fetching ads:', error);
    alert('无法加载广告数据');
  }
}

async function createAd(data) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create ad');
    }
    await fetchAds();
    resetForm();
  } catch (error) {
    console.error('Error creating ad:', error);
    alert('添加广告失败: ' + error.message);
  }
}

async function updateAd(id, data) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update ad');
    }
    await fetchAds();
    resetForm();
  } catch (error) {
    console.error('Error updating ad:', error);
    alert('更新广告失败: ' + error.message);
  }
}

async function deleteAd(id) {
  if (!confirm('确定要删除这条广告数据吗？')) return;
  try {
    const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete ad');
    await fetchAds();
  } catch (error) {
    console.error('Error deleting ad:', error);
    alert('删除广告失败');
  }
}

function getFormData() {
  return {
    platform: document.getElementById('platformSelect').value,
    status: document.getElementById('statusSelect').value,
    campaignName: document.getElementById('campaignInput').value,
    adSetName: document.getElementById('adSetInput').value,
    adName: document.getElementById('adNameInput').value,
    impressions: parseInt(document.getElementById('impressionsInput').value) || 0,
    clicks: parseInt(document.getElementById('clicksInput').value) || 0,
    conversions: parseInt(document.getElementById('conversionsInput').value) || 0,
    spend: parseFloat(document.getElementById('spendInput').value) || 0,
    revenue: parseFloat(document.getElementById('revenueInput').value) || 0,
    startDate: document.getElementById('startDateInput').value,
    endDate: document.getElementById('endDateInput').value,
  };
}

function resetForm() {
  editingId = null;
  formTitle.textContent = '添加广告';
  submitBtn.textContent = '添加广告';
  cancelBtn.classList.add('hidden');
  document.getElementById('platformSelect').value = 'google';
  document.getElementById('statusSelect').value = 'active';
  document.getElementById('campaignInput').value = '';
  document.getElementById('adSetInput').value = '';
  document.getElementById('adNameInput').value = '';
  document.getElementById('impressionsInput').value = '0';
  document.getElementById('clicksInput').value = '0';
  document.getElementById('conversionsInput').value = '0';
  document.getElementById('spendInput').value = '0';
  document.getElementById('revenueInput').value = '0';
  document.getElementById('startDateInput').value = '';
  document.getElementById('endDateInput').value = '';
}

function fillForm(ad) {
  editingId = ad.id;
  formTitle.textContent = '编辑广告';
  submitBtn.textContent = '更新广告';
  cancelBtn.classList.remove('hidden');
  document.getElementById('platformSelect').value = ad.platform;
  document.getElementById('statusSelect').value = ad.status;
  document.getElementById('campaignInput').value = ad.campaignName;
  document.getElementById('adSetInput').value = ad.adSetName;
  document.getElementById('adNameInput').value = ad.adName;
  document.getElementById('impressionsInput').value = ad.impressions;
  document.getElementById('clicksInput').value = ad.clicks;
  document.getElementById('conversionsInput').value = ad.conversions;
  document.getElementById('spendInput').value = ad.spend;
  document.getElementById('revenueInput').value = ad.revenue;
  document.getElementById('startDateInput').value = ad.startDate;
  document.getElementById('endDateInput').value = ad.endDate;
  document.getElementById('adForm').scrollIntoView({ behavior: 'smooth' });
}

function handleSubmit() {
  const data = getFormData();
  if (!data.campaignName.trim()) {
    alert('请输入活动名称');
    return;
  }
  if (!data.startDate || !data.endDate) {
    alert('请选择开始和结束日期');
    return;
  }
  if (editingId) {
    updateAd(editingId, data);
  } else {
    createAd(data);
  }
}

function handleCancel() {
  resetForm();
}

function handleEdit(id) {
  const ad = ads.find(a => a.id === id);
  if (ad) fillForm(ad);
}

function renderAds() {
  if (ads.length === 0) {
    emptyState.classList.remove('hidden');
    adTableBody.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  adTableBody.innerHTML = ads.map(ad => `
    <tr>
      <td><span class="platform-badge ${ad.platform}">${escapeHtml(PLATFORM_LABELS[ad.platform] || ad.platform)}</span></td>
      <td>${escapeHtml(ad.campaignName)}</td>
      <td>${formatCurrency(ad.spend)}</td>
      <td>${formatCurrency(ad.revenue)}</td>
      <td>${computeCTR(ad)}%</td>
      <td>${computeROAS(ad)}x</td>
      <td><span class="status-badge ${ad.status}">${STATUS_LABELS[ad.status] || ad.status}</span></td>
      <td class="actions">
        <button class="btn btn-edit" onclick="handleEdit(${ad.id})">编辑</button>
        <button class="btn btn-danger" onclick="deleteAd(${ad.id})">删除</button>
      </td>
    </tr>
  `).join('');
}

// Initialize
fetchAds();
