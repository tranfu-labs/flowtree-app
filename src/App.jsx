import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bookmark,
  ChevronDown,
  Cpu,
  Download,
  Eye,
  Factory,
  FileText,
  FlaskConical,
  Gauge,
  GitBranch,
  Home,
  Layers,
  Leaf,
  LineChart,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target
} from "lucide-react";
import bundledMarketData from "./data/market-data.json";
import { fetchLiveMarketData } from "./live-market-data.js";

const fallbackBranches = [
  {
    id: "ai",
    name: "AI+",
    icon: Cpu,
    flow: 189.62,
    change: 3.42,
    color: "#57e1a2",
    policy: "科技自立自强 / 数字中国",
    narrative: "十五五把数智化放进现代化产业体系，算力、模型、数据和场景应用成为主枝。",
    keywords: ["算力基础设施", "国产模型", "数据要素", "智能制造"],
    factors: [92, 84, 58, 79, 88],
    lanes: [
      { name: "算力基础设施", flow: 51.27, score: 86, pressure: 82, stocks: ["光联科技", "硅芯光电", "云算设备"] },
      { name: "光模块", flow: 16.81, score: 84, pressure: 78, stocks: ["CPO材料", "高速互联", "测试设备"] },
      { name: "AI服务器", flow: 19.32, score: 80, pressure: 69, stocks: ["液冷模组", "主板模组", "电源管理"] },
      { name: "封测", flow: 15.51, score: 75, pressure: 63, stocks: ["先进封装", "洁净工艺", "检测系统"] }
    ],
    candidates: [
      { code: "SAMPLE-01", name: "光联科技", role: "主干受益", inflow: 5.23, score: 88, fit: 94, catalyst: "800G/1.6T放量", risk: "估值偏高", reason: "订单流从云厂商扩容传导到高速互联，分支仍有供给约束。" },
      { code: "SAMPLE-02", name: "硅芯光电", role: "瓶颈材料", inflow: 2.31, score: 82, fit: 91, catalyst: "CPO导入", risk: "量产节奏", reason: "硅光工艺和良率改善决定利润释放速度。" },
      { code: "SAMPLE-03", name: "云算设备", role: "设备弹性", inflow: 1.98, score: 77, fit: 87, catalyst: "客户扩产", risk: "价格竞争", reason: "测试、散热、供电环节跟随算力投资扩张。" }
    ]
  },
  {
    id: "manufacturing",
    name: "先进制造",
    icon: Factory,
    flow: 156.21,
    change: 2.86,
    color: "#8be58f",
    policy: "现代化产业体系 / 实体经济根基",
    narrative: "从政策主线到设备更新、工艺替代和出口链，资金偏好有真实订单约束的硬制造。",
    keywords: ["工业母机", "机器人", "低空经济", "新材料"],
    factors: [84, 88, 66, 74, 81],
    lanes: [
      { name: "工业母机", flow: 16.22, score: 81, pressure: 71, stocks: ["高端数控", "刀具材料", "检测装备"] },
      { name: "机器人", flow: 15.14, score: 78, pressure: 67, stocks: ["关节模组", "传感器", "控制系统"] },
      { name: "低空经济", flow: 12.18, score: 73, pressure: 58, stocks: ["航电系统", "复材结构", "空管服务"] },
      { name: "新材料", flow: 32.18, score: 76, pressure: 62, stocks: ["高温合金", "碳纤维", "陶瓷基"] }
    ],
    candidates: [
      { code: "SAMPLE-11", name: "高端数控", role: "国产替代", inflow: 3.74, score: 83, fit: 90, catalyst: "设备更新", risk: "周期波动", reason: "政策资金进入设备端，订单和国产替代同时验证。" },
      { code: "SAMPLE-12", name: "关节模组", role: "核心部件", inflow: 2.42, score: 79, fit: 84, catalyst: "量产验证", risk: "成本下降", reason: "机器人整机扩产会优先放大核心部件弹性。" },
      { code: "SAMPLE-13", name: "航电系统", role: "标准受益", inflow: 1.62, score: 70, fit: 80, catalyst: "试点城市", risk: "监管节奏", reason: "低空应用要等空域、标准、运营场景逐步确认。" }
    ]
  },
  {
    id: "green",
    name: "绿色低碳",
    icon: Leaf,
    flow: 98.41,
    change: 1.94,
    color: "#b7e67a",
    policy: "全面绿色转型 / 能源安全",
    narrative: "绿色转型不只看概念，重点看电网、储能、材料和海外订单能不能承接真实资本开支。",
    keywords: ["固态电池", "电网设备", "储能", "风电"],
    factors: [80, 79, 72, 68, 76],
    lanes: [
      { name: "电网设备", flow: 28.19, score: 82, pressure: 64, stocks: ["智能电网", "特高压", "配网自动化"] },
      { name: "固态电池", flow: 18.91, score: 77, pressure: 74, stocks: ["硫化物材料", "隔膜升级", "检测设备"] },
      { name: "储能", flow: 19.81, score: 75, pressure: 59, stocks: ["PCS", "温控", "系统集成"] },
      { name: "风电", flow: 11.42, score: 69, pressure: 47, stocks: ["海缆", "轴承", "叶片材料"] }
    ],
    candidates: [
      { code: "SAMPLE-21", name: "智能电网", role: "确定支出", inflow: 4.26, score: 85, fit: 88, catalyst: "配网投资", risk: "招标价格", reason: "电力系统升级是绿色转型的基础约束。" },
      { code: "SAMPLE-22", name: "硫化物材料", role: "技术瓶颈", inflow: 2.18, score: 79, fit: 82, catalyst: "车厂验证", risk: "路线不确定", reason: "固态电池从主题走向产业，需要材料工艺先突破。" },
      { code: "SAMPLE-23", name: "温控系统", role: "配套弹性", inflow: 1.54, score: 72, fit: 76, catalyst: "海外项目", risk: "毛利压缩", reason: "储能系统安全和效率提升会带动温控需求。" }
    ]
  },
  {
    id: "security",
    name: "安全底线",
    icon: Shield,
    flow: 32.67,
    change: 0.82,
    color: "#72d8ec",
    policy: "国家安全体系 / 产业链韧性",
    narrative: "安全主线通常不是最热，但在外部不确定性上升时，会沿供应链韧性和数据安全分叉。",
    keywords: ["网络安全", "卫星互联网", "农业种业", "工业软件"],
    factors: [76, 82, 69, 66, 73],
    lanes: [
      { name: "网络安全", flow: 9.78, score: 72, pressure: 55, stocks: ["数据安全", "身份安全", "安全运营"] },
      { name: "卫星互联网", flow: 6.44, score: 69, pressure: 61, stocks: ["相控阵", "星载芯片", "地面终端"] },
      { name: "工业软件", flow: 5.21, score: 68, pressure: 66, stocks: ["CAE", "MES", "EDA工具"] },
      { name: "农业种业", flow: 3.33, score: 64, pressure: 58, stocks: ["生物育种", "智慧农机", "粮食安全"] }
    ],
    candidates: [
      { code: "SAMPLE-31", name: "数据安全", role: "底座建设", inflow: 1.86, score: 73, fit: 78, catalyst: "政企预算", risk: "回款周期", reason: "数据要素流通需要安全边界和合规体系。" },
      { code: "SAMPLE-32", name: "相控阵", role: "稀缺环节", inflow: 1.31, score: 71, fit: 74, catalyst: "星座招标", risk: "订单节奏", reason: "卫星互联网链条长，先看能卡住交付的关键组件。" },
      { code: "SAMPLE-33", name: "CAE工具", role: "国产替代", inflow: 0.84, score: 67, fit: 72, catalyst: "客户迁移", risk: "生态不足", reason: "工业软件价值兑现慢，但自主可控逻辑稳定。" }
    ]
  },
  {
    id: "consumption",
    name: "内需消费",
    icon: FlaskConical,
    flow: 45.38,
    change: 0.95,
    color: "#f0c766",
    policy: "强大国内市场 / 民生改善",
    narrative: "内需分支优先看人口结构变化、服务供给升级和品牌出海，而不是简单看估值修复。",
    keywords: ["创新药", "消费电子", "医疗服务", "银发经济"],
    factors: [72, 64, 76, 70, 67],
    lanes: [
      { name: "创新药", flow: 14.23, score: 73, pressure: 52, stocks: ["ADC平台", "临床服务", "出海授权"] },
      { name: "消费电子", flow: 18.61, score: 70, pressure: 48, stocks: ["AI终端", "声学模组", "结构件"] },
      { name: "医疗服务", flow: 8.92, score: 66, pressure: 44, stocks: ["康复服务", "眼科服务", "检测服务"] },
      { name: "银发经济", flow: 3.62, score: 62, pressure: 39, stocks: ["护理设备", "养老运营", "慢病管理"] }
    ],
    candidates: [
      { code: "SAMPLE-41", name: "AI终端", role: "换机链条", inflow: 2.58, score: 74, fit: 78, catalyst: "新品发布", risk: "需求验证", reason: "AI功能若带动换机，零部件先接收订单信号。" },
      { code: "SAMPLE-42", name: "ADC平台", role: "出海弹性", inflow: 1.74, score: 72, fit: 80, catalyst: "授权谈判", risk: "临床失败", reason: "创新药看管线兑现和海外支付能力，不看概念热度。" },
      { code: "SAMPLE-43", name: "康复服务", role: "人口结构", inflow: 0.91, score: 63, fit: 70, catalyst: "支付政策", risk: "扩张质量", reason: "服务型赛道适合放进长期观察池。" }
    ]
  },
  {
    id: "finance",
    name: "金融地产",
    icon: BarChart3,
    flow: -21.43,
    change: -0.64,
    color: "#f26b6b",
    policy: "风险化解 / 高质量发展",
    narrative: "负向分支同样要保留，它说明资金从哪些方向撤出，避免只看热闹分支。",
    keywords: ["银行", "保险", "地产链", "非银金融"],
    factors: [52, 41, 55, 49, 44],
    lanes: [
      { name: "银行", flow: -12.11, score: 48, pressure: 36, stocks: ["区域银行", "大行", "金融科技"] },
      { name: "非银金融", flow: -6.23, score: 46, pressure: 32, stocks: ["券商", "保险", "资管"] },
      { name: "房地产", flow: -3.09, score: 42, pressure: 29, stocks: ["物业", "建材", "开发商"] }
    ],
    candidates: [
      { code: "SAMPLE-51", name: "区域银行", role: "防守观察", inflow: -1.62, score: 49, fit: 52, catalyst: "息差企稳", risk: "资产质量", reason: "资金仍在流出，暂放观察，不进入主推池。" },
      { code: "SAMPLE-52", name: "物业服务", role: "修复观察", inflow: -0.64, score: 43, fit: 48, catalyst: "现金流改善", risk: "地产拖累", reason: "需要看到现金流和分红改善后再回到树干。" },
      { code: "SAMPLE-53", name: "资管平台", role: "弹性备选", inflow: -0.51, score: 47, fit: 50, catalyst: "市场回暖", risk: "成交低迷", reason: "属于市场情绪分支，证据权重低于产业链分支。" }
    ]
  }
];

