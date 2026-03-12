"use client";

import React, { useRef, useCallback } from "react";
import { SignData } from "../types";

interface FileUploaderProps {
  onData: (data: SignData) => void;
  onError: (msg: string) => void;
}

export function FileUploader({ onData, onError }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        onError("Please upload a .json file.");
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as SignData;

        if (!data.fps || !Array.isArray(data.frames) || data.frames.length === 0) {
          throw new Error("Invalid sign data format.");
        }

        onData(data);
      } catch (e) {
        onError(`Parse error: ${(e as Error).message}`);
      }
    },
    [onData, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        border: "2px dashed rgba(80,120,220,0.4)",
        borderRadius: "12px",
        padding: "20px",
        textAlign: "center",
        cursor: "pointer",
        background: "rgba(20,35,70,0.5)",
        transition: "all 0.2s",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div style={{ fontSize: "24px", marginBottom: "8px" }}>📂</div>
      <div style={{ fontSize: "12px", color: "#6080b0", letterSpacing: "0.1em" }}>
        DROP JSON FILE
      </div>
      <div style={{ fontSize: "10px", color: "#405080", marginTop: "4px" }}>
        or click to browse
      </div>
    </div>
  );
}
