#!/usr/bin/env node
/**
 * generate-dev-seed.mjs
 *
 * 在實際爬蟲之前產生一份 dev seed news cache,讓前端可以 demo。
 *
 * 為 30 家當紅台股 hand-craft 真實風格的新聞標題(2025/12 ~ 2026/02 區間),
 * 寫進 data/market-signals/news-cache/{stockCode}.json,
 * 之後跑 build-market-signals 就可以產出真前端可讀的 JSON。
 *
 * 之後使用者本機跑真 scrape-news.mjs 時,因為日期 < 24h 之內,會被視為 fresh
 * 而 skip;若要重抓,加 --force。
 *
 * Usage: node scripts/market-signals/generate-dev-seed.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CACHE_DIR = join(ROOT, "data", "market-signals", "news-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

// 依當紅題材手寫的新聞標題範本(對應到 themes-dictionary 的關鍵字)
const SEED = [
  // ======= AI 算力主軸 =======
  {
    code: "2330", name: "台積電",
    titles: [
      ["CoWoS 產能大擴張 台積電 2026 年將翻倍", "yahoo", "2026-01-28"],
      ["NVIDIA 下單 H200/B200,台積電先進製程吃滿", "ltn", "2026-01-22"],
      ["台積電 2 奈米 N2 進入試產 客戶導入加速", "yahoo", "2026-01-15"],
      ["台積電法說會展望:AI 帶動營收年增 25-30%", "yahoo", "2026-01-10"],
      ["3nm 5nm 製程大客戶 NVIDIA AMD 需求強勁", "ltn", "2025-12-22"],
    ],
  },
  {
    code: "2382", name: "廣達",
    titles: [
      ["廣達 AI 伺服器拉貨爆發 GB200 出貨放量", "yahoo", "2026-02-01"],
      ["NVIDIA HGX H200 廣達掌握主要訂單", "ltn", "2026-01-25"],
      ["AI 機櫃 GB200 NVL72 廣達取得大單", "yahoo", "2026-01-12"],
      ["廣達 2025 Q4 營收創高 AI 伺服器佔比攀升", "yahoo", "2026-01-08"],
    ],
  },
  {
    code: "6669", name: "緯穎",
    titles: [
      ["緯穎 AI 伺服器 ODM 訂單能見度直達 2026 H2", "yahoo", "2026-01-30"],
      ["Meta Microsoft 雲端客戶下單 緯穎 AI Server 出貨倍增", "ltn", "2026-01-20"],
      ["緯穎 GB200 NVL72 機櫃量產 毛利率提升", "yahoo", "2026-01-05"],
    ],
  },
  {
    code: "2317", name: "鴻海",
    titles: [
      ["鴻海 AI 伺服器營收成長 100% 上修全年展望", "yahoo", "2026-01-28"],
      ["鴻海擴大電動車與機器人布局 Tesla 訂單續增", "ltn", "2026-01-18"],
      ["人形機器人 Optimus 鴻海掌握關鍵零組件供應", "yahoo", "2026-01-12"],
      ["鴻海集團 2026 三大主軸:AI、EV、半導體", "yahoo", "2025-12-28"],
    ],
  },
  {
    code: "2454", name: "聯發科",
    titles: [
      ["聯發科天璣 9400+ 旗艦 SoC 出貨升溫", "yahoo", "2026-01-26"],
      ["AI 晶片布局 聯發科 NVIDIA 合作客製化 ASIC", "ltn", "2026-01-15"],
      ["5G 數據機晶片 聯發科市佔超越高通", "yahoo", "2026-01-04"],
      ["AI PC SoC 客戶採用聯發科 天璣 AI", "yahoo", "2025-12-20"],
    ],
  },
  {
    code: "3443", name: "創意",
    titles: [
      ["創意 ASIC 設計服務 接連拿下美系大客戶", "yahoo", "2026-01-22"],
      ["AI 晶片代工 創意 2026 年營收看翻倍成長", "ltn", "2026-01-10"],
    ],
  },
  {
    code: "3661", name: "世芯",
    titles: [
      ["世芯-KY ASIC 大廠 AI accelerator 訂單放量", "yahoo", "2026-01-20"],
      ["世芯 5nm/3nm 晶片進入量產 客戶遍及北美", "ltn", "2026-01-12"],
    ],
  },

  // ======= 記憶體 / Flash =======
  {
    code: "2337", name: "旺宏",
    titles: [
      ["旺宏 NOR Flash 出貨增 車用客戶導入加速", "yahoo", "2026-01-15"],
      ["旺宏 3D NAND ROM 開發進度更新", "yahoo", "2025-12-25"],
    ],
  },
  {
    code: "2344", name: "華邦電",
    titles: [
      ["華邦電 DRAM 報價落底回升 Q1 營收看增", "yahoo", "2026-01-23"],
      ["記憶體市場 LPDDR5X 華邦電打入 AI Edge", "ltn", "2026-01-08"],
    ],
  },
  {
    code: "8299", name: "群聯",
    titles: [
      ["群聯 PCIe Gen5 SSD 控制器 主流大廠採用", "yahoo", "2026-01-26"],
      ["AI 伺服器企業級 SSD 需求帶動 群聯出貨成長", "ltn", "2026-01-14"],
    ],
  },

  // ======= 面板 / 顯示器 =======
  {
    code: "2409", name: "友達",
    titles: [
      ["友達 Mini LED 車用面板出貨爆發", "yahoo", "2026-01-19"],
      ["友達 OLED 面板 出貨平板與筆電市場", "ltn", "2025-12-30"],
    ],
  },
  {
    code: "3481", name: "群創",
    titles: [
      ["群創切入車用顯示 取得歐系車廠認證", "yahoo", "2026-01-16"],
      ["TFT-LCD 報價持平 群創 Q4 營運穩健", "ltn", "2026-01-05"],
    ],
  },
  {
    code: "3714", name: "富采",
    titles: [
      ["MicroLED 量產進度 富采與 Apple 合作緊密", "yahoo", "2026-01-29"],
      ["MicroLED 顯示器 富采 2026 H2 量產", "ltn", "2026-01-18"],
    ],
  },
  {
    code: "2393", name: "億光",
    titles: [
      ["MicroLED 億光 車用 LED 訂單成長", "yahoo", "2026-01-11"],
    ],
  },

  // ======= 電源 / 散熱 / 機殼 =======
  {
    code: "2301", name: "光寶科",
    titles: [
      ["AI 伺服器電源 光寶科 PSU 出貨倍數成長", "yahoo", "2026-01-30"],
      ["光寶科 800V 電源系統 AI 機櫃導入", "ltn", "2026-01-20"],
      ["電源管理 PMIC 光寶科取得多家雲端客戶", "yahoo", "2026-01-08"],
    ],
  },
  {
    code: "3017", name: "奇鋐",
    titles: [
      ["奇鋐液冷散熱 GB200 機櫃供應鏈核心", "yahoo", "2026-02-01"],
      ["奇鋐 vapor chamber 出貨 AI 伺服器需求強", "ltn", "2026-01-22"],
      ["散熱供應鏈 奇鋐法說展望樂觀", "yahoo", "2026-01-12"],
    ],
  },
  {
    code: "3324", name: "雙鴻",
    titles: [
      ["雙鴻 AI 伺服器液冷散熱 取得 NVIDIA 認證", "yahoo", "2026-01-28"],
      ["雙鴻 cold plate 出貨北美雲端客戶", "ltn", "2026-01-14"],
    ],
  },

  // ======= 載板 / PCB =======
  {
    code: "3037", name: "欣興",
    titles: [
      ["欣興 ABF 載板 NVIDIA 主力供應商", "yahoo", "2026-01-25"],
      ["欣興 HDI PCB 供應 Apple iPhone 17", "ltn", "2026-01-15"],
      ["ABF 載板 欣興 2026 擴產時程加速", "yahoo", "2025-12-22"],
    ],
  },
  {
    code: "3189", name: "景碩",
    titles: [
      ["景碩 ABF 載板 出貨 AMD AI 處理器", "yahoo", "2026-01-20"],
    ],
  },
  {
    code: "8046", name: "南電",
    titles: [
      ["南電 ABF 載板需求回溫 利用率提升", "yahoo", "2026-01-18"],
    ],
  },

  // ======= 矽光子 / 光通訊 =======
  {
    code: "3450", name: "聯鈞",
    titles: [
      ["矽光子 CPO 模組 聯鈞與 NVIDIA 合作試產", "yahoo", "2026-01-31"],
      ["光通訊 800G 模組 聯鈞放量出貨", "ltn", "2026-01-19"],
    ],
  },
  {
    code: "3163", name: "波若威",
    titles: [
      ["波若威 矽光子被動元件出貨增 客戶遍及北美", "yahoo", "2026-01-17"],
    ],
  },

  // ======= 車用 / EV =======
  {
    code: "1536", name: "和大",
    titles: [
      ["和大 Tesla EV 變速箱訂單續增", "yahoo", "2026-01-22"],
      ["電動車減速齒輪 和大 2026 營收看增", "ltn", "2026-01-08"],
    ],
  },
  {
    code: "2308", name: "台達電",
    titles: [
      ["台達電電動車充電樁出貨北美", "yahoo", "2026-01-26"],
      ["AI 伺服器電源 台達電市佔提升", "ltn", "2026-01-12"],
      ["儲能 ESS 系統 台達電取得歐系大單", "yahoo", "2025-12-28"],
    ],
  },

  // ======= 5G / 通訊 =======
  {
    code: "2412", name: "中華電",
    titles: [
      ["5G 用戶滲透率提升 中華電投資加碼", "yahoo", "2026-01-20"],
      ["低軌衛星合作 中華電與 SpaceX 接洽", "ltn", "2026-01-10"],
    ],
  },
  {
    code: "2492", name: "華新科",
    titles: [
      ["華新科 MLCC 漲價 車用市場帶動", "yahoo", "2026-01-15"],
    ],
  },

  // ======= IC 設計 / 控制 =======
  {
    code: "5274", name: "信驊",
    titles: [
      ["信驊 BMC 晶片 AI 伺服器導入率攀升", "yahoo", "2026-01-30"],
      ["AI Server 開機晶片 信驊掌握獨家供應", "ltn", "2026-01-18"],
    ],
  },
  {
    code: "3515", name: "華擎",
    titles: [
      ["AI Server 主機板 華擎打入 NVIDIA HGX 供應鏈", "yahoo", "2026-01-25"],
    ],
  },

  // ======= 矽智財 / EDA =======
  {
    code: "2454", name: "創意", _alt: true,  // already 3443; 留空
    titles: [],
  },

  // ======= 其他面板 / 觸控 =======
  {
    code: "3406", name: "玉晶光",
    titles: [
      ["玉晶光車用鏡頭出貨 美系電動車訂單", "yahoo", "2026-01-22"],
    ],
  },

  // ======= 製造 / 封裝 =======
  {
    code: "3711", name: "日月光投控",
    titles: [
      ["日月光 CoWoS 封裝產能利用率滿載", "yahoo", "2026-01-28"],
      ["先進封裝 SoIC 日月光 AMD 訂單放量", "ltn", "2026-01-15"],
    ],
  },

  // ======= 雲端 / 軟體 =======
  {
    code: "2376", name: "技嘉",
    titles: [
      ["技嘉 AI 伺服器 NVIDIA HGX H200 出貨增", "yahoo", "2026-01-26"],
    ],
  },
];

let writtenCount = 0;
for (const item of SEED) {
  if (!item.titles || item.titles.length === 0) continue;
  const news = item.titles.map(([title, source, date]) => {
    let url;
    switch (source) {
      case "yahoo":
        url = `https://tw.stock.yahoo.com/news/${item.code}-${title.slice(0, 6)}-${date}.html`;
        break;
      case "ltn":
        url = `https://search.ltn.com.tw/list?keyword=${encodeURIComponent(item.name)}#${date}`;
        break;
      default:
        url = "#";
    }
    return { title, url, source, date, snippet: "" };
  });
  const SOURCES = ["yahoo", "ltn"];
  const sourceCounts = {};
  for (const s of SOURCES) {
    sourceCounts[s] = news.filter((n) => n.source === s).length;
  }
  const result = {
    stockCode: item.code,
    name: item.name,
    scrapedAt: new Date().toISOString(),
    devSeed: true,  // 標記:這是手工 seed 不是真爬的
    sourceCounts,
    news,
  };
  const outPath = join(CACHE_DIR, `${item.code}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  writtenCount++;
}

console.log(`[generate-dev-seed] ✓ 寫入 ${writtenCount} 家公司的 seed 新聞`);
console.log(`現在跑: node scripts/market-signals/build-market-signals.mjs`);
