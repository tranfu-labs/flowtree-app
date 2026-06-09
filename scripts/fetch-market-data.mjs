import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { dirname } from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = new URL("../src/data/market-data.json", import.meta.url);
const runtimeOutputPath = new URL("../public/market-data.json", import.meta.url);
const execFileAsync = promisify(execFile);

const EASTMONEY_LIST_API = "http://push2.eastmoney.com/api/qt/clist/get";
const EASTMONEY_INDEX_API = "http://push2.eastmoney.com/api/qt/ulist.np/get";

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

const branchConfigs = [
  {
    id: "ai",
    name: "AI+",
    iconKey: "ai",
    color: "#57e1a2",
    policy: "科技自立自强 / 数字中国",
    policyFit: 94,
    policySources: ["第三篇：加快高水平科技自立自强", "第四篇：深入推进数字中国建设"],
    narrative: "十五五强调新质生产力、数智化和人工智能+，资金会先沿算力、数据、模型、终端与国产替代分叉。",
    keywords: ["人工智能", "算力", "数据要素", "国产替代"],
    aliases: [
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
    ]
  },
  {
    id: "manufacturing",
    name: "先进制造",
    iconKey: "manufacturing",
    color: "#8be58f",
    policy: "现代化产业体系 / 实体经济根基",
    policyFit: 91,
    policySources: ["第二篇：建设现代化产业体系", "第三篇：引领发展新质生产力"],
    narrative: "实体经济和先进制造是政策树干，重点看设备更新、国产替代、机器人、低空经济和高端装备。",
    keywords: ["机器人", "工业母机", "低空经济", "高端装备"],
    aliases: [
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
    ]
  },
  {
    id: "green",
    name: "绿色低碳",
    iconKey: "green",
    color: "#b7e67a",
    policy: "全面绿色转型 / 能源安全",
    policyFit: 88,
    policySources: ["第十三篇：加快经济社会发展全面绿色转型"],
    narrative: "绿色转型主线要从电网、储能、电池、新能源车和绿色电力里找资金持续性，而不是只看概念热度。",
    keywords: ["电网", "储能", "固态电池", "绿色电力"],
    aliases: [
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
    ]
  },
  {
    id: "security",
    name: "安全底线",
    iconKey: "security",
    color: "#72d8ec",
    policy: "国家安全体系 / 产业链韧性",
    policyFit: 90,
    policySources: ["第十四篇：推进国家安全体系和能力现代化"],
    narrative: "安全底线分支覆盖航天、卫星互联网、军工、数据安全、信创和粮食安全，重点看韧性投入是否转为订单。",
    keywords: ["卫星互联网", "网络安全", "军工", "信创"],
    aliases: [
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
    ]
  },
  {
    id: "consumption",
    name: "内需消费",
    iconKey: "consumption",
    color: "#f0c766",
    policy: "强大国内市场 / 民生改善",
    policyFit: 82,
    policySources: ["第五篇：建设强大国内市场", "第十一篇：完善人口发展战略"],
    narrative: "内需消费要看人口结构、医疗健康、AI终端和服务消费的真实资金流，不只看估值修复。",
    keywords: ["创新药", "消费电子", "医疗服务", "银发经济"],
    aliases: [
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
    ]
  },
  {
    id: "finance",
    name: "金融地产",
    iconKey: "finance",
    color: "#f26b6b",
    policy: "风险化解 / 高质量发展",
    policyFit: 68,
    policySources: ["第六篇：高水平社会主义市场经济体制", "第十四篇：风险防范"],
    narrative: "金融地产保留为风险与资金撤离观察分支，用来提示哪些树枝不应被热度误判。",
    keywords: ["银行", "证券", "保险", "地产链"],
    aliases: [
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
  }
];

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
  return Math.round(value * factor) / factor;
}

function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[()\s_（）]/g, "")
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅰⅱⅲ]/g, "")
    .replace(/概念/g, "");
}

async function fetchAkshareSectors() {
  if (process.env.DISABLE_AKSHARE === "1") {
    throw new Error("AKShare disabled for this refresh environment");
  }
  const pythonPath = new URL("../.venv/bin/python", import.meta.url);
  const scriptPath = new URL("./akshare-provider.py", import.meta.url);
  const cleanEnv = { ...process.env };
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) {
    delete cleanEnv[key];
  }

  const { stdout, stderr } = await execFileAsync(fileURLToPath(pythonPath), [fileURLToPath(scriptPath)], {
    cwd: dirname(fileURLToPath(scriptPath)),
    env: cleanEnv,
    maxBuffer: 1024 * 1024 * 20,
    timeout: 120000
  });

  if (stderr.trim()) {
    console.warn(stderr.trim().split("\n").slice(-4).join("\n"));
  }

  const payload = JSON.parse(stdout);
  if (!payload.sectors?.length) {
    throw new Error("AKShare returned no sectors");
  }
  return payload;
}

