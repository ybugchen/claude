/**
 * 游戏版本行为数据 - 模拟某版本（v2.5 "龙渊秘境"）的玩家行为数据
 * 包含：玩家基础信息、登录行为、版本内容体验、道具购买/消耗数据
 */

function generateGameData() {
  const versionInfo = {
    versionId: 'v2.5',
    versionName: '龙渊秘境',
    releaseDate: '2026-02-01',
    dataEndDate: '2026-03-01',
    newContentList: [
      { id: 'dungeon_dragon', name: '龙渊副本', type: 'dungeon' },
      { id: 'boss_hydra', name: '九头蛇BOSS', type: 'boss' },
      { id: 'quest_chain_1', name: '龙裔传说主线', type: 'quest' },
      { id: 'event_spring', name: '春日祭活动', type: 'event' },
      { id: 'skin_dragon', name: '龙鳞套装', type: 'skin' },
      { id: 'pet_baby_dragon', name: '小龙宠物', type: 'pet' },
    ],
  };

  const playerLevels = ['新手', '初级', '中级', '高级', '核心'];
  const payTiers = ['免费', '小R', '中R', '大R', '超R'];

  // 生成500个模拟玩家数据
  const players = [];
  for (let i = 1; i <= 500; i++) {
    const payTier = weightedRandom(payTiers, [0.50, 0.25, 0.13, 0.08, 0.04]);
    const level = weightedRandom(playerLevels, [0.10, 0.20, 0.35, 0.25, 0.10]);
    const registerDaysBefore = randomInt(1, 720);

    players.push({
      playerId: `P${String(i).padStart(5, '0')}`,
      nickname: `Player_${i}`,
      level,
      payTier,
      registerDaysBefore,
      totalPayAmount: generatePayAmount(payTier),
      versionPayAmount: generateVersionPayAmount(payTier),
    });
  }

  // 生成登录行为数据（28天）
  const loginRecords = [];
  for (const player of players) {
    const activeDays = generateActiveDays(player.level, player.payTier);
    for (let day = 1; day <= 28; day++) {
      if (Math.random() < activeDays / 28) {
        const sessionCount = randomInt(1, player.level === '核心' ? 5 : 3);
        const totalOnlineMinutes = randomInt(10, player.level === '核心' ? 240 : 120);
        loginRecords.push({
          playerId: player.playerId,
          day,
          sessionCount,
          totalOnlineMinutes,
          // 加入一些脏数据用于数据清洗演示
          ...(Math.random() < 0.03 ? { totalOnlineMinutes: -1 } : {}),
          ...(Math.random() < 0.02 ? { sessionCount: 0, totalOnlineMinutes: 300 } : {}),
          ...(Math.random() < 0.01 ? { playerId: null } : {}),
        });
      }
    }
  }

  // 生成版本新内容体验数据
  const contentExperience = [];
  for (const player of players) {
    for (const content of versionInfo.newContentList) {
      const participated = didParticipate(player, content);
      if (participated) {
        const times = generateParticipationTimes(player, content);
        const completionRate = generateCompletionRate(player, content);
        const satisfaction = generateSatisfaction(completionRate, content);
        contentExperience.push({
          playerId: player.playerId,
          contentId: content.id,
          contentName: content.name,
          contentType: content.type,
          participationTimes: times,
          completionRate: Math.round(completionRate * 100) / 100,
          avgDurationMinutes: randomInt(5, content.type === 'dungeon' ? 45 : 20),
          satisfaction: Math.round(satisfaction * 10) / 10,
          firstPlayDay: randomInt(1, 14),
          lastPlayDay: randomInt(14, 28),
          // 脏数据
          ...(Math.random() < 0.02 ? { satisfaction: 11 } : {}),
          ...(Math.random() < 0.02 ? { completionRate: 1.5 } : {}),
        });
      }
    }
  }

  // 生成道具购买/消耗数据
  const items = [
    { itemId: 'item_001', name: '龙息石', type: 'consumable', price: 10, currency: 'diamond' },
    { itemId: 'item_002', name: '龙鳞碎片', type: 'material', price: 5, currency: 'diamond' },
    { itemId: 'item_003', name: '秘境钥匙', type: 'key', price: 50, currency: 'diamond' },
    { itemId: 'item_004', name: '龙魂精华', type: 'upgrade', price: 100, currency: 'diamond' },
    { itemId: 'item_005', name: '复活卷轴', type: 'consumable', price: 20, currency: 'diamond' },
    { itemId: 'item_006', name: '龙鳞套装礼包', type: 'bundle', price: 648, currency: 'rmb' },
    { itemId: 'item_007', name: '小龙宠物蛋', type: 'pet', price: 328, currency: 'rmb' },
    { itemId: 'item_008', name: '月卡', type: 'subscription', price: 30, currency: 'rmb' },
    { itemId: 'item_009', name: '战令豪华版', type: 'battlepass', price: 128, currency: 'rmb' },
    { itemId: 'item_010', name: '钻石礼包(小)', type: 'iap', price: 6, currency: 'rmb' },
    { itemId: 'item_011', name: '钻石礼包(中)', type: 'iap', price: 30, currency: 'rmb' },
    { itemId: 'item_012', name: '钻石礼包(大)', type: 'iap', price: 98, currency: 'rmb' },
  ];

  const itemTransactions = [];
  for (const player of players) {
    for (const item of items) {
      const bought = didBuyItem(player, item);
      if (bought) {
        const quantity = generatePurchaseQuantity(player, item);
        const consumed = Math.min(quantity, Math.floor(quantity * (0.3 + Math.random() * 0.7)));
        itemTransactions.push({
          playerId: player.playerId,
          itemId: item.itemId,
          itemName: item.name,
          itemType: item.type,
          currency: item.currency,
          unitPrice: item.price,
          quantity,
          consumed,
          totalSpent: item.price * quantity,
          purchaseDay: randomInt(1, 28),
          // 脏数据
          ...(Math.random() < 0.02 ? { quantity: -5 } : {}),
          ...(Math.random() < 0.01 ? { totalSpent: null } : {}),
        });
      }
    }
  }

  return {
    versionInfo,
    players,
    loginRecords,
    contentExperience,
    itemTransactions,
    items,
  };
}

