/**
 * 异常检测模块
 * 自动监测核心指标的异常波动，发现数据异常和可疑行为
 */

function detectAnomalies(cleanedData, segmentation, itemConversion) {
  const { players, loginRecords, itemTransactions } = cleanedData;
  const anomalies = [];
  const playerAnomalies = [];

  // 构建玩家行为数据
  const loginByPlayer = new Map();
  for (const rec of loginRecords) {
    if (!loginByPlayer.has(rec.playerId)) loginByPlayer.set(rec.playerId, []);
    loginByPlayer.get(rec.playerId).push(rec);
  }

  const payByPlayer = new Map();
  for (const tx of itemTransactions) {
    if (tx.currency === 'rmb') {
      payByPlayer.set(tx.playerId, (payByPlayer.get(tx.playerId) || 0) + tx.totalSpent);
    }
  }

  // 1. 指标级异常检测
  // 日均在线时长异常
  const onlineTimes = [];
  for (const [, logins] of loginByPlayer) {
    const avg = logins.reduce((s, l) => s + l.totalOnlineMinutes, 0) / logins.length;
    onlineTimes.push(avg);
  }
  const onlineMean = mean(onlineTimes);
  const onlineStd = stdDev(onlineTimes);

  if (onlineStd > 0) {
    // 检查是否有极端日均在线时长
    const extremeHigh = onlineTimes.filter(t => t > onlineMean + 3 * onlineStd).length;
    if (extremeHigh > 0) {
      anomalies.push({
        category: '在线时长',
        severity: extremeHigh > 5 ? 'critical' : 'warning',
        description: `${extremeHigh}名玩家日均在线时长超出正常范围3个标准差`,
        currentValue: extremeHigh,
        expectedRange: [0, 2],
        deviation: Math.round(extremeHigh / Math.max(1, 2) * 10) / 10,
        possibleCause: '可能存在挂机脚本或数据上报异常',
      });
    }
  }

  // 2. 收入异常检测
  const dailyRevenue = {};
  for (const tx of itemTransactions) {
    if (tx.currency === 'rmb') {
      dailyRevenue[tx.purchaseDay] = (dailyRevenue[tx.purchaseDay] || 0) + tx.totalSpent;
    }
  }
  const revenueValues = Object.values(dailyRevenue);
  if (revenueValues.length > 3) {
    const revMean = mean(revenueValues);
    const revStd = stdDev(revenueValues);
    for (const [day, rev] of Object.entries(dailyRevenue)) {
      const deviation = revStd > 0 ? (rev - revMean) / revStd : 0;
      if (Math.abs(deviation) > 2.5) {
        anomalies.push({
          category: '日收入',
          severity: Math.abs(deviation) > 3.5 ? 'critical' : 'warning',
          description: `第${day}天收入${rev > revMean ? '异常偏高' : '异常偏低'} (${Math.round(rev)}元)`,
          currentValue: Math.round(rev),
          expectedRange: [Math.round(revMean - 2 * revStd), Math.round(revMean + 2 * revStd)],
          deviation: Math.round(deviation * 10) / 10,
          possibleCause: rev > revMean ? '可能有大额充值或活动叠加' : '可能服务器故障或活动间歇期',
        });
      }
    }
  }

  // 3. 付费行为异常检测
  const payAmounts = Array.from(payByPlayer.values());
  if (payAmounts.length > 5) {
    const payMean = mean(payAmounts);
    const payStd = stdDev(payAmounts);
    for (const [playerId, amount] of payByPlayer) {
      const deviation = payStd > 0 ? (amount - payMean) / payStd : 0;
      if (deviation > 3) {
        playerAnomalies.push({
          playerId,
          type: '异常高消费',
          value: `${amount}元`,
          deviation: Math.round(deviation * 10) / 10,
          severity: deviation > 5 ? 'critical' : 'warning',
        });
      }
    }
  }

  // 4. 登录行为异常
  for (const [playerId, logins] of loginByPlayer) {
    const totalMinutes = logins.reduce((s, l) => s + l.totalOnlineMinutes, 0);
    const avgMinutes = totalMinutes / logins.length;
    if (avgMinutes > 200 && logins.length > 20) {
      playerAnomalies.push({
        playerId,
        type: '疑似挂机',
        value: `日均${Math.round(avgMinutes)}分钟，${logins.length}天活跃`,
        deviation: Math.round(avgMinutes / 60 * 10) / 10,
        severity: avgMinutes > 300 ? 'critical' : 'warning',
      });
    }
  }

  // 5. 数据完整性检查
  const missingPayTier = players.filter(p => !p.payTier).length;
  if (missingPayTier > 0) {
    anomalies.push({
      category: '数据完整性',
      severity: missingPayTier > players.length * 0.05 ? 'critical' : 'info',
      description: `${missingPayTier}名玩家缺失付费层级信息`,
      currentValue: missingPayTier,
      expectedRange: [0, Math.round(players.length * 0.01)],
      deviation: Math.round(missingPayTier / Math.max(1, players.length * 0.01) * 10) / 10,
      possibleCause: '数据同步延迟或注册信息不完整',
    });
  }

  // 6. 留存异常检测
  if (segmentation && segmentation.summary) {
    const d7 = segmentation.summary.day7Retention;
    if (d7 < 30) {
      anomalies.push({
        category: '留存率',
        severity: d7 < 20 ? 'critical' : 'warning',
        description: `7日留存率${d7}%低于行业基准`,
        currentValue: d7,
        expectedRange: [35, 60],
        deviation: Math.round((35 - d7) / 10 * 10) / 10,
        possibleCause: '新手引导体验差或版本内容吸引力不足',
      });
    }
  }

  // 排序异常
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  playerAnomalies.sort((a, b) => b.deviation - a.deviation);

  // 类型分布
  const typeDistribution = {};
  for (const a of anomalies) {
    typeDistribution[a.category] = (typeDistribution[a.category] || 0) + 1;
  }

  return {
    summary: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      warning: anomalies.filter(a => a.severity === 'warning').length,
      info: anomalies.filter(a => a.severity === 'info').length,
    },
    anomalies,
    playerAnomalies,
    typeDistribution,
  };
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr) {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length);
}

module.exports = { detectAnomalies };
