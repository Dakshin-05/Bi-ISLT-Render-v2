import * as THREE from "three";
import { Frame } from "../types";
import { DebugConfig, BoneOverride } from "../types";

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,     RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,     RIGHT_WRIST: 16,
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

const BONE_PRIMARY_AXIS: Record<string, THREE.Vector3> = {
  [MIXAMO_BONES.Spine]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Spine1]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Spine2]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Neck]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.Head]:new THREE.Vector3(0,1,0),
  [MIXAMO_BONES.LeftArm]:new THREE.Vector3(-1,0,0),
  [MIXAMO_BONES.LeftForeArm]:new THREE.Vector3(-1,0,0),
  [MIXAMO_BONES.RightArm]:new THREE.Vector3(1,0,0),
  [MIXAMO_BONES.RightForeArm]:new THREE.Vector3(1,0,0),
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
  private initialized = false;

  init(scene: THREE.Object3D) {
    this.bones.clear(); this.restLocalQ.clear();
    scene.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const b = obj as THREE.Bone;
        this.bones.set(b.name, b);
        this.restLocalQ.set(b.name, b.quaternion.clone());
      }
    });
    this.initialized = true;
    console.log("[Retargeter] bones:", [...this.bones.keys()]);
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
    const lKne=g(25),rKne=g(26),lAnk=g(27),rAnk=g(28);
    const hipC=mid(lHip,rHip), shC=mid(lSh,rSh);
    const spineD=dir(hipC,shC);

    this._aim(MIXAMO_BONES.Spine, spineD, cfg);
    this._aim(MIXAMO_BONES.Spine1, spineD, cfg);
    this._aim(MIXAMO_BONES.Spine2, spineD, cfg);
    if (pose[0]) this._aim(MIXAMO_BONES.Neck, dir(shC, g(0)), cfg);
    this._aim(MIXAMO_BONES.LeftArm,      dir(lSh,lElb), cfg);
    this._aim(MIXAMO_BONES.LeftForeArm,  dir(lElb,lWri), cfg);
    this._aim(MIXAMO_BONES.RightArm,     dir(rSh,rElb), cfg);
    this._aim(MIXAMO_BONES.RightForeArm, dir(rElb,rWri), cfg);
    this._aim(MIXAMO_BONES.LeftUpLeg,    dir(lHip,lKne), cfg);
    this._aim(MIXAMO_BONES.LeftLeg,      dir(lKne,lAnk), cfg);
    this._aim(MIXAMO_BONES.RightUpLeg,   dir(rHip,rKne), cfg);
    this._aim(MIXAMO_BONES.RightLeg,     dir(rKne,rAnk), cfg);

    if (lhand?.length >= 21) this._applyHand(lhand,"Left",cfg);
    if (rhand?.length >= 21) this._applyHand(rhand,"Right",cfg);
  }

  private _aim(boneName: string, worldDir: THREE.Vector3, cfg: DebugConfig) {
    const bone = this.bones.get(boneName);
    if (!bone) return;
    const primaryAxis = BONE_PRIMARY_AXIS[boneName];
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
    const wrist=gh(0), midMcp=gh(9), idxMcp=gh(5), pnkMcp=gh(17);
    const fingerDir = dir(wrist, midMcp);
    const sideRaw = side==="Right"
      ? new THREE.Vector3().subVectors(pnkMcp,idxMcp)
      : new THREE.Vector3().subVectors(idxMcp,pnkMcp);
    const sideDir = sideRaw.normalize();
    const palmNormal = new THREE.Vector3().crossVectors(fingerDir,sideDir).normalize();
    const fingers = [
      {name:"Thumb",idx:[1,2,3,4]},{name:"Index",idx:[5,6,7,8]},
      {name:"Middle",idx:[9,10,11,12]},{name:"Ring",idx:[13,14,15,16]},
      {name:"Pinky",idx:[17,18,19,20]},
    ];
    for (const f of fingers) {
      const pts = f.idx.map(i=>gh(i));
      for (let seg=0; seg<3; seg++) {
        const bn = `mixamorig${side}Hand${f.name}${seg+1}`;
        const bone = this.bones.get(bn);
        if (!bone) continue;
        const sd = dir(pts[seg], pts[seg+1]);
        if (sd.lengthSq()<1e-6) continue;
        const curlA = Math.acos(Math.max(-1,Math.min(1,sd.dot(fingerDir))));
        const curlS = sd.dot(palmNormal)<0 ? 1 : -1;
        const splay = Math.asin(Math.max(-1,Math.min(1,sd.dot(sideDir))));
        const restQ = this.restLocalQ.get(bn) ?? new THREE.Quaternion();
        const curlQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), curlS*curlA*cfg.coord.fingerCurlScale);
        const splayQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), splay*0.4);
        bone.quaternion.copy(restQ).multiply(curlQ).multiply(splayQ);
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