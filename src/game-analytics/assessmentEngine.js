/**
 * 版本质量评估与商业化评估引擎
 * 综合各分析维度得出评分和优化建议
 */

function generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport) {
  // 1. 内容质量评分
  const contentQuality = assessContentQuality(contentAnalysis);

  // 2. 商业化评估
  const commercialization = assessCommercialization(itemConversion, segmentation);

  // 3. 用户健康度评估
  const userHealth = assessUserHealth(segmentation);

  // 4. 数据质量评估
  const dataQuality = assessDataQuality(cleanReport);

  // 5. 综合评分
  const overallScore = computeOverallScore(contentQuality, commercialization, userHealth, dataQuality);

  // 6. 优化建议
  const recommendations = generateRecommendations(contentQuality, commercialization, userHealth, contentAnalysis, itemConversion, segmentation);

  return {
    contentQuality,
    commercialization,
    userHealth,
    dataQuality,
    overallScore,
    recommendations,
  };
}

function assessContentQuality(contentAnalysis) {
  const { contentOverview, contentFunnel, satisfactionRanking } = contentAnalysis;

  const contentScores = {};
  let totalScore = 0;
  let count = 0;

  for (const [id, data] of Object.entries(contentOverview)) {
    const participationScore = Math.min(100, data.participationRate * 1.5);
    const completionScore = data.avgCompletionRate;
    const satisfactionScore = (data.avgSatisfaction / 5) * 100;
    const engagementScore = Math.min(100, data.avgParticipationTimes * 10);

    const score = Math.round(
      participationScore * 0.25 +
      completionScore * 0.25 +
      satisfactionScore * 0.3 +
      engagementScore * 0.2
    );

    contentScores[id] = {
      name: data.name,
      type: data.type,
      score,
      grade: getGrade(score),
      details: {
        participationScore: Math.round(participationScore),
        completionScore: Math.round(completionScore),
        satisfactionScore: Math.round(satisfactionScore),
        engagementScore: Math.round(engagementScore),
      },
    };

    totalScore += score;
    count++;
  }

  const avgScore = count > 0 ? Math.round(totalScore / count) : 0;

  return {
    avgScore,
    grade: getGrade(avgScore),
    contentScores,
    funnelHealth: {
      touchRate: contentFunnel.touchedRate,
      deepEngageRate: contentFunnel.deepEngagedRate,
      score: Math.round((contentFunnel.touchedRate * 0.4 + contentFunnel.deepEngagedRate * 2) * 0.6),
    },
    topContent: satisfactionRanking[0]?.name || 'N/A',
    bottomContent: satisfactionRanking[satisfactionRanking.length - 1]?.name || 'N/A',
  };
}

function assessCommercialization(itemConversion, segmentation) {
  const { commercialMetrics, paymentFunnel, revenueStructure } = itemConversion;
  const { summary } = segmentation;

  // 付费率评分
  const payRateScore = Math.min(100, commercialMetrics.payingRate * 2);
  // ARPPU评分（以200为基准）
  const arppuScore = Math.min(100, (commercialMetrics.arppu / 200) * 100);
  // 复购率评分
  const repeatRate = paymentFunnel.repeatPurchase.rate;
  const repeatScore = Math.min(100, repeatRate * 3);
  // 收入多样性评分
  const typeCount = Object.keys(revenueStructure.byType).length;
  const diversityScore = Math.min(100, typeCount * 15);

  const score = Math.round(
    payRateScore * 0.3 + arppuScore * 0.3 + repeatScore * 0.2 + diversityScore * 0.2
  );

  return {
    score,
    grade: getGrade(score),
    details: {
      payRateScore: Math.round(payRateScore),
      arppuScore: Math.round(arppuScore),
      repeatScore: Math.round(repeatScore),
      diversityScore: Math.round(diversityScore),
    },
    keyMetrics: {
      payingRate: commercialMetrics.payingRate,
      arppu: commercialMetrics.arppu,
      arpu: commercialMetrics.arpu,
      totalRevenue: commercialMetrics.totalVersionRevenue,
      repeatPurchaseRate: repeatRate,
    },
  };
}

