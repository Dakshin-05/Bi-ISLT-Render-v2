export interface Frame {
  pose: number[][]; // 33 × [x, y, z, visibility]
  lhand: number[][]; // 21 × [x, y, z]
  rhand: number[][]; // 21 × [x, y, z]
}

export interface SignData {
  fps: number;
  gloss: string;
  frames: Frame[];
}

export interface RetargetingConfig {
  modelScale: number;
  heightOffset: number;
  smoothingFactor: number;
}

export interface AxisSigns {
  x: 1|-1; y: 1|-1; z: 1|-1;
}

export interface BoneOverride {
  enabled: boolean;
  flipX: boolean;
  flipY: boolean;
  flipZ: boolean;
  scale: number;
  /** Optional per-bone axis remapping BEFORE flip: which source axis feeds X/Y/Z */
  axisRemap?: { x:"x"|"y"|"z", y:"x"|"y"|"z", z:"x"|"y"|"z" };
}

export interface CoordConfig {
  poseAxisSigns: AxisSigns;
  handAxisSigns: AxisSigns;
  modelOffsetY: number;
  modelOffsetZ: number;
  smoothing: number;
  fingerCurlScale: number;
}

export interface DebugConfig {
  coord: CoordConfig;
  bones: Record<string, BoneOverride>;
}

export const DRIVEN_BONES = [
  "mixamorigSpine","mixamorigSpine1","mixamorigSpine2",
  "mixamorigNeck","mixamorigHead",
  "mixamorigLeftArm","mixamorigLeftForeArm",
  "mixamorigRightArm","mixamorigRightForeArm",
  "mixamorigLeftUpLeg","mixamorigLeftLeg",
  "mixamorigRightUpLeg","mixamorigRightLeg",
] as const;

export type DrivenBoneName = (typeof DRIVEN_BONES)[number];

export const BONE_LABELS: Record<string, string> = {
  mixamorigSpine:"Spine", mixamorigSpine1:"Spine 1", mixamorigSpine2:"Spine 2",
  mixamorigNeck:"Neck", mixamorigHead:"Head",
  mixamorigLeftArm:"L. Upper Arm", mixamorigLeftForeArm:"L. Forearm",
  mixamorigRightArm:"R. Upper Arm", mixamorigRightForeArm:"R. Forearm",
  mixamorigLeftUpLeg:"L. Thigh", mixamorigLeftLeg:"L. Shin",
  mixamorigRightUpLeg:"R. Thigh", mixamorigRightLeg:"R. Shin",
};

export function defaultBoneOverride(): BoneOverride {
  return { enabled:true, flipX:false, flipY:false, flipZ:false, scale:1.0 };
}

export function defaultDebugConfig(): DebugConfig {
  const bones: Record<string, BoneOverride> = {};
  DRIVEN_BONES.forEach(b => { bones[b] = defaultBoneOverride(); });
  // Apply the known-good leg flips from user's working config
  (["mixamorigLeftUpLeg","mixamorigLeftLeg","mixamorigRightUpLeg","mixamorigRightLeg"] as const)
    .forEach(b => { bones[b] = { ...defaultBoneOverride(), flipY:true, flipZ:true }; });
  return {
    coord: {
      poseAxisSigns: { x:1, y:-1, z:-1 },
      handAxisSigns: { x:1, y:-1, z:-1 },
      modelOffsetY: 0, modelOffsetZ: 0,
      smoothing: 0.3, fingerCurlScale: 0.65,
    },
    bones,
  };
}