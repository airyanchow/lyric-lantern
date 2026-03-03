import { Gauge } from 'lucide-react';

interface SpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

export default function SpeedControl({ currentSpeed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Gauge className="h-4 w-4 text-text-secondary" />
      <span className="text-xs text-text-secondary">Speed:</span>
      <div className="flex gap-1">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              Math.abs(currentSpeed - speed) < 0.01
                ? 'bg-china-red text-white shadow-md shadow-china-red/20'
                : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
            }`}
          >
            {speed === 1 ? '1.0x' : `${speed}x`}
          </button>
        ))}
      </div>
    </div>
  );
}
