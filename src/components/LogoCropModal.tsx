import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  Crop,
  Sparkles,
  Eye,
  ShieldAlert,
} from 'lucide-react';

interface LogoCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  schoolName: string;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
}

export const LogoCropModal: React.FC<LogoCropModalProps> = ({
  isOpen,
  imageSrc,
  schoolName,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [baseFitScale, setBaseFitScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pinchStartDist, setPinchStartDist] = useState<number | null>(null);
  const [pinchStartZoom, setPinchStartZoom] = useState<number>(1);
  const [removeWhiteBg, setRemoveWhiteBg] = useState<boolean>(true);
  const [transparencySensitivity, setTransparencySensitivity] = useState<number>(230);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate effective scale = base fit scale * user zoom factor
  const effectiveScale = baseFitScale * zoom;

  // Auto-fit function that fits the complete image inside the square box
  const fitEntireLogo = (img: HTMLImageElement) => {
    const cropSize = 250; // Leave 15px safe margin so entire logo fits comfortably
    const fitScale = Math.min(cropSize / img.width, cropSize / img.height, 1);
    setBaseFitScale(fitScale > 0 ? fitScale : 1);
    setZoom(1.0);
    setPosition({ x: 0, y: 0 });
  };

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      fitEntireLogo(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Generate cropped preview
  const generateCrop = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const outputSize = 320; // Standardized square logo size in pixels
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, outputSize, outputSize);

    // Viewport is 280x280. Center is (140, 140).
    // Output is 320x320. Multiplier is 320 / 280.
    const multiplier = outputSize / 280;
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;

    ctx.save();
    ctx.translate(centerX + position.x * multiplier, centerY + position.y * multiplier);
    ctx.scale(effectiveScale * multiplier, effectiveScale * multiplier);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // If remove white background is enabled, filter near-white pixels with smooth edge blending
    if (removeWhiteBg) {
      const imgData = ctx.getImageData(0, 0, outputSize, outputSize);
      const data = imgData.data;
      const threshold = transparencySensitivity;
      const fadeRange = 25;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) continue;

        const minChannel = Math.min(r, g, b);
        const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));

        if (minChannel >= threshold && maxDiff < 30) {
          data[i + 3] = 0;
        } else if (minChannel >= threshold - fadeRange && maxDiff < 25) {
          const factor = (threshold - minChannel) / fadeRange;
          data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    return dataUrl;
  }, [effectiveScale, position, removeWhiteBg, transparencySensitivity]);

  // Update preview whenever parameters change
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      generateCrop();
    }, 50);
    return () => clearTimeout(timer);
  }, [generateCrop, isOpen]);

  if (!isOpen) return null;

  // Mouse / Touch handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchStartDist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newZoom = Math.min(Math.max((dist / pinchStartDist) * pinchStartZoom, 0.2), 3.0);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPinchStartDist(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.2), 3.0));
  };

  const handleReset = () => {
    if (!imageRef.current) return;
    fitEntireLogo(imageRef.current);
  };

  // Option to use the original image without any forced crop cuts
  const handleUseOriginal = () => {
    if (!imageSrc) return;
    onCropComplete(imageSrc);
    onClose();
  };

  const handleApply = () => {
    const finalDataUrl = generateCrop();
    if (finalDataUrl) {
      onCropComplete(finalDataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#141b2b] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[86dvh] sm:max-h-[90dvh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f59c73]/20 border border-[#f59c73]/40 flex items-center justify-center text-[#f59c73]">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                શાળા લોગો ક્રોપ & ફિટિંગ (Logo Crop & Alignment)
              </h3>
              <p className="text-[11px] text-slate-400">
                લોગોને ચોરસ બોક્સમાં યોગ્ય રીતે ગોઠવો જેથી તમામ ID કાર્ડમાં સરખી સાઇઝ રહે
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Crop Viewport */}
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#0f172a',
              }}
              className="relative w-[280px] h-[280px] rounded-2xl border-2 border-[#f59c73]/80 overflow-hidden cursor-move shadow-inner select-none flex items-center justify-center"
            >
              {/* Image being dragged/scaled */}
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Crop Source"
                  draggable={false}
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${effectiveScale})`,
                    transformOrigin: 'center center',
                    filter: removeWhiteBg ? 'contrast(1.05)' : 'none',
                  }}
                  className="max-w-none pointer-events-none transition-transform duration-75"
                />
              )}

              {/* Crop Guides Overlay (Square & Circle) */}
              <div className="absolute inset-0 pointer-events-none border border-white/25 rounded-2xl flex items-center justify-center">
                {/* Circular Guide */}
                <div className="w-[260px] h-[260px] rounded-full border border-dashed border-[#f59c73]/60" />
                {/* Crosshairs */}
                <div className="absolute w-4 h-0.5 bg-[#f59c73]/50" />
                <div className="absolute h-4 w-0.5 bg-[#f59c73]/50" />
              </div>

              {/* Overlay Badge */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-slate-300 font-mono pointer-events-none border border-white/10">
                માઉસ અથવા આંગળીથી ડ્રેગ કરો
              </div>
            </div>
          </div>

          {/* Controls: Zoom & Options */}
          <div className="space-y-3 bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl">
            {/* Zoom Slider & Quick Fit */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.05, 0.2))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  title="ઝૂમ આઉટ (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-[#f59c73] h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.05, 2.5))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  title="ઝૂમ ઇન (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-mono text-amber-300 w-14 text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Quick Helper Buttons for Auto-fit / Reset */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer"
                  title="આખો લોગો બોક્સમાં સમાવી લો"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>આખો લોગો ફિટ કરો (Fit Full Logo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1.0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] flex items-center gap-1 transition-colors border border-white/10 cursor-pointer"
                  title="૧૦૦% સામાન્ય સાઇઝ"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>૧૦૦% સ્કેલ</span>
                </button>
              </div>
            </div>

            {/* Remove White Background Checkbox & Sensitivity */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={removeWhiteBg}
                    onChange={(e) => setRemoveWhiteBg(e.target.checked)}
                    className="rounded accent-[#f59c73] w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 font-semibold text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    લોગો પારદર્શક (Transparent) રાખો — ફરતે સફેદ બોક્સ ન આવે
                  </span>
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  {removeWhiteBg ? 'સક્રિય (Transparent ON)' : 'બંધ (OFF)'}
                </span>
              </div>

              {removeWhiteBg && (
                <div className="flex items-center gap-3 pl-6 pr-1 text-[11px] text-slate-300">
                  <span className="text-slate-400 whitespace-nowrap">પારદર્શકતા સ્તર:</span>
                  <input
                    type="range"
                    min="180"
                    max="250"
                    step="5"
                    value={transparencySensitivity}
                    onChange={(e) => setTransparencySensitivity(parseInt(e.target.value))}
                    className="flex-1 accent-[#f59c73] h-1 bg-slate-700 rounded cursor-pointer"
                  />
                  <span className="font-mono text-amber-300 text-[10px] w-14 text-right">
                    {transparencySensitivity > 235 ? 'હળવું' : transparencySensitivity < 210 ? 'મજબૂત' : 'મધ્યમ'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live ID Card Header Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold px-1">
              <Eye className="w-3.5 h-3.5 text-[#f59c73]" />
              <span>ID કાર્ડ હેડરમાં આ રીતે દેખાશે (Live Header Preview):</span>
            </div>

            <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#090d16] to-[#1e293b] border-2 border-[#f59c73] flex items-center gap-2.5 shadow-md">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cropped Preview"
                  className="w-10 h-10 object-contain shrink-0 bg-transparent"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white uppercase truncate">
                  {schoolName || 'શાળાનું નામ (SCHOOL NAME)'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-300 mt-0.5">
                  <span>DISE: 24010401504</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#f59c73] text-slate-950 font-black text-[8px]">
                    વિદ્યાર્થી ID Card
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="shrink-0 px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 bg-white/[0.02]">
          <button
            type="button"
            onClick={handleUseOriginal}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
            title="ક્રોપ વગર આખો લોગો જેમ છે તેમ વાપરો"
          >
            ક્રોપ વિના સીધો રાખો (Full Logo)
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              રદ કરો (Cancel)
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>લોગો સાચવો અને અપલોડ કરો (Crop & Save Logo)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
