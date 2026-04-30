"use client";

/**
 * AIHeroOcean — 首頁背景洋流動畫(Three.js)
 *
 * 8 條彩色洋流並行流動 + 海洋雜訊背景。
 * 每 3 個月(2.5s)切換一次主導洋流，主角明亮飽和、其他降到 30% 強度。
 * 自動循環 36 個月(=60 秒一輪)。
 *
 * 移植自靜態原型 aipatentinsight-website/index.html。
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

type CurrentDef = {
  name: string;
  color: number;
  baseY: number;
  phase: number;
  freq: number;
  amp: number;
};

const CURRENTS: CurrentDef[] = [
  { name: "矽光子",     color: 0x9DEBFF, baseY:  2.3, phase: 0.0, freq: 0.32, amp: 0.32 },
  { name: "AI 晶片",    color: 0x7DDFFF, baseY:  1.6, phase: 0.7, freq: 0.28, amp: 0.30 },
  { name: "AI Server",  color: 0x6EC4F5, baseY:  0.9, phase: 1.4, freq: 0.36, amp: 0.28 },
  { name: "先進封裝",   color: 0x5FA8E8, baseY:  0.2, phase: 2.1, freq: 0.30, amp: 0.34 },
  { name: "散熱模組",   color: 0x6E8FE6, baseY: -0.5, phase: 2.8, freq: 0.34, amp: 0.30 },
  { name: "光學元件",   color: 0x8E7FE0, baseY: -1.2, phase: 3.5, freq: 0.30, amp: 0.32 },
  { name: "半導體製程", color: 0x7FA0F0, baseY: -1.9, phase: 4.2, freq: 0.36, amp: 0.28 },
  { name: "特級化學品", color: 0xA08FE5, baseY: -2.6, phase: 4.9, freq: 0.32, amp: 0.30 },
];

// 36 個月對應(每 3 個月切一次主導,8 循環 + 取前 4 復出)
const MONTH_TO_DOMAIN: number[] = [];
for (let m = 0; m < 36; m++) {
  MONTH_TO_DOMAIN.push(Math.floor(m / 3) % 8);
}

const NOISE_COUNT = 1800;
const PARTICLES_PER_CURRENT = 380;
const TOTAL_CURRENT = CURRENTS.length * PARTICLES_PER_CURRENT;
const SECONDS_PER_MONTH = 60 / 36;

export default function AIHeroOcean() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ============== Three.js setup ==============
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040c, 0.04);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // ============== NOISE (海洋雜訊) ==============
    const noisePos = new Float32Array(NOISE_COUNT * 3);
    const noiseVel = new Float32Array(NOISE_COUNT * 3);
    const noiseSize = new Float32Array(NOISE_COUNT);
    const noiseSeed = new Float32Array(NOISE_COUNT);
    for (let i = 0; i < NOISE_COUNT; i++) {
      noisePos[i * 3]     = (Math.random() - 0.5) * 16;
      noisePos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      noisePos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      noiseVel[i * 3]     = (Math.random() - 0.5) * 0.04;
      noiseVel[i * 3 + 1] = (Math.random() - 0.5) * 0.025;
      noiseSize[i] =
        Math.random() < 0.9 ? 0.5 + Math.random() * 0.7 : 1.3 + Math.random() * 0.8;
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
          gl_PointSize = size * pixelRatio * (220.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * 0.3;
          float fade = smoothstep(15.0, 4.0, vDepth);
          gl_FragColor = vec4(0.42, 0.55, 0.72, alpha * fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const noisePoints = new THREE.Points(noiseGeom, noiseMat);
    scene.add(noisePoints);

    // ============== CURRENTS (8 條洋流) ==============
    const currPos = new Float32Array(TOTAL_CURRENT * 3);
    const currVel = new Float32Array(TOTAL_CURRENT * 3);
    const currCol = new Float32Array(TOTAL_CURRENT * 3);
    const currSize = new Float32Array(TOTAL_CURRENT);
    const currLife = new Float32Array(TOTAL_CURRENT);
    const currAge = new Float32Array(TOTAL_CURRENT);
    const currTotal = new Float32Array(TOTAL_CURRENT);
    const currIdx = new Int32Array(TOTAL_CURRENT);

    function spawnCurrent(idx: number) {
      const c = CURRENTS[currIdx[idx]];
      currPos[idx * 3]     = -10 - Math.random() * 2;
      currPos[idx * 3 + 1] = c.baseY + (Math.random() - 0.5) * 0.55;
      currPos[idx * 3 + 2] = (Math.random() - 0.5) * 0.8;
      currVel[idx * 3]     = 1.4 + Math.random() * 0.5;
      currVel[idx * 3 + 1] = (Math.random() - 0.5) * 0.04;
      currVel[idx * 3 + 2] = 0;
      const r = Math.random();
      currSize[idx] = r < 0.7 ? 0.8 + Math.random() * 1.0 : 2.0 + Math.random() * 1.5;
      currLife[idx] = 0;
      currAge[idx] = 0;
      currTotal[idx] = 7 + Math.random() * 4;
    }

    let p = 0;
    for (let cIdx = 0; cIdx < CURRENTS.length; cIdx++) {
      for (let i = 0; i < PARTICLES_PER_CURRENT; i++) {
        currIdx[p] = cIdx;
        spawnCurrent(p);
        currAge[p] = Math.random() * currTotal[p];
        currPos[p * 3] = -10 + currAge[p] * 1.6;
        const col = new THREE.Color(CURRENTS[cIdx].color);
        currCol[p * 3]     = col.r;
        currCol[p * 3 + 1] = col.g;
        currCol[p * 3 + 2] = col.b;
        p++;
      }
    }

    const currGeom = new THREE.BufferGeometry();
    currGeom.setAttribute("position", new THREE.BufferAttribute(currPos, 3));
    currGeom.setAttribute("color", new THREE.BufferAttribute(currCol, 3));
    currGeom.setAttribute("size", new THREE.BufferAttribute(currSize, 1));
    currGeom.setAttribute("alife", new THREE.BufferAttribute(currLife, 1));

    const currMat = new THREE.ShaderMaterial({
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
          gl_PointSize = size * pixelRatio * (260.0 / -mv.z);
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
          float alpha = smoothstep(0.5, 0.1, d) * 0.85;
          float fade = smoothstep(20.0, 4.0, vDepth);
          alpha *= fade * vLife;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
    });
    const currPoints = new THREE.Points(currGeom, currMat);
    scene.add(currPoints);

    // 拖尾線(每個粒子一段短 line segment,顯示流動軌跡)
    const tailPos = new Float32Array(TOTAL_CURRENT * 6);
    const tailCol = new Float32Array(TOTAL_CURRENT * 6);
    const tailGeom = new THREE.BufferGeometry();
    tailGeom.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
    tailGeom.setAttribute("color", new THREE.BufferAttribute(tailCol, 3));
    const tailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const tailLines = new THREE.LineSegments(tailGeom, tailMat);
    scene.add(tailLines);

    // ============== 動畫狀態 ==============
    let monthProgress = 0;
    let activeDomainIdx = 0;
    let activeIntensity = 1;
    let pendingDomainIdx = 0;
    const currentColors = CURRENTS.map((c) => new THREE.Color(c.color));

    // ============== 互動:滑鼠視差 + 視窗 resize ==============
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    // ============== 動畫迴圈 ==============
    const clock = new THREE.Clock();
    let lastTime = 0;
    let rafId = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const dt = Math.min(0.05, time - lastTime);
      lastTime = time;

      // 月份遞增:36 個月一輪(60 秒)
      monthProgress += dt / SECONDS_PER_MONTH;
      if (monthProgress >= 36) monthProgress = 0;
      const monthIdx = Math.min(35, Math.floor(monthProgress));
      const newDomain = MONTH_TO_DOMAIN[monthIdx];
      if (newDomain !== pendingDomainIdx) {
        pendingDomainIdx = newDomain;
        activeIntensity = 0;
      }

      // 主角過渡(從舊主角淡到新主角,約 1.5s 完成)
      if (pendingDomainIdx !== activeDomainIdx) {
        activeIntensity += dt * 1.5;
        if (activeIntensity >= 1) {
          activeDomainIdx = pendingDomainIdx;
          activeIntensity = 1;
        }
      }

      // ===== NOISE 更新 =====
      for (let i = 0; i < NOISE_COUNT; i++) {
        const i3 = i * 3;
        const seed = noiseSeed[i];
        noiseVel[i3]     += (Math.sin(time * 0.4 + seed) * 0.025 - noiseVel[i3]) * 0.5 * dt;
        noiseVel[i3 + 1] += (Math.cos(time * 0.3 + seed * 1.3) * 0.018 - noiseVel[i3 + 1]) * 0.5 * dt;
        noisePos[i3]     += noiseVel[i3] * dt;
        noisePos[i3 + 1] += noiseVel[i3 + 1] * dt;
        if (noisePos[i3] > 9)  noisePos[i3] = -9;
        if (noisePos[i3] < -9) noisePos[i3] = 9;
        if (noisePos[i3 + 1] > 4.5)  noisePos[i3 + 1] = -4.5;
        if (noisePos[i3 + 1] < -4.5) noisePos[i3 + 1] = 4.5;
      }
      noiseGeom.attributes.position.needsUpdate = true;

      // ===== CURRENT 更新 =====
      for (let i = 0; i < TOTAL_CURRENT; i++) {
        const i3 = i * 3;
        const cInfo = CURRENTS[currIdx[i]];

        const px = currPos[i3];
        const py = currPos[i3 + 1];
        const pz = currPos[i3 + 2];

        const target_y =
          cInfo.baseY + Math.sin(px * cInfo.freq + time * 0.5 + cInfo.phase) * cInfo.amp;
        const pull_y = (target_y - py) * 1.8;

        currVel[i3]     += (1.5 - currVel[i3]) * dt * 1.0;
        currVel[i3 + 1] += (pull_y - currVel[i3 + 1]) * dt * 2.5;
        currVel[i3 + 2] += ((Math.random() - 0.5) * 0.04 - currVel[i3 + 2]) * dt;

        const turb_x = Math.cos(py * 0.8 + time * 0.7 + cInfo.phase) * 0.08;
        currVel[i3] += turb_x * dt;

        const newX = px + currVel[i3] * dt;
        const newY = py + currVel[i3 + 1] * dt;
        const newZ = pz + currVel[i3 + 2] * dt;

        // 拖尾(從上一格位置畫到新位置)
        const tIdx = i * 6;
        tailPos[tIdx]     = px;
        tailPos[tIdx + 1] = py;
        tailPos[tIdx + 2] = pz;
        tailPos[tIdx + 3] = newX;
        tailPos[tIdx + 4] = newY;
        tailPos[tIdx + 5] = newZ;

        currPos[i3]     = newX;
        currPos[i3 + 1] = newY;
        currPos[i3 + 2] = newZ;

        currAge[i] += dt;
        const lr = currAge[i] / currTotal[i];
        let life: number;
        if (lr < 0.08) life = lr / 0.08;
        else if (lr > 0.85) life = (1 - lr) / 0.15;
        else life = 1;
        life = Math.max(0, Math.min(1, life));

        // 強度差異:當前主角的洋流明亮飽和,其他洋流暗淡
        const isActive = currIdx[i] === activeDomainIdx;
        const isPending = currIdx[i] === pendingDomainIdx;
        let strength: number;
        if (isActive && !isPending) {
          strength = 1 - activeIntensity * 0.7;
        } else if (isPending) {
          strength = 0.3 + activeIntensity * 0.7;
        } else {
          strength = 0.3;
        }

        currLife[i] = life * strength;

        const col = currentColors[currIdx[i]];
        currCol[i3]     = col.r;
        currCol[i3 + 1] = col.g;
        currCol[i3 + 2] = col.b;

        const tailA = life * strength * 0.6;
        tailCol[tIdx]     = col.r * 0.05;
        tailCol[tIdx + 1] = col.g * 0.05;
        tailCol[tIdx + 2] = col.b * 0.05;
        tailCol[tIdx + 3] = col.r * tailA;
        tailCol[tIdx + 4] = col.g * tailA;
        tailCol[tIdx + 5] = col.b * tailA;

        if (newX > 10 || currAge[i] > currTotal[i]) {
          spawnCurrent(i);
        }
      }
      currGeom.attributes.position.needsUpdate = true;
      currGeom.attributes.color.needsUpdate = true;
      currGeom.attributes.alife.needsUpdate = true;
      tailGeom.attributes.position.needsUpdate = true;
      tailGeom.attributes.color.needsUpdate = true;

      // 鏡頭視差
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      camera.position.x = mouse.x * 0.3;
      camera.position.y = mouse.y * 0.2;
      camera.position.z = 7.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    // ============== Cleanup(離開頁面或元件 unmount 時) ==============
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);

      noiseGeom.dispose();
      noiseMat.dispose();
      currGeom.dispose();
      currMat.dispose();
      tailGeom.dispose();
      tailMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ai-ocean-canvas"
      aria-hidden="true"
    />
  );
}
