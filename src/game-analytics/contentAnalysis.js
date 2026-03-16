/**
 * 版本新内容体验分析模块
 * 分析各内容的参与度、完成率、满意度、留存贡献
 *
 * 性能优化：
 * - 预建 contentExp 按 contentId/playerId 的 Map 索引，避免多函数重复 filter
 * - 预建 loginRecords 按 playerId 的 Map 索引，留存计算从 O(players×records) 降为 O(players+records)
 * - getRetention 结果缓存，retentionLift 不再重复调用
 */

function analyzeContentExperience(cleanedData) {
  const { contentExperience, players, loginRecords, versionInfo } = cleanedData;

  // 预建索引 — 只遍历一次
  const expByContent = groupBy(contentExperience, 'contentId');
  const expByPlayer = groupBy(contentExperience, 'playerId');
  const loginByPlayer = groupBy(loginRecords, 'playerId');

  // 1. 各内容总览分析
  const contentOverview = analyzeContentOverview(expByContent, players, versionInfo);

  // 2. 内容参与漏斗
  const contentFunnel = analyzeContentFunnel(expByPlayer, players, versionInfo);

  // 3. 内容对留存的影响
  const contentRetentionImpact = analyzeRetentionImpact(expByPlayer, loginByPlayer, players);

  // 4. 内容满意度排名
  const satisfactionRanking = computeSatisfactionRanking(expByContent, versionInfo);

  // 5. 内容类型对比
  const typeComparison = analyzeByType(contentExperience, players);

  // 6. 首次体验时间分布
  const firstPlayDistribution = analyzeFirstPlayDistribution(expByContent, versionInfo);

  return {
    contentOverview,
    contentFunnel,
    contentRetentionImpact,
    satisfactionRanking,
    typeComparison,
    firstPlayDistribution,
  };
}

function analyzeContentOverview(expByContent, players, versionInfo) {
  const overview = {};
  const totalPlayers = players.length;

  for (const content of versionInfo.newContentList) {
    const records = expByContent.get(content.id) || [];
    const participantCount = records.length;

    // 内联聚合，避免多次 map + reduce
    let sumTimes = 0, sumCompletion = 0, sumSatisfaction = 0, sumDuration = 0, sumPlaySessions = 0;
    for (const r of records) {
      sumTimes += r.participationTimes;
      sumCompletion += r.completionRate;
      sumSatisfaction += r.satisfaction;
      sumDuration += r.avgDurationMinutes;
      sumPlaySessions += r.participationTimes;
    }

    const count = participantCount || 1;
    overview[content.id] = {
      name: content.name,
      type: content.type,
      participantCount,
      participationRate: Math.round((participantCount / totalPlayers) * 10000) / 100,
      avgParticipationTimes: Math.round(sumTimes / count * 100) / 100,
      avgCompletionRate: Math.round(sumCompletion / count * 100 * 100) / 100,
      avgSatisfaction: Math.round(sumSatisfaction / count * 100) / 100,
      avgDurationMinutes: Math.round(sumDuration / count * 100) / 100,
      totalPlaySessions: sumPlaySessions,
    };
  }
  return overview;
}

function analyzeContentFunnel(expByPlayer, players, versionInfo) {
  // 漏斗：全部玩家 -> 接触版本内容 -> 参与多个内容 -> 深度参与（高完成率）
  const totalPlayers = players.length;
  let touchedCount = 0;
  let multiContentCount = 0;
  let allContentCount = 0;
  const deepPlayerSet = new Set();
  const contentListSize = versionInfo.newContentList.length;

  for (const [playerId, records] of expByPlayer) {
    touchedCount++;
    const contentCount = records.length;
    if (contentCount >= 3) multiContentCount++;
    if (contentCount >= contentListSize) allContentCount++;
    for (const r of records) {
      if (r.completionRate >= 0.8 && r.participationTimes >= 5) {
        deepPlayerSet.add(playerId);
        break; // 只需标记一次
      }
    }
  }

  return {
    totalPlayers,
    touchedNewContent: touchedCount,
    touchedRate: Math.round((touchedCount / totalPlayers) * 10000) / 100,
    multiContentPlayers: multiContentCount,
    multiContentRate: Math.round((multiContentCount / totalPlayers) * 10000) / 100,
    allContentPlayers: allContentCount,
    allContentRate: Math.round((allContentCount / totalPlayers) * 10000) / 100,
    deepEngagedPlayers: deepPlayerSet.size,
    deepEngagedRate: Math.round((deepPlayerSet.size / totalPlayers) * 10000) / 100,
  };
}

