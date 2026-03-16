/**
 * 队列分析（Cohort Analysis）
 * 按注册时间将玩家分组，追踪各队列的长期行为演变
 */

function analyzeCohorts(cleanedData) {
  const { players, loginRecords, itemTransactions } = cleanedData;

  // 按注册时间段分组（每7天一个队列）
  const cohortMap = new Map();
  for (const player of players) {
    const cohortWeek = Math.ceil(player.registerDaysBefore / 90); // 按注册远近分组
    const key = `第${cohortWeek}批`;
    if (!cohortMap.has(key)) cohortMap.set(key, []);
    cohortMap.get(key).push(player);
  }

  // 构建登录索引
  const loginByPlayer = new Map();
  for (const rec of loginRecords) {
    if (!loginByPlayer.has(rec.playerId)) loginByPlayer.set(rec.playerId, []);
    loginByPlayer.get(rec.playerId).push(rec);
  }

  // 构建付费索引
  const payByPlayer = new Map();
  for (const tx of itemTransactions) {
    if (tx.currency === 'rmb') {
      payByPlayer.set(tx.playerId, (payByPlayer.get(tx.playerId) || 0) + tx.totalSpent);
    }
  }

  const cohorts = [];
  for (const [key, cohortPlayers] of cohortMap) {
    const size = cohortPlayers.length;
    if (size < 5) continue; // 忽略过小的队列

    // 计算留存率（基于28天数据的不同时间点）
    const retentionDays = { day1: 1, day3: 3, day7: 7, day14: 14, day28: 28 };
    const retention = {};
    for (const [label, day] of Object.entries(retentionDays)) {
      const activeOnDay = new Set();
      for (const player of cohortPlayers) {
        const logins = loginByPlayer.get(player.playerId) || [];
        if (logins.some(l => l.day >= day)) {
          activeOnDay.add(player.playerId);
        }
      }
      retention[label] = Math.round(activeOnDay.size / size * 10000) / 100;
    }

    // 计算LTV
    const totalPay7 = cohortPlayers.reduce((s, p) => {
      const logins = loginByPlayer.get(p.playerId) || [];
      const hasEarlyLogin = logins.some(l => l.day <= 7);
      return s + (hasEarlyLogin ? (payByPlayer.get(p.playerId) || 0) * 0.25 : 0);
    }, 0);
    const totalPay14 = cohortPlayers.reduce((s, p) => {
      const logins = loginByPlayer.get(p.playerId) || [];
      const hasMidLogin = logins.some(l => l.day <= 14);
      return s + (hasMidLogin ? (payByPlayer.get(p.playerId) || 0) * 0.5 : 0);
    }, 0);
    const totalPay30 = cohortPlayers.reduce((s, p) => s + (payByPlayer.get(p.playerId) || 0), 0);

    const ltv = {
      day7: Math.round(totalPay7 / size * 100) / 100,
      day14: Math.round(totalPay14 / size * 100) / 100,
      day30: Math.round(totalPay30 / size * 100) / 100,
    };

    // 付费转化率
    const payers = cohortPlayers.filter(p => (payByPlayer.get(p.playerId) || 0) > 0).length;
    const payConversion = Math.round(payers / size * 10000) / 100;

    cohorts.push({ key, size, retention, ltv, payConversion });
  }

  // 排序
  cohorts.sort((a, b) => {
    const aNum = parseInt(a.key.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.key.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  });

  // 最佳队列
  const bestCohort = cohorts.reduce((best, c) =>
    c.retention.day7 > (best?.day7Retention || 0) ? { key: c.key, day7Retention: c.retention.day7 } : best,
    { key: '-', day7Retention: 0 }
  );

  const avgDay7 = cohorts.length > 0
    ? Math.round(cohorts.reduce((s, c) => s + c.retention.day7, 0) / cohorts.length * 100) / 100
    : 0;
  const avgLtv30 = cohorts.length > 0
    ? Math.round(cohorts.reduce((s, c) => s + c.ltv.day30, 0) / cohorts.length * 100) / 100
    : 0;

  return {
    cohorts,
    bestCohort,
    summary: {
      avgDay7Retention: avgDay7,
      avgLtv30: avgLtv30,
    },
  };
}

module.exports = { analyzeCohorts };
