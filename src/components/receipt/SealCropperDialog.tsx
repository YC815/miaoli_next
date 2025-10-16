"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SealCropperDialogProps {
  open: boolean;
  imageSrc?: string;
  defaultName?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { dataUrl: string; name: string }) => void;
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const OUTPUT_SIZE = 512;

export function SealCropperDialog({
  open,
  imageSrc,
  defaultName = "",
  onOpenChange,
  onConfirm,
}: SealCropperDialogProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const dragStateRef = React.useRef<DragState | null>(null);
  const [name, setName] = React.useState(defaultName);
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [minScale, setMinScale] = React.useState(1);
  const [maxScale, setMaxScale] = React.useState(4);
  const naturalSizeRef = React.useRef({ width: 0, height: 0 });

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const clampPosition = React.useCallback(
    (next: { x: number; y: number }, nextScale: number) => {
      const cropSize = containerRef.current?.clientWidth ?? 0;
      const { width, height } = naturalSizeRef.current;
      if (!width || !height || !cropSize) {
        return next;
      }
      const scaledWidth = width * nextScale;
      const scaledHeight = height * nextScale;
      const limitX = Math.max(0, (scaledWidth - cropSize) / 2);
      const limitY = Math.max(0, (scaledHeight - cropSize) / 2);
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    []
  );

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const cropSize = containerRef.current?.clientWidth ?? 0;
    if (!cropSize) return;

    naturalSizeRef.current = { width: img.naturalWidth, height: img.naturalHeight };

    const minScaleForCoverage = Math.max(
      cropSize / img.naturalWidth,
      cropSize / img.naturalHeight
    );

    setMinScale(minScaleForCoverage);
    setMaxScale(minScaleForCoverage * 4);
    setScale(minScaleForCoverage);
    setPosition({ x: 0, y: 0 });
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    dragStateRef.current = {
      startX: clientX,
      startY: clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!dragStateRef.current) return;
      const deltaX = clientX - dragStateRef.current.startX;
      const deltaY = clientY - dragStateRef.current.startY;
      const nextPosition = clampPosition(
        {
          x: dragStateRef.current.originX + deltaX,
          y: dragStateRef.current.originY + deltaY,
        },
        scale
      );
      setPosition(nextPosition);
    },
    [clampPosition, scale]
  );

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      handlePointerMove(event.clientX, event.clientY);
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
      }
    };
    const handleMouseUp = () => handlePointerUp();
    const handleTouchEnd = () => handlePointerUp();

    const touchMoveOptions: AddEventListenerOptions = { passive: false };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, touchMoveOptions);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove, touchMoveOptions);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handlePointerMove]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const zoomFactor = 0.1 * direction;
    const nextScale = Math.min(
      maxScale,
      Math.max(minScale, scale + zoomFactor * scale)
    );
    setScale(nextScale);
    setPosition((prev) => clampPosition(prev, nextScale));
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextScale = parseFloat(event.target.value);
    setScale(nextScale);
    setPosition((prev) => clampPosition(prev, nextScale));
  };

  const handleConfirm = () => {
    if (!imageRef.current || !containerRef.current) return;
    if (!name.trim()) return;

    const imageElement = imageRef.current;
    const containerElement = containerRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageRect = imageElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();

    const scaleX = imageElement.naturalWidth / imageRect.width;
    const scaleY = imageElement.naturalHeight / imageRect.height;

    const cropX = (containerRect.left - imageRect.left) * scaleX;
    const cropY = (containerRect.top - imageRect.top) * scaleY;
    const cropSize = containerRect.width * scaleX;

    ctx.fillStyle = "rgba(255,255,255,0)";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(
      imageElement,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    const dataUrl = canvas.toDataURL("image/png");
    onConfirm({ dataUrl, name: name.trim() });
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      dragStateRef.current = null;
    }
    onOpenChange(nextOpen);
  };

  const renderCropper = () => {
    if (!imageSrc) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <span className="text-sm text-muted-foreground">未選擇圖片</span>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="relative mx-auto h-72 w-72 cursor-grab overflow-hidden rounded-xl border border-dashed border-primary/40 bg-muted"
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="待裁切印章"
          className="pointer-events-auto select-none"
          draggable={false}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            userSelect: "none",
            touchAction: "none",
          }}
          onLoad={handleImageLoad}
          onMouseDown={(event) => {
            event.preventDefault();
            handlePointerDown(event.clientX, event.clientY);
          }}
          onTouchStart={(event) => {
            if (event.touches.length > 0) {
              const touch = event.touches[0];
              handlePointerDown(touch.clientX, touch.clientY);
            }
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-primary/80" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>裁切印章</DialogTitle>
          <DialogDescription>
            拖曳圖片調整位置，使用滑鼠滾輪或下方滑桿縮放，確保印章填滿正方形區域。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {renderCropper()}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              縮放
            </label>
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={(maxScale - minScale) / 100 || 0.01}
              value={scale}
              onChange={handleScaleChange}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="seal-name" className="text-sm font-medium">
              印章名稱
            </label>
            <Input
              id="seal-name"
              placeholder="例如：主要印章或主席章"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!imageSrc || !name.trim()}>
            儲存裁切結果
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
