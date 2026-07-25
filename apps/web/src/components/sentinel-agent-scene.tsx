"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/*
 * THE SENTINEL AGENT (Phase 10, Task 4).
 *
 * The official EduSentinel AI assistant. Ported from the approved reference
 * implementation (robo.txt) rather than rebuilt — the geometry, the lathed neck
 * profile, the tube-geometry eyes, the procedurally generated PBR speckle and
 * the pointer-tracking rig are all the reference's.
 *
 * FOUR CHANGES, and each is here for a reason worth writing down:
 *
 *  1. `<Environment preset="studio" />` IS REMOVED. drei's Environment presets
 *     fetch an HDR cube map from a third-party CDN at runtime. That request would
 *     be blocked outright by this app's `connect-src 'self'` policy — and even if
 *     it were not, it is a third-party request made from a page a visitor is only
 *     reading, which is the exact thing `npm run check:trackers` exists to
 *     prevent. It is replaced with three local lights that reproduce the studio
 *     key/fill/rim relationship in-scene, at zero network cost.
 *
 *  2. The reference's `AntennaNavbar` is gone, along with `react-icons`. It was a
 *     demo chrome bar for a shop; this app has its own navigation, and a whole
 *     icon package for one shopping-bag glyph is not a trade worth making.
 *
 *  3. A SUBTLE FLOAT was added — the brief asked for it and the reference has
 *     only pointer tracking. It is a slow vertical bob plus a slight roll, on
 *     offset periods so the loop never visibly repeats.
 *
 *  4. EXPRESSIONS. The reference switches to heart eyes on pointer-down. Hearts
 *     are wrong for a security agent, so the same mechanism drives three states
 *     that suit one: `idle` (the standing blink), `alert` (eyes widen on hover)
 *     and `happy` (a warm arc on click). The screen colour follows the state.
 *
 * The scene never mounts on a phone, never mounts under prefers-reduced-motion,
 * and is loaded only when scrolled into view — see sentinel-agent.tsx. This file
 * and everything it imports are behind that dynamic boundary, so three.js is not
 * in any initial bundle.
 */

/* Brand palette for the visor, as THREE colours. `--color-brand-glow` in light,
   its dark-mode value in dark; passed in from the wrapper so the scene never
   has to read CSS. */
const SCREEN_IDLE = "#22d3ee";
const SCREEN_ALERT = "#67f0ff";
const SCREEN_HAPPY = "#35e3c2";

type Expression = "idle" | "alert" | "happy";

function ResponsiveGroup({ children }: { children: React.ReactNode }) {
  const { viewport } = useThree();
  const scale = Math.min(1.15, viewport.width / 3.4);
  return <group scale={scale}>{children}</group>;
}

/* ---------------------------------------------------------------- visor ---- */

/*
 * The glass dome over the face. A Fresnel shader: transparent head-on, bright at
 * grazing angles, which is what makes a curved transparent surface read as glass
 * rather than as a tinted sphere.
 */
const SCREEN_FOR: Record<Expression, string> = {
  idle: SCREEN_IDLE,
  alert: SCREEN_ALERT,
  happy: SCREEN_HAPPY,
};

/*
 * The visor reads the expression PER FRAME from the ref, rather than taking a
 * colour prop computed during render. Expression changes many times a second as
 * the pointer moves across the agent; routing that through React state would
 * re-render the whole scene graph on hover. The ref keeps the reaction on the
 * render loop where it belongs, and this component is the only thing that needs
 * to know what colour the current expression implies.
 */
