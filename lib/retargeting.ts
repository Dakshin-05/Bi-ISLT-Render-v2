import * as THREE from "three";
import { Frame } from "../types";
import { DebugConfig, BoneOverride } from "../types";

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,     RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,     RIGHT_WRIST: 16,
  LEFT_PINKY: 17,     RIGHT_PINKY: 18,
  LEFT_INDEX: 19,     RIGHT_INDEX: 20,
  LEFT_THUMB: 21,     RIGHT_THUMB: 22,
  LEFT_HIP: 23,       RIGHT_HIP: 24,
  LEFT_KNEE: 25,      RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,     RIGHT_ANKLE: 28,
};

export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC:1,  THUMB_MCP:2,  THUMB_IP:3,   THUMB_TIP:4,
  INDEX_MCP:5,  INDEX_PIP:6,  INDEX_DIP:7,  INDEX_TIP:8,
  MIDDLE_MCP:9, MIDDLE_PIP:10,MIDDLE_DIP:11,MIDDLE_TIP:12,
  RING_MCP:13,  RING_PIP:14,  RING_DIP:15,  RING_TIP:16,
  PINKY_MCP:17, PINKY_PIP:18, PINKY_DIP:19, PINKY_TIP:20,
};

export const MIXAMO_BONES = {
  Hips:"mixamorigHips", Spine:"mixamorigSpine", Spine1:"mixamorigSpine1",
  Spine2:"mixamorigSpine2", Neck:"mixamorigNeck", Head:"mixamorigHead",
  LeftShoulder:"mixamorigLeftShoulder", LeftArm:"mixamorigLeftArm",
  LeftForeArm:"mixamorigLeftForeArm", LeftHand:"mixamorigLeftHand",
  RightShoulder:"mixamorigRightShoulder", RightArm:"mixamorigRightArm",
  RightForeArm:"mixamorigRightForeArm", RightHand:"mixamorigRightHand",
  LeftUpLeg:"mixamorigLeftUpLeg", LeftLeg:"mixamorigLeftLeg",
  RightUpLeg:"mixamorigRightUpLeg", RightLeg:"mixamorigRightLeg",
};

// ── PROTECTED BODY AXES ──
const BODY_AXES: Record<string, THREE.Vector3> = {
  [MIXAMO_BONES.Spine]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Spine1]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Spine2]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Neck]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Head]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.LeftUpLeg]:new THREE.Vector3(0,-1,0),
  [MIXAMO_BONES.LeftLeg]:new THREE.Vector3(0,-1,0),
  [MIXAMO_BONES.RightUpLeg]:new THREE.Vector3(0,-1,0),
  [MIXAMO_BONES.RightLeg]:new THREE.Vector3(0,-1,0),
};

export function lm(joints: number[][], idx: number, cfg: DebugConfig): THREE.Vector3 {
  const j = joints[idx];
  if (!j || j.length < 3) return new THREE.Vector3();
  const s = cfg.coord.poseAxisSigns;
  return new THREE.Vector3(j[0]*s.x, j[1]*s.y, j[2]*s.z);
}

function lmH(joints: number[][], idx: number, cfg: DebugConfig): THREE.Vector3 {
  const j = joints[idx];
  if (!j || j.length < 3) return new THREE.Vector3();
  const s = cfg.coord.handAxisSigns;
  return new THREE.Vector3(j[0]*s.x, j[1]*s.y, j[2]*s.z);
}

export class BoneRetargeter {
  private bones = new Map<string, THREE.Bone>();
  private restLocalQ = new Map<string, THREE.Quaternion>();
  private boneAxes = new Map<string, THREE.Vector3>();
  private initialized = false;

