/**
 * CSV 流式加载模块
 * 使用 Node.js readline + createReadStream 逐行解析 CSV，内存占用恒定
 *
 * 设计要点：
 * 1. 流式解析：不将整个文件加载到内存，逐行处理
 * 2. 边解析边清洗：解析时同步执行数据清洗规则，单次遍历完成两步工作
 * 3. 输出与 generateGameData() 完全兼容，下游分析模块无需修改
 *
 * CSV 文件格式约定（首行为表头）：
 * - players.csv: playerId,nickname,level,payTier,registerDaysBefore,totalPayAmount,versionPayAmount
 * - loginRecords.csv: playerId,day,sessionCount,totalOnlineMinutes
 * - contentExperience.csv: playerId,contentId,contentName,contentType,participationTimes,completionRate,avgDurationMinutes,satisfaction,firstPlayDay,lastPlayDay
 * - itemTransactions.csv: playerId,itemId,itemName,itemType,currency,unitPrice,quantity,consumed,totalSpent,purchaseDay
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

// ---- 数值类型字段声明，解析时自动转为 Number ----
const NUMERIC_FIELDS = new Set([
  'day', 'sessionCount', 'totalOnlineMinutes',
  'registerDaysBefore', 'totalPayAmount', 'versionPayAmount',
  'participationTimes', 'completionRate', 'avgDurationMinutes', 'satisfaction',
  'firstPlayDay', 'lastPlayDay',
  'unitPrice', 'quantity', 'consumed', 'totalSpent', 'purchaseDay',
  'price',
]);

/**
 * 流式解析单个 CSV 文件，逐行回调
 * @param {string} filePath CSV 文件绝对路径
 * @param {function} onRow 每行回调 (parsedObject) => void
 * @returns {Promise<number>} 解析的总行数
 */
function streamParseCSV(filePath, onRow) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath, { encoding: 'utf-8', highWaterMark: 64 * 1024 });
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    let headers = null;
    let lineCount = 0;

    rl.on('line', (line) => {
      // 跳过空行
      if (!line.trim()) return;

      if (!headers) {
        // 首行为表头，解析字段名（去除 BOM）
        headers = line.replace(/^\uFEFF/, '').split(',').map(h => h.trim());
        return;
      }

      lineCount++;
      const values = parseCSVLine(line);
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        let val = i < values.length ? values[i] : '';

        // 数值字段自动转型
        if (NUMERIC_FIELDS.has(key)) {
          const num = Number(val);
          obj[key] = val === '' || isNaN(num) ? null : num;
        } else {
          obj[key] = val === '' ? null : val;
        }
      }
      onRow(obj);
    });

    rl.on('close', () => resolve(lineCount));
    rl.on('error', reject);
    input.on('error', reject);
  });
}

/**
 * 解析一行 CSV（处理引号内的逗号和换行）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // 跳过转义的引号
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * 从 CSV 文件流式加载游戏数据，边解析边清洗
 *
 * @param {object} options
 * @param {string} options.playersFile - players.csv 路径
 * @param {string} options.loginRecordsFile - loginRecords.csv 路径
 * @param {string} options.contentExperienceFile - contentExperience.csv 路径
 * @param {string} options.itemTransactionsFile - itemTransactions.csv 路径
 * @param {string} [options.itemsFile] - items.csv 路径（道具定义表，可选）
 * @param {object} [options.versionInfo] - 版本信息对象
 * @param {object[]} [options.items] - 道具定义列表（如果不用 CSV）
 * @returns {Promise<{cleanedData, cleanReport}>}
 */
