import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Eye, Sparkles } from "lucide-react";
import { SignaturePreview, type InkColor } from "@/components/ptw/signature-preview";

export function SignaturePad({
  value,
  onChange,
  signerName,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  signerName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(!value);
  const [inkColor, setInkColor] = useState<InkColor>("navy");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setEmpty(false);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Ink color options */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground flex items-center gap-1">
          <Sparkles className="size-3.5 text-blue-500" />
          رنگ قلم خودنویس:
        </span>
        <div className="flex gap-1.5">
          {(
            [
              ["navy", "سرمه‌ای", "bg-blue-900"],
              ["blue", "آبی", "bg-blue-600"],
              ["black", "مشکی", "bg-slate-900"],
              ["emerald", "سبز", "bg-emerald-700"],
            ] as const
          ).map(([c, label, bg]) => (
            <button
              key={c}
              type="button"
              onClick={() => setInkColor(c)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-all ${
                inkColor === c
                  ? "ring-2 ring-primary ring-offset-1 font-bold text-foreground"
                  : "opacity-75 hover:opacity-100 text-muted-foreground"
              }`}
            >
              <span className={`size-2.5 rounded-full ${bg}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-md border border-dashed border-input bg-card shadow-sm transition-colors hover:border-primary/40">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-32 w-full touch-none cursor-crosshair"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            امضای خود را با انگشت یا موس در این کادر بکشید
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <Eraser className="size-4" />
          پاک کردن امضا
        </Button>
      </div>

      {/* Realistic Handwritten Signature Preview */}
      {value && !empty && (
        <div className="rounded-md border border-blue-200/80 bg-blue-50/40 p-2.5 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-semibold text-blue-950 dark:text-blue-200">
              <Eye className="size-3.5 text-blue-600" />
              پیش‌نمایش واقع‌گرایانه امضا روی سند:
            </span>
            <span className="text-[10px] text-muted-foreground">برای بزرگ‌نمایی کلیک کنید</span>
          </div>
          <SignaturePreview
            dataUrl={value}
            signerName={signerName}
            inkColor={inkColor}
            showSeal={true}
            heightClass="h-16"
          />
        </div>
      )}
    </div>
  );
}
