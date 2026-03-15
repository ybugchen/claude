/**
 * 数据清洗模块
 * 处理缺失值、异常值、重复数据、数据类型校验
 */

function cleanGameData(rawData) {
  const report = {
    original: {},
    cleaned: {},
    removedRecords: {},
    fixedRecords: {},
    issues: [],
  };

  // 1. 清洗玩家数据
  const { players, cleanLog: playerLog } = cleanPlayers(rawData.players);
  report.original.players = rawData.players.length;
  report.cleaned.players = players.length;
  report.removedRecords.players = rawData.players.length - players.length;
  report.issues.push(...playerLog);

  // 2. 清洗登录记录
  const { records: loginRecords, cleanLog: loginLog } = cleanLoginRecords(rawData.loginRecords);
  report.original.loginRecords = rawData.loginRecords.length;
  report.cleaned.loginRecords = loginRecords.length;
  report.removedRecords.loginRecords = rawData.loginRecords.length - loginRecords.length;
  report.fixedRecords.loginRecords = loginLog.filter(l => l.type === 'fixed').length;
  report.issues.push(...loginLog);

  // 3. 清洗内容体验数据
  const { records: contentRecords, cleanLog: contentLog } = cleanContentExperience(rawData.contentExperience);
  report.original.contentExperience = rawData.contentExperience.length;
  report.cleaned.contentExperience = contentRecords.length;
  report.removedRecords.contentExperience = rawData.contentExperience.length - contentRecords.length;
  report.fixedRecords.contentExperience = contentLog.filter(l => l.type === 'fixed').length;
  report.issues.push(...contentLog);

  // 4. 清洗道具交易数据
  const { records: itemRecords, cleanLog: itemLog } = cleanItemTransactions(rawData.itemTransactions);
  report.original.itemTransactions = rawData.itemTransactions.length;
  report.cleaned.itemTransactions = itemRecords.length;
  report.removedRecords.itemTransactions = rawData.itemTransactions.length - itemRecords.length;
  report.fixedRecords.itemTransactions = itemLog.filter(l => l.type === 'fixed').length;
  report.issues.push(...itemLog);

  return {
    cleanedData: {
      versionInfo: rawData.versionInfo,
      players,
      loginRecords,
      contentExperience: contentRecords,
      itemTransactions: itemRecords,
      items: rawData.items,
    },
    cleanReport: report,
  };
}

function cleanPlayers(players) {
  const cleanLog = [];
  const cleaned = players.filter(p => {
    if (!p.playerId) {
      cleanLog.push({ type: 'removed', field: 'players', reason: '缺少playerId' });
      return false;
    }
    if (p.totalPayAmount < 0) {
      cleanLog.push({ type: 'removed', field: 'players', reason: `异常付费金额: ${p.totalPayAmount}` });
      return false;
    }
    return true;
  });
  return { players: cleaned, cleanLog };
}

function cleanLoginRecords(records) {
  const cleanLog = [];
  const cleaned = [];

  for (const r of records) {
    // 移除缺少playerId的记录
    if (!r.playerId) {
      cleanLog.push({ type: 'removed', field: 'loginRecords', reason: '缺少playerId' });
      continue;
    }
    // 修复负数在线时长
    if (r.totalOnlineMinutes < 0) {
      cleanLog.push({ type: 'fixed', field: 'loginRecords', reason: `负数在线时长修正: ${r.totalOnlineMinutes} -> 0` });
      r.totalOnlineMinutes = 0;
    }
    // 修复异常在线时长（超过24小时）
    if (r.totalOnlineMinutes > 1440) {
      cleanLog.push({ type: 'fixed', field: 'loginRecords', reason: `异常在线时长截断: ${r.totalOnlineMinutes} -> 1440` });
      r.totalOnlineMinutes = 1440;
    }
    // 修复sessionCount为0但有在线时长
    if (r.sessionCount === 0 && r.totalOnlineMinutes > 0) {
      cleanLog.push({ type: 'fixed', field: 'loginRecords', reason: `sessionCount修正: 0 -> 1` });
      r.sessionCount = 1;
    }
    cleaned.push(r);
  }

  return { records: cleaned, cleanLog };
}

function cleanContentExperience(records) {
  const cleanLog = [];
  const cleaned = [];

  for (const r of records) {
    if (!r.playerId || !r.contentId) {
      cleanLog.push({ type: 'removed', field: 'contentExperience', reason: '缺少关键字段' });
      continue;
    }
    // 修复满意度越界
    if (r.satisfaction > 5 || r.satisfaction < 1) {
      cleanLog.push({ type: 'fixed', field: 'contentExperience', reason: `满意度越界修正: ${r.satisfaction} -> clamp(1,5)` });
      r.satisfaction = Math.max(1, Math.min(5, r.satisfaction));
    }
    // 修复完成率越界
    if (r.completionRate > 1) {
      cleanLog.push({ type: 'fixed', field: 'contentExperience', reason: `完成率越界修正: ${r.completionRate} -> 1` });
      r.completionRate = 1;
    }
    if (r.completionRate < 0) {
      cleanLog.push({ type: 'fixed', field: 'contentExperience', reason: `完成率越界修正: ${r.completionRate} -> 0` });
      r.completionRate = 0;
    }
    cleaned.push(r);
  }

  return { records: cleaned, cleanLog };
}

function cleanItemTransactions(records) {
  const cleanLog = [];
  const cleaned = [];

  for (const r of records) {
    if (!r.playerId || !r.itemId) {
      cleanLog.push({ type: 'removed', field: 'itemTransactions', reason: '缺少关键字段' });
      continue;
    }
    // 移除负数购买量
    if (r.quantity < 0) {
      cleanLog.push({ type: 'removed', field: 'itemTransactions', reason: `负数购买量: ${r.quantity}` });
      continue;
    }
    // 修复空总花费
    if (r.totalSpent === null || r.totalSpent === undefined) {
      r.totalSpent = r.unitPrice * r.quantity;
      cleanLog.push({ type: 'fixed', field: 'itemTransactions', reason: `重新计算totalSpent: ${r.totalSpent}` });
    }
    cleaned.push(r);
  }

  return { records: cleaned, cleanLog };
}

module.exports = { cleanGameData };
