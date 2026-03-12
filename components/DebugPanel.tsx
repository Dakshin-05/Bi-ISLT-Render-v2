"use client";
import React, { useCallback, useState } from "react";
import {
  DebugConfig, BoneOverride, DRIVEN_BONES, BONE_LABELS,
  defaultDebugConfig, defaultBoneOverride, AxisSigns,
} from "../types";

// ── Style tokens ──────────────────────────────────────────────────────────────
const S = {
  panel: {
    background: "rgba(6,12,28,0.97)",
    borderLeft: "1px solid rgba(50,90,170,0.2)",
    display: "flex" as const,
    flexDirection: "column" as const,
    height: "100%",
    overflow: "hidden",
  },
  header: {
    padding: "10px 14px",
    borderBottom: "1px solid rgba(50,90,170,0.2)",
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "#3a6aaa",
    textTransform: "uppercase" as const,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scroll: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  section: {
    background: "rgba(14,24,52,0.7)",
    border: "1px solid rgba(50,90,170,0.18)",
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionHead: {
    padding: "7px 12px",
    fontSize: 9,
    letterSpacing: "0.18em",
    color: "#4a7aaa",
    textTransform: "uppercase" as const,
    borderBottom: "1px solid rgba(50,90,170,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer" as const,
    userSelect: "none" as const,
  },
  sectionBody: {
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
  },
  label: {
    fontSize: 9,
    color: "#4a6a9a",
    letterSpacing: "0.08em",
    minWidth: 80,
    flexShrink: 0,
  },
  value: {
    fontSize: 9,
    color: "#6090c0",
    minWidth: 30,
    textAlign: "right" as const,
  },
};

// ── Reusable primitives ───────────────────────────────────────────────────────

function Slider({
  label, min, max, step, value, onChange, color = "#4080e0",
}: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: color, cursor: "pointer", height: 16 }}
      />
      <span style={{ ...S.value, color }}>{value.toFixed(step < 0.1 ? 2 : 1)}</span>
    </div>
  );
}

function FlipButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px",
        fontSize: 9,
        fontFamily: "monospace",
        letterSpacing: "0.1em",
        borderRadius: 4,
        cursor: "pointer",
        border: `1px solid ${active ? "rgba(255,120,60,0.6)" : "rgba(50,80,150,0.4)"}`,
        background: active ? "rgba(180,60,20,0.35)" : "rgba(20,35,70,0.5)",
        color: active ? "#ff9060" : "#4a6a9a",
        transition: "all 0.15s",
      }}
    >
      {active ? `−${label}` : `+${label}`}
    </button>
  );
}

function AxisSignRow({
  label, signs, onChange,
}: { label: string; signs: AxisSigns; onChange: (s: AxisSigns) => void }) {
  const flip = (axis: "x" | "y" | "z") =>
    onChange({ ...signs, [axis]: signs[axis] === 1 ? -1 : 1 });
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {(["x","y","z"] as const).map(ax => (
          <FlipButton
            key={ax}
            label={ax.toUpperCase()}
            active={signs[ax] === -1}
            onClick={() => flip(ax)}
          />
        ))}
      </div>
      <span style={{ fontSize: 8, color: "#3a5a7a", marginLeft: 4 }}>
        ({signs.x < 0 ? "−" : "+"}X {signs.y < 0 ? "−" : "+"}Y {signs.z < 0 ? "−" : "+"}Z)
      </span>
    </div>
  );
}

