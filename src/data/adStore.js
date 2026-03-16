// In-memory data store for ad records
let ads = [];
let nextId = 1;

function initSeedData() {
  const seed = [
    { platform: 'google', campaignName: '品牌搜索广告', adSetName: '核心关键词', adName: '品牌词投放A', impressions: 125000, clicks: 6250, conversions: 312, spend: 4500, revenue: 15600, startDate: '2026-01-01', endDate: '2026-01-31', status: 'completed' },
    { platform: 'google', campaignName: '品牌搜索广告', adSetName: '长尾关键词', adName: '长尾词投放B', impressions: 85000, clicks: 3400, conversions: 170, spend: 2800, revenue: 8500, startDate: '2026-02-01', endDate: '2026-02-28', status: 'completed' },
    { platform: 'meta', campaignName: '社交引流活动', adSetName: '兴趣人群', adName: '视频广告1', impressions: 230000, clicks: 9200, conversions: 460, spend: 6200, revenue: 18400, startDate: '2026-01-15', endDate: '2026-02-15', status: 'completed' },
    { platform: 'meta', campaignName: '社交引流活动', adSetName: '相似人群', adName: '轮播广告2', impressions: 180000, clicks: 5400, conversions: 270, spend: 4800, revenue: 13500, startDate: '2026-02-01', endDate: '2026-03-01', status: 'active' },
    { platform: 'tiktok', campaignName: '短视频推广', adSetName: '年轻用户', adName: '创意视频A', impressions: 450000, clicks: 22500, conversions: 900, spend: 8000, revenue: 27000, startDate: '2026-01-10', endDate: '2026-02-10', status: 'completed' },
    { platform: 'tiktok', campaignName: '短视频推广', adSetName: '泛人群', adName: '创意视频B', impressions: 320000, clicks: 12800, conversions: 512, spend: 5500, revenue: 17920, startDate: '2026-02-15', endDate: '2026-03-15', status: 'active' },
    { platform: 'twitter', campaignName: '话题推广', adSetName: '科技爱好者', adName: '推文广告1', impressions: 95000, clicks: 2850, conversions: 114, spend: 3200, revenue: 7980, startDate: '2026-01-20', endDate: '2026-02-20', status: 'completed' },
    { platform: 'twitter', campaignName: '话题推广', adSetName: '商务人群', adName: '推文广告2', impressions: 72000, clicks: 1800, conversions: 72, spend: 2400, revenue: 5040, startDate: '2026-02-20', endDate: '2026-03-20', status: 'active' },
    { platform: 'linkedin', campaignName: 'B2B获客', adSetName: '决策者', adName: '信息流广告A', impressions: 45000, clicks: 1350, conversions: 54, spend: 5400, revenue: 21600, startDate: '2026-01-05', endDate: '2026-02-05', status: 'completed' },
    { platform: 'linkedin', campaignName: 'B2B获客', adSetName: 'IT管理者', adName: '信息流广告B', impressions: 38000, clicks: 950, conversions: 38, spend: 4200, revenue: 16720, startDate: '2026-02-10', endDate: '2026-03-10', status: 'active' },
    { platform: 'google', campaignName: '展示广告网络', adSetName: '再营销', adName: '横幅广告C', impressions: 300000, clicks: 6000, conversions: 180, spend: 3600, revenue: 10800, startDate: '2026-02-01', endDate: '2026-03-01', status: 'active' },
    { platform: 'meta', campaignName: '节日促销', adSetName: '购物人群', adName: '春节促销广告', impressions: 520000, clicks: 26000, conversions: 1300, spend: 12000, revenue: 52000, startDate: '2026-01-25', endDate: '2026-02-10', status: 'completed' },
  ];
  seed.forEach(ad => adStore.create(ad));
}

function computeMetrics(totals) {
  const { impressions, clicks, conversions, spend, revenue } = totals;
  return {
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
    roas: spend > 0 ? revenue / spend : 0,
    roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
  };
}

function roundMetrics(obj) {
  const result = { ...obj };
  for (const key of ['ctr', 'cpc', 'cpm', 'cpa', 'roas', 'roi', 'conversionRate']) {
    if (typeof result[key] === 'number') {
      result[key] = Math.round(result[key] * 100) / 100;
    }
  }
  return result;
}

