"use client";

/**
 * IndustryConceptB — Patent Ocean(3D 海床地形)
 *
 * Three.js mesh:
 *   X 軸 = 16 個 snapshot
 *   Y 軸 = 各 cat / company(top N)
 *   Z(高度)= 該期 patent 數
 *
 * 地形高山 = 持續高量(核心穩健)
 * 平原 = 穩定但低
 * 尖塔 = 曇花一現(單期高)
 * 顏色:藍(低)→ 青(中)→ 黃(高)
 *
 * 跟 Patent Map 的點雲視覺呼應(都是 3D Three.js)。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type AggregateData = {
  dates: string[];
  categories: string[];
  companies: { name: string; stockCode: string }[];
  catMatrix: number[][];
  companyMatrix: number[][];
  metrics: any;
};

type Mode = "category" | "company";

type Props = { data: AggregateData };

export default function IndustryConceptB({ data }: Props) {
  const [mode, setMode] = useState<Mode>("category");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ mode });
  stateRef.current = { mode };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wrap = canvas.parentElement!;
    const W = wrap.clientWidth;
    const H = 520;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040c, 0.012);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 400);
    camera.position.set(0, 30, 70);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    let mesh: THREE.Mesh | null = null;

    function buildTerrain(mode: Mode) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }

      const matrix = mode === "category" ? data.catMatrix : data.companyMatrix;
      const labels = mode === "category"
        ? data.categories
        : data.companies.map((c) => c.name);
      // 取 top N(by total)避免太多
      const TOP_N = mode === "category" ? 25 : 40;
      const totals = labels.map((_, j) =>
        matrix.reduce((s, row) => s + (row[j] || 0), 0)
      );
      const indices = totals
        .map((t, i) => ({ t, i }))
        .sort((a, b) => b.t - a.t)
        .slice(0, TOP_N)
        .map((x) => x.i);

      const T = data.dates.length;          // 16
      const N = indices.length;              // top N
      const W = 80;                          // X 範圍
      const D = 50;                          // Y 範圍
      const dx = W / Math.max(1, T - 1);
      const dy = D / Math.max(1, N - 1);

      // 找 max value 來 normalize 高度
      let maxV = 1;
      for (let t = 0; t < T; t++) {
        for (const j of indices) {
          if (matrix[t][j] > maxV) maxV = matrix[t][j];
        }
      }
      const HEIGHT_SCALE = 18 / maxV;

      // PlaneGeometry T × N segments,把 z 設成 patent 數
      const geom = new THREE.PlaneGeometry(W, D, T - 1, N - 1);
      const pos = geom.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const ix = i % T;
        const iy = Math.floor(i / T);
        const j = indices[iy];
        const v = matrix[ix][j] || 0;
        const z = v * HEIGHT_SCALE;
        pos.setZ(i, z);
        // 顏色:depth(z 高)= 暖色 (從深藍→青→黃)
        const t = Math.min(1, z / 18);
        let r, g, b;
        if (t < 0.5) {
          // 藍 → 青
          const tt = t / 0.5;
          r = 0.05 + tt * 0.25;
          g = 0.3 + tt * 0.5;
          b = 0.7 + tt * 0.25;
        } else {
          // 青 → 黃
          const tt = (t - 0.5) / 0.5;
          r = 0.3 + tt * 0.7;
          g = 0.8 + tt * 0.1;
          b = 0.95 - tt * 0.6;
        }
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geom.computeVertexNormals();
      // 旋轉讓 plane 在 X-Z 平面(默認在 X-Y)
      geom.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        flatShading: false,
        metalness: 0.2,
        roughness: 0.6,
      });
      mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(0, 0, 0);
      scene.add(mesh);
    }

    // lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(20, 40, 30);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x88ccff, 0.3);
    dir2.position.set(-20, 30, -10);
    scene.add(dir2);

    buildTerrain(stateRef.current.mode);

    // 簡單滑鼠拖曳旋轉
    let dragging = false;
    let lastX = 0, lastY = 0;
    let yaw = 0, pitch = 0.4;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.005;
      pitch = Math.max(0.1, Math.min(1.3, pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      const r = 80;
      camera.position.x = Math.sin(yaw) * r * Math.cos(pitch);
      camera.position.z = Math.cos(yaw) * r * Math.cos(pitch);
      camera.position.y = Math.sin(pitch) * r;
      camera.lookAt(0, 5, 0);
      renderer.render(scene, camera);
    }
    animate();

    const onResize = () => {
      const w = wrap.clientWidth;
      camera.aspect = w / H;
      camera.updateProjectionMatrix();
      renderer.setSize(w, H);
    };
    window.addEventListener("resize", onResize);

    // 切換模式時重 build
    const refreshHandler = () => buildTerrain(stateRef.current.mode);
    (canvas as any).__refresh = refreshHandler;

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      if (mesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mode 變 → 通知 canvas 重 build
  useEffect(() => {
    const c: any = canvasRef.current;
    if (c?.__refresh) c.__refresh();
  }, [mode]);

  return (
    <div className="ai-concept-b">
      <div className="ai-concept-toolbar">
        <div className="ai-concept-mode-toggle">
          {(["category", "company"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={"ai-pill" + (mode === m ? " active" : "")}
              onClick={() => setMode(m)}
            >
              {m === "category" ? "技術類別" : "公司"}
            </button>
          ))}
        </div>
        <span className="ai-concept-hint">滑鼠拖曳可旋轉視角</span>
      </div>

      <div className="ai-concept-chart" style={{ height: 520 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      <div className="ai-concept-legend">
        <span className="legend-item">X = 時間</span>
        <span className="legend-item">Y = 類別/公司</span>
        <span className="legend-item">Z(高度)= 該期專利數</span>
        <span className="legend-item">山脊 = 持續高量(核心)</span>
        <span className="legend-item">尖塔 = 曇花一現</span>
      </div>
    </div>
  );
}