function mergeAkshareSectors(eastmoneySectors, aksharePayload) {
  const byName = new Map();
  for (const sector of aksharePayload.sectors || []) {
    byName.set(normalizeName(sector.name), sector);
  }

  let matchedCount = 0;
  const merged = eastmoneySectors.map((sector) => {
    const akSector = byName.get(normalizeName(sector.name));
    if (!akSector) return { ...sector, dataProvider: "eastmoney" };
    matchedCount += 1;
    return {
      ...sector,
      change: akSector.change,
      flow: akSector.flow,
      superLargeFlow: akSector.superLargeFlow,
      largeFlow: akSector.largeFlow,
      mediumFlow: akSector.mediumFlow,
      smallFlow: akSector.smallFlow,
      mainRatio: akSector.mainRatio,
      leadingStock: akSector.leadingStock,
      dataProvider: "akshare"
    };
  });

  return {
    sectors: merged,
    stats: {
      provider: "akshare",
      matchedCount,
      totalAkshareSectors: aksharePayload.sectors.length,
      akshareVersion: aksharePayload.meta?.akshareVersion || "",
      akshareFetchedAt: aksharePayload.meta?.fetchedAt || ""
    }
  };
}

function marketSuffix(marketId) {
  if (marketId === 1) return "SH";
  if (marketId === 0) return "SZ";
  if (marketId === 2) return "BJ";
  return "CN";
}

function formatDateTime(timestampSeconds) {
  if (!timestampSeconds) {
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  }

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

async function fetchJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const text = await requestText(url);
      const data = JSON.parse(text);
      if (data.rc !== 0) {
        throw new Error(`Eastmoney returned rc=${data.rc}: ${url}`);
      }
      return data;
    } catch (error) {
      lastError = new Error(describeRequestError(error, url));
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError;
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? http : https;
    const request = client.request(parsed, {
      method: "GET",
      timeout: Number(process.env.EASTMONEY_TIMEOUT_MS || 20000),
      headers: {
        Connection: "close",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://data.eastmoney.com/"
      }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
          reject(new Error(`Request failed ${response.statusCode}: ${text.slice(0, 160)}`));
          return;
        }
        resolve(text);
      });
    });

    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
    request.end();
  });
}

function describeRequestError(error, url) {
  const parsed = new URL(url);
  const cause = error?.cause;
  const details = [
    error?.name || "Error",
    error?.message || String(error),
    `host=${parsed.host}`,
    `path=${parsed.pathname}`
  ];
  if (cause?.code) details.push(`causeCode=${cause.code}`);
  if (cause?.message) details.push(`causeMessage=${cause.message}`);
  if (cause?.address) details.push(`address=${cause.address}`);
  if (cause?.port) details.push(`port=${cause.port}`);
  if (cause?.syscall) details.push(`syscall=${cause.syscall}`);
  return details.join(" | ");
}

