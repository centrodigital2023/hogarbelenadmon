import { useRef, useState, useEffect, useCallback } from "react";
import { Trash2, Camera, Pen } from "lucide-react";

interface SignaturePadProps {
  label: string;
  value?: string;
  onChange?: (dataUrl: string | null) => void;
}

const SignaturePad = ({ label, value, onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);
  const [mode, setMode] = useState<'draw' | 'camera'>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); setHasSignature(true); };
      img.src = value;
    }
  }, [value]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (hasSignature && canvasRef.current) {
      onChange?.(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange?.(null);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        setHasSignature(true);
        onChange?.(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1 mb-1">
        <button type="button" onClick={() => setMode('draw')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${mode === 'draw' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Pen size={10} /> Dibujar
        </button>
        <button type="button" onClick={() => setMode('camera')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${mode === 'camera' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Camera size={10} /> Cámara
        </button>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={300} height={120}
          className="border-2 border-dashed border-border rounded-xl bg-white cursor-crosshair touch-none"
          style={{ width: 200, height: 80 }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
        {hasSignature && (
          <button type="button" onClick={clear}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {mode === 'camera' && (
        <label className="flex items-center gap-1 text-xs text-primary cursor-pointer font-medium">
          <Camera size={12} /> Capturar firma
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
        </label>
      )}

      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {!hasSignature && <p className="text-[9px] text-muted-foreground/60">Dibuje o capture su firma</p>}
    </div>
  );
};

export default SignaturePad;
