import { useCallback, useRef, useEffect } from 'react';
import { TerminalView } from './TerminalView';
import type { SplitOrientation } from '../store/appStore';

interface SplitViewProps {
  terminalIds: [string, string];
  orientation: SplitOrientation;
  ratio: number;
  onRatioChange: (ratio: number) => void;
}

export function SplitView({ terminalIds, orientation, ratio, onRatioChange }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newRatio: number;
      if (orientation === 'horizontal') {
        newRatio = (e.clientX - rect.left) / rect.width;
      } else {
        newRatio = (e.clientY - rect.top) / rect.height;
      }
      onRatioChange(Math.max(0.2, Math.min(0.8, newRatio)));
    };

    const handleMouseUp = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [orientation, onRatioChange]);

  const isHorizontal = orientation === 'horizontal';
  const firstSize = `${ratio * 100}%`;
  const secondSize = `${(1 - ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex"
      style={{ flexDirection: isHorizontal ? 'row' : 'column' }}
    >
      {/* First pane */}
      <div style={{ [isHorizontal ? 'width' : 'height']: firstSize }} className="overflow-hidden">
        <TerminalView terminalId={terminalIds[0]} />
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex-shrink-0 bg-border hover:bg-accent-primary/50 transition-colors ${
          isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'
        }`}
      />

      {/* Second pane */}
      <div style={{ [isHorizontal ? 'width' : 'height']: secondSize }} className="overflow-hidden">
        <TerminalView terminalId={terminalIds[1]} />
      </div>
    </div>
  );
}
