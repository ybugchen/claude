/**
 * 版本质量评估与商业化评估引擎
 * 综合各分析维度得出评分和优化建议
 *
 * 新增：
 * - planVsActual: 策划目标 vs 实际数据的差距分析
 * - nextVersionSuggestions: 基于数据洞察的下版本内容建议
 */

function generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport, versionInfo) {
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

  // 7. 策划目标 vs 实际对比（需要 planningContext）
  const planningContext = versionInfo && versionInfo.planningContext;
  const planVsActual = planningContext
    ? assessPlanVsActual(planningContext, contentAnalysis, segmentation, commercialization, userHealth)
    : null;

  // 8. 下版本内容建议（基于全部分析维度 + 策划上下文）
  const nextVersionSuggestions = generateNextVersionSuggestions(
    contentQuality, commercialization, userHealth,
    contentAnalysis, itemConversion, segmentation,
    planVsActual, planningContext
  );

  return {
    contentQuality,
    commercialization,
    userHealth,
    dataQuality,
    overallScore,
    recommendations,
    planVsActual,
    nextVersionSuggestions,
  };
}

// ============================================================
// 策划目标 vs 实际数据对比
// ============================================================

function assessPlanVsActual(planningContext, contentAnalysis, segmentation, commercialization, userHealth) {
  const { targetMetrics, contentDesignIntent, versionGoals } = planningContext;
  const { summary } = segmentation;
  const { contentOverview } = contentAnalysis;

  // ---- 版本整体目标达成 ----
  const overallMetrics = [];

  if (targetMetrics) {
    const metricDefs = [
      { key: 'day7Retention', label: '7日留存率', unit: '%', actual: summary.day7Retention },
      { key: 'day28Retention', label: '28日留存率', unit: '%', actual: summary.day28Retention },
      { key: 'payingRate', label: '付费率', unit: '%', actual: commercialization.keyMetrics.payingRate },
      { key: 'arppu', label: 'ARPPU', unit: '元', actual: commercialization.keyMetrics.arppu },
      { key: 'arpu', label: 'ARPU', unit: '元', actual: commercialization.keyMetrics.arpu },
      { key: 'avgOnlineMinutes', label: '日均在线时长', unit: '分钟', actual: userHealth.keyMetrics.avgOnlineMinutes },
    ];

    for (const def of metricDefs) {
      const target = targetMetrics[def.key];
      if (target === undefined || target === null) continue;
      const actual = def.actual;
      const gap = actual - target;
      const gapPercent = target > 0 ? Math.round((gap / target) * 10000) / 100 : 0;
      overallMetrics.push({
        metric: def.label,
        target,
        actual,
        gap: Math.round(gap * 100) / 100,
        gapPercent,
        unit: def.unit,
        status: gapPercent >= 0 ? '达标' : (gapPercent >= -10 ? '接近' : '未达标'),
      });
    }
  }

  // ---- 各内容达成情况 ----
  const contentMetrics = [];

  if (contentDesignIntent) {
    for (const [contentId, intent] of Object.entries(contentDesignIntent)) {
      const actual = contentOverview[contentId];
      if (!actual) continue;

      const dimensions = [];

      if (intent.targetParticipationRate !== undefined) {
        dimensions.push(buildDimension('参与率', '%', intent.targetParticipationRate, actual.participationRate));
      }
      if (intent.targetCompletionRate !== undefined) {
        dimensions.push(buildDimension('完成率', '%', intent.targetCompletionRate, actual.avgCompletionRate));
      }
      if (intent.targetSatisfaction !== undefined) {
        dimensions.push(buildDimension('满意度', '分', intent.targetSatisfaction, actual.avgSatisfaction));
      }
      if (intent.targetAvgTimes !== undefined) {
        dimensions.push(buildDimension('人均参与次数', '次', intent.targetAvgTimes, actual.avgParticipationTimes));
      }

      const achievedCount = dimensions.filter(d => d.status === '达标').length;
      const totalDims = dimensions.length;

      contentMetrics.push({
        contentId,
        name: actual.name,
        type: actual.type,
        designGoal: intent.designGoal || '',
        dimensions,
        achievementRate: totalDims > 0 ? Math.round((achievedCount / totalDims) * 10000) / 100 : 0,
        overallStatus: achievedCount === totalDims ? '全部达标'
          : achievedCount >= totalDims / 2 ? '部分达标' : '多数未达标',
      });
    }
  }

  // ---- 版本目标复盘 ----
  const goalReview = (versionGoals || []).map(goal => {
    return {
      goal,
      assessment: reviewGoal(goal, contentAnalysis, segmentation, commercialization, userHealth),
    };
  });

  // 总达标率
  const allOverallAchieved = overallMetrics.filter(m => m.status === '达标').length;
  const overallAchievementRate = overallMetrics.length > 0
    ? Math.round((allOverallAchieved / overallMetrics.length) * 10000) / 100
    : 0;

  return {
    overallMetrics,
    overallAchievementRate,
    contentMetrics,
    goalReview,
  };
}