function assessUserHealth(segmentation) {
  const { summary, activitySegments, paySegments } = segmentation;

  // 留存评分
  const retentionScore = Math.min(100, (summary.day7Retention + summary.day28Retention) * 0.8);
  // 活跃度分布评分（高活跃占比越大越好）
  const highActive = activitySegments['高活跃'];
  const churnRisk = activitySegments['流失风险'];
  const activeScore = highActive
    ? Math.min(100, highActive.percentage * 2.5 + (100 - (churnRisk?.percentage || 0) * 2))
    : 50;
  // 在线时长评分（30分钟为基准）
  const onlineScore = Math.min(100, (summary.avgOnlineMinutes / 30) * 50);

  const score = Math.round(retentionScore * 0.4 + activeScore * 0.35 + onlineScore * 0.25);

  return {
    score,
    grade: getGrade(score),
    details: {
      retentionScore: Math.round(retentionScore),
      activeScore: Math.round(activeScore),
      onlineScore: Math.round(onlineScore),
    },
    keyMetrics: {
      day7Retention: summary.day7Retention,
      day28Retention: summary.day28Retention,
      avgOnlineMinutes: summary.avgOnlineMinutes,
      highActivePercent: highActive?.percentage || 0,
      churnRiskPercent: churnRisk?.percentage || 0,
    },
  };
}

function assessDataQuality(cleanReport) {
  const totalOriginal = Object.values(cleanReport.original).reduce((s, v) => s + v, 0);
  const totalRemoved = Object.values(cleanReport.removedRecords).reduce((s, v) => s + v, 0);
  const totalFixed = Object.values(cleanReport.fixedRecords || {}).reduce((s, v) => s + v, 0);

  const errorRate = totalOriginal > 0 ? (totalRemoved + totalFixed) / totalOriginal : 0;
  const score = Math.round(Math.max(0, (1 - errorRate * 10) * 100));

  return {
    score,
    grade: getGrade(score),
    totalOriginalRecords: totalOriginal,
    removedRecords: totalRemoved,
    fixedRecords: totalFixed,
    errorRate: Math.round(errorRate * 10000) / 100,
    issueCount: cleanReport.issues.length,
  };
}

function computeOverallScore(content, commercial, health, dataQuality) {
  const score = Math.round(
    content.avgScore * 0.30 +
    commercial.score * 0.30 +
    health.score * 0.25 +
    dataQuality.score * 0.15
  );

  return {
    score,
    grade: getGrade(score),
    breakdown: {
      contentQuality: { weight: '30%', score: content.avgScore, grade: content.grade },
      commercialization: { weight: '30%', score: commercial.score, grade: commercial.grade },
      userHealth: { weight: '25%', score: health.score, grade: health.grade },
      dataQuality: { weight: '15%', score: dataQuality.score, grade: dataQuality.grade },
    },
  };
}