  init(scene: THREE.Object3D) {
    this.bones.clear(); 
    this.restLocalQ.clear(); 
    this.boneAxes.clear();
    
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const b = obj as THREE.Bone;
        this.bones.set(b.name, b);
        this.restLocalQ.set(b.name, b.quaternion.clone());
      }
    });

    const preferredChildren: Record<string, string> = {
      [MIXAMO_BONES.LeftShoulder]: MIXAMO_BONES.LeftArm,
      [MIXAMO_BONES.RightShoulder]: MIXAMO_BONES.RightArm,
      [MIXAMO_BONES.LeftArm]: MIXAMO_BONES.LeftForeArm,
      [MIXAMO_BONES.RightArm]: MIXAMO_BONES.RightForeArm,
      [MIXAMO_BONES.LeftForeArm]: MIXAMO_BONES.LeftHand,
      [MIXAMO_BONES.RightForeArm]: MIXAMO_BONES.RightHand,
      [MIXAMO_BONES.LeftHand]: "mixamorigLeftHandMiddle1",
      [MIXAMO_BONES.RightHand]: "mixamorigRightHandMiddle1",
    };

    this.bones.forEach((bone, name) => {
      if (BODY_AXES[name]) {
        this.boneAxes.set(name, BODY_AXES[name].clone());
        return;
      }

      let targetChild: THREE.Bone | undefined;
      if (preferredChildren[name]) {
        targetChild = bone.children.find(c => c.name === preferredChildren[name]) as THREE.Bone;
      }
      if (!targetChild) {
        targetChild = bone.children.find(c => (c as THREE.Bone).isBone) as THREE.Bone;
      }

      if (targetChild) {
        const axis = targetChild.position.clone().normalize();
        if (axis.lengthSq() > 0.1) this.boneAxes.set(name, axis);
      }
    });

    this.bones.forEach((bone, name) => {
      if (!this.boneAxes.has(name)) {
        if (bone.parent && this.boneAxes.has(bone.parent.name)) {
          this.boneAxes.set(name, this.boneAxes.get(bone.parent.name)!.clone());
        } else {
          this.boneAxes.set(name, new THREE.Vector3(0, 1, 0));
        }
      }
    });

    this.initialized = true;
  }

  isReady() { return this.initialized && this.bones.size > 0; }
  getBone(name: string) { return this.bones.get(name); }

  resetToRest() {
    this.restLocalQ.forEach((q, name) => {
      const b = this.bones.get(name);
      if (b) b.quaternion.copy(q);
    });
  }

  applyFrame(frame: Frame, cfg: DebugConfig) {
    if (!this.isReady()) return;
    const { pose, lhand, rhand } = frame;
    if (!pose || pose.length < 29) return;
    this.resetToRest();

    const g = (idx: number) => lm(pose, idx, cfg);
    const lSh=g(11),rSh=g(12),lHip=g(23),rHip=g(24);
    const lElb=g(13),rElb=g(14),lWri=g(15),rWri=g(16);
    const lPinky=g(17),rPinky=g(18),lIndex=g(19),rIndex=g(20);
    const lKne=g(25),rKne=g(26),lAnk=g(27),rAnk=g(28);
    const hipC=mid(lHip,rHip), shC=mid(lSh,rSh);
    
    // ── FIX FOR FORWARD LEAN ──
    // We dampen the Z-axis of the spine/neck to prevent the avatar from bowing forward
    const spineD=dir(hipC,shC);
    spineD.z *= 0.2; // Reduce forward lean by 80%
    spineD.normalize();

    this._aim(MIXAMO_BONES.Spine, spineD, cfg);
    this._aim(MIXAMO_BONES.Spine1, spineD, cfg);
    this._aim(MIXAMO_BONES.Spine2, spineD, cfg);
    
    if (pose[0]) {
      const neckD = dir(shC, g(0));
      neckD.z *= 0.2; // Reduce neck forward lean by 80%
      neckD.normalize();
      this._aim(MIXAMO_BONES.Neck, neckD, cfg);
    }
    
    // ARMS
    this._aim(MIXAMO_BONES.LeftArm,      dir(lSh,lElb), cfg);
    this._aim(MIXAMO_BONES.LeftForeArm,  dir(lElb,lWri), cfg);
    this._aim(MIXAMO_BONES.RightArm,     dir(rSh,rElb), cfg);
    this._aim(MIXAMO_BONES.RightForeArm, dir(rElb,rWri), cfg);
    
    // ── FIX FOR 90-DEGREE WRISTS ──
    // Driven exclusively by the stable body pose to preserve true wrist rotation
    if (pose[17] && pose[19]) this._aim(MIXAMO_BONES.LeftHand, dir(lWri, mid(lPinky, lIndex)), cfg);
    if (pose[18] && pose[20]) this._aim(MIXAMO_BONES.RightHand, dir(rWri, mid(rPinky, rIndex)), cfg);

    // LEGS
    this._aim(MIXAMO_BONES.LeftUpLeg,    dir(lHip,lKne), cfg);
    this._aim(MIXAMO_BONES.LeftLeg,      dir(lKne,lAnk), cfg);
    this._aim(MIXAMO_BONES.RightUpLeg,   dir(rHip,rKne), cfg);
    this._aim(MIXAMO_BONES.RightLeg,     dir(rKne,rAnk), cfg);

    // DETAILED FINGERS
    if (lhand?.length >= 21) this._applyHand(lhand,"Left",cfg);
    if (rhand?.length >= 21) this._applyHand(rhand,"Right",cfg);
  }

  private _aim(boneName: string, worldDir: THREE.Vector3, cfg: DebugConfig) {
    const bone = this.bones.get(boneName);
    if (!bone) return;
    const primaryAxis = this.boneAxes.get(boneName);
    if (!primaryAxis) return;

    const ovr: BoneOverride = cfg.bones[boneName] ?? { enabled:true, flipX:false, flipY:false, flipZ:false, scale:1 };
    if (!ovr.enabled) return;

    const flipped = worldDir.clone();
    if (ovr.flipX) flipped.x *= -1;
    if (ovr.flipY) flipped.y *= -1;
    if (ovr.flipZ) flipped.z *= -1;

    const target = flipped.normalize();
    if (!isFinite(target.x) || target.lengthSq() < 1e-6) return;

    const parentWorldQ = new THREE.Quaternion();
    if (bone.parent) bone.parent.getWorldQuaternion(parentWorldQ);
    const restLocalQ = this.restLocalQ.get(boneName) ?? new THREE.Quaternion();
    const boneWorldQ = parentWorldQ.clone().multiply(restLocalQ);
    
    const restWorldDir = primaryAxis.clone().applyQuaternion(boneWorldQ).normalize();

    const dot = restWorldDir.dot(target);
    if (dot > 0.9999) return;

    const axis = new THREE.Vector3().crossVectors(restWorldDir, target).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * ovr.scale;
    const worldSwing = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    const parentInv = parentWorldQ.clone().invert();
    const localSwing = parentInv.clone().multiply(worldSwing).multiply(parentWorldQ);
    bone.quaternion.copy(localSwing).multiply(restLocalQ);
  }

  private _applyHand(joints: number[][], side: "Left"|"Right", cfg: DebugConfig) {
    const gh = (i: number) => lmH(joints, i, cfg);
    const wrist = gh(HAND_LANDMARKS.WRIST);
    const indexMcp = gh(HAND_LANDMARKS.INDEX_MCP);
    const pinkyMcp = gh(HAND_LANDMARKS.PINKY_MCP);

    // Palm Normal constraint ensures fingers don't bend backwards
    const palmNormal = new THREE.Vector3().crossVectors(
      dir(wrist, indexMcp), 
      dir(indexMcp, pinkyMcp)
    ).normalize();
    if (side === 'Left') palmNormal.negate();

    const fingers = [
      { name: 'Thumb',  ids: [HAND_LANDMARKS.THUMB_CMC, HAND_LANDMARKS.THUMB_MCP, HAND_LANDMARKS.THUMB_IP, HAND_LANDMARKS.THUMB_TIP] },
      { name: 'Index',  ids: [HAND_LANDMARKS.INDEX_MCP, HAND_LANDMARKS.INDEX_PIP, HAND_LANDMARKS.INDEX_DIP, HAND_LANDMARKS.INDEX_TIP] },
      { name: 'Middle', ids: [HAND_LANDMARKS.MIDDLE_MCP, HAND_LANDMARKS.MIDDLE_PIP, HAND_LANDMARKS.MIDDLE_DIP, HAND_LANDMARKS.MIDDLE_TIP] },
      { name: 'Ring',   ids: [HAND_LANDMARKS.RING_MCP, HAND_LANDMARKS.RING_PIP, HAND_LANDMARKS.RING_DIP, HAND_LANDMARKS.RING_TIP] },
      { name: 'Pinky',  ids: [HAND_LANDMARKS.PINKY_MCP, HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_DIP, HAND_LANDMARKS.PINKY_TIP] }
    ];

    for (const f of fingers) {
      let prevDir = dir(wrist, gh(f.ids[0]));
      
      for (let seg = 0; seg < 3; seg++) {
        const bn = `mixamorig${side}Hand${f.name}${seg + 1}`;
        const bone = this.bones.get(bn);
        const restQ = this.restLocalQ.get(bn);
        if (!bone || !restQ) continue;

        const currentDir = dir(gh(f.ids[seg]), gh(f.ids[seg + 1]));
        if (currentDir.lengthSq() < 1e-6) continue;

        // ── JITTER FIX: Pure 1D Hinge ──
        // ALL segments are now locked to a strict 1D local curl. No sideways twitching allowed.
        const dot = Math.max(-1, Math.min(1, prevDir.dot(currentDir)));
        let angle = Math.acos(dot);
        
        // ── NOISE GATE ──
        // Completely ignore tiny micro-twitches (less than ~4.5 degrees)
        if (angle < 0.08) angle = 0;

        // Check if it's curling inward towards the palm
        const bendCross = new THREE.Vector3().crossVectors(prevDir, currentDir);
        if (bendCross.dot(palmNormal) < 0) angle *= -1; // Force inward bend

        // Mixamo specific: Thumb rolls on local Y, fingers on local Z
        const axis = f.name === 'Thumb' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        if (f.name === 'Thumb' && side === 'Left') angle *= -1; // Mirror fix

        const curlQ = new THREE.Quaternion().setFromAxisAngle(axis, angle * cfg.coord.fingerCurlScale);
        bone.quaternion.copy(restQ).multiply(curlQ);
        
        prevDir = currentDir;
      }
    }
  }
}

function mid(a: THREE.Vector3, b: THREE.Vector3) { return a.clone().add(b).multiplyScalar(0.5); }
function dir(from: THREE.Vector3, to: THREE.Vector3) { return to.clone().sub(from).normalize(); }

export function interpolateFrames(a: Frame, b: Frame, t: number): Frame {
  const lerp = (pa: number[][], pb: number[][]): number[][] => {
    if (!pa?.length || !pb?.length) return pa ?? pb ?? [];
    return pa.map((ptA,i) => { const ptB=pb[i]; if (!ptB) return ptA; return ptA.map((v,j)=>v+((ptB[j]??v)-v)*t); });
  };
  return { pose:lerp(a.pose,b.pose), lhand:lerp(a.lhand,b.lhand), rhand:lerp(a.rhand,b.rhand) };
}