const factorNames = ["确定需求", "供给约束", "低关注度", "价值兑现", "催化剂"];
const pages = [
  { id: "dashboard", label: "工作台", icon: Home },
  { id: "tree", label: "资金流树", icon: GitBranch },
  { id: "branch", label: "分支显微镜", icon: Layers },
  { id: "stocks", label: "个股实验室", icon: Target },
  { id: "heatmap", label: "资金热力图", icon: LineChart },
  { id: "tracking", label: "景气跟踪", icon: Eye },
  { id: "library", label: "十五五报告库", icon: FileText }
];

const iconMap = {
  ai: Cpu,
  manufacturing: Factory,
  green: Leaf,
  security: Shield,
  consumption: FlaskConical,
  finance: BarChart3
};

const AUTO_REFRESH_LABEL = "交易日 09:35 / 10:30 / 11:30 / 14:00 / 15:10";

function buildDisplayBranches(data) {
  const rawBranches = data?.branches?.length ? data.branches : fallbackBranches;
  return rawBranches.map((branch) => ({
    ...branch,
    icon: branch.icon || iconMap[branch.iconKey] || GitBranch,
    lanes: branch.lanes || [],
    candidates: branch.candidates || []
  }));
}

function formatFlow(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}亿`;
}

function formatSignedPercent(value) {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatAmount(value) {
  const numeric = Number(value) || 0;
  return numeric.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDataStatus(meta) {
  if (meta?.refreshStatus === "failed_using_cached_data") {
    return {
      label: "使用上次可用数据",
      detail: "刚才刷新失败，已保留上次可用数据。",
      cached: true
    };
  }
  if (meta?.servedFrom === "flowtree-global-cache") {
    return {
      label: "官网统一数据",
      detail: "所有访问者读取同一份官网缓存。",
      cached: false
    };
  }
  if (meta?.sourceProvider?.includes("akshare")) {
    return {
      label: "AKShare 已启用",
      detail: "AKShare 板块资金流已接入。",
      cached: false
    };
  }
  if (meta?.sourceProvider?.includes("live")) {
    return {
      label: "实时行情已启用",
      detail: "页面正在直接拉取公开行情。",
      cached: false
    };
  }
  return {
    label: "东方财富兜底模式",
    detail: "当前使用东方财富公开行情。",
    cached: false
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function runtimeDataUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${base.endsWith("/") ? "" : "/"}market-data.json`;
}

function marketDataApiUrl(path, params = {}) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("t", String(Date.now()));
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function isValidMarketData(data) {
  return Boolean(data?.meta && Array.isArray(data?.branches) && data.branches.length);
}

function parseMarketTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return 0;
  const [, year, month, day, hour, minute] = match;
  const parsed = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function marketDataFreshness(data) {
  const generatedAt = Date.parse(data?.meta?.generatedAt || "");
  const marketTime = parseMarketTime(data?.meta?.marketTime);
  return Math.max(Number.isFinite(generatedAt) ? generatedAt : 0, marketTime);
}

function isMarketDataNotOlder(nextData, currentData) {
  return marketDataFreshness(nextData) >= marketDataFreshness(currentData);
}

function isLocalDevHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

async function readMarketDataResponse(response, label) {
  if (!response.ok) throw new Error(`${label}返回 ${response.status}`);
  const payload = await response.json();
  const data = isValidMarketData(payload) ? payload : payload?.data;
  if (!isValidMarketData(data)) throw new Error(`${label}格式不完整`);
  return data;
}

