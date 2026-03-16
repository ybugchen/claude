/**
 * 玩家流失预警系统
 * 基于玩家行为数据识别高流失风险玩家并生成预警
 */

function analyzeChurnRisk(cleanedData) {
  const { players, loginRecords, contentExperience } = cleanedData;

  // 构建玩家行为索引
  const loginByPlayer = new Map();
  for (const rec of loginRecords) {
    if (!loginByPlayer.has(rec.playerId)) loginByPlayer.set(rec.playerId, []);
    loginByPlayer.get(rec.playerId).push(rec);
  }

  const contentByPlayer = new Map();
  for (const rec of contentExperience) {
    if (!contentByPlayer.has(rec.playerId)) contentByPlayer.set(rec.playerId, []);
    contentByPlayer.get(rec.playerId).push(rec);
  }

  // 计算每个玩家的流失风险
  const playerRisks = players.map(player => {
    const logins = loginByPlayer.get(player.playerId) || [];
    const contents = contentByPlayer.get(player.playerId) || [];
    return computePlayerChurnRisk(player, logins, contents);
  });

  // 按风险分排序
  playerRisks.sort((a, b) => b.riskScore - a.riskScore);

  // 风险等级分布
  const riskDistribution = { '高危': { count: 0, percentage: 0 }, '中危': { count: 0, percentage: 0 }, '低危': { count: 0, percentage: 0 }, '安全': { count: 0, percentage: 0 } };
  for (const p of playerRisks) {
    riskDistribution[p.riskLevel].count++;
  }
  const total = players.length;
  for (const level of Object.keys(riskDistribution)) {
    riskDistribution[level].percentage = Math.round(riskDistribution[level].count / total * 10000) / 100;
  }

  // 信号统计
  const signalCounts = {};
  for (const p of playerRisks) {
    for (const s of p.signals) {
      signalCounts[s] = (signalCounts[s] || 0) + 1;
    }
  }
  const signalStats = Object.entries(signalCounts)
    .map(([signal, count]) => ({ signal, count, percentage: Math.round(count / total * 10000) / 100 }))
    .sort((a, b) => b.count - a.count);

  // 付费层级 x 流失风险交叉分析
  const payTierRisk = {};
  for (const p of playerRisks) {
    if (!payTierRisk[p.payTier]) payTierRisk[p.payTier] = {};
    payTierRisk[p.payTier][p.riskLevel] = (payTierRisk[p.payTier][p.riskLevel] || 0) + 1;
  }

  return {
    summary: {
      totalPlayers: total,
      riskDistribution,
      avgRiskScore: Math.round(playerRisks.reduce((s, p) => s + p.riskScore, 0) / total),
    },
    signalStats,
    payTierRisk,
    highRiskPlayers: playerRisks.filter(p => p.riskLevel === '高危'),
    allPlayers: playerRisks,
  };
}

function computePlayerChurnRisk(player, logins, contents) {
  let riskScore = 0;
  const signals = [];

  // 活跃天数
  const activeDays = logins.length;
  const totalDays = 28;
  const activeRate = activeDays / totalDays;

  if (activeRate < 0.2) {
    riskScore += 35;
    signals.push('登录严重不足');
  } else if (activeRate < 0.4) {
    riskScore += 20;
    signals.push('登录频率偏低');
  }

  // 后半月活跃度衰减
  const firstHalf = logins.filter(l => l.day <= 14).length;
  const secondHalf = logins.filter(l => l.day > 14).length;
  if (firstHalf > 0 && secondHalf / Math.max(1, firstHalf) < 0.5) {
    riskScore += 20;
    signals.push('活跃度骤降');
  }

  // 在线时长
  const avgOnline = logins.length > 0 ? logins.reduce((s, l) => s + l.totalOnlineMinutes, 0) / logins.length : 0;
  if (avgOnline < 10) {
    riskScore += 15;
    signals.push('在线时长极低');
  } else if (avgOnline < 20) {
    riskScore += 8;
    signals.push('在线时长偏低');
  }

  // 内容参与度
  if (contents.length === 0) {
    riskScore += 15;
    signals.push('未参与任何新内容');
  } else if (contents.length <= 1) {
    riskScore += 8;
    signals.push('内容参与度低');
  }

  // 付费停滞
  if (player.payTier !== '免费' && player.versionPayAmount === 0) {
    riskScore += 10;
    signals.push('版本内未付费');
  }

  // 满意度低
  const avgSat = contents.length > 0 ? contents.reduce((s, c) => s + c.satisfaction, 0) / contents.length : 0;
  if (contents.length > 0 && avgSat < 2.5) {
    riskScore += 10;
    signals.push('满意度偏低');
  }

  riskScore = Math.min(100, riskScore);

  const riskLevel = riskScore >= 60 ? '高危' : riskScore >= 35 ? '中危' : riskScore >= 15 ? '低危' : '安全';

  // 推荐操作
  let action = '保持关注';
  if (riskLevel === '高危') {
    if (player.payTier !== '免费') action = '发放专属回归礼包+客服触达';
    else action = '推送新内容引导+限时奖励';
  } else if (riskLevel === '中危') {
    action = '推送版本新内容+活动提醒';
  }

  return {
    playerId: player.playerId,
    level: player.level,
    payTier: player.payTier,
    riskScore,
    riskLevel,
    signals,
    activeDays,
    avgOnlineMinutes: Math.round(avgOnline),
    action,
  };
}

module.exports = { analyzeChurnRisk };