async function loadFromCSV(options) {
  const report = {
    original: {},
    cleaned: {},
    removedRecords: {},
    fixedRecords: {},
    issues: [],
  };

  // ---- 1. 流式加载 + 清洗玩家数据 ----
  const players = [];
  let playerRemoved = 0;
  const playerOriginal = await streamParseCSV(options.playersFile, (row) => {
    if (!row.playerId) {
      playerRemoved++;
      report.issues.push({ type: 'removed', field: 'players', reason: '缺少playerId' });
      return;
    }
    if (row.totalPayAmount !== null && row.totalPayAmount < 0) {
      playerRemoved++;
      report.issues.push({ type: 'removed', field: 'players', reason: `异常付费金额: ${row.totalPayAmount}` });
      return;
    }
    players.push(row);
  });
  report.original.players = playerOriginal;
  report.cleaned.players = players.length;
  report.removedRecords.players = playerRemoved;

  // ---- 2. 流式加载 + 清洗登录记录 ----
  const loginRecords = [];
  let loginRemoved = 0, loginFixed = 0;
  const loginOriginal = await streamParseCSV(options.loginRecordsFile, (row) => {
    if (!row.playerId) {
      loginRemoved++;
      report.issues.push({ type: 'removed', field: 'loginRecords', reason: '缺少playerId' });
      return;
    }
    if (row.totalOnlineMinutes !== null && row.totalOnlineMinutes < 0) {
      report.issues.push({ type: 'fixed', field: 'loginRecords', reason: `负数在线时长修正: ${row.totalOnlineMinutes} -> 0` });
      row.totalOnlineMinutes = 0;
      loginFixed++;
    }
    if (row.totalOnlineMinutes !== null && row.totalOnlineMinutes > 1440) {
      report.issues.push({ type: 'fixed', field: 'loginRecords', reason: `异常在线时长截断: ${row.totalOnlineMinutes} -> 1440` });
      row.totalOnlineMinutes = 1440;
      loginFixed++;
    }
    if (row.sessionCount === 0 && row.totalOnlineMinutes > 0) {
      report.issues.push({ type: 'fixed', field: 'loginRecords', reason: 'sessionCount修正: 0 -> 1' });
      row.sessionCount = 1;
      loginFixed++;
    }
    loginRecords.push(row);
  });
  report.original.loginRecords = loginOriginal;
  report.cleaned.loginRecords = loginRecords.length;
  report.removedRecords.loginRecords = loginRemoved;
  report.fixedRecords.loginRecords = loginFixed;

  // ---- 3. 流式加载 + 清洗内容体验数据 ----
  const contentExperience = [];
  let contentRemoved = 0, contentFixed = 0;
  const contentOriginal = await streamParseCSV(options.contentExperienceFile, (row) => {
    if (!row.playerId || !row.contentId) {
      contentRemoved++;
      report.issues.push({ type: 'removed', field: 'contentExperience', reason: '缺少关键字段' });
      return;
    }
    if (row.satisfaction !== null && (row.satisfaction > 5 || row.satisfaction < 1)) {
      report.issues.push({ type: 'fixed', field: 'contentExperience', reason: `满意度越界修正: ${row.satisfaction} -> clamp(1,5)` });
      row.satisfaction = Math.max(1, Math.min(5, row.satisfaction));
      contentFixed++;
    }
    if (row.completionRate !== null && row.completionRate > 1) {
      report.issues.push({ type: 'fixed', field: 'contentExperience', reason: `完成率越界修正: ${row.completionRate} -> 1` });
      row.completionRate = 1;
      contentFixed++;
    }
    if (row.completionRate !== null && row.completionRate < 0) {
      report.issues.push({ type: 'fixed', field: 'contentExperience', reason: `完成率越界修正: ${row.completionRate} -> 0` });
      row.completionRate = 0;
      contentFixed++;
    }
    contentExperience.push(row);
  });
  report.original.contentExperience = contentOriginal;
  report.cleaned.contentExperience = contentExperience.length;
  report.removedRecords.contentExperience = contentRemoved;
  report.fixedRecords.contentExperience = contentFixed;

  // ---- 4. 流式加载 + 清洗道具交易数据 ----
  const itemTransactions = [];
  let itemRemoved = 0, itemFixed = 0;
  const itemOriginal = await streamParseCSV(options.itemTransactionsFile, (row) => {
    if (!row.playerId || !row.itemId) {
      itemRemoved++;
      report.issues.push({ type: 'removed', field: 'itemTransactions', reason: '缺少关键字段' });
      return;
    }
    if (row.quantity !== null && row.quantity < 0) {
      itemRemoved++;
      report.issues.push({ type: 'removed', field: 'itemTransactions', reason: `负数购买量: ${row.quantity}` });
      return;
    }
    if (row.totalSpent === null) {
      row.totalSpent = (row.unitPrice || 0) * (row.quantity || 0);
      report.issues.push({ type: 'fixed', field: 'itemTransactions', reason: `重新计算totalSpent: ${row.totalSpent}` });
      itemFixed++;
    }
    itemTransactions.push(row);
  });
  report.original.itemTransactions = itemOriginal;
  report.cleaned.itemTransactions = itemTransactions.length;
  report.removedRecords.itemTransactions = itemRemoved;
  report.fixedRecords.itemTransactions = itemFixed;

  // ---- 5. 加载道具定义表 ----
  let items = options.items || [];
  if (!items.length && options.itemsFile) {
    await streamParseCSV(options.itemsFile, (row) => {
      items.push(row);
    });
  }

  const versionInfo = options.versionInfo || { versionId: 'unknown', newContentList: [] };

  return {
    cleanedData: {
      versionInfo,
      players,
      loginRecords,
      contentExperience,
      itemTransactions,
      items,
    },
    cleanReport: report,
  };
}

/**
 * 将内存数据导出为 CSV 文件（用于从 generateGameData 生成测试 CSV）
 */
function exportToCSV(data, outputDir) {
  const writeCSV = (filename, records) => {
    if (!records || records.length === 0) return;
    const keys = Object.keys(records[0]);
    const header = keys.join(',');
    const filePath = path.join(outputDir, filename);

    const ws = fs.createWriteStream(filePath, { encoding: 'utf-8' });
    ws.write(header + '\n');
    for (const record of records) {
      const line = keys.map(k => {
        const v = record[k];
        if (v === null || v === undefined) return '';
        const s = String(v);
        // 如果包含逗号或引号，用引号包裹
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
      ws.write(line + '\n');
    }
    ws.end();
    return new Promise((resolve, reject) => {
      ws.on('finish', resolve);
      ws.on('error', reject);
    });
  };

  return Promise.all([
    writeCSV('players.csv', data.players),
    writeCSV('loginRecords.csv', data.loginRecords),
    writeCSV('contentExperience.csv', data.contentExperience),
    writeCSV('itemTransactions.csv', data.itemTransactions),
    writeCSV('items.csv', data.items),
  ]);
}

module.exports = { loadFromCSV, exportToCSV, streamParseCSV };
