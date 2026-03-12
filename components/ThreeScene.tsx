"use client";
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, useGLTF, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { SignData, Frame } from "../types";
import { DebugConfig } from "../types";
import { BoneRetargeter, interpolateFrames, lm, POSE_LANDMARKS } from "../lib/retargeting";
import { AxisGizmo } from "./AxisGizmo";

// ── EMA smoother ──────────────────────────────────────────────────────────────
class BoneSmoother {
  private cache = new Map<string, THREE.Quaternion>();
  private alpha: number;
  constructor(alpha = 0.3) { this.alpha = alpha; }
  setAlpha(a: number) { this.alpha = a; }
  smooth(bone: THREE.Bone) {
    const prev = this.cache.get(bone.name);
    if (!prev) { this.cache.set(bone.name, bone.quaternion.clone()); return; }
    prev.slerp(bone.quaternion, this.alpha);
    bone.quaternion.copy(prev);
  }
  reset() { this.cache.clear(); }
}

// ── Camera ref extractor (runs inside Canvas) ─────────────────────────────────
function CameraCapture({ camRef }: { camRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { camera } = useThree();
  useEffect(() => { camRef.current = camera; }, [camera, camRef]);
  return null;
}

// ── Raw skeleton debug ────────────────────────────────────────────────────────
function RawSkeleton({ frame, cfg }: { frame: Frame | null; cfg: DebugConfig }) {
  if (!frame?.pose) return null;
  const j = frame.pose;
  const s = cfg.coord.poseAxisSigns;
  const v = (p: number[]) => new THREE.Vector3(p[0]*s.x, p[1]*s.y+cfg.coord.modelOffsetY, p[2]*s.z+cfg.coord.modelOffsetZ);
  const conns = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[0,11],[0,12]];
  return (
    <group>
      {j.map((p,i) => p && p.length>=3 ? (
        <mesh key={i} position={v(p).toArray() as [number,number,number]}>
          <sphereGeometry args={[0.013,8,8]} />
          <meshBasicMaterial color={i===0?"#ff4040":(i===23||i===24)?"#40ff80":(i>=11&&i<=16)?"#ffff40":"#60c0ff"} />
        </mesh>
      ) : null)}
      {conns.map(([a,b],i) => {
        const jA=j[a], jB=j[b]; if (!jA||!jB) return null;
        const start=v(jA), end=v(jB);
        const mid=start.clone().add(end).multiplyScalar(0.5);
        const len=start.distanceTo(end);
        if (len<0.001) return null;
        const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());
        return (
          <mesh key={i} position={mid.toArray() as [number,number,number]} quaternion={q}>
            <cylinderGeometry args={[0.005,0.005,len,6]} />
            <meshBasicMaterial color="#2050a0" />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Live stats ────────────────────────────────────────────────────────────────
export interface LiveStats {
  spineDir: number; hipY: number; shoulderY: number; noseY: number;
}
function computeStats(frame: Frame, cfg: DebugConfig): LiveStats {
  const p = frame?.pose;
  if (!p||p.length<29) return { spineDir:0, hipY:0, shoulderY:0, noseY:0 };
  const g = (i: number) => lm(p, i, cfg);
  const hipC = g(POSE_LANDMARKS.LEFT_HIP).add(g(POSE_LANDMARKS.RIGHT_HIP)).multiplyScalar(0.5);
  const shC  = g(POSE_LANDMARKS.LEFT_SHOULDER).add(g(POSE_LANDMARKS.RIGHT_SHOULDER)).multiplyScalar(0.5);
  const nose = g(POSE_LANDMARKS.NOSE);
  return { spineDir: shC.clone().sub(hipC).normalize().y, hipY: hipC.y, shoulderY: shC.y, noseY: nose.y };
}

// ── Character ─────────────────────────────────────────────────────────────────
interface CharacterProps {
  frameIndex: number; frames: Frame[];
  debugCfg: DebugConfig; showSkeleton: boolean;
  onStats?: (s: LiveStats) => void;
}

function Character({ frameIndex, frames, debugCfg, showSkeleton, onStats }: CharacterProps) {
  const { scene } = useGLTF("/models/Remy.glb");
  const retargeter = useRef(new BoneRetargeter());
  const smoother   = useRef(new BoneSmoother(0.3));
  const allBones   = useRef<THREE.Bone[]>([]);
  const [curFrame, setCurFrame] = useState<Frame|null>(null);
  const cfgRef = useRef(debugCfg);
  cfgRef.current = debugCfg;

  useEffect(() => {
    retargeter.current.init(scene);
    smoother.current.reset();
    const bs: THREE.Bone[] = [];
    scene.traverse(o => { if ((o as THREE.Bone).isBone) bs.push(o as THREE.Bone); });
    allBones.current = bs;
  }, [scene]);

  useFrame(() => {
    const cfg = cfgRef.current;
    smoother.current.setAlpha(cfg.coord.smoothing);
    if (!frames.length || !retargeter.current.isReady()) return;
    const fi   = Math.max(0, Math.min(frames.length-1, frameIndex));
    const idxA = Math.floor(fi);
    const idxB = Math.min(frames.length-1, idxA+1);
    const t    = fi - idxA;
    const interp = t<0.001 ? frames[idxA] : interpolateFrames(frames[idxA], frames[idxB], t);
    retargeter.current.applyFrame(interp, cfg);
    allBones.current.forEach(b => smoother.current.smooth(b));
    if (showSkeleton) setCurFrame(interp);
    if (onStats) onStats(computeStats(interp, cfg));
  });

  const yOff = debugCfg.coord.modelOffsetY;
  const zOff = debugCfg.coord.modelOffsetZ;
  return (
    <>
      <primitive object={scene} scale={1} position={[0,yOff,zOff]} castShadow receiveShadow />
      {showSkeleton && <RawSkeleton frame={curFrame} cfg={debugCfg} />}
    </>
  );
}

// ── Canvas capture ────────────────────────────────────────────────────────────
const CanvasCaptureForwarded = forwardRef<{getCanvas:()=>HTMLCanvasElement|null}>(
  function CC(_p, ref) {
    const { gl } = useThree();
    useImperativeHandle(ref, () => ({ getCanvas: () => gl.domElement }));
    return null;
  }
);

// ── Lighting ──────────────────────────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} color="#c8d8ff" />
      <directionalLight position={[5,8,5]} intensity={1.4} castShadow
        shadow-mapSize={[2048,2048]} shadow-camera-far={50}
        shadow-camera-left={-5} shadow-camera-right={5}
        shadow-camera-top={5} shadow-camera-bottom={-5} color="#fff5e0" />
      <directionalLight position={[-4,3,-4]} intensity={0.4} color="#a0c0ff" />
      <pointLight position={[0,4,3]} intensity={0.3} />
    </>
  );
}

// ── Stage ─────────────────────────────────────────────────────────────────────
function Stage() {
  return (
    <>
      <Grid position={[0,-0.01,0]} args={[10,10]} cellSize={0.5} cellThickness={0.5}
        cellColor="#3b4a6b" sectionSize={2} sectionThickness={1} sectionColor="#5c7aaa"
        fadeDistance={12} fadeStrength={1} followCamera={false} infiniteGrid />
      <ContactShadows position={[0,0,0]} opacity={0.6} scale={5} blur={2} far={4} color="#1a2035" />
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.005,0]} receiveShadow>
        <circleGeometry args={[2,64]} />
        <meshStandardMaterial color="#1e2d4a" roughness={0.8} metalness={0.1} />
      </mesh>
    </>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export interface ThreeSceneHandle { getCanvas: () => HTMLCanvasElement | null; }

interface ThreeSceneProps {
  signData: SignData; frameIndex: number; isPlaying: boolean;
  debugCfg: DebugConfig; showDebug: boolean;
  onLoaded?: () => void; onStats?: (s: LiveStats) => void;
}

export const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(
  function ThreeScene({ signData, frameIndex, isPlaying, debugCfg, showDebug, onLoaded, onStats }, ref) {
    const captureRef = useRef<{getCanvas:()=>HTMLCanvasElement|null}>(null);
    const cameraRef  = useRef<THREE.Camera | null>(null);

    useImperativeHandle(ref, () => ({ getCanvas: () => captureRef.current?.getCanvas() ?? null }));
    useEffect(() => { if (signData.frames.length>0) onLoaded?.(); }, [signData, onLoaded]);

    return (
      <div style={{ width:"100%", height:"100%", position:"relative" }}>
        {/* Blender-style axis gizmo — HTML canvas overlay, top-left */}
        <AxisGizmo cameraRef={cameraRef} size={110} />

        <Canvas shadows dpr={[1,2]}
          gl={{ preserveDrawingBuffer:true, antialias:true, alpha:false }}
          style={{ width:"100%", height:"100%" }}>
          <color attach="background" args={["#0d1628"]} />
          <fog attach="fog" args={["#0d1628",10,25]} />
          <PerspectiveCamera makeDefault position={[0,1.2,3.5]} fov={45} />
          <CameraCapture camRef={cameraRef} />
          <Lights />
          <Environment preset="city" />
          <Stage />
          <React.Suspense fallback={null}>
            <Character frameIndex={frameIndex} frames={signData.frames}
              debugCfg={debugCfg} showSkeleton={showDebug} onStats={onStats} />
          </React.Suspense>
          <OrbitControls target={[0,1.0,0]} minDistance={1.5} maxDistance={8}
            minPolarAngle={0.2} maxPolarAngle={Math.PI/1.8}
            enableDamping dampingFactor={0.08} />
          <CanvasCaptureForwarded ref={captureRef} />
        </Canvas>
      </div>
    );
  }
);

useGLTF.preload("/models/Remy.glb");