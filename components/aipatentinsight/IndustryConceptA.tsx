"use client";

/**
 * IndustryConceptA — Patent Ocean Terrain v2(海洋地形,鎖視角 + 強流動 + 左側卡片)
 *
 * v2 變化:
 *  - 視角固定:不允許拖曳旋轉,只允許滾輪縮放(像首頁洋流,user 看自然動)
 *  - 強化流動:粒子 500 顆 + 横向流光 streak + 海面波振幅加大
 *  - 左側 cat 卡片清單:點某 cat → 該 cat 區域亮起,其他變暗;
 *    cat 內前 5 公司光點額外發出光暈,標出「該領域代表公司」
 *  - hover 公司光點 → 顯示 trail 軌跡(維持 v1)
 *  - hover 地形 → tooltip(維持 v1)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type AggregateData = {
  dates: string[];
  categories: string[];
  companies: { name: string; stockCode: string }[];
  catMatrix: number[][];
  companyMatrix: number[][];
  companyMainCatMatrix: (string | null)[][];
  metrics: {
    cat: Record<string, { persistence: number; slope: number; flash: number; total: number }>;
    company: Record<string, { name: string; stockCode: string; persistence: number; slope: number; flash: number; total: number }>;
  };
};

type Props = { data: AggregateData; domains?: Record<string, string> };

// 主視覺高度由 wrap 容器的 CSS 決定(viewport-based);這裡只是 fallback。
const FALLBACK_HEIGHT = 760;
const TOP_CATS = 14;
const TOP_COMPANIES = 30;
const KEY_COMPANIES_PER_CAT = 5; // 每個 cat 高亮幾家代表公司

// Slope-based 暖寒色軸 — 暖色(紅橙黃)= slope 強正、冷色(青藍紫)= slope 強負
//   每 cat 按 slope rank 在連續色相內取唯一 hue,確保「每條都分得出來」
function buildSlopePalette(
  catNames: string[],
  slopeOf: (c: string) => number
): Map<string, THREE.Color> {
  const sorted = [...catNames]
    .map((c) => ({ c, s: slopeOf(c) }))
    .sort((a, b) => b.s - a.s); // 大 slope → 小
  const m = new Map<string, THREE.Color>();
  const n = sorted.length;
  sorted.forEach((entry, i) => {
    const t = n > 1 ? i / (n - 1) : 0; // 0(暖)→ 1(寒)
    // hue:0(紅)→ 50(黃)→ 180(青)→ 240(藍)
    // 用 piecewise 讓暖寒兩端有更多差異
    let hue: number;
    if (t < 0.4) hue = t * (50 / 0.4);              // 0~50  紅→黃
    else if (t < 0.6) hue = 50 + (t - 0.4) * 130 / 0.2; // 50~180 黃→青(中性過渡)
    else hue = 180 + (t - 0.6) * 60 / 0.4;          // 180~240 青→藍紫
    // 飽和度高,亮度中
    const sat = 0.88 - Math.abs(t - 0.5) * 0.05;
    const light = 0.58 - Math.abs(t - 0.5) * 0.06;
    m.set(entry.c, new THREE.Color().setHSL(hue / 360, sat, light));
  });
  return m;
}

type EntityHoverInfo = {
  kind: "cat" | "company";
  key: string;
  label: string;
  total: number;
  persistence: number;
  slope: number;
  flash: number;
};

export default function IndustryConceptA({ data, domains = {} }: Props) {
  const [range, setRange] = useState<[number, number]>([0, data.dates.length - 1]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; entity: EntityHoverInfo | null }>({
    x: 0, y: 0, entity: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const timeLabelLayerRef = useRef<HTMLDivElement | null>(null);

  const topCatNames = useMemo(() => {
    return [...data.categories]
      .map((c) => ({ c, m: data.metrics.cat[c]?.total || 0 }))
      .sort((a, b) => b.m - a.m)
      .slice(0, TOP_CATS)
      .map((x) => x.c);
  }, [data]);

  // 重排成「中央放最大,兩翼次大」的 z 序 — 給海床 / 粒子流定位用
  //   topCatNames=[A,B,C,D,E] (大→小) → zOrderedCats=[D,B,A,C,E] (中央 A 最大)
  const zOrderedCats = useMemo(() => {
    const n = topCatNames.length;
    const result: string[] = new Array(n);
    const mid = Math.floor((n - 1) / 2);
    for (let i = 0; i < n; i++) {
      let offset: number;
      if (i % 2 === 0) offset = i / 2;
      else offset = -(Math.floor(i / 2) + 1);
      const pos = mid + offset;
      if (pos >= 0 && pos < n) result[pos] = topCatNames[i];
    }
    // 補 fallback(理論上不會發生)
    for (let i = 0; i < n; i++) if (!result[i]) result[i] = topCatNames[i];
    return result;
  }, [topCatNames]);

  const stateRef = useRef({
    range, data, hoveredKey: null as string | null, selectedCat,
    domains: domains as Record<string, string>,
    zOrderedCats: zOrderedCats as string[],
  });
  stateRef.current.range = range;
  stateRef.current.data = data;
  stateRef.current.selectedCat = selectedCat;
  stateRef.current.domains = domains;
  stateRef.current.zOrderedCats = zOrderedCats;

  const topCompanies = useMemo(() => {
    return [...data.companies]
      .map((c) => ({ ...c, m: data.metrics.company[c.stockCode]?.total || 0 }))
      .sort((a, b) => b.m - a.m)
      .slice(0, TOP_COMPANIES);
  }, [data]);

  const catColorMap = useMemo(() => {
    return buildSlopePalette(topCatNames, (c) => data.metrics.cat[c]?.slope ?? 0);
  }, [topCatNames, data]);
  const catColors = useMemo(
    () => topCatNames.map((c) => catColorMap.get(c) ?? new THREE.Color(0xffffff)),
    [topCatNames, catColorMap]
  );

  // 每個 cat 的 top 5 key companies(整體 total 最高的 N 家其 mainCat 含該 cat)
  const keyCompaniesByCat = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const cat of topCatNames) {
      const inThisCat = topCompanies.filter((co) => {
        const idx = data.companies.findIndex((c) => c.stockCode === co.stockCode);
        if (idx < 0) return false;
        // 該公司在最近 N 期是否主類別 === cat
        for (const mainCat of data.companyMainCatMatrix.map((row) => row[idx])) {
          if (mainCat === cat) return true;
        }
        return false;
      });
      const top = inThisCat.slice(0, KEY_COMPANIES_PER_CAT);
      map.set(cat, new Set(top.map((c) => c.stockCode)));
    }
    return map;
  }, [topCatNames, topCompanies, data]);

  // 卡片用的 cat metric
  const catCardData = useMemo(() => {
    return topCatNames.map((c) => ({
      name: c,
      color: catColorMap.get(c) || new THREE.Color(0x888888),
      m: data.metrics.cat[c] || { total: 0, persistence: 0, slope: 0, flash: 0 },
    }));
  }, [topCatNames, catColorMap, data]);

  /**
   * Insight Pills — 從 metrics 分四象限,各挑 1 名代表
   *   核心穩健: persistence 高 + slope 持平/增 + total 大
   *   新興爆發: slope 強正 + total 不小
   *   曇花一現: flash 高(集中) + persistence 低
   *   退場中:   persistence 中高 + slope 強負
   */
  const insightPills = useMemo(() => {
    type Pill = {
      kind: "steady" | "rising" | "flash" | "fading";
      cat: string;
      headline: string;
      detail: string;
      icon: string;
    };
    const cats = Object.entries(data.metrics.cat).filter(
      ([name, m]) => name !== "其他" && (m.total ?? 0) >= 30
    );
    const pills: Pill[] = [];

    // 核心穩健 — persistence top + slope >= 0
    const steady = [...cats]
      .filter(([, m]) => m.persistence >= 0.7 && m.slope >= -1 && m.total >= 100)
      .sort((a, b) => b[1].total - a[1].total)[0];
    if (steady) {
      const [name, m] = steady;
      pills.push({
        kind: "steady",
        cat: name,
        icon: "⭐",
        headline: name,
        detail: `穩健核心 · ${m.total} 件 · ${Math.round(m.persistence * 100)}% 出現率`,
      });
    }

    // 新興爆發 — slope 強正
    const rising = [...cats]
      .filter(([, m]) => m.slope > 3 && m.total >= 80)
      .sort((a, b) => b[1].slope - a[1].slope)[0];
    if (rising && rising[0] !== steady?.[0]) {
      const [name, m] = rising;
      pills.push({
        kind: "rising",
        cat: name,
        icon: "🔥",
        headline: name,
        detail: `成長動能 · 趨勢斜率 +${m.slope.toFixed(1)} · ${m.total} 件`,
      });
    }

    // 曇花一現 — flash 高且 persistence 低
    const flash = [...cats]
      .filter(([, m]) => m.flash >= 0.6 && m.persistence < 0.4 && m.total >= 50)
      .sort((a, b) => b[1].flash - a[1].flash)[0];
    if (flash && flash[0] !== steady?.[0] && flash[0] !== rising?.[0]) {
      const [name, m] = flash;
      pills.push({
        kind: "flash",
        cat: name,
        icon: "✦",
        headline: name,
        detail: `短期爆發 · ${Math.round(m.flash * 100)}% 集中度 · 後勁不足`,
      });
    }

    // 退場中 — slope 強負
    const fading = [...cats]
      .filter(([, m]) => m.slope < -3 && m.total >= 80)
      .sort((a, b) => a[1].slope - b[1].slope)[0];
    if (
      fading &&
      fading[0] !== steady?.[0] &&
      fading[0] !== rising?.[0] &&
      fading[0] !== flash?.[0]
    ) {
      const [name, m] = fading;
      pills.push({
        kind: "fading",
        cat: name,
        icon: "↓",
        headline: name,
        detail: `動能下滑 · 趨勢斜率 ${m.slope.toFixed(1)} · ${m.total} 件`,
      });
    }

    return pills;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const timeLabelLayer = timeLabelLayerRef.current;
    if (!canvas || !wrap) return;
    const _canvas = canvas, _wrap = wrap;
    const _timeLabelLayer = timeLabelLayer;

    let W = wrap.clientWidth;
    let H = wrap.clientHeight || FALLBACK_HEIGHT;

    const scene = new THREE.Scene();
    // 深海霧:更深的色調 + near 拉近,遠景溶入黑暗
    scene.fog = new THREE.Fog(0x010614, 55, 145);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    // 整體曝光中位 — 太高會把 cat 顏色洗白
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    // 深海光照:環境暗,主光偏冷藍,焦點光更亮(像水中發光錨點)
    scene.add(new THREE.AmbientLight(0x152038, 0.42));         // 暗藍環境光
    const dirMain = new THREE.DirectionalLight(0xb0d5ff, 0.85); // 主光偏冷藍(水底散射)
    dirMain.position.set(20, 60, 35);
    scene.add(dirMain);
    const dirFill = new THREE.DirectionalLight(0x6fb5e8, 0.45);
    dirFill.position.set(-30, 25, -15);
    scene.add(dirFill);
    const rimLight = new THREE.DirectionalLight(0x9c5dff, 0.38);
    rimLight.position.set(0, 8, -50);
    scene.add(rimLight);
    // 中央 focus point — 給海床中央一道穿透光柱感
    const focusLight = new THREE.PointLight(0x9ff9ff, 1.85, 75);
    focusLight.position.set(0, 14, 0);
    scene.add(focusLight);

    // ===== 地形 =====
    const TX = 80;
    const TZ_PER_CAT = 6;     // 每 cat 至少 6 row,給「中央 + falloff」夠寬
    const TZ = TOP_CATS * TZ_PER_CAT;
    // 加大世界尺寸 — 視野邊界更遠,搭配 fog 自然淡入 → 不再有「斷掉」的硬邊
    const WORLD_W = 130;
    const WORLD_DEPTH = 80;
    // 高度大幅放大,讓 cat 量級差異一目了然(山脈感)
    const HEIGHT_SCALE = 28;

    const terrainGeom = new THREE.PlaneGeometry(WORLD_W, WORLD_DEPTH, TX - 1, TZ - 1);
    terrainGeom.rotateX(-Math.PI / 2);
    const tPos = terrainGeom.attributes.position;
    const tColors = new Float32Array(tPos.count * 3);
    terrainGeom.setAttribute("color", new THREE.BufferAttribute(tColors, 3));

    const cellDominantCat: (string | null)[] = new Array(TX * TZ).fill(null);
    const cellBaseY: number[] = new Array(TX * TZ).fill(0);
    const cellBaseColor: THREE.Color[] = new Array(TX * TZ).fill(null).map(() => new THREE.Color());
    // 每 cell 的「洋流強度」(0~1):中央 = 1(主洋流),邊緣 = 0(海)
    //   讓 cat 帶看起來像「洋流條」而非貼合的色塊。
    const cellIntensity: number[] = new Array(TX * TZ).fill(0);

    // cat z 帶分配:大 cat 佔寬海域、小 cat 佔窄海域
    //   每 cat 至少 2 row 確保看得到,剩餘 row 按 sqrt(total) 比例分(sqrt 緩和差距,
    //   不然 1295 vs 88 比例差 14×,小 cat 會徹底消失)。
    //   cellCatRowAlloc[i] = 第 i 個 cat 拿幾 row
    //   cellCatBoundary[i] = 第 i 個 cat z 帶結束的 row index
    //   cellCatCenterTz[i] = 第 i 個 cat z 帶中央 row index(給 company / cat label 定位)
    let cellCatRowAlloc: number[] = new Array(TOP_CATS).fill(0);
    let cellCatBoundary: number[] = new Array(TOP_CATS).fill(0);
    let cellCatCenterTz: number[] = new Array(TOP_CATS).fill(0);

    function recomputeCatBands() {
      // 用 zOrderedCats(中央放最大)算 z 帶分配
      const z = stateRef.current.zOrderedCats;
      const totals = z.map((c) => data.metrics.cat[c]?.total ?? 0);
      const weights = totals.map((t) => Math.sqrt(Math.max(1, t)));
      const sumW = weights.reduce((a, b) => a + b, 0);
      const minRow = 4; // 最少 4 row,夠做 falloff
      const reserved = TOP_CATS * minRow;
      const remaining = Math.max(0, TZ - reserved);
      const alloc = weights.map((w) =>
        Math.max(0, Math.round((w / sumW) * remaining))
      );
      let total = alloc.reduce((a, b) => a + b, 0) + reserved;
      // 補齊到 TZ
      let i = 0;
      while (total < TZ) { alloc[i % TOP_CATS]++; total++; i++; }
      while (total > TZ) {
        const maxIdx = alloc.indexOf(Math.max(...alloc));
        alloc[maxIdx] = Math.max(0, alloc[maxIdx] - 1);
        total--;
      }
      cellCatRowAlloc = alloc.map((r) => r + minRow);
      let acc = 0;
      for (let k = 0; k < TOP_CATS; k++) {
        const start = acc;
        acc += cellCatRowAlloc[k];
        cellCatBoundary[k] = acc;
        cellCatCenterTz[k] = (start + acc) / 2;
      }
    }
    recomputeCatBands();

    function tzToCatIdx(tz: number): number {
      let i = 0;
      while (i < TOP_CATS && tz >= cellCatBoundary[i]) i++;
      return Math.min(TOP_CATS - 1, i);
    }

    // 在 cat 帶內位置(0~1)→ 強度(plateau 中央寬,邊緣 fade)
    //   中央 60% 強度 1.0(洋流核心),邊緣 40% 漸變到 0(海)
    function bandIntensity(localT: number): number {
      const dist = Math.abs(localT - 0.5) * 2; // 0=中央,1=邊緣
      if (dist < 0.55) return 1.0;
      const fade = 1 - (dist - 0.55) / 0.45;
      // smoothstep 讓 fade 更自然
      return Math.max(0, fade * fade * (3 - 2 * fade));
    }

    function rebuildTerrain() {
      const { range, data } = stateRef.current;
      const [start, end] = range;
      const segLen = end - start + 1;
      const z = stateRef.current.zOrderedCats;
      const catIdxMap = z.map((c) => data.categories.indexOf(c));
      recomputeCatBands();

      // 預算每 tz 的 catIdx + 在 cat 帶內位置 localT
      const tzCatIdx: number[] = new Array(TZ);
      const tzLocalT: number[] = new Array(TZ);
      let prev = 0;
      for (let i = 0; i < TOP_CATS; i++) {
        const len = cellCatBoundary[i] - prev;
        for (let j = 0; j < len; j++) {
          const tz = prev + j;
          tzCatIdx[tz] = i;
          tzLocalT[tz] = len > 1 ? j / (len - 1) : 0.5;
        }
        prev = cellCatBoundary[i];
      }

      for (let tz = 0; tz < TZ; tz++) {
        const catIdx = tzCatIdx[tz];
        const intensity = bandIntensity(tzLocalT[tz]);
        const dominantCat = z[catIdx];
        const dCatColIdx = catIdxMap[catIdx];

        for (let tx = 0; tx < TX; tx++) {
          const tFloat = (tx / (TX - 1)) * (segLen - 1);
          const tLow = Math.floor(tFloat);
          const tFrac = tFloat - tLow;
          const tHigh = Math.min(segLen - 1, tLow + 1);
          const vLow = data.catMatrix[start + tLow][dCatColIdx] || 0;
          const vHigh = data.catMatrix[start + tHigh][dCatColIdx] || 0;
          // height 也乘 intensity → cat 中央高、邊緣低(海溝)
          const v = (vLow + (vHigh - vLow) * tFrac) * intensity;
          const idx = tz * TX + tx;
          cellBaseY[idx] = v;
          cellDominantCat[idx] = dominantCat;
          cellIntensity[idx] = intensity;
        }
      }
      let maxV = 1;
      for (let i = 0; i < cellBaseY.length; i++) {
        if (cellBaseY[i] > maxV) maxV = cellBaseY[i];
      }
      for (let i = 0; i < cellBaseY.length; i++) {
        cellBaseY[i] = (cellBaseY[i] / maxV) * HEIGHT_SCALE;
      }
      for (let i = 0; i < tPos.count; i++) {
        tPos.setY(i, cellBaseY[i] - 1.5);
        const cat = cellDominantCat[i];
        const baseColor = cat ? catColorMap.get(cat) : new THREE.Color(0x0a1830);
        const intensity = cellIntensity[i];
        const heightFrac = Math.max(0, Math.min(1, cellBaseY[i] / HEIGHT_SCALE));
        // 海色更深一點(讓 cat 與海對比更強)
        const seabedColor = new THREE.Color(0x040a18);
        // blend 主要由 intensity 決定:
        //   - intensity 0(海):基本只有海色(留 ~5% cat 色暗示)
        //   - intensity 1(洋流核心):cat 色 95%
        //   - height 額外加 10%(高峰多一點 cat 色)
        const blend = Math.min(1, 0.05 + intensity * 0.85 + heightFrac * 0.1);
        const finalColor = new THREE.Color().lerpColors(
          seabedColor,
          baseColor || seabedColor,
          blend
        );
        cellBaseColor[i].copy(finalColor);
        tColors[i * 3] = finalColor.r;
        tColors[i * 3 + 1] = finalColor.g;
        tColors[i * 3 + 2] = finalColor.b;
      }
      tPos.needsUpdate = true;
      (terrainGeom.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      terrainGeom.computeVertexNormals();
    }

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.45,
      roughness: 0.42,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.98,
      flatShading: false,
      emissive: 0x000000,      // emissive 走 onBeforeCompile 讓 vertex color 推自發光
      emissiveIntensity: 1.0,
    });
    // Hack:讓 vertex color 同時當 emissive 用,海床自帶夜光感
    // 倍率 0.6 — 飽和色 + 自發光,顏色更跳
    terrainMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * 0.6;"
      );
    };
    const terrain = new THREE.Mesh(terrainGeom, terrainMat);
    // 海床改成「不可見」 — 洋流無底座,但保留 mesh 給 raycaster 跟內部資料。
    //   仍維持 cellCatCenterTz / cellBaseY 計算讓粒子流跟立柱知道 cat 的 z 位置,
    //   只是不顯示地形本身。
    terrain.visible = false;
    scene.add(terrain);
    rebuildTerrain();

    // 每 cat 一個 y 基線(中央 0,兩翼緩慢上下散,±Y_SPREAD 範圍)
    //   讓每條洋流有自己的「層」,但分布在合理觀測範圍
    const Y_SPREAD = 5;
    const catBaseY: number[] = new Array(TOP_CATS);
    {
      const mid = (TOP_CATS - 1) / 2;
      for (let i = 0; i < TOP_CATS; i++) {
        const norm = (i - mid) / Math.max(1, mid); // -1 ~ +1
        // 緩 sin curve — 不是線性散開,讓中央更密集
        catBaseY[i] = Math.sin(norm * Math.PI * 0.5) * Y_SPREAD;
      }
    }

    // ===== 計算 cat 之間互相影響的 top 3 secondary =====
    //   由公司 mainCat 在相鄰 snapshot 之間的變遷次數合計而來。
    //   selected 某 cat 時,這 3 個會「中亮」(介於 selected 強亮跟 dim 全暗之間),
    //   讓使用者看到「半導體封裝技術」常跟「半導體技術 / 結構」流動。
    const catSecondary = new Map<string, Set<string>>();
    {
      const flow = new Map<string, Map<string, number>>();
      for (let i = 0; i < data.companies.length; i++) {
        for (let t = 0; t < data.dates.length - 1; t++) {
          const a = data.companyMainCatMatrix[t][i];
          const b = data.companyMainCatMatrix[t + 1][i];
          if (!a || !b || a === b) continue;
          if (!topCatNames.includes(a) || !topCatNames.includes(b)) continue;
          if (!flow.has(a)) flow.set(a, new Map());
          flow.get(a)!.set(b, (flow.get(a)!.get(b) || 0) + 1);
        }
      }
      for (const cat of topCatNames) {
        const m = new Map<string, number>();
        flow.get(cat)?.forEach((v, k) => {
          if (k !== cat) m.set(k, (m.get(k) || 0) + v);
        });
        flow.forEach((subM, otherA) => {
          if (otherA === cat) return;
          const v = subM.get(cat);
          if (v) m.set(otherA, (m.get(otherA) || 0) + v);
        });
        const top3 = [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((x) => x[0]);
        catSecondary.set(cat, new Set(top3));
      }
    }

    // ===== 公司光點 =====
    const companyGroup = new THREE.Group();
    scene.add(companyGroup);
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    type CompanyPointData = {
      group: THREE.Group;     // root group (位置 = 海床點)
      pillar: THREE.Mesh;     // 細長立柱(里程碑主體)
      cap: THREE.Mesh;        // 頂端球(光球)
      ring: THREE.Mesh;       // 頂端水平光環(慢轉)
      glow: THREE.Mesh;       // 底座光暈(hover 時亮)
      label: THREE.Sprite;    // stockCode 文字標(billboard 自動對相機)
      labelTexture: THREE.CanvasTexture;
      pillarHeight: number;
      hitTarget: THREE.Mesh;  // raycaster 用的 hit 大盒(包住整柱)
      stockCode: string;
      name: string;
      mainCatLastSnap: string | null;
      pathPoints: THREE.Vector3[];
      catColor: THREE.Color;
    };
    let companyPoints: CompanyPointData[] = [];

    // ===== Logo board sprite =====
    //   立柱頂端的「金屬框平板」:中央是 logo(從 Google favicon API 抓),底下是 stockCode。
    //   Sprite 自動 billboard,永遠面對相機。
    //   logo 載入是 async,canvas 先畫好框 + stockCode,texture 在 logo 載完才更新。
    function roundRect(
      ctx: CanvasRenderingContext2D,
      x: number, y: number, w: number, h: number, r: number
    ) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawBoardChrome(
      ctx: CanvasRenderingContext2D,
      W: number, H: number,
      accent: THREE.Color
    ) {
      ctx.clearRect(0, 0, W, H);
      const r = Math.round(W * 0.063); // 圓角隨 W 縮放
      // 金屬背景漸層
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(56, 76, 110, 0.92)");
      bg.addColorStop(0.45, "rgba(28, 42, 70, 0.95)");
      bg.addColorStop(1, "rgba(10, 20, 40, 0.97)");
      roundRect(ctx, 0, 0, W, H, r);
      ctx.fillStyle = bg;
      ctx.fill();
      // 上邊高光(金屬反射)
      const hlH = Math.round(H * 0.09);
      const hl = ctx.createLinearGradient(0, 0, 0, hlH);
      hl.addColorStop(0, "rgba(255,255,255,0.4)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      roundRect(ctx, 0, 0, W, hlH, r);
      ctx.fillStyle = hl;
      ctx.fill();
      // cat 色邊框
      const ar = Math.round(accent.r * 255),
            ag = Math.round(accent.g * 255),
            ab = Math.round(accent.b * 255);
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.95)`;
      ctx.lineWidth = 6;
      roundRect(ctx, 3, 3, W - 6, H - 6, r - 2);
      ctx.stroke();
    }

    function makeLogoBoardSprite(
      stockCode: string,
      accent: THREE.Color
    ): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
      // 高解析度 canvas — 縮放後仍銳利
      const W = 512, H = 384;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const draw = (logoImg: HTMLImageElement | null) => {
        drawBoardChrome(ctx, W, H, accent);
        // logo 區(中央上方)
        if (logoImg) {
          // 白底圓角讓 logo 看得清(很多 favicon 是深色)
          const ls = 192;
          const lx = (W - ls) / 2, ly = 48;
          ctx.fillStyle = "rgba(255,255,255,0.94)";
          roundRect(ctx, lx - 12, ly - 12, ls + 24, ls + 24, 28);
          ctx.fill();
          ctx.drawImage(logoImg, lx, ly, ls, ls);
        } else {
          const ar = Math.round(accent.r * 255),
                ag = Math.round(accent.g * 255),
                ab = Math.round(accent.b * 255);
          ctx.fillStyle = `rgba(${ar},${ag},${ab},0.6)`;
          ctx.beginPath();
          ctx.arc(W / 2, 144, 76, 0, Math.PI * 2);
          ctx.fill();
        }
        // stockCode — 大字 + 黑色描邊提升對比
        ctx.font = "900 86px ui-monospace, SFMono-Regular, Consolas, 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const ty = H - 56;
        // 描邊(深色,讓白字在任何背景上都看得清)
        ctx.lineWidth = 8;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.strokeText(stockCode, W / 2, ty);
        // 主白字
        ctx.fillStyle = "#ffffff";
        ctx.fillText(stockCode, W / 2, ty);
      };

      // 先畫好框 + stockCode + fallback 圈
      draw(null);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });
      const sprite = new THREE.Sprite(mat);
      // 比例 4:3,寬 3.4 高 2.55
      sprite.scale.set(3.4, 2.55, 1);

      // async 載 logo,載到再重畫
      const domain = stateRef.current.domains[stockCode];
      if (domain) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          draw(img);
          texture.needsUpdate = true;
        };
        img.onerror = () => {
          // 留 fallback 圈
        };
        img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      }

      return { sprite, texture };
    }

    function disposeMesh(m: any) {
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((mm: any) => mm.dispose());
        else m.material.dispose();
      }
    }

    function clearCompaniesAndTrail() {
      while (companyGroup.children.length) {
        const c = companyGroup.children[0] as THREE.Object3D;
        companyGroup.remove(c);
        c.traverse((o: any) => disposeMesh(o));
      }
      while (trailGroup.children.length) {
        const c = trailGroup.children[0] as any;
        trailGroup.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
      companyPoints = [];
    }

    function rebuildCompanies() {
      clearCompaniesAndTrail();
      const { range, data } = stateRef.current;
      const [start, end] = range;
      const segLen = end - start + 1;
      const xStep = WORLD_W / Math.max(1, segLen - 1);

      function localToWorld(snapIdxRel: number, catIdx: number): THREE.Vector3 {
        const x = -WORLD_W / 2 + snapIdxRel * xStep;
        // 用該 cat 在 weighted z 帶的中央 row,而非均分
        const tzCenter = cellCatCenterTz[catIdx];
        // y 改用 catBaseY(各 cat 自己的層)— 不再貼海床
        const y = (catBaseY[catIdx] ?? 0) - 0.3;
        const z = -WORLD_DEPTH / 2 + (tzCenter / TZ) * WORLD_DEPTH;
        return new THREE.Vector3(x, y, z);
      }

      topCompanies.forEach((co) => {
        const idx = data.companies.findIndex((c) => c.stockCode === co.stockCode);
        if (idx < 0) return;
        const pathPoints: THREE.Vector3[] = [];
        let lastMainCat: string | null = null;
        for (let s = start; s <= end; s++) {
          const mainCat = data.companyMainCatMatrix[s][idx];
          const v = data.companyMatrix[s][idx];
          if (!mainCat || v === 0) continue;
          const catIdx = stateRef.current.zOrderedCats.indexOf(mainCat);
          if (catIdx < 0) continue;
          pathPoints.push(localToWorld(s - start, catIdx));
          lastMainCat = mainCat;
        }
        if (pathPoints.length === 0) return;
        const lastPoint = pathPoints[pathPoints.length - 1];
        const totalForSize = data.metrics.company[co.stockCode]?.total || 1;

        // 浮標立柱(短小):高度 0.6 ~ 1.6,僅作為「公司浮標的桿」
        const pillarHeight = 0.6 + Math.min(1.0, Math.sqrt(totalForSize) * 0.12);
        const capRadius = 0.32 + Math.min(0.4, Math.sqrt(totalForSize) * 0.05);

        // 該公司主類別顏色;沒有則白色
        const catColor =
          (lastMainCat && catColorMap.get(lastMainCat)) || new THREE.Color(0xffffff);

        const root = new THREE.Group();
        root.position.copy(lastPoint);
        root.userData = { kind: "company", stockCode: co.stockCode, name: co.name };

        // === 立柱(主體,從海床向上)===
        const pillarGeom = new THREE.CylinderGeometry(0.13, 0.18, pillarHeight, 8, 1, false);
        const pillarMat = new THREE.MeshStandardMaterial({
          color: catColor,
          emissive: catColor,
          emissiveIntensity: 0.85,
          metalness: 0.55,
          roughness: 0.42,
          transparent: true,
          opacity: 0.95,
        });
        const pillar = new THREE.Mesh(pillarGeom, pillarMat);
        pillar.position.y = pillarHeight / 2; // 底貼海床,頂在 pillarHeight
        pillar.userData = { kind: "company", stockCode: co.stockCode, name: co.name };
        root.add(pillar);

        // === 頂端光球(像里程碑頂端的燈)===
        const capGeom = new THREE.SphereGeometry(capRadius, 16, 16);
        const capMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 1.4,
          metalness: 0.2,
          roughness: 0.3,
        });
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.y = pillarHeight + capRadius * 0.2;
        cap.userData = { kind: "company", stockCode: co.stockCode, name: co.name };
        root.add(cap);

        // === 頂端水平光環(慢慢轉)===
        const ringGeom = new THREE.TorusGeometry(capRadius * 2.2, 0.045, 8, 28);
        ringGeom.rotateX(Math.PI / 2); // 水平
        const ringMat = new THREE.MeshBasicMaterial({
          color: catColor,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.y = pillarHeight + capRadius * 0.2;
        root.add(ring);

        // === 底座光暈(hover/key 時擴張)===
        const glowGeom = new THREE.SphereGeometry(capRadius * 1.2, 14, 14);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.y = 0.1;
        root.add(glow);

        // === 大盒子當 hit target(覆蓋整柱,raycaster 容易命中)===
        const hitGeom = new THREE.CylinderGeometry(
          capRadius * 1.2,
          capRadius * 1.2,
          pillarHeight + capRadius * 1.5,
          6
        );
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitTarget = new THREE.Mesh(hitGeom, hitMat);
        hitTarget.position.y = (pillarHeight + capRadius * 1.5) / 2;
        hitTarget.userData = { kind: "company", stockCode: co.stockCode, name: co.name };
        root.add(hitTarget);

        // === Logo board(金屬框平板 + favicon + stockCode,Sprite billboard)===
        const { sprite: label, texture: labelTexture } =
          makeLogoBoardSprite(co.stockCode, catColor);
        // 浮在頂端球上方一點(板子比文字大,要留更多高度)
        label.position.y = pillarHeight + capRadius * 0.2 + 1.95;
        root.add(label);

        companyGroup.add(root);

        companyPoints.push({
          group: root,
          pillar, cap, ring, glow, hitTarget, label, labelTexture,
          pillarHeight,
          stockCode: co.stockCode,
          name: co.name,
          mainCatLastSnap: lastMainCat,
          pathPoints,
          catColor,
        });
      });
    }
    rebuildCompanies();

    // ===== 海洋雜訊(背景灑點,呼應首頁 AIHeroOcean 海洋感)=====
    const NOISE_COUNT = 1500;
    const noisePos = new Float32Array(NOISE_COUNT * 3);
    const noiseVel = new Float32Array(NOISE_COUNT * 3);
    const noiseSize = new Float32Array(NOISE_COUNT);
    const noiseSeed = new Float32Array(NOISE_COUNT);
    for (let i = 0; i < NOISE_COUNT; i++) {
      noisePos[i * 3] = (Math.random() - 0.5) * WORLD_W * 1.4;
      noisePos[i * 3 + 1] = Math.random() * (HEIGHT_SCALE * 1.6) - 4;
      noisePos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_DEPTH * 1.3;
      noiseVel[i * 3] = (Math.random() - 0.5) * 0.04;
      noiseVel[i * 3 + 1] = (Math.random() - 0.5) * 0.025;
      noiseSize[i] = Math.random() < 0.88 ? 0.4 + Math.random() * 0.6 : 1.2 + Math.random() * 0.8;
      noiseSeed[i] = Math.random() * 10;
    }
    const noiseGeom = new THREE.BufferGeometry();
    noiseGeom.setAttribute("position", new THREE.BufferAttribute(noisePos, 3));
    noiseGeom.setAttribute("size", new THREE.BufferAttribute(noiseSize, 1));
    const noiseMat = new THREE.ShaderMaterial({
      uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float size;
        varying float vDepth;
        uniform float pixelRatio;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_PointSize = size * pixelRatio * (260.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * 0.32;
          float fade = smoothstep(140.0, 18.0, vDepth);
          gl_FragColor = vec4(0.42, 0.55, 0.72, alpha * fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const noisePoints = new THREE.Points(noiseGeom, noiseMat);
    scene.add(noisePoints);

    // ===== Cat 粒子流(每 cat 由 N 顆粒子組成,N ∝ total)=====
    //   想像每顆粒子是一筆專利,沿 cat 軸流動。
    //   大 cat 粒子量多、洋流條寬;小 cat 粒子少、條窄 → 一眼就看出大小差。
    function particleCountForCat(catName: string): number {
      const total = data.metrics.cat[catName]?.total ?? 0;
      // 全 cat 等比例 3× 提升:大 cat 約 1900、小 cat 約 240,共 ~12500 顆
      return Math.max(240, Math.min(1920, Math.round(total * 1.5)));
    }
    const flowParticleCounts = zOrderedCats.map(particleCountForCat);
    const TOTAL_FLOW = flowParticleCounts.reduce((a, b) => a + b, 0);

    // 每 cat 的散布寬度(大 cat 寬條,小 cat 窄條)
    const catSpreadY: number[] = new Array(TOP_CATS);
    const catSpreadZ: number[] = new Array(TOP_CATS);
    {
      const totals = zOrderedCats.map((c) => data.metrics.cat[c]?.total ?? 1);
      const maxT = Math.max(...totals, 1);
      for (let i = 0; i < TOP_CATS; i++) {
        const f = Math.sqrt(totals[i] / maxT); // 0.25 ~ 1.0
        catSpreadY[i] = 0.5 + f * 1.6; // 0.5 ~ 2.1
        catSpreadZ[i] = 0.35 + f * 1.0; // 0.35 ~ 1.35
      }
    }

    // === Cat 分兩類流型:boundary / gyre ===
    //   - boundary(邊界流):高 slope + 高 total → 細窄高速主流(像黑潮)
    //   - gyre(常規):剩下的 cat → 圍繞 baseY 流動
    //   渦旋(eddy)從「分類」變成「現象」 — 由 attraction zone 內的螺旋運動湧現
    type LayerType = "boundary" | "gyre";
    const catLayer: LayerType[] = new Array(TOP_CATS);
    for (let i = 0; i < TOP_CATS; i++) {
      const c = zOrderedCats[i];
      const m = data.metrics.cat[c];
      if (!m) { catLayer[i] = "gyre"; continue; }
      if (m.slope > 6 && m.total > 200) catLayer[i] = "boundary";
      else catLayer[i] = "gyre";
    }
    // boundary 收窄(細窄高速)
    for (let i = 0; i < TOP_CATS; i++) {
      if (catLayer[i] === "boundary") {
        catSpreadY[i] *= 0.45;
        catSpreadZ[i] *= 0.45;
      }
    }

    // 每條 gyre cat 自己的 yaw/pitch 偏移(z 跟 y 方向)— 不再都走直線
    //   deterministic 計算讓相鄰 cat 方向不同,有的偏上有的偏下
    const catAngleZ: number[] = new Array(TOP_CATS);
    const catAngleY: number[] = new Array(TOP_CATS);
    for (let i = 0; i < TOP_CATS; i++) {
      if (catLayer[i] === "boundary") {
        // boundary 直流,不加偏角
        catAngleZ[i] = 0;
        catAngleY[i] = 0;
      } else {
        // gyre:用 sin/cos hash 產生範圍 ±0.35 rad 的偏角
        catAngleZ[i] = Math.sin(i * 2.7 + 1.3) * 0.32 + Math.cos(i * 1.4) * 0.12;
        catAngleY[i] = Math.cos(i * 3.1 + 0.7) * 0.18;
      }
    }

    // Boundary cat 的位置(每 frame 用,預先 cache 計算)
    const boundaryIndices: number[] = [];
    for (let i = 0; i < TOP_CATS; i++) {
      if (catLayer[i] === "boundary") boundaryIndices.push(i);
    }

    const fpPos = new Float32Array(TOTAL_FLOW * 3);
    const fpVel = new Float32Array(TOTAL_FLOW * 3);
    const fpCol = new Float32Array(TOTAL_FLOW * 3);
    const fpSize = new Float32Array(TOTAL_FLOW);
    const fpLife = new Float32Array(TOTAL_FLOW);
    const fpAge = new Float32Array(TOTAL_FLOW);
    const fpTotal = new Float32Array(TOTAL_FLOW);
    const fpCatIdx = new Int32Array(TOTAL_FLOW); // 屬於哪個 zOrderedCats index
    const fpPhase = new Float32Array(TOTAL_FLOW); // sin 相位

    function spawnFlowParticle(p: number) {
      const ci = fpCatIdx[p];
      fpPos[p * 3] = -WORLD_W / 2 - Math.random() * 6;
      // y 用該 cat 的 baseline,散布範圍 ∝ catSpreadY[ci](大 cat 寬條,小 cat 窄條)
      const baseY = catBaseY[ci] ?? 0;
      fpPos[p * 3 + 1] = baseY + (Math.random() - 0.5) * 2 * catSpreadY[ci];
      const tzCenter = cellCatCenterTz[ci] ?? 0;
      const zCenter = -WORLD_DEPTH / 2 + (tzCenter / TZ) * WORLD_DEPTH;
      fpPos[p * 3 + 2] = zCenter + (Math.random() - 0.5) * 2 * catSpreadZ[ci];
      fpVel[p * 3] = 7 + Math.random() * 3;
      fpVel[p * 3 + 1] = (Math.random() - 0.5) * 0.04;
      fpVel[p * 3 + 2] = 0;
      const r = Math.random();
      // 大 cat 偶發大粒子(代表「主要公司專利」突出)
      fpSize[p] = r < 0.78 ? 0.6 + Math.random() * 0.9 : 1.8 + Math.random() * 1.4;
      fpAge[p] = 0;
      fpTotal[p] = 7 + Math.random() * 5;
    }

    // 初始化 — 每 cat 平均散布並隨機 stagger
    let fpIdx = 0;
    for (let ci = 0; ci < TOP_CATS; ci++) {
      const N = flowParticleCounts[ci];
      const cName = zOrderedCats[ci];
      const cColor = catColorMap.get(cName) || new THREE.Color(0xffffff);
      const tzCenter = cellCatCenterTz[ci] ?? 0;
      const zCenter = -WORLD_DEPTH / 2 + (tzCenter / TZ) * WORLD_DEPTH;
      const baseY = catBaseY[ci] ?? 0;
      for (let n = 0; n < N; n++) {
        fpCatIdx[fpIdx] = ci;
        spawnFlowParticle(fpIdx);
        // 隨機散開 x,避免一開始全擠在左側
        fpAge[fpIdx] = Math.random() * fpTotal[fpIdx];
        fpPos[fpIdx * 3] = -WORLD_W / 2 + Math.random() * WORLD_W * 1.1;
        fpPos[fpIdx * 3 + 1] = baseY + (Math.random() - 0.5) * 2 * catSpreadY[ci];
        fpPos[fpIdx * 3 + 2] = zCenter + (Math.random() - 0.5) * 2 * catSpreadZ[ci];
        fpCol[fpIdx * 3] = cColor.r;
        fpCol[fpIdx * 3 + 1] = cColor.g;
        fpCol[fpIdx * 3 + 2] = cColor.b;
        fpPhase[fpIdx] = Math.random() * Math.PI * 2;
        fpIdx++;
      }
    }

    const fpGeom = new THREE.BufferGeometry();
    fpGeom.setAttribute("position", new THREE.BufferAttribute(fpPos, 3));
    fpGeom.setAttribute("color", new THREE.BufferAttribute(fpCol, 3));
    fpGeom.setAttribute("size", new THREE.BufferAttribute(fpSize, 1));
    fpGeom.setAttribute("alife", new THREE.BufferAttribute(fpLife, 1));
    const fpMat = new THREE.ShaderMaterial({
      uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float size;
        attribute float alife;
        varying vec3 vColor;
        varying float vDepth;
        varying float vLife;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vLife = alife;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_PointSize = size * pixelRatio * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDepth;
        varying float vLife;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * 0.95;
          float fade = smoothstep(140.0, 12.0, vDepth);
          alpha *= fade * vLife;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const flowPoints = new THREE.Points(fpGeom, fpMat);
    scene.add(flowPoints);

    // ===== 大尺度環流(背景 Gyre)— 全域宏觀旋轉,低飽和深藍灰 =====
    //   1200 顆粒子在大橢圓軌跡上慢慢轉動,呈現「整個產業 ecosystem 的循環」感
    const GYRE_COUNT = 1200;
    const gyrePos = new Float32Array(GYRE_COUNT * 3);
    const gyreSize = new Float32Array(GYRE_COUNT);
    const gyreAngle = new Float32Array(GYRE_COUNT);
    const gyreRadiusXZ = new Float32Array(GYRE_COUNT);
    const gyreYOffset = new Float32Array(GYRE_COUNT);
    const gyreSpeed = new Float32Array(GYRE_COUNT);
    for (let i = 0; i < GYRE_COUNT; i++) {
      gyreAngle[i] = Math.random() * Math.PI * 2;
      // 軌跡半徑:大圓在外、小圓在內,分佈呈現環流厚度
      gyreRadiusXZ[i] = 25 + Math.random() * 35;
      gyreYOffset[i] = (Math.random() - 0.5) * 14;
      gyreSpeed[i] = 0.05 + Math.random() * 0.06; // 慢轉
      gyreSize[i] = Math.random() < 0.85 ? 0.4 + Math.random() * 0.5 : 1.0 + Math.random() * 0.6;
    }
    const gyreGeom = new THREE.BufferGeometry();
    gyreGeom.setAttribute("position", new THREE.BufferAttribute(gyrePos, 3));
    gyreGeom.setAttribute("size", new THREE.BufferAttribute(gyreSize, 1));
    const gyreMat = new THREE.ShaderMaterial({
      uniforms: { pixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float size;
        varying float vDepth;
        uniform float pixelRatio;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_PointSize = size * pixelRatio * (240.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * 0.28;
          float fade = smoothstep(160.0, 14.0, vDepth);
          // 深藍灰,低飽和 — Gyre 是宏觀背景,不搶戲
          gl_FragColor = vec4(0.36, 0.46, 0.62, alpha * fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const gyrePoints = new THREE.Points(gyreGeom, gyreMat);
    scene.add(gyrePoints);

    // ===== 流動粒子(500 顆,從左流向右)=====
    const PARTICLE_N = 500;
    const particlePos = new Float32Array(PARTICLE_N * 3);
    const particleSpeed: number[] = [];
    for (let p = 0; p < PARTICLE_N; p++) {
      particlePos[p * 3] = -WORLD_W / 2 + Math.random() * WORLD_W;
      particlePos[p * 3 + 1] = 0.5 + Math.random() * 8;
      particlePos[p * 3 + 2] = -WORLD_DEPTH / 2 + Math.random() * WORLD_DEPTH;
      particleSpeed.push(0.04 + Math.random() * 0.08);
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x7df9ff, size: 0.22, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);

    // ===== 流光 streaks(横向流線)=====
    // 每 cat 一條 streak,在該 cat 的 Z 中央,Y 微浮,X 從左到右循環流動
    type Streak = {
      line: THREE.Line;
      basePos: Float32Array;   // 原始 X 軌跡
      offset: number;          // 動畫 offset
      color: THREE.Color;
    };
    const streaks: Streak[] = [];
    function rebuildStreaks() {
      // 清舊
      for (const s of streaks) {
        scene.remove(s.line);
        s.line.geometry.dispose();
        (s.line.material as THREE.Material).dispose();
      }
      streaks.length = 0;
      const SEG = 40;
      stateRef.current.zOrderedCats.forEach((cat, i) => {
        const z = -WORLD_DEPTH / 2 + (cellCatCenterTz[i] / TZ) * WORLD_DEPTH;
        const positions = new Float32Array(SEG * 3);
        for (let k = 0; k < SEG; k++) {
          const x = -WORLD_W / 2 + (k / (SEG - 1)) * WORLD_W;
          positions[k * 3] = x;
          positions[k * 3 + 1] = 1.5;
          positions[k * 3 + 2] = z;
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const color = catColorMap.get(cat) || new THREE.Color(0x7df9ff);
        const mat = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const line = new THREE.Line(geom, mat);
        scene.add(line);
        streaks.push({ line, basePos: positions, offset: Math.random() * Math.PI * 2, color });
      });
    }
    rebuildStreaks();

    // ===== 時間軸 label(HTML overlay,投影到對應 X 位置)=====
    type TimeLabel = { el: HTMLDivElement; worldX: number };
    let timeLabels: TimeLabel[] = [];
    function clearTimeLabels() {
      for (const l of timeLabels) l.el.remove();
      timeLabels = [];
    }
    function rebuildTimeLabels() {
      clearTimeLabels();
      if (!_timeLabelLayer) return;
      const { range, data } = stateRef.current;
      const [start, end] = range;
      const segLen = end - start + 1;
      const xStep = WORLD_W / Math.max(1, segLen - 1);
      // 太多 tick 會擠;每 N 個 snapshot 顯示一個 label
      const skip = segLen <= 8 ? 1 : segLen <= 16 ? 2 : 3;
      for (let s = 0; s < segLen; s += skip) {
        const date = data.dates[start + s];
        const x = -WORLD_W / 2 + s * xStep;
        const el = document.createElement("div");
        el.className = "ai-currents-time-label";
        // 短日期格式:YYYY/MM
        el.textContent = date.slice(0, 7).replace("-", "/");
        _timeLabelLayer.appendChild(el);
        timeLabels.push({ el, worldX: x });
      }
      // 最後一期一定也加(若被 skip 跳掉)
      if ((segLen - 1) % skip !== 0) {
        const date = data.dates[end];
        const x = -WORLD_W / 2 + (segLen - 1) * xStep;
        const el = document.createElement("div");
        el.className = "ai-currents-time-label";
        el.textContent = date.slice(0, 7).replace("-", "/");
        _timeLabelLayer.appendChild(el);
        timeLabels.push({ el, worldX: x });
      }
    }
    rebuildTimeLabels();

    // ===== Trail =====
    function clearTrail() {
      while (trailGroup.children.length) {
        const c = trailGroup.children[0] as any;
        trailGroup.remove(c);
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      }
    }
    function showCompanyTrail(code: string) {
      clearTrail();
      const cp = companyPoints.find((c) => c.stockCode === code);
      if (!cp || cp.pathPoints.length < 2) return;
      const geom = new THREE.BufferGeometry().setFromPoints(cp.pathPoints);
      const mat = new THREE.LineBasicMaterial({
        color: 0xfde047, transparent: true, opacity: 0.95, linewidth: 2,
      });
      trailGroup.add(new THREE.Line(geom, mat));
      cp.pathPoints.forEach((pt) => {
        const dotGeom = new THREE.SphereGeometry(0.22, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({
          color: 0xfde047, transparent: true, opacity: 0.92,
        });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        dot.position.copy(pt);
        trailGroup.add(dot);
      });
    }

    // ===== 鏡頭 + OrbitControls(限範圍轉動)=====
    // 入場 zoom-in:相機從遠處慢慢拉近到 TARGET_RADIUS
    const TARGET_RADIUS = 90;
    const ENTRANCE_RADIUS = 145;
    let entranceProgress = 0; // 0..1

    // 預設視角(入場結束後)
    const initYaw = 0.18;     // azimuth
    const initPitch = 0.38;   // polar(從水平起算)
    camera.position.set(
      Math.sin(initYaw) * ENTRANCE_RADIUS * Math.cos(initPitch),
      Math.sin(initPitch) * ENTRANCE_RADIUS + 2,
      Math.cos(initYaw) * ENTRANCE_RADIUS * Math.cos(initPitch)
    );
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, _canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    // polar 限制:不允許看到地形底面(下視 90°)也不允許貼地飛(0°)
    controls.minPolarAngle = Math.PI * 0.18; // ~32°
    controls.maxPolarAngle = Math.PI * 0.5 - 0.05; // 略低於水平
    // azimuth 限制:左右各 60° 避免轉到背面看到 fog 邊
    controls.minAzimuthAngle = -Math.PI / 3;
    controls.maxAzimuthAngle = Math.PI / 3;
    controls.minDistance = 50;
    controls.maxDistance = 145;
    controls.zoomSpeed = 0.7;
    controls.rotateSpeed = 0.6;
    controls.update();

    // ===== Hover detection(只移動,不拖曳)=====
    canvas.addEventListener("pointermove", (e) => {
      const rect = _canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

      const cMeshes = companyPoints.map((c) => c.hitTarget);
      const cHits = raycaster.intersectObjects(cMeshes, false);
      if (cHits.length > 0) {
        const hit = cHits[0].object as THREE.Mesh;
        const code = hit.userData.stockCode as string;
        if (stateRef.current.hoveredKey !== "company:" + code) {
          stateRef.current.hoveredKey = "company:" + code;
          showCompanyTrail(code);
          const m = stateRef.current.data.metrics.company[code];
          setHoverInfo({
            x: e.clientX, y: e.clientY,
            entity: {
              kind: "company", key: code,
              label: hit.userData.name as string,
              total: m?.total || 0,
              persistence: m?.persistence || 0,
              slope: m?.slope || 0,
              flash: m?.flash || 0,
            },
          });
        } else {
          setHoverInfo((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
        }
        return;
      }
      const tHits = raycaster.intersectObject(terrain, false);
      if (tHits.length > 0) {
        const face = tHits[0].face;
        if (face) {
          const cat = cellDominantCat[face.a];
          if (cat) {
            if (stateRef.current.hoveredKey !== "cat:" + cat) {
              stateRef.current.hoveredKey = "cat:" + cat;
              clearTrail();
              const m = stateRef.current.data.metrics.cat[cat];
              setHoverInfo({
                x: e.clientX, y: e.clientY,
                entity: {
                  kind: "cat", key: cat, label: cat,
                  total: m?.total || 0,
                  persistence: m?.persistence || 0,
                  slope: m?.slope || 0,
                  flash: m?.flash || 0,
                },
              });
            } else {
              setHoverInfo((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
            }
            return;
          }
        }
      }
      if (stateRef.current.hoveredKey !== null) {
        stateRef.current.hoveredKey = null;
        clearTrail();
        setHoverInfo({ x: 0, y: 0, entity: null });
      }
    });
    canvas.addEventListener("pointerleave", () => {
      stateRef.current.hoveredKey = null;
      clearTrail();
      setHoverInfo({ x: 0, y: 0, entity: null });
    });

    const raycaster = new THREE.Raycaster();

    // ===== 動畫迴圈 =====
    const startTime = performance.now();
    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      const time = (performance.now() - startTime) / 1000;

      // 入場 zoom-in:1.5s 內把相機距離從 ENTRANCE_RADIUS 拉到 TARGET_RADIUS
      if (entranceProgress < 1) {
        entranceProgress = Math.min(1, time / 1.5);
        const ease = 1 - Math.pow(1 - entranceProgress, 3);
        const dir = camera.position.clone().sub(controls.target).normalize();
        const targetDist = ENTRANCE_RADIUS - (ENTRANCE_RADIUS - TARGET_RADIUS) * ease;
        camera.position.copy(controls.target).add(dir.multiplyScalar(targetDist));
      }
      controls.update();

      // focusLight 跟著時間漂移,讓水中發光點移動
      focusLight.position.x = Math.sin(time * 0.4) * 18;
      focusLight.position.z = Math.cos(time * 0.4) * 12;

      // 地形海浪(振幅縮小,避免蓋過 cat 高度差;保留細微流動感)
      const tposArr = tPos.array as Float32Array;
      for (let i = 0; i < tPos.count; i++) {
        const x = tposArr[i * 3];
        const z = tposArr[i * 3 + 2];
        const w1 = Math.sin(time * 0.85 + x * 0.16 + z * 0.20) * 0.42;
        const w2 = Math.sin(time * 1.40 + x * 0.32 - z * 0.18) * 0.22;
        const w3 = Math.cos(time * 2.10 + x * 0.55 + z * 0.42) * 0.10;
        tposArr[i * 3 + 1] = cellBaseY[i] - 1.5 + w1 + w2 + w3;
      }
      tPos.needsUpdate = true;
      terrainGeom.computeVertexNormals();

      // selectedCat / hoveredCat 高亮:
      //   - selected:該 cat 1.5× pulse;top 3 跨域相關 0.95(中亮);其他 0.30(暗)
      //   - hovered (無 selected):hover cat 2.0× pulse;其他 0.55
      // 倍率 > 1 不 clamp;搭配 emissive shader 倍率 0.45 → 亮區自發光
      const sel = stateRef.current.selectedCat;
      const hk = stateRef.current.hoveredKey;
      const hoveredCat = hk && hk.startsWith("cat:") ? hk.slice(4) : null;
      const secSet = sel ? catSecondary.get(sel) : null;
      const colorArr = (terrainGeom.attributes.color as THREE.BufferAttribute).array as Float32Array;
      const pulse = 0.9 + Math.sin(time * 2.2) * 0.1;
      const secPulse = 0.85 + Math.sin(time * 2.2 + 1.5) * 0.1;
      for (let i = 0; i < tPos.count; i++) {
        const cat = cellDominantCat[i];
        const base = cellBaseColor[i];
        let mult = 1.0;
        if (sel !== null) {
          if (cat === sel) {
            mult = 1.5 * pulse;
          } else if (cat && secSet && secSet.has(cat)) {
            mult = secPulse; // 相關 cat 中亮(微 pulse 跟主 cat 錯開)
          } else {
            mult = 0.30;
          }
        } else if (hoveredCat) {
          mult = cat === hoveredCat ? 2.0 * pulse : 0.55;
        }
        colorArr[i * 3] = base.r * mult;
        colorArr[i * 3 + 1] = base.g * mult;
        colorArr[i * 3 + 2] = base.b * mult;
      }
      (terrainGeom.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      // 公司錨點 / 里程碑(立柱 + 頂端球 + 光環 + 底座光暈)
      companyPoints.forEach((cp) => {
        const isHovered = stateRef.current.hoveredKey === "company:" + cp.stockCode;
        const isKey = sel !== null && cp.mainCatLastSnap === sel &&
          (keyCompaniesByCat.get(sel)?.has(cp.stockCode) || false);
        // 公司 mainCat 是 selected cat 的 top-3 secondary → 中亮(不全暗)
        const isSecondary = sel !== null && !!cp.mainCatLastSnap &&
          cp.mainCatLastSnap !== sel && !!secSet && secSet.has(cp.mainCatLastSnap);
        const isDimmed = sel !== null && cp.mainCatLastSnap !== sel && !isSecondary && !isHovered;

        // === 立柱 emissive ===
        const pillarMat = cp.pillar.material as THREE.MeshStandardMaterial;
        let pillarEmTarget = 0.85;
        if (isDimmed) pillarEmTarget = 0.18;
        if (isKey) pillarEmTarget = 1.4;
        if (isHovered) pillarEmTarget = 2.6;
        pillarMat.emissiveIntensity += (pillarEmTarget - pillarMat.emissiveIntensity) * 0.2;
        // 立柱整體 opacity
        const pillarOpaTarget = isDimmed ? 0.35 : 0.95;
        pillarMat.opacity += (pillarOpaTarget - pillarMat.opacity) * 0.18;

        // === 頂端光球 ===
        const capMat = cp.cap.material as THREE.MeshStandardMaterial;
        let capEmTarget = 1.4;
        if (isDimmed) capEmTarget = 0.3;
        if (isKey) capEmTarget = 2.2;
        if (isHovered) capEmTarget = 3.5;
        capMat.emissiveIntensity += (capEmTarget - capMat.emissiveIntensity) * 0.2;
        // hover 時光球放大
        const capScaleTarget = isHovered ? 1.8 : 1.0;
        const curS = cp.cap.scale.x;
        const nextS = curS + (capScaleTarget - curS) * 0.22;
        cp.cap.scale.set(nextS, nextS, nextS);

        // === 光環旋轉 + opacity ===
        cp.ring.rotation.y += (isHovered ? 0.04 : 0.012);
        const ringMat = cp.ring.material as THREE.MeshBasicMaterial;
        let ringOpaTarget = 0.55;
        if (isDimmed) ringOpaTarget = 0.18;
        if (isKey) ringOpaTarget = 0.85 + Math.sin(time * 2) * 0.1;
        if (isHovered) ringOpaTarget = 1.0;
        ringMat.opacity += (ringOpaTarget - ringMat.opacity) * 0.18;
        // hover 時環擴大
        const ringScaleTarget = isHovered ? 1.6 : 1.0;
        const curR = cp.ring.scale.x;
        const nextR = curR + (ringScaleTarget - curR) * 0.18;
        cp.ring.scale.set(nextR, 1, nextR);

        // === 底座光暈(hover/isKey 才亮)===
        const glowMat = cp.glow.material as THREE.MeshBasicMaterial;
        let glowOpacityTarget = 0;
        if (isHovered) {
          glowMat.color.setHex(0xffffff);
          glowOpacityTarget = 0.7 + Math.sin(time * 4) * 0.12;
        } else if (isKey) {
          glowMat.color.set(cp.catColor);
          glowOpacityTarget = 0.45 + Math.sin(time * 2 + cp.group.position.x * 0.5) * 0.12;
        }
        glowMat.opacity += (glowOpacityTarget - glowMat.opacity) * 0.15;
        const glowScale = isHovered ? 3.2 : (isKey ? 2.2 + Math.sin(time * 1.5) * 0.25 : 2.0);
        cp.glow.scale.set(glowScale, glowScale, glowScale);

        // === Logo board:hover/key 時放大 + opacity 升 ===
        const labelMat = cp.label.material as THREE.SpriteMaterial;
        let labelOpaTarget = 0.92;
        if (isDimmed) labelOpaTarget = 0.22;
        if (isKey) labelOpaTarget = 1.0;
        if (isHovered) labelOpaTarget = 1.0;
        labelMat.opacity += (labelOpaTarget - labelMat.opacity) * 0.18;
        const labelScale = isHovered ? 1.4 : (isKey ? 1.18 : 1);
        cp.label.scale.set(3.4 * labelScale, 2.55 * labelScale, 1);
      });

      // 大尺度環流(Gyre):粒子在大橢圓軌跡上慢慢轉動
      for (let i = 0; i < GYRE_COUNT; i++) {
        gyreAngle[i] += gyreSpeed[i] * 0.016;
        const a = gyreAngle[i];
        const r = gyreRadiusXZ[i];
        gyrePos[i * 3] = Math.cos(a) * r * 1.4;
        gyrePos[i * 3 + 1] = gyreYOffset[i] + Math.sin(a * 0.8) * 1.5;
        gyrePos[i * 3 + 2] = Math.sin(a) * r * 0.85;
      }
      (gyreGeom.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // 海洋雜訊背景:緩慢飄動 + 邊界 wrap
      const dtNoise = 0.016; // 固定 dt 簡化
      for (let i = 0; i < NOISE_COUNT; i++) {
        const i3 = i * 3;
        const seed = noiseSeed[i];
        noiseVel[i3] += (Math.sin(time * 0.4 + seed) * 0.025 - noiseVel[i3]) * 0.5 * dtNoise;
        noiseVel[i3 + 1] += (Math.cos(time * 0.3 + seed * 1.3) * 0.018 - noiseVel[i3 + 1]) * 0.5 * dtNoise;
        noisePos[i3] += noiseVel[i3] * dtNoise * 50;
        noisePos[i3 + 1] += noiseVel[i3 + 1] * dtNoise * 50;
        const xLim = WORLD_W * 0.7;
        const zLim = WORLD_DEPTH * 0.65;
        if (noisePos[i3] > xLim) noisePos[i3] = -xLim;
        if (noisePos[i3] < -xLim) noisePos[i3] = xLim;
        if (noisePos[i3 + 1] > HEIGHT_SCALE * 1.5) noisePos[i3 + 1] = -3;
        if (noisePos[i3 + 1] < -4) noisePos[i3 + 1] = HEIGHT_SCALE * 1.4;
        if (noisePos[i3 + 2] > zLim) noisePos[i3 + 2] = -zLim;
        if (noisePos[i3 + 2] < -zLim) noisePos[i3 + 2] = zLim;
      }
      (noiseGeom.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Cat 粒子流:依該 cat 的流型走不同運動
      //   - boundary:細窄、高速、x 直流(像黑潮)
      //   - eddy:螺旋圍繞中心(漩渦)
      //   - gyre:常規 sin 流動(略慢)
      const dtFlow = 0.016;
      const sec2 = stateRef.current.selectedCat;
      const sec2Set = sec2 ? catSecondary.get(sec2) : null;
      for (let p = 0; p < TOTAL_FLOW; p++) {
        const i3 = p * 3;
        const ci = fpCatIdx[p];
        const layer = catLayer[ci];
        const cName = stateRef.current.zOrderedCats[ci];
        const tzCenter = cellCatCenterTz[ci] ?? 0;
        const zCenter = -WORLD_DEPTH / 2 + (tzCenter / TZ) * WORLD_DEPTH;
        const baseY = catBaseY[ci] ?? 0;

        if (layer === "boundary") {
          // 細窄高速直流:x 速度 1.4×,y/z 振幅縮小
          const ampY = catSpreadY[ci] * 0.5;
          const ampZ = catSpreadZ[ci] * 0.4;
          const targetY = baseY + Math.sin(fpPos[i3] * 0.08 + time * 0.5 + fpPhase[p]) * ampY;
          const targetZ = zCenter + Math.sin(fpPos[i3] * 0.07 + time * 0.4 + ci * 1.3) * ampZ;
          fpPos[i3] += fpVel[i3] * dtFlow * 1.5; // 高速
          fpPos[i3 + 1] += (targetY - fpPos[i3 + 1]) * 0.12;
          fpPos[i3 + 2] += (targetZ - fpPos[i3 + 2]) * 0.12;
          fpAge[p] += dtFlow;
        } else {
          // gyre:常規 sin 流動 + 該 cat 的方向偏移(角度)
          const ampY = catSpreadY[ci] * 0.8;
          const ampZ = catSpreadZ[ci] * 0.8;
          // x 軸距離左邊界的 progress(0~1):用來累積 angle 偏移
          const xProgress = (fpPos[i3] + WORLD_W / 2) / WORLD_W;
          const angleZBias = catAngleZ[ci] * xProgress * 8; // 沿 x 累積偏移
          const angleYBias = catAngleY[ci] * xProgress * 6;
          const targetY = baseY + angleYBias +
            Math.sin(fpPos[i3] * 0.06 + time * 0.5 + fpPhase[p]) * ampY;
          const targetZ = zCenter + angleZBias +
            Math.sin(fpPos[i3] * 0.05 + time * 0.4 + ci * 1.3) * ampZ;
          fpPos[i3] += fpVel[i3] * dtFlow * 0.85; // 略慢
          fpPos[i3 + 1] += (targetY - fpPos[i3 + 1]) * 0.08;
          fpPos[i3 + 2] += (targetZ - fpPos[i3 + 2]) * 0.08;
          fpAge[p] += dtFlow;
        }

        // === 洋流交會渦旋:靠近 boundary 流時被吸 + 螺旋(eddy 現象)===
        //   小流撞上大流產生的「邊界渦」 — 同時 attraction(向中心)+ swirl(切線旋轉)
        if (layer !== "boundary" && boundaryIndices.length > 0) {
          let nearestIdx = boundaryIndices[0];
          let nearestDist2 = Infinity;
          for (const bi of boundaryIndices) {
            const bbY = catBaseY[bi];
            const bbZ = -WORLD_DEPTH / 2 + (cellCatCenterTz[bi] / TZ) * WORLD_DEPTH;
            const dy = fpPos[i3 + 1] - bbY;
            const dz = fpPos[i3 + 2] - bbZ;
            const d2 = dy * dy + dz * dz;
            if (d2 < nearestDist2) {
              nearestDist2 = d2;
              nearestIdx = bi;
            }
          }
          const PULL_RADIUS = 5.0;
          const dist = Math.sqrt(nearestDist2);
          if (dist < PULL_RADIUS) {
            const t = 1 - dist / PULL_RADIUS; // 0(邊緣)→ 1(中心)
            const bbY = catBaseY[nearestIdx];
            const bbZ = -WORLD_DEPTH / 2 + (cellCatCenterTz[nearestIdx] / TZ) * WORLD_DEPTH;
            const dy = fpPos[i3 + 1] - bbY;
            const dz = fpPos[i3 + 2] - bbZ;
            // 1) attraction 朝中心 lerp
            const pull = Math.pow(t, 1.5) * 0.12;
            // 2) swirl 切線旋轉 — 兩條洋流交會處的渦旋
            //    swirl 強度在中段最強(t≈0.5),邊緣跟貼近時都弱
            const swirlStrength = Math.sin(t * Math.PI) * 0.18;
            // 切線方向:逆時針(perpendicular to radial)
            // 旋轉中心:boundary cat 位置;粒子相對位移 (dy, dz)
            //   切線 = (-dz, dy),歸一化後乘 strength
            const r = Math.sqrt(dy * dy + dz * dz) + 1e-6;
            const tanY = -dz / r;
            const tanZ = dy / r;
            fpPos[i3 + 1] += (bbY - fpPos[i3 + 1]) * pull + tanY * swirlStrength;
            fpPos[i3 + 2] += (bbZ - fpPos[i3 + 2]) * pull + tanZ * swirlStrength;
          }
        }

        // 不再 lifecycle fade — 粒子永遠 life=1,讓洋流路徑滿滿不間斷
        //   selectedCat dim:該 cat = 1.35、secondary = 0.75、其他 = 0.18
        let strength = 1.0;
        if (sec2 !== null) {
          if (cName === sec2) strength = 1.35;
          else if (sec2Set && sec2Set.has(cName)) strength = 0.75;
          else strength = 0.18;
        }
        fpLife[p] = strength;

        // 出右邊界 → respawn 在左邊界
        if (fpPos[i3] > WORLD_W / 2 + 4) {
          spawnFlowParticle(p);
        }
      }
      (fpGeom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (fpGeom.attributes.alife as THREE.BufferAttribute).needsUpdate = true;

      // 原本的流動粒子(從左到右循環)
      for (let p = 0; p < PARTICLE_N; p++) {
        particlePos[p * 3] += particleSpeed[p];
        if (particlePos[p * 3] > WORLD_W / 2) {
          particlePos[p * 3] = -WORLD_W / 2;
          particlePos[p * 3 + 1] = 0.5 + Math.random() * 8;
          particlePos[p * 3 + 2] = -WORLD_DEPTH / 2 + Math.random() * WORLD_DEPTH;
        }
      }
      (particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // 時間 label 投影 — 每個 label 跟著相機投影到對應 X 位置
      if (_timeLabelLayer) {
        const rect = _canvas.getBoundingClientRect();
        const wrapRect = _wrap.getBoundingClientRect();
        const tmp = new THREE.Vector3();
        for (const l of timeLabels) {
          tmp.set(l.worldX, 1.5, WORLD_DEPTH / 2 + 1);  // 河面前緣
          tmp.project(camera);
          const x = (tmp.x * 0.5 + 0.5) * rect.width + (rect.left - wrapRect.left);
          const y = (1 - (tmp.y * 0.5 + 0.5)) * rect.height + (rect.top - wrapRect.top);
          l.el.style.transform = `translate(${x}px, ${y}px)`;
          l.el.style.opacity = tmp.z < 1 ? "1" : "0";
        }
      }

      // streaks:沿 X 流動 + 微 sin 浮動
      streaks.forEach((s, si) => {
        const isSelected = sel !== null && stateRef.current.zOrderedCats[si] === sel;
        const mat = s.line.material as THREE.LineBasicMaterial;
        const targetOpacity = isSelected ? 0.7 : sel === null ? 0.18 : 0.05;
        mat.opacity += (targetOpacity - mat.opacity) * 0.1;
        const pos = s.line.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        const SEG = arr.length / 3;
        for (let k = 0; k < SEG; k++) {
          const baseX = s.basePos[k * 3];
          // 沿 X 上下飄動 + 順流右移 + 循環
          const flow = ((time * 6 + s.offset * 5 + k * 0.5) % WORLD_W) - WORLD_W / 2;
          // 用 baseX 確保線條形狀完整(不要動)
          arr[k * 3] = baseX;
          arr[k * 3 + 1] = 1.5 + Math.sin(time * 1.2 + k * 0.5 + s.offset) * 0.6;
          arr[k * 3 + 2] = s.basePos[k * 3 + 2];
        }
        pos.needsUpdate = true;
      });

      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      W = _wrap.clientWidth;
      H = _wrap.clientHeight || FALLBACK_HEIGHT;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    (canvas as any).__rebuild = () => {
      rebuildTerrain();
      rebuildCompanies();
      rebuildStreaks();
      rebuildTimeLabels();
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      clearCompaniesAndTrail();
      clearTimeLabels();
      for (const s of streaks) {
        s.line.geometry.dispose();
        (s.line.material as THREE.Material).dispose();
      }
      terrainGeom.dispose();
      terrainMat.dispose();
      pGeom.dispose();
      pMat.dispose();
      noiseGeom.dispose();
      noiseMat.dispose();
      fpGeom.dispose();
      fpMat.dispose();
      gyreGeom.dispose();
      gyreMat.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c: any = canvasRef.current;
    if (c?.__rebuild) c.__rebuild();
  }, [range]);

  return (
    <>
      {/* Insight Pills — 一進站就看到 takeaway */}
      {insightPills.length > 0 && (
        <div className="ai-currents-insights">
          <span className="ai-currents-insights-label">本期觀察</span>
          <div className="ai-currents-insights-pills">
            {insightPills.map((pill) => {
              const isActive = selectedCat === pill.cat;
              return (
                <button
                  key={pill.kind}
                  type="button"
                  className={
                    "ai-currents-insight-pill " + pill.kind + (isActive ? " active" : "")
                  }
                  onClick={() => setSelectedCat(isActive ? null : pill.cat)}
                  title="點擊定位到該領域"
                >
                  <span className="pill-icon">{pill.icon}</span>
                  <span className="pill-text">
                    <span className="pill-head">{pill.headline}</span>
                    <span className="pill-detail">{pill.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="ai-currents-layout">
      {/* 左側 cat 卡片清單 */}
      <aside className="ai-currents-cats">
        <div className="ai-currents-cats-title">技術領域</div>
        <button
          type="button"
          className={"ai-currents-cat-card all" + (selectedCat === null ? " active" : "")}
          onClick={() => setSelectedCat(null)}
        >
          <span className="cat-name">全部顯示</span>
          <span className="cat-meta">{topCatNames.length} 類別</span>
        </button>
        {catCardData.map(({ name, color, m }, idx) => {
          const slope = m.slope;
          const trendIcon = slope > 0.5 ? "↑" : slope < -0.5 ? "↓" : "—";
          const trendCls = slope > 0.5 ? "up" : slope < -0.5 ? "down" : "";
          const isActive = selectedCat === name;
          return (
            <button
              key={name}
              type="button"
              className={"ai-currents-cat-card" + (isActive ? " active" : "")}
              style={{ animationDelay: `${30 + idx * 40}ms` }}
              onClick={() => setSelectedCat(isActive ? null : name)}
            >
              <span
                className="cat-dot"
                style={{
                  background: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
                }}
              />
              <span className="cat-info">
                <span className="cat-name">{name}</span>
                <span className="cat-meta">
                  <span className={"cat-trend " + trendCls}>{trendIcon}</span>
                  <span className="cat-total">{m.total}</span>
                  <span className="cat-pers">{Math.round(m.persistence * 100)}%</span>
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      {/* 右側畫布 */}
      <div className="ai-currents-canvas-col">
        <div className="ai-concept-toolbar">
          <span className="ai-concept-title-inline">Patent Ocean Terrain · 海洋地形</span>
          <div className="ai-concept-range">
            <span className="ai-concept-range-label">範圍</span>
            <span className="ai-concept-range-date">{data.dates[range[0]]}</span>
            <input
              type="range"
              min={0}
              max={data.dates.length - 1}
              value={range[0]}
              onChange={(e) => {
                const v = +e.target.value;
                setRange(([, e2]) => [Math.min(v, e2), e2]);
              }}
            />
            <input
              type="range"
              min={0}
              max={data.dates.length - 1}
              value={range[1]}
              onChange={(e) => {
                const v = +e.target.value;
                setRange(([s]) => [s, Math.max(v, s)]);
              }}
            />
            <span className="ai-concept-range-date">{data.dates[range[1]]}</span>
          </div>
        </div>

        <div
          ref={wrapRef}
          className="ai-concept-chart ai-currents-3d-wrap"
          style={{ position: "relative" }}
        >
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

          {hoverInfo.entity && (
            <div className="ai-currents-tooltip" style={{ left: hoverInfo.x + 14, top: hoverInfo.y + 14 }}>
              <div className="tt-name">
                {hoverInfo.entity.label}
                <span className="tt-kind">{hoverInfo.entity.kind === "cat" ? "技術類別" : "公司"}</span>
              </div>
              <div className="tt-stats">
                <div><span>累計</span><strong>{hoverInfo.entity.total}</strong></div>
                <div><span>持續性</span><strong>{Math.round(hoverInfo.entity.persistence * 100)}%</strong></div>
                <div>
                  <span>趨勢</span>
                  <strong className={hoverInfo.entity.slope > 0 ? "up" : hoverInfo.entity.slope < 0 ? "down" : ""}>
                    {hoverInfo.entity.slope > 0.5 ? "↑" : hoverInfo.entity.slope < -0.5 ? "↓" : "—"}
                    &nbsp;{hoverInfo.entity.slope.toFixed(1)}
                  </strong>
                </div>
                <div><span>集中度</span><strong>{Math.round(hoverInfo.entity.flash * 100)}%</strong></div>
              </div>
              {hoverInfo.entity.flash > 0.6 && hoverInfo.entity.persistence < 0.5 && (
                <div className="tt-tag flash">✦ 曇花一現</div>
              )}
              {hoverInfo.entity.persistence > 0.7 && hoverInfo.entity.slope >= 0 && (
                <div className="tt-tag steady">⭐ 核心穩健</div>
              )}
            </div>
          )}
        </div>

        <div className="ai-concept-legend">
          <span className="legend-item">隆起高度 = 該類別在當期的專利量</span>
          <span className="legend-item">拖曳轉動視角 · 滾輪縮放</span>
          <span className="legend-item">點左側類別卡 / 上方 Pill → 該領域亮起</span>
          <span className="legend-item">滑進公司白點 → 黃色軌跡顯示跨類別歷程</span>
        </div>
      </div>
      </div>
    </>
  );
}
