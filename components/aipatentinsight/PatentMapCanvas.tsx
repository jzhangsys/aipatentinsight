"use client";

/**
 * PatentMapCanvas — 公司專利 3D 點雲(Three.js)
 *
 * 視覺風格:宇宙星圖 — 每個公司是一顆星(亮核 + 柔光暈),
 * 用 AdditiveBlending 讓密集區域疊出星雲般的發光感,顏色按 main category 區分。
 *
 * 收到 dataset / 篩選 / layout 模式 props 後:
 * 1. 建 Three.js 場景 + 自訂 shader 點雲(亮核 + halo + focus 變暗)
 * 2. 跑 random / force layout(後者 chunked async,有進度 toast)
 * 3. layout 切換時用 ease-out cubic lerp 700ms 過渡點位
 * 4. hover 顯示 tooltip + 280ms 後拉跨域連線
 * 5. click 觸發 onCompanyClick → 直接導去公司頁
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  computeRandomLayout,
  computeForceLayout,
  type LayoutCompany,
} from "@/lib/aipatentinsight/patentMapLayout";
import type { InsightsDataset } from "@/lib/aipatentinsight/insightsData";

export type PatentMapLayout = "random" | "force";

type CompanyClickPayload = {
  name: string;
  /** 在當前 visibleCompanies 中的索引(parent 不需要,但留著方便 debug) */
  idx: number;
};

type Props = {
  /** insights 全資料(由 parent 透過 loadInsights() 拿到) */
  dataset: InsightsDataset;
  /** 篩選某月份(YYYY-MM)或 "all" 累積到該月 */
  selectedMonth: string | "all";
  /** monthly = 只看該月新增 / cumulative = 看到該月為止累積 */
  mode: "cumulative" | "monthly";
  /** main / branch / decline / all */
  branch: "all" | "main" | "branch" | "decline";
  /** Layout 模式 */
  layout: PatentMapLayout;
  /** Legend 點選的 category(null = 無聚焦) */
  activeCategory: string | null;
  /** category → hex 顏色對照表 */
  palette: Record<string, string>;
  /** 由 parent 控制的高亮公司名;null = 無聚焦 */
  highlightedCompanyName: string | null;
  /** 點擊公司 callback */
  onCompanyClick: (payload: CompanyClickPayload) => void;
  /** 篩選後可見公司清單變化(parent 用來更新 stats / 公司清單面板) */
  onVisibleCompaniesChange: (companies: LayoutCompany[]) => void;
};

// ============== 工具:把 hex (#RRGGBB) 轉 THREE.Color ==============
function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

// ============== Tooltip donut + cat list builders ==============
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** 用 categoryDist 畫 80x80 的 donut svg 字串(各段 = 該 cat palette 色)。 */
function buildDonutSvg(
  dist: Record<string, number>,
  palette: Record<string, string>
): string {
  const cx = 40, cy = 40, r1 = 36, r0 = 20;
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  if (total === 0) return "";
  const entries = Object.entries(dist)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  // 單一 cat = 滿環(避免 sweep=2π 退化成空 path)
  if (entries.length === 1) {
    const color = palette[entries[0][0]] || "#888";
    return `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><path fill="${color}" fill-rule="evenodd" d="M ${cx - r1} ${cy} a ${r1} ${r1} 0 1 0 ${r1 * 2} 0 a ${r1} ${r1} 0 1 0 -${r1 * 2} 0 M ${cx - r0} ${cy} a ${r0} ${r0} 0 1 1 ${r0 * 2} 0 a ${r0} ${r0} 0 1 1 -${r0 * 2} 0 Z" /></svg>`;
  }

  let startAngle = -Math.PI / 2;
  const paths: string[] = [];
  for (const [cat, count] of entries) {
    const fraction = count / total;
    const endAngle = startAngle + fraction * Math.PI * 2;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const x1 = cx + r1 * Math.cos(startAngle);
    const y1 = cy + r1 * Math.sin(startAngle);
    const x2 = cx + r1 * Math.cos(endAngle);
    const y2 = cy + r1 * Math.sin(endAngle);
    const x3 = cx + r0 * Math.cos(endAngle);
    const y3 = cy + r0 * Math.sin(endAngle);
    const x4 = cx + r0 * Math.cos(startAngle);
    const y4 = cy + r0 * Math.sin(startAngle);
    const color = palette[cat] || "#888";
    paths.push(
      `<path fill="${color}" d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r1} ${r1} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r0} ${r0} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z" />`
    );
    startAngle = endAngle;
  }
  return `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">${paths.join("")}</svg>`;
}

/** 用 categoryDist 畫右側 cat 列表(top 5 + 其他合併行)。 */
/**
 * 把比例格式化:
 *  - >= 10%   → 整數("23%")
 *  - 1-10%    → 1 位小數("3.5%")
 *  - 0.01-1%  → 2 位小數("0.45%")
 *  - < 0.01%  → 回 null,代表「太低,不顯示」
 */
function formatPct(n: number, total: number): string | null {
  const raw = (n / total) * 100;
  if (raw >= 10) return Math.round(raw) + "%";
  if (raw >= 1) return raw.toFixed(1) + "%";
  if (raw >= 0.01) return raw.toFixed(2) + "%";
  return null; // 太低,捨去
}

