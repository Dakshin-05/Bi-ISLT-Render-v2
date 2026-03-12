"use client";
import React, { useCallback, useState } from "react";
import {
  DebugConfig, BoneOverride, DRIVEN_BONES, BONE_LABELS,
  defaultDebugConfig, defaultBoneOverride, AxisSigns,
} from "../types";

// ── Style helpers ─────────────────────────────────────────────────────────────
const mono: React.CSSProperties = { fontFamily:"'JetBrains Mono','Courier New',monospace" };

const btn = (active: boolean, activeColor = "#4080e0"): React.CSSProperties => ({
  padding:"3px 8px", fontSize:9, ...mono, letterSpacing:"0.08em",
  borderRadius:4, cursor:"pointer", transition:"all 0.12s",
  border:`1px solid ${active ? activeColor+"99" : "rgba(50,80,150,0.35)"}`,
  background: active ? activeColor+"33" : "rgba(18,30,65,0.6)",
  color: active ? activeColor : "#4a6a9a",
});

const label9: React.CSSProperties = {
  fontSize:9, color:"#4a6a9a", letterSpacing:"0.08em", minWidth:72, flexShrink:0,
};

function Row({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display:"flex", alignItems:"center", gap:6, minHeight:22, ...style }}>{children}</div>;
}

// ── Slider ────────────────────────────────────────────────────────────────────
function Slider({ label, min, max, step, value, onChange, color="#4080e0" }:
  { label:string; min:number; max:number; step:number; value:number; onChange:(v:number)=>void; color?:string }) {
  return (
    <Row>
      <span style={label9}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(parseFloat(e.target.value))}
        style={{ flex:1, accentColor:color, cursor:"pointer", height:14 }} />
      <span style={{ fontSize:10, color, minWidth:30, textAlign:"right", ...mono }}>
        {value.toFixed(step<0.1?2:1)}
      </span>
    </Row>
  );
}

// ── Axis sign row (3 toggle buttons) ─────────────────────────────────────────
function AxisRow({ label, signs, onChange }:
  { label:string; signs:AxisSigns; onChange:(s:AxisSigns)=>void }) {
  return (
    <Row>
      <span style={label9}>{label}</span>
      {(["x","y","z"] as const).map(ax => (
        <button key={ax} onClick={()=>onChange({...signs,[ax]:signs[ax]===1?-1:1})}
          style={btn(signs[ax]===-1,"#ff7040")}>
          {signs[ax]===-1?`−${ax.toUpperCase()}`:`+${ax.toUpperCase()}`}
        </button>
      ))}
      <span style={{fontSize:8,color:"#2a4060",...mono,marginLeft:2}}>
        {["x","y","z"].map(a=>`${(signs as any)[a]<0?"−":"+"}${a.toUpperCase()}`).join(" ")}
      </span>
    </Row>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, color="#4080e0" }:
  { label:string; value:boolean; onChange:(v:boolean)=>void; color?:string }) {
  return (
    <Row>
      <span style={label9}>{label}</span>
      <button onClick={()=>onChange(!value)} style={{
        width:34, height:18, borderRadius:9, cursor:"pointer", padding:0,
        background: value?color:"rgba(18,30,65,0.8)",
        border:`1px solid ${value?color:"rgba(50,80,150,0.3)"}`,
        position:"relative", transition:"all 0.18s",
      }}>
        <div style={{
          position:"absolute", top:2, left:value?17:2,
          width:12, height:12, borderRadius:"50%",
          background:value?"#fff":"#3a5a8a", transition:"left 0.18s",
        }}/>
      </button>
      <span style={{fontSize:9,color:value?color:"#3a5a7a",...mono}}>{value?"ON":"OFF"}</span>
    </Row>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, children, open: initOpen=true, badge, accent }:
  { title:string; children:React.ReactNode; open?:boolean; badge?:string; accent?:string }) {
  const [open,setOpen]=useState(initOpen);
  const ac = accent ?? "rgba(50,90,170,0.18)";
  return (
    <div style={{ background:"rgba(10,20,48,0.7)", border:`1px solid ${ac}`, borderRadius:8, overflow:"hidden" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        padding:"7px 12px", fontSize:9, letterSpacing:"0.18em", color:"#4a7aaa",
        textTransform:"uppercase", borderBottom:open?`1px solid ${ac}`:"none",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        cursor:"pointer", userSelect:"none",
      }}>
        <span>{title}</span>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {badge&&<span style={{fontSize:8,background:"rgba(60,120,200,0.15)",
            border:"1px solid rgba(60,120,200,0.25)",borderRadius:3,padding:"1px 5px",color:"#5090c0"}}>{badge}</span>}
          <span style={{color:"#3a5a7a"}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&<div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:6}}>{children}</div>}
    </div>
  );
}

