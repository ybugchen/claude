/**
 * 用户分层分析模块
 * 按付费层级、活跃度、生命周期进行多维分层
 */

function analyzeUserSegmentation(cleanedData) {
  const { players, loginRecords } = cleanedData;

  // 计算每个玩家的活跃指标
  const playerMetrics = computePlayerMetrics(players, loginRecords);

  // 1. 付费分层分析
  const paySegments = analyzePaySegments(players, playerMetrics);

  // 2. 活跃度分层分析
  const activitySegments = analyzeActivitySegments(playerMetrics);

  // 3. 生命周期分层
  const lifecycleSegments = analyzeLifecycleSegments(players, playerMetrics);

  // 4. 交叉分析（付费 × 活跃度）
  const crossAnalysis = analyzeCrossSegments(players, playerMetrics);

  // 5. 关键指标汇总
  const summary = computeSummary(players, playerMetrics);

  return {
    summary,
    paySegments,
    activitySegments,
    lifecycleSegments,
    crossAnalysis,
    playerMetrics,
  };
}

function computePlayerMetrics(players, loginRecords) {
  const metrics = {};

  for (const player of players) {
    const records = loginRecords.filter(r => r.playerId === player.playerId);
    const activeDays = records.length;
    const totalOnline = records.reduce((sum, r) => sum + r.totalOnlineMinutes, 0);
    const totalSessions = records.reduce((sum, r) => sum + r.sessionCount, 0);

    // 计算连续登录天数
    const loginDays = new Set(records.map(r => r.day));
    let maxConsecutive = 0;
    let current = 0;
    for (let d = 1; d <= 28; d++) {
      if (loginDays.has(d)) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }

    // 计算留存（第1天、第7天、第14天、第28天是否登录）
    const retention = {
      day1: loginDays.has(1),
      day7: loginDays.has(7),
      day14: loginDays.has(14),
      day28: loginDays.has(28),
    };

    // 活跃度分级
    let activityLevel;
    if (activeDays >= 21) activityLevel = '高活跃';
    else if (activeDays >= 14) activityLevel = '中活跃';
    else if (activeDays >= 7) activityLevel = '低活跃';
    else activityLevel = '流失风险';

    metrics[player.playerId] = {
      playerId: player.playerId,
      level: player.level,
      payTier: player.payTier,
      activeDays,
      totalOnlineMinutes: totalOnline,
      avgOnlinePerDay: activeDays > 0 ? Math.round(totalOnline / activeDays) : 0,
      totalSessions,
      avgSessionsPerDay: activeDays > 0 ? Math.round((totalSessions / activeDays) * 10) / 10 : 0,
      maxConsecutiveDays: maxConsecutive,
      retention,
      activityLevel,
    };
  }

  return metrics;
}

function analyzePaySegments(players, playerMetrics) {
  const segments = {};
  const tiers = ['免费', '小R', '中R', '大R', '超R'];

  for (const tier of tiers) {
    const tierPlayers = players.filter(p => p.payTier === tier);
    const tierMetrics = tierPlayers.map(p => playerMetrics[p.playerId]).filter(Boolean);

    segments[tier] = {
      playerCount: tierPlayers.length,
      percentage: Math.round((tierPlayers.length / players.length) * 10000) / 100,
      avgActiveDays: avg(tierMetrics.map(m => m.activeDays)),
      avgOnlineMinutes: avg(tierMetrics.map(m => m.totalOnlineMinutes)),
      avgVersionPay: avg(tierPlayers.map(p => p.versionPayAmount)),
      totalVersionRevenue: tierPlayers.reduce((s, p) => s + p.versionPayAmount, 0),
      retentionDay7: Math.round(tierMetrics.filter(m => m.retention.day7).length / tierMetrics.length * 10000) / 100,
      retentionDay14: Math.round(tierMetrics.filter(m => m.retention.day14).length / tierMetrics.length * 10000) / 100,
      retentionDay28: Math.round(tierMetrics.filter(m => m.retention.day28).length / tierMetrics.length * 10000) / 100,
    };
  }

  return segments;
}

