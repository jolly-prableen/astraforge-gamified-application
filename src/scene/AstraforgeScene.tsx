import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAstraforgeStore } from "../state/useAstraforgeStore";
import type { TaskSet } from "../state/useAstraforgeStore";
import { generateBackgroundStars, Vec3 } from "./constellation";
import { GLOBE_RADIUS, GLOBE_RINGS, NODES_PER_RING } from "./globeConfig";
import { mulberry32, randomRange } from "./random";
import { generateTextPoints } from "./textPoints";

export type IntroPhase = "forming" | "hold" | "dissolve" | "done";

type SceneProps = {
  introPhase: IntroPhase;
  onCameraSettled?: () => void;
};

const CameraRig = ({ introPhase, onCameraSettled }: SceneProps) => {
  const { camera } = useThree();
  const cameraProgress = useRef(0);
  const cameraSettled = useRef(false);

  useFrame((_, delta) => {
    if (introPhase !== "done") {
      return;
    }

    cameraProgress.current = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(cameraProgress.current, 1, 1 - Math.exp(-delta * 1.2)),
      0,
      1
    );

    const t = THREE.MathUtils.smootherstep(cameraProgress.current, 0, 1);
    const z = THREE.MathUtils.lerp(9, 7.6, t);
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);

    if (cameraProgress.current > 0.995 && !cameraSettled.current) {
      cameraSettled.current = true;
      onCameraSettled?.();
    }
  });

  return null;
};

const FarFieldStars = ({ seed }: { seed: number }) => {
  const points = useMemo(() => generateBackgroundStars(seed, 1600, 50), [seed]);
  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={points} count={points.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#7f90ad" transparent opacity={0.4} depthWrite={false} />
    </points>
  );
};

const createGlobePositions = () => {
  const total = GLOBE_RINGS * NODES_PER_RING;
  const data = new Float32Array(total * 3);
  let index = 0;

  for (let r = 0; r < GLOBE_RINGS; r += 1) {
    const t = (r + 1) / (GLOBE_RINGS + 1);
    const latitude = -0.95 + t * 1.9;
    const ringRadius = GLOBE_RADIUS * Math.cos(latitude);
    const y = GLOBE_RADIUS * Math.sin(latitude);
    for (let n = 0; n < NODES_PER_RING; n += 1) {
      const angle = (Math.PI * 2 * n) / NODES_PER_RING;
      data[index] = Math.cos(angle) * ringRadius;
      data[index + 1] = y;
      data[index + 2] = Math.sin(angle) * ringRadius;
      index += 3;
    }
  }

  return data;
};

