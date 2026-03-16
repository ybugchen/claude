/**
 * 活动 ROI 分析
 * 量化评估每个运营活动的投入产出比
 */

function analyzeEventROI(cleanedData) {
  const { players, loginRecords, contentExperience, itemTransactions, versionInfo } = cleanedData;

  // 从版本内容中提取活动类型内容
  const eventContents = (versionInfo.newContentList || []).filter(c =>
    ['event', 'dungeon', 'boss'].includes(c.type)
  );

  const totalPlayers = players.length;

  // 构建玩家付费索引
  const payByPlayer = new Map();
  for (const tx of itemTransactions) {
    if (tx.currency === 'rmb') {
      payByPlayer.set(tx.playerId, (payByPlayer.get(tx.playerId) || 0) + tx.totalSpent);
    }
  }

  // 分析每个活动
  const events = eventContents.map(content => {
    const participants = contentExperience.filter(ce => ce.contentId === content.id);
    const participantIds = new Set(participants.map(p => p.playerId));

    const participationRate = Math.round(participantIds.size / totalPlayers * 10000) / 100;
    const avgCompletion = participants.length > 0
      ? Math.round(participants.reduce((s, p) => s + p.completionRate, 0) / participants.length * 10000) / 100
      : 0;

    // 参与者付费 vs 非参与者付费
    let participantRevenue = 0;
    let nonParticipantRevenue = 0;
    for (const player of players) {
      const pay = payByPlayer.get(player.playerId) || 0;
      if (participantIds.has(player.playerId)) {
        participantRevenue += pay;
      } else {
        nonParticipantRevenue += pay;
      }
    }

    const nonParticipantCount = totalPlayers - participantIds.size;
    const baselinePerPlayer = nonParticipantCount > 0 ? nonParticipantRevenue / nonParticipantCount : 0;
    const baselineRevenue = Math.round(baselinePerPlayer * participantIds.size);
    const incrementalRevenue = Math.round(participantRevenue - baselineRevenue);

    // 估算活动成本（基于奖励价值）
    const avgTimes = participants.length > 0
      ? participants.reduce((s, p) => s + p.participationTimes, 0) / participants.length
      : 0;
    const estimatedCost = Math.round(participantIds.size * avgTimes * 5); // 假设每次参与奖励价值5元

    const roi = estimatedCost > 0 ? Math.round((incrementalRevenue - estimatedCost) / estimatedCost * 10000) / 100 : 0;

    // 留存提升估算
    const participantLogins = loginRecords.filter(l => participantIds.has(l.playerId));
    const nonParticipantLogins = loginRecords.filter(l => !participantIds.has(l.playerId));

    const pDay7 = participantIds.size > 0
      ? Math.round(new Set(participantLogins.filter(l => l.day >= 7).map(l => l.playerId)).size / participantIds.size * 10000) / 100
      : 0;
    const npDay7 = nonParticipantCount > 0
      ? Math.round(new Set(nonParticipantLogins.filter(l => l.day >= 7).map(l => l.playerId)).size / nonParticipantCount * 10000) / 100
      : 0;

    return {
      id: content.id,
      name: content.name,
      type: content.type === 'event' ? '限时活动' : content.type === 'dungeon' ? '副本挑战' : 'BOSS挑战',
      participationRate,
      completionRate: avgCompletion,
      participantCount: participantIds.size,
      baselineRevenue,
      incrementalRevenue,
      cost: estimatedCost,
      roi,
      retentionLift: {
        day7: Math.round((pDay7 - npDay7) * 100) / 100,
      },
    };
  });

  // 类型对比
  const typeMap = {};
  for (const ev of events) {
    if (!typeMap[ev.type]) typeMap[ev.type] = { count: 0, totalParticipation: 0, totalRoi: 0, totalRevenue: 0 };
    typeMap[ev.type].count++;
    typeMap[ev.type].totalParticipation += ev.participationRate;
    typeMap[ev.type].totalRoi += ev.roi;
    typeMap[ev.type].totalRevenue += Math.max(0, ev.incrementalRevenue);
  }
  const typeComparison = {};
  for (const [type, d] of Object.entries(typeMap)) {
    typeComparison[type] = {
      count: d.count,
      avgParticipation: Math.round(d.totalParticipation / d.count * 100) / 100,
      avgRoi: Math.round(d.totalRoi / d.count * 100) / 100,
      totalRevenue: d.totalRevenue,
    };
  }

  const avgRoi = events.length > 0 ? Math.round(events.reduce((s, e) => s + e.roi, 0) / events.length * 100) / 100 : 0;
  const totalIncrementalRevenue = events.reduce((s, e) => s + Math.max(0, e.incrementalRevenue), 0);

  return {
    summary: {
      totalEvents: events.length,
      avgRoi,
      totalIncrementalRevenue,
      avgParticipationRate: Math.round(events.reduce((s, e) => s + e.participationRate, 0) / Math.max(1, events.length) * 100) / 100,
    },
    events,
    typeComparison,
  };
}

module.exports = { analyzeEventROI };
