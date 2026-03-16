const express = require('express');
const router = express.Router();
const adStore = require('../data/adStore');

function parseFilters(query) {
  const filters = {};
  if (query.platform) filters.platform = query.platform;
  if (query.status) filters.status = query.status;
  if (query.startDate) filters.startDate = query.startDate;
  if (query.endDate) filters.endDate = query.endDate;
  return filters;
}

// Get aggregate summary
router.get('/summary', (req, res) => {
  const filters = parseFilters(req.query);
  res.json(adStore.getSummary(filters));
});

// Get metrics grouped by platform
router.get('/by-platform', (req, res) => {
  const filters = parseFilters(req.query);
  res.json(adStore.getByPlatform(filters));
});

// Get metrics grouped by campaign
router.get('/by-campaign', (req, res) => {
  const filters = parseFilters(req.query);
  res.json(adStore.getByCampaign(filters));
});

// Get top performing ads
router.get('/top-performers', (req, res) => {
  const metric = req.query.metric || 'roas';
  const limit = parseInt(req.query.limit) || 10;
  res.json(adStore.getTopPerformers(metric, limit));
});

module.exports = router;
