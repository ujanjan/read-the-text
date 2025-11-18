import { useEffect, useState } from 'react';

interface RealtimeCursorIndicatorProps {
  enabled: boolean;
  showTrail?: boolean;
}

export function RealtimeCursorIndicator({ enabled, showTrail = true }: RealtimeCursorIndicatorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      if (showTrail) {
        setTrail(prev => {
          const newTrail = [...prev, { x: e.clientX, y: e.clientY, id: Date.now() }];
          // Keep only last 10 trail points
          return newTrail.slice(-10);
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, showTrail]);

  useEffect(() => {
    if (!showTrail) return;

    // Clean up old trail points
    const interval = setInterval(() => {
      setTrail(prev => prev.slice(-5));
    }, 100);

    return () => clearInterval(interval);
  }, [showTrail]);

  if (!enabled) return null;

  return (
    <>
      {/* Trail effect */}
      {showTrail && trail.map((point, index) => (
        <div
          key={point.id}
          style={{
            position: 'fixed',
            left: point.x,
            top: point.y,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: `rgba(59, 130, 246, ${0.1 + (index / trail.length) * 0.3})`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9997,
            transition: 'opacity 0.3s ease-out'
          }}
        />
      ))}

      {/* Main cursor indicator */}
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'all 0.05s ease-out'
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.6)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Inner dot */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgb(59, 130, 246)',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)'
            }}
          />
        </div>
      </div>
    </>
  );
}