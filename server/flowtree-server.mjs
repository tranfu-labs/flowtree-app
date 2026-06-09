import { spawn } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import { lookup } from "node:dns/promises";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import http from "node:http";
import https from "node:https";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

setDefaultResultOrder("ipv4first");

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const distDir = resolve(process.env.FLOWTREE_DIST_DIR || join(appRoot, "dist"));
const bundledDataPath = resolve(appRoot, "public", "market-data.json");
const runtimeDataPath = resolve(process.env.FLOWTREE_MARKET_DATA_PATH || join(appRoot, "data", "market-data.json"));
const refreshScriptPath = resolve(appRoot, "scripts", "fetch-market-data.mjs");
const port = Number(process.env.FLOWTREE_PORT || 80);
const scheduledRefreshMinutes = [575, 630, 690, 840, 910];
const scheduledRetryIntervalMs = Number(process.env.FLOWTREE_SCHEDULE_RETRY_INTERVAL_MS || 5 * 60 * 1000);
const scheduleTickIntervalMs = Number(process.env.FLOWTREE_SCHEDULE_TICK_INTERVAL_MS || 30000);
const eastmoneyHosts = (process.env.EASTMONEY_HOSTS || "push2.eastmoney.com,push2delay.eastmoney.com,80.push2.eastmoney.com,81.push2.eastmoney.com,82.push2.eastmoney.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const scheduledAttempts = new Map();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

let marketData = await loadInitialMarketData();
let refreshPromise = null;

function toJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function isValidMarketData(data) {
  return Boolean(data?.meta && Array.isArray(data?.branches) && data.branches.length);
}

function parseShanghaiTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})[/-](\d{2})[/-](\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return 0;
  const [, year, month, day, hour, minute] = match;
  const parsed = Date.parse(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dataFreshness(data) {
  const generatedAt = Date.parse(data?.meta?.generatedAt || "");
  const marketTime = parseShanghaiTime(data?.meta?.marketTime);
  return Math.max(Number.isFinite(generatedAt) ? generatedAt : 0, marketTime);
}

export function isMarketDataNotOlder(nextData, currentData) {
  return dataFreshness(nextData) >= dataFreshness(currentData);
}

function withServerMeta(data, patch = {}) {
  return {
    ...data,
    meta: {
      ...data.meta,
      servedFrom: "flowtree-global-cache",
      ...patch
    }
  };
}

async function loadInitialMarketData() {
  const bundledData = await readJson(bundledDataPath);
  if (!isValidMarketData(bundledData)) {
    throw new Error("Bundled market data is invalid.");
  }

  try {
    const runtimeData = await readJson(runtimeDataPath);
    if (!isValidMarketData(runtimeData)) {
      throw new Error("Runtime market data is invalid.");
    }
    if (isMarketDataNotOlder(bundledData, runtimeData)) {
      await persistMarketData(bundledData);
      return withServerMeta(bundledData);
    }
    return withServerMeta(runtimeData);
  } catch {
    await persistMarketData(bundledData);
    return withServerMeta(bundledData);
  }
}

async function persistMarketData(data) {
  await mkdir(dirname(runtimeDataPath), { recursive: true });
  await writeFile(runtimeDataPath, toJson(data), "utf8");
}

function sendJson(response, data, statusCode = 200) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(toJson(data));
}

function sendText(response, text, statusCode = 500) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

function trimLines(text, maxLines = 12) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-maxLines)
    .join("\n");
}

function describeFetchError(error, url) {
  const parsed = new URL(url);
  const cause = error?.cause;
  const details = {
    name: error?.name || "Error",
    message: error?.message || String(error),
    host: parsed.host,
    path: parsed.pathname
  };
  if (cause?.code) details.causeCode = cause.code;
  if (cause?.message) details.causeMessage = cause.message;
  if (cause?.address) details.address = cause.address;
  if (cause?.port) details.port = cause.port;
  if (cause?.syscall) details.syscall = cause.syscall;
  return details;
}

