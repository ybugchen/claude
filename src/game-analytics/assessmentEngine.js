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

  // 8. 下版本策划文档（四板块结构：内容题材/道具定价/数值模型/目标用户）
  const nextVersionPlan = generateNextVersionPlan(
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
    nextVersionPlan,
  };
}

// ============================================================
// 策划目标 vs 实际数据对比
// ============================================================

function assessPlanVsActual(planningContext, contentAnalysis, segmentation, commercialization, userHealth) {
  // 兼容新旧结构
  const targetMetrics = (planningContext.numericalModel && planningContext.numericalModel.targetMetrics) || planningContext.targetMetrics;
  const contentDesignIntent = (planningContext.numericalModel && planningContext.numericalModel.contentDesignIntent) || planningContext.contentDesignIntent;
  const versionGoals = (planningContext.targetUsers && planningContext.targetUsers.versionGoals) || planningContext.versionGoals;
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
// 下版本策划文档生成（四板块：内容题材/道具定价/数值模型/目标用户）
// ============================================================

function generateNextVersionPlan(
  contentQuality, commercialization, userHealth,
  contentAnalysis, itemConversion, segmentation,
  planVsActual, planningContext
) {
  const typeComparison = contentAnalysis.typeComparison;
  const funnel = contentAnalysis.contentFunnel;
  const retImpact = contentAnalysis.contentRetentionImpact;
  const revenue = itemConversion.revenueStructure;
  const consumption = itemConversion.consumptionAnalysis;
  const paySegments = segmentation.paySegments;
  const crossAnalysis = segmentation.crossAnalysis;

  // 内容类型排名
  const typeRanking = Object.entries(typeComparison)
    .map(([type, data]) => ({ type, score: data.avgSatisfaction * data.participationRate / 100, satisfaction: data.avgSatisfaction, participation: data.participationRate }))
    .sort((a, b) => b.score - a.score);
  const bestType = typeRanking[0] || {};
  const worstType = typeRanking[typeRanking.length - 1] || {};

  // 漏斗转化率
  const touchToMulti = funnel.touchedNewContent > 0 ? Math.round(funnel.multiContentPlayers / funnel.touchedNewContent * 10000) / 100 : 0;

  // 低消耗道具类型
  const lowConsumptionTypes = Object.entries(consumption).filter(([, d]) => d.consumptionRate < 50).map(([t]) => t);

  // 大R流失数
  let highValueChurnCount = 0;
  if (crossAnalysis) {
    for (const tier of ['大R', '超R']) {
      if (crossAnalysis[tier] && crossAnalysis[tier]['流失风险']) highValueChurnCount += crossAnalysis[tier]['流失风险'].count;
    }
  }

  // 未达标内容
  const failedContents = planVsActual ? planVsActual.contentMetrics.filter(c => c.overallStatus === '多数未达标') : [];

  // 上版本未解决问题
  const unresolvedIssues = [];
  if (planningContext && planningContext.previousVersionIssues) {
    for (const issue of planningContext.previousVersionIssues) {
      const result = checkIssueResolved(issue, contentAnalysis, segmentation, userHealth);
      if (!result.resolved) unresolvedIssues.push({ issue, ...result });
    }
  }

  // ================================================================
  // 板块一：内容题材建议
  // ================================================================
  const contentThemePlan = {
    section: '内容题材',
    dataInsights: [],
    suggestions: [],
  };

  // 题材方向洞察
  if (bestType.type) {
    contentThemePlan.dataInsights.push({
      insight: `"${bestType.type}" 类内容综合表现最优（参与率${bestType.participation}% × 满意度${bestType.satisfaction}），玩家偏好明确`,
      impact: '题材选择应延续该类型的核心体验',
    });
  }
  if (worstType.type && worstType.type !== bestType.type) {
    contentThemePlan.dataInsights.push({
      insight: `"${worstType.type}" 类内容表现最弱，需要题材创新或融合`,
      impact: '单独投入该类型 ROI 偏低',
    });
  }
  if (touchToMulti < 50) {
    contentThemePlan.dataInsights.push({
      insight: `跨内容流动率仅${touchToMulti}%，内容间缺乏叙事串联`,
      impact: '题材需建立更强的内容关联性',
    });
  }

  // 题材建议
  contentThemePlan.suggestions.push({
    priority: '高',
    title: '主题延续与扩展',
    detail: `延续 "${bestType.type}" 类高满意度内容的核心体验，以此为下版本主题线索。`
      + `对 "${worstType.type}" 类内容进行题材融合（如将弱势类型嵌入强势类型的叙事线中），而非单独立项`,
    references: [
      { source: '内容类型对比分析', metric: '综合得分', value: `${bestType.type}: 参与率${bestType.participation}%×满意度${bestType.satisfaction}` },
      { source: '内容类型对比分析', metric: '最低表现类型', value: `${worstType.type}: 参与率${worstType.participation}%×满意度${worstType.satisfaction}` },
    ],
  });

  if (touchToMulti < 50) {
    contentThemePlan.suggestions.push({
      priority: '高',
      title: '内容叙事串联',
      detail: '设计统一的版本故事线贯穿所有内容（副本→BOSS→主线→活动→外观），通过剧情解锁机制驱动跨内容体验',
      references: [
        { source: '内容漏斗分析', metric: '跨内容流动率', value: `${touchToMulti}%` },
        { source: '内容漏斗分析', metric: '触达新内容人数', value: `${funnel.touchedNewContent}人 → 多内容参与${funnel.multiContentPlayers}人` },
      ],
    });
  }

  if (retImpact.retentionLift.day28 > 3) {
    contentThemePlan.suggestions.push({
      priority: '中',
      title: '低门槛引导内容',
      detail: `新内容对28日留存有${retImpact.retentionLift.day28}pp增益，建议设计"版本序章"——轻量级单人引导内容，确保首日100%触达`,
      references: [
        { source: '内容留存影响分析', metric: 'Day28留存增益', value: `${retImpact.retentionLift.day28}pp` },
        { source: '内容留存影响分析', metric: 'Day7留存增益', value: `${retImpact.retentionLift.day7}pp` },
      ],
    });
  }

  for (const fc of failedContents) {
    const failedDims = fc.dimensions.filter(d => d.status === '未达标');
    contentThemePlan.suggestions.push({
      priority: '中',
      title: `"${fc.name}" 类型迭代`,
      detail: `该内容多数指标未达标（${failedDims.map(d => d.metric).join('、')}），下版本对此类型进行机制革新或题材重塑`,
      references: failedDims.map(d => ({
        source: '策划目标对比', metric: d.metric, value: `目标${d.target} → 实际${d.actual}（差距${d.gapPercent}%）`,
      })),
    });
  }

  // ================================================================
  // 板块二：道具功能和定价建议
  // ================================================================
  const itemDesignPlan = {
    section: '道具功能和定价',
    dataInsights: [],
    suggestions: [],
  };

  // 道具数据洞察
  const freePlayerPct = paySegments['免费'] ? paySegments['免费'].percentage : 0;
  itemDesignPlan.dataInsights.push({
    insight: `收入结构：RMB ${revenue.rmbPercentage}% / 钻石 ${revenue.diamondPercentage}%`,
    impact: revenue.rmbPercentage > 65 ? '过度依赖直购，存在付费疲劳风险' : revenue.diamondPercentage > 65 ? '钻石消费占比过高，易被赠送稀释' : '收入双通道相对均衡',
  });

  if (lowConsumptionTypes.length > 0) {
    itemDesignPlan.dataInsights.push({
      insight: `${lowConsumptionTypes.join('、')} 类道具消耗率低于50%，存在堆积`,
      impact: '玩家购买意愿降低，经济循环受阻',
    });
  }

  // 畅销/滞销分析
  const salesOverview = itemConversion.itemSalesOverview;
  const itemsByRevenue = Object.entries(salesOverview).sort((a, b) => b[1].totalRevenue - a[1].totalRevenue);
  const topItems = itemsByRevenue.slice(0, 3).map(([, v]) => `${v.name}(${v.purchaseRate}%购买率)`);
  const bottomItems = itemsByRevenue.slice(-2).map(([, v]) => `${v.name}(${v.purchaseRate}%购买率)`);

  itemDesignPlan.dataInsights.push({
    insight: `畅销道具：${topItems.join('、')}；滞销道具：${bottomItems.join('、')}`,
    impact: '定价和功能设计需参考畅销品特征',
  });

  // 道具建议
  if (freePlayerPct > 50 && commercialization.keyMetrics.payingRate < 15) {
    itemDesignPlan.suggestions.push({
      priority: '高',
      title: '首付转化商品设计',
      detail: `免费玩家占${freePlayerPct}%，设计1-6元"超值首充礼包"（价值感10倍以上），搭配限时体验券（3天高级皮肤试用），降低首次付费门槛`,
      references: [
        { source: '用户分层分析', metric: '免费玩家占比', value: `${freePlayerPct}%` },
        { source: '商业化评估', metric: '付费率', value: `${commercialization.keyMetrics.payingRate}%` },
      ],
    });
  }

  if (revenue.rmbPercentage > 65) {
    itemDesignPlan.suggestions.push({
      priority: '中',
      title: '增加钻石消耗品价值',
      detail: '设计高价值钻石限定商品（限时强化石、稀有合成图纸），提升钻石消费场景丰富度，平衡收入通道',
      references: [
        { source: '收入结构分析', metric: 'RMB直购占比', value: `${revenue.rmbPercentage}%` },
        { source: '收入结构分析', metric: '钻石消费占比', value: `${revenue.diamondPercentage}%` },
      ],
    });
  } else if (revenue.diamondPercentage > 65) {
    itemDesignPlan.suggestions.push({
      priority: '中',
      title: '增加直购商品吸引力',
      detail: '推出差异化直购礼包（赛季限定、节日特惠），避免与钻石商品功能重叠，创造独占价值',
      references: [
        { source: '收入结构分析', metric: '钻石消费占比', value: `${revenue.diamondPercentage}%` },
        { source: '收入结构分析', metric: 'RMB直购占比', value: `${revenue.rmbPercentage}%` },
      ],
    });
  }

  if (lowConsumptionTypes.length >= 2) {
    itemDesignPlan.suggestions.push({
      priority: '中',
      title: '道具合成/分解系统',
      detail: `${lowConsumptionTypes.join('、')} 类道具堆积严重，设计"道具熔炼"系统：低级道具可合成高级道具，增加消耗出口并创造新追求`,
      references: lowConsumptionTypes.map(t => ({
        source: '道具消耗分析', metric: `${t}消耗率`, value: `${consumption[t].consumptionRate}%`,
      })),
    });
  }

  if (highValueChurnCount > 3) {
    itemDesignPlan.suggestions.push({
      priority: '高',
      title: '大R专属限定商品',
      detail: `大R/超R中有${highValueChurnCount}人处于流失风险，推出限量编号收藏品和专属功能性道具（如自定义特效、称号），增强稀缺性和沉没成本`,
      references: [
        { source: '用户交叉分析', metric: '大R/超R流失风险人数', value: `${highValueChurnCount}人` },
        { source: '道具销售分析', metric: '畅销道具', value: topItems.join('、') },
      ],
    });
  }

  // ================================================================
  // 板块三：数值模型建议
  // ================================================================
  const numericalModelPlan = {
    section: '数值模型',
    dataInsights: [],
    suggestions: [],
  };

  // KPI达成回顾
  if (planVsActual) {
    const achieved = planVsActual.overallMetrics.filter(m => m.status === '达标');
    const missed = planVsActual.overallMetrics.filter(m => m.status === '未达标');

    numericalModelPlan.dataInsights.push({
      insight: `版本KPI达标率${planVsActual.overallAchievementRate}%：达标 ${achieved.map(m => m.metric).join('、') || '无'}`,
      impact: missed.length > 0 ? `未达标：${missed.map(m => `${m.metric}(差距${m.gapPercent}%)`).join('、')}` : '全部达标',
    });
  }

  // 数值建议
  const nextTargets = {};
  if (planVsActual) {
    for (const m of planVsActual.overallMetrics) {
      if (m.status === '达标') {
        // 达标的指标上调5-10%
        nextTargets[m.metric] = { target: Math.round(m.actual * 1.05 * 100) / 100, basis: `本版本实际${m.actual}${m.unit}，上调5%` };
      } else {
        // 未达标的保持或微调
        nextTargets[m.metric] = { target: m.target, basis: `本版本未达标(实际${m.actual}${m.unit})，保持目标` };
      }
    }
  }

  numericalModelPlan.suggestions.push({
    priority: '高',
    title: '下版本KPI目标建议',
    detail: '基于本版本达成情况动态调整',
    targetMetrics: nextTargets,
    references: planVsActual ? planVsActual.overallMetrics.map(m => ({
      source: '策划目标对比', metric: m.metric, value: `目标${m.target}${m.unit} → 实际${m.actual}${m.unit}（${m.status}）`,
    })) : [{ source: '数值模型', metric: '基准', value: '无策划目标输入，使用默认基准' }],
  });

  // 难度模型
  const contentScores = contentQuality.contentScores;
  const lowCompletionContents = Object.values(contentScores).filter(c => c.details.completionScore < 45);

  if (lowCompletionContents.length > 0) {
    numericalModelPlan.suggestions.push({
      priority: '高',
      title: '难度曲线优化',
      detail: `${lowCompletionContents.map(c => `"${c.name}"(完成率评分${c.details.completionScore})`).join('、')} 完成率偏低，`
        + '建议采用分层难度设计（普通/困难/噩梦），普通难度完成率目标≥70%，保证多数玩家有正反馈',
      references: lowCompletionContents.map(c => ({
        source: '内容质量评分', metric: `${c.name}完成率评分`, value: `${c.details.completionScore}/100`,
      })),
    });
  }

  // 经济数值
  if (lowConsumptionTypes.length > 0) {
    numericalModelPlan.suggestions.push({
      priority: '中',
      title: '经济平衡调整',
      detail: `消耗品产出/消耗比失衡（${lowConsumptionTypes.join('、')}消耗率<50%），建议降低每日免费产出量20%或增加消耗场景，目标消耗率≥65%`,
      references: lowConsumptionTypes.map(t => ({
        source: '道具消耗分析', metric: `${t}消耗率`, value: `${consumption[t].consumptionRate}%`,
      })),
    });
  }

  // 内容各指标目标
  const contentTargets = [];
  if (planVsActual) {
    for (const cm of planVsActual.contentMetrics) {
      const adjusted = {};
      for (const dim of cm.dimensions) {
        if (dim.status === '达标') {
          adjusted[dim.metric] = { target: Math.round(dim.actual * 1.05 * 100) / 100, note: '达标，上调5%' };
        } else {
          adjusted[dim.metric] = { target: dim.target, note: `未达标(实际${dim.actual})，保持` };
        }
      }
      contentTargets.push({ name: cm.name, type: cm.type, metrics: adjusted });
    }
  }

  if (contentTargets.length > 0) {
    numericalModelPlan.suggestions.push({
      priority: '中',
      title: '各内容类型目标参考',
      detail: '基于同类型内容本版本表现动态设定',
      contentTargets,
      references: contentTargets.map(ct => ({
        source: '策划目标对比', metric: ct.name, value: Object.entries(ct.metrics).map(([k, v]) => `${k}: ${v.note}`).join('；'),
      })),
    });
  }

  // ================================================================
  // 板块四：目标用户定位建议
  // ================================================================
  const targetUsersPlan = {
    section: '目标用户定位',
    dataInsights: [],
    suggestions: [],
  };

  // 用户结构洞察
  const tiers = ['免费', '小R', '中R', '大R', '超R'];
  const tierPcts = tiers.map(t => `${t}${paySegments[t] ? paySegments[t].percentage : 0}%`).join(' / ');
  targetUsersPlan.dataInsights.push({
    insight: `付费层级分布：${tierPcts}`,
    impact: `付费率${commercialization.keyMetrics.payingRate}%，ARPPU ${commercialization.keyMetrics.arppu}元`,
  });

  const churnRiskPct = userHealth.keyMetrics.churnRiskPercent;
  targetUsersPlan.dataInsights.push({
    insight: `活跃度结构：高活跃${userHealth.keyMetrics.highActivePercent}% / 流失风险${churnRiskPct}%`,
    impact: churnRiskPct > 25 ? '流失风险占比过高，需重点运营' : '活跃结构相对健康',
  });

  // 各层级策略
  const segmentStrategies = {};

  // 免费玩家策略
  if (freePlayerPct > 45) {
    segmentStrategies['免费'] = {
      goal: '转化为小R',
      strategy: '设计超值首充(6元)、限时体验券、新手专属优惠，降低付费心理门槛',
      kpi: `目标首充转化率≥${Math.max(8, Math.round(commercialization.keyMetrics.payingRate * 1.3))}%`,
    };
  }

  // 小R策略
  segmentStrategies['小R'] = {
    goal: '提升消费频次和金额',
    strategy: '月卡+战令双轨订阅体系，累计消费返利活动，培养持续付费习惯',
    kpi: '目标月均消费≥50元',
  };

  // 中R策略
  segmentStrategies['中R'] = {
    goal: '推动单次大额消费',
    strategy: '限时高价值礼包（128-328元档），阶梯消费奖励（满500送限定），内容驱动付费（BOSS必需品）',
    kpi: `目标ARPPU≥${Math.max(200, Math.round(commercialization.keyMetrics.arppu * 1.15))}元`,
  };

  // 大R/超R策略
  if (highValueChurnCount > 3) {
    segmentStrategies['大R/超R'] = {
      goal: '挽留+深度绑定',
      strategy: `${highValueChurnCount}人处于流失风险，推出专属1v1客服关怀、限量编号收藏品、公会特权系统，增强沉没成本和社交绑定`,
      kpi: '大R流失率降低至10%以内',
    };
  } else {
    segmentStrategies['大R/超R'] = {
      goal: '维持消费深度',
      strategy: '限量高端商品、排他性玩法特权、赛季排行榜专属奖励',
      kpi: '维持现有ARPPU水平',
    };
  }

  targetUsersPlan.suggestions.push({
    priority: '高',
    title: '分层运营策略',
    detail: '针对各付费层级的差异化策略',
    segmentStrategies,
    references: tiers.map(t => ({
      source: '用户分层分析', metric: `${t}占比`, value: `${paySegments[t] ? paySegments[t].percentage : 0}%（${paySegments[t] ? paySegments[t].playerCount : 0}人）`,
    })),
  });

  // 留存策略
  const retentionActions = {};
  const retentionRefs = [];
  if (churnRiskPct > 20) {
    retentionActions['流失风险用户'] = `占比${churnRiskPct}%，推送版本更新召回+7天回归专属奖励+快速追赶机制`;
    retentionRefs.push({ source: '用户健康度评估', metric: '流失风险占比', value: `${churnRiskPct}%` });
  }
  retentionActions['新玩家'] = '版本序章自动引导进入核心内容，降低认知门槛';
  retentionActions['活跃核心'] = '每周刷新排行榜+赛季挑战，保持竞争动力';
  retentionRefs.push(
    { source: '用户健康度评估', metric: '7日留存率', value: `${userHealth.keyMetrics.day7Retention}%` },
    { source: '用户健康度评估', metric: '28日留存率', value: `${userHealth.keyMetrics.day28Retention}%` }
  );

  targetUsersPlan.suggestions.push({
    priority: '高',
    title: '留存运营策略',
    detail: '按用户生命周期制定差异化留存手段',
    retentionActions,
    references: retentionRefs,
  });

  // 上版本问题跟踪
  if (unresolvedIssues.length > 0) {
    targetUsersPlan.suggestions.push({
      priority: '中',
      title: '历史遗留问题跟踪',
      detail: '以下问题在本版本未完全解决，需在下版本持续关注',
      unresolvedIssues: unresolvedIssues.map(u => ({
        issue: u.issue,
        currentStatus: u.evidence,
        nextAction: u.suggestion,
      })),
      references: unresolvedIssues.map(u => ({
        source: '历史问题追踪', metric: u.issue, value: u.evidence,
      })),
    });
  }

  return {
    contentThemePlan,
    itemDesignPlan,
    numericalModelPlan,
    targetUsersPlan,
  };
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
