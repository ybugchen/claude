const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadFromCSV, exportToCSV, streamParseCSV } = require('../src/game-analytics/csvLoader');
const { generateGameData } = require('../src/data/gameData');
const { cleanGameData } = require('../src/game-analytics/dataCleaner');
const { analyzeUserSegmentation } = require('../src/game-analytics/userSegmentation');
const { analyzeContentExperience } = require('../src/game-analytics/contentAnalysis');
const { analyzeItemConversion } = require('../src/game-analytics/itemConversion');
const { generateAssessment } = require('../src/game-analytics/assessmentEngine');

describe('CSV Loader - Streaming Parse', () => {
  let tmpDir;
  let rawData;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-test-'));
    rawData = generateGameData();
    await exportToCSV(rawData, tmpDir);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('should parse CSV files and return correct row count', async () => {
    let count = 0;
    const total = await streamParseCSV(path.join(tmpDir, 'players.csv'), () => { count++; });
    expect(total).toBe(rawData.players.length);
    expect(count).toBe(rawData.players.length);
  });

  test('should correctly parse numeric fields', async () => {
    const rows = [];
    await streamParseCSV(path.join(tmpDir, 'players.csv'), (row) => { rows.push(row); });

    for (const row of rows) {
      if (row.totalPayAmount !== null) {
        expect(typeof row.totalPayAmount).toBe('number');
      }
      if (row.versionPayAmount !== null) {
        expect(typeof row.versionPayAmount).toBe('number');
      }
      if (row.registerDaysBefore !== null) {
        expect(typeof row.registerDaysBefore).toBe('number');
      }
    }
  });

  test('should handle CSV with quoted fields containing commas', async () => {
    const csvPath = path.join(tmpDir, 'quoted_test.csv');
    fs.writeFileSync(csvPath, 'name,desc\n"hello,world","test ""quoted"""\n');

    const rows = [];
    await streamParseCSV(csvPath, (row) => { rows.push(row); });

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('hello,world');
    expect(rows[0].desc).toBe('test "quoted"');
  });

  test('should skip empty lines', async () => {
    const csvPath = path.join(tmpDir, 'empty_lines.csv');
    fs.writeFileSync(csvPath, 'id,name\n1,a\n\n2,b\n\n');

    const rows = [];
    await streamParseCSV(csvPath, (row) => { rows.push(row); });

    expect(rows).toHaveLength(2);
  });
});

