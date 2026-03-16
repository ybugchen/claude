/**
 * 用户分层分析模块
 * 按付费层级、活跃度、生命周期进行多维分层
 *
 * 性能优化：
 * - 预建 loginRecordsByPlayer Map，将 computePlayerMetrics 从 O(players×records) 降为 O(players+records)
 * - 预建 playersByTier Map，避免 analyzePaySegments/analyzeCrossSegments 中重复 filter
 */

function analyzeUserSegmentation(cleanedData) {
  const { players, loginRecords } = cleanedData;

  // 预建索引：按 playerId 分组登录记录 — O(loginRecords)
  const loginByPlayer = groupBy(loginRecords, 'playerId');

  // 预建索引：按 payTier 分组玩家 — O(players)
  const playersByTier = groupBy(players, 'payTier');

  // 计算每个玩家的活跃指标
  const playerMetrics = computePlayerMetrics(players, loginByPlayer);

  // 1. 付费分层分析
  const paySegments = analyzePaySegments(players, playersByTier, playerMetrics);

  // 2. 活跃度分层分析
  const activitySegments = analyzeActivitySegments(playerMetrics);

  // 3. 生命周期分层
  const lifecycleSegments = analyzeLifecycleSegments(players, playerMetrics);

  // 4. 交叉分析（付费 × 活跃度）
  const crossAnalysis = analyzeCrossSegments(playersByTier, playerMetrics);

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

function computePlayerMetrics(players, loginByPlayer) {
  const metrics = {};

  for (const player of players) {
    // O(1) 查找，而非 O(loginRecords) 的 filter
    const records = loginByPlayer.get(player.playerId) || [];
    const activeDays = records.length;
    let totalOnline = 0;
    let totalSessions = 0;
    for (const r of records) {
      totalOnline += r.totalOnlineMinutes;
      totalSessions += r.sessionCount;
    }

    // 计算连续登录天数
    const loginDays = new Set(records.map(r => r.day));
    let maxConsecutive = 0;
    let current = 0;
    for (let d = 1; d <= 28; d++) {
      if (loginDays.has(d)) {
        current++;
        if (current > maxConsecutive) maxConsecutive = current;
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

function analyzePaySegments(players, playersByTier, playerMetrics) {
  const segments = {};
  const tiers = ['免费', '小R', '中R', '大R', '超R'];
  const totalPlayers = players.length;

  for (const tier of tiers) {
    // 直接从预建索引取，避免 players.filter()
    const tierPlayers = playersByTier.get(tier) || [];
    const tierMetrics = [];
    for (const p of tierPlayers) {
      const m = playerMetrics[p.playerId];
      if (m) tierMetrics.push(m);
    }

    const tierCount = tierPlayers.length;
    const metricsCount = tierMetrics.length;

    // 内联聚合，避免多次 map + avg
    let sumActiveDays = 0, sumOnline = 0, sumVersionPay = 0;
    let retDay7 = 0, retDay14 = 0, retDay28 = 0;
    for (let i = 0; i < metricsCount; i++) {
      sumActiveDays += tierMetrics[i].activeDays;
      sumOnline += tierMetrics[i].totalOnlineMinutes;
      if (tierMetrics[i].retention.day7) retDay7++;
      if (tierMetrics[i].retention.day14) retDay14++;
      if (tierMetrics[i].retention.day28) retDay28++;
    }
    for (const p of tierPlayers) {
      sumVersionPay += p.versionPayAmount;
    }

    segments[tier] = {
      playerCount: tierCount,
      percentage: Math.round((tierCount / totalPlayers) * 10000) / 100,
      avgActiveDays: metricsCount > 0 ? Math.round(sumActiveDays / metricsCount * 100) / 100 : 0,
      avgOnlineMinutes: metricsCount > 0 ? Math.round(sumOnline / metricsCount * 100) / 100 : 0,
      avgVersionPay: tierCount > 0 ? Math.round(sumVersionPay / tierCount * 100) / 100 : 0,
      totalVersionRevenue: sumVersionPay,
      retentionDay7: metricsCount > 0 ? Math.round(retDay7 / metricsCount * 10000) / 100 : 0,
      retentionDay14: metricsCount > 0 ? Math.round(retDay14 / metricsCount * 10000) / 100 : 0,
      retentionDay28: metricsCount > 0 ? Math.round(retDay28 / metricsCount * 10000) / 100 : 0,
    };
  }

  return segments;
}

function analyzeActivitySegments(playerMetrics) {
  const allMetrics = Object.values(playerMetrics);
  const totalCount = allMetrics.length;

  // 按活跃度分组 — 一次遍历
  const groups = { '高活跃': [], '中活跃': [], '低活跃': [], '流失风险': [] };
  for (const m of allMetrics) {
    groups[m.activityLevel].push(m);
  }

  const segments = {};
  const levels = ['高活跃', '中活跃', '低活跃', '流失风险'];

  for (const level of levels) {
    const group = groups[level];
    const count = group.length;

    // 内联聚合
    let sumOnlinePerDay = 0, sumSessions = 0, sumConsecutive = 0;
    const tierCounts = {};
    for (const m of group) {
      sumOnlinePerDay += m.avgOnlinePerDay;
      sumSessions += m.totalSessions;
      sumConsecutive += m.maxConsecutiveDays;
      tierCounts[m.payTier] = (tierCounts[m.payTier] || 0) + 1;
    }

    // 转为百分比
    for (const key of Object.keys(tierCounts)) {
      tierCounts[key] = Math.round((tierCounts[key] / count) * 10000) / 100;
    }

    segments[level] = {
      playerCount: count,
      percentage: Math.round((count / totalCount) * 10000) / 100,
      avgOnlinePerDay: count > 0 ? Math.round(sumOnlinePerDay / count * 100) / 100 : 0,
      avgSessions: count > 0 ? Math.round(sumSessions / count * 100) / 100 : 0,
      avgConsecutiveDays: count > 0 ? Math.round(sumConsecutive / count * 100) / 100 : 0,
      payTierDistribution: tierCounts,
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

  const totalPlayers = players.length;

  // 一次遍历分桶
  const stageBuckets = stages.map(() => []);
  for (const p of players) {
    for (let i = 0; i < stages.length; i++) {
      if (p.registerDaysBefore >= stages[i].minDays && p.registerDaysBefore <= stages[i].maxDays) {
        stageBuckets[i].push(p);
        break;
      }
    }
  }

  for (let i = 0; i < stages.length; i++) {
    const group = stageBuckets[i];
    const count = group.length;

    let sumActiveDays = 0, sumVersionPay = 0, retDay28 = 0, metricsCount = 0;
    for (const p of group) {
      const m = playerMetrics[p.playerId];
      if (m) {
        sumActiveDays += m.activeDays;
        if (m.retention.day28) retDay28++;
        metricsCount++;
      }
      sumVersionPay += p.versionPayAmount;
    }

    segments[stages[i].name] = {
      playerCount: count,
      percentage: Math.round((count / totalPlayers) * 10000) / 100,
      avgActiveDays: metricsCount > 0 ? Math.round(sumActiveDays / metricsCount * 100) / 100 : 0,
      avgVersionPay: count > 0 ? Math.round(sumVersionPay / count * 100) / 100 : 0,
      retentionDay28: metricsCount > 0
        ? Math.round(retDay28 / metricsCount * 10000) / 100
        : 0,
    };
  }

  return segments;
}

function analyzeCrossSegments(playersByTier, playerMetrics) {
  const payTiers = ['免费', '小R', '中R', '大R', '超R'];
  const actLevels = ['高活跃', '中活跃', '低活跃', '流失风险'];
  const matrix = {};

  for (const pay of payTiers) {
    matrix[pay] = {};
    // 初始化
    for (const act of actLevels) {
      matrix[pay][act] = { count: 0, totalVersionPay: 0 };
    }

    // 一次遍历该 tier 的玩家
    const tierPlayers = playersByTier.get(pay) || [];
    for (const p of tierPlayers) {
      const m = playerMetrics[p.playerId];
      if (!m) continue;
      const cell = matrix[pay][m.activityLevel];
      cell.count++;
      cell.totalVersionPay += p.versionPayAmount;
    }

    // 计算均值
    for (const act of actLevels) {
      const cell = matrix[pay][act];
      cell.avgVersionPay = cell.count > 0
        ? Math.round(cell.totalVersionPay / cell.count * 100) / 100
        : 0;
      delete cell.totalVersionPay;
    }
  }

  return matrix;
}

function computeSummary(players, playerMetrics) {
  const allMetrics = Object.values(playerMetrics);
  const totalPlayers = players.length;
  const metricsCount = allMetrics.length;

  let payingCount = 0, totalRevenue = 0, payingRevenue = 0;
  for (const p of players) {
    totalRevenue += p.versionPayAmount;
    if (p.payTier !== '免费') {
      payingCount++;
      payingRevenue += p.versionPayAmount;
    }
  }

  let sumActiveDays = 0, sumAvgOnline = 0, day7Count = 0, day28Count = 0;
  for (const m of allMetrics) {
    sumActiveDays += m.activeDays;
    sumAvgOnline += m.totalOnlineMinutes / Math.max(1, m.activeDays);
    if (m.retention.day7) day7Count++;
    if (m.retention.day28) day28Count++;
  }

  return {
    totalPlayers,
    totalVersionRevenue: totalRevenue,
    payingRate: Math.round((payingCount / totalPlayers) * 10000) / 100,
    arppu: payingCount > 0 ? Math.round(payingRevenue / payingCount) : 0,
    arpu: Math.round(totalRevenue / totalPlayers),
    avgDAU: Math.round(metricsCount > 0 ? sumActiveDays / metricsCount : 0),
    avgOnlineMinutes: Math.round(metricsCount > 0 ? sumAvgOnline / metricsCount : 0),
    day7Retention: Math.round(day7Count / metricsCount * 10000) / 100,
    day28Retention: Math.round(day28Count / metricsCount * 10000) / 100,
  };
}

// ---- Helpers ----
function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = item[key];
    let list = map.get(k);
    if (!list) {
      list = [];
      map.set(k, list);
    }
    list.push(item);
  }
  return map;
}

module.exports = { analyzeUserSegmentation };
