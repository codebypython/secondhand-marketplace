"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  mode: "avatar" | "banner";
  onClose: () => void;
  onCrop: (croppedBlob: Blob) => void;
}

export function ImageCropperModal({
  isOpen,
  imageSrc,
  mode,
  onClose,
  onCrop,
}: ImageCropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const isAvatar = mode === "avatar";
  const cropSize = isAvatar ? 200 : 360; // size of the cropping window
  const cropHeight = isAvatar ? 200 : 120; // 3:1 aspect ratio for banner

  // Load image when src changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgElement(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Draw image on canvas whenever states change
  useEffect(() => {
    if (!imgElement || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    // Translate to center to zoom from center
    ctx.translate(cx + offset.x, cy + offset.y);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const imgWidth = imgElement.width;
    const imgHeight = imgElement.height;
    
    // Fit image to canvas boundaries by default
    let drawWidth = canvas.width;
    let drawHeight = (imgHeight / imgWidth) * drawWidth;

    if (drawHeight < canvas.height) {
      drawHeight = canvas.height;
      drawWidth = (imgWidth / imgHeight) * drawHeight;
    }

    ctx.drawImage(imgElement, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [imgElement, zoom, offset]);

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!imgElement || !canvasRef.current) return;
    const canvas = canvasRef.current;

    // Create a temporary canvas matching the crop size
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropSize;
    tempCanvas.height = cropHeight;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw the active canvas area into the temp canvas
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = "high";

    // Crop box coordinates on the canvas
    const sourceX = (canvas.width - cropSize) / 2;
    const sourceY = (canvas.height - cropHeight) / 2;

    tempCtx.drawImage(
      canvas,
      sourceX,
      sourceY,
      cropSize,
      cropHeight,
      0,
      0,
      cropSize,
      cropHeight
    );

    // Convert to blob and save
    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
          onClose();
        }
      },
      "image/jpeg",
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text)",
        padding: 16,
      }}
    >
      <div
        className="panel"
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-card, #171826)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 20px)",
          padding: 24,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {isAvatar ? "Căn chỉnh ảnh đại diện" : "Căn chỉnh ảnh banner"}
          </h3>
          <button
            type="button"
            className="button ghost sm"
            onClick={onClose}
            style={{ padding: 6, borderRadius: "50%" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropper Box */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 300,
            overflow: "hidden",
            borderRadius: "var(--radius)",
            backgroundColor: "#000",
            cursor: isDragging ? "grabbing" : "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            style={{ display: "block" }}
          />

          {/* Semi-transparent Overlay Mask */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isAvatar ? (
              // Circular crop mask
              <div
                style={{
                  width: cropSize,
                  height: cropHeight,
                  borderRadius: "50%",
                  border: "2px dashed var(--accent, #f9b17a)",
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
                }}
              />
            ) : (
              // Rectangular crop mask
              <div
                style={{
                  width: cropSize,
                  height: cropHeight,
                  border: "2px dashed var(--accent, #f9b17a)",
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
                }}
              />
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ZoomOut size={16} className="muted" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: "pointer",
                accentColor: "var(--accent)",
              }}
            />
            <ZoomIn size={16} className="muted" />
          </div>

          <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
            💡 Kéo thả để di chuyển ảnh, sử dụng thanh trượt để phóng to/thu nhỏ
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button ghost"
            onClick={onClose}
            style={{ padding: "8px 16px" }}
          >
            Hủy
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleSave}
            style={{ padding: "8px 20px" }}
          >
            Cắt và Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