function buildCatListHtml(
  dist: Record<string, number>,
  palette: Record<string, string>
): string {
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  if (total === 0) return "";
  // 按 count 降序,且 filter 掉佔比 < 0.01% 的(一律不顯示)
  const entries = Object.entries(dist)
    .filter(([, n]) => n > 0 && (n / total) * 100 >= 0.01)
    .sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 5);
  const rest = entries.slice(5);
  const restCount = rest.reduce((s, [, n]) => s + n, 0);

  const rows: string[] = [];
  for (const [cat, n] of top) {
    const pct = formatPct(n, total);
    if (!pct) continue;
    const color = palette[cat] || "#888";
    rows.push(
      `<div class="ai-map-tt-row"><span class="ai-map-tt-dot" style="background:${color}"></span><span class="ai-map-tt-cat">${escapeHtml(cat)}</span><span class="ai-map-tt-pct">${pct}</span></div>`
    );
  }
  if (restCount > 0) {
    const pct = formatPct(restCount, total);
    if (pct) {
      rows.push(
        `<div class="ai-map-tt-row ai-map-tt-row-rest"><span class="ai-map-tt-dot"></span><span class="ai-map-tt-cat">其他 ${rest.length} 類</span><span class="ai-map-tt-pct">${pct}</span></div>`
      );
    }
  }
  return rows.join("");
}