function buildDimension(label, unit, target, actual) {
  const gap = actual - target;
  const gapPercent = target > 0 ? Math.round((gap / target) * 10000) / 100 : 0;
  return {
    metric: label,
    unit,
    target,
    actual: Math.round(actual * 100) / 100,
    gap: Math.round(gap * 100) / 100,
    gapPercent,
    status: gapPercent >= 0 ? '达标' : (gapPercent >= -10 ? '接近' : '未达标'),
  };
}

function reviewGoal(goal, contentAnalysis, segmentation, commercialization, userHealth) {
  // 根据目标关键词做定性评估
  if (goal.includes('留存')) {
    const d7 = segmentation.summary.day7Retention;
    const d28 = segmentation.summary.day28Retention;
    const lift = contentAnalysis.contentRetentionImpact.retentionLift;
    if (d7 >= 50 && d28 >= 30) {
      return { status: '达成', evidence: `7日留存${d7}%、28日留存${d28}%，新内容留存增益Day28=${lift.day28}pp` };
    }
    return { status: '未完全达成', evidence: `7日留存${d7}%、28日留存${d28}%，需继续优化` };
  }
  if (goal.includes('付费') || goal.includes('ARPPU') || goal.includes('消费')) {
    const rate = commercialization.keyMetrics.payingRate;
    const arppu = commercialization.keyMetrics.arppu;
    if (rate >= 10 && arppu >= 150) {
      return { status: '达成', evidence: `付费率${rate}%，ARPPU ${arppu}元` };
    }
    return { status: '未完全达成', evidence: `付费率${rate}%，ARPPU ${arppu}元，仍有提升空间` };
  }
  if (goal.includes('转化')) {
    const rate = commercialization.keyMetrics.payingRate;
    return {
      status: rate >= 10 ? '达成' : '未完全达成',
      evidence: `当前付费转化率${rate}%`,
    };
  }
  if (goal.includes('活跃') || goal.includes('在线时长')) {
    const online = userHealth.keyMetrics.avgOnlineMinutes;
    const highPct = userHealth.keyMetrics.highActivePercent;
    return {
      status: online >= 30 && highPct >= 25 ? '达成' : '未完全达成',
      evidence: `日均在线${online}分钟，高活跃占比${highPct}%`,
    };
  }
  // 通用回落
  return { status: '待评估', evidence: '需结合业务判断' };
}

// ============================================================
// 下版本内容建议
// ============================================================