function requestUpstreamText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? http : https;
    const request = client.request(parsed, {
      method: "GET",
      timeout: 12000,
      headers: {
        Connection: "close",
        Referer: "https://data.eastmoney.com/",
        "User-Agent": "Mozilla/5.0"
      }
    }, (upstreamResponse) => {
      const chunks = [];
      upstreamResponse.on("data", (chunk) => chunks.push(chunk));
      upstreamResponse.on("end", () => {
        resolve({
          status: upstreamResponse.statusCode || 0,
          contentType: upstreamResponse.headers["content-type"] || "",
          text: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
    request.end();
  });
}

function runRefreshScript() {
  return new Promise((resolveScript, rejectScript) => {
    const child = spawn(process.execPath, [refreshScriptPath], {
      cwd: appRoot,
      env: {
        ...process.env,
        DISABLE_AKSHARE: "1",
        SKIP_CACHE_FAILURE_WRITE: "1"
      }
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 40000) stdout = stdout.slice(-40000);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 40000) stderr = stderr.slice(-40000);
    });
    child.on("error", rejectScript);
    child.on("close", (code) => {
      const output = `${stdout}\n${stderr}`.trim();
      if (code !== 0) {
        rejectScript(new Error(output || `Refresh script exited with code ${code}`));
        return;
      }
      if (/Refresh failed:|Kept cached data/i.test(output)) {
        rejectScript(new Error(trimLines(output) || "Refresh script kept cached data."));
        return;
      }
      resolveScript(output);
    });
  });
}

async function refreshGlobalMarketData(reason = "manual") {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshGlobalMarketDataOnce(reason).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function refreshGlobalMarketDataOnce(reason) {
  const attemptedAt = new Date().toISOString();
  try {
    await runRefreshScript();
    const nextData = await readJson(bundledDataPath);
    if (!isValidMarketData(nextData)) {
      throw new Error("Refresh produced invalid market data.");
    }
    if (!isMarketDataNotOlder(nextData, marketData)) {
      marketData = withServerMeta(marketData, {
        refreshStatus: "kept_newer_cache",
        refreshAttemptedAt: attemptedAt,
        refreshReason: reason,
        lastServerRefreshAt: new Date().toISOString()
      });
      await persistMarketData(marketData);
      return marketData;
    }
    marketData = withServerMeta(nextData, {
      refreshStatus: "success",
      refreshReason: reason,
      lastServerRefreshAt: new Date().toISOString()
    });
    await persistMarketData(marketData);
    return marketData;
  } catch (error) {
    marketData = withServerMeta(marketData, {
      refreshStatus: "failed_using_cached_data",
      refreshAttemptedAt: attemptedAt,
      refreshReason: reason,
      refreshError: error?.message || String(error),
      lastServerRefreshAt: new Date().toISOString()
    });
    await persistMarketData(marketData);
    return marketData;
  }
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

function latestScheduledMinute(currentMinute) {
  return scheduledRefreshMinutes.filter((minute) => currentMinute >= minute).pop() || 0;
}

function marketMinute(meta) {
  const marketMinuteMatch = String(meta?.marketTime || "").match(/\s+(\d{2}):(\d{2})/);
  if (!marketMinuteMatch) return 0;
  return Number(marketMinuteMatch[1]) * 60 + Number(marketMinuteMatch[2]);
}

function isMarketDataBehindSchedule(meta, now = new Date()) {
  const current = shanghaiParts(now);
  if (!isTradingWeekday(current.weekday)) return false;
  if (meta?.dataDate !== current.date) return true;
  const expectedMinute = latestScheduledMinute(current.minutes);
  if (!expectedMinute) return false;
  return marketMinute(meta) < expectedMinute;
}

function pendingScheduledRefreshKey(now = new Date()) {
  const current = shanghaiParts(now);
  if (!isTradingWeekday(current.weekday)) return "";
  const due = latestScheduledMinute(current.minutes);
  return due ? `flowtree-server-refresh-${current.key}-${due}` : "";
}

function shouldRefreshOnStartup(meta, now = new Date()) {
  return isMarketDataBehindSchedule(meta, now);
}

function shouldAttemptScheduledRefresh(now = new Date()) {
  if (!isMarketDataBehindSchedule(marketData.meta, now)) return false;
  const key = pendingScheduledRefreshKey(now);
  if (!key) return true;
  const lastAttemptAt = scheduledAttempts.get(key) || 0;
  if (Date.now() - lastAttemptAt < scheduledRetryIntervalMs) return false;
  scheduledAttempts.set(key, Date.now());
  return true;
}

function startScheduledRefresh() {
  if (shouldRefreshOnStartup(marketData.meta)) {
    setTimeout(() => {
      refreshGlobalMarketData("startup").catch((error) => console.warn(error));
    }, 1500);
  }

  setInterval(() => {
    if (!shouldAttemptScheduledRefresh()) return;
    refreshGlobalMarketData("schedule").catch((error) => console.warn(error));
  }, scheduleTickIntervalMs);
}

async function proxyEastmoney(request, response, url) {
  const upstreamPath = url.pathname.replace(/^\/api\/eastmoney/, "/api");
  const upstream = `http://push2.eastmoney.com${upstreamPath}${url.search}`;
  try {
    const upstreamResponse = await requestUpstreamText(upstream);
    response.writeHead(upstreamResponse.status, {
      "Content-Type": upstreamResponse.contentType || "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(upstreamResponse.text);
  } catch (error) {
    sendJson(response, describeFetchError(error, upstream), 502);
  }
}

async function runMarketDataDiagnostics() {
  const startedAt = new Date().toISOString();
  const listHttpsUrl = "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f62";
  const indexHttpsUrl = "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f12,f13,f14,f2,f3&secids=1.000001";
  const diagnostics = {
    startedAt,
    dnsOrder: "ipv4first",
    dns: null,
    checks: []
  };

  try {
    diagnostics.dns = await lookup("push2.eastmoney.com", { all: true });
  } catch (error) {
    diagnostics.dns = describeFetchError(error, "https://push2.eastmoney.com/");
  }

  for (const [label, target] of [
    ["fetch-sector-list-https", listHttpsUrl],
    ["fetch-index-list-https", indexHttpsUrl]
  ]) {
    const checkStarted = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(target, {
        signal: controller.signal,
        headers: {
          Referer: "https://data.eastmoney.com/",
          "User-Agent": "Mozilla/5.0"
        }
      });
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      diagnostics.checks.push({
        label,
        ok: response.ok,
        status: response.status,
        contentType,
        durationMs: Date.now() - checkStarted,
        sample: text.slice(0, 180)
      });
    } catch (error) {
      diagnostics.checks.push({
        label,
        ok: false,
        durationMs: Date.now() - checkStarted,
        error: describeFetchError(error, target)
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  for (const host of eastmoneyHosts) {
    for (const [kind, path] of [
      ["sector-list", "/api/qt/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:2&fields=f12,f14,f62"],
      ["index-list", "/api/qt/ulist.np/get?fltt=2&invt=2&fields=f12,f13,f14,f2,f3&secids=1.000001"]
    ]) {
      const target = `http://${host}${path}`;
      const checkStarted = Date.now();
      try {
        const result = await requestUpstreamText(target);
        diagnostics.checks.push({
          label: `core-${kind}-${host}`,
          ok: result.status >= 200 && result.status < 300,
          status: result.status,
          contentType: result.contentType,
          durationMs: Date.now() - checkStarted,
          sample: result.text.slice(0, 180)
        });
      } catch (error) {
        diagnostics.checks.push({
          label: `core-${kind}-${host}`,
          ok: false,
          durationMs: Date.now() - checkStarted,
          error: describeFetchError(error, target)
        });
      }
    }
  }

  return diagnostics;
}

async function serveStatic(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method)) {
    sendText(response, "Method not allowed.", 405);
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  let filePath = resolve(distDir, requestPath.replace(/^\/+/, ""));
  if (filePath !== distDir && !filePath.startsWith(`${distDir}/`)) {
    sendText(response, "Forbidden.", 403);
    return;
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStat = await stat(filePath);
    }
  } catch {
    filePath = resolve(distDir, "index.html");
    fileStat = await stat(filePath);
  }

  const ext = extname(filePath);
  const immutable = requestPath.startsWith("/assets/") || /\.(png|jpg|jpeg|gif|ico|svg|webp|woff2?)$/i.test(filePath);
  response.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Content-Length": fileStat.size,
    "Cache-Control": immutable ? "public, max-age=2592000, immutable" : "no-cache"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (url.pathname === "/api/market-data" || url.pathname === "/market-data.json") {
    sendJson(response, marketData);
    return;
  }

  if (url.pathname === "/api/market-data/refresh") {
    if (!["GET", "POST"].includes(request.method)) {
      sendText(response, "Method not allowed.", 405);
      return;
    }
    const nextData = await refreshGlobalMarketData(url.searchParams.get("reason") || "manual");
    sendJson(response, nextData);
    return;
  }

  if (url.pathname === "/api/market-data/diagnostics") {
    if (request.method !== "GET") {
      sendText(response, "Method not allowed.", 405);
      return;
    }
    sendJson(response, await runMarketDataDiagnostics());
    return;
  }

  if (url.pathname.startsWith("/api/eastmoney/")) {
    await proxyEastmoney(request, response, url);
    return;
  }

  await serveStatic(request, response, url);
}

export function createFlowTreeServer() {
  return createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      sendText(response, error?.message || String(error), 500);
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  if (process.env.FLOWTREE_DISABLE_AUTO_REFRESH !== "1") {
    startScheduledRefresh();
  }
  createFlowTreeServer().listen(port, "0.0.0.0", () => {
    console.log(`FlowTree server listening on ${port}`);
    console.log(`Market data time: ${marketData.meta?.marketTime || "unknown"}`);
  });
}