function applyFilters(list, filters = {}) {
  let result = list;
  if (filters.platform) {
    result = result.filter(a => a.platform === filters.platform);
  }
  if (filters.status) {
    result = result.filter(a => a.status === filters.status);
  }
  if (filters.startDate) {
    result = result.filter(a => a.endDate >= filters.startDate);
  }
  if (filters.endDate) {
    result = result.filter(a => a.startDate <= filters.endDate);
  }
  return result;
}

function aggregate(list) {
  const totals = {
    impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0,
  };
  for (const ad of list) {
    totals.impressions += ad.impressions;
    totals.clicks += ad.clicks;
    totals.conversions += ad.conversions;
    totals.spend += ad.spend;
    totals.revenue += ad.revenue;
  }
  return totals;
}

const adStore = {
  getAll(filters) {
    return [...applyFilters(ads, filters)];
  },

  getById(id) {
    return ads.find(ad => ad.id === id);
  },

  create(data) {
    const newAd = {
      id: nextId++,
      platform: data.platform,
      campaignName: data.campaignName,
      adSetName: data.adSetName || '',
      adName: data.adName || '',
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      conversions: data.conversions || 0,
      spend: data.spend || 0,
      revenue: data.revenue || 0,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };
    ads.push(newAd);
    return newAd;
  },

  update(id, updates) {
    const index = ads.findIndex(ad => ad.id === id);
    if (index === -1) return null;

    ads[index] = {
      ...ads[index],
      ...updates,
      id: ads[index].id,
      createdAt: ads[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    return ads[index];
  },

  delete(id) {
    const index = ads.findIndex(ad => ad.id === id);
    if (index === -1) return false;
    ads.splice(index, 1);
    return true;
  },

  reset() {
    ads = [];
    nextId = 1;
  },

  getSummary(filters) {
    const filtered = applyFilters(ads, filters);
    const totals = aggregate(filtered);
    const metrics = computeMetrics(totals);
    return roundMetrics({
      totalSpend: Math.round(totals.spend * 100) / 100,
      totalRevenue: Math.round(totals.revenue * 100) / 100,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalConversions: totals.conversions,
      ...metrics,
      adCount: filtered.length,
    });
  },

  getByPlatform(filters) {
    const filtered = applyFilters(ads, filters);
    const groups = {};
    for (const ad of filtered) {
      if (!groups[ad.platform]) groups[ad.platform] = [];
      groups[ad.platform].push(ad);
    }
    return Object.entries(groups).map(([platform, platformAds]) => {
      const totals = aggregate(platformAds);
      const metrics = computeMetrics(totals);
      return roundMetrics({
        platform,
        totalSpend: Math.round(totals.spend * 100) / 100,
        totalRevenue: Math.round(totals.revenue * 100) / 100,
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalConversions: totals.conversions,
        ...metrics,
        adCount: platformAds.length,
      });
    });
  },

  getByCampaign(filters) {
    const filtered = applyFilters(ads, filters);
    const groups = {};
    for (const ad of filtered) {
      if (!groups[ad.campaignName]) groups[ad.campaignName] = [];
      groups[ad.campaignName].push(ad);
    }
    return Object.entries(groups).map(([campaignName, campaignAds]) => {
      const totals = aggregate(campaignAds);
      const metrics = computeMetrics(totals);
      return roundMetrics({
        campaignName,
        platform: campaignAds[0].platform,
        totalSpend: Math.round(totals.spend * 100) / 100,
        totalRevenue: Math.round(totals.revenue * 100) / 100,
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalConversions: totals.conversions,
        ...metrics,
        adCount: campaignAds.length,
      });
    });
  },

  getTopPerformers(metric = 'roas', limit = 10) {
    const withMetrics = ads.map(ad => {
      const metrics = computeMetrics(ad);
      return roundMetrics({ ...ad, ...metrics });
    });
    withMetrics.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    return withMetrics.slice(0, limit);
  },
};

// Initialize with seed data
initSeedData();

module.exports = adStore;