describe('CSV Loader - Integrated Loading & Cleaning', () => {
  let tmpDir;
  let rawData;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-clean-'));
    rawData = generateGameData();
    await exportToCSV(rawData, tmpDir);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('should load CSV and produce cleanedData with same structure', async () => {
    const { cleanedData, cleanReport } = await loadFromCSV({
      playersFile: path.join(tmpDir, 'players.csv'),
      loginRecordsFile: path.join(tmpDir, 'loginRecords.csv'),
      contentExperienceFile: path.join(tmpDir, 'contentExperience.csv'),
      itemTransactionsFile: path.join(tmpDir, 'itemTransactions.csv'),
      itemsFile: path.join(tmpDir, 'items.csv'),
      versionInfo: rawData.versionInfo,
    });

    expect(cleanedData.players.length).toBeGreaterThan(0);
    expect(cleanedData.loginRecords.length).toBeGreaterThan(0);
    expect(cleanedData.contentExperience.length).toBeGreaterThan(0);
    expect(cleanedData.itemTransactions.length).toBeGreaterThan(0);
    expect(cleanedData.items.length).toBe(rawData.items.length);

    expect(cleanReport.original.players).toBe(rawData.players.length);
    expect(cleanReport.original.loginRecords).toBe(rawData.loginRecords.length);
  });

  test('should remove null playerId records during CSV load', async () => {
    const { cleanedData } = await loadFromCSV({
      playersFile: path.join(tmpDir, 'players.csv'),
      loginRecordsFile: path.join(tmpDir, 'loginRecords.csv'),
      contentExperienceFile: path.join(tmpDir, 'contentExperience.csv'),
      itemTransactionsFile: path.join(tmpDir, 'itemTransactions.csv'),
      itemsFile: path.join(tmpDir, 'items.csv'),
      versionInfo: rawData.versionInfo,
    });

    const nullPlayerLogin = cleanedData.loginRecords.filter(r => r.playerId === null);
    expect(nullPlayerLogin).toHaveLength(0);
  });

  test('should fix negative online minutes during CSV load', async () => {
    const { cleanedData } = await loadFromCSV({
      playersFile: path.join(tmpDir, 'players.csv'),
      loginRecordsFile: path.join(tmpDir, 'loginRecords.csv'),
      contentExperienceFile: path.join(tmpDir, 'contentExperience.csv'),
      itemTransactionsFile: path.join(tmpDir, 'itemTransactions.csv'),
      itemsFile: path.join(tmpDir, 'items.csv'),
      versionInfo: rawData.versionInfo,
    });

    const negativeMinutes = cleanedData.loginRecords.filter(r => r.totalOnlineMinutes < 0);
    expect(negativeMinutes).toHaveLength(0);
  });

  test('should clamp satisfaction to 1-5 range during CSV load', async () => {
    const { cleanedData } = await loadFromCSV({
      playersFile: path.join(tmpDir, 'players.csv'),
      loginRecordsFile: path.join(tmpDir, 'loginRecords.csv'),
      contentExperienceFile: path.join(tmpDir, 'contentExperience.csv'),
      itemTransactionsFile: path.join(tmpDir, 'itemTransactions.csv'),
      itemsFile: path.join(tmpDir, 'items.csv'),
      versionInfo: rawData.versionInfo,
    });

    for (const r of cleanedData.contentExperience) {
      expect(r.satisfaction).toBeGreaterThanOrEqual(1);
      expect(r.satisfaction).toBeLessThanOrEqual(5);
    }
  });

  test('CSV-loaded data should work with downstream analysis modules', async () => {
    const { cleanedData, cleanReport } = await loadFromCSV({
      playersFile: path.join(tmpDir, 'players.csv'),
      loginRecordsFile: path.join(tmpDir, 'loginRecords.csv'),
      contentExperienceFile: path.join(tmpDir, 'contentExperience.csv'),
      itemTransactionsFile: path.join(tmpDir, 'itemTransactions.csv'),
      itemsFile: path.join(tmpDir, 'items.csv'),
      versionInfo: rawData.versionInfo,
    });

    // All downstream modules should work without errors
    const segmentation = analyzeUserSegmentation(cleanedData);
    expect(segmentation.summary.totalPlayers).toBeGreaterThan(0);

    const contentAnalysis = analyzeContentExperience(cleanedData);
    expect(contentAnalysis.contentOverview).toBeDefined();

    const itemConversion = analyzeItemConversion(cleanedData);
    expect(itemConversion.revenueStructure).toBeDefined();

    const assessment = generateAssessment(segmentation, contentAnalysis, itemConversion, cleanReport);
    expect(assessment.overallScore.score).toBeGreaterThanOrEqual(0);
    expect(assessment.overallScore.score).toBeLessThanOrEqual(100);
  });
});

describe('CSV Loader - Export', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-export-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('should export all CSV files', async () => {
    const rawData = generateGameData();
    await exportToCSV(rawData, tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'players.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'loginRecords.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'contentExperience.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'itemTransactions.csv'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'items.csv'))).toBe(true);
  });

  test('exported CSV should have correct header row', async () => {
    const rawData = generateGameData();
    await exportToCSV(rawData, tmpDir);

    const playersCSV = fs.readFileSync(path.join(tmpDir, 'players.csv'), 'utf-8');
    const headerLine = playersCSV.split('\n')[0];
    expect(headerLine).toContain('playerId');
    expect(headerLine).toContain('payTier');
    expect(headerLine).toContain('versionPayAmount');
  });
});
