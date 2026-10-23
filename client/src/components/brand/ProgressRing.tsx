import { useId } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: React.ReactNode;
  caption?: string;
  className?: string;
}

/** Hollow gradient circle (Steel → Navy) for readiness and progress. */
export function ProgressRing({ value, size = 96, strokeWidth = 6, label, caption, className }: ProgressRingProps) {
  const id = useId();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={caption}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--steel))" />
            <stop offset="1" stopColor="hsl(var(--navy))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-xl font-medium text-foreground">{label ?? `${Math.round(pct)}%`}</span>
        {caption && <span className="text-[11px] text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}
