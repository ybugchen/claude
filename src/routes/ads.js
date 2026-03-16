const express = require('express');
const router = express.Router();
const adStore = require('../data/adStore');

const VALID_PLATFORMS = ['google', 'meta', 'tiktok', 'twitter', 'linkedin'];
const VALID_STATUSES = ['active', 'paused', 'completed'];

function validateAdData(data, isUpdate = false) {
  if (!isUpdate) {
    if (!data.campaignName || data.campaignName.trim() === '') {
      return 'Campaign name is required';
    }
    if (!data.platform || !VALID_PLATFORMS.includes(data.platform)) {
      return 'Platform must be one of: ' + VALID_PLATFORMS.join(', ');
    }
    if (!data.startDate) {
      return 'Start date is required';
    }
    if (!data.endDate) {
      return 'End date is required';
    }
  }

  if (data.platform !== undefined && !VALID_PLATFORMS.includes(data.platform)) {
    return 'Platform must be one of: ' + VALID_PLATFORMS.join(', ');
  }
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    return 'Status must be one of: ' + VALID_STATUSES.join(', ');
  }

  const numericFields = ['impressions', 'clicks', 'conversions', 'spend', 'revenue'];
  for (const field of numericFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== 'number' || data[field] < 0) {
        return `${field} must be a non-negative number`;
      }
    }
  }

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    return 'End date must be on or after start date';
  }

  return null;
}

// Get all ads
router.get('/', (req, res) => {
  const filters = {};
  if (req.query.platform) filters.platform = req.query.platform;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.startDate) filters.startDate = req.query.startDate;
  if (req.query.endDate) filters.endDate = req.query.endDate;
  res.json(adStore.getAll(filters));
});

// Get ad by id
router.get('/:id', (req, res) => {
  const ad = adStore.getById(parseInt(req.params.id));
  if (!ad) {
    return res.status(404).json({ error: 'Ad not found' });
  }
  res.json(ad);
});

// Create new ad
router.post('/', (req, res) => {
  const error = validateAdData(req.body);
  if (error) {
    return res.status(400).json({ error });
  }
  const newAd = adStore.create({
    ...req.body,
    campaignName: req.body.campaignName.trim(),
  });
  res.status(201).json(newAd);
});

// Batch create ads
router.post('/batch', (req, res) => {
  const { ads } = req.body;
  if (!Array.isArray(ads) || ads.length === 0) {
    return res.status(400).json({ error: 'ads must be a non-empty array' });
  }
  for (let i = 0; i < ads.length; i++) {
    const error = validateAdData(ads[i]);
    if (error) {
      return res.status(400).json({ error: `Ad at index ${i}: ${error}` });
    }
  }
  const created = ads.map(ad => adStore.create({
    ...ad,
    campaignName: ad.campaignName.trim(),
  }));
  res.status(201).json(created);
});

// Update ad
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const error = validateAdData(req.body, true);
  if (error) {
    return res.status(400).json({ error });
  }
  const updates = { ...req.body };
  if (updates.campaignName) {
    updates.campaignName = updates.campaignName.trim();
  }
  const updated = adStore.update(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Ad not found' });
  }
  res.json(updated);
});

// Delete ad
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = adStore.delete(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Ad not found' });
  }
  res.status(204).send();
});

module.exports = router;
