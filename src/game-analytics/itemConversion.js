/**
 * 道具转化分析模块
 * 分析道具购买率、消耗率、收入贡献、付费转化漏斗
 */

function analyzeItemConversion(cleanedData) {
  const { itemTransactions, players, items } = cleanedData;

  // 1. 道具销售总览
  const itemSalesOverview = analyzeItemSales(itemTransactions, players, items);

  // 2. 收入结构分析
  const revenueStructure = analyzeRevenueStructure(itemTransactions, items);

  // 3. 付费转化漏斗
  const paymentFunnel = analyzePaymentFunnel(itemTransactions, players);

  // 4. 道具消耗率分析
  const consumptionAnalysis = analyzeConsumption(itemTransactions);

  // 5. 付费层级道具偏好
  const tierPreferences = analyzeTierPreferences(itemTransactions, players);

  // 6. 关键商业指标
  const commercialMetrics = computeCommercialMetrics(itemTransactions, players, items);

  return {
    itemSalesOverview,
    revenueStructure,
    paymentFunnel,
    consumptionAnalysis,
    tierPreferences,
    commercialMetrics,
  };
}

function analyzeItemSales(transactions, players, items) {
  const salesMap = {};

  for (const item of items) {
    const itemTx = transactions.filter(t => t.itemId === item.itemId);
    const buyers = new Set(itemTx.map(t => t.playerId));
    const totalQuantity = itemTx.reduce((s, t) => s + t.quantity, 0);
    const totalRevenue = itemTx.reduce((s, t) => s + t.totalSpent, 0);

    salesMap[item.itemId] = {
      name: item.name,
      type: item.type,
      currency: item.currency,
      unitPrice: item.price,
      buyerCount: buyers.size,
      purchaseRate: Math.round((buyers.size / players.length) * 10000) / 100,
      totalQuantity,
      totalRevenue,
      avgQuantityPerBuyer: buyers.size > 0 ? Math.round((totalQuantity / buyers.size) * 100) / 100 : 0,
      avgRevenuePerBuyer: buyers.size > 0 ? Math.round(totalRevenue / buyers.size) : 0,
    };
  }

  return salesMap;
}

function analyzeRevenueStructure(transactions, items) {
  // 按货币类型分
  const rmbItems = items.filter(i => i.currency === 'rmb');
  const diamondItems = items.filter(i => i.currency === 'diamond');

  const rmbRevenue = transactions
    .filter(t => rmbItems.some(i => i.itemId === t.itemId))
    .reduce((s, t) => s + t.totalSpent, 0);

  const diamondRevenue = transactions
    .filter(t => diamondItems.some(i => i.itemId === t.itemId))
    .reduce((s, t) => s + t.totalSpent, 0);

  // 按道具类型分
  const typeRevenue = {};
  const types = [...new Set(transactions.map(t => t.itemType))];
  for (const type of types) {
    const typeTx = transactions.filter(t => t.itemType === type);
    typeRevenue[type] = {
      totalRevenue: typeTx.reduce((s, t) => s + t.totalSpent, 0),
      transactionCount: typeTx.length,
      uniqueBuyers: new Set(typeTx.map(t => t.playerId)).size,
    };
  }

  const totalRevenue = rmbRevenue + diamondRevenue;
  return {
    totalRevenue,
    rmbRevenue,
    rmbPercentage: totalRevenue > 0 ? Math.round((rmbRevenue / totalRevenue) * 10000) / 100 : 0,
    diamondRevenue,
    diamondPercentage: totalRevenue > 0 ? Math.round((diamondRevenue / totalRevenue) * 10000) / 100 : 0,
    byType: typeRevenue,
  };
}

