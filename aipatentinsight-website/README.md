# AIPatentInsight Website

公司專利圖譜視覺化網站。

## 目錄結構

```
aipatentinsight-website/
├── index.html                     # 首頁(原 hero.html — 8 條洋流動畫 + 尺規時間軸)
├── insights.html                  # Insights 頁(719 家公司 3D 點雲圖譜)
├── styles.css                     # 全域樣式
├── logo-primary-dark.svg          # 深底主 Logo(網頁用)
├── logo-primary.svg               # 淺底主 Logo
├── logo-icon.svg                  # Icon 版 Logo
├── logo-mono-white.svg            # 純白單色 Logo
├── favicon.png                    # Favicon (64x64)
├── favicon-16.png ~ 512.png       # 各尺寸 favicon
├── og-image.png                   # 社群分享圖 (1200×630)
├── og-image.svg                   # 社群分享圖原始向量檔
└── data/
    └── insights-2025-02-15.json   # Insights 頁資料(719 公司 / 3550 專利,3.4 MB)
```

## 部署方式

### 方式 1: 任何靜態主機(推薦)
直接把整個資料夾上傳到:
- Vercel / Netlify / Cloudflare Pages(免費,拖檔即部署)
- GitHub Pages
- AWS S3 + CloudFront
- 自己的 Nginx / Apache 主機

**注意**:必須是 HTTP/HTTPS server,**不能直接雙擊 `index.html` 開啟**(因為 insights.html 用 fetch 載入 JSON,瀏覽器禁止 file:// 協議的跨域 fetch)。

### 方式 2: 本地預覽
```bash
cd aipatentinsight-website
python3 -m http.server 8000
# 然後開 http://localhost:8000
```

### 方式 3: 雙擊預覽(只有 index.html 可雙擊)
- `index.html`(首頁洋流動畫)— 可以直接雙擊開啟,因為它沒用 fetch
- `insights.html` — 一定要用 server 起,因為要 fetch 資料

## 技術棧

- **純 HTML / CSS / JavaScript**(無 build step,無 framework)
- **Three.js r170**(via CDN: jsdelivr / unpkg / esm.sh 三層 fallback)
- **ES Modules + Importmap**(原生瀏覽器支援,需 modern browser:Chrome 89+ / Safari 16.4+ / Firefox 108+)

## 字型

- **Futura**(系統內建,fallback: Jost / Avenir Next / Century Gothic)
- **JetBrains Mono**(等寬字)
- 中文字採用系統預設字型

## 兩個主要頁面說明

### `index.html`(首頁)

8 條彩色洋流並行流動 + 海洋雜訊背景。
- 中央標題:「產業演化趨勢」(Futura 字型)
- 下方尺規時間軸:2023.01 → 2025.12 共 36 個月
- 每 3 個月切換一次主導趨勢
- 主角洋流明亮飽和、其他洋流降到 30% 強度
- 可點擊尺規任意位置跳轉時間

### `insights.html`(公司專利圖譜)

把 `data/insights-2025-02-15.json` 中的 719 家公司視覺化為 3D 點雲。

**核心元件:**
- **頂部導覽列**: Logo + 三頁籤(Insights / Topics / Trends)+ Launch CTA
- **左下 Legend**: 17 個技術分類配色清單,點選聚焦
- **右下統計**: Companies / Patents / Period 三欄
- **頂部控制列**: Time Range 下拉選單 / Mode(Cumulative/Monthly)/ Branch / Layout(Grid/Force)
- **右側公司清單**: 可搜尋、可排序(by Patents / Name / Category)
- **右側詳情面板**(點擊公司後滑出): 公司概況 + 所有專利清單

**互動:**
- 拖曳:平移視角
- 滾輪:縮放
- 點擊點 / 點擊清單公司:聚焦該公司、其他點變暗、與同類鄰近 6 家畫連線、開啟詳情面板
- 點擊詳情面板中的專利號:開啟第二層卡片顯示專利完整摘要
- ESC:關閉面板

## 資料結構(insights JSON)

```json
{
  "snapshotDate": "2025-02-15",
  "region": "台灣",
  "months": ["2023-02", "2023-03", ...],         // 20 個有資料的月份
  "categories": ["先進材料與奈米科技", ...],      // 17 個技術分類
  "totalCompanies": 719,
  "totalPatents": 3550,
  "companies": [
    {
      "name": "台灣積體電路製造股份有限公司",
      "totalPatents": 406,
      "mainCategory": "半導體製程技術",
      "categoryDist": { ... },
      "industry": "半導體業",
      "stockCode": "2330",
      "isPublic": true,
      "monthsActive": ["2023-02", "2023-03", ...],
      "patentIds": ["TWI861234B", ...]
    },
    ...
  ],
  "patents": [
    {
      "id": "TWI861234B",
      "company": "...",
      "date": "2023-04-15",
      "month": "2023-04",
      "title": "...",
      "abstract": "...",
      "category": "半導體製程技術",
      "pr": 95,
      "branch": "main",
      "industry": "半導體業",
      "stockCode": "2330",
      "isPublic": true
    },
    ...
  ]
}
```

## 替換成新資料

如果要換新的時間點快照:

1. 把新 CSV 用同樣 schema 處理為 JSON,命名如 `data/insights-2025-XX-XX.json`
2. 修改 `insights.html` 內的 fetch URL:
   ```js
   const res = await fetch('data/insights-2025-XX-XX.json');
   ```
3. 或者改成支援多個快照的下拉選單(目前 `Time Range` 是同一份資料內的時間篩選,不是切換不同 snapshot)

## 待補功能

- **Topics 頁**: 新聞題材熱度圖譜(暫缺 — 需新聞 API)
- **Trends 頁**: main / branch / decline 三狀態的趨勢分支圖(暫缺)
- **多 snapshot 切換**: 之後有多份不同時間的 xlsx 時加入

## 瀏覽器需求

- Chrome 89+
- Safari 16.4+
- Firefox 108+
- Edge 89+

需要支援:
- ES Modules + Import Maps
- WebGL(3D 渲染)
- backdrop-filter(毛玻璃效果)

## 已知限制

- Force layout 僅在公司數 ≤ 800 時啟用(N² simulation,效能考量)
- Insights 頁初次載入需要 3.4 MB JSON,首次顯示約 1~2 秒
- 行動版 UI 已做 RWD,但 3D 圖譜在小螢幕上互動較吃力,建議用平板以上裝置
