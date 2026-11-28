import { useEffect, useRef, useState } from 'react';
import { PenTool } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  resetSignal: number;
  hint?: string;
}

const labelCls =
  'block text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.16em]';

export function SignaturePad({
  label,
  value,
  onChange,
  resetSignal,
  hint = 'Pumirma gamit ang mouse, touch, o pen',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState<'#111111' | '#1d4ed8'>('#111111');

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const w = Math.max(rect.width, 300);
    const h = Math.max(rect.height, 130);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = penColor;
  };

  useEffect(() => {
    initCanvas();
    hasInkRef.current = false;
  }, [resetSignal]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.strokeStyle = penColor;
  }, [penColor]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width === 0) initCanvas();
    canvas.setPointerCapture(e.pointerId);
    const pt = getPoint(e);
    drawingRef.current = true;
    lastPointRef.current = pt;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.01, pt.y + 0.01);
    ctx.stroke();
    hasInkRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPointRef.current) return;

    const pt = getPoint(e);
    const midX = (lastPointRef.current.x + pt.x) / 2;
    const midY = (lastPointRef.current.y + pt.y) / 2;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midX, midY);
    ctx.stroke();

    lastPointRef.current = pt;
    hasInkRef.current = true;
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (canvas && hasInkRef.current) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasInkRef.current = false;
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className={labelCls}>{label}</label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Black Ink"
            onClick={() => setPenColor('#111111')}
            className={`w-4 h-4 rounded-full bg-zinc-900 border-2 transition-transform cursor-pointer ${
              penColor === '#111111' ? 'border-[#E8191A] scale-110' : 'border-zinc-300'
            }`}
          />
          <button
            type="button"
            title="Blue Ink"
            onClick={() => setPenColor('#1d4ed8')}
            className={`w-4 h-4 rounded-full bg-blue-700 border-2 transition-transform cursor-pointer ${
              penColor === '#1d4ed8' ? 'border-[#E8191A] scale-110' : 'border-zinc-300'
            }`}
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="w-full h-32 block touch-none cursor-crosshair"
        />
        {!value && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-300">
            <PenTool className="w-4 h-4" />
            <span className="text-[11px] font-semibold">{hint}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-5 border-b border-zinc-200" />
      </div>
    </div>
  );
}
