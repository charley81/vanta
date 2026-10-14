"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const CAMERA_BY_ROUTE = {
  home: {
    position: [0.43, 0.31, 0.55],
    target: [0, 0.04, -0.105],
    fov: 30,
  },
  product: {
    position: [0.38, 0.3, 0.5],
    target: [0, 0.035, -0.11],
    fov: 29,
  },
  synth: {
    position: [0.31, 0.27, 0.43],
    target: [0, 0.052, -0.11],
    fov: 31,
  },
} as const;

type Route = keyof typeof CAMERA_BY_ROUTE;

type ViewerProps = {
  asset: "source" | "runtime";
  route: Route;
  morph: number;
  rotation: number;
  onLoaded: (detail: { drawCalls: number; triangles: number }) => void;
};

function CameraRig({ route, rotation }: Pick<ViewerProps, "route" | "rotation">) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const preset = CAMERA_BY_ROUTE[route];
    camera.position.set(preset.position[0], preset.position[1], preset.position[2]);
    target.set(preset.target[0], preset.target[1], preset.target[2]);
    camera.lookAt(target);
    camera.rotateZ(rotation * 0.015);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, rotation, route, target]);

  return null;
}

function Instrument({ asset, morph, rotation, onLoaded }: Omit<ViewerProps, "route">) {
  const url =
    asset === "source"
      ? "/prototype/asset-pipeline/models/VANTA_MONOLITH_source.glb"
      : "/prototype/asset-pipeline/models/VANTA_MONOLITH_runtime_meshopt.glb";
  const gltf = useLoader(
    GLTFLoader,
    url,
    (loader) => loader.setMeshoptDecoder(MeshoptDecoder),
  ) as GLTF;
  const invalidate = useThree((state) => state.invalidate);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const group = useRef<THREE.Group>(null);
  const encoderBase = useRef(new THREE.Quaternion());
  const ringDefault = useRef(1);

  useEffect(() => {
    const encoder = scene.getObjectByName("MORPH_ROTATING_ENCODER");
    const ring = scene.getObjectByName("MORPH_Light_Ring_Outer") as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    if (encoder) encoderBase.current.copy(encoder.quaternion);
    if (ring) ringDefault.current = ring.material.emissiveIntensity;

    let drawCalls = 0;
    let triangles = 0;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      drawCalls += Array.isArray(object.material)
        ? Math.max(1, object.geometry.groups.length)
        : 1;
      const positions = object.geometry.getAttribute("position");
      triangles += object.geometry.index
        ? object.geometry.index.count / 3
        : positions.count / 3;
    });
    onLoaded({ drawCalls, triangles });
    invalidate();
  }, [invalidate, onLoaded, scene]);

  useFrame(() => {
    const encoder = scene.getObjectByName("MORPH_ROTATING_ENCODER");
    if (encoder) {
      const turn = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.lerp(-2.35, 2.35, morph),
      );
      encoder.quaternion.copy(encoderBase.current).multiply(turn);
    }
    const ring = scene.getObjectByName("MORPH_Light_Ring_Outer") as
      | THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
      | undefined;
    if (ring) {
      ring.material.emissiveIntensity = ringDefault.current + morph * 2.8;
    }
    if (group.current) group.current.rotation.y = rotation * 0.16;
  });

  useEffect(() => invalidate(), [invalidate, morph, rotation]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export function Viewer({ asset, route, morph, rotation, onLoaded }: ViewerProps) {
  return (
    <Canvas
      camera={{
        fov: CAMERA_BY_ROUTE[route].fov,
        near: 0.01,
        far: 5,
        position: [...CAMERA_BY_ROUTE[route].position],
      }}
      dpr={[1, 1.35]}
      frameloop="demand"
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 0.58, 1.42]} />
      <hemisphereLight args={[0xc5c8ca, 0x050504, 0.48]} />
      <directionalLight
        position={[-0.38, 0.58, 0.32]}
        intensity={3.2}
        color={0xe8e5df}
      />
      <directionalLight
        position={[0.38, 0.22, -0.28]}
        intensity={1.4}
        color={0xffe2bc}
      />
      <pointLight
        position={[0.035, 0.17, -0.025]}
        intensity={1.5 + morph * 1.2}
        distance={0.48}
        decay={2}
        color={0xfff1dc}
      />
      <Suspense fallback={null}>
        <CameraRig route={route} rotation={rotation} />
        <Instrument
          asset={asset}
          morph={morph}
          rotation={rotation}
          onLoaded={onLoaded}
        />
      </Suspense>
    </Canvas>
  );
}
