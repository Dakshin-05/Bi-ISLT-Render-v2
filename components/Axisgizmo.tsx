"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface AxisGizmoProps {
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  size?: number;
}

const AXIS_DEFS = [
  { dir: new THREE.Vector3(1,0,0),  color:"#ff5555", dimColor:"#6a2222", label:"X" },
  { dir: new THREE.Vector3(0,1,0),  color:"#55ff55", dimColor:"#226a22", label:"Y" },
  { dir: new THREE.Vector3(0,0,1),  color:"#5599ff", dimColor:"#223366", label:"Z" },
];

export function AxisGizmo({ cameraRef, size = 120 }: AxisGizmoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = size/2, cy = size/2, R = size*0.34;

    function render() {
      ctx.clearRect(0,0,size,size);
      ctx.beginPath();
      ctx.arc(cx,cy,size*0.46,0,Math.PI*2);
      ctx.fillStyle="rgba(6,12,28,0.78)";
      ctx.fill();
      ctx.strokeStyle="rgba(60,100,180,0.22)";
      ctx.lineWidth=1;
      ctx.stroke();

      const cam = cameraRef.current;
      const invQ = cam ? cam.quaternion.clone().invert() : new THREE.Quaternion();

      type E = { px:number;py:number;nx:number;ny:number;depth:number;color:string;dimColor:string;label:string };
      const entries: E[] = AXIS_DEFS.map(ax => {
        const pos = ax.dir.clone().applyQuaternion(invQ);
        const neg = ax.dir.clone().negate().applyQuaternion(invQ);
        return { px:cx+pos.x*R, py:cy-pos.y*R, nx:cx+neg.x*R, ny:cy-neg.y*R,
                 depth:pos.z, color:ax.color, dimColor:ax.dimColor, label:ax.label };
      });

      // Negative stubs (dashed)
      entries.forEach(e => {
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(e.nx,e.ny);
        ctx.strokeStyle=e.dimColor; ctx.lineWidth=1.5;
        ctx.setLineDash([3,4]); ctx.globalAlpha=0.6; ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha=1;
      });

      // Positive axes, back-to-front
      [...entries].sort((a,b)=>a.depth-b.depth).forEach(e => {
        const front = e.depth >= -0.01;
        const alpha = front ? 1 : 0.4;
        ctx.globalAlpha=alpha;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(e.px,e.py);
        ctx.strokeStyle=e.color; ctx.lineWidth=front?2.5:1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(e.px,e.py,front?5.5:3.5,0,Math.PI*2);
        ctx.fillStyle=e.color; ctx.fill();
        if (front) {
          const ox=(e.px-cx)*0.45, oy=(e.py-cy)*0.45;
          ctx.font=`bold ${Math.round(size*0.1)}px monospace`;
          ctx.fillStyle=e.color; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(e.label, e.px+ox, e.py+oy);
        }
        ctx.globalAlpha=1;
      });

      rafRef.current=requestAnimationFrame(render);
    }

    rafRef.current=requestAnimationFrame(render);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cameraRef, size]);

  return (
    <canvas ref={canvasRef} width={size} height={size} style={{
      position:"absolute", top:12, left:12,
      pointerEvents:"none", borderRadius:"50%", zIndex:20,
    }} />
  );
}