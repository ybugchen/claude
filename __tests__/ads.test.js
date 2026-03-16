const request = require('supertest');
const app = require('../src/server');
const adStore = require('../src/data/adStore');

const validAd = {
  platform: 'google',
  campaignName: 'Test Campaign',
  adSetName: 'Test Ad Set',
  adName: 'Test Ad',
  impressions: 10000,
  clicks: 500,
  conversions: 50,
  spend: 1000,
  revenue: 5000,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
};

describe('Ad API', () => {
  beforeEach(() => {
    adStore.reset();
    adStore.create({ ...validAd, platform: 'google', campaignName: 'Google Campaign' });
    adStore.create({ ...validAd, platform: 'meta', campaignName: 'Meta Campaign', status: 'paused' });
    adStore.create({ ...validAd, platform: 'tiktok', campaignName: 'TikTok Campaign' });
  });

  describe('GET /api/ads', () => {
    it('should return all ads', async () => {
      const response = await request(app).get('/api/ads');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it('should filter by platform', async () => {
      const response = await request(app).get('/api/ads?platform=google');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('platform', 'google');
    });

    it('should filter by status', async () => {
      const response = await request(app).get('/api/ads?status=paused');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('campaignName', 'Meta Campaign');
    });
  });

  describe('GET /api/ads/:id', () => {
    it('should return an ad by id', async () => {
      const response = await request(app).get('/api/ads/1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('campaignName', 'Google Campaign');
    });

    it('should return 404 for non-existent ad', async () => {
      const response = await request(app).get('/api/ads/999');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Ad not found');
    });
  });

  describe('POST /api/ads', () => {
    it('should create a new ad', async () => {
      const response = await request(app)
        .post('/api/ads')
        .send(validAd);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('campaignName', 'Test Campaign');
      expect(response.body).toHaveProperty('platform', 'google');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'active');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 400 if campaignName is missing', async () => {
      const { campaignName, ...noName } = validAd;
      const response = await request(app)
        .post('/api/ads')
        .send(noName);
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Campaign name/i);
    });

    it('should return 400 if platform is invalid', async () => {
      const response = await request(app)
        .post('/api/ads')
        .send({ ...validAd, platform: 'snapchat' });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/Platform/i);
    });

    it('should return 400 if numeric field is negative', async () => {
      const response = await request(app)
        .post('/api/ads')
        .send({ ...validAd, spend: -100 });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/spend/i);
    });

    it('should return 400 if endDate is before startDate', async () => {
      const response = await request(app)
        .post('/api/ads')
        .send({ ...validAd, startDate: '2026-02-01', endDate: '2026-01-01' });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/End date/i);
    });

    it('should default status to active', async () => {
      const response = await request(app)
        .post('/api/ads')
        .send(validAd);
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'active');
    });
  });

  describe('POST /api/ads/batch', () => {
    it('should create multiple ads', async () => {
      const response = await request(app)
        .post('/api/ads/batch')
        .send({ ads: [validAd, { ...validAd, campaignName: 'Another Campaign' }] });
      expect(response.status).toBe(201);
      expect(response.body).toHaveLength(2);
    });

    it('should return 400 if ads is not an array', async () => {
      const response = await request(app)
        .post('/api/ads/batch')
        .send({ ads: 'invalid' });
      expect(response.status).toBe(400);
    });

    it('should return 400 if any ad is invalid', async () => {
      const response = await request(app)
        .post('/api/ads/batch')
        .send({ ads: [validAd, { ...validAd, platform: 'invalid' }] });
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/index 1/);
    });
  });

  describe('PUT /api/ads/:id', () => {
    it('should update an ad', async () => {
      const response = await request(app)
        .put('/api/ads/1')
        .send({ campaignName: 'Updated Campaign', spend: 2000 });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaignName', 'Updated Campaign');
      expect(response.body).toHaveProperty('spend', 2000);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent ad', async () => {
      const response = await request(app)
        .put('/api/ads/999')
        .send({ campaignName: 'Updated' });
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid platform on update', async () => {
      const response = await request(app)
        .put('/api/ads/1')
        .send({ platform: 'invalid' });
      expect(response.status).toBe(400);
    });

    it('should return 400 for negative numeric field on update', async () => {
      const response = await request(app)
        .put('/api/ads/1')
        .send({ clicks: -5 });
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/ads/:id', () => {
    it('should delete an ad', async () => {
      const response = await request(app).delete('/api/ads/1');
      expect(response.status).toBe(204);

      const getResponse = await request(app).get('/api/ads/1');
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent ad', async () => {
      const response = await request(app).delete('/api/ads/999');
      expect(response.status).toBe(404);
    });
  });
});