async function fetchGlobalMarketData({ refresh = false, reason = "" } = {}) {
  const response = await fetch(marketDataApiUrl(refresh ? "/api/market-data/refresh" : "/api/market-data", { reason }), {
    method: refresh ? "POST" : "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });
  return readMarketDataResponse(response, refresh ? "官网刷新接口" : "官网数据接口");
}

async function fetchDeployedMarketData() {
  const response = await fetch(`${runtimeDataUrl()}?t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache"
    }
  });
  return readMarketDataResponse(response, "部署数据");
}

function showBrowserNotification(title, body) {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
    return true;
  }
  return false;
}

function useRuntimeMarketData() {
  const [data, setData] = useState(bundledMarketData);
  const dataRef = useRef(bundledMarketData);
  const loadingRef = useRef(false);
  const [refreshState, setRefreshState] = useState({
    status: "idle",
    progress: 0,
    message: "等待刷新",
    detail: AUTO_REFRESH_LABEL
  });

  const applyMarketData = useCallback((nextData) => {
    if (!isValidMarketData(nextData)) return false;
    if (!isMarketDataNotOlder(nextData, dataRef.current)) return false;
    dataRef.current = nextData;
    setData(nextData);
    return true;
  }, []);

  const refreshMarketData = useCallback(async (options = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const previousGeneratedAt = dataRef.current?.meta?.generatedAt || "";
    const reason = options?.reason || "manual";
    let finalState = null;
    try {
      setRefreshState({
        status: "loading",
        progress: 12,
        message: reason === "schedule" ? "正在自动更新" : "正在刷新官网数据",
        detail: "连接官网统一数据服务"
      });

      const nextData = await fetchGlobalMarketData({ refresh: true, reason });
      const applied = applyMarketData(nextData);
      const nextGeneratedAt = nextData?.meta?.generatedAt || "";
      const unchanged = previousGeneratedAt && previousGeneratedAt === nextGeneratedAt;
      const failedWithCache = nextData?.meta?.refreshStatus === "failed_using_cached_data";
      finalState = {
        status: failedWithCache ? "error" : "success",
        progress: 100,
        message: failedWithCache ? "刷新失败，已保留官网数据" : unchanged || !applied ? "当前已经是最新数据" : "刷新完成",
        detail: `数据时间：${(applied ? nextData : dataRef.current).meta?.marketTime || "待确认"}`
      };
      if (reason === "schedule" && !failedWithCache) {
        showBrowserNotification("TranFu量化已自动更新", `数据时间：${nextData.meta.marketTime || "待确认"}`);
      }
    } catch (error) {
      let appliedFallback = false;
      try {
        if (isLocalDevHost()) {
          const localData = await fetchLiveMarketData(dataRef.current, (nextState) => {
            setRefreshState({
              status: "loading",
              ...nextState
            });
          });
          appliedFallback = applyMarketData(localData);
        }
      } catch {
        // Local direct refresh is only a development fallback.
      }
      if (!appliedFallback) {
        try {
          setRefreshState({
            status: "loading",
            progress: 88,
            message: "刷新失败，校验兜底数据",
            detail: "旧数据不会覆盖当前较新数据"
          });
          const deployedData = await fetchDeployedMarketData();
          appliedFallback = applyMarketData(deployedData);
        } catch {
          appliedFallback = false;
        }
      }
      finalState = {
        status: "error",
        progress: 100,
        message: appliedFallback ? "刷新失败，已保留可用数据" : "刷新失败，已保留当前数据",
        detail: appliedFallback ? `数据时间：${dataRef.current.meta?.marketTime || "待确认"}` : error?.message || "请稍后重试"
      };
    } finally {
      loadingRef.current = false;
      if (finalState) setRefreshState(finalState);
    }
  }, [applyMarketData]);

  useEffect(() => {
    let cancelled = false;
    async function loadGlobalData() {
      try {
        setRefreshState({
          status: "loading",
          progress: 18,
          message: "正在读取官网数据",
          detail: "读取所有人共用的最新缓存"
        });
        const globalData = await fetchGlobalMarketData();
        if (cancelled) return;
        applyMarketData(globalData);
        setRefreshState({
          status: "success",
          progress: 100,
          message: "已读取官网数据",
          detail: `数据时间：${globalData.meta?.marketTime || "待确认"}`
        });
      } catch {
        if (cancelled) return;
        setRefreshState({
          status: "idle",
          progress: 0,
          message: "等待刷新",
          detail: AUTO_REFRESH_LABEL
        });
      }
    }
    loadGlobalData();
    return () => {
      cancelled = true;
    };
  }, [applyMarketData]);

  return { marketData: data, refreshState, refreshMarketData };
}

function App() {
  const { marketData, refreshState, refreshMarketData } = useRuntimeMarketData();
  const branches = useMemo(() => buildDisplayBranches(marketData), [marketData]);
  const [page, setPage] = useState("tree");
  const [activeBranchId, setActiveBranchId] = useState(branches[0]?.id || "ai");
  const [activeLane, setActiveLane] = useState("");
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [query, setQuery] = useState("");
  const [actionNotice, setActionNotice] = useState(null);
  const actionNoticeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(actionNoticeTimer.current), []);

  const storedActiveBranch = branches.find((branch) => branch.id === activeBranchId) || branches[0];
  const queryText = query.trim().toLowerCase();
  const filteredBranches = branches.filter((branch) => {
    const text = `${branch.name} ${branch.policy} ${branch.keywords.join(" ")} ${branch.lanes.map((lane) => lane.name).join(" ")} ${branch.candidates.map((stock) => `${stock.code} ${stock.name} ${stock.industry || ""}`).join(" ")}`;
    return text.toLowerCase().includes(queryText);
  });
  const activeBranch = queryText && filteredBranches.length && !filteredBranches.some((branch) => branch.id === storedActiveBranch.id)
    ? filteredBranches[0]
    : storedActiveBranch;
  const visibleBranches = queryText ? filteredBranches : branches;
  const selectedLane = activeBranch.lanes.find((lane) => lane.name === activeLane) || activeBranch.lanes[0];
  const activeStock = activeBranch.candidates[activeCandidate] || activeBranch.candidates[0] || {
    code: "--",
    name: "暂无候选",
    role: "等待刷新",
    inflow: 0,
    score: 0,
    fit: 0,
    catalyst: "等待真实数据",
    risk: "无数据",
    reason: "当前分支暂无可展示的真实候选。",
    industry: "--"
  };

  function selectBranch(branchId) {
    const next = branches.find((branch) => branch.id === branchId);
    if (!next) return;
    setActiveBranchId(branchId);
    setActiveLane(next.lanes[0]?.name || "");
    setActiveCandidate(0);
  }

  function showActionNotice(message, detail) {
    setActionNotice({ message, detail });
    window.clearTimeout(actionNoticeTimer.current);
    actionNoticeTimer.current = window.setTimeout(() => setActionNotice(null), 4200);
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} meta={marketData.meta} />
      <main className="workspace">
        <Topbar
          query={query}
          setQuery={setQuery}
          marketData={marketData}
          refreshState={refreshState}
          onRefresh={refreshMarketData}
          onNotice={showActionNotice}
        />
        <MarketStrip indexes={marketData.indexes || []} branches={branches} meta={marketData.meta} topSectors={marketData.topSectors || []} />
        <RefreshFeedback state={refreshState} />
        {actionNotice && <ActionNotice notice={actionNotice} />}
        <div className="page-tabs">
          {pages.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
        {page === "dashboard" && (
          <DashboardPage branches={branches} activeBranch={activeBranch} onSelectBranch={selectBranch} setPage={setPage} indexes={marketData.indexes || []} topSectors={marketData.topSectors || []} meta={marketData.meta} />
        )}
        {page === "tree" && (
          <TreePage
            branches={visibleBranches.length ? visibleBranches : branches}
            activeBranch={activeBranch}
            selectedLane={selectedLane}
            onSelectBranch={selectBranch}
            onSelectLane={setActiveLane}
          />
        )}
        {page === "branch" && (
          <BranchPage
            branches={branches}
            activeBranch={activeBranch}
            selectedLane={selectedLane}
            onSelectBranch={selectBranch}
            onSelectLane={setActiveLane}
          />
        )}
        {page === "stocks" && (
          <StocksPage
            activeBranch={activeBranch}
            activeStock={activeStock}
            activeCandidate={activeCandidate}
            setActiveCandidate={setActiveCandidate}
          />
        )}
        {page === "heatmap" && (
          <HeatmapPage branches={branches} activeBranch={activeBranch} onSelectBranch={selectBranch} />
        )}
        {page === "tracking" && (
          <TrackingPage branches={branches} activeBranch={activeBranch} onSelectBranch={selectBranch} setPage={setPage} />
        )}
        {page === "library" && (
          <PolicyLibraryPage branches={branches} activeBranch={activeBranch} onSelectBranch={selectBranch} setPage={setPage} />
        )}
      </main>
    </div>
  );
}

function Sidebar({ page, setPage, meta }) {
  const dataStatus = getDataStatus(meta);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <img src="/icon-192x192-20260608.png" alt="" />
        </div>
        <div>
          <strong>TranFu量化</strong>
          <span>FlowTree</span>
        </div>
      </div>
      <nav className="side-nav">
        {pages.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="method-card">
        <span>Serenity 过滤器</span>
        <strong>需求 · 供给 · 关注度 · 兑现 · 催化</strong>
        <p>真实资金流驱动候选池；页面仅作研究参考，不构成投资建议。</p>
        <small className={dataStatus.cached ? "status-warning" : ""}>{dataStatus.label}</small>
        <small>更新：{meta?.marketTime || "待刷新"}</small>
        <small>自动：{AUTO_REFRESH_LABEL}</small>
      </div>
      <div className="side-foot">
        <button>
          <Bookmark size={16} />
          我的观察池
        </button>
      </div>
    </aside>
  );
}

function Topbar({ query, setQuery, marketData, refreshState, onRefresh, onNotice }) {
  const meta = marketData.meta || {};
  const dataStatus = getDataStatus(meta);
  const loading = refreshState.status === "loading";
  const [menuOpen, setMenuOpen] = useState(false);

  function downloadSnapshot() {
    const content = JSON.stringify(marketData, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = (meta.marketTime || new Date().toISOString()).replace(/[^\d]/g, "").slice(0, 12) || "snapshot";
    link.href = url;
    link.download = `flowtree-snapshot-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotice?.("已下载研究快照", `数据时间：${meta.marketTime || "待确认"}`);
  }

  async function enableReminder() {
    if (!("Notification" in window)) {
      onNotice?.("当前浏览器不支持提醒", "可以继续使用页面内自动更新提示。");
      return;
    }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") {
      showBrowserNotification("TranFu量化提醒已开启", `自动更新时间：${AUTO_REFRESH_LABEL}`);
      onNotice?.("提醒已开启", AUTO_REFRESH_LABEL);
    } else {
      onNotice?.("提醒未开启", "浏览器没有授权通知权限。");
    }
  }

  function showResearchMode(label) {
    setMenuOpen(false);
    onNotice?.(label, `当前数据时间：${meta.marketTime || "待确认"}`);
  }

  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">真实数据版 · {meta?.dataDate || "待刷新"} · {dataStatus.label}</span>
        <h1>从十五五叙事到个股候选</h1>
      </div>
      <label className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索政策 / 行业 / 赛道 / 个股" />
      </label>
      <div className="top-actions">
        <button className={loading ? "refresh-button loading" : "refresh-button"} onClick={onRefresh} disabled={loading} title="刷新最新数据">
          <RefreshCw size={18} />
          <span>{loading ? `${refreshState.progress}%` : "刷新"}</span>
        </button>
        <button onClick={downloadSnapshot} title="下载当前研究快照">
          <Download size={18} />
        </button>
        <button onClick={enableReminder} title="开启自动更新提醒">
          <Bell size={18} />
        </button>
        <div className="user-menu-wrap">
          <button className="user-chip" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
            研究员
            <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="user-menu">
              <button onClick={() => showResearchMode("研究员模式已就绪")}>研究员模式</button>
              <button onClick={() => showResearchMode(dataStatus.label)}>数据源状态</button>
              <button onClick={() => showResearchMode("自动更新计划")}>刷新计划</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ActionNotice({ notice }) {
  return (
    <section className="action-notice">
      <strong>{notice.message}</strong>
      <span>{notice.detail}</span>
    </section>
  );
}

function RefreshFeedback({ state }) {
  if (state.status === "idle") return null;
  return (
    <section className={`refresh-feedback ${state.status}`}>
      <div>
        <strong>{state.message}</strong>
        <span>{state.detail}</span>
      </div>
      <div className="refresh-progress">
        <i style={{ width: `${state.progress}%` }} />
      </div>
    </section>
  );
}

function DashboardPage({ branches, activeBranch, onSelectBranch, setPage, indexes, topSectors, meta }) {
  const sortedBranches = branches.slice().sort((a, b) => b.flow - a.flow);
  const strongestBranch = sortedBranches[0] || activeBranch;
  const weakestBranch = sortedBranches[sortedBranches.length - 1] || activeBranch;
  const candidateMap = new Map();
  for (const branch of branches) {
    for (const stock of branch.candidates) {
      const existing = candidateMap.get(stock.code);
      if (!existing || Math.abs(stock.inflow) > Math.abs(existing.inflow)) {
        candidateMap.set(stock.code, { ...stock, branchName: branch.name, branchId: branch.id });
      }
    }
  }
  const topCandidates = [...candidateMap.values()].sort((a, b) => b.inflow - a.inflow).slice(0, 6);
  const totalFlow = branches.reduce((sum, branch) => sum + branch.flow, 0);

  return (
    <section className="dashboard-layout light-surface">
      <main className="dashboard-main">
        <div className="panel-head">
          <div>
            <span className="eyebrow">工作台</span>
            <h2>今日政策资金总览</h2>
          </div>
          <div className="toolbar">
            <button onClick={() => setPage("tree")}>
              <GitBranch size={16} />
              看资金树
            </button>
            <button onClick={() => setPage("heatmap")}>
              <LineChart size={16} />
              看热力图
            </button>
          </div>
        </div>
        <div className="dashboard-summary">
          <Metric label="政策主线净流入" value={formatFlow(totalFlow)} good={totalFlow >= 0} />
          <Metric label="最强主枝" value={strongestBranch.name} />
          <Metric label="最强净流入" value={formatFlow(strongestBranch.flow)} good={strongestBranch.flow >= 0} />
          <Metric label="风险观察" value={weakestBranch.name} good={weakestBranch.flow >= 0} />
        </div>
        <section className="flow-panel">
          <div className="panel-head slim">
            <h3>六条主枝资金排名</h3>
            <span>{meta?.marketTime || "待刷新"}</span>
          </div>
          <div className="branch-flow-list">
            {sortedBranches.map((branch) => {
              const width = clamp(Math.abs(branch.flow) / Math.max(Math.abs(strongestBranch.flow), 1) * 100, 8, 100);
              return (
                <button key={branch.id} className={activeBranch.id === branch.id ? "flow-row active" : "flow-row"} onClick={() => onSelectBranch(branch.id)}>
                  <span>{branch.name}</span>
                  <div className="flow-bar">
                    <i className={branch.flow < 0 ? "negative" : ""} style={{ width: `${width}%` }} />
                  </div>
                  <strong className={branch.flow < 0 ? "down" : ""}>{formatFlow(branch.flow)}</strong>
                  <em className={branch.change < 0 ? "down" : ""}>{formatSignedPercent(branch.change)}</em>
                </button>
              );
            })}
          </div>
        </section>
        <section className="dashboard-grid">
          <div className="flow-panel">
            <div className="panel-head slim">
              <h3>最强板块</h3>
              <span>公开资金流</span>
            </div>
            <div className="sector-list">
              {topSectors.slice(0, 8).map((sector, index) => (
                <div className="sector-row" key={`${sector.code}-${sector.name}`}>
                  <span>{index + 1}</span>
                  <strong>{sector.name}</strong>
                  <em className={sector.flow < 0 ? "down" : ""}>{formatFlow(sector.flow)}</em>
                  <small>{formatSignedPercent(sector.change)}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="flow-panel">
            <div className="panel-head slim">
              <h3>候选股快照</h3>
              <span>按资金流入排序</span>
            </div>
            <div className="candidate-snapshot">
              {topCandidates.map((stock) => (
                <button key={`${stock.branchId}-${stock.code}`} onClick={() => {
                  onSelectBranch(stock.branchId);
                  setPage("stocks");
                }}>
                  <strong>{stock.name}</strong>
                  <span>{stock.branchName}</span>
                  <em className={stock.inflow < 0 ? "down" : ""}>{formatFlow(stock.inflow)}</em>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
      <aside className="dashboard-side">
        <div className="flow-panel">
          <div className="panel-head slim">
            <h3>指数状态</h3>
            <span>今日</span>
          </div>
          <div className="index-stack">
            {indexes.map((item) => (
              <div className="index-card" key={item.code}>
                <span>{item.name}</span>
                <strong>{formatAmount(item.price)}</strong>
                <em className={item.change < 0 ? "down" : ""}>{formatSignedPercent(item.change)}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="flow-panel decision-card">
          <div className="panel-head slim">
            <h3>今日判断</h3>
            <Gauge size={16} />
          </div>
          <p>资金主要沿「{strongestBranch.name}」和「{sortedBranches[1]?.name || strongestBranch.name}」流动，先看资金是否连续，再进入个股实验室。</p>
          <button className="text-button" onClick={() => setPage("branch")}>进入分支显微镜</button>
        </div>
      </aside>
    </section>
  );
}

function MarketStrip({ indexes, branches, meta, topSectors }) {
  const dataStatus = getDataStatus(meta);
  const netFlow = branches.reduce((sum, branch) => sum + branch.flow, 0);
  const topSector = topSectors[0];
  const metrics = [
    ...indexes.slice(0, 3).map((item) => ({
      name: item.name,
      value: formatAmount(item.price),
      change: formatSignedPercent(item.change),
      down: item.change < 0
    })),
    {
      name: "政策主线净流入",
      value: formatFlow(netFlow),
      change: topSector ? `最强：${topSector.name}` : "等待刷新",
      down: netFlow < 0
    }
  ];
  return (
    <section className="market-strip">
      {metrics.map((metric) => (
        <div key={metric.name} className="market-item">
          <span>{metric.name}</span>
          <strong className={metric.down ? "down" : ""}>{metric.value}</strong>
          <em className={metric.down ? "down" : ""}>{metric.change}</em>
        </div>
      ))}
      <div className="update-time">
        数据源：{meta?.source || "待刷新"} · 更新时间 {meta?.marketTime || "待刷新"}
        {dataStatus.cached && <span className="cache-badge">{dataStatus.detail}</span>}
      </div>
    </section>
  );
}

function TreePage({ branches, activeBranch, selectedLane, onSelectBranch, onSelectLane }) {
  const totalFlow = branches.reduce((sum, branch) => sum + branch.flow, 0);
  return (
    <section className="tree-layout">
      <PolicyLadder branches={branches} activeBranch={activeBranch} onSelectBranch={onSelectBranch} />
      <div className="tree-canvas-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">今日资金流向</span>
            <h2>政策树干里的资金分叉</h2>
          </div>
          <div className="segmented">
            <button>主题</button>
            <button>行业</button>
            <button className="active">三级行业</button>
            <button>个股</button>
          </div>
        </div>
        <FlowTree branches={branches} activeBranch={activeBranch} totalFlow={totalFlow} onSelectBranch={onSelectBranch} onSelectLane={onSelectLane} />
        <BranchRank branches={branches} activeBranch={activeBranch} onSelectBranch={onSelectBranch} />
      </div>
      <BranchDetail activeBranch={activeBranch} selectedLane={selectedLane} onSelectLane={onSelectLane} />
    </section>
  );
}

function PolicyLadder({ branches, activeBranch, onSelectBranch }) {
  const ladder = [
    { title: "十五五规划", body: "现代化产业体系 / 科技自立自强 / 数字中国 / 绿色转型 / 安全底线" },
    { title: "中观维度", body: "资金方向、产业景气、供给瓶颈、政策催化、市场关注度" },
    { title: "行业层面", body: "AI+、先进制造、绿色低碳、安全底线、内需消费" },
    { title: "细分赛道", body: activeBranch.keywords.join(" / ") }
  ];
  return (
    <aside className="policy-ladder">
      <div className="panel-head slim">
        <h3>政策脉络</h3>
        <span>树干</span>
      </div>
      {ladder.map((item, index) => (
        <div className="ladder-step" key={item.title}>
          <div className="step-index">{index + 1}</div>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </div>
      ))}
      <div className="policy-switcher">
        <span>当前主枝</span>
        <div className="branch-pills">
          {branches.map((branch) => {
            const Icon = branch.icon;
            return (
              <button key={branch.id} className={activeBranch.id === branch.id ? "active" : ""} onClick={() => onSelectBranch(branch.id)}>
                <Icon size={14} />
                {branch.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="policy-source">
        <span>政策依据</span>
        {(activeBranch.policySources || []).map((source) => (
          <strong key={source}>{source}</strong>
        ))}
      </div>
    </aside>
  );
}

function FlowTree({ branches, activeBranch, totalFlow, onSelectBranch, onSelectLane }) {
  const firstColumnX = 420;
  const secondColumnX = 760;
  const branchStartY = 310;
  const branchGap = 78;
  return (
    <div className="flow-tree">
      <svg viewBox="0 0 1080 640" role="img" aria-label="资金流树">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="trunkGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#effff6" />
            <stop offset="48%" stopColor="#66e7ac" />
            <stop offset="100%" stopColor="#f26b6b" />
          </linearGradient>
        </defs>
        <text x="120" y="285" className="tree-label-main">主线资金</text>
        <text x="122" y="325" className={totalFlow < 0 ? "tree-label-flow down" : "tree-label-flow"}>{formatFlow(totalFlow)}</text>
        <circle cx="210" cy="306" r="6" className="source-dot" />
        {branches.map((branch, index) => {
          const y = branchStartY + (index - 2.5) * branchGap;
          const active = branch.id === activeBranch.id;
          const stroke = branch.flow < 0 ? "#f26b6b" : branch.color;
          const width = clamp(Math.abs(branch.flow) / 18, 2.5, 12);
          return (
            <g key={branch.id} className={active ? "active-branch" : ""} onClick={() => onSelectBranch(branch.id)}>
              <path
                d={`M 210 306 C 285 306, 310 ${y}, ${firstColumnX} ${y}`}
                stroke={stroke}
                strokeWidth={width}
                className="energy-line"
                filter={active ? "url(#glow)" : undefined}
              />
              <circle cx={firstColumnX} cy={y} r={active ? 24 : 18} fill="rgba(10,18,24,.95)" stroke={stroke} strokeWidth="2.2" />
              <text x={firstColumnX + 38} y={y - 5} className="branch-name">{branch.name}</text>
              <text x={firstColumnX + 38} y={y + 22} className={branch.flow < 0 ? "branch-flow down" : "branch-flow"}>{formatFlow(branch.flow)}</text>
              {branch.lanes.slice(0, 4).map((lane, laneIndex) => {
                const laneY = y + (laneIndex - 1.5) * 27;
                const laneStroke = lane.flow < 0 ? "#f26b6b" : stroke;
                return (
                  <g key={lane.name} className="lane-group" onClick={(event) => {
                    event.stopPropagation();
                    onSelectBranch(branch.id);
                    onSelectLane(lane.name);
                  }}>
                    <path
                      d={`M ${firstColumnX + 25} ${y} C ${firstColumnX + 110} ${y}, ${secondColumnX - 130} ${laneY}, ${secondColumnX - 18} ${laneY}`}
                      stroke={laneStroke}
                      strokeWidth={clamp(Math.abs(lane.flow) / 9, 1.2, 5)}
                      className="lane-line"
                    />
                    <circle cx={secondColumnX - 16} cy={laneY} r="5" fill={laneStroke} />
                    <text x={secondColumnX + 6} y={laneY + 5} className="lane-name">{lane.name}</text>
                    <text x={secondColumnX + 150} y={laneY + 5} className={lane.flow < 0 ? "lane-flow down" : "lane-flow"}>{formatFlow(lane.flow)}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="tree-footnote">
        <span>资金净流入强度</span>
        <div className="flow-scale" />
        <span>-50亿</span>
        <span>0</span>
        <span>+50亿</span>
      </div>
    </div>
  );
}

function BranchRank({ branches, activeBranch, onSelectBranch }) {
  return (
    <div className="rank-strip">
      {branches.map((branch, index) => (
        <button key={branch.id} className={activeBranch.id === branch.id ? "rank-card active" : "rank-card"} onClick={() => onSelectBranch(branch.id)}>
          <span>{index + 1}</span>
          <strong>{branch.name}</strong>
          <em className={branch.flow < 0 ? "down" : ""}>{formatFlow(branch.flow)}</em>
          <small className={branch.change < 0 ? "down" : ""}>{branch.change > 0 ? "+" : ""}{branch.change.toFixed(2)}%</small>
          <Sparkline down={branch.flow < 0} />
        </button>
      ))}
    </div>
  );
}

function Sparkline({ down }) {
  const points = down ? "0,14 20,12 40,15 60,18 80,19 100,22" : "0,22 20,18 40,19 60,14 80,12 100,8";
  return (
    <svg className="sparkline" viewBox="0 0 100 28" aria-hidden="true">
      <polyline points={points} fill="none" stroke={down ? "#f26b6b" : "#57e1a2"} strokeWidth="2" />
    </svg>
  );
}

function BranchDetail({ activeBranch, selectedLane, onSelectLane }) {
  const score = Math.round(activeBranch.factors.reduce((sum, item) => sum + item, 0) / activeBranch.factors.length);
  return (
    <aside className="branch-detail">
      <div className="branch-title-row">
        <div>
          <span className="eyebrow">当前分支</span>
          <h2>{activeBranch.name}</h2>
        </div>
        <button className="follow-button">
          <Star size={15} />
          已关注
        </button>
      </div>
      <div className="detail-metrics">
        <Metric label="今日净流入" value={formatFlow(activeBranch.flow)} good={activeBranch.flow > 0} />
        <Metric label="分支均涨跌" value={formatSignedPercent(activeBranch.change)} good={activeBranch.change > 0} />
        <Metric label="综合分" value={`${score}/100`} />
      </div>
      <div className="selected-lane-card">
        <span>选中赛道</span>
        <strong>{selectedLane.name}</strong>
        <div>
          <em>{formatFlow(selectedLane.flow || 0)}</em>
          <em>{formatSignedPercent(selectedLane.change || 0)}</em>
          <em>主力占比 {formatAmount(selectedLane.mainRatio || 0)}%</em>
        </div>
      </div>
      <p className="detail-narrative">{activeBranch.narrative}</p>
      <section className="factor-box">
        <div className="panel-head slim">
          <h3>Serenity 五因子</h3>
          <span>{score}/100</span>
        </div>
        {factorNames.map((name, index) => (
          <FactorRow key={name} label={name} value={activeBranch.factors[index]} />
        ))}
      </section>
      <section className="lane-list">
        <div className="panel-head slim">
          <h3>下一层分叉</h3>
          <span>{activeBranch.lanes.length} 条</span>
        </div>
        {activeBranch.lanes.map((lane) => (
          <button key={lane.name} className={selectedLane.name === lane.name ? "lane-row active" : "lane-row"} onClick={() => onSelectLane(lane.name)}>
            <span>{lane.name}</span>
            <strong className={lane.flow < 0 ? "down" : ""}>{formatFlow(lane.flow)}</strong>
            <em>{lane.score}</em>
          </button>
        ))}
      </section>
      <section className="stock-mini-list">
        <div className="panel-head slim">
          <h3>相关个股候选</h3>
          <span>真实资金流</span>
        </div>
        {activeBranch.candidates.slice(0, 6).map((stock, index) => (
          <div className="stock-mini" key={`${activeBranch.id}-${stock.code}-${index}`}>
            <span>{stock.code}</span>
            <strong>{stock.name}</strong>
            <em className={stock.inflow < 0 ? "down" : ""}>{formatFlow(stock.inflow)}</em>
          </div>
        ))}
      </section>
    </aside>
  );
}

function Metric({ label, value, good }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={good === false ? "down" : ""}>{value}</strong>
    </div>
  );
}

function FactorRow({ label, value }) {
  const tone = value >= 80 ? "强" : value >= 65 ? "中强" : value >= 50 ? "中" : "弱";
  return (
    <div className="factor-row">
      <span>{label}</span>
      <div className="bar-track">
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{tone}</strong>
    </div>
  );
}

function BranchPage({ branches, activeBranch, selectedLane, onSelectBranch, onSelectLane }) {
  const columns = useMemo(() => {
    const branchFlow = Math.abs(activeBranch.flow || 0);
    const laneFlow = Math.abs(selectedLane.flow || 0);
    const laneCandidates = activeBranch.candidates.filter((stock) => stock.lane === selectedLane.name).slice(0, 3);
    return [
      [
        { label: "政策贴合", value: activeBranch.policyFit || 0 },
        { label: "主枝净流入", value: round(branchFlow, 1) },
        { label: "分支均涨跌", value: round(Math.abs(activeBranch.change || 0), 1) }
      ],
      [
        { label: selectedLane.name, value: round(laneFlow, 1) },
        { label: "主力占比", value: round(Math.abs(selectedLane.mainRatio || 0), 1) },
        { label: "上涨家数", value: selectedLane.upCount || 0 }
      ],
      [
        ...(laneCandidates.length ? laneCandidates : activeBranch.candidates.slice(0, 3)).map((stock) => ({
          label: stock.name,
          value: round(Math.abs(stock.inflow || 0), 1)
        }))
      ],
      [
        { label: "瓶颈压力", value: selectedLane.pressure || 0 },
        { label: "Serenity", value: selectedLane.score || 0 },
        { label: "下跌家数", value: selectedLane.downCount || 0 }
      ]
    ];
  }, [activeBranch, selectedLane]);

  return (
    <section className="branch-layout light-surface">
      <aside className="path-rail">
        <div className="panel-head slim">
          <h3>当前路径</h3>
          <span>第 5 层</span>
        </div>
        {["十五五规划", "新质生产力", activeBranch.name, activeBranch.policy.split(" / ")[0], selectedLane.name].map((item, index) => (
          <div className="path-step" key={`${item}-${index}`}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
        <div className="path-note">
          <strong>本层定义</strong>
          <p>{selectedLane.name} 是资金、订单、产能、瓶颈压力同时聚集的赛道分叉。</p>
        </div>
        <div className="branch-pills vertical">
          {branches.map((branch) => (
            <button key={branch.id} className={activeBranch.id === branch.id ? "active" : ""} onClick={() => onSelectBranch(branch.id)}>
              {branch.name}
            </button>
          ))}
        </div>
      </aside>
      <main className="microscope-main">
        <div className="panel-head">
          <div>
            <span className="eyebrow">分支显微镜</span>
            <h2>{selectedLane.name}：资金、订单与瓶颈压力</h2>
          </div>
          <div className="segmented light">
            <button className="active">资金流</button>
            <button>成分股</button>
            <button>主力占比</button>
            <button>瓶颈压力</button>
          </div>
        </div>
        <Sankey columns={columns} />
        <section className="subtrack-table">
          <div className="panel-head slim">
            <h3>下一层分叉</h3>
            <button className="text-button">查看更多子赛道</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>子赛道</th>
                <th>资金流入</th>
                <th>涨跌幅</th>
                <th>主力占比</th>
                <th>上涨/下跌</th>
                <th>瓶颈压力</th>
                <th>Serenity</th>
                <th>尽调问题</th>
              </tr>
            </thead>
            <tbody>
              {activeBranch.lanes.map((lane) => (
                <tr key={lane.name} className={selectedLane.name === lane.name ? "selected" : ""} onClick={() => onSelectLane(lane.name)}>
                  <td>{lane.name}</td>
                  <td className={lane.flow < 0 ? "down" : "up"}>{formatFlow(lane.flow)}</td>
                  <td className={lane.change < 0 ? "down" : "up"}>{formatSignedPercent(lane.change)}</td>
                  <td>{formatAmount(lane.mainRatio || 0)}%</td>
                  <td>{lane.upCount || 0}/{lane.downCount || 0}</td>
                  <td>{lane.pressure}</td>
                  <td>{lane.score}/100</td>
                  <td>资金是否连续？强势股是否只是短炒？政策证据是否可验证？</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
      <aside className="serenity-panel">
        <div className="panel-head slim">
          <h3>五因子评分</h3>
          <span>{Math.round(activeBranch.factors.reduce((a, b) => a + b, 0) / 5)}/100</span>
        </div>
        {factorNames.map((factor, index) => (
          <div className="evidence-card" key={factor}>
            <div className="evidence-head">
              <strong>{factor}</strong>
              <span>{activeBranch.factors[index]}/100</span>
            </div>
            <p>{getEvidenceCopy(factor, selectedLane, activeBranch)}</p>
            <div className="evidence-tags">
              <span>关键证据</span>
              <span>置信度 {index === 0 ? "高" : index < 3 ? "中" : "跟踪"}</span>
            </div>
          </div>
        ))}
      </aside>
    </section>
  );
}

function getEvidenceCopy(factor, lane, branch) {
  const laneName = lane.name;
  const copies = {
    确定需求: `${laneName} 今日净流入 ${formatFlow(lane.flow || 0)}，同时挂在「${branch.policy}」政策主线下，先进入需求验证。`,
    供给约束: `主力占比 ${formatAmount(lane.mainRatio || 0)}%，若资金集中在少数瓶颈环节，需要继续看订单和交付。`,
    低关注度: `涨跌幅 ${formatSignedPercent(lane.change || 0)}，上涨/下跌家数 ${lane.upCount || 0}/${lane.downCount || 0}，用于判断是否已经拥挤。`,
    价值兑现: "只保留能把资金流转成收入、毛利、现金流或份额提升的公司。",
    催化剂: "后续重点跟踪财报、招标、新品、政策细则、客户验证和产能投放。"
  };
  return copies[factor];
}

function Sankey({ columns }) {
  return (
    <div className="sankey">
      <svg className="sankey-lines" viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2].map((colIndex) =>
          columns[colIndex].flatMap((source, sourceIndex) =>
            columns[colIndex + 1].map((target, targetIndex) => {
              const x1 = 92 + colIndex * 265;
              const x2 = 190 + colIndex * 265;
              const y1 = 70 + sourceIndex * 82;
              const y2 = 70 + targetIndex * 82;
              const width = clamp((source.value + target.value) / 600, 2, 16);
              return (
                <path
                  key={`${colIndex}-${source.label}-${target.label}`}
                  d={`M ${x1} ${y1} C ${x1 + 78} ${y1}, ${x2 - 78} ${y2}, ${x2} ${y2}`}
                  stroke={colIndex === 2 ? "rgba(242,107,107,.32)" : "rgba(42,184,161,.28)"}
                  strokeWidth={width}
                  fill="none"
                />
              );
            })
          )
        )}
      </svg>
      <div className="sankey-columns">
        {columns.map((column, columnIndex) => (
          <div className="sankey-column" key={columnIndex}>
            {column.map((node) => (
              <div className="sankey-node" key={node.label}>
                <span>{node.label}</span>
                <strong>{node.value}</strong>
                <em>{columnIndex === 3 ? "压力指数" : "亿元"}</em>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StocksPage({ activeBranch, activeStock, activeCandidate, setActiveCandidate }) {
  return (
    <section className="stocks-layout light-surface">
      <main className="candidate-board">
        <div className="panel-head">
          <div>
            <span className="eyebrow">个股实验室</span>
            <h2>{activeBranch.name} 候选池</h2>
          </div>
          <div className="toolbar">
            <button>
              <SlidersHorizontal size={16} />
              筛选
            </button>
            <button>
              <Download size={16} />
              导出
            </button>
          </div>
        </div>
        <table className="candidate-table">
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>分支角色</th>
              <th>现价</th>
              <th>涨跌幅</th>
              <th>资金流入</th>
              <th>主力占比</th>
              <th>Serenity</th>
              <th>政策贴合</th>
              <th>催化剂</th>
              <th>风险标记</th>
              <th>存在理由</th>
            </tr>
          </thead>
          <tbody>
            {activeBranch.candidates.map((stock, index) => (
              <tr key={`${activeBranch.id}-${stock.code}-${index}`} className={activeCandidate === index ? "selected" : ""} onClick={() => setActiveCandidate(index)}>
                <td>{stock.code}</td>
                <td><strong>{stock.name}</strong></td>
                <td>{stock.role}</td>
                <td>{formatAmount(stock.price || 0)}</td>
                <td className={(stock.change || 0) < 0 ? "down" : "up"}>{formatSignedPercent(stock.change || 0)}</td>
                <td className={stock.inflow < 0 ? "down" : "up"}>{formatFlow(stock.inflow)}</td>
                <td>{formatAmount(stock.mainRatio || 0)}%</td>
                <td>{stock.score}/100</td>
                <td>{stock.fit}%</td>
                <td>{stock.catalyst}</td>
                <td><span className="risk-chip">{stock.risk}</span></td>
                <td>{stock.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="research-note">
          本页使用公开行情与资金流数据生成候选池，只用于展示研究流程，不构成任何投资建议。
        </div>
      </main>
      <aside className="stock-dossier">
        <div className="dossier-title">
          <div>
            <span className="eyebrow">当前候选</span>
            <h2>{activeStock.name}</h2>
          </div>
          <span className="score-badge">{activeStock.score}</span>
        </div>
        <Radar values={[activeStock.score, activeStock.fit, clamp(activeStock.score - 7, 45, 90), clamp(activeStock.fit - 12, 40, 88), clamp(activeStock.score + 4, 50, 95)]} />
        <div className="dossier-grid">
          <Metric label="资金流入" value={formatFlow(activeStock.inflow)} good={activeStock.inflow > 0} />
          <Metric label="涨跌幅" value={formatSignedPercent(activeStock.change || 0)} good={(activeStock.change || 0) > 0} />
          <Metric label="主力占比" value={`${formatAmount(activeStock.mainRatio || 0)}%`} />
          <Metric label="所属行业" value={activeStock.industry || activeStock.role} />
          <Metric label="政策贴合" value={`${activeStock.fit}%`} />
          <Metric label="风险标记" value={activeStock.risk} good={false} />
        </div>
        <section className="timeline">
          <div className="panel-head slim">
            <h3>催化剂时间线</h3>
            <span>未来 30 天</span>
          </div>
          {["业绩预告", activeStock.catalyst, "客户验证", "政策细则"].map((item, index) => (
            <div className="timeline-item" key={`${item}-${index}`}>
              <span>06-{String(8 + index * 5).padStart(2, "0")}</span>
              <strong>{item}</strong>
              <em>{index < 2 ? "高" : "中"}</em>
            </div>
          ))}
        </section>
        <section className="red-team">
          <div className="panel-head slim">
            <h3>反方问题</h3>
            <AlertTriangle size={16} />
          </div>
          <ol>
            <li>资金流入是不是短期交易拥挤？</li>
            <li>瓶颈会不会被新增供给快速抹平？</li>
            <li>利润兑现是否已经被估值提前反映？</li>
          </ol>
        </section>
      </aside>
    </section>
  );
}

function HeatmapPage({ branches, activeBranch, onSelectBranch }) {
  const lanes = branches.flatMap((branch) =>
    branch.lanes.map((lane) => ({
      ...lane,
      branchName: branch.name,
      branchId: branch.id,
      branchColor: branch.color
    }))
  );
  const maxFlow = Math.max(...lanes.map((lane) => Math.abs(lane.flow || 0)), 1);
  const activeLanes = activeBranch.lanes || [];

  return (
    <section className="heatmap-layout light-surface">
      <main className="heatmap-main">
        <div className="panel-head">
          <div>
            <span className="eyebrow">资金热力图</span>
            <h2>资金往哪些分支聚集</h2>
          </div>
          <div className="branch-pills light">
            {branches.map((branch) => (
              <button key={branch.id} className={activeBranch.id === branch.id ? "active" : ""} onClick={() => onSelectBranch(branch.id)}>
                {branch.name}
              </button>
            ))}
          </div>
        </div>
        <div className="heat-grid">
          {lanes
            .slice()
            .sort((a, b) => Math.abs(b.flow) - Math.abs(a.flow))
            .map((lane) => {
              const heat = clamp(Math.abs(lane.flow) / maxFlow, 0.12, 1);
              const positive = lane.flow >= 0;
              return (
                <button
                  key={`${lane.branchId}-${lane.code || lane.name}`}
                  className={activeBranch.id === lane.branchId ? "heat-tile active" : "heat-tile"}
                  style={{
                    "--heat": heat,
                    "--tile-color": positive ? lane.branchColor : "#e86060",
                    gridColumn: `span ${lane.flow > 30 ? 2 : 1}`,
                    gridRow: `span ${lane.flow > 45 ? 2 : 1}`
                  }}
                  onClick={() => onSelectBranch(lane.branchId)}
                >
                  <span>{lane.branchName}</span>
                  <strong>{lane.name}</strong>
                  <em className={positive ? "" : "down"}>{formatFlow(lane.flow)}</em>
                  <small>{formatSignedPercent(lane.change || 0)} · 主力占比 {formatAmount(lane.mainRatio || 0)}%</small>
                </button>
              );
            })}
        </div>
      </main>
      <aside className="heatmap-side">
        <div className="flow-panel">
          <div className="panel-head slim">
            <h3>{activeBranch.name} 热点分支</h3>
            <span>{activeLanes.length} 条</span>
          </div>
          <div className="heat-rank">
            {activeLanes.map((lane, index) => (
              <div className="heat-rank-row" key={lane.name}>
                <span>{index + 1}</span>
                <strong>{lane.name}</strong>
                <em className={lane.flow < 0 ? "down" : ""}>{formatFlow(lane.flow)}</em>
                <small>{lane.score}/100</small>
              </div>
            ))}
          </div>
        </div>
        <div className="flow-panel decision-card">
          <div className="panel-head slim">
            <h3>读图方法</h3>
            <Activity size={16} />
          </div>
          <p>色块越大，代表资金净流入越强；红色表示资金流出。先看资金是否集中，再回到分支显微镜确认上涨家数和主力占比。</p>
        </div>
      </aside>
    </section>
  );
}

function TrackingPage({ branches, activeBranch, onSelectBranch, setPage }) {
  const rows = branches
    .flatMap((branch) =>
      branch.lanes.map((lane) => ({
        ...lane,
        branchName: branch.name,
        branchId: branch.id,
        branchPolicy: branch.policy,
        trackingScore: Math.round(clamp((lane.score || 0) * 0.52 + (lane.pressure || 0) * 0.22 + Math.max(lane.change || 0, 0) * 4 + Math.max(lane.mainRatio || 0, 0) * 2, 20, 98))
      }))
    )
    .sort((a, b) => b.trackingScore - a.trackingScore);
  const topRows = rows.slice(0, 12);
  const activeRows = rows.filter((row) => row.branchId === activeBranch.id).slice(0, 6);

  return (
    <section className="tracking-layout light-surface">
      <main className="tracking-main">
        <div className="panel-head">
          <div>
            <span className="eyebrow">景气跟踪</span>
            <h2>资金、涨跌和瓶颈压力的跟踪清单</h2>
          </div>
          <button className="text-button" onClick={() => setPage("stocks")}>进入个股实验室</button>
        </div>
        <div className="tracking-table">
          <table>
            <thead>
              <tr>
                <th>赛道</th>
                <th>所属主枝</th>
                <th>跟踪分</th>
                <th>资金流入</th>
                <th>涨跌幅</th>
                <th>主力占比</th>
                <th>观察动作</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((lane) => (
                <tr key={`${lane.branchId}-${lane.name}`} className={activeBranch.id === lane.branchId ? "selected" : ""} onClick={() => onSelectBranch(lane.branchId)}>
                  <td><strong>{lane.name}</strong></td>
                  <td>{lane.branchName}</td>
                  <td>{lane.trackingScore}/100</td>
                  <td className={lane.flow < 0 ? "down" : "up"}>{formatFlow(lane.flow)}</td>
                  <td className={(lane.change || 0) < 0 ? "down" : "up"}>{formatSignedPercent(lane.change || 0)}</td>
                  <td>{formatAmount(lane.mainRatio || 0)}%</td>
                  <td>{getTrackingAction(lane)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <aside className="tracking-side">
        <div className="flow-panel">
          <div className="panel-head slim">
            <h3>{activeBranch.name} 跟踪重点</h3>
            <span>{activeBranch.policy}</span>
          </div>
          <div className="watch-list">
            {activeRows.map((lane) => (
              <button key={lane.name} onClick={() => setPage("branch")}>
                <span>{lane.name}</span>
                <strong>{lane.trackingScore}</strong>
                <em className={lane.flow < 0 ? "down" : ""}>{formatFlow(lane.flow)}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="flow-panel decision-card">
          <div className="panel-head slim">
            <h3>预警规则</h3>
            <AlertTriangle size={16} />
          </div>
          <p>资金流入强但涨幅过高，先标记为拥挤；资金流入强且涨幅温和，进入重点跟踪；资金转负则退回观察。</p>
        </div>
      </aside>
    </section>
  );
}

function getTrackingAction(lane) {
  if ((lane.flow || 0) > 20 && (lane.change || 0) < 3) return "重点跟踪连续性";
  if ((lane.change || 0) > 5) return "警惕短线拥挤";
  if ((lane.flow || 0) < 0) return "退回观察池";
  return "等待二次确认";
}

function PolicyLibraryPage({ branches, activeBranch, onSelectBranch, setPage }) {
  return (
    <section className="library-layout light-surface">
      <main className="library-main">
        <div className="panel-head">
          <div>
            <span className="eyebrow">十五五报告库</span>
            <h2>政策叙事到赛道证据链</h2>
          </div>
          <button className="text-button" onClick={() => setPage("tree")}>回到资金流树</button>
        </div>
        <div className="policy-card-grid">
          {branches.map((branch) => (
            <button key={branch.id} className={activeBranch.id === branch.id ? "policy-card active" : "policy-card"} onClick={() => onSelectBranch(branch.id)}>
              <span>{branch.policy}</span>
              <strong>{branch.name}</strong>
              <p>{branch.narrative}</p>
              <em className={branch.flow < 0 ? "down" : ""}>{formatFlow(branch.flow)}</em>
            </button>
          ))}
        </div>
        <section className="evidence-chain">
          <div className="panel-head slim">
            <h3>{activeBranch.name} 证据链</h3>
            <span>政策 → 行业 → 赛道 → 个股</span>
          </div>
          {(activeBranch.policySources || []).map((source) => (
            <div className="chain-row" key={source}>
              <span>政策依据</span>
              <strong>{source}</strong>
              <p>{activeBranch.policy}</p>
            </div>
          ))}
          <div className="chain-row">
            <span>细分赛道</span>
            <strong>{activeBranch.lanes.slice(0, 4).map((lane) => lane.name).join(" / ")}</strong>
            <p>按真实资金流、主力占比、上涨下跌家数和 Serenity 五因子继续拆分。</p>
          </div>
          <div className="chain-row">
            <span>候选观察</span>
            <strong>{activeBranch.candidates.slice(0, 5).map((stock) => stock.name).join(" / ")}</strong>
            <p>候选只代表研究流程里的观察对象，不构成任何投资建议。</p>
          </div>
        </section>
      </main>
      <aside className="library-side">
        <div className="flow-panel">
          <div className="panel-head slim">
            <h3>当前主枝</h3>
            <span>{activeBranch.policyFit}/100</span>
          </div>
          <div className="library-branch-card">
            <strong>{activeBranch.name}</strong>
            <p>{activeBranch.narrative}</p>
            <div className="evidence-tags">
              {activeBranch.keywords.map((keyword) => (
                <span key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flow-panel decision-card">
          <div className="panel-head slim">
            <h3>下一步</h3>
            <Sparkles size={16} />
          </div>
          <p>先从报告库确认政策路径，再去资金流树看钱往哪走，最后进入个股实验室看候选股证据是否足够。</p>
        </div>
      </aside>
    </section>
  );
}

function Radar({ values }) {
  const center = 116;
  const radius = 84;
  const points = values.map((value, index) => {
    const angle = (-90 + index * 72) * (Math.PI / 180);
    const r = (value / 100) * radius;
    return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
  }).join(" ");
  const grid = [0.35, 0.7, 1].map((scale) => {
    return factorNames.map((_, index) => {
      const angle = (-90 + index * 72) * (Math.PI / 180);
      const r = scale * radius;
      return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
    }).join(" ");
  });
  return (
    <svg className="radar" viewBox="0 0 232 232" role="img" aria-label="候选评分雷达图">
      {grid.map((poly) => (
        <polygon key={poly} points={poly} fill="none" stroke="rgba(37,60,67,.16)" />
      ))}
      {factorNames.map((name, index) => {
        const angle = (-90 + index * 72) * (Math.PI / 180);
        return (
          <text key={name} x={center + Math.cos(angle) * 104} y={center + Math.sin(angle) * 104} textAnchor="middle" className="radar-label">
            {name}
          </text>
        );
      })}
      <polygon points={points} fill="rgba(42,184,161,.18)" stroke="#229b8d" strokeWidth="3" />
      {points.split(" ").map((point) => {
        const [x, y] = point.split(",");
        return <circle key={point} cx={x} cy={y} r="4" fill="#229b8d" />;
      })}
    </svg>
  );
}

export default App;
