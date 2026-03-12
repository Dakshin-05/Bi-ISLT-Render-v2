"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { SignData } from "../../types";
import { DebugConfig, defaultDebugConfig } from "../../types";
import { PlayerControls } from "../../components/PlayerControls";
import { FileUploader } from "../../components/FileUploader";
import { DebugPanel } from "../../components/DebugPanel";
import { useVideoExport } from "../../lib/useVideoExport";
import { generateDemoData } from "../../lib/demoData";
import type { ThreeSceneHandle, LiveStats } from "../../components/ThreeScene";

const ThreeScene = dynamic(
  () => import("../../components/ThreeScene").then(m => m.ThreeScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width:"100%",height:"100%",display:"flex",alignItems:"center",
        justifyContent:"center",background:"#0d1628",
        color:"#3060a0",fontFamily:"monospace",fontSize:14,letterSpacing:"0.15em",
      }}>LOADING 3D ENGINE...</div>
    ),
  }
);

type PanelMode = "controls" | "debug" | "none";

export default function SignViewerPage() {
  const [signData, setSignData]       = useState<SignData|null>(null);
  const [frameIndex, setFrameIndex]   = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [error, setError]             = useState<string|null>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [debugCfg, setDebugCfg]       = useState<DebugConfig>(defaultDebugConfig);
  const [showDebug, setShowDebug]     = useState(false);
  const [liveStats, setLiveStats]     = useState<LiveStats|null>(null);
  const [panelMode, setPanelMode]     = useState<PanelMode>("controls");

  const animRef     = useRef<number>();
  const lastTimeRef = useRef(0);
  const sceneRef    = useRef<ThreeSceneHandle>(null);
  const { exportState, startExport } = useVideoExport();

  useEffect(() => { setSignData(generateDemoData()); }, []);

  const tick = useCallback((ts: number) => {
    if (!signData) return;
    const delta = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    setFrameIndex(prev => {
      const next = prev + (delta/1000)*signData.fps;
      return next >= signData.frames.length ? 0 : next;
    });
    animRef.current = requestAnimationFrame(tick);
  }, [signData]);

  useEffect(() => {
    if (isPlaying && signData && sceneLoaded) {
      lastTimeRef.current = performance.now();
      animRef.current = requestAnimationFrame(tick);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, signData, sceneLoaded, tick]);

  const handleLoaded = useCallback(() => {
    setSceneLoaded(true);
    setTimeout(() => setIsPlaying(true), 400);
  }, []);

  const handleExport = useCallback(async () => {
    if (!signData) return;
    setIsPlaying(false); setFrameIndex(0);
    await startExport({
      fps: signData.fps, totalFrames: signData.frames.length,
      getCanvas: () => sceneRef.current?.getCanvas() ?? null,
      onFrameRequest: idx => setFrameIndex(idx),
      onError: err => setError(err.message),
    });
  }, [signData, startExport]);

  const handleFile = useCallback((data: SignData) => {
    setSignData(data); setFrameIndex(0); setIsPlaying(false);
    setSceneLoaded(false); setError(null);
    setTimeout(() => { setSceneLoaded(true); setIsPlaying(true); }, 600);
  }, []);

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono','Courier New',monospace" };

  return (
    <main style={{ width:"100vw", height:"100vh", background:"#0a1020",
      display:"flex", flexDirection:"column", overflow:"hidden", ...mono }}>

      {/* ── Header ── */}
      <header style={{
        padding:"10px 20px", borderBottom:"1px solid rgba(60,100,180,0.2)",
        display:"flex", alignItems:"center", gap:12,
        background:"rgba(8,15,35,0.98)", flexShrink:0,
      }}>
        <div style={{
          width:8, height:8, borderRadius:"50%",
          background: sceneLoaded?"#30d080":"#4060a0",
          boxShadow: sceneLoaded?"0 0 8px #30d080":"none",
          transition:"all 0.4s",
        }} />
        <span style={{ fontSize:11, letterSpacing:"0.2em", color:"#4070b0", textTransform:"uppercase" }}>
          Sign Language 3D Viewer
        </span>
        <div style={{ flex:1 }} />

        {/* Panel toggle buttons */}
        {(["controls","debug","none"] as PanelMode[]).map(mode => (
          <button key={mode} onClick={() => setPanelMode(p => p===mode?"none":mode)} style={{
            fontSize:9, padding:"4px 12px", cursor:"pointer", letterSpacing:"0.12em",
            fontFamily:"inherit", borderRadius:5, transition:"all 0.15s",
            background: panelMode===mode ? (mode==="debug"?"rgba(60,130,80,0.4)":"rgba(40,70,150,0.4)") : "rgba(14,25,55,0.6)",
            border: `1px solid ${panelMode===mode ? (mode==="debug"?"rgba(80,200,100,0.4)":"rgba(80,120,200,0.4)") : "rgba(40,70,130,0.25)"}`,
            color: panelMode===mode ? (mode==="debug"?"#60ff90":"#80b0ff") : "#3a5a8a",
            textTransform:"uppercase",
          }}>
            {mode==="controls"?"⊞ Controls":mode==="debug"?"⚙ Debug":"⊟ Hide"}
          </button>
        ))}

        {/* Skeleton overlay toggle */}
        <button onClick={() => setShowDebug(d=>!d)} style={{
          fontSize:9, padding:"4px 10px", cursor:"pointer", letterSpacing:"0.12em",
          fontFamily:"inherit", borderRadius:5,
          background: showDebug?"rgba(180,100,20,0.35)":"rgba(14,25,55,0.6)",
          border:`1px solid ${showDebug?"rgba(255,160,60,0.5)":"rgba(40,70,130,0.25)"}`,
          color: showDebug?"#ffb040":"#3a5a8a",
        }}>
          {showDebug?"◉ SKELETON ON":"○ SKELETON"}
        </button>

        <span style={{ fontSize:9, color:"#2a4060", letterSpacing:"0.1em" }}>v3.0</span>
      </header>

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Viewport */}
        <div style={{ flex:1, position:"relative", minWidth:0 }}>
          {signData ? (
            <ThreeScene
              ref={sceneRef}
              signData={signData}
              frameIndex={frameIndex}
              isPlaying={isPlaying}
              debugCfg={debugCfg}
              showDebug={showDebug}
              onLoaded={handleLoaded}
              onStats={setLiveStats}
            />
          ) : (
            <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",
              justifyContent:"center",background:"#0d1628",color:"#304060",
              fontSize:12,letterSpacing:"0.2em" }}>NO DATA LOADED</div>
          )}

          {/* Loading overlay */}
          {signData && !sceneLoaded && (
            <div style={{
              position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",
              background:"rgba(10,16,32,0.88)",gap:16,backdropFilter:"blur(4px)",
            }}>
              <Spinner />
              <span style={{fontSize:11,letterSpacing:"0.2em",color:"#4070b0"}}>LOADING CHARACTER...</span>
            </div>
          )}

          {/* Mini live stats bubble (always visible when stats available) */}
          {liveStats && (
            <div style={{
              position:"absolute", bottom:12, left:12,
              background:"rgba(5,10,25,0.88)", border:"1px solid rgba(50,90,170,0.25)",
              borderRadius:8, padding:"7px 10px", fontSize:9, ...mono,
              color:"#4a6a9a", lineHeight:1.8, pointerEvents:"none",
            }}>
              <div style={{color: liveStats.spineDir>0.1?"#40e080":"#ff6060", fontWeight:600, marginBottom:2}}>
                {liveStats.spineDir>0.1?"✓ Spine UP":"✗ Spine DOWN"}
              </div>
              <div>Hip Y: <span style={{color:"#7090c0"}}>{liveStats.hipY.toFixed(3)}</span></div>
              <div>Shldr Y: <span style={{color:"#7090c0"}}>{liveStats.shoulderY.toFixed(3)}</span></div>
              <div>Spine↑: <span style={{color: liveStats.spineDir>0?"#40e080":"#ff6060"}}>{liveStats.spineDir.toFixed(3)}</span></div>
            </div>
          )}

          {/* Skeleton legend */}
          {showDebug && (
            <div style={{
              position:"absolute", bottom:12, right:12,
              background:"rgba(5,10,25,0.85)", border:"1px solid rgba(60,100,180,0.2)",
              borderRadius:7, padding:"6px 10px", fontSize:8, ...mono, color:"#3a5a7a", lineHeight:1.9,
              pointerEvents:"none",
            }}>
              <div style={{color:"#ff4040"}}>● Nose (0)</div>
              <div style={{color:"#ffff40"}}>● Arms (11-16)</div>
              <div style={{color:"#40ff80"}}>● Hips (23-24)</div>
              <div style={{color:"#60c0ff"}}>● Other</div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {panelMode !== "none" && (
          <div style={{
            width: panelMode==="debug" ? 320 : 290,
            flexShrink:0,
            borderLeft:"1px solid rgba(60,100,180,0.15)",
            display:"flex", flexDirection:"column",
            transition:"width 0.2s",
          }}>

            {/* Controls panel */}
            {panelMode === "controls" && (
              <div style={{
                flex:1, background:"rgba(8,15,32,0.98)",
                display:"flex", flexDirection:"column", gap:14, padding:14, overflowY:"auto",
              }}>
                {signData && (
                  <PlayerControls
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying(p=>!p)}
                    frameIndex={frameIndex}
                    totalFrames={signData.frames.length}
                    fps={signData.fps}
                    gloss={signData.gloss}
                    onScrub={f => { setIsPlaying(false); setFrameIndex(f); }}
                    onExport={handleExport}
                    isExporting={exportState.isExporting}
                    exportProgress={exportState.progress}
                    downloadUrl={exportState.downloadUrl}
                  />
                )}
                <div>
                  <div style={{fontSize:9,letterSpacing:"0.15em",color:"#3a5a8a",textTransform:"uppercase",marginBottom:8}}>
                    Load Custom Data
                  </div>
                  <FileUploader onData={handleFile} onError={setError} />
                </div>
                <QuickAxisPanel cfg={debugCfg} onChange={setDebugCfg} />
                {error && (
                  <div style={{
                    background:"rgba(80,20,20,0.6)",border:"1px solid rgba(200,60,60,0.3)",
                    borderRadius:8,padding:12,fontSize:11,color:"#ff8080",
                  }}>
                    {error}
                    <button onClick={()=>setError(null)} style={{
                      display:"block",marginTop:6,background:"none",border:"none",
                      color:"#ff6060",cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:0,
                    }}>dismiss ✕</button>
                  </div>
                )}
              </div>
            )}

            {/* Debug panel */}
            {panelMode === "debug" && (
              <DebugPanel
                config={debugCfg}
                onChange={setDebugCfg}
                liveStats={liveStats}
              />
            )}

          </div>
        )}
      </div>
    </main>
  );
}

