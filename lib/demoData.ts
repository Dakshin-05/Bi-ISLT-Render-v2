import { SignData, Frame } from "../types";

/**
 * Generate a demo "thank you" sign animation sequence.
 * This creates a synthetic dataset showing the classic thank you sign:
 * - Right hand flat, fingers together
 * - Moves from chin outward/forward
 */
export function generateDemoData(): SignData {
  const fps = 30;
  const duration = 2; // seconds
  const totalFrames = fps * duration;

  const frames: Frame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames; // 0..1
    const phase = t * Math.PI * 2;

    // Base T-pose positions (MediaPipe world coordinates, roughly in meters)
    // Y axis is up, Z is toward camera

    // Body landmarks (33 joints)
    const pose: number[][] = Array(33)
      .fill(null)
      .map(() => [0, 0, 0, 1]);

    // Hips
    pose[23] = [-0.1, 0, 0, 1]; // left hip
    pose[24] = [0.1, 0, 0, 1]; // right hip

    // Shoulders
    pose[11] = [-0.2, 0.5, 0.05, 1]; // left shoulder
    pose[12] = [0.2, 0.5, 0.05, 1]; // right shoulder

    // Nose / head
    pose[0] = [0, 0.75, 0.1, 1]; // nose

    // "Thank you" sign: right hand moves from chin area outward
    const chinPos = [0.05, 0.68, 0.15]; // near chin
    const outPos = [0.3, 0.55, 0.2]; // extended outward

    // Interpolate hand position from chin to out
    const handProgress = Math.sin(t * Math.PI); // peak in middle
    const handX = chinPos[0] + (outPos[0] - chinPos[0]) * handProgress;
    const handY = chinPos[1] + (outPos[1] - chinPos[1]) * handProgress;
    const handZ = chinPos[2] + (outPos[2] - chinPos[2]) * handProgress;

    // Right elbow
    const elbowX = handX - 0.15;
    const elbowY = handY - 0.1;
    pose[14] = [elbowX, elbowY, handZ - 0.05, 1];

    // Right wrist
    pose[16] = [handX, handY, handZ, 1];

    // Left arm mostly down
    pose[13] = [-0.25, 0.3, 0.0, 1]; // left elbow
    pose[15] = [-0.3, 0.15, 0.0, 1]; // left wrist

    // Knees
    pose[25] = [-0.1, -0.45, 0.0, 1]; // left knee
    pose[26] = [0.1, -0.45, 0.0, 1]; // right knee
    pose[27] = [-0.1, -0.9, 0.0, 1]; // left ankle
    pose[28] = [0.1, -0.9, 0.0, 1]; // right ankle

    // Right hand landmarks (21 joints) - flat hand, fingers together
    const rhand: number[][] = [];
    const wristPos = [handX, handY, handZ];

    // Wrist
    rhand.push([...wristPos]);

    // Thumb spread slightly
    rhand.push([handX - 0.025, handY + 0.01, handZ + 0.005]); // CMC
    rhand.push([handX - 0.045, handY + 0.02, handZ + 0.01]); // MCP
    rhand.push([handX - 0.06, handY + 0.025, handZ + 0.01]); // IP
    rhand.push([handX - 0.07, handY + 0.028, handZ + 0.01]); // tip

    // Index
    rhand.push([handX, handY + 0.03, handZ + 0.01]); // MCP
    rhand.push([handX, handY + 0.055, handZ + 0.015]); // PIP
    rhand.push([handX, handY + 0.075, handZ + 0.018]); // DIP
    rhand.push([handX, handY + 0.09, handZ + 0.02]); // tip

    // Middle
    rhand.push([handX + 0.01, handY + 0.031, handZ + 0.01]); // MCP
    rhand.push([handX + 0.01, handY + 0.058, handZ + 0.016]); // PIP
    rhand.push([handX + 0.01, handY + 0.079, handZ + 0.019]); // DIP
    rhand.push([handX + 0.01, handY + 0.094, handZ + 0.021]); // tip

    // Ring
    rhand.push([handX + 0.02, handY + 0.028, handZ + 0.01]); // MCP
    rhand.push([handX + 0.02, handY + 0.052, handZ + 0.015]); // PIP
    rhand.push([handX + 0.02, handY + 0.07, handZ + 0.018]); // DIP
    rhand.push([handX + 0.02, handY + 0.083, handZ + 0.02]); // tip

    // Pinky
    rhand.push([handX + 0.03, handY + 0.022, handZ + 0.008]); // MCP
    rhand.push([handX + 0.03, handY + 0.042, handZ + 0.012]); // PIP
    rhand.push([handX + 0.03, handY + 0.056, handZ + 0.015]); // DIP
    rhand.push([handX + 0.03, handY + 0.065, handZ + 0.017]); // tip

    // Left hand at rest (slightly curled)
    const lhand: number[][] = [];
    const lwx = pose[15][0];
    const lwy = pose[15][1];
    const lwz = pose[15][2];
    const curl = 0.8; // moderately curled

    lhand.push([lwx, lwy, lwz]); // wrist
    // Thumb
    lhand.push([lwx - 0.02, lwy + 0.01, lwz]);
    lhand.push([lwx - 0.035, lwy + 0.025, lwz]);
    lhand.push([lwx - 0.04, lwy + 0.035, lwz + 0.01 * curl]);
    lhand.push([lwx - 0.04, lwy + 0.04, lwz + 0.02 * curl]);
    // Index (curled)
    for (let j = 0; j < 4; j++) {
      lhand.push([lwx - 0.005 + j * 0.002, lwy + 0.02 + j * 0.01 * (1 - curl * 0.3), lwz + j * 0.008 * curl]);
    }
    // Middle
    for (let j = 0; j < 4; j++) {
      lhand.push([lwx + 0.005 + j * 0.001, lwy + 0.021 + j * 0.01 * (1 - curl * 0.3), lwz + j * 0.008 * curl]);
    }
    // Ring
    for (let j = 0; j < 4; j++) {
      lhand.push([lwx + 0.015 + j * 0.001, lwy + 0.019 + j * 0.009 * (1 - curl * 0.3), lwz + j * 0.007 * curl]);
    }
    // Pinky
    for (let j = 0; j < 4; j++) {
      lhand.push([lwx + 0.022 + j * 0.001, lwy + 0.015 + j * 0.008 * (1 - curl * 0.3), lwz + j * 0.006 * curl]);
    }

    frames.push({ pose, lhand, rhand });
  }

  return { fps, gloss: "thank you", frames };
}
