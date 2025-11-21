import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { CursorData } from './CursorTracker';

interface CursorHeatmapProps {
  cursorHistory: CursorData[];
  opacity?: number;
  radius?: number;
  containerRef?: React.RefObject<HTMLElement>;
  visible?: boolean; // Controls whether heatmap is visible to user (default true)
}

export interface CursorHeatmapHandle {
  saveImage: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const CursorHeatmap = forwardRef<CursorHeatmapHandle, CursorHeatmapProps>(
  function CursorHeatmap({ cursorHistory, opacity = 0.6, radius = 40, containerRef, visible = true }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 9998,
      opacity: opacity
    });

    useImperativeHandle(ref, () => ({
      saveImage() {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use toBlob instead of toDataURL (much more reliable)
        canvas.toBlob((blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `cursor-heatmap-${new Date().toISOString()}.png`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(url);
        }, 'image/png');
      },
      getCanvas() {
        return canvasRef.current;
      }
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get container bounds if provided, otherwise use full viewport
      let containerBounds = {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        containerBounds = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        };
      }

      // Use device pixel ratio for accurate rendering and screenshot compositing
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = containerBounds.width * pixelRatio;
      canvas.height = containerBounds.height * pixelRatio;

      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (cursorHistory.length === 0) return;

      // Create temp canvas at device pixel resolution
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = containerBounds.width * pixelRatio;
      tempCanvas.height = containerBounds.height * pixelRatio;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Scale the temp context so we can work in CSS pixels
      tempCtx.scale(pixelRatio, pixelRatio);

      // Filter cursor points to only those within the container bounds
      const pointsInBounds = cursorHistory.filter(point => {
        return point.x >= containerBounds.left &&
               point.x <= containerBounds.left + containerBounds.width &&
               point.y >= containerBounds.top &&
               point.y <= containerBounds.top + containerBounds.height;
      });

      pointsInBounds.forEach(point => {
        // Convert global coordinates to container-relative coordinates
        const relativeX = point.x - containerBounds.left;
        const relativeY = point.y - containerBounds.top;

        const gradient = tempCtx.createRadialGradient(
          relativeX, relativeY, 0,
          relativeX, relativeY, radius
        );

        const intensity = 0.05;

        gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(relativeX - radius, relativeY - radius, radius * 2, radius * 2);
      });

      // Get image data at device pixel resolution
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];

        if (alpha > 0) {
          const normalized = alpha / 255;
          let r, g, b;

          if (normalized < 0.2) {
            const t = normalized / 0.2;
            r = 0;
            g = Math.floor(255 * t);
            b = 255;
          } else if (normalized < 0.4) {
            const t = (normalized - 0.2) / 0.2;
            r = 0;
            g = 255;
            b = Math.floor(255 * (1 - t));
          } else if (normalized < 0.6) {
            const t = (normalized - 0.4) / 0.2;
            r = Math.floor(255 * t);
            g = 255;
            b = 0;
          } else if (normalized < 0.8) {
            const t = (normalized - 0.6) / 0.2;
            r = 255;
            g = Math.floor(255 * (1 - t * 0.5));
            b = 0;
          } else {
            const t = (normalized - 0.8) / 0.2;
            r = 255;
            g = Math.floor(128 * (1 - t));
            b = 0;
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = Math.min(255, alpha * 2);
        }
      }

      // Put image data directly (at device pixel resolution)
      ctx.putImageData(imageData, 0, 0);

    }, [cursorHistory, radius, containerRef]);

    useEffect(() => {
      const updateCanvasSizeAndPosition = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let containerBounds = {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight
        };

        if (containerRef?.current) {
          const rect = containerRef.current.getBoundingClientRect();
          containerBounds = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          };
        }

        // Use device pixel ratio for accurate rendering
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = containerBounds.width * pixelRatio;
        canvas.height = containerBounds.height * pixelRatio;

        // Update canvas style position
        // When not visible, use opacity 0 to hide from user but keep rendering for screenshots
        setCanvasStyle({
          position: 'fixed',
          top: containerBounds.top,
          left: containerBounds.left,
          width: containerBounds.width,
          height: containerBounds.height,
          pointerEvents: 'none',
          zIndex: 9998,
          opacity: visible ? opacity : 0
        });
      };

      const resize = () => {
        updateCanvasSizeAndPosition();
      };

      // Use ResizeObserver to watch for container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef?.current) {
        resizeObserver = new ResizeObserver(() => {
          updateCanvasSizeAndPosition();
        });
        resizeObserver.observe(containerRef.current);
      }

      // Also update on scroll to handle position changes
      const handleScroll = () => {
        updateCanvasSizeAndPosition();
      };

      window.addEventListener('resize', resize);
      window.addEventListener('scroll', handleScroll, true);
      updateCanvasSizeAndPosition();

      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', handleScroll, true);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }, [containerRef, opacity, visible]);

    return (
      <canvas
        ref={canvasRef}
        style={canvasStyle}
      />
    );
  }
);
