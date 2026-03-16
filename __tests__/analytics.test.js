const request = require('supertest');
const app = require('../src/server');
const adStore = require('../src/data/adStore');

describe('Analytics API', () => {
  beforeEach(() => {
    adStore.reset();
    adStore.create({
      platform: 'google', campaignName: 'Google Campaign A',
      impressions: 10000, clicks: 500, conversions: 50,
      spend: 1000, revenue: 5000,
      startDate: '2026-01-01', endDate: '2026-01-31',
    });
    adStore.create({
      platform: 'google', campaignName: 'Google Campaign B',
      impressions: 20000, clicks: 800, conversions: 80,
      spend: 2000, revenue: 8000,
      startDate: '2026-02-01', endDate: '2026-02-28',
    });
    adStore.create({
      platform: 'meta', campaignName: 'Meta Campaign',
      impressions: 30000, clicks: 1500, conversions: 150,
      spend: 3000, revenue: 12000,
      startDate: '2026-01-15', endDate: '2026-02-15',
    });
  });

  describe('GET /api/ads/analytics/summary', () => {
    it('should return aggregate metrics', async () => {
      const response = await request(app).get('/api/ads/analytics/summary');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSpend', 6000);
      expect(response.body).toHaveProperty('totalRevenue', 25000);
      expect(response.body).toHaveProperty('totalImpressions', 60000);
      expect(response.body).toHaveProperty('totalClicks', 2800);
      expect(response.body).toHaveProperty('totalConversions', 280);
      expect(response.body).toHaveProperty('adCount', 3);
      expect(response.body).toHaveProperty('ctr');
      expect(response.body).toHaveProperty('cpc');
      expect(response.body).toHaveProperty('roas');
      expect(response.body).toHaveProperty('roi');
    });

    it('should filter by platform', async () => {
      const response = await request(app).get('/api/ads/analytics/summary?platform=google');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSpend', 3000);
      expect(response.body).toHaveProperty('adCount', 2);
    });

    it('should return zeros when no data matches', async () => {
      const response = await request(app).get('/api/ads/analytics/summary?platform=linkedin');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSpend', 0);
      expect(response.body).toHaveProperty('totalRevenue', 0);
      expect(response.body).toHaveProperty('ctr', 0);
      expect(response.body).toHaveProperty('roas', 0);
      expect(response.body).toHaveProperty('adCount', 0);
    });
  });

  describe('GET /api/ads/analytics/by-platform', () => {
    it('should return metrics grouped by platform', async () => {
      const response = await request(app).get('/api/ads/analytics/by-platform');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      const google = response.body.find(p => p.platform === 'google');
      const meta = response.body.find(p => p.platform === 'meta');
      expect(google).toBeDefined();
      expect(meta).toBeDefined();
      expect(google.totalSpend).toBe(3000);
      expect(google.adCount).toBe(2);
      expect(meta.totalSpend).toBe(3000);
      expect(meta.adCount).toBe(1);
    });

    it('should include computed metrics per platform', async () => {
      const response = await request(app).get('/api/ads/analytics/by-platform');
      const google = response.body.find(p => p.platform === 'google');
      expect(google).toHaveProperty('ctr');
      expect(google).toHaveProperty('cpc');
      expect(google).toHaveProperty('roas');
    });
  });

  describe('GET /api/ads/analytics/by-campaign', () => {
    it('should return metrics grouped by campaign', async () => {
      const response = await request(app).get('/api/ads/analytics/by-campaign');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter by platform', async () => {
      const response = await request(app).get('/api/ads/analytics/by-campaign?platform=google');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every(c => c.platform === 'google')).toBe(true);
    });
  });

  describe('GET /api/ads/analytics/top-performers', () => {
    it('should return top performers by roas by default', async () => {
      const response = await request(app).get('/api/ads/analytics/top-performers');
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('roas');
      // Check sorted descending
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].roas).toBeGreaterThanOrEqual(response.body[i].roas);
      }
    });

    it('should respect limit param', async () => {
      const response = await request(app).get('/api/ads/analytics/top-performers?limit=2');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should sort by specified metric', async () => {
      const response = await request(app).get('/api/ads/analytics/top-performers?metric=ctr');
      expect(response.status).toBe(200);
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].ctr).toBeGreaterThanOrEqual(response.body[i].ctr);
      }
    });
  });
});
