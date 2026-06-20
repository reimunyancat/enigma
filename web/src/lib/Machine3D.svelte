<script lang="ts">
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
  import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
  import {
    rotorPos,
    lamp,
    lastKey,
    config,
    press,
    xray,
    lastTrace,
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

    // IBL — 금속/나무 반사
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

    // ── 절차적 나무결 ──
    function woodTexture(): THREE.CanvasTexture {
      const w = 512,
        h = 512;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#5b3d22";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
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
    const woodMap = woodTexture();

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
    // 위를 보는(바닥에 눕는) 라벨
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
    // 앞면(+Z)을 보는 라벨
    function faceLabel(ch: string, color: string, size: number): THREE.Mesh {
      const m = new THREE.MeshBasicMaterial({
        map: letterTex(ch, color),
        transparent: true,
        depthWrite: false,
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
    }

    // ENIGMA 로고판
    function logoTex(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 256;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#0d0b09";
      g.fillRect(0, 0, 512, 256);
      g.strokeStyle = "#c9a24b";
      g.lineWidth = 7;
      g.beginPath();
      g.ellipse(256, 128, 208, 78, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#ece4d0";
      g.font = "bold 96px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Enigma", 256, 138);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }

    // ── 재질 ──
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodMap,
      roughness: 0.58,
      metalness: 0.0,
      envMapIntensity: 0.6,
    });
    const woodDark = new THREE.MeshStandardMaterial({
      color: 0x3a2412,
      roughness: 0.62,
      metalness: 0.0,
      envMapIntensity: 0.5,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc9a24b,
      roughness: 0.28,
      metalness: 0.95,
      envMapIntensity: 1.0,
    });
    const brassDk = new THREE.MeshStandardMaterial({
      color: 0x9c7a33,
      roughness: 0.4,
      metalness: 0.9,
      envMapIntensity: 0.9,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xb8bcc2,
      roughness: 0.3,
      metalness: 0.9,
      envMapIntensity: 1.0,
    });
    const bakeMat = new THREE.MeshStandardMaterial({
      color: 0x14110d,
      roughness: 0.38,
      metalness: 0.3,
      envMapIntensity: 0.7,
    });
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1610,
      roughness: 0.5,
      metalness: 0.35,
      envMapIntensity: 0.6,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x09070a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x161616,
      roughness: 0.75,
      metalness: 0.05,
    });

    const TOP = 1.1;

    // ── 케이스 ──
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

    // 키보드+램프보드용 검은 패널
    const topPanel = new THREE.Mesh(
      new RoundedBoxGeometry(11.4, 0.14, 7.4, 3, 0.08),
      panelMat,
    );
    topPanel.position.set(0, TOP + 0.02, 1.5);
    scene.add(topPanel);

    // 뒤쪽 로터 하우징 (살짝 솟음, 얕게)
    const housing = new THREE.Mesh(
      new RoundedBoxGeometry(12.5, 1.7, 3.0, 4, 0.18),
      woodMat,
    );
    housing.position.set(0, 1.1, -3.3);
    scene.add(housing);
    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.6, 1.85),
      darkMat,
    );
    trough.position.set(-0.1, 1.4, -3.3);
    scene.add(trough);

    // 모서리 브라스 리벳
    const rivetGeo = new THREE.SphereGeometry(0.12, 16, 16);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const rv = new THREE.Mesh(rivetGeo, brassMat);
        rv.position.set(sx * 5.5, TOP + 0.05, 1.5 + sz * 3.4);
        scene.add(rv);
      }

    // ── 앞면 플러그보드 ──
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
        scene.add(plate);
        const ring = new THREE.Mesh(socketRingGeo, brassMat);
        ring.position.set(x, y, PB_Z + 0.04);
        scene.add(ring);
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

    // 플러그 케이블 (설정의 plugs 반영)
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
        mid.z += 1.6;
        mid.y -= 0.7;
        const curve = new THREE.CatmullRomCurve3([
          a,
          a.clone().add(new THREE.Vector3(0, -0.15, 0.7)),
          mid,
          b.clone().add(new THREE.Vector3(0, -0.15, 0.7)),
          b,
        ]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 46, 0.055, 8, false),
          cableMat,
        );
        cableGroup.add(tube);
      }
    }

    // ── 키보드 ──
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

    // ── 램프보드 ──
    const LAMPZ = [0.9, -0.2, -1.3];
    const lampMats: Record<string, THREE.MeshStandardMaterial> = {};
    const lampLabels: Record<string, THREE.MeshBasicMaterial> = {};
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
      });
    });

    // ── 로터  ──
    const rotorX = [-0.95, 0, 0.95];
    const rotorY = 1.82;
    const rotorZ = -3.3;
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
    // ── 리플렉터 ──
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
    // ── 엔트리 휠 ──
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

    // ── 뚜껑 + ENIGMA 로고 ──
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.95, -4.85);
    scene.add(lidPivot);
    const lid = new THREE.Mesh(
      new RoundedBoxGeometry(12.5, 0.35, 9.0, 4, 0.18),
      woodMat,
    );
    lid.position.set(0, 0, 4.4);
    lidPivot.add(lid);
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTex(),
      transparent: true,
      depthWrite: false,
    });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), logoMat);
    logo.rotation.x = -Math.PI / 2;
    logo.position.set(0, 0.2, 4.0);
    lidPivot.add(logo);
    lidPivot.rotation.x = -2.05;
    // 경첩 barrels
    for (const sx of [-3.6, 3.6]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20),
        brassMat,
      );
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(sx, 1.95, -4.85);
      scene.add(barrel);
    }

    const casing = [body, base, topPanel, housing, trough, pbPanel, lid];
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
      const loomMat = new THREE.MeshStandardMaterial({
        color: 0xff8a3c,
        emissive: 0xff6a1e,
        emissiveIntensity: 1.1,
        roughness: 0.5,
        metalness: 0.1,
      });

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

      const loom = (
        a: THREE.Vector3,
        b: THREE.Vector3,
        c: THREE.Vector3,
        d: THREE.Vector3,
        rad: number,
      ) => {
        const curve = new THREE.CatmullRomCurve3([a, b, c, d]);
        wiring.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(curve, 50, rad, 8, false),
            loomMat,
          ),
        );
      };

      for (const sx of [-3.6, -2.2, -0.8, 0.8, 2.2, 3.6]) {
        loom(
          new THREE.Vector3(sx, 0.95, -1.0),
          new THREE.Vector3(sx * 0.7, -1.35, 0.6),
          new THREE.Vector3(sx * 0.45, -1.0, -2.2),
          new THREE.Vector3(
            THREE.MathUtils.clamp(sx * 0.4, -1.9, 1.9),
            rotorY - 0.25,
            rotorZ - 0.1,
          ),
          0.085,
        );
      }
      for (const sx of [-0.7, 0, 0.7]) {
        loom(
          new THREE.Vector3(sx, -0.6, 5.2),
          new THREE.Vector3(sx * 0.6, -1.35, 2.5),
          new THREE.Vector3(sx * 0.4, -0.7, -0.8),
          new THREE.Vector3(CX.etw + sx * 0.3, rotorY - 0.3, rotorZ + 0.2),
          0.07,
        );
      }
    }

    let braid: THREE.LineSegments | null = null;

    function rebuildBraid() {
      if (braid) {
        wiring.remove(braid);
        braid.geometry.dispose();
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
      const pts: THREE.Vector3[] = [];
      const seg = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a, b);
      for (let i = 0; i < 26; i++) {
        const r = pR[i];
        const m = pM[r];
        const l = pL[m];
        seg(contact(CX.etw - 0.2, i), contact(CX.R + FACE, i));
        seg(contact(CX.R + FACE, i), contact(CX.R - FACE, r));
        seg(contact(CX.R - FACE, r), contact(CX.M + FACE, r));
        seg(contact(CX.M + FACE, r), contact(CX.M - FACE, m));
        seg(contact(CX.M - FACE, m), contact(CX.L + FACE, m));
        seg(contact(CX.L + FACE, m), contact(CX.L - FACE, l));
        seg(contact(CX.L - FACE, l), contact(CX.refl + 0.21, l));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd479,
        transparent: true,
        opacity: 0.6,
      });
      braid = new THREE.LineSegments(g, mat);
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
      const v = [
        contact(CX.etw + 0.2, p[1]),
        contact(CX.R + FACE, p[1]),
        contact(CX.R - FACE, p[2]),
        contact(CX.M + FACE, p[2]),
        contact(CX.M - FACE, p[3]),
        contact(CX.L + FACE, p[3]),
        contact(CX.L - FACE, p[4]),
        contact(CX.refl + 0.21, p[4]),
        contact(CX.refl + 0.21, p[5]),
        contact(CX.L - FACE, p[5]),
        contact(CX.L + FACE, p[6]),
        contact(CX.M - FACE, p[6]),
        contact(CX.M + FACE, p[7]),
        contact(CX.R - FACE, p[7]),
        contact(CX.R + FACE, p[8]),
        contact(CX.etw - 0.2, p[8]),
        contact(CX.etw + 0.2, p[9]),
      ];
      activeCurve = new THREE.CatmullRomCurve3(v);
      const tube = new THREE.TubeGeometry(activeCurve, 220, 0.045, 8, false);
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
    reflCover.position.set(-1.9, 2.1, -3.3);
    scene.add(reflCover);
    const etwCover = new THREE.Mesh(
      new RoundedBoxGeometry(1.0, 0.9, 2.0, 3, 0.1),
      woodMat.clone(),
    );
    etwCover.position.set(1.9, 2.1, -3.3);
    scene.add(etwCover);

    const xrayShells = [body, topPanel, housing, trough, pbPanel];
    xrayShells.forEach((m) => (m.renderOrder = 10));
    const innerLight = new THREE.PointLight(0xffe6c0, 0, 18, 1.6);
    innerLight.position.set(0, 0.2, -1.4);
    scene.add(innerLight);
    function setXray(on: boolean) {
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
    }

    buildInternals();
    rebuildBraid();

    rebuildBraid();

    let pressedCh: string | null = null;
    const unsubs = [
      rotorPos.subscribe((p) => {
        (updateRotors(p), rebuildBraid());
      }),
      lamp.subscribe(setLamp),
      lastKey.subscribe((v) => {
        pressedCh = v;
      }),
      config.subscribe((c) => {
        buildCables(c?.plugs ?? "");
        rebuildBraid();
      }),
      lastTrace.subscribe((t) => buildActive(t)),
      xray.subscribe((on) => setXray(on)),
    ];

    // ── 포인터 타건 ──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    function toNdc(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    function onDown(e: PointerEvent) {
      downX = e.clientX;
      downY = e.clientY;
    }
    function onUp(e: PointerEvent) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(keyCaps, false);
      if (hits.length) press(hits[0].object.userData.ch as string);
    }
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    function resize() {
      const w = host.clientWidth;
      const h = host.clientHeight || 600;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      for (const ch in keyGroups) {
        const g = keyGroups[ch];
        const ty = ch === pressedCh ? TOP - 0.13 : TOP;
        g.position.y += (ty - g.position.y) * 0.4;
      }
      for (let r = 0; r < 3; r++) {
        const s = rotorSpins[r];
        s.rotation.x += (targetRot[r] - s.rotation.x) * 0.18;
      }
      if (active && activeCurve && spark.visible) {
        const dt = ((performance.now() - sparkT0) / 900) % 1;
        spark.position.copy(activeCurve.getPointAt(dt));
      }
      controls.update();
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsubs.forEach((u) => u());
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
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
  }
  .viewport :global(canvas) {
    display: block;
  }
</style>
