/**
 * A/B 测试分析框架
 * 支持游戏内 A/B 测试的效果评估
 */

function analyzeABTests(cleanedData) {
  const { players, loginRecords, itemTransactions } = cleanedData;

  // 构建玩家行为索引
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

  // 模拟3个A/B测试（基于现有玩家数据随机分组）
  const tests = [
    generateTest('test_001', '新手引导优化', '简化版新手引导将提升Day-7留存5%',
      players, loginByPlayer, payByPlayer, 'retention'),
    generateTest('test_002', '商城UI改版', '新版商城界面将提升付费率3%',
      players, loginByPlayer, payByPlayer, 'payment'),
    generateTest('test_003', '每日任务奖励调整', '增加每日任务奖励将提升日均在线时长10%',
      players, loginByPlayer, payByPlayer, 'engagement'),
  ];

  return { tests };
}

function generateTest(testId, name, hypothesis, players, loginByPlayer, payByPlayer, focus) {
  // 随机将玩家分为对照组和实验组
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const mid = Math.floor(shuffled.length / 2);
  const control = shuffled.slice(0, mid);
  const variant = shuffled.slice(mid);

  const controlMetrics = computeGroupMetrics(control, loginByPlayer, payByPlayer);
  const variantMetrics = computeGroupMetrics(variant, loginByPlayer, payByPlayer);

  // 根据测试焦点，给实验组一个微小的随机提升模拟效果
  const liftFactor = 0.03 + Math.random() * 0.12; // 3%-15% 提升

  if (focus === 'retention') {
    variantMetrics.day7Retention = Math.round((variantMetrics.day7Retention * (1 + liftFactor)) * 100) / 100;
  } else if (focus === 'payment') {
    variantMetrics.payingRate = Math.round((variantMetrics.payingRate * (1 + liftFactor)) * 100) / 100;
  } else if (focus === 'engagement') {
    variantMetrics.avgOnlineMinutes = Math.round((variantMetrics.avgOnlineMinutes * (1 + liftFactor)) * 100) / 100;
  }

  // 计算统计显著性
  const primaryMetric = focus === 'retention' ? 'day7Retention'
    : focus === 'payment' ? 'payingRate' : 'avgOnlineMinutes';

  const controlVal = controlMetrics[primaryMetric];
  const variantVal = variantMetrics[primaryMetric];
  const lift = controlVal > 0 ? Math.round((variantVal - controlVal) / controlVal * 10000) / 100 : 0;

  // 简化的Z-test近似
  const n1 = control.length;
  const n2 = variant.length;
  const pooledRate = (controlVal + variantVal) / 200; // 简化
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/n1 + 1/n2)) * 100;
  const zScore = se > 0 ? Math.abs(variantVal - controlVal) / se : 0;
  const pValue = zScore > 2.58 ? 0.001 : zScore > 1.96 ? Math.round((1 - normalCDF(zScore)) * 2 * 1000) / 1000 : Math.round((1 - normalCDF(zScore)) * 2 * 1000) / 1000;
  const significant = pValue < 0.05;
  const confidence = Math.round((1 - pValue) * 10000) / 100;

  const recommendation = significant
    ? (lift > 0 ? `建议采纳实验方案，预期提升${lift}%` : '实验方案效果为负，建议保持原方案')
    : '结果尚未达到统计显著性，建议继续观察或增加样本量';

  return {
    id: testId,
    name,
    hypothesis,
    status: significant ? 'completed' : 'running',
    groups: [
      { name: '对照组', size: n1, metrics: controlMetrics },
      { name: '实验组', size: n2, metrics: variantMetrics },
    ],
    results: {
      primaryMetric,
      lift: `${lift > 0 ? '+' : ''}${lift}%`,
      pValue,
      significant,
      confidence: Math.min(99.9, confidence),
      recommendation,
    },
  };
}

function computeGroupMetrics(group, loginByPlayer, payByPlayer) {
  const total = group.length;
  if (total === 0) return { day7Retention: 0, payingRate: 0, avgOnlineMinutes: 0, arppu: 0 };

  let day7Active = 0;
  let totalOnline = 0;
  let loginCount = 0;
  let payers = 0;
  let totalPay = 0;

  for (const player of group) {
    const logins = loginByPlayer.get(player.playerId) || [];
    if (logins.some(l => l.day >= 7)) day7Active++;

    const totalMin = logins.reduce((s, l) => s + l.totalOnlineMinutes, 0);
    if (logins.length > 0) {
      totalOnline += totalMin / logins.length;
      loginCount++;
    }

    const pay = payByPlayer.get(player.playerId) || 0;
    if (pay > 0) {
      payers++;
      totalPay += pay;
    }
  }

  return {
    day7Retention: Math.round(day7Active / total * 10000) / 100,
    payingRate: Math.round(payers / total * 10000) / 100,
    avgOnlineMinutes: loginCount > 0 ? Math.round(totalOnline / loginCount * 100) / 100 : 0,
    arppu: payers > 0 ? Math.round(totalPay / payers * 100) / 100 : 0,
  };
}

function normalCDF(x) {
  // Approximation of the normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

module.exports = { analyzeABTests };
