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
- 刷新成功后，重新构建即可把新数据带入静态页面。
- `src/data/market-data.json` 用于构建时内置数据，`public/market-data.json` 用于页面手动刷新时拉取最新已部署数据。

## 自动刷新

GitHub Actions 会在交易日自动刷新数据并推送到 `main`，随后触发 GitHub Pages 重新部署。

北京时间刷新点：

```text
09:35
10:30
11:30
14:00
15:10
```

对应工作流：

```text
.github/workflows/refresh-market-data.yml
```

工作流逻辑：

1. 安装 Node 和 Python 数据依赖。
2. 执行 `npm run data:refresh`。
3. 构建验证。
4. 如果数据有变化，提交 `src/data/market-data.json` 和 `public/market-data.json`。
5. 推送到 `main` 后自动触发 GitHub Pages 部署。

说明：

- GitHub 的定时任务使用 UTC，本仓库已经换算成北京时间。
- 当前按周一到周五执行；如果遇到 A 股休市日，脚本会尽量保留已有可用数据。
- 页面右上角的「刷新」按钮不会直接调用 AKShare，也不会触发 GitHub 写入；它只拉取最新已部署的 `public/market-data.json`，并显示连接、下载、校验、更新进度。

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

## 部署到 flowtree-app.tranfu.com

本仓库已经包含 GitHub Pages 部署所需文件：

```text
.github/workflows/deploy-pages.yml
public/CNAME
```

推荐部署流程：

1. 在 GitHub 创建仓库 `tranfu-labs/flowtree-app`。
2. 推送代码到 `main` 分支。
3. 进入 GitHub 仓库的 `Settings -> Pages`。
4. Source 选择 `GitHub Actions`。
5. 确认工作流 `Deploy FlowTree` 正常运行。
6. 在域名 DNS 中添加 CNAME：

```text
flowtree-app.tranfu.com  CNAME  tranfu-labs.github.io
```

7. 等 GitHub Pages 和 DNS 生效后，访问：

```text
https://flowtree-app.tranfu.com/
```

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