// ── Per-bone row ──────────────────────────────────────────────────────────────
function BoneRow({ boneName, ovr, onChange }:
  { boneName:string; ovr:BoneOverride; onChange:(o:BoneOverride)=>void }) {
  const lbl = BONE_LABELS[boneName] ?? boneName.replace("mixamorig","");
  const u = (p: Partial<BoneOverride>) => onChange({...ovr,...p});
  return (
    <div style={{
      background: ovr.enabled?"rgba(12,24,55,0.6)":"rgba(35,15,15,0.5)",
      border:`1px solid ${ovr.enabled?"rgba(50,80,150,0.2)":"rgba(100,30,30,0.3)"}`,
      borderRadius:6, padding:"6px 10px", display:"flex", flexDirection:"column", gap:5,
    }}>
      <Row>
        <span style={{ fontSize:9, fontWeight:600, color:ovr.enabled?"#7090c0":"#604040",
          flex:1, letterSpacing:"0.05em", ...mono }}>{lbl}</span>
        <Toggle label="" value={ovr.enabled} onChange={v=>u({enabled:v})} color="#30b060" />
      </Row>
      {ovr.enabled && (
        <>
          <Row>
            <span style={{...label9,minWidth:28}}>Flip</span>
            {(["flipX","flipY","flipZ"] as const).map(f => (
              <button key={f} onClick={()=>u({[f]:!ovr[f]})}
                style={btn(ovr[f],"#ff7040")}>
                {f.replace("flip","")}
              </button>
            ))}
          </Row>
          <Slider label="Scale" min={0} max={2} step={0.05} value={ovr.scale}
            onChange={v=>u({scale:v})} color="#c0a030" />
        </>
      )}
    </div>
  );
}

// ── Quick preset buttons ──────────────────────────────────────────────────────
function PresetButton({ label, onClick, color="#5070a0" }:
  { label:string; onClick:()=>void; color?:string }) {
  return (
    <button onClick={onClick} style={{
      flex:1, fontSize:8, padding:"5px 4px", cursor:"pointer", ...mono,
      letterSpacing:"0.08em", borderRadius:5, transition:"all 0.15s",
      background:"rgba(18,35,75,0.6)", border:`1px solid ${color}44`, color,
    }}>{label}</button>
  );
}

// ── Main DebugPanel ───────────────────────────────────────────────────────────
interface DebugPanelProps {
  config: DebugConfig;
  onChange: (cfg: DebugConfig) => void;
  liveStats?: { spineDir:number; hipY:number; shoulderY:number; noseY:number } | null;
}