// ---- Helper functions ----
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items, weights) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return items[i];
  }
  return items[items.length - 1];
}

function generatePayAmount(payTier) {
  const ranges = { '免费': [0, 0], '小R': [1, 500], '中R': [501, 5000], '大R': [5001, 50000], '超R': [50001, 500000] };
  const [min, max] = ranges[payTier];
  return randomInt(min, max);
}

function generateVersionPayAmount(payTier) {
  const ranges = { '免费': [0, 0], '小R': [0, 100], '中R': [50, 800], '大R': [200, 5000], '超R': [1000, 50000] };
  const [min, max] = ranges[payTier];
  return randomInt(min, max);
}

function generateActiveDays(level, payTier) {
  const baseDays = { '新手': 5, '初级': 10, '中级': 16, '高级': 22, '核心': 26 };
  const payBonus = { '免费': 0, '小R': 1, '中R': 2, '大R': 3, '超R': 4 };
  return Math.min(28, baseDays[level] + payBonus[payTier] + randomInt(-3, 3));
}

function didParticipate(player, content) {
  const baseRate = { '新手': 0.3, '初级': 0.5, '中级': 0.7, '高级': 0.85, '核心': 0.95 };
  const typeBonus = { dungeon: 0, boss: -0.05, quest: 0.1, event: 0.15, skin: -0.1, pet: -0.1 };
  return Math.random() < (baseRate[player.level] + (typeBonus[content.type] || 0));
}

function generateParticipationTimes(player, content) {
  const base = { dungeon: 8, boss: 5, quest: 3, event: 10, skin: 1, pet: 1 };
  const levelMult = { '新手': 0.5, '初级': 0.8, '中级': 1, '高级': 1.3, '核心': 1.8 };
  return Math.max(1, Math.round((base[content.type] || 3) * levelMult[player.level] * (0.5 + Math.random())));
}

function generateCompletionRate(player, content) {
  const base = { dungeon: 0.6, boss: 0.4, quest: 0.8, event: 0.7, skin: 1.0, pet: 1.0 };
  const levelBonus = { '新手': -0.2, '初级': -0.1, '中级': 0, '高级': 0.1, '核心': 0.2 };
  return Math.min(1, Math.max(0, (base[content.type] || 0.5) + levelBonus[player.level] + (Math.random() * 0.3 - 0.15)));
}

function generateSatisfaction(completionRate, content) {
  const base = completionRate * 3 + Math.random() * 2;
  const typeBonus = { dungeon: 0.5, boss: 0.3, quest: 0.2, event: 0.8, skin: 0.6, pet: 0.7 };
  return Math.min(5, Math.max(1, base + (typeBonus[content.type] || 0)));
}

function didBuyItem(player, item) {
  if (item.currency === 'rmb' && player.payTier === '免费') return false;
  const rates = {
    '免费': 0.3, '小R': 0.5, '中R': 0.6, '大R': 0.75, '超R': 0.9,
  };
  const typeRate = {
    consumable: 0.6, material: 0.5, key: 0.4, upgrade: 0.3,
    bundle: 0.2, pet: 0.25, subscription: 0.35, battlepass: 0.3, iap: 0.4,
  };
  return Math.random() < (rates[player.payTier] * (typeRate[item.type] || 0.3));
}

function generatePurchaseQuantity(player, item) {
  if (['bundle', 'pet', 'subscription', 'battlepass'].includes(item.type)) return 1;
  const levelMult = { '新手': 1, '初级': 2, '中级': 3, '高级': 5, '核心': 8 };
  return randomInt(1, levelMult[player.level] || 3);
}

module.exports = { generateGameData };
