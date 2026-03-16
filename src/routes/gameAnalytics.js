const express = require('express');
const router = express.Router();
const path = require('path');
const { generateGameData, generateHistoricalVersions } = require('../data/gameData');
const { cleanGameData } = require('../game-analytics/dataCleaner');
const { loadFromCSV } = require('../game-analytics/csvLoader');
const { analyzeUserSegmentation } = require('../game-analytics/userSegmentation');
const { analyzeContentExperience } = require('../game-analytics/contentAnalysis');
const { analyzeItemConversion } = require('../game-analytics/itemConversion');
const { generateAssessment } = require('../game-analytics/assessmentEngine');
const { analyzeVersionHistory, extractCurrentVersionSummary } = require('../game-analytics/versionHistory');

// 缓存分析结果（避免每次请求重新计算）
let cachedResult = null;

function runFullAnalysis() {
  // 1. 生成模拟数据
  const rawData = generateGameData();

  // 2. 数据清洗
  const { cleanedData, cleanReport } = cleanGameData(rawData);

  // 3. 历史版本数据
  const historicalVersions = generateHistoricalVersions();

  // 4-7. 分析 + 评估 + 历史对比
  return buildReport(cleanedData, cleanReport, historicalVersions);
}

/**
 * 从 CSV 文件流式加载并分析
 * @param {object} csvOptions - CSV 文件路径配置
 * @returns {Promise<object>} 完整分析报告
 */
async function runCSVAnalysis(csvOptions) {
  // 流式加载 + 边解析边清洗
  const { cleanedData, cleanReport } = await loadFromCSV(csvOptions);

  return buildReport(cleanedData, cleanReport);
}

function buildReport(cleanedData, cleanReport, historicalVersions) {
  const segmentation = analyzeUserSegmentation(cleanedData);
  const contentAnalysis = analyzeContentExperience(cleanedData);
  const itemConversion = analyzeItemConversion(cleanedData);
  const assessment = generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport, cleanedData.versionInfo);

  // 历史版本效益汇总
  let versionHistoryAnalysis = null;
  if (historicalVersions && historicalVersions.length > 0) {
    const currentSummary = extractCurrentVersionSummary(
      cleanedData.versionInfo, segmentation, assessment.contentQuality,
      assessment.commercialization, assessment.userHealth, assessment.overallScore,
      itemConversion, contentAnalysis
    );
    versionHistoryAnalysis = analyzeVersionHistory(historicalVersions, currentSummary);
  }

  return {
    versionInfo: cleanedData.versionInfo,
    cleanReport,
    segmentation,
    contentAnalysis,
    itemConversion,
    assessment,
    versionHistoryAnalysis,
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

// 获取历史版本效益汇总
router.get('/version-history', (req, res) => {
  if (!cachedResult) cachedResult = runFullAnalysis();
  res.json(cachedResult.versionHistoryAnalysis);
});

// 刷新数据（重新生成）
router.post('/refresh', (req, res) => {
  cachedResult = runFullAnalysis();
  res.json({ message: '数据已刷新', generatedAt: cachedResult.generatedAt });
});

// 从 CSV 文件加载并分析
router.post('/analyze-csv', async (req, res) => {
  try {
    const { dataDir, playersFile, loginRecordsFile, contentExperienceFile, itemTransactionsFile, itemsFile, versionInfo, items } = req.body;

    // 支持传目录（自动拼文件名）或传单独路径
    const csvOptions = {
      playersFile: playersFile || path.join(dataDir, 'players.csv'),
      loginRecordsFile: loginRecordsFile || path.join(dataDir, 'loginRecords.csv'),
      contentExperienceFile: contentExperienceFile || path.join(dataDir, 'contentExperience.csv'),
      itemTransactionsFile: itemTransactionsFile || path.join(dataDir, 'itemTransactions.csv'),
      itemsFile: itemsFile || path.join(dataDir, 'items.csv'),
      versionInfo,
      items,
    };

    cachedResult = await runCSVAnalysis(csvOptions);
    res.json(cachedResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
module.exports.runFullAnalysis = runFullAnalysis;
module.exports.runCSVAnalysis = runCSVAnalysis;
