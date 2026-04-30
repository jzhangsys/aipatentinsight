"use client";

/**
 * PatentMapCanvas — 公司專利 3D 點雲(Three.js)
 *
 * 收到 dataset / 篩選 / layout 模式 props 後:
 * 1. 建 Three.js 場景 + 自訂 shader 點雲(中心白核 + 強光暈 + focus 變暗)
 * 2. 跑 random / force layout(後者 chunked async,有進度 toast)
 * 3. layout 切換時用 ease-out cubic lerp 700ms 過渡點位
 * 4. hover 顯示 tooltip,click 觸發 onCompanyClick callback(由 parent 開 detail panel)
 * 5. 點到的公司:其他點變暗 + 拉線到同 cat 最近 6 家
 *
 * 移植自靜態原型 aipatentinsight-website/insights.html。
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

      // 2. 聚合成公司
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

        const s = Math.min(20, 4 + Math.sqrt(company.displayPatents) * 1.4);
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
            if (focusIdx >= 0.0 && abs(vid - focusIdx) > 0.5) {
              vDim = 0.22;
            } else {
              vDim = 1.0;
            }
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mv.z;
            // 大幅縮小 point size 倍數(原 350 → 150),點不再過大過糊
            gl_PointSize = size * pixelRatio * (150.0 / -mv.z);
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
            // 單層 smoothstep:中心實心、邊緣柔和過渡(無外圈光暈疊加)
            float alpha = smoothstep(0.5, 0.06, d);
            // 中心微白核(只 mix 0.4,保留色彩識別,不過曝)
            float core = smoothstep(0.14, 0.0, d);
            float fade = smoothstep(220.0, 15.0, vDepth);
            alpha *= fade * vDim;
            vec3 col = mix(vColor, vec3(1.0), core * 0.4);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
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

    // ===== 鏡頭控制(統一 Pointer Events:支援 mouse / touch / pen) =====
    let isDragging = false;
    let didDrag = false;
    const dragStart = { x: 0, y: 0 };
    const cameraState = { x: 0, y: 0, distance: 80 };
    const cameraTarget = { x: 0, y: 0, distance: 80 };

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
            20,
            Math.min(160, cameraTarget.distance * ratio)
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
        if (idx !== hoveredIdx) {
          if (hoveredIdx >= 0) companySizes[hoveredIdx] = companyOriginalSizes[hoveredIdx];
          hoveredIdx = idx;
          companySizes[idx] = companyOriginalSizes[idx] * 1.7;
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
        }
        const c = visibleCompanies[idx];
        if (tooltipEl) {
          (tooltipEl.querySelector(".ai-map-tooltip-cat") as HTMLElement).textContent = c.mainCategory;
          (tooltipEl.querySelector(".ai-map-tooltip-name") as HTMLElement).textContent = c.name;
          (tooltipEl.querySelector(".ai-map-tooltip-meta") as HTMLElement).textContent = `${c.displayPatents} 筆專利`;
          tooltipEl.style.left = e.clientX + 14 + "px";
          tooltipEl.style.top = e.clientY + 14 + "px";
          tooltipEl.classList.add("show");
        }
        canvasRef.current.style.cursor = "pointer";
      } else {
        if (hoveredIdx >= 0 && companySizes && companyOriginalSizes) {
          companySizes[hoveredIdx] = companyOriginalSizes[hoveredIdx];
          (companyPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
          hoveredIdx = -1;
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
      cameraTarget.distance = Math.max(20, Math.min(160, cameraTarget.distance + e.deltaY * 0.06));
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
    const clock = new THREE.Clock();
    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // 鏡頭 lerp
      cameraState.x += (cameraTarget.x - cameraState.x) * 0.08;
      cameraState.y += (cameraTarget.y - cameraState.y) * 0.08;
      cameraState.distance += (cameraTarget.distance - cameraState.distance) * 0.08;
      camera.position.set(cameraState.x, cameraState.y, cameraState.distance);
      // 視覺補償:看向略上方,把點雲在畫面上往下推 ~7.5% NDC,
      // 補上 header 在頂部佔的視覺重量,讓點雲落在 header 跟 stats 之間的視覺中央。
      const VIEW_LOOK_OFFSET_Y = 6;
      camera.lookAt(cameraState.x, cameraState.y + VIEW_LOOK_OFFSET_Y, 0);

      // 背景雜訊微擾動
      const npa = (noiseGeom.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < NOISE_COUNT; i++) {
        npa[i * 3]     += Math.sin(time * 0.3 + i) * 0.005;
        npa[i * 3 + 1] += Math.cos(time * 0.25 + i * 1.3) * 0.005;
      }
      noiseGeom.attributes.position.needsUpdate = true;

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
      {/* hover tooltip */}
      <div ref={tooltipRef} className="ai-map-tooltip">
        <span className="ai-map-tooltip-cat" />
        <div className="ai-map-tooltip-name" />
        <div className="ai-map-tooltip-meta" />
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