function GlassCapsule({
  expressionRef,
  power,
  intensity,
}: {
  expressionRef: React.RefObject<Expression>;
  power: number;
  intensity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(SCREEN_IDLE) },
      power: { value: 2.5 },
      intensity: { value: 0.6 },
    }),
    [],
  );

  const target = useMemo(() => new THREE.Color(SCREEN_IDLE), []);

  useFrame((_, delta) => {
    if (!materialRef.current) return;
    target.set(SCREEN_FOR[expressionRef.current]);
    // Ease the visor between expression colours instead of cutting — a hard
    // colour switch on a glowing surface looks like a bug, not a reaction.
    materialRef.current.uniforms.color.value.lerp(target, Math.min(delta * 6, 1));
    materialRef.current.uniforms.power.value = power;
    materialRef.current.uniforms.intensity.value = intensity;
  });

  return (
    <mesh>
      <sphereGeometry args={[0.3, 48, 48, 0, Math.PI * 2, 0, Math.PI]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 color;
          uniform float power;
          uniform float intensity;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
            fresnel = pow(fresnel, power);
            gl_FragColor = vec4(color, fresnel * intensity);
          }
        `}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ ears ---- */

const earBaseMat = new THREE.MeshStandardMaterial({ color: "#f0f0f0", roughness: 0.5 });
const earRingMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
const earCenterMat = new THREE.MeshStandardMaterial({ color: "#cccccc", roughness: 0.8 });
const antennaBaseMat = new THREE.MeshStandardMaterial({
  color: "#999999",
  roughness: 0.4,
  metalness: 0.5,
});
const antennaStickMat = new THREE.MeshStandardMaterial({
  color: "#d0d0d0",
  roughness: 0.4,
  metalness: 0.2,
});
/* The reference's antenna tip is hot pink. On a security agent the tip is the
   status light, so it takes the brand accent. */
const antennaTipMat = new THREE.MeshStandardMaterial({
  color: SCREEN_IDLE,
  roughness: 0.2,
  toneMapped: false,
});

function RobotEar({
  position,
  scale = 1,
  isLeft = false,
}: {
  position: [number, number, number];
  scale?: number;
  isLeft?: boolean;
}) {
  const dir = isLeft ? -1 : 1;

  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow material={earBaseMat}>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 24]} />
      </mesh>

      <mesh
        position={[dir * 0.012, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
        material={earRingMat}
      >
        <torusGeometry args={[0.032, 0.008, 12, 24]} />
      </mesh>

      <mesh
        position={[dir * 0.012, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        receiveShadow
        material={earCenterMat}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.005, 24]} />
      </mesh>

      <group position={[dir * 0.015, 0.035, 0]} rotation={[-0.4, 0, 0]}>
        <mesh position={[0, 0.01, 0]} castShadow receiveShadow material={antennaBaseMat}>
          <cylinderGeometry args={[0.006, 0.008, 0.02, 12]} />
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow material={antennaStickMat}>
          <cylinderGeometry args={[0.003, 0.003, 0.1, 8]} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow material={antennaTipMat}>
          <sphereGeometry args={[0.006, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ eyes ---- */

const eyeMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color(2, 2, 2),
  toneMapped: false,
  transparent: true,
});
const happyMat = new THREE.MeshBasicMaterial({ color: SCREEN_HAPPY, toneMapped: false });

/*
 * An eye is two rounded tube segments — a top lid arc and a bottom one — with a
 * gap between them. Blinking squashes the whole group on Y, which closes the gap
 * exactly the way a real lid does.
 */
function RobotEye({
  position,
  rotation,
  scale = 1,
  blinkDuration = 0.15,
  blinkCycle = 3.0,
  expressionRef,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  blinkDuration?: number;
  blinkCycle?: number;
  expressionRef: React.RefObject<Expression>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const normalEyesRef = useRef<THREE.Group>(null);
  const happyEyeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !normalEyesRef.current || !happyEyeRef.current) return;

    const expression = expressionRef.current;
    const isHappy = expression === "happy";

    normalEyesRef.current.visible = !isHappy;
    happyEyeRef.current.visible = isHappy;

    const cycle = clock.getElapsedTime() % blinkCycle;
    let targetScaleY = 1;

    // An agent that is paying attention does not blink mid-glance, and its eyes
    // open a little wider — that is the whole "alert" expression.
    if (cycle < blinkDuration && !isHappy && expression !== "alert") {
      const progress = cycle / blinkDuration;
      targetScaleY = Math.max(0.05, 1.0 - Math.sin(progress * Math.PI));
    }

    const widen = expression === "alert" ? 1.22 : 1;
    groupRef.current.scale.set(scale * widen, scale * targetScaleY * widen, scale);
  });

  const { topPath, bottomPath, happyPath } = useMemo(() => {
    const w = 0.025;
    const h = 0.035;
    const r = 0.02;
    const g = 0.005;

    const rounded = (sign: number) => {
      const p = new THREE.CurvePath<THREE.Vector3>();
      const H = sign * h;
      const R = sign * r;
      const G = sign * g;
      p.add(new THREE.LineCurve3(new THREE.Vector3(-w, G, 0), new THREE.Vector3(-w, H - R, 0)));
      p.add(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-w, H - R, 0),
          new THREE.Vector3(-w, H, 0),
          new THREE.Vector3(-w + r, H, 0),
        ),
      );
      p.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, H, 0), new THREE.Vector3(w - r, H, 0)));
      p.add(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(w - r, H, 0),
          new THREE.Vector3(w, H, 0),
          new THREE.Vector3(w, H - R, 0),
        ),
      );
      p.add(new THREE.LineCurve3(new THREE.Vector3(w, H - R, 0), new THREE.Vector3(w, G, 0)));
      return p;
    };

    /* The happy eye: a simple upward arc — the "^_^" of a friendly assistant,
       which is the right register for this product where a heart was not. */
    const happy = new THREE.CurvePath<THREE.Vector3>();
    happy.add(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-w * 1.15, -0.008, 0),
        new THREE.Vector3(0, 0.038, 0),
        new THREE.Vector3(w * 1.15, -0.008, 0),
      ),
    );

    return { topPath: rounded(1), bottomPath: rounded(-1), happyPath: happy };
  }, []);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh ref={happyEyeRef} visible={false} material={happyMat}>
        <tubeGeometry args={[happyPath, 24, 0.0038, 6, false]} />
      </mesh>

      <group ref={normalEyesRef}>
        <mesh material={eyeMat}>
          <tubeGeometry args={[topPath, 16, 0.0035, 6, false]} />
        </mesh>
        <mesh material={eyeMat}>
          <tubeGeometry args={[bottomPath, 16, 0.0035, 6, false]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------- textures ---- */

/*
 * The chassis speckle, generated once into a canvas rather than shipped as an
 * image. It is what stops the body reading as flat plastic, and it costs no
 * network request at all — which on this platform is the deciding argument.
 */
function generatePbrTexturesAsync(): Promise<{
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const size = 512;
      const canvasC = document.createElement("canvas");
      const canvasB = document.createElement("canvas");
      canvasC.width = canvasB.width = size;
      canvasC.height = canvasB.height = size;
      const ctxC = canvasC.getContext("2d");
      const ctxB = canvasB.getContext("2d");

      if (ctxC && ctxB) {
        ctxC.fillStyle = "#dcdcdc";
        ctxC.fillRect(0, 0, size, size);
        ctxB.fillStyle = "#808080";
        ctxB.fillRect(0, 0, size, size);

        for (let i = 0; i < 8000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 0.5 + Math.random() * 1.5;
          const isDark = Math.random() > 0.15;

          ctxC.beginPath();
          ctxC.arc(x, y, r, 0, Math.PI * 2);
          ctxC.fillStyle = isDark ? "#222222" : "#dddddd";
          ctxC.fill();

          ctxB.beginPath();
          ctxB.arc(x, y, r, 0, Math.PI * 2);
          ctxB.fillStyle = isDark ? "#000000" : "#ffffff";
          ctxB.fill();
        }
      }

      const texC = new THREE.CanvasTexture(canvasC);
      const texB = new THREE.CanvasTexture(canvasB);
      texC.wrapS = texB.wrapS = THREE.RepeatWrapping;
      texC.wrapT = texB.wrapT = THREE.RepeatWrapping;
      texC.repeat.set(6, 3);
      texB.repeat.set(6, 3);
      texC.needsUpdate = true;
      texB.needsUpdate = true;

      resolve({ colorMap: texC, bumpMap: texB });
    }, 0);
  });
}

/* ----------------------------------------------------------------- rig ---- */

function SentinelPrototype() {
  /*
   * The expression lives in a ref, not in state, and deliberately: it changes on
   * every pointer enter/leave/press, and a re-render of a WebGL scene graph is
   * far more expensive than the DOM one React was designed around. Everything
   * that reacts to it — the eyes, the visor — reads it inside `useFrame`.
   */
  const expressionRef = useRef<Expression>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const floatRef = useRef<THREE.Group>(null);

  const [textures, setTextures] = useState<{
    colorMap: THREE.CanvasTexture | null;
    bumpMap: THREE.CanvasTexture | null;
  }>({ colorMap: null, bumpMap: null });

  const design = {
    screenColor: SCREEN_IDLE,
    screenPower: 3.8,
    screenGlow: 1.2,
    eyeSpacing: 0.07,
    earScale: 1.3,
    eyeScale: 1.1,
    blinkCycle: 3.0,
    blinkDuration: 0.45,
    chassis: "#c4c4c4",
    headHeight: 0.6,
  };

  const config = {
    moveSpeed: 0.35,
    bodyRotSpeed: 10.0,
    headRotSpeed: 20.0,
    bodyTiltY: 0.95,
    headLookX: 0.3,
    headLookY: 1.8,
  };

  const setExpression = (e: Expression) => {
    expressionRef.current = e;
  };

  useFrame((state, delta) => {
    if (!bodyRef.current || !headRef.current || !floatRef.current) return;

    const dt = Math.min(delta, 0.1);
    const t = state.clock.getElapsedTime();

    /* ---- the added float: slow bob + slight roll, on offset periods ---- */
    floatRef.current.position.y = Math.sin(t * 0.85) * 0.035;
    floatRef.current.rotation.z = Math.sin(t * 0.53) * 0.018;

    /* ---- the reference's pointer rig ---- */
    const tx = state.pointer.x;
    const ty = state.pointer.y;

    const maxMoveX = state.viewport.width / 3.5;
    bodyRef.current.position.x = THREE.MathUtils.lerp(
      bodyRef.current.position.x,
      tx * maxMoveX,
      config.moveSpeed * dt,
    );

    const relativeX = tx - bodyRef.current.position.x / 2.5;

    bodyRef.current.rotation.y = THREE.MathUtils.lerp(
      bodyRef.current.rotation.y,
      -relativeX * config.bodyTiltY,
      config.bodyRotSpeed * dt,
    );
    bodyRef.current.rotation.x = THREE.MathUtils.lerp(
      bodyRef.current.rotation.x,
      -ty * 0.25,
      config.bodyRotSpeed * dt,
    );
    bodyRef.current.rotation.z = THREE.MathUtils.lerp(
      bodyRef.current.rotation.z,
      -relativeX * 0.15,
      config.bodyRotSpeed * dt,
    );

    // The head leads the body — it turns further and faster, which is what makes
    // the thing look like it is LOOKING at you rather than being rotated.
    headRef.current.rotation.y = THREE.MathUtils.lerp(
      headRef.current.rotation.y,
      relativeX * config.headLookY,
      config.headRotSpeed * dt,
    );
    headRef.current.rotation.x = THREE.MathUtils.lerp(
      headRef.current.rotation.x,
      -ty * config.headLookX,
      config.headRotSpeed * dt,
    );
  });

  useEffect(() => {
    let mounted = true;
    let generated: { colorMap: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null =
      null;

    generatePbrTexturesAsync().then((res) => {
      if (mounted) {
        generated = res;
        setTextures(res);
      } else {
        res.colorMap.dispose();
        res.bumpMap.dispose();
      }
    });

    return () => {
      mounted = false;
      if (generated) {
        generated.colorMap.dispose();
        generated.bumpMap.dispose();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setExpression("happy");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setExpression("idle"), 2200);
  };

  const handlePointerOver = () => {
    document.body.style.cursor = "pointer";
    if (expressionRef.current !== "happy") setExpression("alert");
  };

  const handlePointerOut = () => {
    document.body.style.cursor = "auto";
    if (expressionRef.current !== "happy") setExpression("idle");
  };

  /* The lathed neck collar — a profile revolved about Y. */
  const neckProfile = useMemo(() => {
    const p = {
      baseR: 0.215,
      baseH: -0.05,
      midR: 0.28,
      midH: 0.02,
      lipBottomR: 0.295,
      lipBottomH: 0.045,
      lipTopR: 0.27,
      lipTopH: 0.055,
      innerR: 0.1,
    };
    return [
      new THREE.Vector2(p.innerR, p.baseH),
      new THREE.Vector2(p.baseR, p.baseH),
      new THREE.Vector2(p.midR, p.midH),
      new THREE.Vector2(p.lipBottomR, p.lipBottomH),
      new THREE.Vector2(p.lipTopR, p.lipTopH),
      new THREE.Vector2(p.innerR, p.lipTopH),
    ];
  }, []);

  const headMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111111", roughness: 1, metalness: 0 }),
    [],
  );

  const chassisProps = {
    color: design.chassis,
    map: textures.colorMap ?? undefined,
    bumpMap: textures.bumpMap ?? undefined,
    bumpScale: 0.005,
    roughness: 1,
    metalness: 0,
  };

  if (!textures.colorMap) return null;

  return (
    <group ref={floatRef}>
      <group
        ref={bodyRef}
        position={[0, -0.3, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* body */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.43, 48, 48, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.85]} />
          <meshStandardMaterial {...chassisProps} envMapIntensity={0} />
        </mesh>

        {/* the bevel ring where the body meets the collar */}
        <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.235, 0.025, 24, 48]} />
          <meshStandardMaterial {...chassisProps} envMapIntensity={0} />
        </mesh>

        {/* collar */}
        <mesh position={[0, 0.38, 0]} receiveShadow castShadow>
          <latheGeometry args={[neckProfile, 48]} />
          <meshStandardMaterial {...chassisProps} envMapIntensity={0} />
        </mesh>

        <group ref={headRef} position={[0, design.headHeight, 0]}>
          <mesh material={headMat} castShadow receiveShadow>
            <sphereGeometry args={[0.28, 48, 48, 0, Math.PI * 2, 0, Math.PI]} />
          </mesh>

          <GlassCapsule
            expressionRef={expressionRef}
            power={design.screenPower}
            intensity={design.screenGlow}
          />

          <group position={[0, -0.02, 0.29]}>
            <RobotEye
              position={[-design.eyeSpacing, 0, 0]}
              rotation={[0, -0.2, 0]}
              scale={design.eyeScale}
              blinkDuration={design.blinkDuration}
              blinkCycle={design.blinkCycle}
              expressionRef={expressionRef}
            />
            <RobotEye
              position={[design.eyeSpacing, 0, 0]}
              rotation={[0, 0.2, 0]}
              scale={design.eyeScale}
              blinkDuration={design.blinkDuration}
              blinkCycle={design.blinkCycle}
              expressionRef={expressionRef}
            />
          </group>

          <RobotEar position={[-0.29, 0, 0]} isLeft scale={design.earScale} />
          <RobotEar position={[0.29, 0, 0]} scale={design.earScale} />
        </group>
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------- scene ---- */

export default function SentinelAgentScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.2, 6], fov: 40 }}
      // Cap the pixel ratio: a 3x phone-class DPR on a WebGL scene this size buys
      // nothing visible and costs a great deal of fill rate.
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      {/*
       * Local three-point lighting, replacing drei's CDN-fetched studio HDR.
       * Key from front-right, cool fill from the left, and a brand-tinted rim
       * from behind that separates the chassis from a dark background.
       */}
      <ambientLight intensity={0.62} color="#ffffff" />
      <directionalLight
        position={[2.5, 4, 4]}
        intensity={1.65}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-1.5, 1.5, 1.5, -1.5, 0.1, 20]} />
      </directionalLight>
      <directionalLight position={[-4, 1.5, 2]} intensity={0.5} color="#dbeafe" />
      <directionalLight position={[-1, 2, -4]} intensity={0.9} color={SCREEN_IDLE} />

      <ResponsiveGroup>
        <ContactShadows
          position={[0, -0.79, 0]}
          opacity={0.72}
          scale={13}
          resolution={512}
          blur={1.9}
          far={2.5}
          color="#000000"
        />
        <SentinelPrototype />
      </ResponsiveGroup>
    </Canvas>
  );
}
