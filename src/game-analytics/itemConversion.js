/**
 * 道具转化分析模块
 * 分析道具购买率、消耗率、收入贡献、付费转化漏斗
 *
 * 性能优化：
 * - 预建 transactions 按 itemId/itemType 的 Map 索引，避免多函数重复 filter
 * - 预建 items 的 itemId → currency 的 Map，替代 rmbItems.some() 线性查找
 * - 预建 players 按 payTier 分组、playerId → player 的 Map
 */

function analyzeItemConversion(cleanedData) {
  const { itemTransactions, players, items } = cleanedData;

  // 预建索引
  const txByItem = groupBy(itemTransactions, 'itemId');
  const txByType = groupBy(itemTransactions, 'itemType');
  const itemCurrencyMap = new Map();
  for (const item of items) {
    itemCurrencyMap.set(item.itemId, item.currency);
  }
  const playersByTier = groupBy(players, 'payTier');
  const playerIdSet = new Set(players.map(p => p.playerId));

  // 1. 道具销售总览
  const itemSalesOverview = analyzeItemSales(txByItem, players, items);

  // 2. 收入结构分析
  const revenueStructure = analyzeRevenueStructure(itemTransactions, txByType, itemCurrencyMap);

  // 3. 付费转化漏斗
  const paymentFunnel = analyzePaymentFunnel(itemTransactions, players);

  // 4. 道具消耗率分析
  const consumptionAnalysis = analyzeConsumption(txByType);

  // 5. 付费层级道具偏好
  const tierPreferences = analyzeTierPreferences(itemTransactions, playersByTier);

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

function analyzeItemSales(txByItem, players, items) {
  const salesMap = {};
  const totalPlayers = players.length;

  for (const item of items) {
    const itemTx = txByItem.get(item.itemId) || [];
    const buyers = new Set();
    let totalQuantity = 0, totalRevenue = 0;
    for (const t of itemTx) {
      buyers.add(t.playerId);
      totalQuantity += t.quantity;
      totalRevenue += t.totalSpent;
    }

    const buyerCount = buyers.size;
    salesMap[item.itemId] = {
      name: item.name,
      type: item.type,
      currency: item.currency,
      unitPrice: item.price,
      buyerCount,
      purchaseRate: Math.round((buyerCount / totalPlayers) * 10000) / 100,
      totalQuantity,
      totalRevenue,
      avgQuantityPerBuyer: buyerCount > 0 ? Math.round((totalQuantity / buyerCount) * 100) / 100 : 0,
      avgRevenuePerBuyer: buyerCount > 0 ? Math.round(totalRevenue / buyerCount) : 0,
    };
  }

  return salesMap;
}

function analyzeRevenueStructure(transactions, txByType, itemCurrencyMap) {
  // 一次遍历按货币类型分收入
  let rmbRevenue = 0, diamondRevenue = 0;
  for (const t of transactions) {
    const currency = itemCurrencyMap.get(t.itemId);
    if (currency === 'rmb') rmbRevenue += t.totalSpent;
    else if (currency === 'diamond') diamondRevenue += t.totalSpent;
  }

  // 按道具类型分 — 使用预建索引
  const typeRevenue = {};
  for (const [type, typeTx] of txByType) {
    let totalRev = 0;
    const buyerSet = new Set();
    for (const t of typeTx) {
      totalRev += t.totalSpent;
      buyerSet.add(t.playerId);
    }
    typeRevenue[type] = {
      totalRevenue: totalRev,
      transactionCount: typeTx.length,
      uniqueBuyers: buyerSet.size,
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

  // 一次遍历聚合所有漏斗指标
  const allBuyers = new Set();
  const diamondBuyers = new Set();
  const rmbBuyers = new Set();
  const buyerCounts = {};
  const highValueBuyers = new Set();

  for (const t of transactions) {
    allBuyers.add(t.playerId);
    buyerCounts[t.playerId] = (buyerCounts[t.playerId] || 0) + 1;
    if (t.currency === 'diamond') diamondBuyers.add(t.playerId);
    if (t.currency === 'rmb') {
      rmbBuyers.add(t.playerId);
      if (t.totalSpent >= 100) highValueBuyers.add(t.playerId);
    }
  }

  const repeatBuyers = Object.values(buyerCounts).filter(c => c >= 3).length;

  return {
    totalPlayers,
    anyPurchase: { count: allBuyers.size, rate: pct(allBuyers.size, totalPlayers) },
    diamondPurchase: { count: diamondBuyers.size, rate: pct(diamondBuyers.size, totalPlayers) },
    rmbPurchase: { count: rmbBuyers.size, rate: pct(rmbBuyers.size, totalPlayers) },
    repeatPurchase: { count: repeatBuyers, rate: pct(repeatBuyers, totalPlayers) },
    highValuePurchase: { count: highValueBuyers.size, rate: pct(highValueBuyers.size, totalPlayers) },
  };
}

function analyzeConsumption(txByType) {
  const itemConsumption = {};

  for (const [type, typeTx] of txByType) {
    let totalBought = 0, totalConsumed = 0;
    for (const t of typeTx) {
      totalBought += t.quantity;
      totalConsumed += t.consumed;
    }

    itemConsumption[type] = {
      totalBought,
      totalConsumed,
      consumptionRate: totalBought > 0 ? Math.round((totalConsumed / totalBought) * 10000) / 100 : 0,
      surplus: totalBought - totalConsumed,
    };
  }

  return itemConsumption;
}

function analyzeTierPreferences(transactions, playersByTier) {
  const tiers = ['免费', '小R', '中R', '大R', '超R'];

  // 预建 playerId → payTier 的 Map
  const playerTierMap = new Map();
  for (const tier of tiers) {
    const tierPlayers = playersByTier.get(tier) || [];
    for (const p of tierPlayers) {
      playerTierMap.set(p.playerId, tier);
    }
  }

  // 一次遍历 transactions 按 tier 聚合
  const tierData = {};
  for (const tier of tiers) {
    tierData[tier] = { totalSpending: 0, transactionCount: 0, typeSpending: {} };
  }

  for (const t of transactions) {
    const tier = playerTierMap.get(t.playerId);
    if (!tier) continue;
    const data = tierData[tier];
    data.totalSpending += t.totalSpent;
    data.transactionCount++;
    data.typeSpending[t.itemType] = (data.typeSpending[t.itemType] || 0) + t.totalSpent;
  }

  const preferences = {};
  for (const tier of tiers) {
    const data = tierData[tier];
    const sorted = Object.entries(data.typeSpending).sort((a, b) => b[1] - a[1]);
    preferences[tier] = {
      totalSpending: data.totalSpending,
      transactionCount: data.transactionCount,
      topItemTypes: sorted.slice(0, 5).map(([type, amount]) => ({ type, amount })),
    };
  }

  return preferences;
}

function computeCommercialMetrics(transactions, players, items) {
  let totalVersionRevenue = 0, payingCount = 0, payingRevenue = 0;
  for (const p of players) {
    totalVersionRevenue += p.versionPayAmount;
    if (p.versionPayAmount > 0) {
      payingCount++;
      payingRevenue += p.versionPayAmount;
    }
  }

  // 一次遍历 transactions 聚合 RMB 和 top-selling
  const rmbSpenders = new Set();
  let rmbTotal = 0;
  const revenueByName = {};
  for (const t of transactions) {
    if (t.currency === 'rmb') {
      rmbSpenders.add(t.playerId);
      rmbTotal += t.totalSpent;
    }
    revenueByName[t.itemName] = (revenueByName[t.itemName] || 0) + t.totalSpent;
  }

  return {
    payingRate: pct(payingCount, players.length),
    arppu: payingCount > 0 ? Math.round(payingRevenue / payingCount) : 0,
    arpu: Math.round(totalVersionRevenue / players.length),
    totalVersionRevenue,
    rmbSpenderCount: rmbSpenders.size,
    avgRmbPerSpender: rmbSpenders.size > 0 ? Math.round(rmbTotal / rmbSpenders.size) : 0,
    topSellingItems: Object.entries(revenueByName)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue })),
  };
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 10000) / 100 : 0;
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

module.exports = { analyzeItemConversion };
