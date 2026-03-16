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
    // 版本内容策划上下文（四大板块）
    planningContext: {
      // ========== 板块一：内容题材 ==========
      contentTheme: {
        mainTheme: '龙渊秘境',
        worldviewExpansion: '远古龙族在沉睡千年后觉醒，玩家深入龙渊遗迹探索龙族文明遗产',
        emotionalTone: '史诗冒险+神秘探索',
        seasonalTie: '春日祭联动，结合春季节日氛围',
        contentList: [
          { id: 'dungeon_dragon', name: '龙渊副本', type: 'dungeon', designGoal: '核心PVE循环内容，拉动日常活跃和长线留存', themeConnection: '龙族遗迹主殿探索' },
          { id: 'boss_hydra', name: '九头蛇BOSS', type: 'boss', designGoal: '高难度挑战内容，满足核心玩家成就需求', themeConnection: '守护龙族宝藏的远古魔兽' },
          { id: 'quest_chain_1', name: '龙裔传说主线', type: 'quest', designGoal: '叙事驱动，引导玩家了解版本世界观', themeConnection: '揭示玩家与龙族血脉的关联' },
          { id: 'event_spring', name: '春日祭活动', type: 'event', designGoal: '限时活动，拉动全层级玩家回流和首充转化', themeConnection: '龙族春日觉醒庆典' },
          { id: 'skin_dragon', name: '龙鳞套装', type: 'skin', designGoal: '外观付费内容，面向中R以上', themeConnection: '以龙鳞为材料打造的战斗套装' },
          { id: 'pet_baby_dragon', name: '小龙宠物', type: 'pet', designGoal: '收集养成内容，提升情感粘性', themeConnection: '孵化自龙蛋的幼龙伙伴' },
        ],
      },

      // ========== 板块二：道具功能和定价 ==========
      itemDesign: {
        pricingStrategy: '钻石消耗品低价高频+RMB直购高价值礼包，双通道并行',
        revenueTarget: 500000,
        items: [
          { itemId: 'item_001', name: '龙息石', type: 'consumable', function: '副本内增伤30%，单次消耗', targetTier: '全层级', pricePoint: 10, currency: 'diamond' },
          { itemId: 'item_002', name: '龙鳞碎片', type: 'material', function: '龙鳞套装升级材料', targetTier: '中R以上', pricePoint: 5, currency: 'diamond' },
          { itemId: 'item_003', name: '秘境钥匙', type: 'key', function: '解锁隐藏副本房间', targetTier: '中R以上', pricePoint: 50, currency: 'diamond' },
          { itemId: 'item_004', name: '龙魂精华', type: 'upgrade', function: '宠物进阶核心材料', targetTier: '大R以上', pricePoint: 100, currency: 'diamond' },
          { itemId: 'item_005', name: '复活卷轴', type: 'consumable', function: 'BOSS战原地复活', targetTier: '全层级', pricePoint: 20, currency: 'diamond' },
          { itemId: 'item_006', name: '龙鳞套装礼包', type: 'bundle', function: '一键获得完整龙鳞套装+专属特效', targetTier: '大R', pricePoint: 648, currency: 'rmb' },
          { itemId: 'item_007', name: '小龙宠物蛋', type: 'pet', function: '直接获得满级小龙宠物', targetTier: '中R', pricePoint: 328, currency: 'rmb' },
          { itemId: 'item_008', name: '月卡', type: 'subscription', function: '每日登录领取钻石+经验加成', targetTier: '小R', pricePoint: 30, currency: 'rmb' },
          { itemId: 'item_009', name: '战令豪华版', type: 'battlepass', function: '解锁赛季全部高级奖励', targetTier: '中R', pricePoint: 128, currency: 'rmb' },
          { itemId: 'item_010', name: '钻石礼包(小)', type: 'iap', function: '首充引流商品', targetTier: '免费→小R转化', pricePoint: 6, currency: 'rmb' },
          { itemId: 'item_011', name: '钻石礼包(中)', type: 'iap', function: '日常钻石补充', targetTier: '小R', pricePoint: 30, currency: 'rmb' },
          { itemId: 'item_012', name: '钻石礼包(大)', type: 'iap', function: '大额钻石储备', targetTier: '中R以上', pricePoint: 98, currency: 'rmb' },
        ],
      },

      // ========== 板块三：数值模型 ==========
      numericalModel: {
        targetMetrics: {
          day7Retention: 55,
          day28Retention: 35,
          payingRate: 12,
          arppu: 180,
          arpu: 22,
          avgOnlineMinutes: 35,
        },
        contentDesignIntent: {
          dungeon_dragon: { targetParticipationRate: 65, targetCompletionRate: 55, targetSatisfaction: 3.8, targetAvgTimes: 8 },
          boss_hydra: { targetParticipationRate: 45, targetCompletionRate: 35, targetSatisfaction: 3.5, targetAvgTimes: 5 },
          quest_chain_1: { targetParticipationRate: 70, targetCompletionRate: 75, targetSatisfaction: 4.0, targetAvgTimes: 2 },
          event_spring: { targetParticipationRate: 75, targetCompletionRate: 60, targetSatisfaction: 4.2, targetAvgTimes: 10 },
          skin_dragon: { targetParticipationRate: 30, targetCompletionRate: 90, targetSatisfaction: 4.0, targetAvgTimes: 1 },
          pet_baby_dragon: { targetParticipationRate: 35, targetCompletionRate: 85, targetSatisfaction: 4.3, targetAvgTimes: 1 },
        },
        difficultyDesign: {
          dungeonLayers: '5层递进难度，第1-3层面向中级玩家，第4-5层面向高级/核心',
          bossPhases: '3阶段BOSS，血量阈值触发机制变化，DPS检查+走位检查',
          expectedClearRate: '副本整体55%，BOSS整体35%',
        },
        economyBalance: {
          dailyDiamondIncome: '免费玩家80/天，月卡玩家180/天',
          keyItemSinkRate: '目标消耗率70%以上',
          inflationControl: '通过副本钥匙和升级材料控制钻石流出速度',
        },
      },

      // ========== 板块四：目标用户定位 ==========
      targetUsers: {
        primaryAudience: '中级-高级PVE玩家，偏好挑战性副本和收集养成',
        versionGoals: [
          '通过龙渊副本+九头蛇BOSS提升核心PVE活跃和留存',
          '通过龙鳞套装和小龙宠物拉动中R以上付费',
          '通过春日祭活动促进免费玩家向小R转化',
          '通过主线剧情延长玩家在线时长和内容消费深度',
        ],
        segmentStrategy: {
          '免费': '通过春日祭活动+6元首充礼包引导首次付费',
          '小R': '通过月卡+战令提升持续消费习惯',
          '中R': '通过宠物蛋+套装碎片推动单次大额消费',
          '大R/超R': '通过限量龙鳞礼包+隐藏副本钥匙满足稀缺性需求',
        },
        retentionStrategy: {
          newPlayers: '主线任务自动引导进入龙渊副本第一层，降低认知门槛',
          activeCore: '每周刷新BOSS挑战排行榜，保持竞争动力',
          churnRisk: '版本更新推送+7天回归奖励',
        },
      },

      // 上一版本遗留问题
      previousVersionIssues: [
        '上版本副本难度过高导致中低层级玩家流失',
        '上版本活动奖励不足导致参与率仅45%',
        '上版本缺少社交玩法导致在线时长偏低',
      ],
    },
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