function buildListUrl(params) {
  const url = new URL(EASTMONEY_LIST_API);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchIndexes() {
  const url = new URL(EASTMONEY_INDEX_API);
  url.searchParams.set("fltt", "2");
  url.searchParams.set("invt", "2");
  url.searchParams.set("fields", "f12,f13,f14,f2,f3,f4,f6");
  url.searchParams.set("secids", "1.000001,0.399001,0.399006,1.000300");
  const data = await fetchJson(url.toString());
  return (data.data?.diff || []).map((item) => ({
    code: `${item.f12}.${marketSuffix(item.f13)}`,
    name: item.f14,
    price: toNumber(item.f2),
    change: toNumber(item.f3),
    amountYi: round(toNumber(item.f6) / 1e8, 2)
  }));
}

async function fetchSectorUniverse(type) {
  const url = buildListUrl({
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

async function fetchSectorStocks(sectorCode, limit = 12) {
  const url = buildListUrl({
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
  let data;
  try {
    data = await fetchJson(url);
  } catch (error) {
    console.warn(`Skip sector stocks ${sectorCode}: ${error.message}`);
    return [];
  }
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

function matchSectors(config, sectors) {
  const seen = new Set();
  const matches = [];
  for (const alias of config.aliases) {
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

  return matches
    .sort((a, b) => b.flow - a.flow)
    .slice(0, 8);
}

function laneScore(sector, config) {
  const flowScore = clamp(58 + sector.flow * 2.7, 20, 96);
  const momentumScore = clamp(54 + sector.change * 6, 20, 96);
  const ratioScore = clamp(52 + sector.mainRatio * 4, 20, 96);
  return Math.round(flowScore * 0.38 + momentumScore * 0.24 + ratioScore * 0.22 + config.policyFit * 0.16);
}

function lanePressure(sector) {
  return Math.round(clamp(50 + Math.abs(sector.mainRatio) * 4.5 + Math.max(sector.change, 0) * 3.2, 20, 96));
}

function factorScores(config, lanes) {
  const topFlow = lanes[0]?.flow || 0;
  const avgChange = lanes.length ? lanes.reduce((sum, lane) => sum + lane.change, 0) / lanes.length : 0;
  const avgRatio = lanes.length ? lanes.reduce((sum, lane) => sum + lane.mainRatio, 0) / lanes.length : 0;
  const positiveRatio = lanes.length ? lanes.filter((lane) => lane.flow > 0).length / lanes.length : 0;

  return [
    Math.round(clamp(config.policyFit * 0.74 + Math.max(topFlow, 0) * 1.4, 35, 96)),
    Math.round(clamp(55 + Math.abs(avgRatio) * 4.5 + positiveRatio * 14, 30, 96)),
    Math.round(clamp(78 - Math.max(avgChange, 0) * 4 + (1 - positiveRatio) * 8, 30, 92)),
    Math.round(clamp(54 + avgChange * 5 + positiveRatio * 18, 28, 95)),
    Math.round(clamp(config.policyFit * 0.62 + Math.max(topFlow, 0) * 0.9 + avgChange * 3, 35, 95))
  ];
}

function stockScore(stock, config) {
  const flowScore = clamp(52 + stock.inflow * 8, 20, 96);
  const ratioScore = clamp(45 + stock.mainRatio * 2.2, 20, 96);
  const momentumScore = clamp(52 + stock.change * 4, 20, 96);
  return Math.round(flowScore * 0.34 + ratioScore * 0.28 + momentumScore * 0.18 + config.policyFit * 0.2);
}

function riskLabel(stock) {
  if (stock.change >= 9.5) return "涨幅过快";
  if (stock.mainRatio >= 18) return "交易拥挤";
  if (stock.turnover >= 18) return "换手偏高";
  if (stock.inflow < 0) return "资金流出";
  if (stock.pb && stock.pb > 8) return "估值偏高";
  return "持续跟踪";
}

function catalystLabel(config, laneName) {
  if (config.id === "ai") return laneName.includes("光") ? "算力订单验证" : "AI+场景落地";
  if (config.id === "manufacturing") return laneName.includes("低空") ? "试点城市推进" : "设备更新订单";
  if (config.id === "green") return laneName.includes("电") ? "装机/招标节奏" : "绿色转型投入";
  if (config.id === "security") return laneName.includes("航天") || laneName.includes("卫星") ? "星座建设招标" : "安全预算释放";
  if (config.id === "consumption") return laneName.includes("药") ? "管线/授权进展" : "新品与消费复苏";
  return "风险修复观察";
}

function reasonText(stock, branchName, laneName) {
  const direction = stock.inflow >= 0 ? "净流入" : "净流出";
  return `位于「${branchName} > ${laneName}」分支，今日主力资金${direction}${Math.abs(stock.inflow).toFixed(2)}亿，行业归属为${stock.industry}。`;
}

async function buildBranches(sectors) {
  const branches = [];

  for (const config of branchConfigs) {
    const matched = matchSectors(config, sectors);
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
      score: laneScore(sector, config),
      pressure: lanePressure(sector),
      stocks: []
    }));

    const stockMap = new Map();
    for (const lane of lanes.slice(0, 4)) {
      const stocks = await fetchSectorStocks(lane.code, 8);
      lane.stocks = stocks.slice(0, 5).map((stock) => stock.name);
      for (const stock of stocks) {
        const existing = stockMap.get(stock.code);
        if (!existing || stock.inflow > existing.inflow) {
          stockMap.set(stock.code, { ...stock, laneName: lane.name });
        }
      }
    }

    const candidates = [...stockMap.values()]
      .sort((a, b) => b.inflow - a.inflow)
      .slice(0, 10)
      .map((stock, index) => {
        const score = stockScore(stock, config);
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
          fit: Math.round(clamp(config.policyFit - index * 1.5 + Math.max(stock.change, 0) * 0.8, 45, 97)),
          catalyst: catalystLabel(config, stock.laneName),
          risk: riskLabel(stock),
          reason: reasonText(stock, config.name, stock.laneName)
        };
      });

    const branchFlow = round(lanes.reduce((sum, lane) => sum + lane.flow, 0), 2);
    const branchChange = round(lanes.length ? lanes.reduce((sum, lane) => sum + lane.change, 0) / lanes.length : 0, 2);

    branches.push({
      id: config.id,
      name: config.name,
      iconKey: config.iconKey,
      color: config.color,
      policy: config.policy,
      policyFit: config.policyFit,
      policySources: config.policySources,
      narrative: config.narrative,
      keywords: config.keywords,
      flow: branchFlow,
      change: branchChange,
      factors: factorScores(config, lanes),
      lanes,
      candidates
    });
  }

  return branches;
}

async function main() {
  const [indexes, industrySectors, conceptSectors] = await Promise.all([
    fetchIndexes(),
    fetchSectorUniverse(2),
    fetchSectorUniverse(3)
  ]);

  const eastmoneySectors = [...industrySectors, ...conceptSectors];
  let sectors = eastmoneySectors;
  let dataSource = {
    provider: "eastmoney",
    label: "东方财富公开行情与板块资金流接口",
    note: "AKShare 未启用或本次刷新失败，已自动使用东方财富直连兜底。"
  };

  try {
    const aksharePayload = await fetchAkshareSectors();
    const merged = mergeAkshareSectors(eastmoneySectors, aksharePayload);
    sectors = merged.sectors;
    dataSource = {
      provider: "akshare+eastmoney",
      label: "AKShare 板块资金流 + 东方财富行情/成分股兜底",
      note: `AKShare ${merged.stats.akshareVersion} 已启用，匹配 ${merged.stats.matchedCount}/${merged.stats.totalAkshareSectors} 个板块；东方财富补充板块代码、上涨下跌家数和成分股。`,
      stats: merged.stats
    };
  } catch (error) {
    console.warn(`AKShare provider failed, falling back to Eastmoney direct: ${error.message}`);
  }

  const branches = await buildBranches(sectors);
  const maxTimestamp = Math.max(
    ...sectors.map((sector) => sector.timestamp).filter(Boolean),
    Math.floor(Date.now() / 1000)
  );

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

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      marketTime: formatDateTime(maxTimestamp),
      dataDate: formatDateTime(maxTimestamp).slice(0, 10),
      source: dataSource.label,
      sourceProvider: dataSource.provider,
      sourceNote: dataSource.note,
      sourceStats: dataSource.stats || null,
      policySource: "中华人民共和国国民经济和社会发展第十五个五年规划纲要",
      note: "页面展示为研究流程原型，候选股由公开资金流和规则计算生成，不构成投资建议。"
    },
    indexes,
    topSectors,
    branches
  };

  await writeMarketData(payload);
  console.log(`Wrote ${fileURLToPath(outputPath)} from ${__dirname}`);
  console.log(`Wrote ${fileURLToPath(runtimeOutputPath)} for runtime refresh`);
  console.log(`Market time: ${payload.meta.marketTime}`);
  console.log(`Data source: ${payload.meta.source}`);
  console.log(`Branches: ${branches.map((branch) => `${branch.name} ${branch.flow}亿`).join(" | ")}`);
}

async function writeMarketData(payload) {
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  await mkdir(dirname(fileURLToPath(outputPath)), { recursive: true });
  await mkdir(dirname(fileURLToPath(runtimeOutputPath)), { recursive: true });
  await writeFile(outputPath, content, "utf8");
  await writeFile(runtimeOutputPath, content, "utf8");
}

main().catch(async (error) => {
  const message = error?.message || String(error);
  console.warn(`Refresh failed: ${message}`);
  try {
    const cached = JSON.parse(await readFile(outputPath, "utf8"));
    if (process.env.SKIP_CACHE_FAILURE_WRITE === "1") {
      console.warn(`Kept cached data from ${cached.meta?.marketTime || "unknown time"} without rewriting files.`);
      return;
    }
    cached.meta = {
      ...cached.meta,
      refreshAttemptedAt: new Date().toISOString(),
      refreshStatus: "failed_using_cached_data",
      refreshError: message
    };
    await writeMarketData(cached);
    console.warn(`Kept cached data from ${cached.meta.marketTime || "unknown time"}.`);
    return;
  } catch (cacheError) {
    console.error(`No cached data available: ${cacheError.message}`);
    process.exit(1);
  }
});
