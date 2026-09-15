<script lang="ts">
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
  import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
  import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
  import {
    rotorPos,
    lamp,
    lastKey,
    config,
    press,
    xray,
    lastTrace,
    lid as lidStore,
    rotorLid as rotorLidStore,
    rotLock,
    viewPreset,
    quality,
    patch,
  } from "../machine";
  import { get } from "svelte/store";
  import {
    ROTOR_WIRINGS,
    REFLECTOR_WIRINGS,
    rotorForwardPerm,
    reflectorPerm,
  } from "./rotorData";
  import type { Trace } from "../engine";

  let host: HTMLDivElement;

  onMount(() => {
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    camera.position.set(0.5, 9.2, 11.9);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.7, 0.4);
    controls.minDistance = 9;
    controls.maxDistance = 34;
    controls.maxPolarAngle = Math.PI * 0.495;

    let needsRender = true;
    const invalidate = () => {
      needsRender = true;
    };
    controls.addEventListener("change", invalidate);

    const PR_STEPS = [Math.min(window.devicePixelRatio, 2), 1.5, 1.25, 1];
    let prStep = 0;
    function applyQuality(q: string) {
      if (q === "low") prStep = PR_STEPS.length - 1;
      else if (q === "high") prStep = 0;
      else prStep = PR_STEPS[0] > 1.5 ? 1 : 0;
      renderer.setPixelRatio(PR_STEPS[prStep]);
      resize();
      invalidate();
    }
    let fpsFrames = 0;
    let fpsT0 = performance.now();
    function fpsSample() {
      fpsFrames++;
      if (fpsFrames < 90) return;
      const now = performance.now();
      const fps = fpsFrames / ((now - fpsT0) / 1000);
      fpsFrames = 0;
      fpsT0 = now;
      if (get(quality) === "auto" && fps < 45 && prStep < PR_STEPS.length - 1) {
        prStep++;
        renderer.setPixelRatio(PR_STEPS[prStep]);
        resize();
      }
    }

    const VIEWS: Record<
      string,
      { pos: [number, number, number]; tgt: [number, number, number] }
    > = {
      overview: { pos: [0.5, 9.2, 11.9], tgt: [0, 0.7, 0.4] },
      keys: { pos: [0, 6.6, 12.8], tgt: [0, 1.0, 3.2] },
      plugboard: { pos: [0, 0.6, 15.2], tgt: [0, -0.4, 5.6] },
      rotors: { pos: [0, 6.4, 4.6], tgt: [0, 1.9, -3.6] },
    };
    let camTween: { pos: THREE.Vector3; tgt: THREE.Vector3 } | null = null;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    scene.add(new THREE.HemisphereLight(0xfff2dd, 0x140d06, 0.4));
    const keyLight = new THREE.DirectionalLight(0xfff0d8, 1.5);
    keyLight.position.set(6, 15, 9);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x9fc0ff, 0.45);
    rimLight.position.set(-9, 7, -8);
    scene.add(rimLight);

    const C = (c: string) => c.charCodeAt(0) - 65;
    const ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"];
    const DX = 1.12;

    function woodTexture(size: number): THREE.CanvasTexture {
      const w = size,
        h = size;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#5b3d22";
      g.fillRect(0, 0, w, h);
      const strokes = size * 5;
      for (let i = 0; i < strokes; i++) {
        const y = Math.random() * h;
        const s = 18 + Math.random() * 50;
        g.strokeStyle = `rgba(${20 + s},${12 + s * 0.55},${6 + s * 0.3},${0.05 + Math.random() * 0.08})`;
        g.lineWidth = 0.5 + Math.random() * 1.4;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(
          w * 0.33,
          y + (Math.random() - 0.5) * 14,
          w * 0.66,
          y + (Math.random() - 0.5) * 14,
          w,
          y + (Math.random() - 0.5) * 10,
        );
        g.stroke();
      }
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    }
    const woodMap = woodTexture(get(quality) === "low" ? 512 : 1024);

    function letterTex(ch: string, color: string): THREE.CanvasTexture {
      const s = 128;
      const cv = document.createElement("canvas");
      cv.width = cv.height = s;
      const g = cv.getContext("2d")!;
      g.clearRect(0, 0, s, s);
      g.fillStyle = color;
      g.font = `bold ${Math.floor(s * 0.62)}px Georgia, "Times New Roman", serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(ch, s / 2, s / 2 + 6);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }
    function flatLabel(
      ch: string,
      color: string,
      size: number,
      tint?: number,
    ): THREE.Mesh {
      const m = new THREE.MeshBasicMaterial({
        map: letterTex(ch, color),
        transparent: true,
        depthWrite: false,
      });
      if (tint !== undefined) m.color.set(tint);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    }
    function faceLabel(ch: string, color: string, size: number): THREE.Mesh {
      const m = new THREE.MeshBasicMaterial({
        map: letterTex(ch, color),
        transparent: true,
        depthWrite: false,
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
    }

    function logoTex(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 256;
      const g = cv.getContext("2d")!;
      g.clearRect(0, 0, 512, 256);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = "bold 96px Georgia, serif";
      g.lineWidth = 7;
      g.strokeStyle = "rgba(238,228,205,0.3)";
      g.beginPath();
      g.ellipse(256, 132, 208, 78, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "rgba(238,228,205,0.32)";
      g.fillText("Enigma", 256, 142);
      g.strokeStyle = "rgba(26,13,5,0.9)";
      g.beginPath();
      g.ellipse(256, 128, 208, 78, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "rgba(26,13,5,0.92)";
      g.fillText("Enigma", 256, 138);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }

    const woodMat = new THREE.MeshStandardMaterial({
      map: woodMap,
      color: 0xd6b083,
      roughness: 0.72,
      metalness: 0.04,
      envMapIntensity: 0.38,
    });
    const woodDark = new THREE.MeshStandardMaterial({
      color: 0x2a1809,
      roughness: 0.74,
      metalness: 0.04,
      envMapIntensity: 0.32,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb18a3c,
      roughness: 0.36,
      metalness: 1.0,
      envMapIntensity: 0.85,
    });
    const brassDk = new THREE.MeshStandardMaterial({
      color: 0x83662a,
      roughness: 0.48,
      metalness: 0.95,
      envMapIntensity: 0.75,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xa6abb2,
      roughness: 0.4,
      metalness: 0.95,
      envMapIntensity: 0.9,
    });
    const bakeMat = new THREE.MeshStandardMaterial({
      color: 0x0f0c08,
      roughness: 0.32,
      metalness: 0.4,
      envMapIntensity: 0.6,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x131009,
      roughness: 0.58,
      metalness: 0.4,
      envMapIntensity: 0.5,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x070509,
      roughness: 0.88,
      metalness: 0.12,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x121212,
      roughness: 0.8,
      metalness: 0.06,
    });

    const TOP = 1.1;

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(12.5, 3.2, 10.6, 5, 0.3),
      woodMat,
    );
    body.position.set(0, -0.5, 0.2);
    scene.add(body);
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(13.3, 0.7, 11.4, 4, 0.2),
      woodDark,
    );
    base.position.set(0, -2.45, 0.2);
    scene.add(base);

    const topPanel = new THREE.Mesh(
      new RoundedBoxGeometry(11.4, 0.14, 7.4, 3, 0.08),
      panelMat,
    );
    topPanel.position.set(0, TOP + 0.02, 1.5);
    scene.add(topPanel);

    const housing = new THREE.Mesh(
      new RoundedBoxGeometry(12.5, 1.7, 3.0, 4, 0.18),
      woodMat,
    );
    housing.position.set(0, 1.1, -3.6);
    scene.add(housing);
    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.6, 1.85),
      darkMat,
    );
    trough.position.set(-0.1, 1.4, -3.6);
    scene.add(trough);

    const rivetGeo = new THREE.SphereGeometry(0.12, 16, 16);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const rv = new THREE.Mesh(rivetGeo, brassMat);
        rv.position.set(sx * 5.5, TOP + 0.05, 1.5 + sz * 3.4);
        scene.add(rv);
      }

    const pbPanel = new THREE.Mesh(
      new RoundedBoxGeometry(11.0, 2.6, 0.25, 3, 0.08),
      bakeMat,
    );
    pbPanel.position.set(0, -0.4, 5.55);
    scene.add(pbPanel);
    const PB_Z = 5.7;
    const PB_Y = [0.45, -0.45, -1.35];
    const PB_DX = 1.06;
    const socketPos: Record<string, THREE.Vector3> = {};
    const socketHits: THREE.Mesh[] = [];
    const socketRings: Record<string, THREE.Mesh> = {};
    const socketPlateGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 24);
    const socketRingGeo = new THREE.TorusGeometry(0.24, 0.035, 10, 24);
    const holeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12);
    ROWS.forEach((row, r) => {
      const chars = [...row];
      chars.forEach((ch, i) => {
        const x = (i - (chars.length - 1) / 2) * PB_DX;
        const y = PB_Y[r];
        const plate = new THREE.Mesh(socketPlateGeo, panelMat);
        plate.rotation.x = Math.PI / 2;
        plate.position.set(x, y, PB_Z);
        plate.userData.ch = ch;
        scene.add(plate);
        socketHits.push(plate);
        const ring = new THREE.Mesh(socketRingGeo, brassMat.clone());
        ring.position.set(x, y, PB_Z + 0.04);
        ring.userData.ch = ch;
        scene.add(ring);
        socketRings[ch] = ring;
        for (const dy of [0.1, -0.1]) {
          const hole = new THREE.Mesh(holeGeo, darkMat);
          hole.rotation.x = Math.PI / 2;
          hole.position.set(x, y + dy, PB_Z + 0.02);
          scene.add(hole);
        }
        const lab = faceLabel(ch, "#cfc6b0", 0.3);
        lab.position.set(x, y + 0.34, PB_Z + 0.03);
        scene.add(lab);
        socketPos[ch] = new THREE.Vector3(x, y, PB_Z + 0.08);
      });
    });

    const FLAP_OPEN = Math.PI / 2;
    const FLAP_SHUT = 0;
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, -1.7, 5.95);
    flapPivot.rotation.x = FLAP_OPEN;
    scene.add(flapPivot);
    const flap = new THREE.Mesh(
      new RoundedBoxGeometry(11.6, 2.6, 0.3, 3, 0.1),
      woodMat.clone(),
    );
    flap.position.set(0, 1.3, 0);
    flapPivot.add(flap);
    for (const sx of [-4.2, 4.2]) {
      const hb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.7, 16),
        brassMat,
      );
      hb.rotation.z = Math.PI / 2;
      hb.position.set(sx, -1.7, 5.95);
      scene.add(hb);
    }

    const cableGroup = new THREE.Group();
    scene.add(cableGroup);
    function clearCables() {
      while (cableGroup.children.length) {
        const c = cableGroup.children.pop() as THREE.Mesh;
        c.geometry.dispose();
      }
    }
    function buildCables(plugStr: string) {
      clearCables();
      const s = (plugStr || "").toUpperCase().replace(/[^A-Z]/g, "");
      const seen = new Set<string>();
      for (let i = 0; i + 1 < s.length; i += 2) {
        const a = socketPos[s[i]],
          b = socketPos[s[i + 1]];
        if (!a || !b || s[i] === s[i + 1]) continue;
        if (seen.has(s[i]) || seen.has(s[i + 1])) continue;
        seen.add(s[i]);
        seen.add(s[i + 1]);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const sag = Math.min(0.25 + a.distanceTo(b) * 0.1, 0.6);
        mid.z = PB_Z + 0.2;
        mid.y = Math.max(Math.min(a.y, b.y) - sag, -1.6);
        const ca = a.clone().add(new THREE.Vector3(0, -0.08, 0.12));
        const cb = b.clone().add(new THREE.Vector3(0, -0.08, 0.12));
        const curve = new THREE.CatmullRomCurve3([a, ca, mid, cb, b]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 46, 0.055, 8, false),
          cableMat,
        );
        cableGroup.add(tube);
      }
    }

    function plugPairs(s: string): string[] {
      const t = (s || "").toUpperCase().replace(/[^A-Z]/g, "");
      const out: string[] = [];
      const seen = new Set<String>();
      for (let i = 0; i + 1 < t.length; i += 2) {
        const a = t[i],
          b = t[i + 1];
        if (a === b || seen.has(a) || seen.has(b)) continue;
        seen.add(a);
        seen.add(b);
        out.push(a + b);
      }
      return out;
    }
    function partnerOf(ch: string): string | null {
      for (const p of plugPairs(get(config).plugs)) {
        if (p[0] === ch) return p[1];
        if (p[1] === ch) return p[0];
      }
      return null;
    }
    function connectPlug(a: string, b: string) {
      if (a === b) return;
      const pairs = plugPairs(get(config).plugs).filter(
        (p) => !p.includes(a) && !p.includes(b),
      );
      pairs.push(a + b);
      patch({ plugs: pairs.join("") });
    }
    function disconnectPlug(ch: string) {
      const pairs = plugPairs(get(config).plugs).filter((p) => !p.includes(ch));
      patch({ plugs: pairs.join("") });
    }

    function highlightSockets(from: string | null, over: string | null) {
      for (const ch in socketRings) {
        const m = socketRings[ch].material as THREE.MeshStandardMaterial;
        const avail = from !== null && ch !== from && !partnerOf(ch);
        m.emissive.setHex(
          avail ? (ch === over ? 0xffcf4d : 0x5fc6ff) : 0x000000,
        );
        m.emissiveIntensity = avail ? (ch === over ? 1.6 : 0.6) : 0;
      }
      invalidate();
    }

    const KEYZ = [4.4, 3.3, 2.2];
    const capGeo = new THREE.CylinderGeometry(0.33, 0.39, 0.32, 32);
    const keyRingGeo = new THREE.TorusGeometry(0.4, 0.05, 10, 28);
    const keyCaps: THREE.Mesh[] = [];
    const keyGroups: Record<string, THREE.Group> = {};
    ROWS.forEach((row, r) => {
      const chars = [...row];
      chars.forEach((ch, i) => {
        const x = (i - (chars.length - 1) / 2) * DX;
        const z = KEYZ[r];
        const ring = new THREE.Mesh(keyRingGeo, brassMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, TOP + 0.08, z);
        scene.add(ring);
        const grp = new THREE.Group();
        grp.position.set(x, TOP, z);
        const cap = new THREE.Mesh(capGeo, bakeMat);
        cap.position.y = 0.22;
        cap.userData.ch = ch;
        grp.add(cap);
        const lab = flatLabel(ch, "#efe7d4", 0.4);
        lab.position.y = 0.39;
        grp.add(lab);
        scene.add(grp);
        keyCaps.push(cap);
        keyGroups[ch] = grp;
      });
    });

    const LAMPZ = [0.9, -0.2, -1.3];
    const lampMats: Record<string, THREE.MeshStandardMaterial> = {};
    const lampLabels: Record<string, THREE.MeshBasicMaterial> = {};
    const lampPos: Record<string, THREE.Vector3> = {};
    const lampHoleGeo = new THREE.CylinderGeometry(0.33, 0.35, 0.08, 28);
    const lampGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.07, 28);
    ROWS.forEach((row, r) => {
      const chars = [...row];
      chars.forEach((ch, i) => {
        const x = (i - (chars.length - 1) / 2) * DX;
        const z = LAMPZ[r];
        const holder = new THREE.Mesh(
          lampHoleGeo,
          new THREE.MeshStandardMaterial({
            color: 0x1a1712,
            roughness: 0.6,
            metalness: 0.2,
          }),
        );
        holder.position.set(x, TOP + 0.05, z);
        scene.add(holder);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x2a2417,
          emissive: 0xffce4d,
          emissiveIntensity: 0,
          roughness: 0.5,
          metalness: 0.2,
        });
        const lp = new THREE.Mesh(lampGeo, mat);
        lp.position.set(x, TOP + 0.09, z);
        scene.add(lp);
        const lab = flatLabel(ch, "#ffffff", 0.3, 0x6a6248);
        lab.position.set(x, TOP + 0.15, z);
        scene.add(lab);
        lampMats[ch] = mat;
        lampLabels[ch] = lab.material as THREE.MeshBasicMaterial;
        lampPos[ch] = new THREE.Vector3(x, TOP + 0.09, z);
      });
    });

    const rotorX = [-0.95, 0, 0.95];
    const rotorY = 1.82;
    const rotorZ = -3.6;
    const rotorSpins: THREE.Group[] = [];
    const targetRot = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      const spin = new THREE.Group();
      spin.position.set(rotorX[r], rotorY, rotorZ);
      scene.add(spin);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.86, 56),
        steelMat,
      );
      disc.rotation.z = Math.PI / 2;
      spin.add(disc);
      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(0.83, 0.83, 0.46, 56),
        bakeMat,
      );
      tyre.rotation.z = Math.PI / 2;
      spin.add(tyre);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const ch = String.fromCharCode(65 + i);
        const lm = new THREE.MeshBasicMaterial({
          map: letterTex(ch, "#efe7d2"),
          transparent: true,
          depthWrite: false,
        });
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), lm);
        const yA = new THREE.Vector3(0, Math.sin(a), -Math.cos(a));
        const zA = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
        gl.quaternion.setFromRotationMatrix(
          new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), yA, zA),
        );
        gl.position.set(0, Math.cos(a) * 0.845, Math.sin(a) * 0.845);
        spin.add(gl);
      }
      const grooves = 40;
      for (const ex of [-0.28, 0.28]) {
        for (let k = 0; k < grooves; k++) {
          const a = (k / grooves) * Math.PI * 2;
          const gv = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.04, 0.05),
            brassDk,
          );
          gv.position.set(ex, Math.cos(a) * 0.84, Math.sin(a) * 0.84);
          gv.rotation.x = a;
          spin.add(gv);
        }
      }
      for (const ex of [-0.43, 0.43]) {
        const cr = new THREE.Mesh(
          new THREE.TorusGeometry(0.8, 0.05, 10, 40),
          brassMat,
        );
        cr.rotation.y = Math.PI / 2;
        cr.position.x = ex;
        spin.add(cr);
      }
      rotorSpins.push(spin);
    }
    for (let r = 0; r < 3; r++) {
      const wy = rotorY + 0.88;
      for (const dz of [-0.2, 0.2]) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.04, 0.05),
          brassMat,
        );
        b.position.set(rotorX[r], wy, rotorZ + dz);
        scene.add(b);
      }
      for (const dx of [-0.2, 0.2]) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.04, 0.36),
          brassMat,
        );
        b.position.set(rotorX[r] + dx, wy, rotorZ);
        scene.add(b);
      }
    }
    const reflGrp = new THREE.Group();
    reflGrp.position.set(-1.78, rotorY, rotorZ);
    scene.add(reflGrp);
    const reflDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.42, 48),
      bakeMat,
    );
    reflDrum.rotation.z = Math.PI / 2;
    reflGrp.add(reflDrum);
    const reflHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.18, 24),
      brassMat,
    );
    reflHub.rotation.z = Math.PI / 2;
    reflHub.position.x = -0.28;
    reflGrp.add(reflHub);
    const reflCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 16),
      brassMat,
    );
    reflCap.position.x = -0.37;
    reflGrp.add(reflCap);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10),
        brassMat,
      );
      pin.rotation.z = Math.PI / 2;
      pin.position.set(0.24, Math.cos(a) * 0.45, Math.sin(a) * 0.45);
      reflGrp.add(pin);
    }
    const etwMat = new THREE.MeshStandardMaterial({
      color: 0x161208,
      roughness: 0.5,
      metalness: 0.3,
      envMapIntensity: 0.7,
    });
    const etwGrp = new THREE.Group();
    etwGrp.position.set(1.78, rotorY, rotorZ);
    scene.add(etwGrp);
    const etwDrum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.4, 48),
      etwMat,
    );
    etwDrum.rotation.z = Math.PI / 2;
    etwGrp.add(etwDrum);
    const etwHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.18, 24),
      brassMat,
    );
    etwHub.rotation.z = Math.PI / 2;
    etwHub.position.x = 0.27;
    etwGrp.add(etwHub);
    const etwCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 16),
      brassMat,
    );
    etwCap.position.x = 0.36;
    etwGrp.add(etwCap);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10),
        brassMat,
      );
      pin.rotation.z = Math.PI / 2;
      pin.position.set(-0.22, Math.cos(a) * 0.45, Math.sin(a) * 0.45);
      etwGrp.add(pin);
    }

    const ROTORLID_OPEN = -2.0;
    const ROTORLID_SHUT = 0;
    const ROTORLID_PIVOT_Y = 2.88;
    const ROTORLID_PIVOT_Z = -4.6;
    const rotorLidPivot = new THREE.Group();
    rotorLidPivot.position.set(0, ROTORLID_PIVOT_Y, ROTORLID_PIVOT_Z);
    rotorLidPivot.rotation.x = ROTORLID_SHUT;
    scene.add(rotorLidPivot);
    const coverWood = woodMat.clone();
    const COVER_T = 0.16;
    const coverTiles: Array<[number, number, number, number]> = [
      [0, 0.35, 4.2, 0.7],
      [0, 1.525, 4.2, 0.45],
      [-1.65, 1.0, 0.9, 0.6],
      [-0.475, 1.0, 0.45, 0.6],
      [0.475, 1.0, 0.45, 0.6],
      [1.65, 1.0, 0.9, 0.6],
    ];
    for (const [cx, czl, w, d] of coverTiles) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(w, COVER_T, d),
        coverWood,
      );
      tile.position.set(cx, 0, czl);
      rotorLidPivot.add(tile);
    }
    for (const wx of rotorX) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.27, 0.025, 8, 20),
        brassMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(wx, 0.09, 1.0);
      rotorLidPivot.add(rim);
    }
    for (const sx of [-1.4, 1.4]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16),
        brassMat,
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(sx, ROTORLID_PIVOT_Y, ROTORLID_PIVOT_Z);
      scene.add(barrel);
    }

    function updateRotors(v: string) {
      const p = (v || "").padEnd(3, "A");
      for (let r = 0; r < 3; r++) targetRot[r] = -(C(p[r]) / 26) * Math.PI * 2;
    }

    function setLamp(ch: string | null) {
      for (const k in lampMats) {
        const lit = ch === k;
        lampMats[k].emissiveIntensity = lit ? 2.2 : 0;
        lampLabels[k].color.set(lit ? 0xfff4cf : 0x6a6248);
      }
    }

    const LID_HINGE_Y = 3.2;
    const LID_HINGE_Z = -5.15;
    const LID_W = 12.9;
    const LID_D = 10.8;
    const LID_WALL = 2.2;
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, LID_HINGE_Y, LID_HINGE_Z);
    scene.add(lidPivot);
    const lidWood = woodMat.clone();
    const lidTop = new THREE.Mesh(
      new RoundedBoxGeometry(LID_W, 0.34, LID_D, 4, 0.16),
      lidWood,
    );
    lidTop.position.set(0, 0, LID_D / 2);
    lidPivot.add(lidTop);
    const lidFront = new THREE.Mesh(
      new RoundedBoxGeometry(LID_W, LID_WALL, 0.34, 3, 0.12),
      lidWood,
    );
    lidFront.position.set(0, -LID_WALL / 2, LID_D);
    lidPivot.add(lidFront);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, LID_WALL, LID_D, 3, 0.12),
        lidWood,
      );
      side.position.set(sx * (LID_W / 2 - 0.17), -LID_WALL / 2, LID_D / 2);
      lidPivot.add(side);
    }
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex(),
      transparent: true,
      depthWrite: false,
    });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), logoMat);
    logo.rotation.x = Math.PI / 2;
    logo.position.set(0, -0.18, LID_D * 0.4);
    lidPivot.add(logo);

    const lidInnerY = -0.18;
    const sbBar = new THREE.Mesh(
      new RoundedBoxGeometry(5.4, 0.18, 0.7, 2, 0.05),
      bakeMat.clone(),
    );
    sbBar.position.set(0, lidInnerY - 0.09, 8.7);
    lidPivot.add(sbBar);
    for (let i = 0; i < 7; i++) {
      const sx = (i - 3) * 0.78;
      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.16, 16),
        brassMat,
      );
      socket.position.set(sx, lidInnerY - 0.18, 8.7);
      lidPivot.add(socket);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 10),
        new THREE.MeshStandardMaterial({
          color: 0xeae0c0,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85,
        }),
      );
      bulb.position.set(sx, lidInnerY - 0.32, 8.7);
      lidPivot.add(bulb);
    }
    [0x35a04a, 0xb8323a].forEach((col, i) => {
      const f = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24),
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.55,
        }),
      );
      f.position.set((i - 0.5) * 1.4, lidInnerY - 0.06, 7.3);
      lidPivot.add(f);
    });
    const namePlate = new THREE.Mesh(
      new RoundedBoxGeometry(3.0, 0.05, 1.1, 2, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x6b6256,
        roughness: 0.4,
        metalness: 0.7,
      }),
    );
    namePlate.position.set(0, lidInnerY - 0.03, 6.1);
    lidPivot.add(namePlate);

    const LID_OPEN = -1.9;
    const LID_SHUT = 0;
    lidPivot.rotation.x = LID_OPEN;
    const backPanel = new THREE.Mesh(
      new RoundedBoxGeometry(LID_W, LID_WALL, 0.34, 3, 0.12),
      woodMat.clone(),
    );
    backPanel.position.set(0, LID_HINGE_Y - LID_WALL / 2, LID_HINGE_Z);
    scene.add(backPanel);
    for (const sx of [-3.8, 3.8]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20),
        brassMat,
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(sx, LID_HINGE_Y, LID_HINGE_Z);
      scene.add(barrel);
    }

    const casing = [body, base, topPanel, housing, trough, pbPanel];
    casing.forEach(
      (m) => (m.material = (m.material as THREE.MeshStandardMaterial).clone()),
    );

    const wiring = new THREE.Group();
    wiring.visible = false;
    scene.add(wiring);

    reflGrp.visible = true;
    etwGrp.visible = true;

    const R_C = 0.6;
    const FACE = 0.43;
    const CX = {
      L: rotorX[0],
      M: rotorX[1],
      R: rotorX[2],
      etw: 1.78,
      refl: -1.78,
    };

    const contact = (x: number, idx: number) => {
      const a = (idx / 26) * Math.PI * 2;
      return new THREE.Vector3(
        x,
        rotorY + Math.cos(a) * R_C,
        rotorZ + Math.sin(a) * R_C,
      );
    };

    function buildInternals() {
      const tray = new THREE.Mesh(
        new THREE.BoxGeometry(10.8, 0.12, 8.6),
        new THREE.MeshStandardMaterial({
          color: 0x0e0c0a,
          roughness: 0.8,
          metalness: 0.15,
        }),
      );
      tray.position.set(0, -1.7, 0.6);
      wiring.add(tray);

      const batt = new THREE.Mesh(
        new RoundedBoxGeometry(2.6, 1.3, 3.0, 3, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x10100c,
          roughness: 0.55,
          metalness: 0.25,
        }),
      );
      batt.position.set(3.3, -0.95, 2.4);
      wiring.add(batt);
      for (const sx of [-0.5, 0.5]) {
        const term = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.22, 16),
          brassMat,
        );
        term.position.set(3.3 + sx, -0.22, 2.4);
        wiring.add(term);
      }
    }

    let xrayOn = false;
    let braid: THREE.Mesh | null = null;
    let braidDirty = true;

    function rebuildBraid() {
      if (!xrayOn) {
        braidDirty = true;
        return;
      }
      braidDirty = false;
      if (braid) {
        wiring.remove(braid);
        braid.geometry.dispose();
        (braid.material as THREE.Material).dispose();
      }
      const c = get(config);
      const pos = get(rotorPos);
      const pR = rotorForwardPerm(
        ROTOR_WIRINGS[c.rotors[2]],
        pos[2],
        c.rings[2],
      );
      const pM = rotorForwardPerm(
        ROTOR_WIRINGS[c.rotors[1]],
        pos[1],
        c.rings[1],
      );
      const pL = rotorForwardPerm(
        ROTOR_WIRINGS[c.rotors[0]],
        pos[0],
        c.rings[0],
      );
      const tubes: THREE.TubeGeometry[] = [];
      const wire = (a: THREE.Vector3, b: THREE.Vector3, sag = 0) => {
        let pts = [a, b];
        if (sag > 0) {
          const mid = a.clone().add(b).multiplyScalar(0.5);
          mid.y = Math.max(mid.y - sag, -1.9);
          pts = [a, mid, b];
        }
        tubes.push(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts),
            sag > 0 ? 20 : 1,
            0.045,
            6,
            false,
          ),
        );
      };
      for (let i = 0; i < 26; i++) {
        const ch = String.fromCharCode(65 + i);
        const keyPt = keyGroups[ch].position.clone().setY(TOP + 0.05);
        const lampPt = lampPos[ch].clone().setY(TOP + 0.02);
        const sockPt = socketPos[ch]
          .clone()
          .add(new THREE.Vector3(0, 0, -0.12));
        wire(keyPt, sockPt, 0.3);
        wire(lampPt, sockPt, 0.25);
        wire(sockPt, contact(CX.etw + 0.2, i), 0.7);
        wire(contact(CX.etw + 0.2, i), contact(CX.etw - 0.2, i));
        const r = pR[i];
        const m = pM[r];
        const l = pL[m];
        wire(contact(CX.etw - 0.2, i), contact(CX.R + FACE, i));
        wire(contact(CX.R + FACE, i), contact(CX.R - FACE, r));
        wire(contact(CX.R - FACE, r), contact(CX.M + FACE, r));
        wire(contact(CX.M + FACE, r), contact(CX.M - FACE, m));
        wire(contact(CX.M - FACE, m), contact(CX.L + FACE, m));
        wire(contact(CX.L + FACE, m), contact(CX.L - FACE, l));
        wire(contact(CX.L - FACE, l), contact(CX.refl + 0.21, l));
      }
      const geo = mergeGeometries(tubes, false);
      tubes.forEach((t) => t.dispose());
      braid = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: 0xc08a3e,
          roughness: 0.5,
          metalness: 0.55,
          emissive: 0x3a2408,
          emissiveIntensity: 0.55,
        }),
      );
      wiring.add(braid);
    }

    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffe169,
        emissive: 0xffe169,
        emissiveIntensity: 2,
      }),
    );
    spark.visible = false;
    wiring.add(spark);

    let active: THREE.Mesh | null = null;
    let activeCurve: THREE.CatmullRomCurve3 | null = null;
    let sparkT0 = 0;

    function buildActive(tr: (Trace & { seq: number }) | null) {
      if (active) {
        wiring.remove(active);
        active.geometry.dispose();
      }
      active = null;
      activeCurve = null;
      if (!tr) {
        spark.visible = false;
        return;
      }
      const p = tr.path;
      const letterAt = (i: number) => String.fromCharCode(65 + i);
      const sock = (i: number) =>
        socketPos[letterAt(i)].clone().add(new THREE.Vector3(0, 0, 0.06));
      const cableMid = (a: number, b: number) => {
        const pa = socketPos[letterAt(a)];
        const pb = socketPos[letterAt(b)];
        const mid = pa.clone().add(pb).multiplyScalar(0.5);
        const sag = Math.min(0.25 + pa.distanceTo(pb) * 0.1, 0.6);
        mid.z = PB_Z + 0.2;
        mid.y = Math.max(Math.min(pa.y, pb.y) - sag, -1.6);
        return mid;
      };
      const inCh = get(lastKey);
      const keyGrp = inCh ? keyGroups[inCh] : null;
      const v: THREE.Vector3[] = [];
      if (keyGrp) {
        v.push(keyGrp.position.clone().setY(TOP + 0.12));
        v.push(keyGrp.position.clone().setY(TOP - 0.4));
      }
      v.push(sock(p[0]));
      if (p[0] !== p[1]) v.push(cableMid(p[0], p[1]), sock(p[1]));
      v.push(
        contact(CX.etw + 0.2, p[1]),
        contact(CX.etw - 0.2, p[1]),
        contact(CX.R + FACE, p[1]),
        contact(CX.R - FACE, p[2]),
        contact(CX.M + FACE, p[2]),
        contact(CX.M - FACE, p[3]),
        contact(CX.L + FACE, p[3]),
        contact(CX.L - FACE, p[4]),
      );
      v.push(contact(CX.refl + 0.21, p[4]), contact(CX.refl + 0.21, p[5]));
      v.push(
        contact(CX.L - FACE, p[5]),
        contact(CX.L + FACE, p[6]),
        contact(CX.M - FACE, p[6]),
        contact(CX.M + FACE, p[7]),
        contact(CX.R - FACE, p[7]),
        contact(CX.R + FACE, p[8]),
        contact(CX.etw - 0.2, p[8]),
        contact(CX.etw + 0.2, p[8]),
      );
      v.push(sock(p[8]));
      if (p[8] !== p[9]) v.push(cableMid(p[8], p[9]), sock(p[9]));
      const outLamp = lampPos[tr.output];
      if (outLamp) {
        v.push(outLamp.clone().add(new THREE.Vector3(0, 0, 0.12)));
        v.push(outLamp.clone());
      }
      activeCurve = new THREE.CatmullRomCurve3(v);
      const tube = new THREE.TubeGeometry(activeCurve, 220, 0.055, 8, false);
      active = new THREE.Mesh(
        tube,
        new THREE.MeshStandardMaterial({
          color: 0xffcf4d,
          emissive: 0xffcf4d,
          emissiveIntensity: 1.6,
          transparent: true,
          opacity: 0.95,
        }),
      );
      wiring.add(active);
      spark.visible = true;
      sparkT0 = performance.now();
    }

    const reflCover = new THREE.Mesh(
      new RoundedBoxGeometry(1.0, 0.9, 2.0, 3, 0.1),
      woodMat.clone(),
    );
    reflCover.position.set(-1.9, 2.1, -3.6);
    scene.add(reflCover);
    const etwCover = new THREE.Mesh(
      new RoundedBoxGeometry(1.0, 0.9, 2.0, 3, 0.1),
      woodMat.clone(),
    );
    etwCover.position.set(1.9, 2.1, -3.6);
    scene.add(etwCover);

    const xrayShells = [body, topPanel, housing, trough, pbPanel];
    xrayShells.forEach((m) => (m.renderOrder = 10));
    const innerLight = new THREE.PointLight(0xffe6c0, 0, 18, 1.6);
    innerLight.position.set(0, 0.2, -1.4);
    scene.add(innerLight);
    function setXray(on: boolean) {
      xrayOn = on;
      xrayShells.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.transparent = on;
        mat.opacity = on ? 0.28 : 1;
        mat.depthWrite = !on;
        mat.depthTest = true;
        mat.emissive.setHex(on ? 0x3a2814 : 0x000000);
        mat.needsUpdate = true;
      });
      innerLight.intensity = on ? 26 : 0;
      wiring.visible = on;
      if (on && braidDirty) rebuildBraid();
    }

    buildInternals();
    rebuildBraid();

    let pressedCh: string | null = null;
    let lidOpen = true;
    let rotorCoverOpen = true;
    const unsubs = [
      rotorPos.subscribe((p) => {
        updateRotors(p);
        rebuildBraid();
        invalidate();
      }),
      lamp.subscribe((v) => {
        setLamp(v);
        invalidate();
      }),
      lastKey.subscribe((v) => {
        pressedCh = v;
        invalidate();
      }),
      config.subscribe((c) => {
        buildCables(c?.plugs ?? "");
        rebuildBraid();
        invalidate();
      }),
      lastTrace.subscribe((t) => {
        buildActive(t);
        invalidate();
      }),
      xray.subscribe((on) => {
        setXray(on);
        invalidate();
      }),
      lidStore.subscribe((v) => {
        lidOpen = v;
        invalidate();
      }),
      rotorLidStore.subscribe((v) => {
        rotorCoverOpen = v;
        invalidate();
      }),
      rotLock.subscribe((v) => {
        controls.enableRotate = !v;
        invalidate();
      }),
      viewPreset.subscribe((v) => {
        if (!v) return;
        const preset = VIEWS[v.name];
        if (!preset) return;
        camTween = {
          pos: new THREE.Vector3(...preset.pos),
          tgt: new THREE.Vector3(...preset.tgt),
        };
        invalidate();
      }),
      quality.subscribe(applyQuality),
    ];

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    let dragFrom: string | null = null;
    const dragPreview = new THREE.Group();
    scene.add(dragPreview);
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -PB_Z);
    const planeHit = new THREE.Vector3();
    function clearPreview() {
      while (dragPreview.children.length) {
        const c = dragPreview.children.pop() as THREE.Mesh;
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
    function drawPreview(from: THREE.Vector3, to: THREE.Vector3) {
      clearPreview();
      const mid = from.clone().add(to).multiplyScalar(0.5);
      mid.z += 1.2;
      mid.y -= 0.4;
      const curve = new THREE.CatmullRomCurve3([from, mid, to]);
      dragPreview.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 32, 0.05, 8, false),
          new THREE.MeshStandardMaterial({
            color: 0xffcf4d,
            emissive: 0xffcf4d,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.85,
          }),
        ),
      );
    }
    function toNdc(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function socketAt(e: PointerEvent): string | null {
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(socketHits, false);
      return h.length ? (h[0].object.userData.ch as string) : null;
    }
    function onDown(e: PointerEvent) {
      downX = e.clientX;
      downY = e.clientY;
      camTween = null;
      const ch = socketAt(e);
      if (ch) {
        dragFrom = ch;
        controls.enabled = false;
        highlightSockets(ch, null);
      }
      invalidate();
    }
    function onMove(e: PointerEvent) {
      if (!dragFrom) return;
      const from = socketPos[dragFrom];
      const over = socketAt(e);
      let to: THREE.Vector3;
      if (over && over !== dragFrom) {
        to = socketPos[over];
      } else {
        toNdc(e);
        ray.setFromCamera(ndc, camera);
        ray.ray.intersectPlane(dragPlane, planeHit);
        to = planeHit;
      }
      drawPreview(from, to);
      highlightSockets(dragFrom, over && over !== dragFrom ? over : null);
    }
    function onUp(e: PointerEvent) {
      if (dragFrom) {
        const moved = Math.hypot(e.clientX - downX, e.clientY - downY) > 6;
        const target = socketAt(e);
        if (!moved && (!target || target === dragFrom)) {
          if (partnerOf(dragFrom)) disconnectPlug(dragFrom);
        } else if (target && target !== dragFrom) {
          connectPlug(dragFrom, target);
        }
        clearPreview();
        highlightSockets(null, null);
        dragFrom = null;
        controls.enabled = true;
        return;
      }
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(keyCaps, false);
      if (hits.length) press(hits[0].object.userData.ch as string);
    }
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);

    function resize() {
      const w = host.clientWidth;
      const h = host.clientHeight || 600;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      invalidate();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      let animating = false;
      for (const ch in keyGroups) {
        const g = keyGroups[ch];
        const d = (ch === pressedCh ? TOP - 0.13 : TOP) - g.position.y;
        if (Math.abs(d) > 0.001) {
          g.position.y += d * 0.4;
          animating = true;
        }
      }
      for (let r = 0; r < 3; r++) {
        const s = rotorSpins[r];
        const d = targetRot[r] - s.rotation.x;
        if (Math.abs(d) > 0.0005) {
          s.rotation.x += d * 0.18;
          animating = true;
        }
      }
      {
        const d1 = (lidOpen ? LID_OPEN : LID_SHUT) - lidPivot.rotation.x;
        if (Math.abs(d1) > 0.0005) {
          lidPivot.rotation.x += d1 * 0.12;
          animating = true;
        }
        const d2 = (lidOpen ? FLAP_OPEN : FLAP_SHUT) - flapPivot.rotation.x;
        if (Math.abs(d2) > 0.0005) {
          flapPivot.rotation.x += d2 * 0.12;
          animating = true;
        }
        const d3 =
          (rotorCoverOpen && lidOpen ? ROTORLID_OPEN : ROTORLID_SHUT) -
          rotorLidPivot.rotation.x;
        if (Math.abs(d3) > 0.0005) {
          rotorLidPivot.rotation.x += d3 * 0.12;
          animating = true;
        }
      }
      if (camTween) {
        camera.position.lerp(camTween.pos, 0.14);
        controls.target.lerp(camTween.tgt, 0.14);
        if (camera.position.distanceTo(camTween.pos) < 0.03) camTween = null;
        animating = true;
      }
      if (active && activeCurve && spark.visible) {
        const dt = (performance.now() - sparkT0) / 900;
        if (dt <= 2) {
          spark.position.copy(activeCurve.getPointAt(dt % 1));
          animating = true;
        } else {
          spark.visible = false;
          needsRender = true;
        }
      }
      controls.update();
      if (animating) needsRender = true;
      if (needsRender) {
        needsRender = false;
        renderer.render(scene, camera);
        fpsSample();
      }
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubs.forEach((u) => u());
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.removeEventListener("change", invalidate);
      clearPreview();
      controls.dispose();
      clearCables();
      woodMap.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  });
</script>

<div class="viewport" bind:this={host}></div>

<style>
  .viewport {
    width: 100%;
    flex: 1;
    min-height: 0;
    border-radius: 14px;
    overflow: hidden;
    background: radial-gradient(120% 100% at 50% 0%, #1c1814, #0a0908 78%);
    border: 1px solid #000;
    box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.7);
    touch-action: none;
    position: relative;
  }
  .viewport :global(canvas) {
    display: block;
  }
</style>