function generateNextVersionSuggestions(
  contentQuality, commercialization, userHealth,
  contentAnalysis, itemConversion, segmentation,
  planVsActual, planningContext
) {
  const suggestions = [];

  // ---- 1. 基于内容类型表现推荐 ----
  const typeComparison = contentAnalysis.typeComparison;
  const typeRanking = Object.entries(typeComparison)
    .map(([type, data]) => ({ type, score: data.avgSatisfaction * data.participationRate / 100 }))
    .sort((a, b) => b.score - a.score);

  if (typeRanking.length > 0) {
    const bestType = typeRanking[0];
    const worstType = typeRanking[typeRanking.length - 1];

    suggestions.push({
      category: '内容类型规划',
      priority: '高',
      insight: `"${bestType.type}" 类内容综合表现最优（参与×满意度=${bestType.score.toFixed(1)}），`
        + `"${worstType.type}" 类内容表现最弱（${worstType.score.toFixed(1)}）`,
      suggestion: `下版本建议加大 "${bestType.type}" 类内容投入，对 "${worstType.type}" 类内容进行形态创新或暂缓投入`,
      rationale: '延续高满意度内容类型的成功经验，减少低效内容的资源浪费',
    });
  }

  // ---- 2. 基于漏斗断层推荐 ----
  const funnel = contentAnalysis.contentFunnel;
  const touchToMulti = funnel.touchedNewContent > 0
    ? Math.round(funnel.multiContentPlayers / funnel.touchedNewContent * 10000) / 100
    : 0;
  const multiToDeep = funnel.multiContentPlayers > 0
    ? Math.round(funnel.deepEngagedPlayers / funnel.multiContentPlayers * 10000) / 100
    : 0;

  if (touchToMulti < 50) {
    suggestions.push({
      category: '内容串联设计',
      priority: '高',
      insight: `接触新内容后仅${touchToMulti}%的玩家参与了多个内容，跨内容流动率偏低`,
      suggestion: '下版本设计内容间的关联奖励链（如副本掉落→BOSS解锁→主线推进），形成内容消费闭环',
      rationale: '提高单个玩家的内容消费广度，延长版本生命周期',
    });
  }

  if (multiToDeep < 30) {
    suggestions.push({
      category: '深度参与机制',
      priority: '中',
      insight: `多内容参与玩家中仅${multiToDeep}%达到深度参与（完成率≥80%且次数≥5）`,
      suggestion: '下版本增加渐进式成就系统和深度挑战奖励（如排行榜、赛季奖杯），激励重复高质量游玩',
      rationale: '深度参与玩家的留存和付费贡献远高于浅层玩家',
    });
  }

  // ---- 3. 基于留存缺口推荐 ----
  const retImpact = contentAnalysis.contentRetentionImpact;
  if (retImpact.retentionLift.day28 > 3) {
    const nonTouchRate = Math.round((1 - funnel.touchedNewContent / funnel.totalPlayers) * 10000) / 100;
    suggestions.push({
      category: '留存导向内容',
      priority: '高',
      insight: `参与新内容的玩家28日留存高出${retImpact.retentionLift.day28}pp，但仍有${nonTouchRate}%玩家未接触新内容`,
      suggestion: '下版本设计低门槛引导内容（如新手专属副本简易模式、自动引导任务），确保更多玩家首日即接触核心内容',
      rationale: '新内容对留存有显著正向作用，扩大触达面可直接提升整体留存',
    });
  }

  // ---- 4. 基于付费结构推荐 ----
  const paySegments = segmentation.paySegments;
  const freePlayerPct = paySegments['免费'] ? paySegments['免费'].percentage : 0;
  const revenue = itemConversion.revenueStructure;

  if (freePlayerPct > 50 && commercialization.keyMetrics.payingRate < 15) {
    suggestions.push({
      category: '付费转化内容',
      priority: '高',
      insight: `免费玩家占比${freePlayerPct}%，付费转化率仅${commercialization.keyMetrics.payingRate}%`,
      suggestion: '下版本设计"体验式付费内容"：如限时免费试用高级皮肤3天、首充送限定宠物，降低首次付费心理门槛',
      rationale: '通过"先体验后付费"机制将免费玩家转化为小R',
    });
  }

  if (revenue.rmbPercentage > 70) {
    suggestions.push({
      category: '收入结构优化',
      priority: '中',
      insight: `RMB直购收入占比${revenue.rmbPercentage}%，钻石生态偏弱`,
      suggestion: '下版本增加高价值钻石消耗品（如限时强化石、稀有锻造材料），丰富虚拟货币消费场景',
      rationale: '过度依赖直购容易造成付费疲劳，健康的双通道收入结构更可持续',
    });
  } else if (revenue.diamondPercentage > 70) {
    suggestions.push({
      category: '收入结构优化',
      priority: '中',
      insight: `钻石消费占比${revenue.diamondPercentage}%，RMB直购偏弱`,
      suggestion: '下版本推出更多高品质直购商品（如限定礼包、赛季通行证），提升直购吸引力',
      rationale: '钻石消费容易被游戏内赠送稀释，适当增加直购比例能稳固收入基盘',
    });
  }

  // ---- 5. 基于用户分层推荐 ----
  const crossAnalysis = segmentation.crossAnalysis;
  if (crossAnalysis) {
    // 高价值用户流失预警
    let highValueChurnCount = 0;
    for (const tier of ['大R', '超R']) {
      if (crossAnalysis[tier] && crossAnalysis[tier]['流失风险']) {
        highValueChurnCount += crossAnalysis[tier]['流失风险'].count;
      }
    }
    if (highValueChurnCount > 3) {
      suggestions.push({
        category: '大R专属内容',
        priority: '高',
        insight: `大R/超R中有${highValueChurnCount}人处于流失风险`,
        suggestion: '下版本设计大R专属内容：排他性竞技玩法、限量收藏品、专属社交圈子（公会特权），增强归属感和沉没成本',
        rationale: '大R流失的收入损失远超获取新大R的成本，需优先通过内容手段挽留',
      });
    }
  }

  // 活跃度结构问题
  const churnRiskPct = userHealth.keyMetrics.churnRiskPercent;
  if (churnRiskPct > 20) {
    suggestions.push({
      category: '回流内容设计',
      priority: '高',
      insight: `流失风险玩家占比${churnRiskPct}%`,
      suggestion: '下版本增加"回归玩家专属福利"：7天回归奖励、快速追赶机制（经验/装备加速），配合版本更新推送召回',
      rationale: '召回老玩家的成本远低于获取新玩家，配合新版本是最佳召回时机',
    });
  }

  // ---- 6. 基于策划上下文的针对性建议 ----
  if (planVsActual) {
    // 未达标的内容逐一给出改进方向
    for (const cm of planVsActual.contentMetrics) {
      if (cm.overallStatus === '多数未达标') {
        const failedDims = cm.dimensions.filter(d => d.status === '未达标');
        const failedNames = failedDims.map(d => `${d.metric}(目标${d.target}${d.unit}→实际${d.actual}${d.unit})`).join('、');
        suggestions.push({
          category: '内容迭代',
          priority: '高',
          insight: `"${cm.name}" 多数目标未达标：${failedNames}`,
          suggestion: `下版本对 "${cm.name}" 类型内容（${cm.type}）进行机制迭代：`
            + (failedDims.some(d => d.metric === '完成率') ? '降低难度梯度、增加中间检查点；' : '')
            + (failedDims.some(d => d.metric === '参与率') ? '优化入口引导、增加首次参与奖励；' : '')
            + (failedDims.some(d => d.metric === '满意度') ? '丰富奖励层次、增加随机惊喜元素；' : '')
            + (failedDims.some(d => d.metric === '人均参与次数') ? '增加每日/每周刷新内容保持新鲜感' : ''),
          rationale: `策划目标 "${cm.designGoal}" 未能充分实现，需定向优化`,
        });
      }
    }

    // 上版本遗留问题跟踪
    if (planningContext && planningContext.previousVersionIssues) {
      for (const issue of planningContext.previousVersionIssues) {
        const resolved = checkIssueResolved(issue, contentAnalysis, segmentation, userHealth);
        if (!resolved.resolved) {
          suggestions.push({
            category: '历史问题延续',
            priority: '中',
            insight: `上版本问题 "${issue}" ${resolved.evidence}`,
            suggestion: resolved.suggestion,
            rationale: '跨版本未解决的问题会累积为系统性风险',
          });
        }
      }
    }
  }

  // ---- 7. 基于道具经济推荐 ----
  const consumption = itemConversion.consumptionAnalysis;
  const lowConsumptionTypes = Object.entries(consumption)
    .filter(([, data]) => data.consumptionRate < 40)
    .map(([type]) => type);

  if (lowConsumptionTypes.length >= 2) {
    suggestions.push({
      category: '经济系统设计',
      priority: '中',
      insight: `${lowConsumptionTypes.join('、')} 类道具消耗率均低于40%，道具堆积严重`,
      suggestion: '下版本设计道具融合/合成系统（如碎片合成高级道具），增加消耗出口，同时创造新的追求目标',
      rationale: '道具堆积降低玩家购买意愿，疏通消耗通道才能维持健康经济循环',
    });
  }

  // 按优先级排序
  const priorityOrder = { '高': 0, '中': 1, '低': 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

function checkIssueResolved(issue, contentAnalysis, segmentation, userHealth) {
  if (issue.includes('难度') || issue.includes('流失')) {
    const churn = userHealth.keyMetrics.churnRiskPercent;
    if (churn > 25) {
      return {
        resolved: false,
        evidence: `当前版本流失风险仍达${churn}%`,
        suggestion: '下版本继续降低核心内容入门门槛，增加分层难度选择（普通/困难/噩梦），让不同层级玩家都有合适的挑战',
      };
    }
    return { resolved: true };
  }
  if (issue.includes('活动') || issue.includes('参与率')) {
    const funnel = contentAnalysis.contentFunnel;
    if (funnel.touchedRate < 70) {
      return {
        resolved: false,
        evidence: `当前版本内容触达率仅${funnel.touchedRate}%`,
        suggestion: '下版本活动设计需强化全服推送和引导，增加阶段性里程碑奖励拉高参与率',
      };
    }
    return { resolved: true };
  }
  if (issue.includes('社交') || issue.includes('在线时长')) {
    const online = userHealth.keyMetrics.avgOnlineMinutes;
    if (online < 30) {
      return {
        resolved: false,
        evidence: `当前版本日均在线${online}分钟，仍偏低`,
        suggestion: '下版本增加组队副本、公会任务、好友互动玩法，通过社交驱动延长在线时长',
      };
    }
    return { resolved: true };
  }
  return { resolved: true };
}

// ============================================================
// 原有评估函数（保持不变）
// ============================================================

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

  const payRateScore = Math.min(100, commercialMetrics.payingRate * 2);
  const arppuScore = Math.min(100, (commercialMetrics.arppu / 200) * 100);
  const repeatRate = paymentFunnel.repeatPurchase.rate;
  const repeatScore = Math.min(100, repeatRate * 3);
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

  const retentionScore = Math.min(100, (summary.day7Retention + summary.day28Retention) * 0.8);
  const highActive = activitySegments['高活跃'];
  const churnRisk = activitySegments['流失风险'];
  const activeScore = highActive
    ? Math.min(100, highActive.percentage * 2.5 + (100 - (churnRisk?.percentage || 0) * 2))
    : 50;
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

  if (content.avgScore < 70) {
    recommendations.push({
      category: '内容质量',
      priority: priority.high,
      issue: `整体内容评分偏低（${content.avgScore}分）`,
      suggestion: '建议优化低评分内容的难度曲线和奖励机制，提升玩家完成率和满意度',
      expectedImpact: '内容评分提升15-20分，留存率提升3-5%',
    });
  }

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