function analyzePaymentFunnel(transactions, players) {
  const totalPlayers = players.length;
  const allBuyers = new Set(transactions.map(t => t.playerId));

  // 钻石购买者
  const diamondBuyers = new Set(transactions.filter(t => t.currency === 'diamond').map(t => t.playerId));
  // RMB购买者
  const rmbBuyers = new Set(transactions.filter(t => t.currency === 'rmb').map(t => t.playerId));
  // 多次购买者
  const buyerCounts = {};
  for (const t of transactions) {
    buyerCounts[t.playerId] = (buyerCounts[t.playerId] || 0) + 1;
  }
  const repeatBuyers = Object.entries(buyerCounts).filter(([, c]) => c >= 3).length;
  // 高价值购买（单笔>=100RMB）
  const highValueBuyers = new Set(
    transactions.filter(t => t.currency === 'rmb' && t.totalSpent >= 100).map(t => t.playerId)
  ).size;

  return {
    totalPlayers,
    anyPurchase: { count: allBuyers.size, rate: pct(allBuyers.size, totalPlayers) },
    diamondPurchase: { count: diamondBuyers.size, rate: pct(diamondBuyers.size, totalPlayers) },
    rmbPurchase: { count: rmbBuyers.size, rate: pct(rmbBuyers.size, totalPlayers) },
    repeatPurchase: { count: repeatBuyers, rate: pct(repeatBuyers, totalPlayers) },
    highValuePurchase: { count: highValueBuyers, rate: pct(highValueBuyers, totalPlayers) },
  };
}

function analyzeConsumption(transactions) {
  const itemConsumption = {};
  const types = [...new Set(transactions.map(t => t.itemType))];

  for (const type of types) {
    const typeTx = transactions.filter(t => t.itemType === type);
    const totalBought = typeTx.reduce((s, t) => s + t.quantity, 0);
    const totalConsumed = typeTx.reduce((s, t) => s + t.consumed, 0);

    itemConsumption[type] = {
      totalBought,
      totalConsumed,
      consumptionRate: totalBought > 0 ? Math.round((totalConsumed / totalBought) * 10000) / 100 : 0,
      surplus: totalBought - totalConsumed,
    };
  }

  return itemConsumption;
}

function analyzeTierPreferences(transactions, players) {
  const tiers = ['免费', '小R', '中R', '大R', '超R'];
  const preferences = {};

  for (const tier of tiers) {
    const tierPlayerIds = new Set(players.filter(p => p.payTier === tier).map(p => p.playerId));
    const tierTx = transactions.filter(t => tierPlayerIds.has(t.playerId));

    const typeSpending = {};
    for (const t of tierTx) {
      if (!typeSpending[t.itemType]) typeSpending[t.itemType] = 0;
      typeSpending[t.itemType] += t.totalSpent;
    }

    // Sort by spending desc
    const sorted = Object.entries(typeSpending).sort((a, b) => b[1] - a[1]);

    preferences[tier] = {
      totalSpending: tierTx.reduce((s, t) => s + t.totalSpent, 0),
      transactionCount: tierTx.length,
      topItemTypes: sorted.slice(0, 5).map(([type, amount]) => ({ type, amount })),
    };
  }

  return preferences;
}

function computeCommercialMetrics(transactions, players, items) {
  const payingPlayers = players.filter(p => p.versionPayAmount > 0);
  const totalVersionRevenue = players.reduce((s, p) => s + p.versionPayAmount, 0);
  const rmbTx = transactions.filter(t => t.currency === 'rmb');
  const rmbSpenders = new Set(rmbTx.map(t => t.playerId));

  return {
    payingRate: pct(payingPlayers.length, players.length),
    arppu: payingPlayers.length > 0 ? Math.round(totalVersionRevenue / payingPlayers.length) : 0,
    arpu: Math.round(totalVersionRevenue / players.length),
    totalVersionRevenue,
    rmbSpenderCount: rmbSpenders.size,
    avgRmbPerSpender: rmbSpenders.size > 0
      ? Math.round(rmbTx.reduce((s, t) => s + t.totalSpent, 0) / rmbSpenders.size)
      : 0,
    topSellingItems: Object.entries(
      transactions.reduce((acc, t) => {
        acc[t.itemName] = (acc[t.itemName] || 0) + t.totalSpent;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue })),
  };
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
}

module.exports = { analyzeItemConversion };
