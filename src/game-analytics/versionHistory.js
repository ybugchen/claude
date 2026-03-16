/**
 * 历史版本效益汇总分析
 * 对比多版本核心指标，输出趋势、环比变化、最佳/最差表现
 */

/**
 * 分析多版本历史趋势
 * @param {Array} historicalVersions - 历史版本摘要数组（按时间升序）
 * @param {object} currentVersionSummary - 当前版本的指标摘要
 * @returns {object} 历史效益汇总报告
 */
function analyzeVersionHistory(historicalVersions, currentVersionSummary) {
  const allVersions = [...historicalVersions, currentVersionSummary];

  // 1. 版本概览表
  const versionOverview = buildVersionOverview(allVersions);

  // 2. 核心指标趋势
  const metricTrends = buildMetricTrends(allVersions);

  // 3. 环比分析（每个版本相对上一版本的变化）
  const versionComparisons = buildVersionComparisons(allVersions);

  // 4. 最佳/最差表现
  const highlights = buildHighlights(allVersions);

  // 5. 综合趋势评估
  const trendAssessment = buildTrendAssessment(metricTrends, allVersions);

  return {
    totalVersions: allVersions.length,
    timespan: {
      from: allVersions[0].releaseDate,
      to: currentVersionSummary.dataEndDate,
    },
    versionOverview,
    metricTrends,
    versionComparisons,
    highlights,
    trendAssessment,
  };
}

/**
 * 从当前版本分析结果中提取摘要，用于历史对比
 */
function extractCurrentVersionSummary(versionInfo, segmentation, contentQuality, commercialization, userHealth, overallScore, itemConversion, contentAnalysis) {
  return {
    versionId: versionInfo.versionId,
    versionName: versionInfo.versionName,
    releaseDate: versionInfo.releaseDate,
    dataEndDate: versionInfo.dataEndDate,
    metrics: {
      totalPlayers: segmentation.summary.totalPlayers,
      day7Retention: segmentation.summary.day7Retention,
      day28Retention: segmentation.summary.day28Retention,
      payingRate: commercialization.keyMetrics.payingRate,
      arppu: commercialization.keyMetrics.arppu,
      arpu: commercialization.keyMetrics.arpu,
      avgOnlineMinutes: userHealth.keyMetrics.avgOnlineMinutes,
      totalRevenue: commercialization.keyMetrics.totalRevenue,
      contentQualityScore: contentQuality.avgScore,
      commercializationScore: commercialization.score,
      userHealthScore: userHealth.score,
      overallScore: overallScore.score,
      overallGrade: overallScore.grade,
      newContentCount: versionInfo.newContentList ? versionInfo.newContentList.length : 0,
      avgSatisfaction: contentAnalysis.satisfactionRanking.length > 0
        ? Math.round(contentAnalysis.satisfactionRanking.reduce((s, r) => s + r.avgSatisfaction, 0) / contentAnalysis.satisfactionRanking.length * 10) / 10
        : 0,
    },
  };
}

function buildVersionOverview(allVersions) {
  return allVersions.map(v => ({
    versionId: v.versionId,
    versionName: v.versionName,
    releaseDate: v.releaseDate,
    totalPlayers: v.metrics.totalPlayers,
    overallScore: v.metrics.overallScore,
    overallGrade: v.metrics.overallGrade,
    totalRevenue: v.metrics.totalRevenue,
    payingRate: v.metrics.payingRate,
    day7Retention: v.metrics.day7Retention,
    day28Retention: v.metrics.day28Retention,
    avgSatisfaction: v.metrics.avgSatisfaction,
  }));
}

const TRACKED_METRICS = [
  { key: 'totalPlayers', label: '总玩家数', unit: '人' },
  { key: 'day7Retention', label: '7日留存率', unit: '%' },
  { key: 'day28Retention', label: '28日留存率', unit: '%' },
  { key: 'payingRate', label: '付费率', unit: '%' },
  { key: 'arppu', label: 'ARPPU', unit: '元' },
  { key: 'arpu', label: 'ARPU', unit: '元' },
  { key: 'avgOnlineMinutes', label: '日均在线时长', unit: '分钟' },
  { key: 'totalRevenue', label: '总收入', unit: '元' },
  { key: 'contentQualityScore', label: '内容质量评分', unit: '分' },
  { key: 'commercializationScore', label: '商业化评分', unit: '分' },
  { key: 'userHealthScore', label: '用户健康度', unit: '分' },
  { key: 'overallScore', label: '综合评分', unit: '分' },
  { key: 'avgSatisfaction', label: '平均满意度', unit: '分' },
];