function Toggle({
  label, value, onChange, color = "#4080e0",
}: { label: string; value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 18, borderRadius: 9,
          background: value ? color : "rgba(20,35,70,0.8)",
          border: `1px solid ${value ? color : "rgba(50,80,150,0.3)"}`,
          cursor: "pointer", position: "relative", transition: "all 0.2s",
          padding: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 2,
          left: value ? 18 : 2,
          width: 12, height: 12, borderRadius: "50%",
          background: value ? "#fff" : "#3a5a8a",
          transition: "left 0.2s",
        }} />
      </button>
      <span style={{ fontSize: 9, color: value ? color : "#3a5a7a" }}>
        {value ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({
  title, children, defaultOpen = true, badge,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div style={S.sectionHead} onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {badge && (
            <span style={{
              fontSize: 8, background: "rgba(60,120,200,0.2)",
              border: "1px solid rgba(60,120,200,0.3)",
              borderRadius: 3, padding: "1px 5px", color: "#5090c0",
            }}>{badge}</span>
          )}
          <span style={{ color: "#3a5a7a" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && <div style={S.sectionBody}>{children}</div>}
    </div>
  );
}

// ── Per-bone row ──────────────────────────────────────────────────────────────
function BoneRow({
  boneName, ovr, onChange,
}: { boneName: string; ovr: BoneOverride; onChange: (o: BoneOverride) => void }) {
  const label = BONE_LABELS[boneName] ?? boneName.replace("mixamorig", "");
  const upd = (partial: Partial<BoneOverride>) => onChange({ ...ovr, ...partial });

  return (
    <div style={{
      background: ovr.enabled ? "rgba(14,28,60,0.5)" : "rgba(40,20,20,0.3)",
      border: `1px solid ${ovr.enabled ? "rgba(50,80,150,0.2)" : "rgba(120,40,40,0.3)"}`,
      borderRadius: 6, padding: "6px 10px",
      display: "flex", flexDirection: "column", gap: 5,
    }}>
      {/* Top row: label + enable toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 600,
          color: ovr.enabled ? "#7090c0" : "#604040",
          flex: 1, letterSpacing: "0.05em",
        }}>{label}</span>
        <Toggle label="" value={ovr.enabled} onChange={v => upd({ enabled: v })} color="#30b060" />
      </div>

      {ovr.enabled && (
        <>
          {/* Flip buttons */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ ...S.label, minWidth: 28 }}>Flip</span>
            {(["flipX","flipY","flipZ"] as const).map(f => (
              <FlipButton
                key={f}
                label={f.replace("flip","")}
                active={ovr[f]}
                onClick={() => upd({ [f]: !ovr[f] })}
              />
            ))}
          </div>

          {/* Scale slider */}
          <Slider
            label="Scale"
            min={0} max={2} step={0.05}
            value={ovr.scale}
            onChange={v => upd({ scale: v })}
            color="#c0a030"
          />
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface DebugPanelProps {
  config: DebugConfig;
  onChange: (cfg: DebugConfig) => void;
  liveStats?: {
    spineDir: number;  // Y component of spine vector (positive = up = good)
    hipY: number;
    shoulderY: number;
    noseY: number;
  } | null;
}

export function DebugPanel({ config: cfg, onChange, liveStats }: DebugPanelProps) {
  const upd = useCallback((partial: Partial<DebugConfig>) => {
    onChange({ ...cfg, ...partial });
  }, [cfg, onChange]);

  const updCoord = useCallback((partial: Partial<typeof cfg.coord>) => {
    upd({ coord: { ...cfg.coord, ...partial } });
  }, [cfg, upd]);

  const updBone = useCallback((boneName: string, ovr: BoneOverride) => {
    upd({ bones: { ...cfg.bones, [boneName]: ovr } });
  }, [cfg, upd]);

  const resetAll = () => onChange(defaultDebugConfig());
  const resetBones = () => {
    const bones = { ...cfg.bones };
    DRIVEN_BONES.forEach(b => { bones[b] = defaultBoneOverride(); });
    upd({ bones });
  };

  const spineDirOk = liveStats ? liveStats.spineDir > 0.1 : null;

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <span>⚙ Retargeting Debug</span>
        <button onClick={resetAll} style={{
          fontSize: 8, padding: "2px 8px", cursor: "pointer", letterSpacing: "0.1em",
          background: "rgba(80,20,20,0.4)", border: "1px solid rgba(180,60,60,0.3)",
          color: "#ff8080", borderRadius: 4, fontFamily: "inherit",
        }}>RESET ALL</button>
      </div>

      <div style={S.scroll}>

        {/* ── Live stats ── */}
        {liveStats && (
          <Section title="Live Coord Stats" defaultOpen={true}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 4, fontSize: 9, fontFamily: "monospace",
            }}>
              {[
                ["Hip Y (3JS)",    liveStats.hipY.toFixed(3),      true],
                ["Shoulder Y",     liveStats.shoulderY.toFixed(3), true],
                ["Nose Y",         liveStats.noseY.toFixed(3),     true],
                ["Spine dir (↑?)", liveStats.spineDir.toFixed(3),  spineDirOk],
              ].map(([k, v, ok]) => (
                <div key={String(k)} style={{
                  background: "rgba(10,20,45,0.6)", borderRadius: 4, padding: "4px 6px",
                  border: `1px solid ${ok === true ? "rgba(60,180,80,0.3)" : ok === false ? "rgba(180,60,60,0.3)" : "rgba(50,80,140,0.2)"}`,
                }}>
                  <div style={{ color: "#3a5a7a", marginBottom: 2 }}>{k}</div>
                  <div style={{ color: ok === true ? "#40e080" : ok === false ? "#ff6060" : "#80b0e0", fontSize: 11, fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: 9, padding: "5px 8px", borderRadius: 4, marginTop: 2,
              background: spineDirOk ? "rgba(20,80,40,0.4)" : "rgba(80,20,20,0.4)",
              border: `1px solid ${spineDirOk ? "rgba(60,180,80,0.3)" : "rgba(180,60,60,0.3)"}`,
              color: spineDirOk ? "#40e080" : "#ff6060",
            }}>
              {spineDirOk
                ? "✓ Spine points UP — coord conversion looks correct"
                : "✗ Spine points DOWN — try flipping Pose Y axis below"}
            </div>
          </Section>
        )}

        {/* ── Global coordinate axes ── */}
        <Section title="Coordinate Axes" defaultOpen={true}>
          <div style={{ fontSize: 9, color: "#3a5a7a", marginBottom: 4, lineHeight: 1.5 }}>
            Controls the sign of each axis when converting landmarks → 3D world space.
            Toggle an axis to negate it (flip direction).
          </div>
          <AxisSignRow
            label="Pose XYZ"
            signs={cfg.coord.poseAxisSigns}
            onChange={s => updCoord({ poseAxisSigns: s })}
          />
          <AxisSignRow
            label="Hand XYZ"
            signs={cfg.coord.handAxisSigns}
            onChange={s => updCoord({ handAxisSigns: s })}
          />
        </Section>

        {/* ── Scene / model transforms ── */}
        <Section title="Model Position" defaultOpen={false}>
          <Slider label="Offset Y" min={-2} max={2} step={0.05}
            value={cfg.coord.modelOffsetY}
            onChange={v => updCoord({ modelOffsetY: v })} color="#a040e0" />
          <Slider label="Offset Z" min={-2} max={2} step={0.05}
            value={cfg.coord.modelOffsetZ}
            onChange={v => updCoord({ modelOffsetZ: v })} color="#a040e0" />
        </Section>

        {/* ── Animation ── */}
        <Section title="Animation" defaultOpen={false}>
          <Slider label="Smoothing" min={0} max={1} step={0.05}
            value={cfg.coord.smoothing}
            onChange={v => updCoord({ smoothing: v })} color="#40c0a0" />
          <Slider label="Finger Curl" min={0} max={2} step={0.05}
            value={cfg.coord.fingerCurlScale}
            onChange={v => updCoord({ fingerCurlScale: v })} color="#40c0a0" />
        </Section>

        {/* ── Per-bone controls ── */}
        <Section title="Bone Overrides" badge={`${DRIVEN_BONES.length} bones`} defaultOpen={true}>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <button onClick={resetBones} style={{
              flex: 1, fontSize: 8, padding: "3px 0", cursor: "pointer",
              background: "rgba(20,35,70,0.6)", border: "1px solid rgba(50,80,150,0.3)",
              color: "#4a6a9a", borderRadius: 4, fontFamily: "inherit", letterSpacing: "0.1em",
            }}>RESET BONES</button>
            <button onClick={() => {
              const bones = { ...cfg.bones };
              DRIVEN_BONES.forEach(b => { bones[b] = { ...bones[b], enabled: false }; });
              upd({ bones });
            }} style={{
              flex: 1, fontSize: 8, padding: "3px 0", cursor: "pointer",
              background: "rgba(60,20,20,0.5)", border: "1px solid rgba(150,50,50,0.3)",
              color: "#aa6060", borderRadius: 4, fontFamily: "inherit", letterSpacing: "0.1em",
            }}>DISABLE ALL</button>
            <button onClick={() => {
              const bones = { ...cfg.bones };
              DRIVEN_BONES.forEach(b => { bones[b] = { ...bones[b], enabled: true }; });
              upd({ bones });
            }} style={{
              flex: 1, fontSize: 8, padding: "3px 0", cursor: "pointer",
              background: "rgba(20,60,30,0.5)", border: "1px solid rgba(50,150,70,0.3)",
              color: "#60aa70", borderRadius: 4, fontFamily: "inherit", letterSpacing: "0.1em",
            }}>ENABLE ALL</button>
          </div>

          {/* Group by body region */}
          {[
            { group: "Spine", bones: ["mixamorigSpine","mixamorigSpine1","mixamorigSpine2","mixamorigNeck","mixamorigHead"] },
            { group: "Left Arm", bones: ["mixamorigLeftArm","mixamorigLeftForeArm"] },
            { group: "Right Arm", bones: ["mixamorigRightArm","mixamorigRightForeArm"] },
            { group: "Legs", bones: ["mixamorigLeftUpLeg","mixamorigLeftLeg","mixamorigRightUpLeg","mixamorigRightLeg"] },
          ].map(({ group, bones }) => (
            <div key={group}>
              <div style={{
                fontSize: 8, color: "#2a4a6a", letterSpacing: "0.15em",
                textTransform: "uppercase", margin: "6px 0 4px",
                borderBottom: "1px solid rgba(40,60,100,0.3)", paddingBottom: 3,
              }}>{group}</div>
              {bones.map(bn => (
                <BoneRow
                  key={bn}
                  boneName={bn}
                  ovr={cfg.bones[bn] ?? defaultBoneOverride()}
                  onChange={o => updBone(bn, o)}
                />
              ))}
            </div>
          ))}
        </Section>

        {/* ── Export config ── */}
        <Section title="Config Export" defaultOpen={false}>
          <div style={{ fontSize: 8, color: "#3a5a7a", marginBottom: 6 }}>
            Copy this JSON to hardcode working settings
          </div>
          <pre style={{
            fontSize: 8, color: "#4a7aaa", background: "rgba(10,20,45,0.8)",
            borderRadius: 6, padding: 8, overflowX: "auto",
            border: "1px solid rgba(40,70,130,0.3)", maxHeight: 160,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
          }}>
            {JSON.stringify({
              poseAxisSigns: cfg.coord.poseAxisSigns,
              handAxisSigns: cfg.coord.handAxisSigns,
              smoothing: cfg.coord.smoothing,
              fingerCurlScale: cfg.coord.fingerCurlScale,
            }, null, 2)}
          </pre>
          <button
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2))}
            style={{
              width: "100%", marginTop: 4, padding: "5px 0",
              fontSize: 8, cursor: "pointer", letterSpacing: "0.12em",
              background: "rgba(20,45,90,0.6)", border: "1px solid rgba(60,100,180,0.3)",
              color: "#5080c0", borderRadius: 4, fontFamily: "inherit",
            }}
          >COPY FULL CONFIG</button>
        </Section>

      </div>
    </div>
  );
}