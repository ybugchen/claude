const request = require('supertest');
const app = require('../src/server');
const { generateGameData } = require('../src/data/gameData');
const { cleanGameData } = require('../src/game-analytics/dataCleaner');
const { analyzeUserSegmentation } = require('../src/game-analytics/userSegmentation');
const { analyzeContentExperience } = require('../src/game-analytics/contentAnalysis');
const { analyzeItemConversion } = require('../src/game-analytics/itemConversion');
const { generateAssessment } = require('../src/game-analytics/assessmentEngine');

describe('Game Analytics - Data Generation', () => {
  test('should generate valid game data with all required fields', () => {
    const data = generateGameData();

    expect(data.versionInfo).toBeDefined();
    expect(data.versionInfo.versionId).toBe('v2.5');
    expect(data.players).toHaveLength(500);
    expect(data.loginRecords.length).toBeGreaterThan(0);
    expect(data.contentExperience.length).toBeGreaterThan(0);
    expect(data.itemTransactions.length).toBeGreaterThan(0);
    expect(data.items).toHaveLength(12);
  });

  test('players should have correct structure', () => {
    const data = generateGameData();
    const player = data.players[0];

    expect(player).toHaveProperty('playerId');
    expect(player).toHaveProperty('level');
    expect(player).toHaveProperty('payTier');
    expect(player).toHaveProperty('totalPayAmount');
    expect(player).toHaveProperty('versionPayAmount');
  });
});

describe('Game Analytics - Data Cleaning', () => {
  let rawData;

  beforeEach(() => {
    rawData = generateGameData();
  });

  test('should clean data and produce a report', () => {
    const { cleanedData, cleanReport } = cleanGameData(rawData);

    expect(cleanedData.players.length).toBeLessThanOrEqual(rawData.players.length);
    expect(cleanedData.loginRecords.length).toBeLessThanOrEqual(rawData.loginRecords.length);
    expect(cleanReport.original).toBeDefined();
    expect(cleanReport.cleaned).toBeDefined();
    expect(cleanReport.removedRecords).toBeDefined();
  });

  test('should remove records with null playerId', () => {
    const { cleanedData } = cleanGameData(rawData);

    const nullPlayerLogin = cleanedData.loginRecords.filter(r => r.playerId === null);
    expect(nullPlayerLogin).toHaveLength(0);
  });

  test('should fix negative online minutes', () => {
    const { cleanedData } = cleanGameData(rawData);

    const negativeMinutes = cleanedData.loginRecords.filter(r => r.totalOnlineMinutes < 0);
    expect(negativeMinutes).toHaveLength(0);
  });

  test('should clamp satisfaction to 1-5 range', () => {
    const { cleanedData } = cleanGameData(rawData);

    for (const r of cleanedData.contentExperience) {
      expect(r.satisfaction).toBeGreaterThanOrEqual(1);
      expect(r.satisfaction).toBeLessThanOrEqual(5);
    }
  });

  test('should remove negative quantity transactions', () => {
    const { cleanedData } = cleanGameData(rawData);

    const negQty = cleanedData.itemTransactions.filter(r => r.quantity < 0);
    expect(negQty).toHaveLength(0);
  });
});