function analyzeRetentionImpact(expByPlayer, loginByPlayer, players) {
  // 比较参与了版本新内容和没参与的玩家的留存率
  const participatedIds = new Set(expByPlayer.keys());

  // 一次遍历计算两组留存，不再调用多次 getRetention
  let pDay7 = 0, pDay14 = 0, pDay28 = 0, pTotal = 0;
  let nDay7 = 0, nDay14 = 0, nDay28 = 0, nTotal = 0;

  for (const player of players) {
    const pid = player.playerId;
    const records = loginByPlayer.get(pid) || [];
    const days = new Set();
    for (const r of records) {
      days.add(r.day);
    }

    const participated = participatedIds.has(pid);
    if (participated) {
      pTotal++;
      if (days.has(7)) pDay7++;
      if (days.has(14)) pDay14++;
      if (days.has(28)) pDay28++;
    } else {
      nTotal++;
      if (days.has(7)) nDay7++;
      if (days.has(14)) nDay14++;
      if (days.has(28)) nDay28++;
    }
  }

  const pRet = {
    count: pTotal,
    day7: pTotal > 0 ? Math.round((pDay7 / pTotal) * 10000) / 100 : 0,
    day14: pTotal > 0 ? Math.round((pDay14 / pTotal) * 10000) / 100 : 0,
    day28: pTotal > 0 ? Math.round((pDay28 / pTotal) * 10000) / 100 : 0,
  };
  const nRet = {
    count: nTotal,
    day7: nTotal > 0 ? Math.round((nDay7 / nTotal) * 10000) / 100 : 0,
    day14: nTotal > 0 ? Math.round((nDay14 / nTotal) * 10000) / 100 : 0,
    day28: nTotal > 0 ? Math.round((nDay28 / nTotal) * 10000) / 100 : 0,
  };

  return {
    participatedRetention: pRet,
    nonParticipatedRetention: nRet,
    retentionLift: {
      day7: Math.round((pRet.day7 - nRet.day7) * 100) / 100,
      day14: Math.round((pRet.day14 - nRet.day14) * 100) / 100,
      day28: Math.round((pRet.day28 - nRet.day28) * 100) / 100,
    },
  };
}

function computeSatisfactionRanking(expByContent, versionInfo) {
  const ranking = [];
  for (const content of versionInfo.newContentList) {
    const records = expByContent.get(content.id) || [];
    if (records.length === 0) continue;

    let sumSatisfaction = 0, sumCompletion = 0;
    for (const r of records) {
      sumSatisfaction += r.satisfaction;
      sumCompletion += r.completionRate;
    }
    const count = records.length;

    ranking.push({
      contentId: content.id,
      name: content.name,
      type: content.type,
      avgSatisfaction: Math.round(sumSatisfaction / count * 100) / 100,
      participantCount: count,
      avgCompletionRate: Math.round(sumCompletion / count * 10000) / 100,
    });
  }
  return ranking.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
}

function analyzeByType(contentExp, players) {
  // 按 contentType 分组 — 一次遍历
  const typeMap = new Map();
  for (const r of contentExp) {
    let group = typeMap.get(r.contentType);
    if (!group) {
      group = { records: [], playerSet: new Set() };
      typeMap.set(r.contentType, group);
    }
    group.records.push(r);
    group.playerSet.add(r.playerId);
  }

  const totalPlayers = players.length;
  const comparison = {};

  for (const [type, { records, playerSet }] of typeMap) {
    let sumTimes = 0, sumCompletion = 0, sumSatisfaction = 0, sumDuration = 0;
    for (const r of records) {
      sumTimes += r.participationTimes;
      sumCompletion += r.completionRate;
      sumSatisfaction += r.satisfaction;
      sumDuration += r.avgDurationMinutes;
    }
    const count = records.length;

    comparison[type] = {
      uniquePlayers: playerSet.size,
      participationRate: Math.round((playerSet.size / totalPlayers) * 10000) / 100,
      avgTimes: Math.round(sumTimes / count * 100) / 100,
      avgCompletion: Math.round(sumCompletion / count * 10000) / 100,
      avgSatisfaction: Math.round(sumSatisfaction / count * 100) / 100,
      avgDuration: Math.round(sumDuration / count * 100) / 100,
    };
  }

  return comparison;
}

function analyzeFirstPlayDistribution(expByContent, versionInfo) {
  const distribution = {};
  for (const content of versionInfo.newContentList) {
    const records = expByContent.get(content.id) || [];
    const dayBuckets = { 'Day1-3': 0, 'Day4-7': 0, 'Day8-14': 0, 'Day15-28': 0 };
    for (const r of records) {
      if (r.firstPlayDay <= 3) dayBuckets['Day1-3']++;
      else if (r.firstPlayDay <= 7) dayBuckets['Day4-7']++;
      else if (r.firstPlayDay <= 14) dayBuckets['Day8-14']++;
      else dayBuckets['Day15-28']++;
    }
    // Convert to percentages
    const total = records.length || 1;
    distribution[content.id] = {
      name: content.name,
      buckets: Object.fromEntries(
        Object.entries(dayBuckets).map(([k, v]) => [k, Math.round((v / total) * 10000) / 100])
      ),
    };
  }
  return distribution;
}

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

module.exports = { analyzeContentExperience };
