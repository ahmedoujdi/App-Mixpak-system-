import React, { useRef, useState } from "react";
import { COLORS, primaryButtonStyle, ghostButtonStyle } from "../shared.jsx";
import { Eraser, Check } from "lucide-react";

export default function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ffffff";
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted }}>
        FIRMA DE CONFORMIDAD DEL TÉCNICO
      </label>
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 8, background: "#080c10", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: "100%", height: 160, touchAction: "none", cursor: "crosshair" }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button type="button" onClick={clearCanvas} style={ghostButtonStyle}>
          <Eraser size={14} /> Limpiar
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={ghostButtonStyle}>
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            style={{ ...primaryButtonStyle, opacity: isEmpty ? 0.5 : 1 }}
          >
            <Check size={14} /> Confirmar Firma
          </button>
        </div>
      </div>
    </div>
  );
}
