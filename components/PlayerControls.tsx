"use client";

import React from "react";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  frameIndex: number;
  totalFrames: number;
  fps: number;
  gloss: string;
  onScrub: (frame: number) => void;
  onExport: () => void;
  isExporting: boolean;
  exportProgress: number;
  downloadUrl: string | null;
}

export function PlayerControls({
  isPlaying,
  onPlayPause,
  frameIndex,
  totalFrames,
  fps,
  gloss,
  onScrub,
  onExport,
  isExporting,
  exportProgress,
  downloadUrl,
}: PlayerControlsProps) {
  const currentTime = frameIndex / fps;
  const totalTime = totalFrames / fps;

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toFixed(1)
      .padStart(4, "0")}`;

  return (
    <div
      style={{
        background: "rgba(10, 18, 40, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(80, 120, 220, 0.25)",
        borderRadius: "16px",
        padding: "20px 24px",
        color: "#e0eaff",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        userSelect: "none",
      }}
    >
      {/* Top row: gloss + FPS info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "#5a7aaa",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            SIGN GLOSS
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#90c0ff",
              letterSpacing: "0.05em",
            }}
          >
            {gloss.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "0.15em",
              color: "#5a7aaa",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            FRAME
          </div>
          <div style={{ fontSize: "13px", color: "#c0d8ff" }}>
            {Math.floor(frameIndex) + 1} / {totalFrames}
          </div>
          <div style={{ fontSize: "11px", color: "#5a7aaa" }}>{fps} fps</div>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#4a6a9a",
          }}
        >
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalTime)}</span>
        </div>
        <div style={{ position: "relative" }}>
          {/* Track background */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "4px",
              transform: "translateY(-50%)",
              background: "rgba(80,120,200,0.2)",
              borderRadius: "2px",
            }}
          />
          {/* Progress fill */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: `${totalFrames > 0 ? (frameIndex / (totalFrames - 1)) * 100 : 0}%`,
              height: "4px",
              transform: "translateY(-50%)",
              background: "linear-gradient(90deg, #3060c0, #60a0ff)",
              borderRadius: "2px",
              pointerEvents: "none",
            }}
          />
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            step={0.1}
            value={frameIndex}
            onChange={(e) => onScrub(parseFloat(e.target.value))}
            style={{
              width: "100%",
              opacity: 0,
              height: "24px",
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
              margin: 0,
            }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          style={{
            background: isPlaying
              ? "rgba(60, 90, 180, 0.4)"
              : "linear-gradient(135deg, #2050a0, #4080e0)",
            border: "1px solid rgba(100,160,255,0.3)",
            borderRadius: "10px",
            color: "#e0f0ff",
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: "13px",
            fontFamily: "inherit",
            fontWeight: 600,
            letterSpacing: "0.05em",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
          }}
        >
          {isPlaying ? (
            <>
              <PauseIcon />
              PAUSE
            </>
          ) : (
            <>
              <PlayIcon />
              PLAY
            </>
          )}
        </button>

        {/* Export button */}
        {!isExporting && !downloadUrl && (
          <button
            onClick={onExport}
            style={{
              background: "rgba(20,40,80,0.6)",
              border: "1px solid rgba(80,120,200,0.3)",
              borderRadius: "10px",
              color: "#90c0ff",
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
              fontWeight: 600,
              letterSpacing: "0.05em",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ExportIcon />
            EXPORT
          </button>
        )}

        {/* Download link */}
        {downloadUrl && (
          <a
            href={downloadUrl}
            download="sign-language.webm"
            style={{
              background: "linear-gradient(135deg, #1a5030, #30a060)",
              border: "1px solid rgba(80,200,120,0.3)",
              borderRadius: "10px",
              color: "#80ffb0",
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
              fontWeight: 600,
              letterSpacing: "0.05em",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <DownloadIcon />
            DOWNLOAD
          </a>
        )}
      </div>

      {/* Export progress */}
      {isExporting && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#5a8aaa",
            }}
          >
            <span>Encoding video...</span>
            <span>{exportProgress}%</span>
          </div>
          <div
            style={{
              height: "4px",
              background: "rgba(60,100,160,0.3)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${exportProgress}%`,
                background: "linear-gradient(90deg, #20a060, #60e0a0)",
                borderRadius: "2px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// SVG icon components
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <polygon points="3,1 13,7 3,13" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="2" y="1" width="4" height="12" rx="1" />
      <rect x="8" y="1" width="4" height="12" rx="1" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="6" />
      <circle cx="7" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 2v7M4 6l3 3 3-3" />
      <path d="M2 11h10" />
    </svg>
  );
}