function generateRecommendations(content, commercial, health, contentAnalysis, itemConversion, segmentation) {
  const recommendations = [];
  const priority = { high: '高', medium: '中', low: '低' };

  // 内容优化建议
  if (content.avgScore < 70) {
    recommendations.push({
      category: '内容质量',
      priority: priority.high,
      issue: `整体内容评分偏低（${content.avgScore}分）`,
      suggestion: '建议优化低评分内容的难度曲线和奖励机制，提升玩家完成率和满意度',
      expectedImpact: '内容评分提升15-20分，留存率提升3-5%',
    });
  }

  // 检查低参与度内容
  for (const [id, score] of Object.entries(content.contentScores)) {
    if (score.details.participationScore < 40) {
      recommendations.push({
        category: '内容参与',
        priority: priority.high,
        issue: `"${score.name}" 参与率偏低（参与度评分：${score.details.participationScore}）`,
        suggestion: `建议增加 "${score.name}" 的引导入口和奖励吸引力，考虑加入新手引导路径`,
        expectedImpact: '参与率提升20-30%',
      });
    }
    if (score.details.completionScore < 50) {
      recommendations.push({
        category: '内容难度',
        priority: priority.medium,
        issue: `"${score.name}" 完成率偏低（完成度评分：${score.details.completionScore}）`,
        suggestion: `建议降低 "${score.name}" 的难度或增加分阶段奖励，让更多玩家能够完成`,
        expectedImpact: '完成率提升15-25%，满意度提升0.5-1分',
      });
    }
  }

  // 留存相关建议
  const retentionImpact = contentAnalysis.contentRetentionImpact;
  if (retentionImpact.retentionLift.day28 > 5) {
    recommendations.push({
      category: '留存优化',
      priority: priority.high,
      issue: '参与新内容的玩家留存显著高于未参与者',
      suggestion: '建议加强新内容的推送和引导，确保更多玩家接触到版本新内容',
      expectedImpact: `28日留存率提升${Math.round(retentionImpact.retentionLift.day28)}个百分点`,
    });
  }

  // 商业化建议
  if (commercial.details.payRateScore < 50) {
    recommendations.push({
      category: '商业化',
      priority: priority.high,
      issue: `付费率偏低（${commercial.keyMetrics.payingRate}%）`,
      suggestion: '建议优化首充奖励和低价入门礼包，降低付费门槛吸引免费玩家转化',
      expectedImpact: '付费转化率提升5-10%',
    });
  }

  if (commercial.details.repeatScore < 50) {
    recommendations.push({
      category: '商业化',
      priority: priority.medium,
      issue: `复购率偏低（评分：${commercial.details.repeatScore}）`,
      suggestion: '建议增加限时折扣、累计消费奖励等刺激复购的机制',
      expectedImpact: '复购率提升10-15%',
    });
  }

  if (commercial.details.arppuScore < 40) {
    recommendations.push({
      category: '商业化',
      priority: priority.medium,
      issue: `ARPPU偏低（${commercial.keyMetrics.arppu}元）`,
      suggestion: '建议推出差异化的高价值商品包和VIP专属权益，提升付费玩家的消费深度',
      expectedImpact: 'ARPPU提升30-50%',
    });
  }

  // 道具消耗建议
  const { consumptionAnalysis } = itemConversion;
  for (const [type, data] of Object.entries(consumptionAnalysis)) {
    if (data.consumptionRate < 50) {
      recommendations.push({
        category: '道具经济',
        priority: priority.low,
        issue: `"${type}" 类道具消耗率偏低（${data.consumptionRate}%）`,
        suggestion: `建议增加 "${type}" 类道具的消耗场景或降低获取量，维持健康的道具经济循环`,
        expectedImpact: '道具消耗率提升至60-70%，促进二次购买',
      });
    }
  }

  // 用户健康度建议
  if (health.keyMetrics.churnRiskPercent > 25) {
    recommendations.push({
      category: '用户运营',
      priority: priority.high,
      issue: `流失风险用户占比过高（${health.keyMetrics.churnRiskPercent}%）`,
      suggestion: '建议针对流失风险用户推送召回活动、发放专属奖励、设计回归任务链',
      expectedImpact: '流失率降低10-15%，月活提升5-8%',
    });
  }

  if (health.keyMetrics.avgOnlineMinutes < 20) {
    recommendations.push({
      category: '用户运营',
      priority: priority.medium,
      issue: `人均在线时长偏低（${health.keyMetrics.avgOnlineMinutes}分钟/天）`,
      suggestion: '建议增加日常任务丰富度和社交玩法，延长玩家在线时长',
      expectedImpact: '人均在线时长提升至30分钟/天',
    });
  }

  // 交叉分层建议
  const crossAnalysis = segmentation.crossAnalysis;
  if (crossAnalysis) {
    for (const [payTier, activities] of Object.entries(crossAnalysis)) {
      if (payTier !== '免费' && activities['流失风险'] && activities['流失风险'].count > 5) {
        recommendations.push({
          category: '用户运营',
          priority: priority.high,
          issue: `${payTier}玩家中有${activities['流失风险'].count}人处于流失风险`,
          suggestion: `立即对这批${payTier}流失风险用户进行1对1关怀，了解流失原因并提供专属挽回方案`,
          expectedImpact: `挽回${Math.round(activities['流失风险'].count * 0.3)}+付费用户，保护收入基盘`,
        });
      }
    }
  }

  // 按优先级排序
  const priorityOrder = { '高': 0, '中': 1, '低': 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

function getGrade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

module.exports = { generateAssessment };
