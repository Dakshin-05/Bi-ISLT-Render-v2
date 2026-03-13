"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SignData } from "../../types";
import { DebugConfig, defaultDebugConfig } from "../../types/";
import { PlayerControls } from "../../components/PlayerControls";
import { DebugPanel } from "../../components/DebugPanel";
import { useVideoExport } from "../../lib/useVideoExport";
import { textToSign } from "../../lib/api";
import type { ThreeSceneHandle, LiveStats } from "../../components/ThreeScene";

const ThreeScene = dynamic(
  () => import("../../components/ThreeScene").then(m => m.ThreeScene),
  {
    ssr: false,
    loading: () => (
      <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",
        justifyContent:"center",background:"#0d1628",
        color:"#3060a0",fontFamily:"monospace",fontSize:14,letterSpacing:"0.15em" }}>
        LOADING 3D ENGINE...
      </div>
    ),
  }
);

const mono: React.CSSProperties = { fontFamily:"'JetBrains Mono','Courier New',monospace" };

type PanelMode = "controls" | "debug" | "none";

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function SignViewerInner() {
  const searchParams = useSearchParams();
  const initialText  = searchParams.get("text") ?? "";

  const [signData, setSignData]       = useState<SignData | null>(null);
  const [frameIndex, setFrameIndex]   = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [debugCfg, setDebugCfg]       = useState<DebugConfig>(defaultDebugConfig);
  const [showDebug, setShowDebug]     = useState(false);
  const [liveStats, setLiveStats]     = useState<LiveStats | null>(null);
  const [panelMode, setPanelMode]     = useState<PanelMode>("controls");

  // Generate animation state
  const [inputText, setInputText]     = useState(initialText);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState<string | null>(null);

  const animRef     = useRef<number>();
  const lastTimeRef = useRef(0);
  const sceneRef    = useRef<ThreeSceneHandle>(null);
  const { exportState, startExport }  = useVideoExport();

  // ── No demo data — scene starts in T-pose (signData = null) ──

  const tick = useCallback((ts: number) => {
    if (!signData) return;
    const delta = ts - lastTimeRef.current;
    lastTimeRef.current = ts;
    setFrameIndex(prev => {
      const next = prev + (delta / 1000) * signData.fps;
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
    // Stay in T-pose — do NOT auto-play
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) return;
    setGenerating(true);
    setGenError(null);
    setIsPlaying(false);
    setFrameIndex(0);
    try {
      const data = await textToSign(inputText.trim()) as SignData;
      setSignData(data);
      // auto-play once data arrives
      setTimeout(() => setIsPlaying(true), 200);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate animation");
    } finally {
      setGenerating(false);
    }
  }, [inputText]);

  // If navigated from translate page with ?text=..., auto-generate
  useEffect(() => {
    if (initialText) handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = useCallback(async () => {
    if (!signData) return;
    setIsPlaying(false); setFrameIndex(0);
    await startExport({
      fps: signData.fps, totalFrames: signData.frames.length,
      getCanvas: () => sceneRef.current?.getCanvas() ?? null,
      onFrameRequest: idx => setFrameIndex(idx),
      onError: err => setGenError(err.message),
    });
  }, [signData, startExport]);

  // Empty sign data stub for T-pose (no frames = character stays at rest)
  const emptyData: SignData = { fps: 30, gloss: "", frames: [] };

  return (
    <main style={{ width:"100vw",height:"100vh",background:"#0a1020",
      display:"flex",flexDirection:"column",overflow:"hidden",...mono }}>

      {/* ── Header ── */}
      <header style={{
        padding:"9px 18px", borderBottom:"1px solid rgba(60,100,180,0.2)",
        display:"flex", alignItems:"center", gap:12,
        background:"rgba(8,15,35,0.98)", flexShrink:0,
      }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
          <div style={{ width:22, height:22, borderRadius:6,
            background:"linear-gradient(135deg,#1a40a0,#4080f0)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>🤟</div>
          <span style={{ fontSize:10, letterSpacing:"0.15em", color:"#3a5a80", textTransform:"uppercase" }}>
            SignBridge
          </span>
        </Link>

        <div style={{ width:1, height:16, background:"rgba(60,100,180,0.2)" }} />

        <div style={{ width:7, height:7, borderRadius:"50%",
          background:sceneLoaded?"#30d080":"#3a5080",
          boxShadow:sceneLoaded?"0 0 7px #30d080":"none", transition:"all 0.4s" }} />
        <span style={{ fontSize:10, letterSpacing:"0.18em", color:"#3a5a80", textTransform:"uppercase" }}>
          3D Sign Viewer
        </span>
        <div style={{ flex:1 }} />

        {(["controls","debug"] as PanelMode[]).map(mode => (
          <button key={mode} onClick={() => setPanelMode(p => p===mode?"none":mode)} style={{
            fontSize:9, padding:"4px 12px", cursor:"pointer", letterSpacing:"0.1em",
            ...mono, borderRadius:5, transition:"all 0.15s", textTransform:"uppercase",
            background: panelMode===mode
              ? mode==="debug"?"rgba(60,130,80,0.4)":"rgba(40,70,150,0.4)"
              : "rgba(14,25,55,0.6)",
            border:`1px solid ${panelMode===mode
              ? mode==="debug"?"rgba(80,200,100,0.4)":"rgba(80,120,200,0.4)"
              : "rgba(40,70,130,0.25)"}`,
            color: panelMode===mode ? mode==="debug"?"#60ff90":"#80b0ff" : "#3a5a8a",
          }}>
            {mode==="controls"?"⊞ Controls":"⚙ Debug"}
          </button>
        ))}

        <button onClick={()=>setShowDebug(d=>!d)} style={{
          fontSize:9, padding:"4px 10px", cursor:"pointer", letterSpacing:"0.1em",
          ...mono, borderRadius:5, textTransform:"uppercase",
          background:showDebug?"rgba(180,100,20,0.35)":"rgba(14,25,55,0.6)",
          border:`1px solid ${showDebug?"rgba(255,160,60,0.5)":"rgba(40,70,130,0.25)"}`,
          color:showDebug?"#ffb040":"#3a5a8a",
        }}>
          {showDebug?"◉ SKEL":"○ SKEL"}
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Viewport */}
        <div style={{ flex:1, position:"relative", minWidth:0 }}>
          <ThreeScene
            ref={sceneRef}
            signData={signData ?? emptyData}
            frameIndex={frameIndex}
            isPlaying={isPlaying}
            debugCfg={debugCfg}
            showDebug={showDebug}
            onLoaded={handleLoaded}
            onStats={setLiveStats}
          />

          {/* 3D engine loading overlay */}
          {!sceneLoaded && (
            <div style={{
              position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",
              background:"rgba(10,16,32,0.92)",gap:16,backdropFilter:"blur(4px)",zIndex:20,
            }}>
              <Spinner />
              <span style={{ fontSize:11, letterSpacing:"0.2em", color:"#4070b0" }}>
                LOADING CHARACTER...
              </span>
            </div>
          )}

          {/* Generating overlay */}
          {generating && (
            <div style={{
              position:"absolute",inset:0,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",
              background:"rgba(10,16,32,0.75)",gap:16,backdropFilter:"blur(4px)",zIndex:20,
            }}>
              <Spinner />
              <span style={{ fontSize:11, letterSpacing:"0.2em", color:"#60a0ff" }}>
                GENERATING ANIMATION...
              </span>
            </div>
          )}

          {/* Live stats bubble */}
          {liveStats && showDebug && (
            <div style={{
              position:"absolute", bottom:12, left:140, zIndex:10,
              background:"rgba(5,10,25,0.88)", border:"1px solid rgba(50,90,170,0.25)",
              borderRadius:8, padding:"7px 10px", fontSize:9, ...mono,
              color:"#4a6a9a", lineHeight:1.8, pointerEvents:"none",
            }}>
              <div style={{ color:liveStats.spineDir>0.1?"#40e080":"#ff6060", fontWeight:600, marginBottom:2 }}>
                {liveStats.spineDir>0.1?"✓ Spine UP":"✗ Spine DOWN"}
              </div>
              <div>Spine↑: <span style={{ color:liveStats.spineDir>0?"#40e080":"#ff6060" }}>
                {liveStats.spineDir.toFixed(3)}</span></div>
            </div>
          )}

          {/* Skeleton legend */}
          {showDebug && (
            <div style={{
              position:"absolute", bottom:12, right:12, zIndex:10,
              background:"rgba(5,10,25,0.85)", border:"1px solid rgba(60,100,180,0.2)",
              borderRadius:7, padding:"6px 10px", fontSize:8, ...mono, color:"#3a5a7a",
              lineHeight:1.9, pointerEvents:"none",
            }}>
              <div style={{ color:"#ff4040" }}>● Nose</div>
              <div style={{ color:"#ffff40" }}>● Arms</div>
              <div style={{ color:"#40ff80" }}>● Hips</div>
              <div style={{ color:"#60c0ff" }}>● Other</div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {panelMode !== "none" && (
          <div style={{
            width:panelMode==="debug"?320:290, flexShrink:0,
            borderLeft:"1px solid rgba(60,100,180,0.15)",
            display:"flex", flexDirection:"column", transition:"width 0.2s",
          }}>

            {/* Controls panel */}
            {panelMode === "controls" && (
              <div style={{
                flex:1, background:"rgba(8,15,32,0.98)",
                display:"flex", flexDirection:"column", gap:14,
                padding:14, overflowY:"auto",
              }}>

                {/* ── Generate Animation ── */}
                <div style={{
                  background:"rgba(12,24,58,0.8)",
                  border:"1px solid rgba(60,100,200,0.25)",
                  borderRadius:14, padding:16,
                  display:"flex", flexDirection:"column", gap:12,
                }}>
                  <div style={{ fontSize:9, letterSpacing:"0.15em", color:"#3a5a8a",
                    textTransform:"uppercase" }}>Generate Animation</div>

                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter" && (e.ctrlKey||e.metaKey)) handleGenerate(); }}
                    placeholder="Type a word or phrase…"
                    rows={3}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background:"rgba(6,14,38,0.9)",
                      border:"1px solid rgba(50,90,170,0.3)",
                      borderRadius:10, padding:"10px 12px",
                      color:"#c0d8ff", fontSize:12, ...mono,
                      resize:"vertical", outline:"none",
                      lineHeight:1.6,
                    }}
                  />

                  <button
                    onClick={handleGenerate}
                    disabled={generating || !inputText.trim()}
                    style={{
                      padding:"11px 0", borderRadius:10, cursor:generating||!inputText.trim()?"not-allowed":"pointer",
                      fontSize:11, fontWeight:700, letterSpacing:"0.1em", ...mono,
                      background:generating||!inputText.trim()
                        ?"rgba(20,35,80,0.5)"
                        :"linear-gradient(135deg,#1a40a0,#3060e0)",
                      border:`1px solid ${generating||!inputText.trim()
                        ?"rgba(40,70,130,0.2)":"rgba(100,160,255,0.35)"}`,
                      color:generating||!inputText.trim()?"#2a4060":"#e0f0ff",
                      transition:"all 0.2s",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    }}
                  >
                    {generating ? <><Spinner size={14} />GENERATING...</> : "▶  GENERATE ANIMATION"}
                  </button>

                  {genError && (
                    <div style={{
                      fontSize:10, color:"#ff7070", background:"rgba(80,20,20,0.4)",
                      border:"1px solid rgba(200,60,60,0.3)", borderRadius:8, padding:"8px 12px",
                    }}>
                      {genError}
                      <button onClick={()=>setGenError(null)} style={{
                        float:"right", background:"none", border:"none",
                        color:"#ff6060", cursor:"pointer", fontSize:9, ...mono, padding:0,
                      }}>✕</button>
                    </div>
                  )}

                  <div style={{ fontSize:8, color:"#2a4060", textAlign:"center" }}>
                    Ctrl+Enter to generate
                  </div>
                </div>

                {/* Player controls — only shown when animation is loaded */}
                {signData && signData.frames.length > 0 && (
                  <PlayerControls
                    isPlaying={isPlaying}
                    onPlayPause={() => setIsPlaying(p=>!p)}
                    frameIndex={frameIndex}
                    totalFrames={signData.frames.length}
                    fps={signData.fps}
                    gloss={signData.gloss ?? inputText}
                    onScrub={f=>{ setIsPlaying(false); setFrameIndex(f); }}
                    onExport={handleExport}
                    isExporting={exportState.isExporting}
                    exportProgress={exportState.progress}
                    downloadUrl={exportState.downloadUrl}
                  />
                )}

                {/* Quick axis fix */}
                <QuickAxisPanel cfg={debugCfg} onChange={setDebugCfg} />

              </div>
            )}

            {/* Debug panel */}
            {panelMode === "debug" && (
              <DebugPanel config={debugCfg} onChange={setDebugCfg} liveStats={liveStats} />
            )}

          </div>
        )}
      </div>
    </main>
  );
}

export default function SignViewerPage() {
  return (
    <Suspense fallback={
      <div style={{ width:"100vw",height:"100vh",background:"#0a1020",
        display:"flex",alignItems:"center",justifyContent:"center",
        color:"#3060a0",...mono,fontSize:14,letterSpacing:"0.15em" }}>
        LOADING...
      </div>
    }>
      <SignViewerInner />
    </Suspense>
  );
}

// ── Quick axis panel ──────────────────────────────────────────────────────────
function QuickAxisPanel({ cfg, onChange }: { cfg:DebugConfig; onChange:(c:DebugConfig)=>void }) {
  const s = cfg.coord.poseAxisSigns;
  const flip = (ax:"x"|"y"|"z") =>
    onChange({ ...cfg, coord:{ ...cfg.coord, poseAxisSigns:{ ...s, [ax]:s[ax]===1?-1:1 } } });
  return (
    <div style={{
      background:"rgba(14,24,52,0.7)", border:"1px solid rgba(50,90,170,0.18)",
      borderRadius:10, padding:"12px 14px",
    }}>
      <div style={{ fontSize:9,letterSpacing:"0.15em",color:"#3a5a8a",marginBottom:10,textTransform:"uppercase" }}>
        Quick Axis Fix
      </div>
      <div style={{ display:"flex", gap:6 }}>
        {(["x","y","z"] as const).map(ax => (
          <button key={ax} onClick={()=>flip(ax)} style={{
            flex:1, padding:"6px 0", fontSize:9, cursor:"pointer", ...mono,
            letterSpacing:"0.1em", borderRadius:5, transition:"all 0.15s",
            background:s[ax]===-1?"rgba(180,60,20,0.35)":"rgba(20,40,90,0.5)",
            border:`1px solid ${s[ax]===-1?"rgba(255,120,60,0.5)":"rgba(50,80,150,0.3)"}`,
            color:s[ax]===-1?"#ff9060":"#5070a0",
          }}>
            {s[ax]===-1?`−${ax.toUpperCase()}`:`+${ax.toUpperCase()}`}
          </button>
        ))}
      </div>
      <div style={{ fontSize:8,color:"#2a4060",marginTop:8 }}>
        ({s.x<0?"−":"+"}X, {s.y<0?"−":"+"}Y, {s.z<0?"−":"+"}Z)
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size=28 }: { size?:number }) {
  return (
    <div style={{
      width:size, height:size,
      border:`${size>20?2:1.5}px solid rgba(60,100,200,0.2)`,
      borderTopColor:"#4080e0", borderRadius:"50%",
      animation:"spin 0.8s linear infinite", flexShrink:0,
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}