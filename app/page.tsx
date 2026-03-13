"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono','Courier New',monospace" };

// Animated particle canvas background
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const dots: Dot[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,140,255,${d.alpha})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(60,100,200,${0.12 * (1 - dist/120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      background: "rgba(12,22,55,0.7)",
      border: "1px solid rgba(60,100,200,0.2)",
      borderRadius: 16,
      padding: "28px 24px",
      backdropFilter: "blur(10px)",
      transition: "all 0.25s",
      cursor: "default",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(80,140,255,0.45)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(60,100,200,0.2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#90bfff", letterSpacing: "0.05em", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#4a6a9a", lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

function NavBtn({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} style={{
      padding: "13px 32px",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.12em",
      textDecoration: "none",
      transition: "all 0.2s",
      ...mono,
      ...(primary ? {
        background: "linear-gradient(135deg, #1a40a0, #3060e0)",
        border: "1px solid rgba(100,160,255,0.4)",
        color: "#e0f0ff",
        boxShadow: "0 0 24px rgba(60,100,220,0.3)",
      } : {
        background: "rgba(12,22,55,0.7)",
        border: "1px solid rgba(60,100,200,0.3)",
        color: "#6090c0",
      }),
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.04)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"; }}
    >
      {label}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main style={{
      minHeight: "100vh", background: "#080f22",
      display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative", ...mono,
    }}>
      <ParticleCanvas />

      {/* Nav */}
      <nav style={{
        position: "relative", zIndex: 10,
        padding: "18px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(60,100,200,0.12)",
        background: "rgba(8,15,34,0.6)", backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg,#1a40a0,#4080f0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>🤟</div>
          <span style={{ fontSize: 12, letterSpacing: "0.15em", color: "#5a80c0", textTransform: "uppercase" }}>
            SignBridge
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <NavBtn href="/translate" label="TRANSLATE" />
          <NavBtn href="/sign-viewer" label="3D VIEWER" primary />
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: "relative", zIndex: 5,
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 32px 60px", textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(30,60,140,0.3)",
          border: "1px solid rgba(80,140,255,0.25)",
          borderRadius: 24, padding: "6px 18px", marginBottom: 40,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d080", boxShadow: "0 0 8px #30d080" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: "#5090c0", textTransform: "uppercase" }}>
            AI-Powered Sign Language System
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          margin: "0 0 24px",
          fontSize: "clamp(36px, 6vw, 72px)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          background: "linear-gradient(135deg, #e0f0ff 0%, #90c0ff 50%, #5080e0 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Sign Language<br />
          <span style={{
            background: "linear-gradient(135deg, #60a0ff 0%, #a060ff 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Bridging</span> the Gap
        </h1>

        <p style={{
          fontSize: "clamp(13px,1.6vw,17px)",
          color: "#4a6a9a", lineHeight: 1.8,
          maxWidth: 560, margin: "0 0 56px",
        }}>
          Translate sign language videos to text and convert text back to
          3D animated sign language — powered by AI and real-time pose estimation.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <NavBtn href="/translate" label="🎥  TRANSLATE VIDEO" primary />
          <NavBtn href="/sign-viewer" label="🤟  VIEW 3D SIGNS" />
        </div>

        {/* Feature cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20, maxWidth: 860, width: "100%", marginTop: 80,
        }}>
          <FeatureCard icon="🎥" title="Video → Text"
            desc="Upload a sign language video and get AI-powered text translation in seconds." />
          <FeatureCard icon="🤟" title="Text → 3D Sign"
            desc="Type any phrase and watch a 3D character perform the corresponding signs." />
          <FeatureCard icon="⚙️" title="Real-Time Retargeting"
            desc="MediaPipe skeleton mapped live to a Mixamo rig with full debug controls." />
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 10,
        textAlign: "center", padding: "20px 32px",
        fontSize: 9, letterSpacing: "0.15em", color: "#2a3a5a",
        borderTop: "1px solid rgba(40,70,140,0.12)",
      }}>
        SIGNBRIDGE · MEDIAPIPE + MIXAMO RETARGETING SYSTEM
      </footer>
    </main>
  );
}