const SimpleGlobe = ({ positions, stabilized, xp }: { positions: Float32Array; stabilized: boolean; xp: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const tilt = useRef({ x: 0, y: 0 });

  const baseColor = useMemo(() => new THREE.Color().setHSL(0.62, 0.28, 0.45), []);
  const warmColor = useMemo(() => new THREE.Color().setHSL(0.08, 0.35, 0.55), []);

  useFrame(({ clock, mouse }, delta) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const tiltScale = 0;
    const targetX = mouse.y * tiltScale;
    const targetY = mouse.x * tiltScale;
    tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, targetX, 1 - Math.exp(-delta * 3));
    tilt.current.y = THREE.MathUtils.lerp(tilt.current.y, targetY, 1 - Math.exp(-delta * 3));
    const baseSpeed = stabilized ? 0.04 : 0.04;
    groupRef.current.rotation.y = t * baseSpeed + tilt.current.y;
    groupRef.current.rotation.x = 0.15 + tilt.current.x;

    if (materialRef.current) {
      const xpFactor = Math.min(1, xp / 100);
      const color = baseColor.clone().lerp(warmColor, xpFactor);
      materialRef.current.color.copy(color);
      materialRef.current.opacity = 0.35 + xpFactor * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial ref={materialRef} size={0.055} color="#cfe4ff" transparent opacity={0.55} depthWrite={false} />
      </points>
    </group>
  );
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const ConstellationLayer = ({
  globePositions,
  totalXP,
  profileCompleted,
  taskSets
}: {
  globePositions: Float32Array;
  totalXP: number;
  profileCompleted: boolean;
  taskSets: TaskSet[];
}) => {
  const starMaterialRef = useRef<THREE.PointsMaterial>(null);
  const lineMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const colorAttributeRef = useRef<THREE.BufferAttribute | null>(null);
  const intensityRef = useRef<Float32Array | null>(null);
  const lineFade = useRef(0);

  const totalPoints = globePositions.length / 3;
  const completedTasks = useMemo(
    () =>
      taskSets.flatMap((taskSet) =>
        taskSet.tasks.filter((task) => task.completed).map((task, index) => ({
          task,
          taskSetId: taskSet.id,
          index
        }))
      ),
    [taskSets]
  );

  const starPositions = useMemo(() => {
    const data = new Float32Array(completedTasks.length * 3);
    completedTasks.forEach((entry, slot) => {
      const hash = hashString(`${entry.taskSetId}-${entry.task.id}-${entry.index}`);
      const globeIndex = hash % totalPoints;
      const baseIndex = globeIndex * 3;
      data[slot * 3] = globePositions[baseIndex];
      data[slot * 3 + 1] = globePositions[baseIndex + 1];
      data[slot * 3 + 2] = globePositions[baseIndex + 2];
    });
    return data;
  }, [completedTasks, globePositions, totalPoints]);

  const connectionPositions = useMemo(() => {
    const segments: number[] = [];
    taskSets.forEach((taskSet) => {
      if (!taskSet.submittedAt) {
        return;
      }
      const indices = taskSet.tasks.map((task, index) => {
        const hash = hashString(`${taskSet.id}-${task.id}-${index}`);
        return hash % totalPoints;
      });
      for (let i = 1; i < indices.length; i += 1) {
        const fromBase = indices[i - 1] * 3;
        const toBase = indices[i] * 3;
        segments.push(
          globePositions[fromBase],
          globePositions[fromBase + 1],
          globePositions[fromBase + 2],
          globePositions[toBase],
          globePositions[toBase + 1],
          globePositions[toBase + 2]
        );
      }
    });
    return new Float32Array(segments);
  }, [taskSets, globePositions, totalPoints]);

  useEffect(() => {
    intensityRef.current = new Float32Array(completedTasks.length).fill(0);
  }, [completedTasks.length]);

  const baseColor = useMemo(() => new THREE.Color().setHSL(0.62, 0.35, 0.48), []);
  const warmColor = useMemo(() => new THREE.Color().setHSL(0.08, 0.5, 0.62), []);

  useFrame(() => {
    if (!colorAttributeRef.current || !intensityRef.current) {
      return;
    }
    const intensity = intensityRef.current;
    const xpFactor = Math.min(1, totalXP / 100);
    const targetActive = 0.45 + xpFactor * 0.35;

    for (let i = 0; i < completedTasks.length; i += 1) {
      intensity[i] = THREE.MathUtils.lerp(intensity[i], targetActive, 0.08);
      const color = baseColor.clone().lerp(warmColor, xpFactor).multiplyScalar(intensity[i]);
      colorAttributeRef.current.setXYZ(i, color.r, color.g, color.b);
    }
    colorAttributeRef.current.needsUpdate = true;

    lineFade.current = THREE.MathUtils.lerp(lineFade.current, connectionPositions.length > 0 ? 1 : 0, 0.06);
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = lineFade.current * (0.2 + xpFactor * 0.2);
    }
  });

  if (completedTasks.length === 0 && !profileCompleted) {
    return null;
  }

  return (
    <group>
      {completedTasks.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={starPositions}
              count={starPositions.length / 3}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              array={new Float32Array(completedTasks.length * 3)}
              count={completedTasks.length}
              itemSize={3}
              ref={colorAttributeRef}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={starMaterialRef}
            size={0.075}
            vertexColors
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
      {connectionPositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={connectionPositions}
              count={connectionPositions.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial ref={lineMaterialRef} color="#a9c6f5" transparent opacity={0} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
};

const IntroWord = ({ phase, seed }: { phase: IntroPhase; seed: number }) => {
  const textPoints = useMemo(
    () =>
      generateTextPoints("ASTRAFORGE", {
        fontFamily: "Bodoni MT, Didot, Bodoni 72, Garamond, Times New Roman, serif",
        fontSize: 96,
        step: 6,
        scale: 0.03
      }),
    []
  );

  const startPoints = useMemo(() => {
    const rng = mulberry32(seed + 4242);
    return textPoints.map(() => [randomRange(rng, -8, 8), randomRange(rng, -4, 4), randomRange(rng, -4, 4)] as Vec3);
  }, [seed, textPoints]);

  const initialPositions = useMemo(() => new Float32Array(textPoints.length * 3), [textPoints.length]);
  const positions = useRef<Float32Array | null>(null);
  const attributeRef = useRef<THREE.BufferAttribute | null>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progress = useRef(0);
  const lift = useRef(0);

  useEffect(() => {
    positions.current = initialPositions;
  }, [initialPositions]);

  useFrame((_, delta) => {
    if (!positions.current || !materialRef.current || !attributeRef.current) {
      return;
    }

    const target = phase === "dissolve" ? 0 : 1;
    const speed = phase === "forming" ? 0.35 : 0.25;
    progress.current = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(progress.current, target, 1 - Math.exp(-delta * speed)),
      0,
      1
    );

    const liftTarget = phase === "hold" ? 0.6 : phase === "dissolve" ? 1 : 0;
    lift.current = THREE.MathUtils.lerp(lift.current, liftTarget, 1 - Math.exp(-delta * 2));
    const scale = 1 + lift.current * 0.25;
    const zOffset = lift.current * 1.2;

    const t = progress.current;
    for (let i = 0; i < textPoints.length; i += 1) {
      const [sx, sy, sz] = startPoints[i];
      const [tx, ty, tz] = textPoints[i];
      positions.current[i * 3] = THREE.MathUtils.lerp(sx, tx * scale, t);
      positions.current[i * 3 + 1] = THREE.MathUtils.lerp(sy, ty * scale, t);
      positions.current[i * 3 + 2] = THREE.MathUtils.lerp(sz, tz * scale + zOffset, t);
    }

    attributeRef.current.needsUpdate = true;

    materialRef.current.opacity = 0.2 + t * 0.8;
  });

  if (phase === "done") {
    return null;
  }

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions.current ?? initialPositions}
          count={textPoints.length}
          itemSize={3}
          ref={attributeRef}
        />
      </bufferGeometry>
      <pointsMaterial ref={materialRef} size={0.12} color="#e8f1ff" transparent opacity={0.8} depthWrite={false} />
    </points>
  );
};

export default function AstraforgeScene({ introPhase, onCameraSettled }: SceneProps) {
  const seed = 7777;
  const totalXP = useAstraforgeStore((state) => state.totalXP);
  const profileCompleted = useAstraforgeStore((state) => state.profileCompleted);
  const taskSets = useAstraforgeStore((state) => state.taskSets);
  const activeTaskSetId = useAstraforgeStore((state) => state.activeTaskSetId);
  const activeTaskSet = useMemo(
    () => taskSets.find((taskSet) => taskSet.id === activeTaskSetId) || taskSets[0],
    [taskSets, activeTaskSetId]
  );
  const submitted = Boolean(activeTaskSet?.submittedAt);
  const globePositions = useMemo(() => createGlobePositions(), []);

  return (
    <Canvas camera={{ position: [0, 0, 9], fov: 52 }} dpr={[1, 2]}>
      <color attach="background" args={["#05060b"]} />
      <ambientLight intensity={0.2} />
      <FarFieldStars seed={seed} />
      <SimpleGlobe positions={globePositions} stabilized={submitted} xp={totalXP} />
      <ConstellationLayer globePositions={globePositions} totalXP={totalXP} profileCompleted={profileCompleted} taskSets={taskSets} />
      <IntroWord phase={introPhase} seed={seed} />
      <CameraRig introPhase={introPhase} onCameraSettled={onCameraSettled} />
      <EffectComposer>
        <Bloom intensity={0.65} luminanceThreshold={0.6} luminanceSmoothing={0.7} />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
