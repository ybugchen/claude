/**
 * 版本新内容体验分析模块
 * 分析各内容的参与度、完成率、满意度、留存贡献
 */

function analyzeContentExperience(cleanedData) {
  const { contentExperience, players, loginRecords, versionInfo } = cleanedData;

  // 1. 各内容总览分析
  const contentOverview = analyzeContentOverview(contentExperience, players, versionInfo);

  // 2. 内容参与漏斗
  const contentFunnel = analyzeContentFunnel(contentExperience, players, versionInfo);

  // 3. 内容对留存的影响
  const contentRetentionImpact = analyzeRetentionImpact(contentExperience, loginRecords, players);

  // 4. 内容满意度排名
  const satisfactionRanking = computeSatisfactionRanking(contentExperience, versionInfo);

  // 5. 内容类型对比
  const typeComparison = analyzeByType(contentExperience, players);

  // 6. 首次体验时间分布
  const firstPlayDistribution = analyzeFirstPlayDistribution(contentExperience, versionInfo);

  return {
    contentOverview,
    contentFunnel,
    contentRetentionImpact,
    satisfactionRanking,
    typeComparison,
    firstPlayDistribution,
  };
}

function analyzeContentOverview(contentExp, players, versionInfo) {
  const overview = {};
  for (const content of versionInfo.newContentList) {
    const records = contentExp.filter(r => r.contentId === content.id);
    const participantCount = records.length;
    const participationRate = Math.round((participantCount / players.length) * 10000) / 100;

    overview[content.id] = {
      name: content.name,
      type: content.type,
      participantCount,
      participationRate,
      avgParticipationTimes: avg(records.map(r => r.participationTimes)),
      avgCompletionRate: avg(records.map(r => r.completionRate)) * 100,
      avgSatisfaction: avg(records.map(r => r.satisfaction)),
      avgDurationMinutes: avg(records.map(r => r.avgDurationMinutes)),
      totalPlaySessions: records.reduce((s, r) => s + r.participationTimes, 0),
    };
  }
  return overview;
}

function analyzeContentFunnel(contentExp, players, versionInfo) {
  // 漏斗：全部玩家 -> 接触版本内容 -> 参与多个内容 -> 深度参与（高完成率）
  const playersWithContent = new Set(contentExp.map(r => r.playerId));
  const contentCountByPlayer = {};

  for (const r of contentExp) {
    contentCountByPlayer[r.playerId] = (contentCountByPlayer[r.playerId] || 0) + 1;
  }

  const multiContentPlayers = Object.values(contentCountByPlayer).filter(c => c >= 3).length;
  const allContentPlayers = Object.values(contentCountByPlayer).filter(c => c >= versionInfo.newContentList.length).length;
  const deepPlayers = contentExp
    .filter(r => r.completionRate >= 0.8 && r.participationTimes >= 5)
    .map(r => r.playerId);
  const uniqueDeepPlayers = new Set(deepPlayers).size;

  return {
    totalPlayers: players.length,
    touchedNewContent: playersWithContent.size,
    touchedRate: Math.round((playersWithContent.size / players.length) * 10000) / 100,
    multiContentPlayers,
    multiContentRate: Math.round((multiContentPlayers / players.length) * 10000) / 100,
    allContentPlayers,
    allContentRate: Math.round((allContentPlayers / players.length) * 10000) / 100,
    deepEngagedPlayers: uniqueDeepPlayers,
    deepEngagedRate: Math.round((uniqueDeepPlayers / players.length) * 10000) / 100,
  };
}

function analyzeRetentionImpact(contentExp, loginRecords, players) {
  // 比较参与了版本新内容和没参与的玩家的留存率
  const participatedPlayers = new Set(contentExp.map(r => r.playerId));

  const getRetention = (playerIds) => {
    let day7 = 0, day14 = 0, day28 = 0, total = 0;
    for (const pid of playerIds) {
      const records = loginRecords.filter(r => r.playerId === pid);
      const days = new Set(records.map(r => r.day));
      total++;
      if (days.has(7)) day7++;
      if (days.has(14)) day14++;
      if (days.has(28)) day28++;
    }
    return {
      count: total,
      day7: total > 0 ? Math.round((day7 / total) * 10000) / 100 : 0,
      day14: total > 0 ? Math.round((day14 / total) * 10000) / 100 : 0,
      day28: total > 0 ? Math.round((day28 / total) * 10000) / 100 : 0,
    };
  };

  const allPlayerIds = players.map(p => p.playerId);
  const nonParticipated = allPlayerIds.filter(id => !participatedPlayers.has(id));

  return {
    participatedRetention: getRetention([...participatedPlayers]),
    nonParticipatedRetention: getRetention(nonParticipated),
    retentionLift: {
      day7: Math.round(
        (getRetention([...participatedPlayers]).day7 - getRetention(nonParticipated).day7) * 100
      ) / 100,
      day14: Math.round(
        (getRetention([...participatedPlayers]).day14 - getRetention(nonParticipated).day14) * 100
      ) / 100,
      day28: Math.round(
        (getRetention([...participatedPlayers]).day28 - getRetention(nonParticipated).day28) * 100
      ) / 100,
    },
  };
}

function computeSatisfactionRanking(contentExp, versionInfo) {
  const ranking = [];
  for (const content of versionInfo.newContentList) {
    const records = contentExp.filter(r => r.contentId === content.id);
    if (records.length === 0) continue;
    ranking.push({
      contentId: content.id,
      name: content.name,
      type: content.type,
      avgSatisfaction: avg(records.map(r => r.satisfaction)),
      participantCount: records.length,
      avgCompletionRate: Math.round(avg(records.map(r => r.completionRate)) * 10000) / 100,
    });
  }
  return ranking.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction);
}

function analyzeByType(contentExp, players) {
  const types = [...new Set(contentExp.map(r => r.contentType))];
  const comparison = {};

  for (const type of types) {
    const records = contentExp.filter(r => r.contentType === type);
    const uniquePlayers = new Set(records.map(r => r.playerId)).size;
    comparison[type] = {
      uniquePlayers,
      participationRate: Math.round((uniquePlayers / players.length) * 10000) / 100,
      avgTimes: avg(records.map(r => r.participationTimes)),
      avgCompletion: Math.round(avg(records.map(r => r.completionRate)) * 10000) / 100,
      avgSatisfaction: avg(records.map(r => r.satisfaction)),
      avgDuration: avg(records.map(r => r.avgDurationMinutes)),
    };
  }

  return comparison;
}

function analyzeFirstPlayDistribution(contentExp, versionInfo) {
  const distribution = {};
  for (const content of versionInfo.newContentList) {
    const records = contentExp.filter(r => r.contentId === content.id);
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

function avg(arr) {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
}

module.exports = { analyzeContentExperience };
