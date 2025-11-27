import { useEffect, useRef } from 'react';

export interface CursorData {
  x: number;
  y: number;
  timestamp: number;
}

interface CursorTrackerProps {
  onCursorData?: (data: CursorData) => void;
  enabled: boolean;
}

export function CursorTracker({ onCursorData, enabled }: CursorTrackerProps) {
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(onCursorData);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = onCursorData;
  }, [onCursorData]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle mouse move events to avoid overwhelming data
      if (throttleTimeoutRef.current) return;

      const cursorData: CursorData = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      };

      if (callbackRef.current) {
        callbackRef.current(cursorData);
      }

      // Set throttle timeout
      throttleTimeoutRef.current = setTimeout(() => {
        throttleTimeoutRef.current = null;
      }, 50);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);

      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [enabled]);

  return null;
}