function buildMetricTrends(allVersions) {
  const trends = {};

  for (const def of TRACKED_METRICS) {
    const values = allVersions.map(v => ({
      versionId: v.versionId,
      value: v.metrics[def.key],
    }));

    const nums = values.map(v => v.value);
    const first = nums[0];
    const last = nums[nums.length - 1];
    const totalGrowth = first > 0 ? Math.round((last - first) / first * 10000) / 100 : 0;

    // 计算趋势方向：连续上升/下降/波动
    let direction;
    let consecutiveUp = 0;
    let consecutiveDown = 0;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] > nums[i - 1]) consecutiveUp++;
      else if (nums[i] < nums[i - 1]) consecutiveDown++;
    }
    const changes = nums.length - 1;
    if (consecutiveUp === changes) direction = '持续上升';
    else if (consecutiveDown === changes) direction = '持续下降';
    else if (consecutiveUp > consecutiveDown) direction = '整体上升';
    else if (consecutiveDown > consecutiveUp) direction = '整体下降';
    else direction = '波动';

    trends[def.key] = {
      label: def.label,
      unit: def.unit,
      values,
      min: Math.min(...nums),
      max: Math.max(...nums),
      totalGrowth,
      direction,
    };
  }

  return trends;
}

function buildVersionComparisons(allVersions) {
  const comparisons = [];

  for (let i = 1; i < allVersions.length; i++) {
    const prev = allVersions[i - 1];
    const curr = allVersions[i];
    const changes = {};

    for (const def of TRACKED_METRICS) {
      const prevVal = prev.metrics[def.key];
      const currVal = curr.metrics[def.key];
      const diff = Math.round((currVal - prevVal) * 100) / 100;
      const growthRate = prevVal > 0 ? Math.round((diff / prevVal) * 10000) / 100 : 0;

      changes[def.key] = {
        label: def.label,
        previous: prevVal,
        current: currVal,
        diff,
        growthRate,
        status: growthRate > 5 ? '提升' : growthRate < -5 ? '下降' : '持平',
      };
    }

    comparisons.push({
      from: prev.versionId,
      to: curr.versionId,
      fromName: prev.versionName,
      toName: curr.versionName,
      changes,
    });
  }

  return comparisons;
}

function buildHighlights(allVersions) {
  const highlights = {};

  for (const def of TRACKED_METRICS) {
    const sorted = [...allVersions].sort((a, b) => b.metrics[def.key] - a.metrics[def.key]);
    highlights[def.key] = {
      label: def.label,
      best: { versionId: sorted[0].versionId, versionName: sorted[0].versionName, value: sorted[0].metrics[def.key] },
      worst: { versionId: sorted[sorted.length - 1].versionId, versionName: sorted[sorted.length - 1].versionName, value: sorted[sorted.length - 1].metrics[def.key] },
    };
  }

  return highlights;
}

function buildTrendAssessment(metricTrends, allVersions) {
  const positiveMetrics = [];
  const negativeMetrics = [];
  const stableMetrics = [];

  for (const [key, trend] of Object.entries(metricTrends)) {
    if (trend.direction === '持续上升' || trend.direction === '整体上升') {
      positiveMetrics.push({ metric: trend.label, growth: trend.totalGrowth, direction: trend.direction });
    } else if (trend.direction === '持续下降' || trend.direction === '整体下降') {
      negativeMetrics.push({ metric: trend.label, growth: trend.totalGrowth, direction: trend.direction });
    } else {
      stableMetrics.push({ metric: trend.label, growth: trend.totalGrowth, direction: trend.direction });
    }
  }

  // 版本间收入增长率
  const revenueGrowthRates = [];
  for (let i = 1; i < allVersions.length; i++) {
    const prev = allVersions[i - 1].metrics.totalRevenue;
    const curr = allVersions[i].metrics.totalRevenue;
    revenueGrowthRates.push(prev > 0 ? Math.round((curr - prev) / prev * 10000) / 100 : 0);
  }
  const avgRevenueGrowth = revenueGrowthRates.length > 0
    ? Math.round(revenueGrowthRates.reduce((s, v) => s + v, 0) / revenueGrowthRates.length * 100) / 100
    : 0;

  // 综合评分趋势
  const scores = allVersions.map(v => v.metrics.overallScore);
  const latestScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const scoreImprovement = latestScore - firstScore;

  let overallVerdict;
  if (positiveMetrics.length >= negativeMetrics.length * 2 && scoreImprovement > 0) {
    overallVerdict = '良好发展';
  } else if (negativeMetrics.length >= positiveMetrics.length * 2) {
    overallVerdict = '需要警惕';
  } else if (scoreImprovement > 10) {
    overallVerdict = '显著进步';
  } else if (scoreImprovement > 0) {
    overallVerdict = '稳步提升';
  } else {
    overallVerdict = '亟需改善';
  }

  return {
    overallVerdict,
    scoreImprovement,
    avgRevenueGrowth,
    positiveMetrics,
    negativeMetrics,
    stableMetrics,
    summary: `跨${allVersions.length}个版本，综合评分从${firstScore}提升至${latestScore}（${scoreImprovement > 0 ? '+' : ''}${scoreImprovement}分），`
      + `版本均收入增速${avgRevenueGrowth}%。${positiveMetrics.length}项指标上升，${negativeMetrics.length}项下降，${stableMetrics.length}项波动。`,
  };
}

module.exports = { analyzeVersionHistory, extractCurrentVersionSummary };
