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
