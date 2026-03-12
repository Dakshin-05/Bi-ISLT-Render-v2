"use client";

import { useRef, useState, useCallback } from "react";

export interface ExportOptions {
  fps: number;
  totalFrames: number;
  getCanvas: () => HTMLCanvasElement | null;
  onFrameRequest: (frameIdx: number) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (url: string) => void;
  onError?: (err: Error) => void;
}

export interface ExportState {
  isExporting: boolean;
  progress: number; // 0–100
  downloadUrl: string | null;
}

export function useVideoExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    downloadUrl: null,
  });
  const abortRef = useRef(false);

  const startExport = useCallback(async (opts: ExportOptions) => {
    const { fps, totalFrames, getCanvas, onFrameRequest, onProgress, onComplete, onError } = opts;

    const canvas = getCanvas();
    if (!canvas) {
      onError?.(new Error("Canvas not available"));
      return;
    }

    abortRef.current = false;
    setExportState({ isExporting: true, progress: 0, downloadUrl: null });

    try {
      // Use MediaRecorder + captureStream
      const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];

      const supportedMime = mimeTypes.find((m) =>
        MediaRecorder.isTypeSupported(m)
      );

      if (!supportedMime) {
        throw new Error("No supported video MIME type found in this browser.");
      }

      // Capture stream from canvas at desired FPS
      const stream = (canvas as any).captureStream(fps) as MediaStream;
      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 8_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingPromise = new Promise<string>((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: supportedMime });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };
        recorder.onerror = (e) => reject(new Error("MediaRecorder error"));
      });

      recorder.start();

      // Step through each frame, rendering it to canvas
      const msPerFrame = 1000 / fps;

      for (let i = 0; i < totalFrames; i++) {
        if (abortRef.current) break;

        onFrameRequest(i);

        // Wait one frame interval so MediaRecorder captures the render
        await new Promise<void>((res) => setTimeout(res, msPerFrame));

        const progress = Math.round(((i + 1) / totalFrames) * 100);
        setExportState((s) => ({ ...s, progress }));
        onProgress?.(progress);
      }

      recorder.stop();

      const url = await recordingPromise;
      setExportState({ isExporting: false, progress: 100, downloadUrl: url });
      onComplete?.(url);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setExportState({ isExporting: false, progress: 0, downloadUrl: null });
      onError?.(error);
    }
  }, []);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
    setExportState({ isExporting: false, progress: 0, downloadUrl: null });
  }, []);

  const clearDownload = useCallback(() => {
    setExportState((s) => {
      if (s.downloadUrl) URL.revokeObjectURL(s.downloadUrl);
      return { ...s, downloadUrl: null };
    });
  }, []);

  return { exportState, startExport, cancelExport, clearDownload };
}
