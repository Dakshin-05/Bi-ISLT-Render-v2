"use client";
import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { uploadVideo } from "../../lib/api";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono','Courier New',monospace" };

type State = "idle" | "uploading" | "done" | "error";

export default function TranslatePage() {
  const [state, setState]       = useState<State>("idle");
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [result, setResult]     = useState<{ text: string; gloss: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval>>();

  const processFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("video/")) {
      setErrorMsg("Please upload a video file (mp4, mov, webm…)");
      setState("error");
      return;
    }
    setFile(f);
    setState("uploading");
    setProgress(0);

    // Fake incremental progress while waiting for backend
    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 88));
    }, 400);

    try {
      const data = await uploadVideo(f);
      clearInterval(progressRef.current);
      setProgress(100);
      setResult(data);
      setState("done");
    } catch (e) {
      clearInterval(progressRef.current);
      setErrorMsg(e instanceof Error ? e.message : "Upload failed");
      setState("error");
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const reset = () => { setState("idle"); setFile(null); setResult(null); setErrorMsg(""); setProgress(0); };

  return (
    <main style={{ minHeight:"100vh", background:"#080f22", display:"flex",
      flexDirection:"column", ...mono }}>

      {/* Nav */}
      <nav style={{
        padding:"16px 40px", display:"flex", alignItems:"center",
        justifyContent:"space-between", borderBottom:"1px solid rgba(60,100,200,0.15)",
        background:"rgba(8,15,34,0.9)", backdropFilter:"blur(12px)", flexShrink:0,
      }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <div style={{ width:28, height:28, borderRadius:8,
            background:"linear-gradient(135deg,#1a40a0,#4080f0)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🤟</div>
          <span style={{ fontSize:12, letterSpacing:"0.15em", color:"#5a80c0", textTransform:"uppercase" }}>SignBridge</span>
        </Link>
        <div style={{ display:"flex", gap:10 }}>
          {[{ href:"/", label:"HOME" },{ href:"/sign-viewer", label:"3D VIEWER" }].map(l => (
            <Link key={l.href} href={l.href} style={{
              padding:"8px 18px", borderRadius:8, fontSize:9, letterSpacing:"0.12em",
              textDecoration:"none", color:"#4a6a9a", textTransform:"uppercase",
              border:"1px solid rgba(60,100,200,0.2)", background:"rgba(12,22,55,0.5)",
              transition:"all 0.2s",
            }}>{l.label}</Link>
          ))}
        </div>
      </nav>

      {/* Body */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 24px" }}>
        <div style={{ width:"100%", maxWidth:600, display:"flex", flexDirection:"column", gap:24 }}>

          {/* Page title */}
          <div style={{ textAlign:"center" }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              background:"rgba(30,60,140,0.25)", border:"1px solid rgba(80,140,255,0.2)",
              borderRadius:20, padding:"5px 16px", marginBottom:20,
            }}>
              <span style={{ fontSize:8, letterSpacing:"0.2em", color:"#5090c0", textTransform:"uppercase" }}>
                Video Translation
              </span>
            </div>
            <h1 style={{ margin:"0 0 10px", fontSize:28, fontWeight:800,
              background:"linear-gradient(135deg,#e0f0ff,#6090d0)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
              Sign Language → Text
            </h1>
            <p style={{ fontSize:11, color:"#3a5a7a", margin:0 }}>
              Upload a sign language video and get the predicted text translation
            </p>
          </div>

          {/* Drop zone — shown when idle or error */}
          {(state === "idle" || state === "error") && (
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={onDrop}
              onClick={()=>inputRef.current?.click()}
              style={{
                border:`2px dashed ${dragging?"rgba(80,140,255,0.7)":"rgba(60,100,200,0.3)"}`,
                borderRadius:18, padding:"56px 32px", textAlign:"center",
                background: dragging?"rgba(20,40,100,0.3)":"rgba(10,20,50,0.4)",
                cursor:"pointer", transition:"all 0.2s",
              }}
            >
              <input ref={inputRef} type="file" accept="video/*"
                style={{ display:"none" }}
                onChange={e=>{const f=e.target.files?.[0]; if(f)processFile(f);}} />
              <div style={{ fontSize:48, marginBottom:16 }}>🎥</div>
              <div style={{ fontSize:13, color:"#5080b0", fontWeight:600, marginBottom:8 }}>
                Drop a video file here
              </div>
              <div style={{ fontSize:10, color:"#2a4060" }}>
                or click to browse · mp4, mov, webm, avi
              </div>
              {state === "error" && (
                <div style={{ marginTop:16, fontSize:11, color:"#ff7070",
                  background:"rgba(80,20,20,0.4)", borderRadius:8, padding:"8px 16px",
                  border:"1px solid rgba(200,60,60,0.3)" }}>
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Uploading state */}
          {state === "uploading" && (
            <div style={{
              background:"rgba(10,20,50,0.7)", border:"1px solid rgba(60,100,200,0.2)",
              borderRadius:18, padding:"40px 32px", textAlign:"center",
            }}>
              <div style={{ fontSize:11, color:"#4a6a9a", letterSpacing:"0.15em",
                textTransform:"uppercase", marginBottom:24 }}>
                Analysing · {file?.name}
              </div>
              {/* Progress bar */}
              <div style={{ height:4, background:"rgba(40,70,140,0.3)", borderRadius:2,
                overflow:"hidden", marginBottom:12 }}>
                <div style={{
                  height:"100%", width:`${progress}%`,
                  background:"linear-gradient(90deg,#2050b0,#60a0ff)",
                  borderRadius:2, transition:"width 0.4s ease",
                }} />
              </div>
              <div style={{ fontSize:10, color:"#3a5a7a" }}>{Math.round(progress)}%</div>
            </div>
          )}

          {/* Result */}
          {state === "done" && result && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Result card */}
              <div style={{
                background:"rgba(10,25,60,0.8)", border:"1px solid rgba(60,140,80,0.35)",
                borderRadius:18, padding:"32px 28px",
              }}>
                <div style={{ fontSize:9, letterSpacing:"0.2em", color:"#3a7a4a",
                  textTransform:"uppercase", marginBottom:12 }}>
                  ✓ Translation Complete · {file?.name}
                </div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:9, letterSpacing:"0.15em", color:"#3a5a6a",
                    textTransform:"uppercase", marginBottom:8 }}>Predicted Text</div>
                  <div style={{
                    fontSize:26, fontWeight:800, color:"#90e0b0",
                    letterSpacing:"0.02em", lineHeight:1.3,
                    background:"rgba(20,60,35,0.4)", borderRadius:12,
                    padding:"16px 20px", border:"1px solid rgba(60,160,90,0.25)",
                  }}>
                    {result.text}
                  </div>
                </div>

                {result.gloss && result.gloss !== result.text && (
                  <div>
                    <div style={{ fontSize:9, letterSpacing:"0.15em", color:"#3a5a6a",
                      textTransform:"uppercase", marginBottom:8 }}>Gloss</div>
                    <div style={{ fontSize:14, color:"#5090a0", letterSpacing:"0.05em",
                      background:"rgba(10,30,50,0.5)", borderRadius:8,
                      padding:"10px 14px", border:"1px solid rgba(40,80,120,0.2)" }}>
                      {result.gloss}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:12 }}>
                <button onClick={reset} style={{
                  flex:1, padding:"12px 0", borderRadius:10, cursor:"pointer",
                  fontSize:10, letterSpacing:"0.12em", fontWeight:600, ...mono,
                  background:"rgba(12,22,55,0.7)", border:"1px solid rgba(60,100,200,0.3)",
                  color:"#4a6a9a", textTransform:"uppercase",
                }}>↩ Translate Another</button>
                <Link href={`/sign-viewer?text=${encodeURIComponent(result.text)}`} style={{
                  flex:1, padding:"12px 0", borderRadius:10, cursor:"pointer",
                  fontSize:10, letterSpacing:"0.12em", fontWeight:600, ...mono,
                  background:"linear-gradient(135deg,#1a40a0,#3060e0)",
                  border:"1px solid rgba(100,160,255,0.3)",
                  color:"#e0f0ff", textAlign:"center", textDecoration:"none",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                }}>🤟 View in 3D</Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}