export function DebugPanel({ config:cfg, onChange, liveStats }: DebugPanelProps) {
  const upd = useCallback((p: Partial<DebugConfig>) => onChange({...cfg,...p}), [cfg,onChange]);
  const updC = useCallback((p: Partial<typeof cfg.coord>) => upd({coord:{...cfg.coord,...p}}), [cfg,upd]);
  const updB = useCallback((name:string, o:BoneOverride) => upd({bones:{...cfg.bones,[name]:o}}), [cfg,upd]);

  const resetAll  = () => onChange(defaultDebugConfig());
  const resetBones= () => {
    const b={...cfg.bones}; DRIVEN_BONES.forEach(n=>{b[n]=defaultBoneOverride();}); upd({bones:b});
  };

  // ── Presets for common arm problems ──
  const applyArmPreset = (preset: "default"|"flipZ"|"flipY"|"flipYZ") => {
    const armBones = ["mixamorigLeftArm","mixamorigLeftForeArm","mixamorigRightArm","mixamorigRightForeArm"];
    const b = {...cfg.bones};
    armBones.forEach(name => {
      b[name] = {
        ...defaultBoneOverride(),
        flipZ: preset==="flipZ"||preset==="flipYZ",
        flipY: preset==="flipY"||preset==="flipYZ",
      };
    });
    upd({bones:b});
  };

  const spineDirOk = liveStats ? liveStats.spineDir > 0.1 : null;

  return (
    <div style={{
      background:"rgba(6,12,28,0.97)", borderLeft:"1px solid rgba(50,90,170,0.2)",
      display:"flex", flexDirection:"column", height:"100%", overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"9px 14px", borderBottom:"1px solid rgba(50,90,170,0.2)",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0,
        fontSize:10, letterSpacing:"0.2em", color:"#3a6aaa", textTransform:"uppercase", ...mono,
      }}>
        <span>⚙ Retargeting Debug</span>
        <button onClick={resetAll} style={{
          fontSize:8, padding:"2px 8px", cursor:"pointer", letterSpacing:"0.1em", ...mono,
          background:"rgba(80,20,20,0.4)", border:"1px solid rgba(180,60,60,0.3)",
          color:"#ff8080", borderRadius:4,
        }}>RESET ALL</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"10px 12px",
        display:"flex", flexDirection:"column", gap:10 }}>

        {/* ── Live stats ── */}
        {liveStats && (
          <Section title="Live Stats" open={true}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {([
                ["Hip Y",    liveStats.hipY.toFixed(3),      null],
                ["Shldr Y",  liveStats.shoulderY.toFixed(3), null],
                ["Nose Y",   liveStats.noseY.toFixed(3),     null],
                ["Spine ↑?", liveStats.spineDir.toFixed(3),  spineDirOk],
              ] as [string,string,boolean|null][]).map(([k,v,ok])=>(
                <div key={k} style={{
                  background:"rgba(8,16,40,0.7)", borderRadius:4, padding:"4px 7px",
                  border:`1px solid ${ok===true?"rgba(60,180,80,0.3)":ok===false?"rgba(180,60,60,0.3)":"rgba(40,70,130,0.2)"}`,
                }}>
                  <div style={{color:"#3a5a7a",fontSize:8,...mono,marginBottom:1}}>{k}</div>
                  <div style={{color:ok===true?"#40e080":ok===false?"#ff6060":"#80b0e0",fontSize:11,fontWeight:700,...mono}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontSize:9,padding:"5px 8px",borderRadius:4,
              background:spineDirOk?"rgba(20,80,40,0.4)":"rgba(80,20,20,0.4)",
              border:`1px solid ${spineDirOk?"rgba(60,180,80,0.3)":"rgba(180,60,60,0.3)"}`,
              color:spineDirOk?"#40e080":"#ff6060",...mono,
            }}>
              {spineDirOk ? "✓ Spine UP — coord looks correct" : "✗ Spine DOWN — flip Pose Y or Z axis"}
            </div>
          </Section>
        )}

        {/* ── Global coordinate axes ── */}
        <Section title="Coordinate Axes" open={true} accent="rgba(80,60,170,0.25)">
          <div style={{fontSize:8,color:"#3a5070",lineHeight:1.6,marginBottom:2}}>
            Negate axes to flip landmark directions globally. Red button = axis is negated.
          </div>
          <AxisRow label="Pose XYZ" signs={cfg.coord.poseAxisSigns}
            onChange={s=>updC({poseAxisSigns:s})} />
          <AxisRow label="Hand XYZ" signs={cfg.coord.handAxisSigns}
            onChange={s=>updC({handAxisSigns:s})} />
        </Section>

        {/* ── Arm quick-fix presets ── */}
        <Section title="Arm Direction Presets" open={true} accent="rgba(200,120,20,0.2)">
          <div style={{fontSize:8,color:"#7a5a20",lineHeight:1.6,marginBottom:2}}>
            Arms pointing wrong? Try these presets — they flip Z/Y on all 4 arm bones.
            The skeleton overlay helps verify which looks correct.
          </div>
          <div style={{display:"flex",gap:5}}>
            <PresetButton label="Default (no flip)"  onClick={()=>applyArmPreset("default")} color="#5070a0" />
            <PresetButton label="Flip Z"             onClick={()=>applyArmPreset("flipZ")}   color="#e08040" />
            <PresetButton label="Flip Y"             onClick={()=>applyArmPreset("flipY")}   color="#40a0e0" />
            <PresetButton label="Flip Y+Z"           onClick={()=>applyArmPreset("flipYZ")}  color="#a040e0" />
          </div>
        </Section>

        {/* ── Model position ── */}
        <Section title="Model Position" open={false}>
          <Slider label="Offset Y" min={-2} max={2} step={0.05}
            value={cfg.coord.modelOffsetY} onChange={v=>updC({modelOffsetY:v})} color="#a040e0" />
          <Slider label="Offset Z" min={-2} max={2} step={0.05}
            value={cfg.coord.modelOffsetZ} onChange={v=>updC({modelOffsetZ:v})} color="#a040e0" />
        </Section>

        {/* ── Animation ── */}
        <Section title="Animation" open={false}>
          <Slider label="Smoothing"    min={0} max={1} step={0.05}
            value={cfg.coord.smoothing} onChange={v=>updC({smoothing:v})} color="#40c0a0" />
          <Slider label="Finger Curl"  min={0} max={2} step={0.05}
            value={cfg.coord.fingerCurlScale} onChange={v=>updC({fingerCurlScale:v})} color="#40c0a0" />
        </Section>

        {/* ── Per-bone overrides ── */}
        <Section title="Bone Overrides" badge={`${DRIVEN_BONES.length}`} open={true}>
          <div style={{display:"flex",gap:5,marginBottom:4}}>
            <PresetButton label="Reset Bones"  onClick={resetBones}  color="#5070a0" />
            <PresetButton label="Disable All"  onClick={()=>{
              const b={...cfg.bones};
              DRIVEN_BONES.forEach(n=>{b[n]={...b[n],enabled:false};}); upd({bones:b});
            }} color="#aa5050" />
            <PresetButton label="Enable All"   onClick={()=>{
              const b={...cfg.bones};
              DRIVEN_BONES.forEach(n=>{b[n]={...b[n],enabled:true};}); upd({bones:b});
            }} color="#50aa60" />
          </div>

          {/* Grouped by body region */}
          {[
            { group:"Spine / Head", bones:["mixamorigSpine","mixamorigSpine1","mixamorigSpine2","mixamorigNeck","mixamorigHead"] },
            { group:"Left Arm",     bones:["mixamorigLeftArm","mixamorigLeftForeArm"] },
            { group:"Right Arm",    bones:["mixamorigRightArm","mixamorigRightForeArm"] },
            { group:"Legs",         bones:["mixamorigLeftUpLeg","mixamorigLeftLeg","mixamorigRightUpLeg","mixamorigRightLeg"] },
          ].map(({group,bones})=>(
            <div key={group}>
              <div style={{
                fontSize:8,color:"#2a4060",letterSpacing:"0.15em",textTransform:"uppercase",
                margin:"6px 0 4px",borderBottom:"1px solid rgba(30,55,100,0.4)",paddingBottom:3,...mono,
              }}>{group}</div>
              {bones.map(bn=>(
                <BoneRow key={bn} boneName={bn}
                  ovr={cfg.bones[bn]??defaultBoneOverride()}
                  onChange={o=>updB(bn,o)} />
              ))}
            </div>
          ))}
        </Section>

        {/* ── Config export ── */}
        <Section title="Export Config" open={false}>
          <div style={{fontSize:8,color:"#3a5070",marginBottom:4}}>
            Copy → paste as default in debugConfig.ts to hardcode working values
          </div>
          <pre style={{
            fontSize:8,color:"#4a7aaa",background:"rgba(8,16,42,0.9)",
            borderRadius:6,padding:8,overflowX:"auto",
            border:"1px solid rgba(40,70,130,0.3)",maxHeight:150,
            whiteSpace:"pre-wrap",wordBreak:"break-all",...mono,
          }}>
{JSON.stringify({poseAxisSigns:cfg.coord.poseAxisSigns,handAxisSigns:cfg.coord.handAxisSigns,
  smoothing:cfg.coord.smoothing,fingerCurlScale:cfg.coord.fingerCurlScale},null,2)}
          </pre>
          <button onClick={()=>navigator.clipboard?.writeText(JSON.stringify(cfg,null,2))}
            style={{
              width:"100%",marginTop:4,padding:"5px 0",fontSize:8,cursor:"pointer",
              letterSpacing:"0.12em",...mono,
              background:"rgba(18,40,85,0.7)",border:"1px solid rgba(60,100,180,0.3)",
              color:"#5080c0",borderRadius:4,
            }}>COPY FULL CONFIG TO CLIPBOARD</button>
        </Section>

      </div>
    </div>
  );
}