describe('Game Analytics - User Segmentation', () => {
  let cleanedData;

  beforeEach(() => {
    const rawData = generateGameData();
    ({ cleanedData } = cleanGameData(rawData));
  });

  test('should produce segmentation with all sections', () => {
    const result = analyzeUserSegmentation(cleanedData);

    expect(result.summary).toBeDefined();
    expect(result.paySegments).toBeDefined();
    expect(result.activitySegments).toBeDefined();
    expect(result.lifecycleSegments).toBeDefined();
    expect(result.crossAnalysis).toBeDefined();
  });

  test('pay segments should cover all tiers', () => {
    const result = analyzeUserSegmentation(cleanedData);
    const tiers = ['免费', '小R', '中R', '大R', '超R'];

    for (const tier of tiers) {
      expect(result.paySegments[tier]).toBeDefined();
      expect(result.paySegments[tier].playerCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('activity segments should sum to total players', () => {
    const result = analyzeUserSegmentation(cleanedData);
    const totalFromSegments = Object.values(result.activitySegments)
      .reduce((s, seg) => s + seg.playerCount, 0);

    expect(totalFromSegments).toBe(cleanedData.players.length);
  });

  test('summary should have valid metrics', () => {
    const result = analyzeUserSegmentation(cleanedData);

    expect(result.summary.totalPlayers).toBe(cleanedData.players.length);
    expect(result.summary.payingRate).toBeGreaterThanOrEqual(0);
    expect(result.summary.payingRate).toBeLessThanOrEqual(100);
    expect(result.summary.day7Retention).toBeGreaterThanOrEqual(0);
    expect(result.summary.day28Retention).toBeGreaterThanOrEqual(0);
  });
});

describe('Game Analytics - Content Analysis', () => {
  let cleanedData;

  beforeEach(() => {
    const rawData = generateGameData();
    ({ cleanedData } = cleanGameData(rawData));
  });

  test('should produce content analysis with all sections', () => {
    const result = analyzeContentExperience(cleanedData);

    expect(result.contentOverview).toBeDefined();
    expect(result.contentFunnel).toBeDefined();
    expect(result.contentRetentionImpact).toBeDefined();
    expect(result.satisfactionRanking).toBeDefined();
    expect(result.typeComparison).toBeDefined();
  });

  test('content funnel should have decreasing counts', () => {
    const result = analyzeContentExperience(cleanedData);
    const f = result.contentFunnel;

    expect(f.totalPlayers).toBeGreaterThanOrEqual(f.touchedNewContent);
    expect(f.touchedNewContent).toBeGreaterThanOrEqual(f.multiContentPlayers);
  });

  test('satisfaction ranking should be sorted descending', () => {
    const result = analyzeContentExperience(cleanedData);

    for (let i = 1; i < result.satisfactionRanking.length; i++) {
      expect(result.satisfactionRanking[i - 1].avgSatisfaction)
        .toBeGreaterThanOrEqual(result.satisfactionRanking[i].avgSatisfaction);
    }
  });
});

describe('Game Analytics - Item Conversion', () => {
  let cleanedData;

  beforeEach(() => {
    const rawData = generateGameData();
    ({ cleanedData } = cleanGameData(rawData));
  });

  test('should produce item conversion analysis', () => {
    const result = analyzeItemConversion(cleanedData);

    expect(result.itemSalesOverview).toBeDefined();
    expect(result.revenueStructure).toBeDefined();
    expect(result.paymentFunnel).toBeDefined();
    expect(result.consumptionAnalysis).toBeDefined();
    expect(result.commercialMetrics).toBeDefined();
  });

  test('revenue structure percentages should sum to ~100%', () => {
    const result = analyzeItemConversion(cleanedData);
    const total = result.revenueStructure.rmbPercentage + result.revenueStructure.diamondPercentage;

    expect(total).toBeCloseTo(100, 0);
  });

  test('consumption rate should be between 0 and 100', () => {
    const result = analyzeItemConversion(cleanedData);

    for (const [, data] of Object.entries(result.consumptionAnalysis)) {
      expect(data.consumptionRate).toBeGreaterThanOrEqual(0);
      expect(data.consumptionRate).toBeLessThanOrEqual(100);
    }
  });
});

describe('Game Analytics - Assessment Engine', () => {
  let assessment;
  let cleanedData;

  beforeEach(() => {
    const rawData = generateGameData();
    const cleaned = cleanGameData(rawData);
    cleanedData = cleaned.cleanedData;
    const cleanReport = cleaned.cleanReport;
    const segmentation = analyzeUserSegmentation(cleanedData);
    const contentAnalysis = analyzeContentExperience(cleanedData);
    const itemConversion = analyzeItemConversion(cleanedData);
    assessment = generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport, cleanedData.versionInfo);
  });

  test('should produce assessment with all sections', () => {
    expect(assessment.contentQuality).toBeDefined();
    expect(assessment.commercialization).toBeDefined();
    expect(assessment.userHealth).toBeDefined();
    expect(assessment.dataQuality).toBeDefined();
    expect(assessment.overallScore).toBeDefined();
    expect(assessment.recommendations).toBeDefined();
    expect(assessment.planVsActual).toBeDefined();
    expect(assessment.nextVersionSuggestions).toBeDefined();
  });

  test('scores should be between 0 and 100', () => {
    expect(assessment.overallScore.score).toBeGreaterThanOrEqual(0);
    expect(assessment.overallScore.score).toBeLessThanOrEqual(100);
    expect(assessment.contentQuality.avgScore).toBeGreaterThanOrEqual(0);
    expect(assessment.commercialization.score).toBeGreaterThanOrEqual(0);
    expect(assessment.userHealth.score).toBeGreaterThanOrEqual(0);
  });

  test('grades should be valid', () => {
    const validGrades = ['S', 'A', 'B', 'C', 'D', 'F'];
    expect(validGrades).toContain(assessment.overallScore.grade);
    expect(validGrades).toContain(assessment.contentQuality.grade);
    expect(validGrades).toContain(assessment.commercialization.grade);
  });

  test('recommendations should have required fields', () => {
    expect(assessment.recommendations.length).toBeGreaterThan(0);
    for (const rec of assessment.recommendations) {
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('priority');
      expect(rec).toHaveProperty('issue');
      expect(rec).toHaveProperty('suggestion');
      expect(rec).toHaveProperty('expectedImpact');
    }
  });

  test('recommendations should be sorted by priority', () => {
    const priorityOrder = { '高': 0, '中': 1, '低': 2 };
    for (let i = 1; i < assessment.recommendations.length; i++) {
      expect(priorityOrder[assessment.recommendations[i - 1].priority])
        .toBeLessThanOrEqual(priorityOrder[assessment.recommendations[i].priority]);
    }
  });

  test('planVsActual should contain overall and content metrics', () => {
    const pva = assessment.planVsActual;
    expect(pva.overallMetrics).toBeDefined();
    expect(pva.overallMetrics.length).toBeGreaterThan(0);
    expect(pva.overallAchievementRate).toBeGreaterThanOrEqual(0);
    expect(pva.contentMetrics).toBeDefined();
    expect(pva.contentMetrics.length).toBeGreaterThan(0);
    expect(pva.goalReview).toBeDefined();
    expect(pva.goalReview.length).toBeGreaterThan(0);

    // Each overall metric should have target, actual, gap, status
    for (const m of pva.overallMetrics) {
      expect(m).toHaveProperty('metric');
      expect(m).toHaveProperty('target');
      expect(m).toHaveProperty('actual');
      expect(m).toHaveProperty('gap');
      expect(m).toHaveProperty('status');
      expect(['达标', '接近', '未达标']).toContain(m.status);
    }
  });

  test('planVsActual content metrics should have dimensions and achievement status', () => {
    for (const cm of assessment.planVsActual.contentMetrics) {
      expect(cm).toHaveProperty('contentId');
      expect(cm).toHaveProperty('name');
      expect(cm).toHaveProperty('designGoal');
      expect(cm).toHaveProperty('dimensions');
      expect(cm.dimensions.length).toBeGreaterThan(0);
      expect(cm).toHaveProperty('achievementRate');
      expect(['全部达标', '部分达标', '多数未达标']).toContain(cm.overallStatus);
    }
  });

  test('planVsActual goalReview should assess each version goal', () => {
    for (const gr of assessment.planVsActual.goalReview) {
      expect(gr).toHaveProperty('goal');
      expect(gr).toHaveProperty('assessment');
      expect(gr.assessment).toHaveProperty('status');
      expect(gr.assessment).toHaveProperty('evidence');
    }
  });

  test('nextVersionSuggestions should have required fields', () => {
    expect(assessment.nextVersionSuggestions.length).toBeGreaterThan(0);
    for (const s of assessment.nextVersionSuggestions) {
      expect(s).toHaveProperty('category');
      expect(s).toHaveProperty('priority');
      expect(s).toHaveProperty('insight');
      expect(s).toHaveProperty('suggestion');
      expect(s).toHaveProperty('rationale');
    }
  });

  test('nextVersionSuggestions should be sorted by priority', () => {
    const priorityOrder = { '高': 0, '中': 1, '低': 2 };
    for (let i = 1; i < assessment.nextVersionSuggestions.length; i++) {
      expect(priorityOrder[assessment.nextVersionSuggestions[i - 1].priority])
        .toBeLessThanOrEqual(priorityOrder[assessment.nextVersionSuggestions[i].priority]);
    }
  });

  test('should work without planningContext (graceful fallback)', () => {
    const rawData = generateGameData();
    const { cleanedData: cd, cleanReport: cr } = cleanGameData(rawData);
    // Remove planningContext
    const versionInfoNoPlan = { ...cd.versionInfo };
    delete versionInfoNoPlan.planningContext;
    const seg = analyzeUserSegmentation(cd);
    const ca = analyzeContentExperience(cd);
    const ic = analyzeItemConversion(cd);
    const result = generateAssessment(seg, ca, ic, cr, versionInfoNoPlan);

    expect(result.planVsActual).toBeNull();
    expect(result.nextVersionSuggestions).toBeDefined();
    expect(result.nextVersionSuggestions.length).toBeGreaterThan(0);
  });
});

describe('Game Analytics - API Endpoints', () => {
  test('GET /api/game-analytics/full-report should return complete report', async () => {
    const res = await request(app).get('/api/game-analytics/full-report');

    expect(res.status).toBe(200);
    expect(res.body.versionInfo).toBeDefined();
    expect(res.body.cleanReport).toBeDefined();
    expect(res.body.segmentation).toBeDefined();
    expect(res.body.contentAnalysis).toBeDefined();
    expect(res.body.itemConversion).toBeDefined();
    expect(res.body.assessment).toBeDefined();
    expect(res.body.generatedAt).toBeDefined();
  });

  test('GET /api/game-analytics/assessment should return assessment', async () => {
    const res = await request(app).get('/api/game-analytics/assessment');

    expect(res.status).toBe(200);
    expect(res.body.overallScore).toBeDefined();
    expect(res.body.recommendations).toBeDefined();
  });

  test('GET /api/game-analytics/segmentation should return segmentation', async () => {
    const res = await request(app).get('/api/game-analytics/segmentation');

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.paySegments).toBeDefined();
  });

  test('GET /api/game-analytics/content should return content analysis', async () => {
    const res = await request(app).get('/api/game-analytics/content');

    expect(res.status).toBe(200);
    expect(res.body.contentOverview).toBeDefined();
  });

  test('GET /api/game-analytics/items should return item conversion', async () => {
    const res = await request(app).get('/api/game-analytics/items');

    expect(res.status).toBe(200);
    expect(res.body.itemSalesOverview).toBeDefined();
  });

  test('POST /api/game-analytics/refresh should regenerate data', async () => {
    const res = await request(app).post('/api/game-analytics/refresh');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('数据已刷新');
    expect(res.body.generatedAt).toBeDefined();
  });
});
