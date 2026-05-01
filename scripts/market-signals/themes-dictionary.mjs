/**
 * themes-dictionary.mjs
 *
 * 台股當紅題材 → 關鍵字 mapping(2024-2026 涵蓋)。
 * 用法:文章 title / snippet 比對 keywords,命中算該題材聲量 + 1。
 *
 * 設計原則:
 *  - 每個題材有 5~15 個中/英關鍵字,涵蓋常見寫法 + 縮寫 + 子議題
 *  - 關鍵字大小寫不敏感,但「精確比對」(避免「AI」誤命中「AIR」)
 *    → 比對前先把 title normalize,並用 word-boundary regex
 *  - 順序:從「相對冷門」到「絕對熱門」可動態調整,只影響 tie-break
 *  - 同一篇新聞可能命中多個題材(e.g.「台積電 CoWoS 助 NVIDIA H100」→ CoWoS + AI 晶片 + AI 伺服器)
 *    每個命中題材都 +1 聲量
 *
 * 維護建議:
 *  - 每季 review 一次,把當期主流新題材補進來
 *  - 退潮的題材(如「元宇宙」)可以保留但放後面,聲量自然會掉
 */

export const THEMES_DICT = {
  // ===== AI 算力主軸 =====
  "AI 伺服器": [
    "AI伺服器", "AI Server", "AI server",
    "GB200", "GB300", "B200", "H100", "H200",
    "DGX", "HGX", "L40", "MI300",
    "AI機櫃", "AI rack",
  ],
  "AI 晶片 / ASIC": [
    "AI晶片", "AI chip", "ASIC",
    "TPU", "NPU", "AI accelerator",
    "推論晶片", "訓練晶片",
    "客製化AI", "Custom Silicon",
    "Trainium", "Inferentia", "MTIA",
  ],
  "CoWoS / 先進封裝": [
    "CoWoS", "先進封裝", "Advanced Packaging",
    "Chiplet", "矽穿孔", "TSV",
    "SoIC", "InFO", "FOPLP",
    "扇出", "fan-out",
  ],
  "HBM 高頻寬記憶體": [
    "HBM", "HBM3", "HBM3e", "HBM4",
    "高頻寬記憶體", "高頻寬", "HBM stack",
  ],
  "矽光子 / 光通訊": [
    "矽光子", "Silicon Photonics", "光通訊",
    "CPO", "co-packaged optics",
    "光收發模組", "光模組", "optical transceiver",
    "EML", "VCSEL",
  ],

  // ===== 半導體製程 =====
  "先進製程 (3nm/2nm)": [
    "3奈米", "3nm", "2奈米", "2nm",
    "先進製程", "EUV", "GAA",
    "1.4奈米", "1.4nm", "Angstrom",
  ],
  "成熟製程": [
    "成熟製程", "8吋晶圓",
    "Mature node", "Legacy node",
  ],
  "晶圓代工": [
    "晶圓代工", "Foundry",
    "Wafer fab", "晶圓廠",
  ],
  "IC 設計": [
    "IC設計", "Fabless", "IC Design",
  ],
  "化合物半導體": [
    "化合物半導體", "GaN", "氮化鎵",
    "SiC", "碳化矽",
    "third generation semiconductor",
  ],

  // ===== 記憶體 =====
  "DRAM / 記憶體": [
    "DRAM", "動態記憶體",
    "DDR4", "DDR5", "DDR6",
    "GDDR", "LPDDR",
  ],
  "Flash / NAND": [
    "NAND", "NAND Flash", "Flash記憶體",
    "3D NAND", "QLC", "TLC",
    "NOR Flash",
  ],
  "SSD / 儲存": [
    "SSD", "固態硬碟",
    "PCIe Gen5", "NVMe",
    "Enterprise SSD", "企業級SSD",
    "NAS",
  ],

  // ===== 載板 / PCB =====
  "ABF 載板": [
    "ABF載板", "ABF substrate", "ABF",
    "高階載板", "FCBGA",
  ],
  "PCB 印刷電路板": [
    "PCB", "印刷電路板",
    "硬板", "軟板", "軟硬板", "FPC",
    "HDI",
  ],

  // ===== 顯示器 / 光電 =====
  "MicroLED": [
    "MicroLED", "Micro LED", "microLED",
    "次毫米LED",
  ],
  "Mini LED": [
    "Mini LED", "MiniLED", "miniLED",
    "次毫米背光",
  ],
  "OLED": [
    "OLED", "AMOLED", "有機發光",
  ],
  "面板 / TFT-LCD": [
    "TFT-LCD", "面板",
    "液晶顯示", "顯示面板",
  ],
  "光學鏡頭": [
    "光學鏡頭", "鏡頭模組",
    "Camera lens", "車用鏡頭",
  ],

  // ===== 電源 / 散熱 =====
  "電源管理 PMIC": [
    "電源管理", "PMIC",
    "Power IC", "電源IC",
    "DC-DC", "電源轉換",
  ],
  "散熱": [
    "散熱", "thermal",
    "液冷", "水冷", "Liquid cooling",
    "均熱片", "vapor chamber", "VC",
    "Thermal management",
  ],
  "被動元件": [
    "MLCC", "被動元件",
    "電感", "電阻", "電容",
  ],

  // ===== 車用 / EV =====
  "電動車 / EV": [
    "電動車", "EV", "BEV",
    "Tesla", "特斯拉",
    "新能源車", "純電",
  ],
  "車用半導體": [
    "車用半導體", "Automotive IC",
    "車用晶片", "車規",
    "car chip",
  ],
  "ADAS / 自駕": [
    "ADAS", "自動駕駛", "自駕",
    "Autonomous", "L3", "L4",
    "毫米波雷達",
  ],

  // ===== 網通 / 5G =====
  "5G 通訊": [
    "5G", "毫米波", "mmWave",
    "射頻", "RF",
    "Open RAN",
  ],
  "Wi-Fi / 網通": [
    "Wi-Fi 7", "Wi-Fi 6E", "WiFi",
    "switch", "router",
    "網通設備",
  ],
  "衛星通訊": [
    "衛星", "Starlink",
    "低軌衛星", "LEO",
    "Satellite",
  ],

  // ===== 機器人 / 工業 =====
  "人形機器人": [
    "人形機器人", "Humanoid",
    "Optimus", "Figure",
    "服務型機器人",
  ],
  "工業機器人 / 自動化": [
    "工業機器人", "工業自動化",
    "Industrial robot", "工業4.0",
    "智慧製造",
  ],
  "工具機": [
    "工具機", "machine tool",
    "CNC",
  ],

  // ===== 雲端 / 軟體 =====
  "雲端運算": [
    "雲端運算", "Cloud",
    "AWS", "Azure", "GCP",
    "edge computing", "邊緣運算",
  ],
  "資安": [
    "資安", "cybersecurity",
    "資訊安全", "防火牆",
    "零信任", "Zero Trust",
  ],
  "軟體 SaaS": [
    "SaaS", "雲端軟體",
    "訂閱制",
  ],

  // ===== 生技 / 醫材 =====
  "生技 / 製藥": [
    "生技", "Biotech",
    "新藥", "Pharma",
    "臨床試驗",
  ],
  "醫療器材": [
    "醫材", "醫療器材",
    "Medical device",
  ],

  // ===== 綠能 / 永續 =====
  "太陽能": [
    "太陽能", "Solar",
    "光伏", "PV",
  ],
  "風電": [
    "風電", "風力發電",
    "Wind power", "離岸風電",
  ],
  "儲能 / 電池": [
    "儲能", "ESS",
    "電池", "鋰電池",
    "battery storage",
  ],
  "氫能 / 燃料電池": [
    "氫能", "Hydrogen",
    "燃料電池", "Fuel cell",
  ],

  // ===== 金融 / 區塊鏈 =====
  "區塊鏈 / 加密貨幣": [
    "區塊鏈", "Blockchain",
    "比特幣", "Bitcoin", "BTC",
    "以太坊", "Ethereum", "ETH",
  ],
  "金融科技 FinTech": [
    "FinTech", "金融科技",
    "行動支付", "Mobile payment",
  ],

  // ===== 消費電子 =====
  "智慧手機": [
    "智慧手機", "Smartphone",
    "iPhone", "Apple",
    "三星", "Samsung",
  ],
  "穿戴 / AR/VR": [
    "穿戴", "Wearable",
    "AR", "VR", "MR",
    "Vision Pro", "Apple Vision",
  ],
  "PC / NB": [
    "筆電", "NB", "Notebook",
    "PC", "桌機",
    "AI PC",
  ],
};

/**
 * 把所有 keywords 攤平 + 預編 regex(case-insensitive,中文不需 word boundary,
 * 英文用 lookbehind/lookahead 確保不會「AI」命中「AIR」)
 */
export function compileThemesRegex() {
  const compiled = [];
  for (const [theme, keywords] of Object.entries(THEMES_DICT)) {
    const patterns = keywords.map((kw) => {
      // 中英混合判斷
      const hasChinese = /[一-鿿]/.test(kw);
      // 全中文:直接比對(中文沒有 word boundary 問題)
      // 含英文/數字:加 \b boundary 避免 partial match
      if (hasChinese) {
        return escapeRegex(kw);
      } else {
        return `\\b${escapeRegex(kw)}\\b`;
      }
    });
    compiled.push({
      theme,
      regex: new RegExp(patterns.join("|"), "i"),
      keywords,
    });
  }
  return compiled;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 對一段文字(title + snippet 通常 concat)套用所有題材 regex,
 * 回傳命中的題材陣列(可能多個)。
 */
export function classifyText(text, compiled = compileThemesRegex()) {
  const hits = [];
  for (const { theme, regex } of compiled) {
    if (regex.test(text)) hits.push(theme);
  }
  return hits;
}
