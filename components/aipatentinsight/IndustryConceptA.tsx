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

type Props = { data: AggregateData };

const HEIGHT = 620;
const TOP_CATS = 14;
const TOP_COMPANIES = 30;
const KEY_COMPANIES_PER_CAT = 5; // 每個 cat 高亮幾家代表公司

function genPalette(n: number): THREE.Color[] {
  const colors: THREE.Color[] = [];
  for (let i = 0; i < n; i++) {
    const hue = (i * 137.508) % 360;
    const sat = i % 2 === 0 ? 0.8 : 0.6;
    const light = 0.6;
    colors.push(new THREE.Color().setHSL(hue / 360, sat, light));
  }
  return colors;
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

export default function IndustryConceptA({ data }: Props) {
  const [range, setRange] = useState<[number, number]>([0, data.dates.length - 1]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; entity: EntityHoverInfo | null }>({
    x: 0, y: 0, entity: null,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const timeLabelLayerRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    range, data, hoveredKey: null as string | null, selectedCat,
  });
  stateRef.current.range = range;
  stateRef.current.data = data;
  stateRef.current.selectedCat = selectedCat;

  const topCatNames = useMemo(() => {
    return [...data.categories]
      .map((c) => ({ c, m: data.metrics.cat[c]?.total || 0 }))
      .sort((a, b) => b.m - a.m)
      .slice(0, TOP_CATS)
      .map((x) => x.c);
  }, [data]);

  const topCompanies = useMemo(() => {
    return [...data.companies]
      .map((c) => ({ ...c, m: data.metrics.company[c.stockCode]?.total || 0 }))
      .sort((a, b) => b.m - a.m)
      .slice(0, TOP_COMPANIES);
  }, [data]);

  const catColors = useMemo(() => genPalette(topCatNames.length), [topCatNames]);
  const catColorMap = useMemo(() => {
    const m = new Map<string, THREE.Color>();
    topCatNames.forEach((c, i) => m.set(c, catColors[i]));
    return m;
  }, [topCatNames, catColors]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const timeLabelLayer = timeLabelLayerRef.current;
    if (!canvas || !wrap) return;
    const _canvas = canvas, _wrap = wrap;
    const _timeLabelLayer = timeLabelLayer;

    let W = wrap.clientWidth;
    const H = HEIGHT;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x041020, 0.012);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    // 多層光照打造海洋質感
    scene.add(new THREE.AmbientLight(0x1a3050, 0.42));         // 微藍環境光
    const dirMain = new THREE.DirectionalLight(0xffffff, 0.95); // 主光從上方
    dirMain.position.set(20, 60, 35);
    scene.add(dirMain);
    const dirFill = new THREE.DirectionalLight(0x7df9ff, 0.45); // 青色輔光
    dirFill.position.set(-30, 25, -15);
    scene.add(dirFill);
    const rimLight = new THREE.DirectionalLight(0xa55eea, 0.3); // 後方紫色 rim
    rimLight.position.set(0, 8, -50);
    scene.add(rimLight);
    // 中央 point light 模擬「水中發光點」
    const focusLight = new THREE.PointLight(0x7df9ff, 0.8, 40);
    focusLight.position.set(0, 12, 0);
    scene.add(focusLight);

    // ===== 地形 =====
    const TX = 64;
    const TZ_PER_CAT = 4;
    const TZ = TOP_CATS * TZ_PER_CAT;
    const WORLD_W = 90;
    const WORLD_DEPTH = 50;
    const HEIGHT_SCALE = 14;

    const terrainGeom = new THREE.PlaneGeometry(WORLD_W, WORLD_DEPTH, TX - 1, TZ - 1);
    terrainGeom.rotateX(-Math.PI / 2);
    const tPos = terrainGeom.attributes.position;
    const tColors = new Float32Array(tPos.count * 3);
    terrainGeom.setAttribute("color", new THREE.BufferAttribute(tColors, 3));

    const cellDominantCat: (string | null)[] = new Array(TX * TZ).fill(null);
    const cellBaseY: number[] = new Array(TX * TZ).fill(0);
    const cellBaseColor: THREE.Color[] = new Array(TX * TZ).fill(null).map(() => new THREE.Color());

    function rebuildTerrain() {
      const { range, data } = stateRef.current;
      const [start, end] = range;
      const segLen = end - start + 1;
      const catIdxMap = topCatNames.map((c) => data.categories.indexOf(c));

      for (let tz = 0; tz < TZ; tz++) {
        const catFloat = (tz / (TZ - 1)) * (TOP_CATS - 1);
        const catLow = Math.floor(catFloat);
        const catFrac = catFloat - catLow;
        const catHigh = Math.min(TOP_CATS - 1, catLow + 1);
        const dominantCatIdx = catFrac < 0.5 ? catLow : catHigh;
        const dominantCat = topCatNames[dominantCatIdx];

        for (let tx = 0; tx < TX; tx++) {
          const tFloat = (tx / (TX - 1)) * (segLen - 1);
          const tLow = Math.floor(tFloat);
          const tFrac = tFloat - tLow;
          const tHigh = Math.min(segLen - 1, tLow + 1);
          const v00 = data.catMatrix[start + tLow][catIdxMap[catLow]] || 0;
          const v01 = data.catMatrix[start + tLow][catIdxMap[catHigh]] || 0;
          const v10 = data.catMatrix[start + tHigh][catIdxMap[catLow]] || 0;
          const v11 = data.catMatrix[start + tHigh][catIdxMap[catHigh]] || 0;
          const v0 = v00 + (v01 - v00) * catFrac;
          const v1 = v10 + (v11 - v10) * catFrac;
          const v = v0 + (v1 - v0) * tFrac;
          const idx = tz * TX + tx;
          cellBaseY[idx] = v;
          cellDominantCat[idx] = dominantCat;
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
        const heightFrac = Math.max(0, Math.min(1, cellBaseY[i] / HEIGHT_SCALE));
        const seabedColor = new THREE.Color(0x051226);
        const finalColor = new THREE.Color().lerpColors(
          seabedColor,
          baseColor || new THREE.Color(0x0a1830),
          0.25 + heightFrac * 0.65
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
      metalness: 0.55,         // 高反射,類水
      roughness: 0.32,         // 低粗糙度,反光柔順
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.97,
      flatShading: false,
      emissive: 0x000000,      // emissive 由 vertex color 推
      emissiveIntensity: 0.18,
    });
    const terrain = new THREE.Mesh(terrainGeom, terrainMat);
    scene.add(terrain);
    rebuildTerrain();

    // ===== 公司光點 =====
    const companyGroup = new THREE.Group();
    scene.add(companyGroup);
    const trailGroup = new THREE.Group();
    scene.add(trailGroup);

    type CompanyPointData = {
      sphere: THREE.Mesh;
      glow: THREE.Mesh;       // 光暈球(較大、半透明)
      stockCode: string;
      name: string;
      mainCatLastSnap: string | null;
      pathPoints: THREE.Vector3[];
    };
    let companyPoints: CompanyPointData[] = [];

    function clearCompaniesAndTrail() {
      while (companyGroup.children.length) {
        const c = companyGroup.children[0] as THREE.Mesh;
        companyGroup.remove(c);
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
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
        const tzCenter = (catIdx / Math.max(1, TOP_CATS - 1)) * (TZ - 1);
        const tzRound = Math.round(tzCenter);
        const txRel = (snapIdxRel / Math.max(1, segLen - 1)) * (TX - 1);
        const txRound = Math.round(txRel);
        const cellIdx = tzRound * TX + txRound;
        const y = (cellBaseY[cellIdx] || 0) - 1.5 + 0.5;
        const z = -WORLD_DEPTH / 2 + (catIdx / Math.max(1, TOP_CATS - 1)) * WORLD_DEPTH;
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
          const catIdx = topCatNames.indexOf(mainCat);
          if (catIdx < 0) continue;
          pathPoints.push(localToWorld(s - start, catIdx));
          lastMainCat = mainCat;
        }
        if (pathPoints.length === 0) return;
        const lastPoint = pathPoints[pathPoints.length - 1];
        const totalForSize = data.metrics.company[co.stockCode]?.total || 1;
        const r = 0.4 + Math.min(0.7, Math.sqrt(totalForSize) * 0.085);
        const sphereGeom = new THREE.SphereGeometry(r, 14, 14);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.55,
          metalness: 0.3,
          roughness: 0.4,
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.position.copy(lastPoint);
        sphere.userData = { kind: "company", stockCode: co.stockCode, name: co.name };
        companyGroup.add(sphere);

        // 光暈球(預設不顯示;選 cat 後對應公司亮起)
        const glowGeom = new THREE.SphereGeometry(r * 3, 14, 14);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xffeb3b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        glow.position.copy(lastPoint);
        companyGroup.add(glow);

        companyPoints.push({
          sphere, glow,
          stockCode: co.stockCode,
          name: co.name,
          mainCatLastSnap: lastMainCat,
          pathPoints,
        });
      });
    }
    rebuildCompanies();

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
      topCatNames.forEach((cat, i) => {
        const z = -WORLD_DEPTH / 2 + (i / Math.max(1, TOP_CATS - 1)) * WORLD_DEPTH;
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

    // ===== 鏡頭(固定視角!不允許拖曳)=====
    // 入場動畫:從遠處 zoom in 到目標距離
    const TARGET_RADIUS = 75;
    let radius = 130;       // 入場時遠
    const baseYaw = 0.18;
    const basePitch = 0.38;
    let entranceProgress = 0; // 0..1

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      radius = Math.max(40, Math.min(120, radius + e.deltaY * 0.08));
    }, { passive: false });

    // ===== Hover detection(只移動,不拖曳)=====
    canvas.addEventListener("pointermove", (e) => {
      const rect = _canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

      const cMeshes = companyPoints.map((c) => c.sphere);
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

      // 入場動畫:radius 從 130 zoom 到 75(ease-out cubic),前 1.5 秒
      if (entranceProgress < 1) {
        entranceProgress = Math.min(1, time / 1.5);
        const ease = 1 - Math.pow(1 - entranceProgress, 3);
        radius = 130 - (130 - TARGET_RADIUS) * ease;
      }

      // 鏡頭固定 + 微浮動(yaw 輕微 sin 漂移,給「呼吸」感)
      const yaw = baseYaw + Math.sin(time * 0.18) * 0.025;
      const pitch = basePitch + Math.cos(time * 0.13) * 0.012;
      camera.position.x = Math.sin(yaw) * radius * Math.cos(pitch);
      camera.position.z = Math.cos(yaw) * radius * Math.cos(pitch);
      camera.position.y = Math.sin(pitch) * radius + 2;
      camera.lookAt(0, 2, 0);

      // focusLight 跟著時間漂移,讓水中發光點移動
      focusLight.position.x = Math.sin(time * 0.4) * 18;
      focusLight.position.z = Math.cos(time * 0.4) * 12;

      // 地形 sin 波(振幅加大,流動感)
      const tposArr = tPos.array as Float32Array;
      for (let i = 0; i < tPos.count; i++) {
        const x = tposArr[i * 3];
        const z = tposArr[i * 3 + 2];
        const wave = Math.sin(time * 0.9 + x * 0.18 + z * 0.22) * 0.45;
        tposArr[i * 3 + 1] = cellBaseY[i] - 1.5 + wave;
      }
      tPos.needsUpdate = true;
      terrainGeom.computeVertexNormals();

      // selectedCat 高亮:dim 非選中區域,保持選中區域亮度
      const sel = stateRef.current.selectedCat;
      const colorArr = (terrainGeom.attributes.color as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < tPos.count; i++) {
        const cat = cellDominantCat[i];
        const base = cellBaseColor[i];
        if (sel === null) {
          // 無選 → 原色
          colorArr[i * 3] = base.r;
          colorArr[i * 3 + 1] = base.g;
          colorArr[i * 3 + 2] = base.b;
        } else if (cat === sel) {
          // 選中:加亮 1.4×
          colorArr[i * 3] = Math.min(1, base.r * 1.4);
          colorArr[i * 3 + 1] = Math.min(1, base.g * 1.4);
          colorArr[i * 3 + 2] = Math.min(1, base.b * 1.4);
        } else {
          // 非選:變暗 0.3×
          colorArr[i * 3] = base.r * 0.3;
          colorArr[i * 3 + 1] = base.g * 0.3;
          colorArr[i * 3 + 2] = base.b * 0.3;
        }
      }
      (terrainGeom.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      // 公司光點 + 光暈
      companyPoints.forEach((cp) => {
        const isHovered = stateRef.current.hoveredKey === "company:" + cp.stockCode;
        const isKey = sel !== null && cp.mainCatLastSnap === sel &&
          (keyCompaniesByCat.get(sel)?.has(cp.stockCode) || false);

        const targetScale = isHovered ? 1.7 : 1;
        const cur = cp.sphere.scale.x;
        const next = cur + (targetScale - cur) * 0.18;
        cp.sphere.scale.set(next, next, next);

        // sphere emissive 強度視 selected dim
        const sphereMat = cp.sphere.material as THREE.MeshStandardMaterial;
        let targetEmissive = 0.55;
        if (sel !== null && cp.mainCatLastSnap !== sel) targetEmissive = 0.15;  // 暗
        if (isKey) targetEmissive = 1.2;  // 該 cat 代表公司
        if (isHovered) targetEmissive = 1.5;
        sphereMat.emissiveIntensity += (targetEmissive - sphereMat.emissiveIntensity) * 0.18;

        // 光暈球(只在 isKey 時 fade in)
        const glowMat = cp.glow.material as THREE.MeshBasicMaterial;
        const glowOpacityTarget = isKey ? 0.35 + Math.sin(time * 2 + cp.sphere.position.x * 0.5) * 0.12 : 0;
        glowMat.opacity += (glowOpacityTarget - glowMat.opacity) * 0.12;
        const glowScale = isKey ? 1.0 + Math.sin(time * 1.5) * 0.15 : 1.0;
        cp.glow.scale.set(glowScale, glowScale, glowScale);
      });

      // 粒子流動(從左到右循環)
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
        const isSelected = sel !== null && topCatNames[si] === sel;
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
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c: any = canvasRef.current;
    if (c?.__rebuild) c.__rebuild();
  }, [range]);

  return (
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
          style={{ height: HEIGHT, position: "relative" }}
        >
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
          {/* 時間軸 label 浮層,投影到河面前緣對應 X 位置 */}
          <div ref={timeLabelLayerRef} className="ai-currents-time-labels" />

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
          <span className="legend-item">點左側類別卡 → 該領域亮起 + 重點公司光暈</span>
          <span className="legend-item">滑進公司白點 → 黃色軌跡顯示跨類別歷程</span>
        </div>
      </div>
    </div>
  );
}