/**
 * 生成历史版本摘要数据（v2.1~v2.4），模拟过去四个版本的核心指标
 * 用于版本间趋势对比分析
 */
function generateHistoricalVersions() {
  return [
    {
      versionId: 'v2.1',
      versionName: '风暴前夜',
      releaseDate: '2025-06-01',
      dataEndDate: '2025-08-01',
      metrics: {
        totalPlayers: 380,
        day7Retention: 42,
        day28Retention: 22,
        payingRate: 8.5,
        arppu: 120,
        arpu: 10.2,
        avgOnlineMinutes: 25,
        totalRevenue: 280000,
        contentQualityScore: 58,
        commercializationScore: 45,
        userHealthScore: 52,
        overallScore: 52,
        overallGrade: 'D',
        newContentCount: 4,
        avgSatisfaction: 3.2,
      },
    },
    {
      versionId: 'v2.2',
      versionName: '暗影崛起',
      releaseDate: '2025-08-15',
      dataEndDate: '2025-10-15',
      metrics: {
        totalPlayers: 420,
        day7Retention: 48,
        day28Retention: 26,
        payingRate: 10.2,
        arppu: 145,
        arpu: 14.8,
        avgOnlineMinutes: 28,
        totalRevenue: 380000,
        contentQualityScore: 63,
        commercializationScore: 55,
        userHealthScore: 58,
        overallScore: 59,
        overallGrade: 'D',
        newContentCount: 5,
        avgSatisfaction: 3.5,
      },
    },
    {
      versionId: 'v2.3',
      versionName: '冰霜王座',
      releaseDate: '2025-11-01',
      dataEndDate: '2025-12-31',
      metrics: {
        totalPlayers: 450,
        day7Retention: 50,
        day28Retention: 28,
        payingRate: 11.0,
        arppu: 155,
        arpu: 17.1,
        avgOnlineMinutes: 30,
        totalRevenue: 420000,
        contentQualityScore: 68,
        commercializationScore: 60,
        userHealthScore: 62,
        overallScore: 64,
        overallGrade: 'C',
        newContentCount: 5,
        avgSatisfaction: 3.6,
      },
    },
    {
      versionId: 'v2.4',
      versionName: '星海远航',
      releaseDate: '2025-12-15',
      dataEndDate: '2026-01-31',
      metrics: {
        totalPlayers: 470,
        day7Retention: 52,
        day28Retention: 30,
        payingRate: 11.5,
        arppu: 160,
        arpu: 18.4,
        avgOnlineMinutes: 32,
        totalRevenue: 450000,
        contentQualityScore: 70,
        commercializationScore: 62,
        userHealthScore: 65,
        overallScore: 66,
        overallGrade: 'C',
        newContentCount: 6,
        avgSatisfaction: 3.7,
      },
    },
  ];
}

module.exports = { generateGameData, generateHistoricalVersions };
