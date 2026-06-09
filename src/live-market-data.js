const EASTMONEY_ORIGIN = "https://push2.eastmoney.com";
const EASTMONEY_LIST_PATH = "/qt/clist/get";
const EASTMONEY_INDEX_PATH = "/qt/ulist.np/get";

const sectorFields = [
  "f12",
  "f13",
  "f14",
  "f2",
  "f3",
  "f62",
  "f66",
  "f69",
  "f72",
  "f75",
  "f78",
  "f81",
  "f84",
  "f87",
  "f104",
  "f105",
  "f106",
  "f124",
  "f184"
].join(",");

const stockFields = [
  "f12",
  "f13",
  "f14",
  "f2",
  "f3",
  "f8",
  "f9",
  "f20",
  "f21",
  "f23",
  "f62",
  "f66",
  "f69",
  "f72",
  "f75",
  "f78",
  "f81",
  "f84",
  "f87",
  "f100",
  "f124",
  "f184"
].join(",");

const branchAliases = {
  ai: [
    "人工智能",
    "算力概念",
    "CPO概念",
    "光通信模块",
    "数据要素",
    "数据中心",
    "AI芯片",
    "AIGC概念",
    "AI智能体",
    "AI应用",
    "DeepSeek概念",
    "华为昇腾",
    "液冷概念",
    "云计算",
    "国产芯片",
    "半导体概念",
    "先进封装",
    "高带宽内存",
    "铜缆高速连接",
    "光通信"
  ],
  manufacturing: [
    "机器人概念",
    "人形机器人",
    "机器人执行器",
    "工业母机",
    "低空经济",
    "飞行汽车(eVTOL)",
    "通用航空",
    "新型工业化",
    "新材料",
    "专用设备",
    "自动化设备",
    "机械设备",
    "工程机械概念",
    "商业航天",
    "航天装备",
    "军工电子"
  ],
  green: [
    "固态电池",
    "储能概念",
    "智能电网",
    "特高压",
    "绿色电力",
    "风能",
    "光伏概念",
    "电池",
    "锂电池概念",
    "新能源",
    "新能源车",
    "充电桩",
    "钙钛矿电池",
    "TOPCon电池",
    "风电设备",
    "电网设备"
  ],
  security: [
    "卫星互联网",
    "商业航天",
    "网络安全",
    "数据安全",
    "信创",
    "国产软件",
    "国防军工",
    "军工",
    "军工电子",
    "北斗导航",
    "量子科技",
    "农业种植",
    "粮食概念",
    "种植业"
  ],
  consumption: [
    "创新药",
    "AI制药（医疗）",
    "化学制药",
    "生物制品",
    "医疗器械概念",
    "医疗服务",
    "消费电子概念",
    "AI手机",
    "AIPC",
    "智能穿戴",
    "养老概念",
    "食品加工",
    "旅游酒店",
    "新消费",
    "首发经济"
  ],
  finance: [
    "银行Ⅱ",
    "银行",
    "证券Ⅱ",
    "券商概念",
    "保险Ⅱ",
    "多元金融",
    "互联网金融",
    "房地产开发",
    "房地产服务",
    "房屋建设Ⅱ",
    "化债(AMC)概念",
    "中特估",
    "红利股"
  ]
};

const scheduledRefreshMinutes = [575, 630, 690, 840, 910];

function toNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[()\s_（）]/g, "")
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅰⅱⅲ]/g, "")
    .replace(/概念/g, "");
}

function marketSuffix(marketId) {
  if (marketId === 1) return "SH";
  if (marketId === 0) return "SZ";
  if (marketId === 2) return "BJ";
  return "CN";
}

function formatDateTime(timestampSeconds) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timestampSeconds * 1000));
}

function shanghaiParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}/${value.month}/${value.day}`,
    key: `${value.year}-${value.month}-${value.day}`,
    weekday: value.weekday,
    minutes: Number(value.hour) * 60 + Number(value.minute)
  };
}

function isTradingWeekday(weekday) {
  return !["Sat", "Sun"].includes(weekday);
}

export function shouldRefreshOnOpen(meta, now = new Date()) {
  const current = shanghaiParts(now);
  if (!isTradingWeekday(current.weekday)) return false;
  if (!meta?.dataDate || meta.dataDate !== current.date) return true;
  const expectedMinute = scheduledRefreshMinutes.filter((minute) => current.minutes >= minute).pop();
  if (!expectedMinute) return false;
  const marketMinuteMatch = String(meta?.marketTime || "").match(/\s+(\d{2}):(\d{2})/);
  if (!marketMinuteMatch) return true;
  const marketMinute = Number(marketMinuteMatch[1]) * 60 + Number(marketMinuteMatch[2]);
  return marketMinute < expectedMinute;
}

export function dueScheduledRefreshKey(now = new Date()) {
  const current = shanghaiParts(now);
  if (!isTradingWeekday(current.weekday)) return "";
  const due = scheduledRefreshMinutes.find((minute) => current.minutes >= minute && current.minutes < minute + 5);
  return due ? `flowtree-refresh-${current.key}-${due}` : "";
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 16000);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`行情接口返回 ${response.status}`);
      const data = await response.json();
      if (data.rc !== 0) throw new Error(`行情接口返回 rc=${data.rc}`);
      return data;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw lastError;
}

function shouldUseEastmoneyProxy() {
  return !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function buildEastmoneyUrl(path, params = {}) {
  const base = shouldUseEastmoneyProxy()
    ? `${window.location.origin}/api/eastmoney${path}`
    : `${EASTMONEY_ORIGIN}/api${path}`;
  const url = new URL(base);
  url.searchParams.set("ut", "bd1d9ddb04089700cf9c27f6f7426281");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchIndexes() {
  const data = await fetchJson(buildEastmoneyUrl(EASTMONEY_INDEX_PATH, {
    fltt: "2",
    invt: "2",
    fields: "f12,f13,f14,f2,f3,f4,f6",
    secids: "1.000001,0.399001,0.399006,1.000300"
  }));
  return (data.data?.diff || []).map((item) => ({
    code: `${item.f12}.${marketSuffix(item.f13)}`,
    name: item.f14,
    price: toNumber(item.f2),
    change: toNumber(item.f3),
    amountYi: round(toNumber(item.f6) / 1e8, 2)
  }));
}

async function fetchSectorUniverse(type) {
  const url = buildEastmoneyUrl(EASTMONEY_LIST_PATH, {
    pn: "1",
    pz: "700",
    po: "1",
    np: "1",
    fltt: "2",
    invt: "2",
    fid: "f62",
    fs: `m:90+t:${type}`,
    fields: sectorFields
  });
  const data = await fetchJson(url);
  return (data.data?.diff || []).map((item) => ({
    type: type === 2 ? "industry" : "concept",
    code: item.f12,
    name: item.f14,
    price: toNumber(item.f2),
    change: toNumber(item.f3),
    flow: round(toNumber(item.f62) / 1e8, 2),
    superLargeFlow: round(toNumber(item.f66) / 1e8, 2),
    largeFlow: round(toNumber(item.f72) / 1e8, 2),
    mediumFlow: round(toNumber(item.f78) / 1e8, 2),
    smallFlow: round(toNumber(item.f84) / 1e8, 2),
    mainRatio: toNumber(item.f184),
    upCount: toNumber(item.f104),
    downCount: toNumber(item.f105),
    flatCount: toNumber(item.f106),
    timestamp: toNumber(item.f124)
  }));
}

async function fetchSectorStocks(sectorCode, limit = 8) {
  const url = buildEastmoneyUrl(EASTMONEY_LIST_PATH, {
    pn: "1",
    pz: String(limit),
    po: "1",
    np: "1",
    fltt: "2",
    invt: "2",
    fid: "f62",
    fs: `b:${sectorCode}`,
    fields: stockFields
  });
  const data = await fetchJson(url);
  return (data.data?.diff || []).map((item) => ({
    code: `${item.f12}.${marketSuffix(item.f13)}`,
    rawCode: item.f12,
    market: marketSuffix(item.f13),
    name: item.f14,
    price: toNumber(item.f2),
    change: toNumber(item.f3),
    turnover: toNumber(item.f8),
    pe: toNumber(item.f9, null),
    pb: toNumber(item.f23, null),
    marketCapYi: round(toNumber(item.f20) / 1e8, 2),
    floatCapYi: round(toNumber(item.f21) / 1e8, 2),
    inflow: round(toNumber(item.f62) / 1e8, 2),
    superLargeFlow: round(toNumber(item.f66) / 1e8, 2),
    largeFlow: round(toNumber(item.f72) / 1e8, 2),
    mediumFlow: round(toNumber(item.f78) / 1e8, 2),
    smallFlow: round(toNumber(item.f84) / 1e8, 2),
    mainRatio: toNumber(item.f184),
    industry: item.f100 || "未分类",
    timestamp: toNumber(item.f124)
  }));
}

function matchSectors(branch, sectors) {
  const aliases = branchAliases[branch.id] || branch.keywords || [];
  const seen = new Set();
  const matches = [];
  for (const alias of aliases) {
    const normalizedAlias = normalizeName(alias);
    const found = sectors
      .filter((sector) => {
        const normalizedSector = normalizeName(sector.name);
        return normalizedSector === normalizedAlias || normalizedSector.includes(normalizedAlias) || normalizedAlias.includes(normalizedSector);
      })
      .sort((a, b) => b.flow - a.flow);
    for (const sector of found) {
      if (!seen.has(sector.code)) {
        seen.add(sector.code);
        matches.push({ ...sector, matchedAlias: alias });
      }
    }
  }

  if (!matches.length) {
    for (const lane of branch.lanes || []) {
      const sector = sectors.find((item) => item.code === lane.code || item.name === lane.name);
      if (sector && !seen.has(sector.code)) {
        seen.add(sector.code);
        matches.push({ ...sector, matchedAlias: lane.name });
      }
    }
  }

  return matches.sort((a, b) => b.flow - a.flow).slice(0, 8);
}

function laneScore(sector, policyFit = 80) {
  const flowScore = clamp(58 + sector.flow * 2.7, 20, 96);
  const momentumScore = clamp(54 + sector.change * 6, 20, 96);
  const ratioScore = clamp(52 + sector.mainRatio * 4, 20, 96);
  return Math.round(flowScore * 0.38 + momentumScore * 0.24 + ratioScore * 0.22 + policyFit * 0.16);
}

function lanePressure(sector) {
  return Math.round(clamp(50 + Math.abs(sector.mainRatio) * 4.5 + Math.max(sector.change, 0) * 3.2, 20, 96));
}

function factorScores(policyFit = 80, lanes) {
  const topFlow = lanes[0]?.flow || 0;
  const avgChange = lanes.length ? lanes.reduce((sum, lane) => sum + lane.change, 0) / lanes.length : 0;
  const avgRatio = lanes.length ? lanes.reduce((sum, lane) => sum + lane.mainRatio, 0) / lanes.length : 0;
  const positiveRatio = lanes.length ? lanes.filter((lane) => lane.flow > 0).length / lanes.length : 0;
  return [
    Math.round(clamp(policyFit * 0.74 + Math.max(topFlow, 0) * 1.4, 35, 96)),
    Math.round(clamp(55 + Math.abs(avgRatio) * 4.5 + positiveRatio * 14, 30, 96)),
    Math.round(clamp(78 - Math.max(avgChange, 0) * 4 + (1 - positiveRatio) * 8, 30, 92)),
    Math.round(clamp(54 + avgChange * 5 + positiveRatio * 18, 28, 95)),
    Math.round(clamp(policyFit * 0.62 + Math.max(topFlow, 0) * 0.9 + avgChange * 3, 35, 95))
  ];
}

function stockScore(stock, policyFit = 80) {
  const flowScore = clamp(52 + stock.inflow * 8, 20, 96);
  const ratioScore = clamp(45 + stock.mainRatio * 2.2, 20, 96);
  const momentumScore = clamp(52 + stock.change * 4, 20, 96);
  return Math.round(flowScore * 0.34 + ratioScore * 0.28 + momentumScore * 0.18 + policyFit * 0.2);
}

function riskLabel(stock) {
  if (stock.change >= 9.5) return "涨幅过快";
  if (stock.mainRatio >= 18) return "交易拥挤";
  if (stock.turnover >= 18) return "换手偏高";
  if (stock.inflow < 0) return "资金流出";
  if (stock.pb && stock.pb > 8) return "估值偏高";
  return "持续跟踪";
}

function catalystLabel(branchId, laneName) {
  if (branchId === "ai") return laneName.includes("光") ? "算力订单验证" : "AI+场景落地";
  if (branchId === "manufacturing") return laneName.includes("低空") ? "试点城市推进" : "设备更新订单";
  if (branchId === "green") return laneName.includes("电") ? "装机/招标节奏" : "绿色转型投入";
  if (branchId === "security") return laneName.includes("航天") || laneName.includes("卫星") ? "星座建设招标" : "安全预算释放";
  if (branchId === "consumption") return laneName.includes("药") ? "管线/授权进展" : "新品与消费复苏";
  return "风险修复观察";
}

function reasonText(stock, branchName, laneName) {
  const direction = stock.inflow >= 0 ? "净流入" : "净流出";
  return `位于「${branchName} > ${laneName}」分支，今日主力资金${direction}${Math.abs(stock.inflow).toFixed(2)}亿，行业归属为${stock.industry}。`;
}

async function buildBranches(seedBranches, sectors, onProgress) {
  const branches = [];
  let stockFetchCount = 0;
  const stockFetchTotal = Math.max(seedBranches.length * 4, 1);

  for (const branch of seedBranches) {
    const matched = matchSectors(branch, sectors);
    const lanes = matched.map((sector) => ({
      id: sector.code,
      code: sector.code,
      type: sector.type,
      name: sector.name,
      matchedAlias: sector.matchedAlias,
      flow: sector.flow,
      change: sector.change,
      mainRatio: sector.mainRatio,
      upCount: sector.upCount,
      downCount: sector.downCount,
      flatCount: sector.flatCount,
      score: laneScore(sector, branch.policyFit),
      pressure: lanePressure(sector),
      stocks: []
    }));

    const stockMap = new Map();
    for (const lane of lanes.slice(0, 4)) {
      stockFetchCount += 1;
      onProgress?.({
        progress: Math.min(86, 48 + Math.round((stockFetchCount / stockFetchTotal) * 34)),
        message: "正在更新候选股",
        detail: `${branch.name} · ${lane.name}`
      });
      try {
        const stocks = await fetchSectorStocks(lane.code, 8);
        lane.stocks = stocks.slice(0, 5).map((stock) => stock.name);
        for (const stock of stocks) {
          const existing = stockMap.get(stock.code);
          if (!existing || stock.inflow > existing.inflow) {
            stockMap.set(stock.code, { ...stock, laneName: lane.name });
          }
        }
      } catch {
        lane.stocks = branch.lanes?.find((item) => item.code === lane.code)?.stocks || [];
      }
    }

    const candidates = [...stockMap.values()]
      .sort((a, b) => b.inflow - a.inflow)
      .slice(0, 10)
      .map((stock, index) => {
        const score = stockScore(stock, branch.policyFit);
        return {
          code: stock.code,
          name: stock.name,
          role: index === 0 ? "资金龙头" : stock.laneName,
          lane: stock.laneName,
          industry: stock.industry,
          price: stock.price,
          change: stock.change,
          turnover: stock.turnover,
          pe: stock.pe,
          pb: stock.pb,
          marketCapYi: stock.marketCapYi,
          inflow: stock.inflow,
          mainRatio: stock.mainRatio,
          score,
          fit: Math.round(clamp((branch.policyFit || 80) - index * 1.5 + Math.max(stock.change, 0) * 0.8, 45, 97)),
          catalyst: catalystLabel(branch.id, stock.laneName),
          risk: riskLabel(stock),
          reason: reasonText(stock, branch.name, stock.laneName)
        };
      });

    const branchFlow = round(lanes.reduce((sum, lane) => sum + lane.flow, 0), 2);
    const branchChange = round(lanes.length ? lanes.reduce((sum, lane) => sum + lane.change, 0) / lanes.length : 0, 2);

    branches.push({
      ...branch,
      flow: branchFlow,
      change: branchChange,
      factors: factorScores(branch.policyFit, lanes),
      lanes,
      candidates: candidates.length ? candidates : branch.candidates || []
    });
  }

  return branches;
}

export async function fetchLiveMarketData(seedData, onProgress) {
  onProgress?.({ progress: 16, message: "正在连接实时行情", detail: "读取指数和板块资金流" });
  const [indexes, industrySectors, conceptSectors] = await Promise.all([
    fetchIndexes(),
    fetchSectorUniverse(2),
    fetchSectorUniverse(3)
  ]);

  const sectors = [...industrySectors, ...conceptSectors];
  onProgress?.({ progress: 42, message: "正在重算资金流树", detail: "匹配政策分支和细分赛道" });
  const branches = await buildBranches(seedData?.branches || [], sectors, onProgress);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const quoteSeconds = Math.max(...sectors.map((sector) => sector.timestamp).filter(Boolean), nowSeconds);
  const marketTime = formatDateTime(Math.max(quoteSeconds, nowSeconds));

  const topSectors = sectors
    .slice()
    .sort((a, b) => b.flow - a.flow)
    .slice(0, 12)
    .map((sector) => ({
      code: sector.code,
      name: sector.name,
      type: sector.type,
      flow: sector.flow,
      change: sector.change,
      mainRatio: sector.mainRatio
    }));

  onProgress?.({ progress: 92, message: "正在校验数据", detail: "检查分支、赛道和候选池" });

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      marketTime,
      dataDate: marketTime.slice(0, 10),
      source: "东方财富公开行情实时拉取",
      sourceProvider: "eastmoney-live",
      sourceNote: "页面刷新时由浏览器直接拉取公开行情，不再等待静态部署数据更新。",
      sourceStats: {
        sectorCount: sectors.length,
        topSectorCount: topSectors.length,
        fetchedAt: new Date().toISOString()
      },
      policySource: seedData?.meta?.policySource || "中华人民共和国国民经济和社会发展第十五个五年规划纲要",
      note: seedData?.meta?.note || "页面展示为研究流程原型，候选股由公开资金流和规则计算生成，不构成投资建议。"
    },
    indexes,
    topSectors,
    branches
  };
}
