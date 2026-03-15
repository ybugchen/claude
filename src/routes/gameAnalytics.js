const express = require('express');
const router = express.Router();
const { generateGameData } = require('../data/gameData');
const { cleanGameData } = require('../game-analytics/dataCleaner');
const { analyzeUserSegmentation } = require('../game-analytics/userSegmentation');
const { analyzeContentExperience } = require('../game-analytics/contentAnalysis');
const { analyzeItemConversion } = require('../game-analytics/itemConversion');
const { generateAssessment } = require('../game-analytics/assessmentEngine');

// 缓存分析结果（避免每次请求重新计算）
let cachedResult = null;

function runFullAnalysis() {
  // 1. 生成模拟数据
  const rawData = generateGameData();

  // 2. 数据清洗
  const { cleanedData, cleanReport } = cleanGameData(rawData);

  // 3. 用户分层分析
  const segmentation = analyzeUserSegmentation(cleanedData);

  // 4. 版本内容体验分析
  const contentAnalysis = analyzeContentExperience(cleanedData);

  // 5. 道具转化分析
  const itemConversion = analyzeItemConversion(cleanedData);

  // 6. 综合评估与优化建议
  const assessment = generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport);

  return {
    versionInfo: cleanedData.versionInfo,
    cleanReport,
    segmentation,
    contentAnalysis,
    itemConversion,
    assessment,
    generatedAt: new Date().toISOString(),
  };
}

// 获取完整分析报告
router.get('/full-report', (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  if (!cachedResult || forceRefresh) {
    cachedResult = runFullAnalysis();
  }
  res.json(cachedResult);
});

// 获取数据清洗报告
router.get('/clean-report', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.cleanReport);
});

// 获取用户分层
router.get('/segmentation', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.segmentation);
});

// 获取内容分析
router.get('/content', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.contentAnalysis);
});

// 获取道具转化
router.get('/items', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.itemConversion);
});

// 获取评估和建议
router.get('/assessment', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.assessment);
});

// 刷新数据（重新生成）
router.post('/refresh', (req, res) => {
  cachedResult = runFullAnalysis();
  res.json({ message: '数据已刷新', generatedAt: cachedResult.generatedAt });
});

module.exports = router;
module.exports.runFullAnalysis = runFullAnalysis;
