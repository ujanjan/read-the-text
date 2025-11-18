import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { CursorData } from './CursorTracker';

interface CursorHeatmapProps {
  cursorHistory: CursorData[];
  opacity?: number;
  radius?: number;
}

export interface CursorHeatmapHandle {
  saveImage: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

export const CursorHeatmap = forwardRef<CursorHeatmapHandle, CursorHeatmapProps>(
  function CursorHeatmap({ cursorHistory, opacity = 0.6, radius = 40 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (cursorHistory.length === 0) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      cursorHistory.forEach(point => {
        const gradient = tempCtx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, radius
        );

        const intensity = 0.05;

        gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        tempCtx.fillStyle = gradient;
        tempCtx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
      });

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

      ctx.putImageData(imageData, 0, 0);

    }, [cursorHistory, radius]);

    useEffect(() => {
      const resize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
      };

      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }, []);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9998,
          opacity: opacity
        }}
      />
    );
  }
);