function analyzeActivitySegments(playerMetrics) {
  const allMetrics = Object.values(playerMetrics);
  const segments = {};
  const levels = ['高活跃', '中活跃', '低活跃', '流失风险'];

  for (const level of levels) {
    const group = allMetrics.filter(m => m.activityLevel === level);
    segments[level] = {
      playerCount: group.length,
      percentage: Math.round((group.length / allMetrics.length) * 10000) / 100,
      avgOnlinePerDay: avg(group.map(m => m.avgOnlinePerDay)),
      avgSessions: avg(group.map(m => m.totalSessions)),
      avgConsecutiveDays: avg(group.map(m => m.maxConsecutiveDays)),
      payTierDistribution: computeDistribution(group, 'payTier'),
    };
  }

  return segments;
}

function analyzeLifecycleSegments(players, playerMetrics) {
  const segments = {};
  const stages = [
    { name: '新进玩家', minDays: 0, maxDays: 7 },
    { name: '成长期', minDays: 8, maxDays: 30 },
    { name: '成熟期', minDays: 31, maxDays: 180 },
    { name: '老玩家', minDays: 181, maxDays: 365 },
    { name: '元老级', minDays: 366, maxDays: Infinity },
  ];

  for (const stage of stages) {
    const group = players.filter(p =>
      p.registerDaysBefore >= stage.minDays && p.registerDaysBefore <= stage.maxDays
    );
    const groupMetrics = group.map(p => playerMetrics[p.playerId]).filter(Boolean);

    segments[stage.name] = {
      playerCount: group.length,
      percentage: Math.round((group.length / players.length) * 10000) / 100,
      avgActiveDays: avg(groupMetrics.map(m => m.activeDays)),
      avgVersionPay: avg(group.map(p => p.versionPayAmount)),
      retentionDay28: groupMetrics.length > 0
        ? Math.round(groupMetrics.filter(m => m.retention.day28).length / groupMetrics.length * 10000) / 100
        : 0,
    };
  }

  return segments;
}

function analyzeCrossSegments(players, playerMetrics) {
  const payTiers = ['免费', '小R', '中R', '大R', '超R'];
  const actLevels = ['高活跃', '中活跃', '低活跃', '流失风险'];
  const matrix = {};

  for (const pay of payTiers) {
    matrix[pay] = {};
    for (const act of actLevels) {
      const group = players.filter(p => {
        const m = playerMetrics[p.playerId];
        return p.payTier === pay && m && m.activityLevel === act;
      });
      matrix[pay][act] = {
        count: group.length,
        avgVersionPay: avg(group.map(p => p.versionPayAmount)),
      };
    }
  }

  return matrix;
}

function computeSummary(players, playerMetrics) {
  const allMetrics = Object.values(playerMetrics);
  const payingPlayers = players.filter(p => p.payTier !== '免费');

  return {
    totalPlayers: players.length,
    totalVersionRevenue: players.reduce((s, p) => s + p.versionPayAmount, 0),
    payingRate: Math.round((payingPlayers.length / players.length) * 10000) / 100,
    arppu: payingPlayers.length > 0
      ? Math.round(payingPlayers.reduce((s, p) => s + p.versionPayAmount, 0) / payingPlayers.length)
      : 0,
    arpu: Math.round(players.reduce((s, p) => s + p.versionPayAmount, 0) / players.length),
    avgDAU: Math.round(avg(allMetrics.map(m => m.activeDays))),
    avgOnlineMinutes: Math.round(avg(allMetrics.map(m => m.totalOnlineMinutes / Math.max(1, m.activeDays)))),
    day7Retention: Math.round(allMetrics.filter(m => m.retention.day7).length / allMetrics.length * 10000) / 100,
    day28Retention: Math.round(allMetrics.filter(m => m.retention.day28).length / allMetrics.length * 10000) / 100,
  };
}

// ---- Helpers ----
function avg(arr) {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
}

function computeDistribution(items, field) {
  const dist = {};
  for (const item of items) {
    const val = item[field];
    dist[val] = (dist[val] || 0) + 1;
  }
  // Convert to percentages
  const total = items.length;
  for (const key of Object.keys(dist)) {
    dist[key] = Math.round((dist[key] / total) * 10000) / 100;
  }
  return dist;
}

module.exports = { analyzeUserSegmentation };
