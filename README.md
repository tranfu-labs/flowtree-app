# TranFu量化 / FlowTree

TranFu量化（FlowTree）是一个从宏观政策叙事、行业主线、细分赛道一路拆到个股候选的资金流可视化产品。

当前版本把「十五五」政策主线做成资金流树，结合 Serenity 五因子方法，展示资金正在流向哪些分支、哪些赛道需要跟踪、哪些个股进入观察池。

线上域名规划：

```text
https://flowtree-app.tranfu.com/
```

## 数据来源

- AKShare：板块资金流数据
- 东方财富公开行情：指数、板块代码、上涨下跌家数、成分股和个股行情
- 页面内候选股只用于展示研究流程，不构成任何投资建议

数据文件位于：

```text
src/data/market-data.json
public/market-data.json
```

正式环境还会维护一份服务器全局缓存：

```text
/app/data/market-data.json
```

页面打开时优先读取 `/api/market-data`，所有访问者看到同一份官网数据。

## 本地运行

安装依赖：

```bash
npm ci
```

启动开发环境：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173/
```

## 刷新真实数据

首次使用前安装 Python 数据依赖：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

刷新数据：

```bash
npm run data:refresh
```

说明：

- 如果 AKShare 或东方财富接口临时不可用，脚本会保留上一次可用数据，避免页面部署后无法打开。
- `src/data/market-data.json` 用于构建时内置数据，`public/market-data.json` 用于服务器缓存的初始数据。
- 正式环境刷新成功后会写入服务器全局缓存，不需要每个用户的浏览器各自保存一份数据。

## 自动刷新

正式环境由服务器在交易日关键时点自动刷新官网全局缓存；右上角「刷新」按钮也会请求服务器刷新这份全局缓存。页面不会用旧数据覆盖当前较新的数据。

北京时间刷新点：

```text
09:35
10:30
11:30
14:00
15:10
```

说明：

- 自动刷新由正式服务执行；只要容器正在运行，所有用户都会读取同一份最新缓存。
- 普通用户打开页面只读取服务器已保存的数据；不会因为进入页面而主动触发刷新。
- 当前按周一到周五执行；如果遇到 A 股休市日，页面会尽量保留已有可用数据。
- 页面右上角的「刷新」按钮不会触发 GitHub 写入；它会刷新官网服务器上的统一数据，并显示连接、校验、更新进度。
- 如果上游接口临时不可用，服务器会继续返回上一次可用数据，不会把页面时间退回更早的数据；如果数据仍落后于最近一个刷新点，会每 5 分钟补刷一次直到成功。
- 服务重启或重新部署时，会比较服务器持久缓存和代码包内置数据，自动采用较新的那一份。
- 正式服务端刷新使用东方财富 HTTP 公共接口；生产诊断接口会同时检查 HTTP 和 HTTPS 连通性。

## 构建

```bash
npm run build
```

构建产物在：

```text
dist/
```

本地预览：

```bash
npm run preview
```

模拟正式服务：

```bash
FLOWTREE_PORT=4173 npm run serve
```

访问：

```text
http://127.0.0.1:4173/
```

## 部署到 flowtree-app.tranfu.com

当前正式部署由 TranFu 技术侧监听 `main` 分支新代码并自动发布。

推荐部署流程：

1. 本地完成修改并运行 `npm run build`。
2. 推送代码到 `main` 分支。
3. 等技术侧自动部署完成。
4. 访问：

```text
https://flowtree-app.tranfu.com/
```

仓库内的 GitHub workflow 只保留手动备用触发，不再随 `main` 分支 push 自动部署。

正式容器启动后会运行：

```bash
node server/flowtree-server.mjs
```

它负责三件事：

- 提供前端页面。
- 提供 `/api/market-data` 全局数据。
- 在交易日 `09:35 / 10:30 / 11:30 / 14:00 / 15:10` 自动刷新并保存全局缓存。

## 发布版本

发布新版本时建议同时创建 Git Tag 和 GitHub Release。

示例：

```bash
git tag v0.1.0
git push origin main
git push origin v0.1.0
gh release create v0.1.0 --repo tranfu-labs/flowtree-app --title "FlowTree v0.1.0" --notes "Initial release of TranFu量化 / FlowTree."
```

核验 Release：

```bash
gh release list --repo tranfu-labs/flowtree-app
gh release view v0.1.0 --repo tranfu-labs/flowtree-app
```

## 常用命令

```bash
npm run data:refresh
npm run build
npm run preview
```