// ── Quick axis panel (shown in Controls sidebar for fast iteration) ────────────
function QuickAxisPanel({ cfg, onChange }: { cfg: DebugConfig; onChange: (c: DebugConfig) => void }) {
  const s = cfg.coord.poseAxisSigns;
  const flip = (ax: "x"|"y"|"z") =>
    onChange({ ...cfg, coord: { ...cfg.coord, poseAxisSigns: { ...s, [ax]: s[ax]===1?-1:1 } } });
  const mono: React.CSSProperties = { fontFamily:"monospace" };
  return (
    <div style={{
      background:"rgba(14,24,52,0.7)", border:"1px solid rgba(50,90,170,0.18)",
      borderRadius:8, padding:"10px 12px",
    }}>
      <div style={{fontSize:9,letterSpacing:"0.15em",color:"#3a5a8a",marginBottom:8,textTransform:"uppercase"}}>
        Quick Axis Fix
      </div>
      <div style={{fontSize:8,color:"#2a4060",marginBottom:8,lineHeight:1.5}}>
        Toggle to flip axis directions if the model bends wrong
      </div>
      <div style={{display:"flex",gap:6}}>
        {(["x","y","z"] as const).map(ax => (
          <button key={ax} onClick={()=>flip(ax)} style={{
            flex:1, padding:"6px 0", fontSize:9, cursor:"pointer", ...mono,
            letterSpacing:"0.1em", borderRadius:5, transition:"all 0.15s",
            background: s[ax]===-1?"rgba(180,60,20,0.35)":"rgba(20,40,90,0.5)",
            border:`1px solid ${s[ax]===-1?"rgba(255,120,60,0.5)":"rgba(50,80,150,0.3)"}`,
            color: s[ax]===-1?"#ff9060":"#5070a0",
          }}>
            {s[ax]===-1?`−${ax.toUpperCase()}`:`+${ax.toUpperCase()}`}
          </button>
        ))}
      </div>
      <div style={{fontSize:8,color:"#2a4060",marginTop:8,letterSpacing:"0.05em"}}>
        Current: ({s.x<0?"−":"+"}X, {s.y<0?"−":"+"}Y, {s.z<0?"−":"+"}Z)
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width:30, height:30, border:"2px solid rgba(60,100,200,0.2)",
      borderTopColor:"#4080e0", borderRadius:"50%", animation:"spin 0.8s linear infinite",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}