export default function PatentMapCanvas({
  dataset,
  selectedMonth,
  mode,
  branch,
  layout,
  activeCategory,
  palette,
  highlightedCompanyName,
  onCompanyClick,
  onVisibleCompaniesChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const toastProgressRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const focusLabelsContainerRef = useRef<HTMLDivElement | null>(null);

  // 把所有可變狀態包進 ref,讓 useEffect 內的 closure 可隨時讀到最新值,
  // 而不需把每個 props 都做為 useEffect 的依賴(避免整個場景被重建)。
  const stateRef = useRef({
    dataset,
    selectedMonth,
    mode,
    branch,
    layout,
    activeCategory,
    palette,
    onCompanyClick,
    onVisibleCompaniesChange,
  });
  stateRef.current = {
    dataset,
    selectedMonth,
    mode,
    branch,
    layout,
    activeCategory,
    palette,
    onCompanyClick,
    onVisibleCompaniesChange,
  };

  // 用 ref 持有 imperative 控制函式(由 useEffect 設定),其他 effect 觸發
  const apiRef = useRef<{
    refresh: () => void;
    focusCategory: (cat: string | null) => void;
    focusByName: (name: string | null) => void;
    clearFocus: () => void;
  } | null>(null);

  // ============== 主 effect:建 Three.js 場景 + 動畫迴圈 ==============
  useEffect(() => {
    const canvas = canvasRef.current;
    const toastEl = toastRef.current;
    const toastProgressEl = toastProgressRef.current;
    const tooltipEl = tooltipRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040c, 0.006);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    camera.position.set(0, 0, 80);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // ===== 背景雜訊 =====
    const NOISE_COUNT = 600;
    const noisePos = new Float32Array(NOISE_COUNT * 3);
    const noiseSize = new Float32Array(NOISE_COUNT);
    for (let i = 0; i < NOISE_COUNT; i++) {
      noisePos[i * 3]     = (Math.random() - 0.5) * 160;
      noisePos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      noisePos[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;
      noiseSize[i] =
        Math.random() < 0.85 ? 0.3 + Math.random() * 0.4 : 0.7 + Math.random() * 0.4;
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
          float alpha = smoothstep(0.5, 0.1, d) * 0.18;
          float fade = smoothstep(180.0, 30.0, vDepth);
          gl_FragColor = vec4(0.45, 0.58, 0.78, alpha * fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    scene.add(new THREE.Points(noiseGeom, noiseMat));

    // ===== 公司點雲 =====
    let companyPoints: THREE.Points | null = null;
    let companySizes: Float32Array | null = null;
    let companyOriginalSizes: Float32Array | null = null;
    let visibleCompanies: LayoutCompany[] = [];
    let focusLines: THREE.LineSegments | null = null;
    // Focus labels:hover 時為每條 line 終點放一個 HTML 文字標籤(cat 名 + %)
    let focusLabels: { centroid: THREE.Vector3; el: HTMLDivElement }[] = [];
    let hoverHighlightTimer: ReturnType<typeof setTimeout> | null = null;
    let positionTween:
      | { startPos: Float32Array; endPos: Float32Array; t0: number; duration: number }
      | null = null;
    let buildId = 0;

    // ===== Compute toast 控制 =====
    let toastDelay: ReturnType<typeof setTimeout> | null = null;
    function showToast(text: string) {
      if (!toastEl) return;
      if (toastDelay) clearTimeout(toastDelay);
      const labelEl = toastEl.querySelector(".ai-map-toast-text");
      if (labelEl) labelEl.textContent = text;
      if (toastProgressEl) toastProgressEl.textContent = "";
      toastDelay = setTimeout(() => toastEl.classList.add("show"), 80);
    }
    function updateToast(progress: string) {
      if (toastProgressEl) toastProgressEl.textContent = progress;
    }
    function hideToast() {
      if (!toastEl) return;
      if (toastDelay) { clearTimeout(toastDelay); toastDelay = null; }
      toastEl.classList.remove("show");
    }

    // ===== 重建公司圖譜(篩選改變或 layout 切換時) =====
    async function rebuildGraph() {
      const { dataset: ds, selectedMonth: month, mode: m, branch: br, layout: ly, palette: pal } = stateRef.current;
      const myId = ++buildId;

      // 1. 篩選 patents
      let filtered = ds.patents;
      if (month !== "all") {
        if (m === "monthly") filtered = filtered.filter((p) => p.month === month);
        else filtered = filtered.filter((p) => p.month <= month);
      }
      if (br !== "all") filtered = filtered.filter((p) => p.branch === br);

      // 2. 聚合成公司(帶 categoryDist 給 ring shader 用)
      const companyMap = new Map<string, LayoutCompany & { _patents: number }>();
      for (const p of filtered) {
        let entry = companyMap.get(p.company);
        if (!entry) {
          const orig = ds.companies.find((c) => c.name === p.company);
          if (!orig) continue;
          entry = {
            name: orig.name,
            mainCategory: orig.mainCategory,
            totalPatents: orig.totalPatents,
            categoryDist: orig.categoryDist,
            displayPatents: 0,
            _patents: 0,
          };
          companyMap.set(p.company, entry);
        }
        entry.displayPatents++;
        entry._patents++;
      }

      let visibleArr: LayoutCompany[] = Array.from(companyMap.values());

      // 3. 抓舊位置(以 name 為 key)— 切 layout 時做 tween
      const oldPositionsByName: Record<string, { x: number; y: number; z: number }> = {};
      if (companyPoints && visibleCompanies.length > 0) {
        const oldArr = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        visibleCompanies.forEach((c, i) => {
          oldPositionsByName[c.name] = {
            x: oldArr[i * 3],
            y: oldArr[i * 3 + 1],
            z: oldArr[i * 3 + 2],
          };
        });
      }

      // 4. 清舊資源
      if (companyPoints) {
        scene.remove(companyPoints);
        companyPoints.geometry.dispose();
        (companyPoints.material as THREE.Material).dispose();
        companyPoints = null;
      }
      if (focusLines) {
        scene.remove(focusLines);
        focusLines.geometry.dispose();
        (focusLines.material as THREE.Material).dispose();
        focusLines = null;
      }
      positionTween = null;

      if (visibleArr.length === 0) {
        hideToast();
        visibleCompanies = [];
        stateRef.current.onVisibleCompaniesChange([]);
        return;
      }

      // 5. 算 layout
      const sortedCats = [...ds.categories].sort((a, b) => {
        // 用該 cat 在 visibleArr 的公司數排序(多的在前)
        const ca = visibleArr.filter((c) => c.mainCategory === a).length;
        const cb = visibleArr.filter((c) => c.mainCategory === b).length;
        return cb - ca;
      });

      let layoutResult;
      if (ly === "force") {
        showToast("Computing force layout");
        layoutResult = await computeForceLayout(visibleArr, sortedCats, {
          onProgress: (step, total) => {
            if (myId === buildId) updateToast(`${Math.round((step / total) * 100)}%`);
          },
          isCancelled: () => myId !== buildId,
        });
        hideToast();
        if (myId !== buildId) return;
      } else {
        layoutResult = computeRandomLayout(visibleArr, sortedCats);
      }

      visibleCompanies = layoutResult.orderedCompanies;
      const N = visibleCompanies.length;

      // 6. 建 geometry buffers
      const positions = new Float32Array(N * 3);
      const targetPositions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      companySizes = new Float32Array(N);
      companyOriginalSizes = new Float32Array(N);

      let needsTween = false;
      visibleCompanies.forEach((company, i) => {
        const p = layoutResult.positions[i];
        targetPositions[i * 3]     = p.x;
        targetPositions[i * 3 + 1] = p.y;
        targetPositions[i * 3 + 2] = p.z;

        const old = oldPositionsByName[company.name];
        if (old) {
          positions[i * 3]     = old.x;
          positions[i * 3 + 1] = old.y;
          positions[i * 3 + 2] = old.z;
          if (
            Math.abs(old.x - p.x) > 0.01 ||
            Math.abs(old.y - p.y) > 0.01 ||
            Math.abs(old.z - p.z) > 0.01
          ) {
            needsTween = true;
          }
        } else {
          positions[i * 3]     = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
        }

        const color = hexToThreeColor(pal[company.mainCategory] || "#CCCCCC");
        colors[i * 3]     = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // size 比之前再縮小一點 — 「星圖」感:單顆星不要太大,密集的點才像宇宙
        const s = Math.min(13, 2.6 + Math.sqrt(company.displayPatents) * 1.0);
        companyOriginalSizes![i] = s;
        companySizes![i] = s;
      });

      if (needsTween) {
        positionTween = {
          startPos: positions.slice(),
          endPos: targetPositions,
          t0: performance.now(),
          duration: 700,
        };
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geom.setAttribute("size", new THREE.BufferAttribute(companySizes, 1));

      // 「宇宙星圖」shader — 小亮核 + 柔光暈,純色相區分 cat。
      // 用 AdditiveBlending 讓鄰近點疊加時更亮,模擬星團密集區的發光感。
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          pixelRatio: { value: renderer.getPixelRatio() },
          focusIdx: { value: -1.0 },
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          varying float vDepth;
          varying float vDim;
          uniform float pixelRatio;
          uniform float focusIdx;
          void main() {
            vColor = color;
            float vid = float(gl_VertexID);
            vDim = (focusIdx >= 0.0 && abs(vid - focusIdx) > 0.5) ? 0.20 : 1.0;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mv.z;
            // 點點大小:近看大、遠看小,但因為用 AdditiveBlending 所以給比較大的 halo radius
            gl_PointSize = size * pixelRatio * (180.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vDepth;
          varying float vDim;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float d = length(c);
            if (d > 0.5) discard;

            // 深度淡出 — 遠處的星淡到背景裡
            float fade = smoothstep(220.0, 15.0, vDepth);

            // 中心亮核:極亮的小白點(d<0.04 才白,範圍縮小才不會把 cat 色洗掉)
            float core = smoothstep(0.04, 0.0, d);
            // 主體:從中心往外的柔軟光暈,quadratic falloff 像高斯星點
            float body = pow(1.0 - smoothstep(0.0, 0.5, d), 2.2);
            // 外圍 halo:更柔軟的擴散光,讓星看起來會「發光」
            float halo = pow(1.0 - smoothstep(0.0, 0.5, d), 5.0) * 0.65;

            // 顏色:核心微白(0.55 而不是 0.9),外圍維持飽和 cat 色,
            // 這樣即使在 AdditiveBlending 下也能保留色相識別度
            vec3 col = mix(vColor, vec3(1.0, 0.97, 0.92), core * 0.55);

            // 整體 alpha — 降一點 core 權重免得疊加處全變白
            float alpha = (body * 0.85 + halo + core * 0.9) * fade * vDim;

            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        // Additive blending:點點重疊處變亮 — 像星雲、星團密集區的發光感
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      });

      companyPoints = new THREE.Points(geom, mat);
      scene.add(companyPoints);

      stateRef.current.onVisibleCompaniesChange(visibleCompanies);
    }

    // ===== 焦點連線(跨 cat — 展現該公司的「次要技術領域」分布) =====
    // 從焦點公司連到 categoryDist 中前 5 個次要 category 的質心,
    // 線色 = 該 cat palette、alpha 漸層(近端暗 → 遠端亮)
    // 視覺意義:「這家公司除了主業,還跨足哪些領域」
    function showFocusLines(centerIdx: number) {
      if (focusLines) {
        scene.remove(focusLines);
        focusLines.geometry.dispose();
        (focusLines.material as THREE.Material).dispose();
        focusLines = null;
      }
      if (centerIdx < 0 || !companyPoints) return;
      const positions = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const cx = positions[centerIdx * 3];
      const cy = positions[centerIdx * 3 + 1];
      const cz = positions[centerIdx * 3 + 2];

      // 從 dataset 抓焦點公司的 categoryDist
      const focusName = visibleCompanies[centerIdx].name;
      const ds = stateRef.current.dataset;
      const focusCompany = ds.companies.find((c) => c.name === focusName);
      if (!focusCompany) return;

      const mainCat = focusCompany.mainCategory;
      const dist = focusCompany.categoryDist || {};

      // 取除 mainCategory 外的次要 cat,依該公司在該 cat 的專利數排序,取前 5
      const secondary = Object.entries(dist)
        .filter(([cat, count]) => cat !== mainCat && count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (secondary.length === 0) return;

      // 為每個 secondary cat 計算當前 visible 中該 cat 的質心
      const lines: {
        cx2: number; cy2: number; cz2: number;
        color: THREE.Color;
      }[] = [];

      for (const [cat] of secondary) {
        let sx = 0, sy = 0, sz = 0, n = 0;
        visibleCompanies.forEach((c, i) => {
          if (c.mainCategory === cat) {
            sx += positions[i * 3];
            sy += positions[i * 3 + 1];
            sz += positions[i * 3 + 2];
            n++;
          }
        });
        if (n === 0) continue; // 該 cat 在當前篩選下無 visible 公司
        lines.push({
          cx2: sx / n,
          cy2: sy / n,
          cz2: sz / n,
          color: hexToThreeColor(stateRef.current.palette[cat] || "#CCCCCC"),
        });
      }

      if (lines.length === 0) return;

      const linePos = new Float32Array(lines.length * 6);
      const lineCol = new Float32Array(lines.length * 6);
      lines.forEach((ln, i) => {
        // 起點(focus 端):暗一點
        linePos[i * 6]     = cx;
        linePos[i * 6 + 1] = cy;
        linePos[i * 6 + 2] = cz;
        lineCol[i * 6]     = ln.color.r * 0.25;
        lineCol[i * 6 + 1] = ln.color.g * 0.25;
        lineCol[i * 6 + 2] = ln.color.b * 0.25;
        // 終點(centroid):飽和
        linePos[i * 6 + 3] = ln.cx2;
        linePos[i * 6 + 4] = ln.cy2;
        linePos[i * 6 + 5] = ln.cz2;
        lineCol[i * 6 + 3] = ln.color.r;
        lineCol[i * 6 + 4] = ln.color.g;
        lineCol[i * 6 + 5] = ln.color.b;
      });

      const lg = new THREE.BufferGeometry();
      lg.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
      lg.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
      const lm = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      focusLines = new THREE.LineSegments(lg, lm);
      scene.add(focusLines);
    }

    // ===== Hover focus lines + endpoint labels =====
    // hover 公司 → 從該公司拉線到每個 secondary cat 的 cluster centroid,
    // 線終點放一個 HTML 標籤顯示 cat 名 + 該公司在該 cat 的比例。
    // 標籤色 = 線色 = palette[cat],用戶能直接對應到 tooltip donut 的色塊。
    // 標籤跟 centroid 用 vec3 綁定,在 animate loop 內 project 到 screen 座標,
    // 鏡頭旋轉 / 縮放時標籤跟著群移動。
    function showHoverFocusLinesAndLabels(centerIdx: number) {
      clearHoverFocusLinesAndLabels();
      if (centerIdx < 0 || !companyPoints) return;
      const positions = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const focusName = visibleCompanies[centerIdx].name;
      const ds = stateRef.current.dataset;
      const focusCompany = ds.companies.find((c) => c.name === focusName);
      if (!focusCompany) return;

      const cx = positions[centerIdx * 3];
      const cy = positions[centerIdx * 3 + 1];
      const cz = positions[centerIdx * 3 + 2];

      const totalPatents = focusCompany.totalPatents || 1;
      const dist = focusCompany.categoryDist || {};
      const mainCat = focusCompany.mainCategory;
      // top 5 secondary cat,按比例排序(只挑真正跨領域多的)
      const secondary = Object.entries(dist)
        .filter(([cat, count]) => cat !== mainCat && count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (secondary.length === 0) return;

      type Line = {
        cat: string;
        count: number;
        cx2: number; cy2: number; cz2: number;
        color: THREE.Color;
      };
      const lines: Line[] = [];
      for (const [cat, count] of secondary) {
        let sx = 0, sy = 0, sz = 0, n = 0;
        visibleCompanies.forEach((co, i) => {
          if (co.mainCategory === cat) {
            sx += positions[i * 3];
            sy += positions[i * 3 + 1];
            sz += positions[i * 3 + 2];
            n++;
          }
        });
        if (n === 0) continue;
        lines.push({
          cat,
          count,
          cx2: sx / n,
          cy2: sy / n,
          cz2: sz / n,
          color: hexToThreeColor(stateRef.current.palette[cat] || "#CCCCCC"),
        });
      }
      if (lines.length === 0) return;

      // ---- 3D lines ----
      const linePos = new Float32Array(lines.length * 6);
      const lineCol = new Float32Array(lines.length * 6);
      lines.forEach((ln, i) => {
        linePos[i * 6]     = cx;
        linePos[i * 6 + 1] = cy;
        linePos[i * 6 + 2] = cz;
        // 起點(focus 端)暗一點,終點(centroid)飽和 — 暗示「方向」
        lineCol[i * 6]     = ln.color.r * 0.3;
        lineCol[i * 6 + 1] = ln.color.g * 0.3;
        lineCol[i * 6 + 2] = ln.color.b * 0.3;
        linePos[i * 6 + 3] = ln.cx2;
        linePos[i * 6 + 4] = ln.cy2;
        linePos[i * 6 + 5] = ln.cz2;
        lineCol[i * 6 + 3] = ln.color.r;
        lineCol[i * 6 + 4] = ln.color.g;
        lineCol[i * 6 + 5] = ln.color.b;
      });
      const lg = new THREE.BufferGeometry();
      lg.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
      lg.setAttribute("color", new THREE.BufferAttribute(lineCol, 3));
      const lm = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      focusLines = new THREE.LineSegments(lg, lm);
      scene.add(focusLines);

      // ---- HTML labels at line endpoints ----
      const container = focusLabelsContainerRef.current;
      if (!container) return;
      for (const ln of lines) {
        const pct = Math.round((ln.count / totalPatents) * 100);
        const hex =
          "#" +
          [ln.color.r, ln.color.g, ln.color.b]
            .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase();
        const el = document.createElement("div");
        el.className = "ai-map-focus-label";
        el.style.borderColor = hex;
        el.style.color = hex;
        el.innerHTML = `<span class="ai-map-focus-label-dot" style="background:${hex}"></span><span class="ai-map-focus-label-cat">${escapeHtml(ln.cat)}</span><span class="ai-map-focus-label-pct">${pct}%</span>`;
        container.appendChild(el);
        focusLabels.push({
          centroid: new THREE.Vector3(ln.cx2, ln.cy2, ln.cz2),
          el,
        });
      }

      // 線剛畫好 → 立刻挑最少線通過的象限放 tooltip(處理「hover 後停住」的 case)
      lockedQuadrant = null; // 強制重算
      repositionTooltip();
    }

    function clearHoverFocusLinesAndLabels() {
      if (hoverHighlightTimer) {
        clearTimeout(hoverHighlightTimer);
        hoverHighlightTimer = null;
      }
      if (focusLines) {
        scene.remove(focusLines);
        focusLines.geometry.dispose();
        (focusLines.material as THREE.Material).dispose();
        focusLines = null;
      }
      for (const lab of focusLabels) {
        lab.el.remove();
      }
      focusLabels = [];
      // 沒線了 → 解鎖,讓下一次 hover 從預設 SE 開始
      lockedQuadrant = null;
    }

    // ===== 鏡頭控制(統一 Pointer Events:支援 mouse / touch / pen) =====
    let isDragging = false;
    let didDrag = false;
    const dragStart = { x: 0, y: 0 };
    // v2.3:cat 分群佈局後 masterRadius 動態(~30~85),拉遠初始距離 + 放寬縮放範圍
    const cameraState = { x: 0, y: 0, distance: 110 };
    const cameraTarget = { x: 0, y: 0, distance: 110 };

    // 多 pointer 追蹤:單指 = 拖曳,雙指 = pinch zoom + 中心點 pan
    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDistance: number | null = null;
    let lastPinchCentroid: { x: number; y: number } | null = null;

    function pinchInfo(): { dist: number; cx: number; cy: number } | null {
      const pts = [...activePointers.values()];
      if (pts.length < 2) return null;
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      return {
        dist,
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
      };
    }

    // ===== Hover + Click(raycaster 共用) =====
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points!.threshold = 1.2;
    const mouseNDC = new THREE.Vector2();
    let hoveredIdx = -1;
    let lastCursorX = 0;
    let lastCursorY = 0;
    // 鎖定的 tooltip 象限 — 在 lines 顯示後就不要每次 pointermove 都跳,避免 jitter
    let lockedQuadrant: "SE" | "NE" | "SW" | "NW" | null = null;

    /**
     * 把 tooltip 擺在「沒被 focus 線穿過」的象限。
     * 邏輯:從 cursor 為圓心,把每條線(到 secondary cat centroid 的螢幕投影)
     *      所在的象限計數,挑線數最少的象限放 tooltip。
     * 若 lockedQuadrant 已設(focus lines 顯示中) → 直接用,避免 cursor 微動就跳。
     */
    function repositionTooltip() {
      if (!tooltipEl) return;
      const tw = tooltipEl.offsetWidth || 268;
      const th = tooltipEl.offsetHeight || 160;
      const pad = 14;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 決定象限
      let quadrant: "SE" | "NE" | "SW" | "NW";
      if (lockedQuadrant) {
        quadrant = lockedQuadrant;
      } else if (focusLabels.length > 0 && canvas) {
        // 還沒鎖,但已經有 lines → 算一次
        quadrant = pickBestQuadrant();
        lockedQuadrant = quadrant;
      } else {
        // 沒 lines → 預設 SE
        quadrant = "SE";
      }

      let left: number, top: number;
      switch (quadrant) {
        case "SE":
          left = lastCursorX + pad;
          top = lastCursorY + pad;
          break;
        case "NE":
          left = lastCursorX + pad;
          top = lastCursorY - pad - th;
          break;
        case "SW":
          left = lastCursorX - pad - tw;
          top = lastCursorY + pad;
          break;
        case "NW":
          left = lastCursorX - pad - tw;
          top = lastCursorY - pad - th;
          break;
      }
      // 邊界 clamp(永遠不出視窗)
      left = Math.max(8, Math.min(vw - tw - 8, left));
      top = Math.max(8, Math.min(vh - th - 8, top));
      tooltipEl.style.left = left + "px";
      tooltipEl.style.top = top + "px";
    }

    /** 算每個象限有幾條線,回傳線最少的那個。tie-break 偏好 SE。 */
    function pickBestQuadrant(): "SE" | "NE" | "SW" | "NW" {
      if (!canvas || focusLabels.length === 0) return "SE";
      const rect = canvas.getBoundingClientRect();
      const counts = { SE: 0, NE: 0, SW: 0, NW: 0 };
      for (const lab of focusLabels) {
        const v = lab.centroid.clone().project(camera);
        if (v.z > 1) continue; // 在相機後方,不算
        const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (1 - (v.y * 0.5 + 0.5)) * rect.height;
        const dx = sx - lastCursorX;
        const dy = sy - lastCursorY;
        if (dx >= 0 && dy >= 0) counts.SE++;
        else if (dx >= 0 && dy < 0) counts.NE++;
        else if (dx < 0 && dy >= 0) counts.SW++;
        else counts.NW++;
      }
      // 順序偏好:SE → SW → NE → NW(預設右下,然後逆時針嘗試)
      const order: ("SE" | "SW" | "NE" | "NW")[] = ["SE", "SW", "NE", "NW"];
      let best: "SE" | "NE" | "SW" | "NW" = "SE";
      for (const q of order) if (counts[q] < counts[best]) best = q;
      return best;
    }

    const onPointerDown = (e: PointerEvent) => {
      // 阻止瀏覽器預設(避免雙指縮放整個頁面)
      if (e.pointerType !== "mouse") e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size === 1) {
        isDragging = true;
        didDrag = false;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
      } else if (activePointers.size === 2) {
        // 進入 pinch 模式 — 取消單指 drag
        isDragging = false;
        didDrag = true; // 防止多指放開時誤觸 click
        const info = pinchInfo();
        if (info) {
          lastPinchDistance = info.dist;
          lastPinchCentroid = { x: info.cx, y: info.cy };
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      // 更新 pointer 位置
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // === 雙指 pinch:zoom + pan ===
      if (activePointers.size >= 2) {
        const info = pinchInfo();
        if (info && lastPinchDistance && info.dist > 0) {
          // distance 變大 = 放大 = distance 變小
          const ratio = lastPinchDistance / info.dist;
          cameraTarget.distance = Math.max(
            25,
            Math.min(220, cameraTarget.distance * ratio)
          );
        }
        if (info && lastPinchCentroid) {
          const dx = info.cx - lastPinchCentroid.x;
          const dy = info.cy - lastPinchCentroid.y;
          const speed = 0.08 * (cameraTarget.distance / 80);
          cameraTarget.x -= dx * speed;
          cameraTarget.y += dy * speed;
        }
        if (info) {
          lastPinchDistance = info.dist;
          lastPinchCentroid = { x: info.cx, y: info.cy };
        }
        return;
      }

      // === 單指 drag ===
      if (activePointers.size === 1 && isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
        const speed = 0.08 * (cameraTarget.distance / 80);
        cameraTarget.x -= dx * speed;
        cameraTarget.y += dy * speed;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        return;
      }

      // === Hover(只給 mouse 使用,touch 不顯示 hover tooltip) ===
      if (e.pointerType !== "mouse") return;
      if (!companyPoints || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(companyPoints);

      if (hits.length > 0 && companySizes && companyOriginalSizes) {
        const idx = hits[0].index!;
        const c = visibleCompanies[idx];
        if (idx !== hoveredIdx) {
          if (hoveredIdx >= 0) companySizes[hoveredIdx] = companyOriginalSizes[hoveredIdx];
          hoveredIdx = idx;
          companySizes[idx] = companyOriginalSizes[idx] * 1.7;
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

          // 切到新公司 → 重灌 donut + cat list(只在公司變才重畫,不用每次 mouse move)
          if (tooltipEl) {
            const donutEl = tooltipEl.querySelector(".ai-map-tooltip-donut") as HTMLElement | null;
            const listEl = tooltipEl.querySelector(".ai-map-tooltip-cat-list") as HTMLElement | null;
            const dist = c.categoryDist || {};
            if (donutEl) donutEl.innerHTML = buildDonutSvg(dist, stateRef.current.palette);
            if (listEl) listEl.innerHTML = buildCatListHtml(dist, stateRef.current.palette);
          }

          // 切公司 → 先清舊線/標籤,280ms 防抖後再畫新線/標籤(避免快速劃過頻繁建銷)
          clearHoverFocusLinesAndLabels();
          const hoverTarget = idx;
          hoverHighlightTimer = setTimeout(() => {
            if (hoveredIdx === hoverTarget) {
              showHoverFocusLinesAndLabels(hoverTarget);
            }
          }, 280);
        }
        if (tooltipEl) {
          (tooltipEl.querySelector(".ai-map-tooltip-cat") as HTMLElement).textContent = c.mainCategory;
          (tooltipEl.querySelector(".ai-map-tooltip-name") as HTMLElement).textContent = c.name;
          (tooltipEl.querySelector(".ai-map-tooltip-meta") as HTMLElement).textContent = `${c.displayPatents} 筆專利`;
          lastCursorX = e.clientX;
          lastCursorY = e.clientY;
          repositionTooltip();
          tooltipEl.classList.add("show");
        }
        canvasRef.current.style.cursor = "pointer";
      } else {
        if (hoveredIdx >= 0 && companySizes && companyOriginalSizes) {
          companySizes[hoveredIdx] = companyOriginalSizes[hoveredIdx];
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
          hoveredIdx = -1;
          clearHoverFocusLinesAndLabels();
        }
        if (tooltipEl) tooltipEl.classList.remove("show");
        canvasRef.current.style.cursor = isDragging ? "grabbing" : "grab";
      }
    };

    const onPointerUpOrCancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) {
        isDragging = false;
        lastPinchDistance = null;
        lastPinchCentroid = null;
      } else if (activePointers.size === 1) {
        // 從 pinch 退回到單指 — 把 dragStart 對齊剩下那根手指,讓接下來的拖曳順暢
        const remaining = [...activePointers.values()][0];
        dragStart.x = remaining.x;
        dragStart.y = remaining.y;
        isDragging = true;
        // didDrag 在 onPointerDown 進 pinch 時已設 true,維持原狀(避免誤觸 click)
        lastPinchDistance = null;
        lastPinchCentroid = null;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (didDrag) return;
      if (!companyPoints || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObject(companyPoints);
      if (hits.length === 0) return;
      const idx = hits[0].index!;
      const mat = companyPoints.material as THREE.ShaderMaterial;
      mat.uniforms.focusIdx.value = idx;
      showFocusLines(idx);
      stateRef.current.onCompanyClick({ name: visibleCompanies[idx].name, idx });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraTarget.distance = Math.max(25, Math.min(220, cameraTarget.distance + e.deltaY * 0.08));
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUpOrCancel);
    canvas.addEventListener("pointercancel", onPointerUpOrCancel);
    canvas.addEventListener("pointerleave", onPointerUpOrCancel);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    // ===== Imperative API:由其他 effect 呼叫 =====
    apiRef.current = {
      refresh: () => { rebuildGraph(); },
      focusCategory: (cat) => {
        if (!companyPoints) return;
        if (cat) {
          // 計算該 cat 質心並把鏡頭推過去
          const positions = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
          let sx = 0, sy = 0, n = 0;
          visibleCompanies.forEach((c, i) => {
            if (c.mainCategory === cat) {
              sx += positions[i * 3];
              sy += positions[i * 3 + 1];
              n++;
            }
          });
          if (n > 0) {
            cameraTarget.x = sx / n;
            cameraTarget.y = sy / n;
            cameraTarget.distance = 38;
          }
        } else {
          cameraTarget.x = 0;
          cameraTarget.y = 0;
          cameraTarget.distance = 80;
        }
      },
      // 由清單點選某公司時呼叫:鏡頭聚焦 + shader focusIdx + 拉線
      focusByName: (name) => {
        if (!companyPoints) return;
        if (!name) {
          (companyPoints.material as THREE.ShaderMaterial).uniforms.focusIdx.value = -1;
          if (focusLines) {
            scene.remove(focusLines);
            focusLines.geometry.dispose();
            (focusLines.material as THREE.Material).dispose();
            focusLines = null;
          }
          if (companyOriginalSizes && companySizes) {
            for (let i = 0; i < companySizes.length; i++) {
              companySizes[i] = companyOriginalSizes[i];
            }
            (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
          }
          return;
        }
        const idx = visibleCompanies.findIndex((c) => c.name === name);
        if (idx < 0) return;
        const positions = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        // 因為右側 detail panel 會遮 ~420px,鏡頭往右偏一點(視野中心右移 = 點看起來偏左)
        cameraTarget.x = positions[idx * 3] + 8;
        cameraTarget.y = positions[idx * 3 + 1];
        cameraTarget.distance = 28;

        (companyPoints.material as THREE.ShaderMaterial).uniforms.focusIdx.value = idx;
        if (companyOriginalSizes && companySizes) {
          for (let i = 0; i < companySizes.length; i++) {
            companySizes[i] = companyOriginalSizes[i];
          }
          companySizes[idx] = companyOriginalSizes[idx] * 2.2;
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
        }
        showFocusLines(idx);
      },
      clearFocus: () => {
        if (!companyPoints) return;
        (companyPoints.material as THREE.ShaderMaterial).uniforms.focusIdx.value = -1;
        if (focusLines) {
          scene.remove(focusLines);
          focusLines.geometry.dispose();
          (focusLines.material as THREE.Material).dispose();
          focusLines = null;
        }
        if (companyOriginalSizes && companySizes) {
          for (let i = 0; i < companySizes.length; i++) {
            companySizes[i] = companyOriginalSizes[i];
          }
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
        }
      },
    };

    // 初始載入
    rebuildGraph();

    // ===== 動畫迴圈 =====
    // 用 performance.now() 取代 THREE.Clock(後者已 deprecated)
    const animStart = performance.now();
    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const time = (performance.now() - animStart) / 1000;

      // 鏡頭 lerp
      cameraState.x += (cameraTarget.x - cameraState.x) * 0.08;
      cameraState.y += (cameraTarget.y - cameraState.y) * 0.08;
      cameraState.distance += (cameraTarget.distance - cameraState.distance) * 0.08;
      camera.position.set(cameraState.x, cameraState.y, cameraState.distance);
      // 視覺補償:看向上方,把點雲中心放在畫面 ~22% 偏下,
      // 讓出上方空間給 header / 時間軸。
      // 用 NDC 比例算 — 不論 zoom 進出,點雲中心永遠落在畫面同樣的相對位置,
      // 不會「拉近後突然頂到 timeline」。
      // 公式:tan(fov/2) * distance = 視野在該深度的半高(world units)
      //      world_offset = NDC_target * 半高 → 對應到固定的螢幕 NDC 偏移
      const VIEW_LOOK_NDC_Y = 0.22;
      const fovTanHalf = Math.tan((camera.fov * Math.PI) / 360);
      const lookOffsetY = VIEW_LOOK_NDC_Y * cameraState.distance * fovTanHalf;
      camera.lookAt(cameraState.x, cameraState.y + lookOffsetY, 0);

      // 背景雜訊微擾動
      const npa = (noiseGeom.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < NOISE_COUNT; i++) {
        npa[i * 3]     += Math.sin(time * 0.3 + i) * 0.005;
        npa[i * 3 + 1] += Math.cos(time * 0.25 + i * 1.3) * 0.005;
      }
      noiseGeom.attributes.position.needsUpdate = true;

      // Focus labels:每 frame 把 3D centroid project 到 screen 座標,更新 label 位置。
      // 鏡頭旋轉/縮放時 label 會跟著 cluster 移動。
      if (focusLabels.length > 0 && canvas) {
        const rect = canvas.getBoundingClientRect();
        for (const lab of focusLabels) {
          const v = lab.centroid.clone().project(camera);
          // NDC → 螢幕座標(轉換成 fixed 定位的 left/top)
          const x = rect.left + (v.x * 0.5 + 0.5) * rect.width;
          const y = rect.top + (1 - (v.y * 0.5 + 0.5)) * rect.height;
          // v.z > 1 表示在相機後方,藏起來
          if (v.z > 1) {
            lab.el.style.opacity = "0";
          } else {
            lab.el.style.left = x + "px";
            lab.el.style.top = y + "px";
            lab.el.style.opacity = "";
          }
        }
      }

      // 點位 tween
      if (positionTween && companyPoints) {
        const elapsed = performance.now() - positionTween.t0;
        const u = Math.min(1, elapsed / positionTween.duration);
        const e = 1 - Math.pow(1 - u, 3);
        const arr = (companyPoints.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const start = positionTween.startPos;
        const end = positionTween.endPos;
        for (let i = 0; i < arr.length; i++) {
          arr[i] = start[i] + (end[i] - start[i]) * e;
        }
        companyPoints.geometry.attributes.position.needsUpdate = true;
        if (u >= 1) positionTween = null;
      }

      renderer.render(scene, camera);
    }
    animate();

    // ===== Cleanup =====
    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUpOrCancel);
      canvas.removeEventListener("pointercancel", onPointerUpOrCancel);
      canvas.removeEventListener("pointerleave", onPointerUpOrCancel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      noiseGeom.dispose();
      noiseMat.dispose();
      if (companyPoints) {
        companyPoints.geometry.dispose();
        (companyPoints.material as THREE.Material).dispose();
      }
      if (focusLines) {
        focusLines.geometry.dispose();
        (focusLines.material as THREE.Material).dispose();
      }
      // 清 focus labels
      if (hoverHighlightTimer) clearTimeout(hoverHighlightTimer);
      for (const lab of focusLabels) lab.el.remove();
      renderer.dispose();
      apiRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 場景只建一次,變化由其他 effect 透過 apiRef 觸發

  // ============== 副 effect:篩選 / layout 改變時 → rebuildGraph ==============
  useEffect(() => {
    apiRef.current?.refresh();
  }, [dataset, selectedMonth, mode, branch, layout]);

  // ============== 副 effect:Legend 點選 → 鏡頭聚焦 ==============
  useEffect(() => {
    apiRef.current?.focusCategory(activeCategory);
  }, [activeCategory]);

  // ============== 副 effect:公司清單點選 → 對該公司聚焦 / 清空 ==============
  useEffect(() => {
    if (highlightedCompanyName) {
      apiRef.current?.focusByName(highlightedCompanyName);
    } else {
      apiRef.current?.clearFocus();
    }
  }, [highlightedCompanyName]);

  return (
    <>
      <canvas ref={canvasRef} className="ai-map-canvas" />
      {/* focus labels overlay — animate loop 把 3D centroid project 到這裡 */}
      <div ref={focusLabelsContainerRef} className="ai-map-focus-labels" />
      {/* hover tooltip:標頭 + 跨域 donut + cat list */}
      <div ref={tooltipRef} className="ai-map-tooltip">
        <span className="ai-map-tooltip-cat" />
        <div className="ai-map-tooltip-name" />
        <div className="ai-map-tooltip-meta" />
        <div className="ai-map-tooltip-body">
          <div className="ai-map-tooltip-donut" />
          <div className="ai-map-tooltip-cat-list" />
        </div>
      </div>
      {/* compute toast */}
      <div ref={toastRef} className="ai-map-toast">
        <span className="ai-map-toast-spinner" />
        <span className="ai-map-toast-text">Computing layout</span>
        <span ref={toastProgressRef} className="ai-map-toast-progress" />
      </div>
    </>
  );
}
